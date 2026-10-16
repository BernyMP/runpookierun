import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
const isProtected = createRouteMatcher(["/pookie(.*)"]);
const clerk = clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});
export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return isProtected(req)
      ? NextResponse.redirect(new URL("/sign-in", req.url))
      : NextResponse.next();
  return clerk(req, event);
}
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
