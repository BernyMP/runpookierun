"use client";
import { useState } from "react";
import Link from "next/link";
import { Watch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { watchExportsEnabled, watchMode } from "@/domain/apple-watch-feature";
import type { WatchWorkout } from "@/domain/apple-watch";

export function AppleWatchExport({
  workout,
  prototype = false,
}: {
  workout: WatchWorkout;
  prototype?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (!watchExportsEnabled && !(prototype && watchMode === "prototype"))
    return null;
  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { exportAppleWorkout } = await import("@/domain/apple-watch");
      const { bytes, filename } = await exportAppleWorkout(workout);
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        // Safari must have time to consume the object URL before it is revoked.
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
      setMessage(
        "Download requested. On your iPhone, open the .workout file and look for Apple’s option to add it to your watch. Pookie can’t confirm whether it was added.",
      );
    } catch {
      setError(
        "We couldn’t prepare this workout. Refresh the page and try again. Your run hasn’t changed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="my-5 space-y-3 rounded-2xl border-2 border-foreground/15 bg-background p-4 print:hidden">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={download}
          disabled={busy}
        >
          <Watch aria-hidden="true" size={18} />
          {busy
            ? "Preparing workout…"
            : prototype
              ? "Download test workout"
              : "Add to Apple Watch"}
        </Button>
        <Link
          href="/guides/apple-watch"
          className="text-sm font-semibold underline"
        >
          How it works
        </Link>
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        Open the download on your paired iPhone. Each workout needs an import;
        changes here won’t update a previous download.
      </p>
      {message && (
        <p role="status" className="text-sm leading-6">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
