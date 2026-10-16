import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { hasAccess } from "../domain/billing";

// Operator-only rehearsal. No public API or editorial-worker access.
export const scheduleWeeklyReminder = internalMutation({
  args: {},
  handler: async (ctx) => {
    const clerkId = process.env.POOKIE_MAIL_TEST_CLERK_ID;
    if (
      process.env.POOKIE_ENVIRONMENT !== "staging" ||
      !process.env.POOKIE_STAGING_DEPLOYMENT ||
      process.env.CONVEX_CLOUD_URL !==
        `https://${process.env.POOKIE_STAGING_DEPLOYMENT}.convex.cloud` ||
      !clerkId
    )
      throw new Error("An isolated staging mail fixture is required.");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (
      !user?.preferences ||
      !user.weeklyReminderEnabled ||
      !hasAccess(subscription)
    )
      throw new Error(
        "The staging fixture must opt in and have paid-plan access.",
      );
    // Exercise the ordinary scheduler and sender, changing only when this fixture is due.
    await ctx.db.patch(user._id, { weeklyReminderNextAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.weeklyReminders.enqueueDue, {});
    return { userId: user._id };
  },
});
