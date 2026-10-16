import { reserveEmail } from "./emailBudget";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./auth";
import { hasAccess } from "../domain/billing";
import { nextWeeklyReminder } from "../domain/reminders";

export const setEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, { enabled }) => {
    const user = await requireUser(ctx);
    if (!user.preferences) throw new ConvexError("Finish your setup first.");
    if ((user.weeklyReminderEnabled ?? false) === enabled) return;
    await ctx.db.patch(user._id, {
      weeklyReminderEnabled: enabled,
      weeklyReminderVersion: (user.weeklyReminderVersion ?? 0) + 1,
      weeklyReminderNextAt: enabled
        ? nextWeeklyReminder(Date.now(), user.preferences.timezone)
        : undefined,
    });
    for (const job of await ctx.db
      .query("weeklyReminders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()) {
      if (job.status === "pending" || job.status === "sending")
        await ctx.db.patch(job._id, { status: "canceled" });
    }
  },
});

export const enqueueDue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await ctx.db
      .query("users")
      .withIndex("by_weekly_due", (q) =>
        q.eq("weeklyReminderEnabled", true).lte("weeklyReminderNextAt", now),
      )
      .take(100);
    for (const user of users) {
      if (!user.preferences || user.deleting) continue;
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", user.clerkId))
        .unique();
      const scheduledFor = user.weeklyReminderNextAt;
      await ctx.db.patch(user._id, {
        weeklyReminderNextAt: nextWeeklyReminder(
          now,
          user.preferences.timezone,
        ),
      });
      // Skip old mail after an outage; never send a backlog of weekly nudges.
      if (
        !hasAccess(subscription, now) ||
        !scheduledFor ||
        now - scheduledFor > 23 * 3600000
      )
        continue;
      const id = await ctx.db.insert("weeklyReminders", {
        userId: user._id,
        version: user.weeklyReminderVersion ?? 0,
        scheduledFor,
        nextAttemptAt: now,
        status: "pending",
        attempts: 0,
      });
      await ctx.scheduler.runAfter(0, internal.weeklyRemindersNode.send, {
        reminderId: id,
      });
    }
  },
});

export const claim = internalMutation({
  args: { reminderId: v.id("weeklyReminders") },
  handler: async (ctx, { reminderId }) => {
    const job = await ctx.db.get(reminderId);
    const now = Date.now();
    if (
      !job ||
      !["pending", "sending"].includes(job.status) ||
      job.nextAttemptAt > now ||
      (job.leaseUntil ?? 0) > now
    )
      return null;
    const user = await ctx.db.get(job.userId);
    const subscription =
      user &&
      (await ctx.db
        .query("subscriptions")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", user.clerkId))
        .unique());
    if (
      !user?.weeklyReminderEnabled ||
      user.deleting ||
      user.weeklyReminderVersion !== job.version ||
      !hasAccess(subscription, now)
    ) {
      await ctx.db.patch(job._id, { status: "canceled" });
      return null;
    }
    if (job.attempts >= 6 || now - job.scheduledFor > 23 * 3600000) {
      await ctx.db.patch(job._id, { status: "failed" });
      console.warn("weekly_reminder_failed", { reminderId });
      return null;
    }
    const budget = await reserveEmail(ctx, `weekly-reminder/${job._id}`, true);
    if (!budget.allowed) {
      const expired = budget.retryAt >= job.scheduledFor + 23 * 3600000;
      await ctx.db.patch(job._id, {
        status: expired ? "failed" : "pending",
        nextAttemptAt: budget.retryAt,
        leaseUntil: undefined,
      });
      if (!expired)
        await ctx.scheduler.runAt(
          budget.retryAt,
          internal.weeklyRemindersNode.send,
          { reminderId },
        );
      else console.warn("weekly_reminder_quota_exhausted", { reminderId });
      return null;
    }
    const leaseId = `${job._id}/${job.attempts + 1}/${now}`;
    await ctx.db.patch(job._id, {
      status: "sending",
      attempts: job.attempts + 1,
      leaseId,
      leaseUntil: now + 300000,
    });
    return { job, clerkId: user.clerkId, leaseId };
  },
});

export const stillAllowed = internalQuery({
  args: { reminderId: v.id("weeklyReminders"), leaseId: v.string() },
  handler: async (ctx, { reminderId, leaseId }) => {
    const job = await ctx.db.get(reminderId);
    if (
      !job ||
      job.status !== "sending" ||
      job.leaseId !== leaseId ||
      (job.leaseUntil ?? 0) <= Date.now()
    )
      return false;
    const user = await ctx.db.get(job.userId);
    if (
      !user?.weeklyReminderEnabled ||
      user.deleting ||
      user.weeklyReminderVersion !== job.version
    )
      return false;
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", user.clerkId))
      .unique();
    return hasAccess(subscription);
  },
});

export const finish = internalMutation({
  args: {
    reminderId: v.id("weeklyReminders"),
    leaseId: v.string(),
    providerId: v.optional(v.string()),
  },
  handler: async (ctx, { reminderId, leaseId, providerId }) => {
    const job = await ctx.db.get(reminderId);
    if (!job || job.status !== "sending" || job.leaseId !== leaseId) return;
    if (providerId) {
      await ctx.db.patch(job._id, {
        status: "sent",
        providerId,
        leaseUntil: undefined,
      });
      return;
    }
    const exhausted =
      job.attempts >= 6 || Date.now() - job.scheduledFor > 23 * 3600000;
    const nextAttemptAt = Date.now() + Math.min(60, 2 ** job.attempts) * 60000;
    await ctx.db.patch(job._id, {
      status: exhausted ? "failed" : "pending",
      nextAttemptAt,
      leaseUntil: undefined,
    });
    console.warn("weekly_reminder_delivery_failed", { reminderId, exhausted });
    if (!exhausted)
      await ctx.scheduler.runAt(
        nextAttemptAt,
        internal.weeklyRemindersNode.send,
        { reminderId },
      );
  },
});

export const rescue = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const status of ["pending", "sending"] as const) {
      const jobs = await ctx.db
        .query("weeklyReminders")
        .withIndex("by_status_due", (q) =>
          q.eq("status", status).lte("nextAttemptAt", Date.now()),
        )
        .take(100);
      for (const job of jobs)
        if ((job.leaseUntil ?? 0) <= Date.now())
          await ctx.scheduler.runAfter(0, internal.weeklyRemindersNode.send, {
            reminderId: job._id,
          });
    }
  },
});

export const unsubscribe = internalMutation({
  args: { userId: v.id("users"), version: v.number() },
  handler: async (ctx, { userId, version }) => {
    const user = await ctx.db.get(userId);
    // A previously sent link cannot undo a later, explicit re-subscription.
    if (!user || user.weeklyReminderVersion !== version) return;
    await ctx.db.patch(userId, {
      weeklyReminderEnabled: false,
      weeklyReminderNextAt: undefined,
      weeklyReminderVersion: version + 1,
    });
    for (const job of await ctx.db
      .query("weeklyReminders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()) {
      if (["pending", "sending"].includes(job.status))
        await ctx.db.patch(job._id, { status: "canceled" });
    }
  },
});
