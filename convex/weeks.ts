import { recordMilestone } from "./measurement";
import { events } from "../domain/analytics";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser, requireAccess } from "./auth";
import {
  addDays,
  applyWorkoutCommand,
  buildWeek,
  localDate,
  personalizeWeek,
} from "../domain/planner";
import { commandValidator, weeklyChoiceValidator } from "./validators";
import { recentProgress } from "../domain/progress";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { WeeklyChoice } from "../domain/planner";
export const current = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return ctx.db
      .query("weeks")
      .withIndex("by_user_start", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
  },
});
async function createWeek(
  ctx: MutationCtx,
  user: Doc<"users">,
  previous?: Doc<"weeks">,
  choice: WeeklyChoice = { type: "keep" },
) {
  if (!user.preferences) throw new ConvexError("Finish your setup first.");
  const today = localDate(Date.now(), user.preferences.timezone);
  // A timezone change must never overlap the saved previous week.
  const startDate =
    previous && today <= previous.endDate
      ? addDays(previous.endDate, 1)
      : today;
  const week = buildWeek(user.preferences, startDate, previous?.workouts, {
    choice,
    approvedMinutes: previous?.approvedMinutes,
  });
  const id = await ctx.db.insert("weeks", {
    userId: user._id,
    ...week,
    ...(previous ? { previousWeekId: previous._id } : {}),
    revision: 0,
    source: "rules",
    personalizationState: "disabled",
    createdAt: Date.now(),
  });
  await ctx.db.patch(user._id, { weekCount: (user.weekCount ?? 0) + 1 });
  if (user.weekCount === 1)
    await recordMilestone(ctx, {
      event: events.SECOND_WEEK,
      distinctId: user._id,
      eventId: `second-week/${user._id}`,
    });
  return id;
}
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    await requireAccess(ctx, user.clerkId);
    const previous = await ctx.db
      .query("weeks")
      .withIndex("by_user_start", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    if (previous) {
      if (previous.endDate >= localDate(Date.now(), previous.timezone))
        return previous._id;
      throw new ConvexError("Confirm your next week before starting it.");
    }
    return createWeek(ctx, user);
  },
});
export const confirm = mutation({
  args: { previousWeekId: v.id("weeks"), choice: weeklyChoiceValidator },
  handler: async (ctx, { previousWeekId, choice }) => {
    const user = await requireUser(ctx);
    await requireAccess(ctx, user.clerkId);
    const latest = await ctx.db
      .query("weeks")
      .withIndex("by_user_start", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    if (!latest) throw new ConvexError("Start your first week first.");
    if (
      latest.previousWeekId === previousWeekId &&
      latest.endDate >= localDate(Date.now(), latest.timezone)
    )
      return latest._id;
    if (latest._id !== previousWeekId)
      throw new ConvexError("Refresh to confirm your latest week.");
    if (latest.endDate >= localDate(Date.now(), latest.timezone))
      throw new ConvexError("Your current week is still underway.");
    try {
      return await createWeek(ctx, user, latest, choice);
    } catch (error) {
      throw new ConvexError(
        error instanceof Error ? error.message : "Could not confirm your week.",
      );
    }
  },
});
export const recent = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const weeks = await ctx.db
      .query("weeks")
      .withIndex("by_user_start", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(5);
    return recentProgress(
      weeks,
      localDate(
        Date.now(),
        weeks[0]?.timezone ?? user.preferences?.timezone ?? "UTC",
      ),
    );
  },
});
export const command = mutation({
  args: {
    weekId: v.id("weeks"),
    workoutId: v.string(),
    command: commandValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireAccess(ctx, user.clerkId);
    const week = await ctx.db.get(args.weekId);
    if (!week || week.userId !== user._id || !user.preferences)
      throw new ConvexError("Week not found.");
    try {
      const updated = applyWorkoutCommand(
        week,
        args.workoutId,
        args.command,
        user.preferences,
        Date.now(),
      );
      await ctx.db.patch(week._id, {
        workouts: updated.workouts,
        revision: week.revision + 1,
      });
      if (
        args.command.type === "done" &&
        week.workouts.find((w) => w.id === args.workoutId)?.status !== "done"
      ) {
        await recordMilestone(ctx, {
          event: events.RUN,
          distinctId: user._id,
          eventId: `run/${week._id}/${args.workoutId}`,
        });
        if (!user.firstCompletedAt) {
          await ctx.db.patch(user._id, { firstCompletedAt: Date.now() });
          await recordMilestone(ctx, {
            event: events.FIRST_RUN,
            distinctId: user._id,
            eventId: `first-run/${user._id}`,
          });
        }
      }
    } catch (error) {
      throw new ConvexError(
        error instanceof Error ? error.message : "Could not update this run.",
      );
    }
  },
});
export const context = internalQuery({
  args: { weekId: v.id("weeks") },
  handler: async (ctx, { weekId }) => {
    const week = await ctx.db.get(weekId);
    if (!week) return null;
    const user = await ctx.db.get(week.userId);
    if (!user?.preferences || user.deleting) return null;
    return { week, preferences: user.preferences };
  },
});
export const finishPersonalization = internalMutation({
  args: {
    weekId: v.id("weeks"),
    revision: v.number(),
    result: v.optional(v.any()),
  },
  handler: async (ctx, { weekId, revision, result }) => {
    const week = await ctx.db.get(weekId);
    if (!week || week.personalizationState !== "pending") return;
    if (week.revision !== revision || !result) {
      await ctx.db.patch(weekId, { personalizationState: "fallback" });
      return;
    }
    try {
      const personalized = personalizeWeek(week, result);
      await ctx.db.patch(weekId, {
        summary: personalized.summary,
        workouts: personalized.workouts,
        source: "ai",
        personalizationState: "ready",
      });
    } catch {
      await ctx.db.patch(weekId, { personalizationState: "fallback" });
    }
  },
});
