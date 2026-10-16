"use client";
import { priceLabel } from "@/config";
import { SignedIn } from "@clerk/nextjs";
import {
  CheckoutButton,
  SubscriptionDetailsButton,
} from "@clerk/nextjs/experimental";
import { Button } from "@/components/ui/button";
import { formatPrice, hasAccess, type Subscription } from "@/domain/billing";
import { ArrowRight, Check } from "lucide-react";
export function BillingCard({
  subscription,
  onSync,
  syncError = "",
  timezone = "UTC",
}: {
  subscription: Subscription | null | undefined;
  onSync: () => Promise<unknown>;
  syncError?: string;
  timezone?: string;
}) {
  const planId = process.env.NEXT_PUBLIC_CLERK_PAID_PLAN_ID;
  const active = hasAccess(subscription);
  const trialEligible = subscription?.trialEligible === true;
  return (
    <section className="panel space-y-5" aria-label="Subscription">
      <div>
        <p className="eyebrow">
          {active
            ? subscription?.isTrial
              ? "Your free week"
              : "Pookie, by your side"
            : "Your weekly running companion"}
        </p>
        <h2 className="mt-3 text-2xl font-bold">
          {active
            ? subscription?.willRenew
              ? "A little consistency, every week."
              : "Your plan is canceled."
            : trialEligible
              ? "Start with seven days on us."
              : "Ready to find your rhythm?"}
        </h2>
      </div>
      {active && subscription ? (
        <p className="text-sm leading-7 text-muted-foreground">
          {subscription.willRenew
            ? `${subscription.isTrial ? "Your trial ends" : "Your next renewal is"} ${new Date(subscription.periodEnd).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: timezone })} (${timezone}). ${formatPrice(subscription.amountCents, subscription.currency)} / month afterward.`
            : `Your access continues until ${new Date(subscription.periodEnd).toLocaleDateString("en-US", { dateStyle: "long", timeZone: timezone })}. You won’t be charged again.`}
        </p>
      ) : (
        <>
          <p>
            <span className="text-4xl font-bold">{priceLabel}</span>
            <span className="text-muted-foreground">
              {" "}
              USD / month{trialEligible ? " after your trial" : ""}
            </span>
          </p>
          <ul className="space-y-3 text-sm">
            {[
              "A week built around your days",
              "Easy adjustments and quick check-ins",
              trialEligible
                ? "An email one day before your first charge"
                : "Your running history, ready when you return",
            ].map((text) => (
              <li key={text} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                {text}
              </li>
            ))}
          </ul>
          <p className="text-sm leading-6 text-muted-foreground">
            {trialEligible
              ? "Card required. Cancel before your trial ends to avoid a charge. One free trial per eligible customer."
              : "Renews monthly. Cancel in Account. Your price and any eligible trial are shown before you confirm checkout."}
          </p>
        </>
      )}
      <SignedIn>
        {active || (subscription && subscription.itemId !== "none") ? (
          <SubscriptionDetailsButton
            onSubscriptionCancel={() => {
              void onSync();
            }}
          >
            <Button variant="outline" className="h-12 w-full rounded-xl">
              Manage billing or cancel
            </Button>
          </SubscriptionDetailsButton>
        ) : null}
        {!active &&
          (planId ? (
            <CheckoutButton
              planId={planId}
              planPeriod="month"
              onSubscriptionComplete={() => {
                void onSync();
              }}
              newSubscriptionRedirectUrl="/pookie"
            >
              <Button className="h-12 w-full rounded-xl">
                {trialEligible ? "Start my free trial" : "Continue with Pookie"}
                <ArrowRight />
              </Button>
            </CheckoutButton>
          ) : (
            <p role="status" className="rounded-xl bg-muted p-4 text-sm">
              Checkout is getting ready. Please check back soon.
            </p>
          ))}
      </SignedIn>
      {syncError && (
        <p role="alert" className="text-sm text-red-800">
          {syncError}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          void onSync();
        }}
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        Refresh billing status
      </button>
    </section>
  );
}
