import { auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { sanitizeAdMeasurement } from "@/domain/meta";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.NEXT_PUBLIC_CONVEX_URL
  )
    return new Response(null, { status: 204 });
  const raw = await request.text();
  if (raw.length > 2048) return new Response(null, { status: 413 });
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (
    !value ||
    typeof value.consent !== "boolean" ||
    ["fbp", "fbc", "userAgent"].some(
      (k) => value[k] !== undefined && typeof value[k] !== "string",
    ) ||
    (value.expiresAt !== undefined && typeof value.expiresAt !== "number") ||
    (value.clickExpiresAt !== undefined &&
      typeof value.clickExpiresAt !== "number")
  )
    return new Response(null, { status: 400 });
  try {
    const session = await auth();
    if (!session.userId) return new Response(null, { status: 204 });
    const token = await session.getToken({ template: "convex" });
    if (!token) return new Response(null, { status: 503 });
    await fetchMutation(
      api.users.setAdMeasurement,
      { adMeasurement: sanitizeAdMeasurement(value) },
      { token },
    );
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
