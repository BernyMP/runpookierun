import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { Webhook } from "svix";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const mocks = vi.hoisted(() => ({
  subscription: vi.fn(),
  user: vi.fn(),
  send: vi.fn(),
  cancel: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@clerk/backend", () => ({
  createClerkClient: () => ({
    billing: {
      getUserBillingSubscription: mocks.subscription,
      cancelSubscriptionItem: mocks.cancel,
    },
    users: { getUser: mocks.user, deleteUser: mocks.remove },
  }),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const start = Date.parse("2026-09-21T17:00:00Z");
const trialEnd = start + 7 * 86400000;
const trialItem = {
  id: "item",
  planId: "paid",
  status: "active",
  isFreeTrial: true,
  periodEnd: trialEnd,
  canceledAt: null,
  updatedAt: start,
  nextPayment: { amount: { amount: 499, currency: "USD" } },
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start);
  vi.clearAllMocks();
  vi.stubEnv("CLERK_SECRET_KEY", "test-only-not-a-real-key");
  vi.stubEnv("CLERK_PAID_PLAN_ID", "paid");
  vi.stubEnv("RESEND_API_KEY", "test-only-not-a-real-key");
  vi.stubEnv("EMAIL_FROM", "Pookie <test@example.test>");
  vi.stubEnv("APP_URL", "https://pookie.example.test");
  mocks.subscription.mockResolvedValue({ subscriptionItems: [trialItem] });
  mocks.user.mockResolvedValue({
    primaryEmailAddressId: "email",
    emailAddresses: [
      {
        id: "email",
        emailAddress: "runner@example.test",
        verification: { status: "verified" },
      },
    ],
  });
  mocks.send.mockResolvedValue({ data: { id: "email_1" }, error: null });
  mocks.cancel.mockResolvedValue({});
  mocks.remove.mockResolvedValue({});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function setup() {
  const t = convexTest(schema, modules);
  const runner = t.withIdentity({ subject: "runner" });
  await runner.mutation(api.users.ensure, {});
  await runner.mutation(api.users.savePreferences, {
    preferences: {
      acceptedTerms: true,
      experience: "new",
      motivation: "More energy",
      days: [1, 3, 5],
      minutes: 20,
      timezone: "America/Phoenix",
    },
  });
  return { t, runner };
}
describe("provider integration boundaries", () => {
  it("reconciles from Clerk after checkout, never from browser-submitted access", async () => {
    const { runner } = await setup();
    await runner.action(api.billingNode.sync, {});
    expect((await runner.query(api.billing.current, {}))?.isTrial).toBe(true);
    expect(mocks.subscription).toHaveBeenCalledWith("runner");
  });
  it("handles a new account without a Clerk subscription", async () => {
    const { runner } = await setup();
    mocks.subscription.mockRejectedValueOnce({ status: 404 });
    await runner.action(api.billingNode.sync, {});
    expect((await runner.query(api.billing.current, {}))?.status).toBe("none");
    await expect(runner.mutation(api.weeks.ensure, {})).rejects.toThrow(
      /trial/,
    );
  });
  it.each([true, false])(
    "preserves Clerk trial eligibility (%s) without active items",
    async (eligibleForFreeTrial) => {
      const { runner } = await setup();
      mocks.subscription.mockResolvedValueOnce({
        eligibleForFreeTrial,
        subscriptionItems: [],
      });
      await runner.action(api.billingNode.sync, {});
      const subscription = await runner.query(api.billing.current, {});
      expect(subscription?.status).toBe("none");
      expect(subscription?.trialEligible).toBe(eligibleForFreeTrial);
    },
  );
  it("deletes an account that never started checkout", async () => {
    const { runner } = await setup();
    mocks.subscription.mockRejectedValueOnce({ status: 404 });
    await runner.action(api.billingNode.deleteAccount, {
      confirmation: "DELETE",
    });
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledWith("runner");
    expect(await runner.query(api.users.current, {})).toBeNull();
  });
  it("rechecks cancellation at send time and sends nothing", async () => {
    const { t, runner } = await setup();
    await runner.action(api.billingNode.sync, {});
    const reminder = (
      await t.run((ctx) => ctx.db.query("reminders").collect())
    )[0];
    mocks.subscription.mockResolvedValue({
      subscriptionItems: [
        { ...trialItem, status: "canceled", canceledAt: start + 1000 },
      ],
    });
    vi.setSystemTime(trialEnd - 86400000);
    await t.action(internal.billingNode.sendReminder, {
      reminderId: reminder._id,
    });
    expect(mocks.send).not.toHaveBeenCalled();
    expect((await t.run((ctx) => ctx.db.get(reminder._id)))?.status).toBe(
      "canceled",
    );
  });
  it("sends the exact charge amount and billing link with a stable idempotency key", async () => {
    const { t, runner } = await setup();
    await runner.action(api.billingNode.sync, {});
    const reminder = (
      await t.run((ctx) => ctx.db.query("reminders").collect())
    )[0];
    vi.setSystemTime(trialEnd - 86400000);
    await t.action(internal.billingNode.sendReminder, {
      reminderId: reminder._id,
    });
    await t.action(internal.billingNode.sendReminder, {
      reminderId: reminder._id,
    });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    const [email, options] = mocks.send.mock.calls[0];
    expect(email.text).toContain("$4.99");
    expect(email.text).toContain("https://pookie.example.test/pookie/account");
    expect(email.text).toContain("America/Phoenix");
    expect(options.idempotencyKey).toBe(`trial-reminder/item/${trialEnd}`);
  });
  it("failed sends retry with the same email idempotency key", async () => {
    const { t, runner } = await setup();
    await runner.action(api.billingNode.sync, {});
    const reminder = (
      await t.run((ctx) => ctx.db.query("reminders").collect())
    )[0];
    vi.setSystemTime(trialEnd - 86400000);
    mocks.send.mockResolvedValueOnce({
      data: null,
      error: { message: "Unavailable" },
    });
    await t.action(internal.billingNode.sendReminder, {
      reminderId: reminder._id,
    });
    expect((await t.run((ctx) => ctx.db.get(reminder._id)))?.status).toBe(
      "pending",
    );
    vi.setSystemTime(trialEnd - 86400000 + 300000);
    await t.action(internal.billingNode.sendReminder, {
      reminderId: reminder._id,
    });
    expect(mocks.send.mock.calls[0][1]).toEqual(mocks.send.mock.calls[1][1]);
    expect((await t.run((ctx) => ctx.db.get(reminder._id)))?.status).toBe(
      "sent",
    );
  });
  it("does not delete an account if cancellation fails", async () => {
    const { runner } = await setup();
    mocks.cancel.mockRejectedValueOnce(new Error("Unavailable"));
    await expect(
      runner.action(api.billingNode.deleteAccount, { confirmation: "DELETE" }),
    ).rejects.toThrow(/couldn't/);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(await runner.query(api.users.current, {})).not.toBeNull();
  });
  it("cancels immediately before deleting identity and saved data", async () => {
    const { runner } = await setup();
    await runner.action(api.billingNode.deleteAccount, {
      confirmation: "DELETE",
    });
    expect(mocks.cancel).toHaveBeenCalledWith("item", { endNow: true });
    expect(mocks.remove).toHaveBeenCalledWith("runner");
    expect(await runner.query(api.users.current, {})).toBeNull();
  });
  it("a provider outage cannot grant access", async () => {
    const { runner } = await setup();
    mocks.subscription.mockRejectedValueOnce(new Error("Unavailable"));
    await expect(runner.action(api.billingNode.sync, {})).rejects.toThrow(
      /confirm billing/,
    );
    await expect(runner.mutation(api.weeks.ensure, {})).rejects.toThrow(
      /trial/,
    );
  });
});
describe("webhook signatures", () => {
  it("accepts valid signed events and deduplicates replays", async () => {
    const { t } = await setup();
    const key = `whsec_${Buffer.from("test-webhook-secret").toString("base64")}`;
    vi.stubEnv("CLERK_WEBHOOK_SECRET", key);
    const body = JSON.stringify({
      type: "subscriptionItem.active",
      data: { payer: { user_id: "runner" } },
    });
    const headers = {
      "svix-id": "evt_signed",
      "svix-timestamp": String(start / 1000),
      "svix-signature": new Webhook(key).sign(
        "evt_signed",
        new Date(start),
        body,
      ),
    };
    expect(
      (await t.fetch("/webhooks/clerk", { method: "POST", body, headers }))
        .status,
    ).toBe(200);
    expect(
      (await t.fetch("/webhooks/clerk", { method: "POST", body, headers }))
        .status,
    ).toBe(200);
    expect(
      await t.run((ctx) => ctx.db.query("billingEvents").collect()),
    ).toHaveLength(1);
  });
});
describe("AI is disabled for launch", () => {
  it.each(["timeout", "invalid"])(
    "does not contact an optional provider that would return %s",
    async (failure) => {
      const { t, runner } = await setup();
      await runner.action(api.billingNode.sync, {});
      const weekId = await runner.mutation(api.weeks.ensure, {});
      vi.stubEnv("GEMINI_KEY", "test-only-not-a-real-key");
      vi.stubGlobal(
        "fetch",
        failure === "timeout"
          ? vi.fn().mockRejectedValue(new Error("Timeout"))
          : vi.fn().mockResolvedValue(
              new Response(
                JSON.stringify({
                  candidates: [
                    { content: { parts: [{ text: '{"sessions":[]}' }] } },
                  ],
                }),
                { status: 200 },
              ),
            ),
      );
      await t.action(internal.coach.personalize, { weekId });
      const week = (await runner.query(api.weeks.current, {}))!;
      expect(fetch).not.toHaveBeenCalled();
      expect(week.personalizationState).toBe("disabled");
      expect(week.workouts).toHaveLength(7);
    },
  );
});

describe("weekly reminder provider boundary", () => {
  it("retries with identical content and key, sends once, and includes one-click unsubscribe", async () => {
    const { t, runner } = await setup();
    vi.stubEnv(
      "WEEKLY_REMINDER_SECRET",
      "test-only-signing-secret-with-32-characters",
    );
    await runner.action(api.billingNode.sync, {});
    await runner.mutation(api.weeklyReminders.setEnabled, { enabled: true });
    vi.setSystemTime(
      (await runner.query(api.users.current, {}))!.weeklyReminderNextAt!,
    );
    await t.mutation(internal.weeklyReminders.enqueueDue, {});
    const job = (
      await t.run((ctx) => ctx.db.query("weeklyReminders").collect())
    )[0];
    mocks.send.mockResolvedValueOnce({
      data: null,
      error: { message: "Unavailable" },
    });
    await t.action(internal.weeklyRemindersNode.send, { reminderId: job._id });
    const retry = (await t.run((ctx) => ctx.db.get(job._id)))!;
    expect(retry.status).toBe("pending");
    await t.action(internal.weeklyRemindersNode.send, { reminderId: job._id });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    vi.setSystemTime(retry.nextAttemptAt);
    await t.action(internal.weeklyRemindersNode.send, { reminderId: job._id });
    await t.action(internal.weeklyRemindersNode.send, { reminderId: job._id });
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send.mock.calls[0]).toEqual(mocks.send.mock.calls[1]);
    expect(mocks.send.mock.calls[0][0].headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
    expect(mocks.send.mock.calls[0][0].text).toContain(
      "https://pookie.example.test/pookie",
    );
    expect((await t.run((ctx) => ctx.db.get(job._id)))?.status).toBe("sent");
  });
});
