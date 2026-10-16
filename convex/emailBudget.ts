import { internalMutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";

// Budgets are per deployment. Production + staging defaults fit one free account.
// Reserve before sending; an uncertain provider response must never free capacity.
export async function reserveEmail(
  ctx: MutationCtx,
  key: string,
  optional: boolean,
) {
  const now = Date.now();
  const date = new Date(now);
  const day = date.toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const reservationKey = `${day}/${key}`;
  const existing = await ctx.db
    .query("emailReservations")
    .withIndex("by_key", (q) => q.eq("key", reservationKey))
    .unique();
  if (existing) return { allowed: true, retryAt: now };
  const staging = process.env.POOKIE_ENVIRONMENT !== "production";
  const dailyLimit = staging ? 10 : 90;
  const monthlyLimit = staging ? 300 : 2700;
  const dayCap = optional ? Math.floor(dailyLimit * 0.8) : dailyLimit;
  const monthCap = optional ? Math.floor(monthlyLimit * 0.85) : monthlyLimit;
  const get = (key: string) =>
    ctx.db
      .query("emailBudgets")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
  const daily = await get(`day/${day}`);
  const monthly = await get(`month/${month}`);
  const rate = await get("rate");
  const nextDay = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
  );
  const nextMonth = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  if ((monthly?.count ?? 0) >= monthCap)
    return { allowed: false, retryAt: nextMonth };
  if ((daily?.count ?? 0) >= dayCap)
    return { allowed: false, retryAt: nextDay };
  if ((rate?.nextAt ?? 0) > now)
    return { allowed: false, retryAt: rate!.nextAt! };
  for (const [key, record] of [
    [`day/${day}`, daily],
    [`month/${month}`, monthly],
  ] as const) {
    if (record) await ctx.db.patch(record._id, { count: record.count + 1 });
    else await ctx.db.insert("emailBudgets", { key, count: 1 });
  }
  if (rate) await ctx.db.patch(rate._id, { nextAt: now + 1000 });
  else
    await ctx.db.insert("emailBudgets", {
      key: "rate",
      count: 0,
      nextAt: now + 1000,
    });
  await ctx.db.insert("emailReservations", {
    key: reservationKey,
    reservedAt: now,
  });
  return { allowed: true, retryAt: now };
}
export const reserve = internalMutation({
  args: { key: v.string(), optional: v.boolean() },
  handler: (ctx, args) => reserveEmail(ctx, args.key, args.optional),
});
