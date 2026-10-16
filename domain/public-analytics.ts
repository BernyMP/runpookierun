import { sanitizeAttribution, type Attribution } from "./acquisition";
export const publicEvents = [
  "landing_viewed",
  "free_plan_viewed",
  "free_plan_first_completion",
  "signup_clicked",
] as const;
export type PublicEvent = (typeof publicEvents)[number];
export function publicPath(value: string): string | null {
  try {
    const path = new URL(value, "https://runpookierun.com").pathname;
    return /^(\/|\/about|\/pricing|\/guides|\/try|\/privacy-policy|\/tos|\/guides\/[a-z0-9]+(?:-[a-z0-9]+)*|\/try\/\d{4}-\d{2}-\d{2})$/.test(
      path,
    )
      ? path
      : null;
  } catch {
    return null;
  }
}
export function eventProperties(
  path: string,
  source: string,
  edition?: string,
  attribution?: Attribution,
) {
  const safePath = publicPath(path);
  if (!safePath) return null;
  return {
    ...sanitizeAttribution({ ...attribution, source }),
    ...(edition && /^\d{4}-\d{2}-\d{2}$/.test(edition) ? { edition } : {}),
  };
}
// The SDK includes the original referrer and may include identity fields. Only
// this allowlisted payload reaches Vercel Analytics; incoming bodies are not logged.
export function sanitizeAnalyticsPayload(
  kind: string,
  input: Record<string, unknown>,
) {
  const path = typeof input.o === "string" ? publicPath(input.o) : null;
  if (!path || !["view", "event"].includes(kind)) return null;
  const base = {
    o: `https://runpookierun.com${path}`,
    dp: path,
    sv: "0.1.3",
    sdkn: "@vercel/analytics",
    sdkv: "1.6.1",
    ts: Date.now(),
  };
  if (kind === "view") return base;
  if (!publicEvents.includes(input.en as PublicEvent)) return null;
  const data =
    input.ed && typeof input.ed === "object"
      ? (input.ed as Record<string, unknown>)
      : {};
  return {
    ...base,
    en: input.en,
    ed: eventProperties(
      path,
      typeof data.source === "string" ? data.source : "other",
      typeof data.edition === "string" ? data.edition : undefined,
      {
        source: typeof data.source === "string" ? data.source : "other",
        campaign: typeof data.campaign === "string" ? data.campaign : undefined,
        medium: typeof data.medium === "string" ? data.medium : undefined,
        content: typeof data.content === "string" ? data.content : undefined,
      },
    ),
  };
}
export function markFirstCompletion(
  edition: string,
  storage: Pick<Storage, "getItem" | "setItem">,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(edition)) return false;
  const key = `pookie:free-engaged:v1:${edition}`;
  try {
    if (storage.getItem(key)) return false;
    storage.setItem(key, "1");
    return true;
  } catch {
    return false;
  } // Skip measurement when durable deduplication is unavailable.
}
