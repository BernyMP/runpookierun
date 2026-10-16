"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { events } from "../domain/analytics";
export const capture = internalAction({
  args: { event: v.string(), distinctId: v.string(), eventId: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.POSTHOG_KEY;
    if (!apiKey) return;
    if (!Object.values(events).some((event) => event === args.event)) return;
    try {
      const context = await ctx.runQuery(internal.users.analyticsContext, {
        userId: args.distinctId as Id<"users">,
      });
      if (!context) return;
      const response = await fetch(
        new URL(
          "/capture/",
          process.env.POSTHOG_HOST || "https://us.i.posthog.com",
        ),
        {
          method: "POST",
          signal: AbortSignal.timeout(5000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            event: args.event,
            properties: {
              distinct_id: args.distinctId,
              $insert_id: args.eventId,
              $process_person_profile: false,
              acquisition_source: context.attribution?.source ?? "unknown",
              ...(context.attribution?.campaign
                ? { acquisition_campaign: context.attribution.campaign }
                : {}),
              ...(context.attribution?.medium
                ? { acquisition_medium: context.attribution.medium }
                : {}),
              ...(context.attribution?.content
                ? { acquisition_content: context.attribution.content }
                : {}),
              ...(context.discovery ? { discovery: context.discovery } : {}),
            },
          }),
        },
      );
      if (!response.ok) throw new Error("Analytics unavailable");
    } catch {
      console.warn("analytics_delivery_failed", { event: args.event });
    }
  },
});
