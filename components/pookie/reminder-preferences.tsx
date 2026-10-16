"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
export function ReminderPreferences({
  enabled,
  timezone,
}: {
  enabled: boolean;
  timezone: string;
}) {
  const setEnabled = useMutation(api.weeklyReminders.setEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="panel space-y-4">
      <h2 className="text-xl font-bold">A little weekly nudge</h2>
      <label className="flex items-start gap-3 text-sm leading-7">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-[#c74c19]"
          checked={enabled}
          disabled={busy}
          onChange={async (event) => {
            setBusy(true);
            setError("");
            try {
              await setEnabled({ enabled: event.target.checked });
            } catch {
              setError(
                "Couldn’t save your reminder preference. Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
        <span>
          Email me on Sundays at 6 pm ({timezone.replaceAll("_", " ")}) to check
          my week.
        </span>
      </label>
      <p className="text-xs leading-6 text-muted-foreground">
        Optional, and off unless you choose it. Turn it off here or from any
        weekly email. Billing notices are separate. Weekly reminders only send
        while your trial or subscription has access.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      <p role="status" className="text-xs text-muted-foreground">
        {busy
          ? "Saving…"
          : enabled
            ? "Weekly reminders are on."
            : "Weekly reminders are off."}
      </p>
    </section>
  );
}
