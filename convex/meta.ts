"use node";
import { createHash } from "node:crypto";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { metaEventName } from "../domain/meta";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const deliver = internalAction({
  args: { id: v.id("measurementEvents") },
  handler: async (ctx, { id }): Promise<void> => {
    const claimed = await ctx.runMutation(internal.measurement.claim, { id });
    if (!claimed) return;
    const { row, adMeasurement, attempt, email } = claimed;
    let success = false;
    try {
      const response = await fetch(
        `https://graph.facebook.com/${process.env.META_API_VERSION}/${process.env.META_PIXEL_ID}/events`,
        {
          method: "POST",
          signal: AbortSignal.timeout(8000),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            data: [
              {
                event_name: metaEventName(row.event),
                event_id: row._id, // Stable opaque ID across retries, no raw account/payment identifier.
                event_time: Math.floor(row.occurredAt / 1000),
                action_source: "website",
                event_source_url: "https://runpookierun.com/",
                user_data: {
                  external_id: [hash(row.userId)],
                  ...(email ? { em: [hash(email.trim().toLowerCase())] } : {}),
                  ...(adMeasurement.fbp ? { fbp: adMeasurement.fbp } : {}),
                  ...(adMeasurement.fbc ? { fbc: adMeasurement.fbc } : {}),
                  ...(adMeasurement.userAgent
                    ? { client_user_agent: adMeasurement.userAgent }
                    : {}),
                },
                ...(row.amountCents !== undefined
                  ? {
                      custom_data: {
                        value: row.amountCents / 100,
                        currency: row.currency,
                      },
                    }
                  : {}),
              },
            ],
            ...(process.env.META_TEST_EVENT_CODE
              ? { test_event_code: process.env.META_TEST_EVENT_CODE }
              : {}),
          }),
        },
      );
      const result = await response.json();
      success = response.ok && result.events_received === 1;
    } catch {
      /* Never log credentials, matching identifiers, or provider bodies. */
    }
    await ctx.runMutation(internal.measurement.finish, {
      id,
      attempt,
      success,
    });
  },
});
