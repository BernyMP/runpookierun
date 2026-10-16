"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { useClerk } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { PreferencesForm } from "@/components/pookie/preferences-form";
import { ReminderPreferences } from "@/components/pookie/reminder-preferences";
import { BillingCard } from "@/components/pookie/billing-card";
import { Button } from "@/components/ui/button";
import config from "@/config";
export default function Account() {
  const user = useQuery(api.users.current);
  const subscription = useQuery(api.billing.current);
  const saveDraft = useMutation(api.users.saveDraft);
  const savePreferences = useMutation(api.users.savePreferences);
  const sync = useAction(api.billingNode.sync);
  const remove = useAction(api.billingNode.deleteAccount);
  const { signOut } = useClerk();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [billingError, setBillingError] = useState("");
  const refreshBilling = useCallback(async () => {
    setBillingError("");
    try {
      await sync({});
    } catch {
      setBillingError("We couldn’t refresh billing. Please try again.");
    }
  }, [sync]);
  useEffect(() => {
    void refreshBilling();
    window.addEventListener("focus", refreshBilling);
    return () => window.removeEventListener("focus", refreshBilling);
  }, [refreshBilling]);
  if (!user || subscription === undefined)
    return <p role="status">Loading your account…</p>;
  return (
    <div className="space-y-8">
      <div className="page-intro">
        <p className="eyebrow">YOUR LITTLE CORNER</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Your account.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{user.email}</p>
      </div>
      {user.preferences ? (
        <BillingCard
          subscription={subscription}
          timezone={user.preferences.timezone}
          syncError={billingError}
          onSync={refreshBilling}
        />
      ) : (
        <p className="panel">
          <Link href="/pookie" className="font-semibold text-primary underline">
            Finish setup to start your free trial.
          </Link>
        </p>
      )}
      <section className="panel">
        <h2 className="mb-2 text-xl font-bold">Your running rhythm</h2>
        <p className="mb-7 text-sm text-muted-foreground">
          Preference changes apply to your next week. This week’s completed runs
          stay as they are.
        </p>
        <PreferencesForm
          editing
          initial={user.draft ?? user.preferences}
          onDraft={(draft) => saveDraft({ draft })}
          onComplete={(preferences) => savePreferences({ preferences })}
        />
      </section>
      {user.preferences && (
        <ReminderPreferences
          enabled={user.weeklyReminderEnabled ?? false}
          timezone={user.preferences.timezone}
        />
      )}
      <section className="panel flex flex-wrap items-center justify-between gap-4">
        <a
          href={`mailto:${config.supportEmail}`}
          className="font-semibold text-primary underline underline-offset-4"
        >
          Need a hand? Say hello.
        </a>
        <Button variant="outline" onClick={() => signOut({ redirectUrl: "/" })}>
          Sign out
        </Button>
      </section>
      <details className="rounded-2xl border p-5">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Delete my account
        </summary>
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-6">
            This cancels your subscription immediately and permanently deletes
            your running preferences and history. Type DELETE to confirm.
          </p>
          <label htmlFor="delete-confirmation" className="sr-only">
            Type DELETE to confirm account deletion
          </label>
          <input
            id="delete-confirmation"
            className="min-h-12 w-full rounded-xl border px-4"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
          <Button
            variant="destructive"
            disabled={confirmation !== "DELETE" || deleting}
            onClick={async () => {
              setDeleting(true);
              setError("");
              try {
                await remove({ confirmation: "DELETE" });
                window.location.assign("/");
              } catch {
                setError(
                  "We couldn’t finish deleting your account. Please retry or contact support.",
                );
                setDeleting(false);
              }
            }}
          >
            {deleting ? "Deleting…" : "Permanently delete account"}
          </Button>
        </div>
      </details>
    </div>
  );
}
