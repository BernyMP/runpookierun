"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  inject,
  pageview,
  track,
  type BeforeSendEvent,
} from "@vercel/analytics";
import {
  eventProperties,
  publicPath,
  type PublicEvent,
} from "@/domain/public-analytics";
import { captureAcquisition } from "./acquisition";
function beforeSend(event: BeforeSendEvent) {
  const path = publicPath(window.location.href);
  if (!path) return null;
  return { ...event, url: `https://runpookierun.com${path}` };
}
function initialize() {
  inject({
    mode: "production",
    disableAutoTrack: true,
    endpoint: "/api/public-analytics",
    beforeSend,
  });
}
export function trackPublicEvent(event: PublicEvent, edition?: string) {
  if (typeof window === "undefined") return;
  const attribution = captureAcquisition();
  const properties = eventProperties(
    window.location.href,
    attribution?.source ?? "other",
    edition,
    attribution,
  );
  if (!properties) return;
  initialize();
  track(event, properties);
}
export function PublicAnalytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    const path = publicPath(pathname);
    if (!path) {
      lastPath.current = null;
      return;
    }
    initialize();
    if (lastPath.current !== path) {
      pageview({ path, route: path });
      lastPath.current = path;
      if (path === "/") trackPublicEvent("landing_viewed");
    }
    const click = (event: MouseEvent) => {
      const link =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        link &&
        new URL(link.href).pathname === "/sign-up" &&
        new URL(link.href).origin === window.location.origin
      )
        trackPublicEvent("signup_clicked");
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, [pathname]);
  return null;
}
