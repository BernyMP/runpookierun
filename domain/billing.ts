import config from "../config";
export type Subscription = {
  clerkId: string;
  itemId: string;
  planId: string;
  status: string;
  periodEnd: number;
  isTrial: boolean;
  trialEligible?: boolean;
  willRenew: boolean;
  amountCents: number;
  currency: string;
  syncedAt: number;
};
export function hasAccess(
  subscription: Subscription | null | undefined,
  now = Date.now(),
) {
  return Boolean(
    subscription &&
    ["active", "canceled"].includes(subscription.status) &&
    subscription.periodEnd > now,
  );
}
export const reminderDueAt = (trialEnd: number) =>
  trialEnd - 24 * 60 * 60 * 1000;
export function shouldRemind(
  subscription: Subscription | null | undefined,
  trialEnd: number,
  now: number,
) {
  return Boolean(
    subscription &&
    subscription.status === "active" &&
    subscription.isTrial &&
    subscription.willRenew &&
    subscription.periodEnd === trialEnd &&
    now >= reminderDueAt(trialEnd) &&
    now < trialEnd,
  );
}
export function formatPrice(
  amountCents = config.priceCents,
  currency = config.currency,
) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amountCents / 100,
  );
}
type ClerkItem = {
  id: string;
  planId: string | null;
  status: string;
  periodEnd: number | null;
  isFreeTrial: boolean;
  canceledAt: number | null;
  updatedAt: number;
  nextPayment?: { amount: { amount: number; currency: string } } | null;
  plan?: { fee: { amount: number; currency: string } | null } | null;
};
export function normalizeSubscription(
  clerkId: string,
  items: ClerkItem[],
  paidPlanId: string,
  syncedAt: number,
): Subscription {
  if (!paidPlanId) throw new Error("The paid plan is not configured.");
  const matching = items.filter((i) => i.planId === paidPlanId);
  const item =
    matching
      .filter(
        (i) =>
          ["active", "canceled"].includes(i.status) &&
          (i.periodEnd ?? 0) > syncedAt,
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)[0] ??
    matching.sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const amount = item?.nextPayment?.amount ?? item?.plan?.fee;
  return {
    clerkId,
    itemId: item?.id ?? "none",
    planId: paidPlanId,
    status: item?.status ?? "none",
    periodEnd: item?.periodEnd ?? 0,
    isTrial: item?.isFreeTrial ?? false,
    willRenew: Boolean(item && item.status === "active" && !item.canceledAt),
    amountCents: amount?.amount ?? config.priceCents,
    currency: amount?.currency ?? "USD",
    syncedAt,
  };
}
