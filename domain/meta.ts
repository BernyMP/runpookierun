import { events } from "./analytics";
export type AdMeasurement = {
  consent: boolean;
  expiresAt?: number;
  fbp?: string;
  fbc?: string;
  clickExpiresAt?: number;
  userAgent?: string;
};
export function sanitizeAdMeasurement(value: AdMeasurement): AdMeasurement {
  if (
    !value.consent ||
    (value.expiresAt !== undefined &&
      (!Number.isFinite(value.expiresAt) || value.expiresAt <= Date.now()))
  )
    return { consent: false };
  const valid = (s?: string) =>
    s && /^fb\.\d\.\d{13}\.[A-Za-z0-9_-]{1,500}$/.test(s) ? s : undefined;
  const fbp = valid(value.fbp),
    fbc =
      value.clickExpiresAt !== undefined &&
      (!Number.isFinite(value.clickExpiresAt) ||
        value.clickExpiresAt <= Date.now())
        ? undefined
        : valid(value.fbc);
  return {
    consent: true,
    expiresAt: Math.min(
      value.expiresAt ?? Date.now() + 180 * 86400000,
      Date.now() + 180 * 86400000,
    ),
    ...(fbp ? { fbp } : {}),
    ...(fbc
      ? {
          fbc,
          clickExpiresAt: Math.min(
            value.clickExpiresAt ?? Date.now() + 30 * 86400000,
            Date.now() + 30 * 86400000,
          ),
        }
      : {}),
    ...(value.userAgent ? { userAgent: value.userAgent.slice(0, 512) } : {}),
  };
}
export function metaEventName(event: string) {
  if (event === events.ACCOUNT) return "CompleteRegistration";
  if (event === events.TRIAL) return "StartTrial";
  if (event === events.PAID || event === events.RENEWAL) return "Purchase";
  return null;
}
export function metaEnabled(env: Record<string, string | undefined>) {
  return (
    env.META_ENABLED === "true" &&
    /^\d+$/.test(env.META_PIXEL_ID ?? "") &&
    Boolean(env.META_ACCESS_TOKEN) &&
    /^v\d+\.0$/.test(env.META_API_VERSION ?? "")
  );
}
export function metaEventAllowed(
  event: string,
  env: Record<string, string | undefined>,
) {
  const name = metaEventName(event);
  return Boolean(
    name &&
    (env.META_ALLOWED_EVENTS ?? "")
      .split(",")
      .map((x) => x.trim())
      .includes(name),
  );
}
// Call only AFTER signature verification. Unknown or incomplete shapes fail closed.
export function verifiedPayment(
  data: unknown,
  paidPlanId: string,
  now = Date.now(),
) {
  if (!data || typeof data !== "object" || !paidPlanId) return null;
  const p = data as Record<string, unknown>;
  const payer = p.payer as { user_id?: unknown } | undefined;
  const total = (
    p.totals as
      { grand_total?: { amount?: unknown; currency?: unknown } } | undefined
  )?.grand_total;
  const items = p.subscription_items as
    { plan_id?: string; plan?: { id?: string } }[] | undefined;
  if (
    p.status !== "paid" ||
    typeof p.payment_id !== "string" ||
    !p.payment_id ||
    typeof payer?.user_id !== "string" ||
    !Array.isArray(items) ||
    items.length !== 1 ||
    (items[0].plan_id ?? items[0].plan?.id) !== paidPlanId ||
    typeof total?.amount !== "number" ||
    !Number.isSafeInteger(total.amount) ||
    total.amount <= 0 ||
    typeof total.currency !== "string" ||
    !/^[A-Za-z]{3}$/.test(total.currency) ||
    typeof p.paid_at !== "number" ||
    !Number.isSafeInteger(p.paid_at) ||
    p.paid_at <= 0 ||
    p.paid_at > now + 300_000
  )
    return null;
  return {
    paymentId: p.payment_id,
    clerkId: payer.user_id,
    amountCents: total.amount,
    currency: total.currency.toUpperCase(),
    paidAt: p.paid_at,
  };
}
