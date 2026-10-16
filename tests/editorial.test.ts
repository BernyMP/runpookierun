import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { starterEdition } from "../content/free-program";
import { guides } from "../content/guides";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
const now = Date.parse("2026-09-20T17:00Z");
const program = {
  theme: starterEdition.theme,
  introduction: starterEdition.introduction,
  sessions: starterEdition.sessions,
};
const allChecks = {
  accurate: true,
  accessible: true,
  sourcesVerified: true,
  distinct: true,
  onBrand: true,
};
type Job = {
  runId: Id<"editorialRuns">;
  kind: "program" | "article";
  role: string;
  editionId: string;
  status: string;
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv("POOKIE_EDITOR_CLERK_IDS", "owner");
  vi.stubEnv("POOKIE_STAGING_DEPLOYMENT", "example-staging-123");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
const make = () => convexTest(schema, modules);
it("accelerated release rehearsal rejects production and unapproved staging drafts", async () => {
  const t = make();
  vi.stubEnv("POOKIE_ENVIRONMENT", "production");
  vi.stubEnv("CONVEX_CLOUD_URL", "https://example-production-456.convex.cloud");
  await expect(
    t.mutation(internal.editorial.scheduleStagingPublication, {
      editionId: "2026-09-21",
    }),
  ).rejects.toThrow("restricted to clean staging");
  await expect(
    t.mutation(internal.editorial.publishDue, {
      stagingEdition: "2026-09-21",
    }),
  ).rejects.toThrow("restricted to clean staging");
  vi.stubEnv("POOKIE_ENVIRONMENT", "staging");
  await expect(
    t.mutation(internal.editorial.scheduleStagingPublication, {
      editionId: "2026-09-21",
    }),
  ).rejects.toThrow("restricted to clean staging");
  vi.stubEnv("CONVEX_CLOUD_URL", "https://example-staging-123.convex.cloud");
  await expect(
    t.mutation(internal.editorial.scheduleStagingPublication, {
      editionId: "2026-09-21",
    }),
  ).rejects.toThrow("independently approved");
  await t.mutation(internal.editorial.publishDue, {
    stagingEdition: "2026-09-21",
  });
  expect(await t.query(api.editorial.published, {})).toEqual([]);
});
it("accelerated release requires an explicit staging deployment binding", async () => {
  vi.stubEnv("POOKIE_ENVIRONMENT", "staging");
  vi.stubEnv("POOKIE_STAGING_DEPLOYMENT", "");
  vi.stubEnv("CONVEX_CLOUD_URL", "https://undefined.convex.cloud");
  const t = make();
  await expect(
    t.mutation(internal.editorial.scheduleStagingPublication, {
      editionId: "2026-09-21",
    }),
  ).rejects.toThrow("restricted to clean staging");
});
async function claim(t: ReturnType<typeof make>, token: string) {
  return (await t.mutation(internal.editorial.worker, {
    operation: "claim",
    token,
  })) as Job;
}
async function bind(
  t: ReturnType<typeof make>,
  job: Job,
  token: string,
  sessionId: string,
) {
  await t.mutation(internal.editorial.worker, {
    operation: "bind",
    runId: job.runId,
    token,
    sessionId,
  });
}
async function draft(
  t: ReturnType<typeof make>,
  job: Job,
  token: string,
  sessionId: string,
) {
  const {
    publishedAt: _publishedAt,
    modifiedAt: _modifiedAt,
    ...guide
  } = guides[0];
  const article = {
    ...guide,
    sections: [
      ...guides[0].sections,
      {
        heading: "A small example",
        paragraphs: [
          "Choose an available day and leave time to walk. You can repeat a familiar route and keep the whole outing comfortable. There is no need to catch up if life changes your plan. A shorter walk can still be a useful break in your day. ".repeat(
            3,
          ),
        ],
      },
    ],
    slug: `test-${job.editionId}`,
    title: `Your little loop ${job.editionId}`,
  };
  await bind(t, job, token, sessionId);
  await t.mutation(internal.editorial.worker, {
    operation: "save",
    runId: job.runId,
    token,
    sessionId,
    data: JSON.stringify(job.kind === "program" ? program : article),
  });
  return article;
}
it("only the owner can see drafts or control publication", async () => {
  const t = make();
  await expect(t.query(api.editorial.dashboard, {})).rejects.toThrow(
    "Owner access",
  );
  await expect(
    t
      .withIdentity({ subject: "runner" })
      .mutation(api.editorial.control, { action: "enable" }),
  ).rejects.toThrow("Owner access");
  expect(await t.query(api.editorial.published, {})).toEqual([]);
  expect(
    (
      await t
        .withIdentity({ subject: "owner" })
        .query(api.editorial.dashboard, {})
    ).runs,
  ).toEqual([]);
});
it("queue and claim retries are idempotent and concurrent workers cannot share a job", async () => {
  const t = make();
  await t.mutation(internal.editorial.worker, {
    operation: "queue",
    token: "queue",
  });
  await t.mutation(internal.editorial.worker, {
    operation: "queue",
    token: "queue",
  });
  expect(
    await t.run((ctx) => ctx.db.query("editorialRuns").collect()),
  ).toHaveLength(4);
  const a = await claim(t, "a");
  const replay = await claim(t, "a");
  const b = await claim(t, "b");
  expect(replay.runId).toBe(a.runId);
  expect(b.runId).not.toBe(a.runId);
  await expect(bind(t, a, "wrong-token", "session")).rejects.toThrow("claim");
});
it("authors cannot approve themselves and reviews must match the saved version", async () => {
  const t = make();
  await t.mutation(internal.editorial.worker, {
    operation: "queue",
    token: "q",
  });
  const author = await claim(t, "a");
  await draft(t, author, "a", "author-session");
  const reviewer = await claim(t, "r");
  expect(reviewer.runId).toBe(author.runId);
  await expect(bind(t, reviewer, "r", "author-session")).rejects.toThrow(
    "cannot review",
  );
  await bind(t, reviewer, "r", "review-session");
  const context = await t.mutation(internal.editorial.worker, {
    operation: "context",
    runId: reviewer.runId,
    token: "r",
    sessionId: "review-session",
  });
  expect(context).toMatchObject({
    productFacts: {
      freePlan: { url: "/try", price: "Free; no account or card required" },
      paidPlan: { price: "$4.99 USD/month" },
    },
  });
  const args = {
    operation: "review" as const,
    runId: reviewer.runId,
    token: "r",
    sessionId: "review-session",
  };
  await expect(
    t.mutation(internal.editorial.worker, {
      ...args,
      data: JSON.stringify({
        version: 0,
        review: { approved: true, notes: "Good", checks: allChecks },
      }),
    }),
  ).rejects.toThrow("current draft version");
  await expect(
    t.mutation(internal.editorial.worker, {
      ...args,
      data: JSON.stringify({
        version: 1,
        review: {
          approved: true,
          notes: "Good",
          checks: { ...allChecks, accurate: false },
        },
      }),
    }),
  ).rejects.toThrow("Every review check");
  await t.mutation(internal.editorial.worker, {
    ...args,
    data: JSON.stringify({
      version: 1,
      review: {
        approved: false,
        notes: "Needs a more specific theme.",
        checks: { ...allChecks, onBrand: false },
      },
    }),
  });
  const revised = await claim(t, "a2");
  await draft(t, revised, "a2", "author-2");
  expect((await t.run((ctx) => ctx.db.get(author.runId)))?.version).toBe(2);
  expect(
    await t.run((ctx) => ctx.db.query("editorialDrafts").collect()),
  ).toHaveLength(2);
});
it("interruptions fail closed and owner retry preserves the old draft", async () => {
  const t = make();
  await t.mutation(internal.editorial.worker, {
    operation: "queue",
    token: "q",
  });
  const job = await claim(t, "offline");
  vi.setSystemTime(now + 21 * 60_000);
  await t.mutation(internal.editorial.publishDue, {});
  expect((await t.run((ctx) => ctx.db.get(job.runId)))?.status).toBe("failed");
  await t
    .withIdentity({ subject: "owner" })
    .mutation(api.editorial.control, { action: "retry", runId: job.runId });
  expect((await t.run((ctx) => ctx.db.get(job.runId)))?.status).toBe("queued");
});
it("two approved editions unlock automatic publication; sources, dates, duplicates and rollback are enforced", async () => {
  const t = make();
  await t.mutation(internal.editorial.worker, {
    operation: "queue",
    token: "q",
  });
  expect(
    await t.mutation(internal.editorial.worker, {
      operation: "activate",
      token: "activate",
    }),
  ).toEqual({ enabled: false });
  for (let index = 0; index < 4; index++) {
    const token = `author-${index}`;
    const job = await claim(t, token);
    const article = await draft(t, job, token, token);
    const reviewToken = `review-${index}`;
    const reviewer = await claim(t, reviewToken);
    await bind(t, reviewer, reviewToken, reviewToken);
    const review = {
      operation: "review" as const,
      runId: reviewer.runId,
      token: reviewToken,
      sessionId: reviewToken,
      data: JSON.stringify({
        version: 1,
        review: {
          approved: true,
          notes: "Accurate, useful, and distinct.",
          checks: allChecks,
        },
      }),
    };
    if (job.kind === "article") {
      await expect(
        t.mutation(internal.editorial.worker, review),
      ).rejects.toThrow("independently fetch");
      for (const source of article.sources)
        await t.mutation(internal.editorial.worker, {
          operation: "source",
          runId: reviewer.runId,
          token: reviewToken,
          sessionId: reviewToken,
          data: JSON.stringify({
            url: source.url,
            excerpt:
              "Verified source text about gentle running and recovery. ".repeat(
                3,
              ),
          }),
        });
    }
    await t.mutation(internal.editorial.worker, review);
  }
  expect(
    await t.mutation(internal.editorial.worker, {
      operation: "activate",
      token: "activate",
    }),
  ).toEqual({ enabled: true });
  await t.mutation(internal.editorial.publishDue, {});
  expect(await t.query(api.editorial.published, {})).toHaveLength(0);
  vi.setSystemTime(Date.parse("2026-09-21T13:01Z"));
  await t.mutation(internal.editorial.publishDue, {});
  await t.mutation(internal.editorial.publishDue, {});
  expect(await t.query(api.editorial.published, {})).toHaveLength(1);
  vi.setSystemTime(Date.parse("2026-09-28T13:01Z"));
  await t.mutation(internal.editorial.publishDue, {});
  expect(await t.query(api.editorial.published, {})).toHaveLength(2);
  await t.withIdentity({ subject: "owner" }).mutation(api.editorial.control, {
    action: "rollback",
    editionId: "2026-09-28",
  });
  const published = await t.query(api.editorial.published, {});
  expect(published).toHaveLength(1);
  expect(published[0].edition.id).toBe("2026-09-21");
});
it("the worker HTTP bridge rejects anonymous requests", async () => {
  const t = make();
  vi.stubEnv("POOKIE_EDITOR_WORKER_SECRET", "a".repeat(32));
  expect(
    (await t.fetch("/editorial/worker", { method: "POST", body: "{}" })).status,
  ).toBe(401);
});
it("three rejected drafts exhaust the automatic revision budget", async () => {
  const t = make();
  await t.mutation(internal.editorial.worker, {
    operation: "queue",
    token: "q",
  });
  let job: Job | undefined;
  for (let version = 1; version <= 3; version++) {
    const a = `a-${version}`;
    job = await claim(t, a);
    await draft(t, job, a, a);
    const r = `r-${version}`;
    const reviewer = await claim(t, r);
    await bind(t, reviewer, r, r);
    await t.mutation(internal.editorial.worker, {
      operation: "review",
      token: r,
      runId: reviewer.runId,
      sessionId: r,
      data: JSON.stringify({
        version,
        review: {
          approved: false,
          notes:
            "The prompt changes the prescribed workout. Remove that instruction.",
          checks: { ...allChecks, accurate: false },
        },
      }),
    });
  }
  expect((await t.run((ctx) => ctx.db.get(job!.runId)))?.status).toBe("failed");
  expect(
    await t.run((ctx) => ctx.db.query("editorialDrafts").collect()),
  ).toHaveLength(3);
  expect((await claim(t, "next-job")).runId).not.toBe(job!.runId);
  expect(await t.query(api.editorial.published, {})).toEqual([]);
});
it("unverified sources and expired credentials cannot be used to approve content", async () => {
  const t = make();
  await t.mutation(internal.editorial.worker, {
    operation: "queue",
    token: "q",
  });
  const job = await claim(t, "a");
  await bind(t, job, "a", "session");
  await expect(
    t.mutation(internal.editorial.worker, {
      operation: "source",
      token: "a",
      runId: job.runId,
      sessionId: "session",
      data: JSON.stringify({
        url: "https://example.com/unverified",
        excerpt: "Unverified material. ".repeat(5),
      }),
    }),
  ).rejects.toThrow("not approved");
  await t.mutation(internal.editorial.worker, {
    operation: "fail",
    token: "a",
    runId: job.runId,
    data: "Membership allowance exhausted. No API fallback.",
  });
  expect(await t.query(api.editorial.published, {})).toEqual([]);
  await expect(
    t.mutation(internal.editorial.worker, {
      operation: "save",
      token: "a",
      runId: job.runId,
      sessionId: "session",
      data: JSON.stringify(program),
    }),
  ).rejects.toThrow("expired");
});
it("owner pause stops both new claims and publication", async () => {
  const t = make();
  await t.mutation(internal.editorial.worker, {
    operation: "queue",
    token: "q",
  });
  await t
    .withIdentity({ subject: "owner" })
    .mutation(api.editorial.control, { action: "pause" });
  expect(await claim(t, "paused")).toBeNull();
  expect(
    await t.mutation(internal.editorial.worker, {
      operation: "activate",
      token: "activate",
    }),
  ).toEqual({ enabled: false });
  vi.setSystemTime(Date.parse("2026-09-28T13:01Z"));
  await t.mutation(internal.editorial.publishDue, {});
  expect(await t.query(api.editorial.published, {})).toEqual([]);
});
