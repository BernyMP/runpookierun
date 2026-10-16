// @vitest-environment node
import { expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { publicationTime } from "../domain/editorial";
const modules = import.meta.glob("../convex/**/*.{ts,js}");
it.skipIf(process.env.POOKIE_LIVE_EDITORIAL !== "1")(
  "real membership authors and reviewers prepare two editions, then publish at their scheduled time",
  async () => {
    const t = convexTest(schema, modules);
    // Optional local-only restoration simulates a durable backend surviving a stopped Mac.
    // This harness never exposes a production import or approval-bypass endpoint.
    if (process.env.POOKIE_EDITOR_PREVIEW_RESTORE) {
      const evidence = JSON.parse(
        await readFile(process.env.POOKIE_EDITOR_PREVIEW_RESTORE, "utf8"),
      );
      await t.run(async (ctx) => {
        const ids = new Map<string, string>();
        for (const row of evidence.runs) {
          const {
            _id,
            _creationTime,
            claim: _claim,
            leaseUntil: _leaseUntil,
            role: _role,
            sessionId: _sessionId,
            ...run
          } = row;
          const id = await ctx.db.insert("editorialRuns", {
            ...run,
            status: run.status === "failed" ? "queued" : run.status,
            error: undefined,
          });
          ids.set(_id, id);
        }
        for (const [table, rows] of [
          ["editorialDrafts", evidence.drafts],
          ["editorialReviews", evidence.reviews],
          ["editorialSources", evidence.sources],
        ] as const) {
          for (const row of rows) {
            const { _id, _creationTime, ...value } = row;
            await ctx.db.insert(table, {
              ...value,
              runId: ids.get(value.runId),
            });
          }
        }
      });
    }
    const secret = randomBytes(32).toString("hex");
    const server = createServer(async (request, response) => {
      response.setHeader("Content-Type", "application/json");
      if (
        request.method !== "POST" ||
        request.url !== "/editorial/worker" ||
        request.headers.authorization !== `Bearer ${secret}`
      ) {
        response.writeHead(401).end("{}");
        return;
      }
      try {
        let text = "";
        for await (const chunk of request) {
          text += chunk;
          if (text.length > 100_000) throw new Error("Request too large");
        }
        const result = await t.mutation(
          internal.editorial.worker,
          JSON.parse(text),
        );
        response.end(JSON.stringify(result));
      } catch (error) {
        response.writeHead(400).end(
          JSON.stringify({
            error: error instanceof Error ? error.message : "Request failed",
          }),
        );
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No preview listener");
    const child = spawn(process.execPath, ["scripts/weekly.mjs", "--preview"], {
      cwd: `${process.cwd()}/agents/editorial`,
      env: {
        ...process.env,
        POOKIE_EDITOR_CONVEX_URL: `http://127.0.0.1:${address.port}`,
        POOKIE_EDITOR_WORKER_SECRET: secret,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (data) => process.stdout.write(data));
    child.stderr.on("data", (data) => process.stderr.write(data));
    try {
      const code = await new Promise<number | null>((resolve, reject) => {
        child.on("error", reject);
        child.on("exit", resolve);
      });
      const evidence = await t.run(async (ctx) => ({
        generatedAt: new Date().toISOString(),
        environment:
          "local Convex test harness; real ChatGPT membership agents",
        runs: (await ctx.db.query("editorialRuns").collect()).map(
          ({ claim: _claim, ...run }) => run,
        ),
        drafts: await ctx.db.query("editorialDrafts").collect(),
        reviews: await ctx.db.query("editorialReviews").collect(),
        sources: await ctx.db.query("editorialSources").collect(),
      }));
      await mkdir("artifacts", { recursive: true });
      await writeFile(
        "artifacts/editorial-live-evidence.json",
        JSON.stringify(evidence, null, 2),
      );
      expect(code).toBe(0);
      expect(evidence.runs).toHaveLength(4);
      expect(
        evidence.runs.every(
          (run) =>
            run.status === "approved" && run.approvedVersion === run.version,
        ),
      ).toBe(true);
      expect(await t.query(api.editorial.published, {})).toHaveLength(0);
      const first = evidence.runs.map((run) => run.editionId).sort()[0];
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(publicationTime(first) + 60_000);
      await t.mutation(internal.editorial.publishDue, {});
      await t.mutation(internal.editorial.publishDue, {});
      const publications = await t.query(api.editorial.published, {});
      expect(publications).toHaveLength(1);
      expect(publications[0].edition.id).toBe(first);
      await writeFile(
        "artifacts/editorial-live-publication.json",
        JSON.stringify(publications, null, 2),
      );
    } finally {
      vi.useRealTimers();
      if (child.exitCode === null) child.kill("SIGTERM");
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
  3_600_000,
);
