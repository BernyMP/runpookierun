import { describe, expect, it } from "vitest";
import {
  hasAccess,
  normalizeSubscription,
  reminderDueAt,
  shouldRemind,
  type Subscription,
} from "../domain/billing";
const end = Date.parse("2026-09-28T18:23:00Z");
const trial: Subscription = {
  clerkId: "user_1",
  planId: "plan_paid",
  itemId: "item_1",
  status: "active",
  periodEnd: end,
  isTrial: true,
  willRenew: true,
  amountCents: 499,
  currency: "USD",
  syncedAt: end - 7 * 86400000,
};
describe("paid access", () => {
  it("allows trials and canceled subscriptions until their recorded end", () => {
    expect(hasAccess(trial, end - 1)).toBe(true);
    expect(
      hasAccess({ ...trial, status: "canceled", willRenew: false }, end - 1),
    ).toBe(true);
    expect(hasAccess(trial, end)).toBe(false);
  });
  it.each(["past_due", "incomplete", "upcoming", "ended", "none", "expired"])(
    "denies %s",
    (status) => expect(hasAccess({ ...trial, status }, end - 1)).toBe(false),
  );
  it("does not mistake Clerk's default free subscription for paid access", () => {
    expect(
      hasAccess(
        normalizeSubscription(
          "user_1",
          [
            {
              id: "free",
              planId: "free",
              status: "active",
              isFreeTrial: false,
              canceledAt: null,
              updatedAt: 1,
              periodEnd: end,
            },
          ],
          "paid",
          end - 1000,
        ),
        end - 1000,
      ),
    ).toBe(false);
  });
  it("maps renewal and paid amounts from Clerk", () => {
    const normalized = normalizeSubscription(
      "user_1",
      [
        {
          id: "item",
          planId: "paid",
          status: "active",
          isFreeTrial: true,
          canceledAt: null,
          updatedAt: 1,
          periodEnd: end,
          nextPayment: { amount: { amount: 499, currency: "USD" } },
        },
      ],
      "paid",
      end - 1000,
    );
    expect(normalized.amountCents).toBe(499);
    expect(normalized.willRenew).toBe(true);
  });
});
describe("trial reminders", () => {
  it("is due exactly 24 hours before expiry", () => {
    expect(reminderDueAt(end)).toBe(end - 86400000);
    expect(shouldRemind(trial, end, end - 86400000 - 1)).toBe(false);
    expect(shouldRemind(trial, end, end - 86400000)).toBe(true);
  });
  it("suppresses canceled, converted, expired, failed-payment and extended trials", () => {
    for (const subscription of [
      { ...trial, status: "canceled", willRenew: false },
      { ...trial, isTrial: false },
      { ...trial, status: "past_due" },
      { ...trial, periodEnd: end + 86400000 },
    ])
      expect(shouldRemind(subscription, end, end - 3600000)).toBe(false);
    expect(shouldRemind(trial, end, end)).toBe(false);
  });
});
