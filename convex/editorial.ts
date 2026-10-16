import { priceLabel } from "../config";
import { v, ConvexError } from "convex/values";
import { z } from "zod";
import {
  mutation,
  query,
  internalMutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import {
  editionSchema,
  validateArticle,
  validateReview,
  publicationTime,
  upcomingEditions,
  approvedSourceHosts,
} from "../domain/editorial";
import { sessionTemplates } from "../domain/sessions";
import { guides } from "../content/guides";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
async function owner(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  const allowed = (process.env.POOKIE_EDITOR_CLERK_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!identity || !allowed.includes(identity.subject))
    throw new ConvexError("Owner access required.");
}
async function settings(ctx: QueryCtx | MutationCtx) {
  return ctx.db
    .query("editorialSettings")
    .withIndex("by_key", (q) => q.eq("key", "main"))
    .unique();
}
async function runFor(
  ctx: QueryCtx | MutationCtx,
  editionId: string,
  kind: "program" | "article",
) {
  return ctx.db
    .query("editorialRuns")
    .withIndex("by_edition_kind", (q) =>
      q.eq("editionId", editionId).eq("kind", kind),
    )
    .unique();
}
async function currentDraft(
  ctx: QueryCtx | MutationCtx,
  run: Doc<"editorialRuns">,
) {
  return ctx.db
    .query("editorialDrafts")
    .withIndex("by_run_version", (q) =>
      q.eq("runId", run._id).eq("version", run.version),
    )
    .unique();
}
export const published = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("editorialPublications")
      .withIndex("by_date")
      .order("desc")
      .collect();
    return rows
      .filter((row) => !row.withdrawn && row.publishedAt <= Date.now())
      .map((row) => ({
        edition: {
          ...JSON.parse(row.program),
          id: row.editionId,
          publishedAt: row.publishedAt,
          articleSlug: row.articleSlug,
        },
        article: {
          ...JSON.parse(row.article),
          editionId: row.editionId,
          publishedAt: row.publishedAt,
        },
      }));
  },
});
export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    await owner(ctx);
    const runs = await ctx.db.query("editorialRuns").order("desc").take(40);
    return {
      settings: (await settings(ctx)) ?? { enabled: false, paused: false },
      runs: await Promise.all(
        runs.map(async (run) => ({
          id: run._id,
          editionId: run.editionId,
          kind: run.kind,
          status: run.status,
          version: run.version,
          error: run.error,
          updatedAt: run.updatedAt,
          draft: (await currentDraft(ctx, run))?.body,
          reviews: (
            await ctx.db
              .query("editorialReviews")
              .withIndex("by_run", (q) => q.eq("runId", run._id))
              .collect()
          ).map(({ body, version, approved }) => ({ body, version, approved })),
        })),
      ),
      publications: (
        await ctx.db
          .query("editorialPublications")
          .withIndex("by_date")
          .order("desc")
          .take(12)
      ).map((row) => ({
        editionId: row.editionId,
        publishedAt: row.publishedAt,
        withdrawn: row.withdrawn,
      })),
    };
  },
});
async function queue(ctx: MutationCtx, now: number) {
  for (const editionId of upcomingEditions(now))
    for (const kind of ["program", "article"] as const) {
      if (!(await runFor(ctx, editionId, kind)))
        await ctx.db.insert("editorialRuns", {
          editionId,
          kind,
          status: "queued",
          version: 0,
          revisions: 0,
          createdAt: now,
          updatedAt: now,
        });
    }
}
export const control = mutation({
  args: {
    action: v.union(
      v.literal("pause"),
      v.literal("resume"),
      v.literal("enable"),
      v.literal("queue"),
      v.literal("retry"),
      v.literal("rollback"),
    ),
    runId: v.optional(v.id("editorialRuns")),
    editionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await owner(ctx);
    const now = Date.now();
    const existing = await settings(ctx);
    const id =
      existing?._id ??
      (await ctx.db.insert("editorialSettings", {
        key: "main",
        enabled: false,
        paused: false,
      }));
    if (args.action === "queue") {
      await queue(ctx, now);
      return;
    }
    if (args.action === "pause" || args.action === "resume") {
      await ctx.db.patch(id, { paused: args.action === "pause" });
      return;
    }
    if (args.action === "enable") {
      for (const editionId of upcomingEditions(now))
        for (const kind of ["program", "article"] as const) {
          const run = await runFor(ctx, editionId, kind);
          if (
            !run ||
            run.status !== "approved" ||
            run.approvedVersion !== run.version
          )
            throw new ConvexError(
              "Prepare and independently approve both pieces for the next two editions first.",
            );
        }
      await ctx.db.patch(id, { enabled: true });
      return;
    }
    if (args.action === "retry" && args.runId) {
      const run = await ctx.db.get(args.runId);
      if (
        !run ||
        run.status !== "failed" ||
        publicationTime(run.editionId) <= now
      )
        throw new ConvexError("Only a failed future run can be retried.");
      await ctx.db.patch(run._id, {
        status: "queued",
        revisions: 0,
        error: undefined,
        claim: undefined,
        leaseUntil: undefined,
        sessionId: undefined,
        approvedVersion: undefined,
        updatedAt: now,
      });
      return;
    }
    if (args.action === "rollback" && args.editionId) {
      const publication = await ctx.db
        .query("editorialPublications")
        .withIndex("by_edition", (q) => q.eq("editionId", args.editionId!))
        .unique();
      if (!publication) throw new ConvexError("Edition not found.");
      await ctx.db.patch(publication._id, { withdrawn: true });
      return;
    }
    throw new ConvexError("Invalid editorial action.");
  },
});
const operation = v.union(
  v.literal("queue"),
  v.literal("activate"),
  v.literal("claim"),
  v.literal("context"),
  v.literal("bind"),
  v.literal("save"),
  v.literal("source"),
  v.literal("review"),
  v.literal("fail"),
);
export const worker = internalMutation({
  args: {
    operation,
    runId: v.optional(v.id("editorialRuns")),
    token: v.string(),
    sessionId: v.optional(v.string()),
    data: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const config = await settings(ctx);
    if (args.operation === "queue") {
      if (!config?.paused) await queue(ctx, now);
      return { queued: !config?.paused };
    }
    if (args.operation === "activate") {
      if (config?.paused) return { enabled: false };
      if (config?.enabled) return { enabled: true };
      for (const editionId of upcomingEditions(now))
        for (const kind of ["program", "article"] as const) {
          const candidate = await runFor(ctx, editionId, kind);
          if (
            !candidate ||
            candidate.status !== "approved" ||
            candidate.approvedVersion !== candidate.version
          )
            return { enabled: false };
        }
      if (config) await ctx.db.patch(config._id, { enabled: true });
      else
        await ctx.db.insert("editorialSettings", {
          key: "main",
          enabled: true,
          paused: false,
        });
      return { enabled: true };
    }
    if (args.operation === "claim") {
      if (config?.paused) return null;
      // Replaying the same claim returns its receipt, never creates another assignment.
      const candidates = await ctx.db
        .query("editorialRuns")
        .order("asc")
        .collect();
      const receipt = candidates.find((run) => run.claim === args.token);
      if (receipt)
        return {
          runId: receipt._id,
          kind: receipt.kind,
          role: receipt.role,
          status: receipt.status,
          sessionId: receipt.sessionId,
          editionId: receipt.editionId,
        };
      for (const run of candidates) {
        if (
          publicationTime(run.editionId) <= now ||
          !["queued", "review-queued"].includes(run.status)
        )
          continue;
        if (
          run.kind === "article" &&
          (await runFor(ctx, run.editionId, "program"))?.status !== "approved"
        )
          continue;
        const role = run.status === "review-queued" ? "reviewer" : "author";
        await ctx.db.patch(run._id, {
          claim: args.token,
          role,
          sessionId: undefined,
          status: role === "author" ? "writing" : "reviewing",
          leaseUntil: Math.min(
            now + 20 * 60_000,
            publicationTime(run.editionId),
          ),
          updatedAt: now,
        });
        return {
          runId: run._id,
          kind: run.kind,
          role,
          status: role === "author" ? "writing" : "reviewing",
          editionId: run.editionId,
        };
      }
      return null;
    }
    const run = args.runId ? await ctx.db.get(args.runId) : null;
    if (!run || run.claim !== args.token || (run.leaseUntil ?? 0) <= now)
      throw new ConvexError("This worker claim is missing or expired.");
    if (args.operation === "fail") {
      await ctx.db.patch(run._id, {
        status: "failed",
        error: (args.data ?? "Generation failed.").slice(0, 500),
        leaseUntil: undefined,
        updatedAt: now,
      });
      return { failed: true };
    }
    if (config?.paused)
      throw new ConvexError("Editorial generation is paused.");
    if (args.operation === "bind") {
      if (
        !args.sessionId ||
        (run.sessionId && run.sessionId !== args.sessionId)
      )
        throw new ConvexError("A different session is already bound.");
      if (run.role === "reviewer" && args.sessionId === run.authorSession)
        throw new ConvexError("The author cannot review their own draft.");
      await ctx.db.patch(run._id, { sessionId: args.sessionId });
      return { bound: true };
    }
    if (!args.sessionId || run.sessionId !== args.sessionId)
      throw new ConvexError("Session identity does not match this claim.");
    const draft = await currentDraft(ctx, run);
    if (args.operation === "context") {
      const program = await runFor(ctx, run.editionId, "program");
      const programDraft = program ? await currentDraft(ctx, program) : null;
      return {
        kind: run.kind,
        role: run.role,
        editionId: run.editionId,
        version: run.version,
        draft: draft ? JSON.parse(draft.body) : null,
        program:
          program?.status === "approved" && programDraft
            ? JSON.parse(programDraft.body)
            : null,
        templates: sessionTemplates,
        price: `${priceLabel} USD/month`,
        trialDays: 7,
        productFacts: {
          freePlan: {
            url: "/try",
            price: "Free; no account or card required",
            personalization:
              "Shared weekly program, with a permanent archive for each edition",
            completion:
              "Checkmarks are saved only in the same browser; no cross-device sync",
            schedule:
              "20 minutes on Day 1, 20 minutes on Day 3, optional 15 minutes on Day 6; start any day with recovery days between outings",
          },
          paidPlan: {
            price: `${priceLabel} USD/month`,
            trial:
              "Seven days; card required; one trial per eligible customer; cancel before expiry to avoid a charge",
            personalization:
              "Uses saved available days, time limit, and experience",
            features:
              "Complete, shorten, move or skip a run; saved personal history; explicit weekly confirmation",
            progression: "Never automatically increases workout duration",
          },
          excludedFeatures: [
            "GPS recording",
            "watch integrations",
            "interval timer",
            "live coaching",
            "race training",
          ],
        },
        approvedSourceHosts,
        recent: (
          await ctx.db
            .query("editorialPublications")
            .withIndex("by_date")
            .order("desc")
            .take(8)
        ).map((row) => ({
          program: JSON.parse(row.program),
          article: JSON.parse(row.article),
        })),
        prepared: await Promise.all(
          (await ctx.db.query("editorialRuns").collect())
            .filter(
              (item) =>
                item._id !== run._id &&
                item.version > 0 &&
                ["approved", "review-queued", "reviewing"].includes(
                  item.status,
                ),
            )
            .slice(-8)
            .map(async (item) => ({
              editionId: item.editionId,
              kind: item.kind,
              draft: JSON.parse((await currentDraft(ctx, item))!.body),
            })),
        ),
        existingGuideTitles: guides.map((guide) => ({
          title: guide.title,
          slug: guide.slug,
        })),
        reviews: (
          await ctx.db
            .query("editorialReviews")
            .withIndex("by_run", (q) => q.eq("runId", run._id))
            .collect()
        ).map((row) => ({ version: row.version, ...JSON.parse(row.body) })),
      };
    }
    if (args.operation === "source") {
      const source = z
        .object({
          url: z.string().url(),
          excerpt: z.string().min(50).max(12000),
        })
        .strict()
        .parse(JSON.parse(args.data ?? "{}"));
      const url = new URL(source.url);
      if (
        url.protocol !== "https:" ||
        url.port ||
        url.username ||
        url.password ||
        !approvedSourceHosts.includes(url.hostname)
      )
        throw new ConvexError("Source host is not approved.");
      const evidence = await ctx.db
        .query("editorialSources")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .collect();
      if (
        evidence.filter((item) => item.sessionId === args.sessionId).length >= 6
      )
        throw new ConvexError("This session has reached its six-source limit.");
      await ctx.db.insert("editorialSources", {
        runId: run._id,
        version: run.version,
        sessionId: args.sessionId,
        url: source.url,
        excerpt: source.excerpt,
        fetchedAt: now,
      });
      return { saved: true };
    }
    if (args.operation === "save") {
      if (
        run.role !== "author" ||
        run.status !== "writing" ||
        run.revisions >= 3
      )
        throw new ConvexError("This run cannot save another draft.");
      const parsed =
        run.kind === "program"
          ? editionSchema.parse(JSON.parse(args.data ?? "{}"))
          : validateArticle(JSON.parse(args.data ?? "{}"));
      if ("slug" in parsed) {
        if (
          guides.some((guide) => guide.slug === parsed.slug) ||
          (await ctx.db
            .query("editorialPublications")
            .withIndex("by_slug", (q) => q.eq("articleSlug", parsed.slug))
            .first())
        )
          throw new ConvexError("Choose a new article slug.");
        const existing = await ctx.db.query("editorialDrafts").collect();
        if (
          existing.some(
            (item) =>
              item.runId !== run._id &&
              JSON.parse(item.body).slug === parsed.slug,
          )
        )
          throw new ConvexError("That article slug is already in use.");
      }
      const version = run.version + 1;
      await ctx.db.insert("editorialDrafts", {
        runId: run._id,
        version,
        body: JSON.stringify(parsed),
        authorSession: args.sessionId,
        createdAt: now,
      });
      await ctx.db.patch(run._id, {
        version,
        revisions: run.revisions + 1,
        authorSession: args.sessionId,
        status: "review-queued",
        approvedVersion: undefined,
        leaseUntil: undefined,
        updatedAt: now,
      });
      return { saved: true, version };
    }
    if (args.operation === "review") {
      if (
        run.role !== "reviewer" ||
        run.status !== "reviewing" ||
        !draft ||
        draft.authorSession === args.sessionId
      )
        throw new ConvexError(
          "Independent review of the saved draft is required.",
        );
      const payload = z
        .object({ version: z.number().int(), review: z.unknown() })
        .strict()
        .parse(JSON.parse(args.data ?? "{}"));
      if (payload.version !== run.version)
        throw new ConvexError(
          "The review must match the current draft version.",
        );
      const review = validateReview(payload.review);
      if (review.approved && run.kind === "article") {
        const article = validateArticle(JSON.parse(draft.body));
        const sources = await ctx.db
          .query("editorialSources")
          .withIndex("by_run", (q) => q.eq("runId", run._id))
          .collect();
        if (
          !article.sources.every((source) =>
            sources.some(
              (evidence) =>
                evidence.url === source.url &&
                evidence.version === run.version &&
                evidence.sessionId === args.sessionId,
            ),
          )
        )
          throw new ConvexError(
            "The reviewer must independently fetch every cited source.",
          );
      }
      await ctx.db.insert("editorialReviews", {
        runId: run._id,
        version: run.version,
        reviewerSession: args.sessionId,
        body: JSON.stringify(review),
        approved: review.approved,
        createdAt: now,
      });
      await ctx.db.patch(run._id, {
        status: review.approved
          ? "approved"
          : run.revisions >= 3
            ? "failed"
            : "queued",
        approvedVersion: review.approved ? run.version : undefined,
        leaseUntil: undefined,
        error: review.approved ? undefined : review.notes,
        updatedAt: now,
      });
      return { approved: review.approved };
    }
    throw new ConvexError("Unknown worker operation.");
  },
});
function requireStaging() {
  if (
    process.env.POOKIE_ENVIRONMENT !== "staging" ||
    !process.env.POOKIE_STAGING_DEPLOYMENT ||
    process.env.CONVEX_CLOUD_URL !==
      `https://${process.env.POOKIE_STAGING_DEPLOYMENT}.convex.cloud`
  )
    throw new ConvexError(
      "Accelerated publication is restricted to clean staging.",
    );
}
// CLI-only release rehearsal. Agents and browser clients cannot call internal functions.
// It changes timing only: the saved version and independent approval checks still apply.
export const scheduleStagingPublication = internalMutation({
  args: { editionId: v.string() },
  handler: async (ctx, { editionId }): Promise<Id<"_scheduled_functions">> => {
    requireStaging();
    publicationTime(editionId);
    for (const kind of ["program", "article"] as const) {
      const run = await runFor(ctx, editionId, kind);
      if (
        !run ||
        run.status !== "approved" ||
        run.approvedVersion !== run.version
      )
        throw new ConvexError(
          "Both current versions must be independently approved.",
        );
    }
    return ctx.scheduler.runAfter(10000, internal.editorial.publishDue, {
      stagingEdition: editionId,
    });
  },
});
export const publishDue = internalMutation({
  args: { stagingEdition: v.optional(v.string()) },
  handler: async (ctx, { stagingEdition }) => {
    if (stagingEdition) requireStaging();
    const now = Date.now();
    // Interrupted claims are surfaced; they never create a second model session automatically.
    for (const status of ["writing", "reviewing"])
      for (const run of await ctx.db
        .query("editorialRuns")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect()) {
        if ((run.leaseUntil ?? 0) <= now)
          await ctx.db.patch(run._id, {
            status: "failed",
            error:
              "The worker stopped or its claim expired. Retry this edition from the owner page.",
            leaseUntil: undefined,
            updatedAt: now,
          });
      }
    const config = await settings(ctx);
    if (!config?.enabled || config.paused) return;
    for (const program of await ctx.db
      .query("editorialRuns")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect()) {
      if (
        program.kind !== "program" ||
        (stagingEdition
          ? program.editionId !== stagingEdition
          : publicationTime(program.editionId) > now)
      )
        continue;
      const article = await runFor(ctx, program.editionId, "article");
      if (
        !article ||
        article.status !== "approved" ||
        article.approvedVersion !== article.version ||
        program.approvedVersion !== program.version
      )
        continue;
      if (
        await ctx.db
          .query("editorialPublications")
          .withIndex("by_edition", (q) => q.eq("editionId", program.editionId))
          .unique()
      )
        continue;
      const programDraft = await currentDraft(ctx, program);
      const articleDraft = await currentDraft(ctx, article);
      if (!programDraft || !articleDraft) continue;
      const body = validateArticle(JSON.parse(articleDraft.body));
      editionSchema.parse(JSON.parse(programDraft.body));
      await ctx.db.insert("editorialPublications", {
        editionId: program.editionId,
        program: programDraft.body,
        article: articleDraft.body,
        articleSlug: body.slug,
        publishedAt: stagingEdition ? now : publicationTime(program.editionId),
        stagingRehearsal: stagingEdition ? true : undefined,
        withdrawn: false,
      });
      for (const run of [program, article])
        await ctx.db.patch(run._id, { status: "published", updatedAt: now });
    }
  },
});
