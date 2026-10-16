import { watchExportsEnabled } from "@/domain/apple-watch-feature";
import { priceLabel } from "@/config";
import { CoffeePookie } from "@/components/pookie/coffee-pookie";
import Link from "next/link";
import { MarketingShell } from "@/components/pookie/marketing-shell";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/libs/metadata";
export const metadata = pageMetadata(
  `Pricing — ${priceLabel} per month`,
  `One Pookie plan: ${priceLabel} USD/month after a 7-day card-required trial. Weekly running plans, flexible adjustments, simple progress, and easy cancellation.`,
  "/pricing",
);
export default function PricingPage() {
  return (
    <MarketingShell>
      <main id="main" className="page-width max-w-5xl space-y-10 pb-20 pt-10">
        <div className="text-center">
          <p className="eyebrow">A LITTLE LESS LATTE. A LITTLE MORE YOU.</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Your running plan. {priceLabel} a month.
          </h1>
          <p className="mt-5 leading-8 text-muted-foreground">
            Cheaper than a cup of coffee at Pookie’s overpriced café. A personal
            running routine, for one small monthly price.
          </p>
        </div>
        <div className="grid items-center gap-10 md:grid-cols-2">
          <CoffeePookie />
          <section className="price-ticket space-y-7">
            <p>
              <span className="price-number">{priceLabel}</span>
              <span className="ml-2 text-muted-foreground">USD / month</span>
            </p>
            <ul className="space-y-3 text-sm leading-7">
              {[
                "A saved weekly plan around two or three available days",
                "15-, 20-, or 30-minute starting limits, including walking",
                "Shorten, move, or skip a run when life changes",
                "Confirm each new week, with an easier-week option",
                "Completed-run counts for your last four weeks",
                "Optional Sunday email reminders",
                "Self-service billing and cancellation",
              ].map((feature) => (
                <li key={feature} className="flex gap-3">
                  <span aria-hidden="true" className="text-primary">
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <Button asChild className="h-12 w-full rounded-full">
              <Link href="/sign-up">Start my 7-day free trial</Link>
            </Button>
            <p className="text-sm leading-7 text-muted-foreground">
              Card required. Your subscription automatically renews at{" "}
              {priceLabel} USD/month after seven days unless you cancel before
              the trial ends. We email you one day before your first charge. One
              trial per eligible customer; returning subscribers see their price
              in checkout.
            </p>
          </section>
        </div>
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Good to know before you start</h2>
          <div>
            <h3 className="font-semibold">Can I see how it works first?</h3>
            <p className="mt-2 leading-7 text-muted-foreground">
              Yes.{" "}
              <Link href="/try" className="text-primary underline">
                Get the free weekly plan
              </Link>{" "}
              without an account or card.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">What happens if I cancel?</h3>
            <p className="mt-2 leading-7 text-muted-foreground">
              Cancel from Account. Access continues until the displayed trial or
              billing period ends. Your saved running history remains readable
              afterward. Deleting your account cancels access immediately and
              removes your running data.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Do I need a watch or another app?</h3>
            <p className="mt-2 leading-7 text-muted-foreground">
              {watchExportsEnabled ? "Pookie works in your phone’s browser. You can download individual workouts for Apple Watch; follow our Apple Watch guide to import each file. A watch is optional. Pookie does not record GPS, provide a live interval timer, or sync watch results back." : "Pookie works in your phone’s browser. It plans your week and records the runs you mark complete. It does not record GPS, provide a live interval timer, or sync with watches."}
            </p>
          </div>
          <div>
            <h3 className="font-semibold">
              Is this a race or rehabilitation program?
            </h3>
            <p className="mt-2 leading-7 text-muted-foreground">
              Pookie is general guidance for adults rebuilding a casual running
              routine. It does not provide race-specific training, personal
              coaching, or injury rehabilitation.
            </p>
          </div>
        </section>
        <p className="text-sm leading-7 text-muted-foreground">
          A free plan may be enough if you already follow a routine comfortably.{" "}
          <Link
            className="text-primary underline"
            href="/guides/pookie-vs-free-running-plan"
          >
            Compare the options honestly.
          </Link>
        </p>
      </main>
    </MarketingShell>
  );
}
