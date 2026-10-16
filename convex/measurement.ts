import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { events } from "../domain/analytics";
import {
  metaEnabled,
  metaEventAllowed,
  sanitizeAdMeasurement,
} from "../domain/meta";
type Milestone = {
  event: string;
  distinctId: string;
  eventId: string;
  occurredAt?: number;
  amountCents?: number;
  currency?: string;
};
export async function recordMilestone(ctx: MutationCtx, args: Milestone) {
  if (!Object.values(events).some((e) => e === args.event)) return;
  if (
    await ctx.db
      .query("measurementEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique()
  )
    return;
  const user = await ctx.db.get(args.distinctId as Id<"users">);
  if (!user || user.deleting) return;
  const occurredAt = args.occurredAt ?? Date.now();
  const enabled =
    metaEnabled(process.env) && metaEventAllowed(args.event, process.env);
  const id = await ctx.db.insert("measurementEvents", {
    eventId: args.eventId,
    userId: user._id,
    event: args.event,
    occurredAt,
    ...(args.amountCents !== undefined
      ? { amountCents: args.amountCents, currency: args.currency }
      : {}),
    ...(user.attribution ? { attribution: user.attribution } : {}),
    metaStatus: !enabled
      ? "disabled"
      : !user.adMeasurement?.consent ||
          (user.adConsentUpdatedAt ?? Infinity) > occurredAt
        ? "suppressed"
        : "pending",
    attempts: 0,
    nextAttemptAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.analytics.capture, {
    event: args.event,
    distinctId: args.distinctId,
    eventId: args.eventId,
  });
  if (enabled && user.adMeasurement?.consent)
    await ctx.scheduler.runAfter(0, internal.meta.deliver, { id });
}
export const recordPayment = internalMutation({
  args: {
    paymentId: v.string(),
    clerkId: v.string(),
    amountCents: v.number(),
    currency: v.string(),
    paidAt: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.amountCents <= 0 || !Number.isSafeInteger(args.amountCents))
      return;
    if (
      await ctx.db
        .query("paymentReceipts")
        .withIndex("by_paymentId", (q) => q.eq("paymentId", args.paymentId))
        .unique()
    )
      return;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user || user.deleting) return;
    await ctx.db.insert("paymentReceipts", {
      paymentId: args.paymentId,
      userId: user._id,
      amountCents: args.amountCents,
      currency: args.currency,
      paidAt: args.paidAt,
    });
    // Arrival order is not payment order. Reclassify the ledger when an older receipt arrives later.
    const receipts = await ctx.db
      .query("paymentReceipts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    receipts.sort(
      (a, b) => a.paidAt - b.paidAt || a.paymentId.localeCompare(b.paymentId),
    );
    const first = receipts[0];
    await ctx.db.patch(user._id, { paidConversionAt: first.paidAt });
    for (const receipt of receipts) {
      const existing = await ctx.db
        .query("measurementEvents")
        .withIndex("by_eventId", (q) =>
          q.eq("eventId", `payment/${receipt.paymentId}`),
        )
        .unique();
      const event =
        receipt.paymentId === first.paymentId ? events.PAID : events.RENEWAL;
      if (existing && existing.event !== event)
        await ctx.db.patch(existing._id, { event });
    }
    await recordMilestone(ctx, {
      event: args.paymentId === first.paymentId ? events.PAID : events.RENEWAL,
      distinctId: user._id,
      eventId: `payment/${args.paymentId}`,
      occurredAt: args.paidAt,
      amountCents: args.amountCents,
      currency: args.currency,
    });
  },
});
export const claim = internalMutation({
  args: { id: v.id("measurementEvents") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (
      !row ||
      row.metaStatus !== "pending" ||
      row.nextAttemptAt > Date.now() ||
      (row.leaseUntil ?? 0) > Date.now()
    )
      return null;
    const user = await ctx.db.get(row.userId);
    if (
      !user ||
      user.deleting ||
      !user.adMeasurement?.consent ||
      (user.adMeasurement.expiresAt ?? 0) <= Date.now() ||
      (user.adConsentUpdatedAt ?? Infinity) > row.occurredAt ||
      !metaEnabled(process.env) ||
      !metaEventAllowed(row.event, process.env)
    ) {
      await ctx.db.patch(id, { metaStatus: "suppressed" });
      return null;
    }
    if (row.attempts >= 6 || Date.now() - row.occurredAt > 6 * 86400000) {
      await ctx.db.patch(id, { metaStatus: "failed" });
      return null;
    }
    const attempt = row.attempts + 1;
    await ctx.db.patch(id, {
      attempts: attempt,
      leaseUntil: Date.now() + 60_000,
    });
    return {
      row,
      attempt,
      adMeasurement: sanitizeAdMeasurement(user.adMeasurement),
      ...(user.emailVerified && user.email ? { email: user.email } : {}),
    };
  },
});
export const finish = internalMutation({
  args: {
    id: v.id("measurementEvents"),
    attempt: v.number(),
    success: v.boolean(),
  },
  handler: async (ctx, { id, attempt, success }) => {
    const row = await ctx.db.get(id);
    if (!row || row.metaStatus !== "pending" || row.attempts !== attempt)
      return;
    const nextAttemptAt = Date.now() + Math.min(3600000, 30_000 * 2 ** attempt);
    const failed =
      attempt >= 6 || nextAttemptAt - row.occurredAt > 6 * 86400000;
    await ctx.db.patch(id, {
      metaStatus: success ? "sent" : failed ? "failed" : "pending",
      leaseUntil: 0,
      nextAttemptAt,
      ...(success ? { sentAt: Date.now() } : {}),
    });
    if (!success && !failed)
      await ctx.scheduler.runAt(nextAttemptAt, internal.meta.deliver, { id });
    if (failed && !success) console.warn("meta_delivery_failed", { id });
  },
});
export const rescue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("measurementEvents")
      .withIndex("by_status_due", (q) =>
        q.eq("metaStatus", "pending").lte("nextAttemptAt", Date.now()),
      )
      .take(100);
    for (const row of rows)
      if ((row.leaseUntil ?? 0) <= Date.now())
        await ctx.scheduler.runAfter(0, internal.meta.deliver, { id: row._id });
  },
});
// Internal only: bounded aggregate output, no personal data. Revenue receipts are authoritative.
export const report = internalQuery({
  args: { since: v.number(), until: v.number() },
  handler: async (ctx, { since, until }) => {
    const rows = await ctx.db
      .query("measurementEvents")
      .withIndex("by_time", (q) =>
        q.gte("occurredAt", since).lt("occurredAt", until),
      )
      .take(5001);
    const groups: Record<
      string,
      {
        events: Record<string, number>;
        revenueCents: Record<string, number>;
        meta: Record<string, number>;
      }
    > = {};
    for (const row of rows.slice(0, 5000)) {
      const a = row.attribution;
      const key = [
        a?.source ?? "unknown",
        a?.medium ?? "none",
        a?.campaign ?? "none",
        a?.content ?? "none",
      ].join("/");
      const group = (groups[key] ??= {
        events: {},
        revenueCents: {},
        meta: {},
      });
      group.events[row.event] = (group.events[row.event] ?? 0) + 1;
      group.meta[row.metaStatus] = (group.meta[row.metaStatus] ?? 0) + 1;
      if (row.currency && row.amountCents)
        group.revenueCents[row.currency] =
          (group.revenueCents[row.currency] ?? 0) + row.amountCents;
    }
    return { truncated: rows.length > 5000, groups };
  },
});
