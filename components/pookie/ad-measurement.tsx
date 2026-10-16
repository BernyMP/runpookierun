"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { publicPath } from "@/domain/public-analytics";
import { sanitizeAdMeasurement, type AdMeasurement } from "@/domain/meta";
const consentKey = "pookie:ad-consent:v1";
const contextKey = "pookie:ad-context:v1";
export const adChoiceEvent = "pookie:ad-choice";
export const advertisingConfigured =
  process.env.NEXT_PUBLIC_META_ENABLED === "true" &&
  /^\d+$/.test(process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "");
type Pixel = ((...args: unknown[]) => void) & {
  queue?: unknown[][];
  callMethod?: (...args: unknown[]) => void;
  push?: Pixel;
  loaded?: boolean;
  version?: string;
};
declare global {
  interface Window {
    fbq?: Pixel;
    _fbq?: Pixel;
  }
}
function privacySignal() {
  return (
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true || navigator.doNotTrack === "1"
  );
}
export function readAdMeasurement(): AdMeasurement {
  if (
    typeof window === "undefined" ||
    !advertisingConfigured ||
    privacySignal()
  )
    return { consent: false };
  try {
    const choice = JSON.parse(localStorage.getItem(consentKey) ?? "null");
    if (!choice?.allowed || choice.expires <= Date.now())
      return { consent: false };
    const saved = JSON.parse(localStorage.getItem(contextKey) ?? "null");
    const cookie = (name: string) =>
      document.cookie
        .split("; ")
        .find((x) => x.startsWith(`${name}=`))
        ?.slice(name.length + 1);
    return sanitizeAdMeasurement({
      consent: true,
      expiresAt: choice.expires,
      fbp: cookie("_fbp"),
      fbc: saved?.expires > Date.now() ? saved.fbc : undefined,
      clickExpiresAt: saved?.expires > Date.now() ? saved.expires : undefined,
      userAgent: navigator.userAgent,
    });
  } catch {
    return { consent: false };
  }
}
function saveChoice(allowed: boolean) {
  try {
    localStorage.setItem(
      consentKey,
      JSON.stringify({ allowed, expires: Date.now() + 180 * 86400000 }),
    );
    if (allowed) {
      const clickId = new URL(location.href).searchParams.get("fbclid");
      if (clickId && /^[A-Za-z0-9_-]{1,500}$/.test(clickId))
        localStorage.setItem(
          contextKey,
          JSON.stringify({
            fbc: `fb.1.${Date.now()}.${clickId}`,
            expires: Date.now() + 30 * 86400000,
          }),
        );
    } else {
      localStorage.removeItem(contextKey);
      for (const name of ["_fbp", "_fbc"]) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.runpookierun.com; SameSite=Lax`;
      }
      window.fbq?.("consent", "revoke");
    }
  } catch {
    window.fbq?.("consent", "revoke");
  }
  window.dispatchEvent(new Event(adChoiceEvent));
}
export function AdvertisingChoices() {
  if (!advertisingConfigured) return null;
  return (
    <button
      className="underline underline-offset-4"
      onClick={() => window.dispatchEvent(new Event("pookie:open-ad-choice"))}
    >
      Advertising choices
    </button>
  );
}
export function AdMeasurement() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signal, setSignal] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [revision, setRevision] = useState(0);
  const lastPage = useRef<string | null>(null);
  const syncChoice = useCallback(async () => {
    try {
      const response = await fetch("/api/ad-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(readAdMeasurement()),
        keepalive: true,
      });
      setSyncError(!response.ok);
      if (!response.ok) setOpen(true);
    } catch {
      setSyncError(true);
      setOpen(true);
    }
  }, []);
  function choose(allowed: boolean) {
    saveChoice(allowed);
    setOpen(false);
    void syncChoice();
  }
  useEffect(() => {
    if (advertisingConfigured) void syncChoice();
  }, [pathname, syncChoice]);
  useEffect(() => {
    if (!advertisingConfigured) return;
    const refresh = () => setRevision((x) => x + 1);
    const show = () => setOpen(true);
    window.addEventListener(adChoiceEvent, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("pookie:open-ad-choice", show);
    return () => {
      window.removeEventListener(adChoiceEvent, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pookie:open-ad-choice", show);
    };
  }, []);
  useEffect(() => {
    if (!advertisingConfigured) return;
    const blocked = privacySignal();
    setSignal(blocked);
    let choice;
    try {
      choice = JSON.parse(localStorage.getItem(consentKey) ?? "null");
    } catch {
      /* No storage: no advertising. */
    }
    if (blocked) {
      window.fbq?.("consent", "revoke");
      setOpen(false);
      return;
    }
    if (!publicPath(pathname)) {
      window.fbq?.("consent", "revoke");
      return;
    }
    if (!choice || choice.expires <= Date.now()) {
      setOpen(true);
      return;
    }
    if (!readAdMeasurement().consent) {
      window.fbq?.("consent", "revoke");
      lastPage.current = null;
      return;
    }
    // Attribution and click context have already been captured with permission.
    // Pixel reads the browser URL itself, so remove query/hash before loading it.
    if (location.search || location.hash)
      history.replaceState(history.state, "", pathname);
    // Do not enable automatic events or advanced matching on workout/account pages.
    if (!window.fbq) {
      const fbq: Pixel = (...args: unknown[]) => {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue?.push(args);
      };
      fbq.queue = [];
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      window.fbq = window._fbq = fbq;
      fbq("set", "autoConfig", false, process.env.NEXT_PUBLIC_META_PIXEL_ID);
      fbq("init", process.env.NEXT_PUBLIC_META_PIXEL_ID);
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      script.onload = () => window.dispatchEvent(new Event(adChoiceEvent));
      document.head.appendChild(script);
    }
    window.fbq("consent", "grant");
    // Browser owns PageView only; verified conversions are exclusively server-side.
    // Explicit clean URL excludes query strings, free-text inputs, and private paths.
    if (window.fbq.callMethod && lastPage.current !== pathname) {
      window.fbq("track", "PageView", {}, { eventID: crypto.randomUUID() });
      lastPage.current = pathname;
    }
  }, [pathname, revision]);
  if (!advertisingConfigured || !open) return null;
  return (
    <aside className="ad-choice" aria-label="Advertising privacy choices">
      <p className="font-bold">Help us learn which ads are useful?</p>
      <p className="mt-2 text-sm leading-6">
        With your permission, we share visits and verified signup, trial, and
        payment events with Meta, plus browser identifiers and a hashed verified
        email when available. We never send your workouts or running notes.{" "}
        <a href="/privacy-policy" className="underline">
          Privacy policy
        </a>
      </p>
      {syncError && (
        <p role="alert" className="mt-3 text-sm">
          Your browser choice is saved, but we couldn’t update your account yet.{" "}
          <button className="underline" onClick={() => void syncChoice()}>
            Retry account update
          </button>
        </p>
      )}
      {signal && (
        <p className="mt-2 text-sm">
          Your browser’s privacy signal is on. Advertising measurement stays
          off.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="rounded-full border-2 border-black px-4 py-2 font-bold"
          onClick={() => {
            choose(false);
          }}
        >
          No thanks
        </button>
        {!signal && (
          <button
            className="rounded-full border-2 border-black bg-[#eee6fa] px-4 py-2 font-bold"
            onClick={() => {
              choose(true);
            }}
          >
            Allow measurement
          </button>
        )}
      </div>
    </aside>
  );
}
