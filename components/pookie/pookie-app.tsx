"use client";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Pookie } from "./mascot";
import { PreferencesForm } from "./preferences-form";
import { WeeklyConfirmation } from "./weekly-confirmation";
import { RecentProgress } from "./recent-progress";
import { WeekView } from "./week-view";
import { BillingCard } from "./billing-card";
import { formatPrice, hasAccess } from "@/domain/billing";
import { localDate } from "@/domain/planner";
import { Button } from "@/components/ui/button";
export function PookieApp() {
  const user = useQuery(api.users.current);
  const week = useQuery(api.weeks.current);
  const recent = useQuery(api.weeks.recent);
  const confirmWeek = useMutation(api.weeks.confirm);
  const subscription = useQuery(api.billing.current);
  const saveDraft = useMutation(api.users.saveDraft);
  const savePreferences = useMutation(api.users.savePreferences);
  const ensureWeek = useMutation(api.weeks.ensure);
  const command = useMutation(api.weeks.command);
  const sync = useAction(api.billingNode.sync);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [now, setNow] = useState(Date.now());
  const requested = useRef("");
  const refreshBilling = useCallback(async () => {
    setSyncError("");
    try {
      await sync({});
    } catch {
      setSyncError("Billing hasn’t updated yet. Please try again in a moment.");
    }
  }, [sync]);
  useEffect(() => {
    void refreshBilling();
    const refresh = () => {
      setNow(Date.now());
      void refreshBilling();
    };
    window.addEventListener("focus", refresh);
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(timer);
    };
  }, [refreshBilling]);
  const active = hasAccess(subscription, now);
  const today = localDate(
    now,
    week?.timezone ?? user?.preferences?.timezone ?? "UTC",
  );
  const needsWeek = Boolean(user?.preferences && active && week === null);
  useEffect(() => {
    if (!needsWeek || requested.current === today) return;
    requested.current = today;
    setError("");
    ensureWeek({}).catch(() => {
      setError("We couldn’t prepare your week. Please try again.");
    });
  }, [needsWeek, today, ensureWeek, week]);
  if (!user || week === undefined || subscription === undefined)
    return <p role="status">Getting your week ready…</p>;
  if (!user.preferences)
    return (
      <div className="space-y-8">
        <div className="page-intro">
          <Pookie
            pose="check"
            className="float-right ml-4 w-24 rounded-full border-2"
            sizes="96px"
          />
          <p className="eyebrow">WELL, HELLO THERE, POOKIE.</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Let’s find your rhythm.
          </h1>
          <p className="mt-4 text-muted-foreground">
            A few small choices. A week that feels like you. Your comeback
            starts right here.
          </p>
        </div>
        <section className="panel">
          <PreferencesForm
            initial={user.draft}
            onDraft={(draft) => saveDraft({ draft })}
            onComplete={async (preferences) => {
              await savePreferences({ preferences });
            }}
          />
        </section>
      </div>
    );
  return (
    <div className="space-y-8">
      {!active && (
        <BillingCard
          subscription={subscription}
          timezone={user.preferences.timezone}
          onSync={refreshBilling}
          syncError={syncError}
        />
      )}
      {active && subscription?.isTrial && (
        <p className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm">
          {subscription.willRenew
            ? `Your free week is underway. First charge: ${formatPrice(subscription.amountCents, subscription.currency)} on `
            : "Your trial is canceled. You can keep running until "}
          {new Date(subscription.periodEnd).toLocaleDateString("en-US", {
            dateStyle: "long",
            timeZone: user.preferences.timezone,
          })}
          . Manage or cancel in Account.
        </p>
      )}
      {error && (
        <div role="alert" className="panel">
          <p>{error}</p>
          <Button
            className="mt-3"
            onClick={() => {
              requested.current = "";
              setError("");
              ensureWeek({}).catch(() =>
                setError("Please try again in a moment."),
              );
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {active && week && today > week.endDate && (
        <WeeklyConfirmation
          preferences={user.preferences}
          previous={week}
          onConfirm={(choice) =>
            confirmWeek({ previousWeekId: week._id, choice })
          }
        />
      )}
      {needsWeek && !error ? (
        <p role="status">Making room for your next little win…</p>
      ) : week ? (
        <WeekView
          week={week}
          today={today}
          preferences={user.preferences}
          readOnly={!active}
          onCommand={async (workoutId, change) => {
            await command({ weekId: week._id, workoutId, command: change });
          }}
        />
      ) : active ? (
        <p role="status">Your first week is on its way…</p>
      ) : null}
      {recent && week && <RecentProgress weeks={recent} />}
    </div>
  );
}
