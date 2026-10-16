import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { hasAccess } from "../domain/billing";
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Please sign in.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user || user.deleting)
    throw new ConvexError("Your account is not ready. Please sign in again.");
  return user;
}
export async function requireAccess(
  ctx: QueryCtx | MutationCtx,
  clerkId: string,
) {
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
  if (!hasAccess(subscription))
    throw new ConvexError(
      "Start a trial or renew your subscription to continue.",
    );
}
export async function claimRateLimit(
  ctx: MutationCtx,
  key: string,
  duration: number,
) {
  const record = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (record && record.nextAt > Date.now()) return false;
  if (record) await ctx.db.patch(record._id, { nextAt: Date.now() + duration });
  else
    await ctx.db.insert("rateLimits", { key, nextAt: Date.now() + duration });
  return true;
}
