export async function bridge(
  operation: string,
  sessionId: string,
  data?: unknown,
) {
  const origin = process.env.POOKIE_EDITOR_CONVEX_URL;
  const secret = process.env.POOKIE_EDITOR_WORKER_SECRET;
  if (!origin || !secret || secret.length < 32)
    throw new Error("The editorial worker is not configured.");
  const url = new URL(origin);
  const preview = process.env.POOKIE_EDITOR_PREVIEW === "1";
  if (
    !(preview && url.hostname === "127.0.0.1") &&
    (url.protocol !== "https:" ||
      !url.hostname.endsWith(".convex.site") ||
      url.port)
  )
    throw new Error("Use the dedicated Pookie Convex HTTPS origin.");
  const response = await fetch(new URL("/editorial/worker", origin), {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(25000),
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operation,
      runId: process.env.POOKIE_JOB_ID,
      token: process.env.POOKIE_JOB_TOKEN,
      sessionId,
      ...(data === undefined ? {} : { data: JSON.stringify(data) }),
    }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? "Editorial request was not accepted.");
  }
  return response.json();
}
