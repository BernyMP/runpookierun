import { v } from "convex/values";
const experience = v.union(
  v.literal("new"),
  v.literal("returning"),
  v.literal("regular"),
);
const minutes = v.union(v.literal(15), v.literal(20), v.literal(30));
const discovery = v.union(
  v.literal("search"),
  v.literal("ai-search"),
  v.literal("community"),
  v.literal("club"),
  v.literal("friend"),
  v.literal("waitlist"),
  v.literal("other"),
);
export const weeklyChoiceValidator = v.union(
  v.object({ type: v.literal("keep") }),
  v.object({ type: v.literal("easier") }),
  v.object({ type: v.literal("choose"), minutes: v.number() }),
);
export const attributionValidator = v.object({
  source: v.string(),
  campaign: v.optional(v.string()),
  medium: v.optional(v.string()),
  content: v.optional(v.string()),
});
export const effortValidator = v.union(
  v.literal("easy"),
  v.literal("okay"),
  v.literal("hard"),
);
export const preferencesValidator = v.object({
  acceptedTerms: v.literal(true),
  experience,
  motivation: v.string(),
  days: v.array(v.number()),
  minutes,
  timezone: v.string(),
  discovery: v.optional(discovery),
});
export const draftValidator = v.object({
  acceptedTerms: v.optional(v.literal(true)),
  experience: v.optional(experience),
  motivation: v.optional(v.string()),
  days: v.optional(v.array(v.number())),
  minutes: v.optional(minutes),
  timezone: v.optional(v.string()),
  discovery: v.optional(discovery),
});
export const workoutValidator = v.object({
  id: v.string(),
  date: v.string(),
  kind: v.union(v.literal("run"), v.literal("run-walk"), v.literal("rest")),
  minutes: v.number(),
  description: v.string(),
  status: v.union(
    v.literal("planned"),
    v.literal("done"),
    v.literal("skipped"),
  ),
  effort: v.optional(effortValidator),
  completedAt: v.optional(v.number()),
  templateId: v.optional(v.string()),
  title: v.optional(v.string()),
  playfulPrompt: v.optional(v.string()),
  steps: v.optional(
    v.array(
      v.object({
        phase: v.union(
          v.literal("warm-up"),
          v.literal("main"),
          v.literal("cool-down"),
        ),
        action: v.union(v.literal("walk"), v.literal("jog")),
        seconds: v.number(),
      }),
    ),
  ),
});
export const commandValidator = v.union(
  v.object({ type: v.literal("done"), effort: v.optional(effortValidator) }),
  v.object({ type: v.literal("effort"), effort: effortValidator }),
  v.object({ type: v.literal("shorten") }),
  v.object({ type: v.literal("move"), targetDate: v.string() }),
  v.object({ type: v.literal("skip") }),
);
export const subscriptionValidator = v.object({
  clerkId: v.string(),
  itemId: v.string(),
  planId: v.string(),
  status: v.string(),
  periodEnd: v.number(),
  isTrial: v.boolean(),
  trialEligible: v.optional(v.boolean()),
  willRenew: v.boolean(),
  amountCents: v.number(),
  currency: v.string(),
  syncedAt: v.number(),
});

export const adMeasurementValidator = v.object({
  consent: v.boolean(),
  expiresAt: v.optional(v.number()),
  fbp: v.optional(v.string()),
  fbc: v.optional(v.string()),
  clickExpiresAt: v.optional(v.number()),
  userAgent: v.optional(v.string()),
});
