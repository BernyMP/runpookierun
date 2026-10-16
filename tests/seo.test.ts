import { afterEach, describe, expect, it, vi } from "vitest";
import { acquisitionFromUrl } from "../domain/acquisition";
import {
  eventProperties,
  markFirstCompletion,
  publicPath,
  sanitizeAnalyticsPayload,
} from "../domain/public-analytics";
import { pageMetadata } from "../libs/metadata";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("convex/nextjs", () => ({ fetchQuery: query }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { articleBySlug, freeEdition } from "../libs/editorial-content";
import { GET } from "../app/content-sitemap.xml/route";
import { POST } from "../app/api/public-analytics/[kind]/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  query.mockReset();
});
describe("publication availability", () => {
  it("keeps known evergreen content and starter program usable during an outage", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://unavailable.invalid");
    query.mockRejectedValue(new Error("offline"));
    expect((await articleBySlug("getting-back-into-running"))?.slug).toBe(
      "getting-back-into-running",
    );
    expect((await freeEdition("2026-09-14")).edition?.id).toBe("2026-09-14");
  });
  it("does not turn unavailable publications into missing content or an incomplete 200 sitemap", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://unavailable.invalid");
    query.mockRejectedValue(new Error("offline"));
    await expect(articleBySlug("published-but-unavailable")).rejects.toThrow(
      "temporarily unavailable",
    );
    await expect(freeEdition("2026-10-05")).rejects.toThrow(
      "temporarily unavailable",
    );
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("allows real missing or withdrawn content to resolve as absent after a successful query", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    query.mockResolvedValue([]);
    expect(await articleBySlug("withdrawn-guide")).toBeUndefined();
    expect((await freeEdition("2026-10-05")).edition).toBeNull();
    expect((await GET()).status).toBe(200);
  });
});
describe("search and anonymous measurement", () => {
  it.each([
    ["www.perplexity.ai", "perplexity"],
    ["perplexity.com", "perplexity"],
    ["claude.ai", "claude"],
    ["copilot.microsoft.com", "copilot"],
    ["chatgpt.com", "chatgpt"],
    ["perplexity.ai.attacker.test", "other"],
  ])("recognizes %s without broad substring matching", (host, source) => {
    expect(
      acquisitionFromUrl(
        "https://runpookierun.com/try",
        `https://${host}/private-query`,
      ),
    ).toEqual({ source });
  });
  it("brands metadata once", () => {
    const metadata = pageMetadata(
      "Get Back Into Running | Run Pookie Run",
      "A description",
      "/",
    );
    expect(metadata.title).toEqual({
      absolute: "Get Back Into Running | Run Pookie Run",
    });
    expect(metadata.openGraph?.title).toBe(
      "Get Back Into Running | Run Pookie Run",
    );
  });
  it("strips query strings and rejects private paths", () => {
    expect(
      eventProperties(
        "https://runpookierun.com/try?token=secret#private",
        "claude",
        "2026-09-14",
      ),
    ).toEqual({ source: "claude", edition: "2026-09-14" });
    for (const path of [
      "/pookie",
      "/unsubscribe?token=secret",
      "/api/private",
      "/sign-up",
      "/guides/person@example.com",
    ])
      expect(publicPath(path)).toBeNull();
  });
  it("deduplicates completion across remounts and safely skips unavailable storage", () => {
    const data = new Map();
    const storage = {
      getItem: (key: string) => data.get(key),
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    expect(markFirstCompletion("2026-09-14", storage)).toBe(true);
    expect(markFirstCompletion("2026-09-14", storage)).toBe(false);
    expect(markFirstCompletion("2026-09-21", storage)).toBe(true);
    expect(markFirstCompletion("bad", storage)).toBe(false);
    expect(
      markFirstCompletion("2026-09-14", {
        ...storage,
        getItem: () => {
          throw new Error();
        },
      }),
    ).toBe(false);
  });
  it("strips raw referrer, identifiers, query parameters and extra properties from provider payloads", () => {
    const payload = sanitizeAnalyticsPayload("event", {
      o: "https://runpookierun.com/try?email=private",
      en: "free_plan_first_completion",
      r: "https://example.com/private",
      userId: "secret",
      groupId: "private",
      ed: {
        source: "google",
        edition: "2026-09-14",
        effort: "private",
        path: "/unsubscribe",
      },
    });
    expect(payload).toMatchObject({
      o: "https://runpookierun.com/try",
      dp: "/try",
      ed: { source: "google", edition: "2026-09-14" },
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /private|secret|effort|userId|groupId|email/,
    );
    expect(
      sanitizeAnalyticsPayload("event", { o: "/try", en: "account_created" }),
    ).toBeNull();
  });
  it("rejects cross-origin and oversized relay requests", async () => {
    const params = Promise.resolve({ kind: "view" });
    expect(
      (
        await POST(
          new Request("https://runpookierun.com/api/public-analytics/view", {
            method: "POST",
            headers: { origin: "https://other.test" },
            body: "{}",
          }),
          { params },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST(
          new Request("https://runpookierun.com/api/public-analytics/view", {
            method: "POST",
            headers: { origin: "https://runpookierun.com" },
            body: "x".repeat(9000),
          }),
          { params },
        )
      ).status,
    ).toBe(413);
  });
});
