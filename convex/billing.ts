import { reserveEmail } from "./emailBudget";
import { recordMilestone } from "./measurement";
import { events } from "../domain/analytics";
import { query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireUser, claimRateLimit } from "./auth";
import { subscriptionValidator } from "./validators";
import { reminderDueAt, shouldRemind } from "../domain/billing";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return ctx.db
      .query("subscriptions")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", user.clerkId))
      .unique();
  },
});
export const claimSync = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) =>
    claimRateLimit(ctx, `sync:${clerkId}`, 5000),
});
export const snapshot = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) =>
    ctx.db
      .query("subscriptions")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique(),
});
export const apply = internalMutation({
  args: { subscription: subscriptionValidator },
  handler: async (ctx, { subscription }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", subscription.clerkId))
      .unique();
    if (!user || user.deleting) return;
    const old = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", subscription.clerkId))
      .unique();
    if (old && old.syncedAt > subscription.syncedAt) return;
    if (old) await ctx.db.replace(old._id, subscription);
    else await ctx.db.insert("subscriptions", subscription);
    if (
      subscription.isTrial &&
      subscription.status === "active" &&
      (!old?.isTrial || old.itemId !== subscription.itemId)
    )
      await recordMilestone(ctx, {
        event: events.TRIAL,
        distinctId: user._id,
        eventId: `trial/${subscription.itemId}`,
      });
    if (subscription.status === "canceled" && old?.status !== "canceled")
      await recordMilestone(ctx, {
        event: events.CANCEL,
        distinctId: user._id,
        eventId: `cancel/${subscription.itemId}/${subscription.periodEnd}`,
      });
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", subscription.clerkId))
      .collect();
    for (const reminder of reminders) {
      if (
        !["sent", "canceled"].includes(reminder.status) &&
        (!subscription.isTrial ||
          !subscription.willRenew ||
          subscription.status !== "active" ||
          subscription.periodEnd !== reminder.trialEnd ||
          subscription.itemId !== reminder.itemId)
      )
        await ctx.db.patch(reminder._id, { status: "canceled" });
    }
    if (
      subscription.isTrial &&
      subscription.willRenew &&
      subscription.status === "active" &&
      subscription.periodEnd > Date.now()
    ) {
      const existing = await ctx.db
        .query("reminders")
        .withIndex("by_item_end", (q) =>
          q
            .eq("itemId", subscription.itemId)
            .eq("trialEnd", subscription.periodEnd),
        )
        .unique();
      if (!existing) {
        const dueAt = reminderDueAt(subscription.periodEnd);
        const id = await ctx.db.insert("reminders", {
          clerkId: subscription.clerkId,
          itemId: subscription.itemId,
          trialEnd: subscription.periodEnd,
          dueAt,
          status: "pending",
          attempts: 0,
        });
        await ctx.scheduler.runAt(
          Math.max(Date.now(), dueAt),
          internal.billingNode.sendReminder,
          { reminderId: id },
        );
      } else if (existing.status === "canceled") {
        await ctx.db.patch(existing._id, { status: "pending", attempts: 0 });
        await ctx.scheduler.runAt(
          Math.max(Date.now(), existing.dueAt),
          internal.billingNode.sendReminder,
          { reminderId: existing._id },
        );
      }
    }
  },
});
export const enqueueEvent = internalMutation({
  args: { eventId: v.string(), clerkId: v.string() },
  handler: async (ctx, args) => {
    const previous = await ctx.db
      .query("billingEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (previous) return;
    const id = await ctx.db.insert("billingEvents", {
      ...args,
      receivedAt: Date.now(),
      status: "pending",
      attempts: 0,
    });
    await ctx.scheduler.runAfter(0, internal.billingNode.processEvent, {
      eventId: id,
    });
  },
});
export const getEvent = internalQuery({
  args: { eventId: v.id("billingEvents") },
  handler: async (ctx, { eventId }) => ctx.db.get(eventId),
});
export const finishEvent = internalMutation({
  args: { eventId: v.id("billingEvents"), success: v.boolean() },
  handler: async (ctx, { eventId, success }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.status === "processed") return;
    const attempts = event.attempts + 1;
    const failed = !success && attempts >= 6;
    await ctx.db.patch(eventId, {
      status: success ? "processed" : failed ? "failed" : "pending",
      attempts,
      ...(!success ? { error: "Clerk reconciliation failed" } : {}),
    });
    if (!success && !failed)
      await ctx.scheduler.runAfter(
        Math.min(3600000, 30_000 * 2 ** attempts),
        internal.billingNode.processEvent,
        { eventId },
      );
    if (failed) console.error("billing_sync_failed", { eventId });
  },
});
export const getReminder = internalQuery({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, { reminderId }) => ctx.db.get(reminderId),
});
export const claimReminder = internalMutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, { reminderId }) => {
    const reminder = await ctx.db.get(reminderId);
    if (
      !reminder ||
      ["sent", "canceled", "failed"].includes(reminder.status) ||
      reminder.dueAt > Date.now() ||
      (reminder.leaseUntil ?? 0) > Date.now()
    )
      return null;
    if (reminder.attempts >= 6) {
      await ctx.db.patch(reminderId, {
        status: "failed",
        error: "Reminder delivery attempts exhausted",
      });
      console.error("trial_reminder_failed", { reminderId });
      return null;
    }
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", reminder.clerkId))
      .unique();
    if (
      !shouldRemind(subscription, reminder.trialEnd, Date.now()) ||
      subscription?.itemId !== reminder.itemId
    )
      return null;
    const budget = await reserveEmail(
      ctx,
      `trial-reminder/${reminder.itemId}/${reminder.trialEnd}`,
      false,
    );
    if (!budget.allowed) {
      const expired = budget.retryAt >= reminder.trialEnd;
      await ctx.db.patch(reminderId, {
        status: expired ? "failed" : "pending",
        dueAt: budget.retryAt,
        leaseUntil: 0,
        error: "Email quota reserved for another send",
      });
      if (!expired)
        await ctx.scheduler.runAt(
          budget.retryAt,
          internal.billingNode.sendReminder,
          { reminderId },
        );
      else console.error("trial_reminder_quota_exhausted", { reminderId });
      return null;
    }
    const leaseId = `${Date.now()}/${reminder.attempts + 1}`;
    await ctx.db.patch(reminderId, {
      status: "sending",
      attempts: reminder.attempts + 1,
      leaseUntil: Date.now() + 300_000,
      leaseId,
    });
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", reminder.clerkId))
      .unique();
    return {
      reminder,
      leaseId,
      subscription: subscription!,
      timezone: user?.preferences?.timezone ?? "UTC",
    };
  },
});
export const finishReminder = internalMutation({
  args: {
    reminderId: v.id("reminders"),
    providerId: v.optional(v.string()),
    error: v.optional(v.string()),
    leaseId: v.optional(v.string()),
  },
  handler: async (ctx, { reminderId, providerId, error, leaseId }) => {
    const reminder = await ctx.db.get(reminderId);
    if (!reminder || reminder.status === "sent") return;
    if (providerId) {
      await ctx.db.patch(reminderId, {
        status: "sent",
        providerId,
        sentAt: Date.now(),
        leaseUntil: 0,
      });
      return;
    }
    if (reminder.status === "canceled") return;
    // A duplicate job that fails before claiming must not release another sender's lease.
    if (leaseId ? leaseId !== reminder.leaseId : reminder.status === "sending")
      return;
    const attempts =
      reminder.status === "sending" ? reminder.attempts : reminder.attempts + 1;
    const delay = Math.min(3600000, 60_000 * 2 ** attempts);
    const failed = attempts >= 6 || Date.now() + delay >= reminder.trialEnd;
    await ctx.db.patch(reminderId, {
      status: failed ? "failed" : "pending",
      attempts,
      leaseUntil: 0,
      error: error ?? "Delivery failed",
      dueAt: Date.now() + delay,
    });
    if (!failed)
      await ctx.scheduler.runAfter(delay, internal.billingNode.sendReminder, {
        reminderId,
      });
    else console.error("trial_reminder_failed", { reminderId });
  },
});
export const rescueReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const status of ["pending", "sending"] as const) {
      const reminders = await ctx.db
        .query("reminders")
        .withIndex("by_status_due", (q) =>
          q.eq("status", status).lte("dueAt", Date.now()),
        )
        .take(100);
      for (const reminder of reminders) {
        if (reminder.trialEnd <= Date.now()) {
          await ctx.db.patch(reminder._id, {
            status: "failed",
            error: "Reminder expired before delivery",
          });
          console.error("trial_reminder_expired", { reminderId: reminder._id });
        } else if ((reminder.leaseUntil ?? 0) <= Date.now())
          await ctx.scheduler.runAfter(0, internal.billingNode.sendReminder, {
            reminderId: reminder._id,
          });
      }
    }
  },
});
