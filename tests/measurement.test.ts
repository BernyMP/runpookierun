import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { Webhook } from "svix";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { acquisitionFromUrl, sanitizeAttribution } from "../domain/acquisition";
import {
  metaEventName,
  sanitizeAdMeasurement,
  verifiedPayment,
} from "../domain/meta";
import { events } from "../domain/analytics";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const now = Date.parse("2026-09-23T18:00:00Z");
const payment = {
  payment_id: "pay_1",
  status: "paid",
  paid_at: now,
  payer: { user_id: "runner" },
  totals: { grand_total: { amount: 499, currency: "usd" } },
  subscription_items: [{ plan_id: "plan" }],
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function setup(consent = true) {
  const t = convexTest(schema, modules);
  const runner = t.withIdentity({
    subject: "runner",
    email: "Runner@Example.test",
    emailVerified: true,
  });
  const userId = await runner.mutation(api.users.ensure, {
    attribution: {
      source: "instagram",
      medium: "paid_social",
      campaign: "comeback-us-v1",
      content: "restart-feed",
    },
    adMeasurement: {
      consent,
      fbp: `fb.1.${now}.1234`,
      fbc: `fb.1.${now}.testclick`,
      userAgent: "Test browser",
    },
  });
  return { t, runner, userId };
}
function enableMeta() {
  vi.stubEnv("META_ENABLED", "true");
  vi.stubEnv("META_PIXEL_ID", "12345");
  vi.stubEnv("META_ACCESS_TOKEN", "test-only");
  vi.stubEnv("META_API_VERSION", "v23.0");
  vi.stubEnv("META_ALLOWED_EVENTS", "CompleteRegistration,StartTrial,Purchase");
}
describe("attribution and privacy", () => {
  it("preserves paid Instagram creative codes and drops arbitrary payload fields", () => {
    expect(
      acquisitionFromUrl(
        "https://runpookierun.com/?utm_source=instagram&utm_medium=paid_social&utm_campaign=comeback-us-v1&utm_content=restart-feed",
      ),
    ).toEqual({
      source: "instagram",
      medium: "paid_social",
      campaign: "comeback-us-v1",
      content: "restart-feed",
    });
    expect(sanitizeAttribution({ source: "ig" })).toEqual({
      source: "instagram",
    });
    expect(sanitizeAttribution({ source: "fb" })).toEqual({
      source: "facebook",
    });
    expect(
      acquisitionFromUrl(
        "https://runpookierun.com",
        "https://l.instagram.com/sensitive",
      ),
    ).toEqual({ source: "instagram" });
    expect(
      sanitizeAttribution({
        source: "instagram",
        campaign: "a@b.com",
        content: "private text",
        medium: "notes",
      }),
    ).toEqual({ source: "instagram" });
    expect(
      sanitizeAdMeasurement({ consent: false, fbp: `fb.1.${now}.1234` }),
    ).toEqual({ consent: false });
    expect(
      sanitizeAdMeasurement({ consent: true, expiresAt: now - 1 }),
    ).toEqual({ consent: false });
  });
  it("never maps workouts, setup details or cancellations to advertising events", () => {
    for (const name of [
      events.FIRST_RUN,
      events.RUN,
      events.SETUP,
      events.SECOND_WEEK,
      events.CANCEL,
      "signup_clicked",
    ])
      expect(metaEventName(name)).toBeNull();
    expect(metaEventName(events.TRIAL)).toBe("StartTrial");
  });
});
describe("verified billing measurement", () => {
  it("requires a positive paid receipt for the configured plan", () => {
    expect(verifiedPayment(payment, "plan")).toMatchObject({
      amountCents: 499,
      currency: "USD",
    });
    for (const change of [
      { status: "pending" },
      { status: "failed" },
      { totals: { grand_total: { amount: 0, currency: "USD" } } },
      { subscription_items: [{ plan_id: "other" }] },
      { paid_at: now + 600000 },
      { payment_id: "" },
    ])
      expect(verifiedPayment({ ...payment, ...change }, "plan")).toBeNull();
  });
  it("an active paid entitlement alone never becomes a paid conversion", async () => {
    const { t, runner } = await setup();
    await t.mutation(internal.billing.apply, {
      subscription: {
        clerkId: "runner",
        itemId: "item",
        planId: "plan",
        status: "active",
        isTrial: false,
        willRenew: true,
        periodEnd: now + 86400000,
        amountCents: 499,
        currency: "USD",
        syncedAt: now,
      },
    });
    expect(
      (await runner.query(api.users.current, {}))?.paidConversionAt,
    ).toBeUndefined();
    expect(
      (await t.run((ctx) => ctx.db.query("measurementEvents").collect())).some(
        (e) => e.event === events.PAID,
      ),
    ).toBe(false);
  });
  it("deduplicates receipts, counts renewals, and handles out-of-order payment delivery", async () => {
    const { t, runner } = await setup();
    const newer = {
      ...verifiedPayment(payment, "plan")!,
      paymentId: "pay_2",
      paidAt: now + 30 * 86400000,
    };
    await t.mutation(internal.measurement.recordPayment, newer);
    await t.mutation(internal.measurement.recordPayment, newer);
    await t.mutation(
      internal.measurement.recordPayment,
      verifiedPayment(payment, "plan")!,
    );
    const rows = await t.run((ctx) =>
      ctx.db.query("measurementEvents").collect(),
    );
    expect(rows.find((e) => e.eventId === "payment/pay_1")?.event).toBe(
      events.PAID,
    );
    expect(rows.find((e) => e.eventId === "payment/pay_2")?.event).toBe(
      events.RENEWAL,
    );
    expect(
      await t.run((ctx) => ctx.db.query("paymentReceipts").collect()),
    ).toHaveLength(2);
    expect((await runner.query(api.users.current, {}))?.paidConversionAt).toBe(
      now,
    );
  });
  it("records a signed successful payment once across distinct webhook deliveries", async () => {
    const { t } = await setup();
    vi.stubEnv("CLERK_PAID_PLAN_ID", "plan");
    const secret = `whsec_${Buffer.from("test").toString("base64")}`;
    vi.stubEnv("CLERK_WEBHOOK_SECRET", secret);
    const body = JSON.stringify({
      type: "paymentAttempt.updated",
      data: payment,
    });
    for (const id of ["evt_1", "evt_2"]) {
      const signature = new Webhook(secret).sign(id, new Date(now), body);
      expect(
        (
          await t.fetch("/webhooks/clerk", {
            method: "POST",
            headers: {
              "svix-id": id,
              "svix-timestamp": String(now / 1000),
              "svix-signature": signature,
            },
            body,
          })
        ).status,
      ).toBe(200);
    }
    expect(
      await t.run((ctx) => ctx.db.query("paymentReceipts").collect()),
    ).toHaveLength(1);
    expect(
      (await t.fetch("/webhooks/clerk", { method: "POST", body })).status,
    ).toBe(400);
  });
});
describe("Meta delivery", () => {
  it("is off by default and does not backfill events after later enablement", async () => {
    const { t } = await setup();
    const rows = await t.run((ctx) =>
      ctx.db.query("measurementEvents").collect(),
    );
    expect(rows[0].metaStatus).toBe("disabled");
    enableMeta();
    expect(
      await t.mutation(internal.measurement.claim, { id: rows[0]._id }),
    ).toBeNull();
  });
  it("uses hashed matching data, real payment value and stable IDs across retries", async () => {
    enableMeta();
    const { t } = await setup();
    await t.mutation(
      internal.measurement.recordPayment,
      verifiedPayment(payment, "plan")!,
    );
    const row = (
      await t.run((ctx) => ctx.db.query("measurementEvents").collect())
    ).find((e) => e.event === events.PAID)!;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "temporary" }), { status: 503 }),
      )
      .mockResolvedValue(
        new Response(JSON.stringify({ events_received: 1 }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await t.action(internal.meta.deliver, { id: row._id });
    vi.setSystemTime(now + 120000);
    await t.action(internal.meta.deliver, { id: row._id });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = JSON.parse(fetchMock.mock.calls[0][1].body).data[0];
    const retry = JSON.parse(fetchMock.mock.calls[1][1].body).data[0];
    expect(first).toEqual(retry);
    expect(first.custom_data).toEqual({ value: 4.99, currency: "USD" });
    expect(first.event_name).toBe("Purchase");
    expect(first.user_data.em[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(first)).not.toMatch(
      /Runner@|motivation|effort|workout|pay_1/,
    );
    expect((await t.run((ctx) => ctx.db.get(row._id)))?.metaStatus).toBe(
      "sent",
    );
  });
  it("suppresses opted-out users and pending events after revocation", async () => {
    enableMeta();
    const { t, runner } = await setup();
    const row = (
      await t.run((ctx) => ctx.db.query("measurementEvents").collect())
    )[0];
    await runner.mutation(api.users.setAdMeasurement, {
      adMeasurement: { consent: false },
    });
    expect(
      await t.mutation(internal.measurement.claim, { id: row._id }),
    ).toBeNull();
    expect((await t.run((ctx) => ctx.db.get(row._id)))?.metaStatus).toBe(
      "suppressed",
    );
  });
  it("preserves the original consent time on refresh and rejects events after withdrawal/regrant", async () => {
    enableMeta();
    const { t, runner } = await setup();
    const row = (
      await t.run((ctx) => ctx.db.query("measurementEvents").collect())
    )[0];
    vi.setSystemTime(now + 1000);
    await runner.mutation(api.users.setAdMeasurement, {
      adMeasurement: { consent: true },
    });
    expect(
      (await runner.query(api.users.current, {}))?.adConsentUpdatedAt,
    ).toBe(now);
    await runner.mutation(api.users.setAdMeasurement, {
      adMeasurement: { consent: false },
    });
    vi.setSystemTime(now + 2000);
    await runner.mutation(api.users.setAdMeasurement, {
      adMeasurement: { consent: true },
    });
    expect(
      await t.mutation(internal.measurement.claim, { id: row._id }),
    ).toBeNull();
    expect(
      sanitizeAdMeasurement({
        consent: true,
        fbc: `fb.1.${now}.click`,
        clickExpiresAt: now - 1,
      }),
    ).not.toHaveProperty("fbc");
  });
  it("enforces dataset allowlists, leases, consent expiry and account deletion", async () => {
    enableMeta();
    const { t, runner } = await setup();
    const row = (
      await t.run((ctx) => ctx.db.query("measurementEvents").collect())
    )[0];
    expect(
      await t.mutation(internal.measurement.claim, { id: row._id }),
    ).not.toBeNull();
    expect(
      await t.mutation(internal.measurement.claim, { id: row._id }),
    ).toBeNull();
    vi.setSystemTime(now + 120000);
    vi.stubEnv("META_ALLOWED_EVENTS", "StartTrial");
    expect(
      await t.mutation(internal.measurement.claim, { id: row._id }),
    ).toBeNull();
    await runner.mutation(api.users.setAdMeasurement, {
      adMeasurement: { consent: true, expiresAt: now - 1 },
    });
    expect(
      (await runner.query(api.users.current, {}))?.adMeasurement?.consent,
    ).toBe(false);
    await t.mutation(internal.users.removeData, { clerkId: "runner" });
    expect(
      await t.run((ctx) => ctx.db.query("measurementEvents").collect()),
    ).toHaveLength(0);
  });
});
