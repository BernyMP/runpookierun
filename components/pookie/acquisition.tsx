"use client";
import { useEffect } from "react";
import {
  acquisitionFromUrl,
  sanitizeAttribution,
  type Attribution,
} from "@/domain/acquisition";
const key = "pookie:source:v1";
export function captureAcquisition(): Attribution | undefined {
  if (typeof window === "undefined") return undefined;
  if (window.location.pathname.startsWith("/unsubscribe")) return undefined;
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    const incoming = acquisitionFromUrl(
      window.location.href,
      document.referrer,
    );
    if (
      saved &&
      Number.isFinite(saved.expires) &&
      saved.expires > Date.now() &&
      !(saved.source === "direct" && incoming.source !== "direct")
    )
      return sanitizeAttribution(saved);
    const attribution = acquisitionFromUrl(
      window.location.href,
      document.referrer,
    );
    localStorage.setItem(
      key,
      JSON.stringify({ ...attribution, expires: Date.now() + 30 * 86400000 }),
    );
    return attribution;
  } catch {
    return acquisitionFromUrl(window.location.href, document.referrer);
  }
}
export function Acquisition() {
  useEffect(() => {
    captureAcquisition();
  }, []);
  return null;
}
