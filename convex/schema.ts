import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  draftValidator,
  preferencesValidator,
  subscriptionValidator,
  workoutValidator,
  attributionValidator,
  adMeasurementValidator,
} from "./validators";
export default defineSchema({
  editorialSettings: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    paused: v.boolean(),
  }).index("by_key", ["key"]),
  editorialRuns: defineTable({
    editionId: v.string(),
    kind: v.union(v.literal("program"), v.literal("article")),
    status: v.string(),
    version: v.number(),
    revisions: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    claim: v.optional(v.string()),
    leaseUntil: v.optional(v.number()),
    role: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    authorSession: v.optional(v.string()),
    error: v.optional(v.string()),
    approvedVersion: v.optional(v.number()),
  })
    .index("by_edition_kind", ["editionId", "kind"])
    .index("by_status", ["status"]),
  editorialDrafts: defineTable({
    runId: v.id("editorialRuns"),
    version: v.number(),
    body: v.string(),
    authorSession: v.string(),
    createdAt: v.number(),
  }).index("by_run_version", ["runId", "version"]),
  editorialReviews: defineTable({
    runId: v.id("editorialRuns"),
    version: v.number(),
    reviewerSession: v.string(),
    body: v.string(),
    approved: v.boolean(),
    createdAt: v.number(),
  }).index("by_run", ["runId"]),
  editorialSources: defineTable({
    runId: v.id("editorialRuns"),
    version: v.number(),
    sessionId: v.string(),
    url: v.string(),
    excerpt: v.string(),
    fetchedAt: v.number(),
  }).index("by_run", ["runId"]),
  editorialPublications: defineTable({
    stagingRehearsal: v.optional(v.boolean()),
    editionId: v.string(),
    program: v.string(),
    article: v.string(),
    articleSlug: v.string(),
    publishedAt: v.number(),
    withdrawn: v.boolean(),
  })
    .index("by_edition", ["editionId"])
    .index("by_slug", ["articleSlug"])
    .index("by_date", ["publishedAt"]),

  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    draft: v.optional(draftValidator),
    preferences: v.optional(preferencesValidator),
    createdAt: v.number(),
    firstCompletedAt: v.optional(v.number()),
    weekCount: v.optional(v.number()),
    paidConversionAt: v.optional(v.number()),
    deleting: v.optional(v.boolean()),
    attribution: v.optional(attributionValidator),
    adMeasurement: v.optional(adMeasurementValidator),
    adConsentUpdatedAt: v.optional(v.number()),
    emailVerified: v.optional(v.boolean()),
    weeklyReminderEnabled: v.optional(v.boolean()),
    weeklyReminderVersion: v.optional(v.number()),
    weeklyReminderNextAt: v.optional(v.number()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_weekly_due", ["weeklyReminderEnabled", "weeklyReminderNextAt"]),
  weeks: defineTable({
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    timezone: v.string(),
    previousRunDate: v.optional(v.string()),
    previousWeekId: v.optional(v.id("weeks")),
    approvedMinutes: v.optional(v.number()),
    summary: v.string(),
    workouts: v.array(workoutValidator),
    revision: v.number(),
    source: v.union(v.literal("rules"), v.literal("ai")),
    personalizationState: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("fallback"),
      v.literal("disabled"),
    ),
    createdAt: v.number(),
  }).index("by_user_start", ["userId", "startDate"]),
  weeklyReminders: defineTable({
    userId: v.id("users"),
    version: v.number(),
    scheduledFor: v.number(),
    nextAttemptAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("canceled"),
      v.literal("failed"),
    ),
    attempts: v.number(),
    leaseId: v.optional(v.string()),
    leaseUntil: v.optional(v.number()),
    providerId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status_due", ["status", "nextAttemptAt"]),
  subscriptions: defineTable(subscriptionValidator).index("by_clerkId", [
    "clerkId",
  ]),
  reminders: defineTable({
    clerkId: v.string(),
    itemId: v.string(),
    trialEnd: v.number(),
    dueAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("canceled"),
      v.literal("failed"),
    ),
    attempts: v.number(),
    leaseUntil: v.optional(v.number()),
    leaseId: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    providerId: v.optional(v.string()),
    error: v.optional(v.string()),
  })
    .index("by_item_end", ["itemId", "trialEnd"])
    .index("by_clerkId", ["clerkId"])
    .index("by_status_due", ["status", "dueAt"]),
  billingEvents: defineTable({
    eventId: v.string(),
    clerkId: v.string(),
    receivedAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("processed"),
      v.literal("failed"),
    ),
    attempts: v.number(),
    error: v.optional(v.string()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_clerkId", ["clerkId"]),
  measurementEvents: defineTable({
    eventId: v.string(),
    userId: v.id("users"),
    event: v.string(),
    occurredAt: v.number(),
    amountCents: v.optional(v.number()),
    currency: v.optional(v.string()),
    attribution: v.optional(attributionValidator),
    metaStatus: v.union(
      v.literal("disabled"),
      v.literal("suppressed"),
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    attempts: v.number(),
    nextAttemptAt: v.number(),
    leaseUntil: v.optional(v.number()),
    sentAt: v.optional(v.number()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_time", ["occurredAt"])
    .index("by_status_due", ["metaStatus", "nextAttemptAt"]),
  paymentReceipts: defineTable({
    paymentId: v.string(),
    userId: v.id("users"),
    amountCents: v.number(),
    currency: v.string(),
    paidAt: v.number(),
  })
    .index("by_paymentId", ["paymentId"])
    .index("by_user", ["userId"]),
  emailBudgets: defineTable({
    key: v.string(),
    count: v.number(),
    nextAt: v.optional(v.number()),
  }).index("by_key", ["key"]),
  emailReservations: defineTable({
    key: v.string(),
    reservedAt: v.number(),
  }).index("by_key", ["key"]),
  rateLimits: defineTable({ key: v.string(), nextAt: v.number() }).index(
    "by_key",
    ["key"],
  ),
});
