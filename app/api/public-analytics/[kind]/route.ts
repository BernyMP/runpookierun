import { sanitizeAnalyticsPayload } from "@/domain/public-analytics";
export async function POST(
  request: Request,
  context: { params: Promise<{ kind: string }> },
) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let body = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 8192) {
      await reader.cancel();
      return new Response(null, { status: 413 });
    }
    body += decoder.decode(value, { stream: true });
  }
  try {
    const { kind } = await context.params;
    const input: unknown = JSON.parse(body);
    if (!input || typeof input !== "object" || Array.isArray(input))
      return new Response(null, { status: 400 });
    const payload = sanitizeAnalyticsPayload(
      kind,
      input as Record<string, unknown>,
    );
    if (!payload) return new Response(null, { status: 400 });
    // Never forward cookies, raw referrers, IP headers, or user identifiers.
    if (process.env.VERCEL_ENV !== "production")
      return new Response(null, { status: 204 });
    const result = await fetch(
      `https://runpookierun.com/_vercel/insights/${kind}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Pookie-Public-Analytics/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      },
    );
    return new Response(null, { status: result.ok ? 204 : 503 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
