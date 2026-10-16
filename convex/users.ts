import { recordMilestone } from "./measurement";
import { events } from "../domain/analytics";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./auth";
import {
  draftValidator,
  preferencesValidator,
  attributionValidator,
  adMeasurementValidator,
} from "./validators";
import { sanitizeAdMeasurement } from "../domain/meta";
import { sanitizeAttribution } from "../domain/acquisition";
import { nextWeeklyReminder } from "../domain/reminders";
import { preferencesSchema, timezoneSchema } from "../domain/planner";
export const ensure = mutation({
  args: {
    attribution: v.optional(attributionValidator),
    adMeasurement: v.optional(adMeasurementValidator),
  },
  handler: async (ctx, { attribution, adMeasurement }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Please sign in.");
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (existing) return existing._id;
    const id = await ctx.db.insert("users", {
      clerkId: identity.subject,
      ...(identity.email ? { email: identity.email } : {}),
      ...(identity.name ? { name: identity.name } : {}),
      createdAt: Date.now(),
      emailVerified: identity.emailVerified === true,
      ...(adMeasurement
        ? {
            adMeasurement: sanitizeAdMeasurement(adMeasurement),
            adConsentUpdatedAt: Date.now(),
          }
        : {}),
      ...(attribution ? { attribution: sanitizeAttribution(attribution) } : {}),
    });
    await recordMilestone(ctx, {
      event: events.ACCOUNT,
      distinctId: id,
      eventId: `account/${id}`,
    });
    return id;
  },
});
export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});
export const saveDraft = mutation({
  args: { draft: draftValidator },
  handler: async (ctx, { draft }) => {
    const user = await requireUser(ctx);
    if (
      (draft.motivation?.length ?? 0) > 160 ||
      (draft.days?.length ?? 0) > 3 ||
      draft.days?.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
    )
      throw new ConvexError("Check your preferences.");
    if (draft.timezone && !timezoneSchema.safeParse(draft.timezone).success)
      throw new ConvexError("Check your timezone.");
    await ctx.db.patch(user._id, { draft });
  },
});
export const savePreferences = mutation({
  args: { preferences: preferencesValidator },
  handler: async (ctx, { preferences }) => {
    const user = await requireUser(ctx);
    const result = preferencesSchema.safeParse(preferences);
    if (!result.success) throw new ConvexError(result.error.issues[0].message);
    await ctx.db.patch(user._id, {
      preferences: result.data,
      draft: result.data,
      ...(user.weeklyReminderEnabled &&
      user.preferences?.timezone !== result.data.timezone
        ? {
            weeklyReminderNextAt: nextWeeklyReminder(
              Date.now(),
              result.data.timezone,
            ),
            weeklyReminderVersion: (user.weeklyReminderVersion ?? 0) + 1,
          }
        : {}),
    });
    if (!user.preferences)
      await recordMilestone(ctx, {
        event: events.SETUP,
        distinctId: user._id,
        eventId: `setup/${user._id}`,
      });
  },
});
export const removeData = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (user) {
      for (const table of ["measurementEvents", "paymentReceipts"] as const) {
        for (const row of await ctx.db
          .query(table)
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect())
          await ctx.db.delete(row._id);
      }
      for (const reminder of await ctx.db
        .query("weeklyReminders")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect())
        await ctx.db.delete(reminder._id);
      for (const week of await ctx.db
        .query("weeks")
        .withIndex("by_user_start", (q) => q.eq("userId", user._id))
        .collect())
        await ctx.db.delete(week._id);
      await ctx.db.delete(user._id);
    }
    for (const row of await ctx.db
      .query("subscriptions")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .collect())
      await ctx.db.delete(row._id);
    for (const row of await ctx.db
      .query("reminders")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .collect())
      await ctx.db.delete(row._id);
    for (const row of await ctx.db
      .query("billingEvents")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .collect())
      await ctx.db.delete(row._id);
    for (const key of [`sync:${clerkId}`, `delete:${clerkId}`]) {
      const limit = await ctx.db
        .query("rateLimits")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (limit) await ctx.db.delete(limit._id);
    }
  },
});

export const analyticsContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return user && !user.deleting
      ? {
          attribution: user.attribution,
          discovery: user.preferences?.discovery,
        }
      : null;
  },
});

export const setAdMeasurement = mutation({
  args: { adMeasurement: adMeasurementValidator },
  handler: async (ctx, { adMeasurement }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Please sign in.");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || user.deleting) return;
    const clean = sanitizeAdMeasurement(adMeasurement);
    await ctx.db.patch(user._id, {
      adMeasurement: clean,
      adConsentUpdatedAt:
        user.adMeasurement?.consent !== clean.consent ||
        (clean.consent && (user.adMeasurement?.expiresAt ?? 0) <= Date.now())
          ? Date.now()
          : (user.adConsentUpdatedAt ?? Date.now()),
    });
  },
});
