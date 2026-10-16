import { fetchAction } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
export async function POST(request: NextRequest) {
  let token = request.nextUrl.searchParams.get("token");
  let browser = false;
  const contentType = request.headers.get("content-type") ?? "";
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    token =
      typeof form.get("token") === "string" ? String(form.get("token")) : token;
    browser = form.get("browser") === "true";
  }
  let success = false;
  if (token && token.length <= 512 && process.env.NEXT_PUBLIC_CONVEX_URL) {
    try {
      success = await fetchAction(api.weeklyRemindersNode.unsubscribe, {
        token,
      });
    } catch {
      /* Never log the bearer token. */
    }
  }
  if (browser)
    return NextResponse.redirect(
      new URL(`/unsubscribe?${success ? "done=1" : "error=1"}`, request.url),
      303,
    );
  return NextResponse.json(
    { ok: success },
    { status: success ? 200 : 400, headers: { "Cache-Control": "no-store" } },
  );
}
