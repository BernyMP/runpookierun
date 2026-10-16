import { watchExportsEnabled } from "@/domain/apple-watch-feature";
import { priceLabel } from "@/config";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Check, Plus } from "lucide-react";
import { WeekPeek } from "@/components/pookie/week-peek";
import { CoffeePookie } from "@/components/pookie/coffee-pookie";
import { RunningPookie } from "@/components/pookie/running-pookie";
import { Pookie, Sparkle } from "@/components/pookie/mascot";
import { MarketingShell } from "@/components/pookie/marketing-shell";
import { StructuredData } from "@/components/pookie/structured-data";
import { pageMetadata } from "@/libs/metadata";
import { Button } from "@/components/ui/button";
export const metadata = pageMetadata(
  "Get Back Into Running | Run Pookie Run",
  "Meet your feel-good running companion. Two or three manageable runs, room for real life, and a little cheer from Pookie along the way.",
  "/",
);
const faqs = [
  [
    "Been a while since your last run?",
    "You’re in the right place. Pookie is for adults finding their way back to casual running. Pick two or three days and a manageable time limit. Run/walk sessions are available. No race deadline required.",
  ],
  [
    "What if life eats my running plans?",
    "Shorten a session, move it to a day with recovery room, or skip it. When the week ends, you choose what fits next. Missed runs never turn into homework.",
  ],
  [
    "How does the trial work?",
    `Add a card to start your seven-day trial. We email you one day before your first charge. After the trial, it’s ${priceLabel} USD/month unless you cancel in Account before the trial ends.`,
  ],
  [
    "Does Pookie track my run?",
    watchExportsEnabled
      ? "Pookie plans your week and records the runs you mark complete. Download individual workouts for Apple Watch using our guide. Imports are manual; watch results do not sync back. Pookie itself does not record GPS or provide an interval timer."
      : "Pookie helps you plan your week and records the runs you mark complete. It doesn’t record GPS, sync with a watch, or provide an interval timer. You can use a timer or tracker you already like.",
  ],
  [
    "Do I need to download an app?",
    "No download needed. Open Pookie in your phone or computer’s browser. Your personal plan and recent progress are saved to your account.",
  ],
  [
    "Is this race training or medical advice?",
    "Pookie offers general running guidance for adults building a casual habit, not race coaching or injury rehabilitation. Stop if running hurts and get appropriate professional advice.",
  ],
];
export default function Home() {
  return (
    <MarketingShell>
      <StructuredData />
      <main id="main">
        <section className="hero page-width">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="little-star" aria-hidden="true">
                ✳
              </span>{" "}
              Your feel-good running companion
            </p>
            <h1 className="hero-title">
              Little runs.
              <br />
              <span>
                Big good
                <br className="hidden lg:block" /> vibes.
              </span>
            </h1>
            <p className="hero-description">
              Getting back into running? Let’s make it feel good. Get a weekly
              plan built around your days and time. Two or three doable runs,
              with room to move or shorten one when life happens.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <Button asChild size="lg" className="hero-cta">
                <Link href="/sign-up" data-cta="hero">
                  Start my 7-day trial <ArrowUpRight />
                </Link>
              </Button>
              <span className="hand-note">Go on, give it a little go.</span>
            </div>
            <p className="mt-4 max-w-md text-xs leading-6 text-muted-foreground">
              Then {priceLabel}/month. Card required. Cancel in Account before
              your trial ends to avoid a charge.
            </p>
            <Link
              className="mt-3 inline-block text-sm font-bold underline underline-offset-4"
              href="/try"
            >
              Take a look at our free weekly workouts, too!
            </Link>
          </div>
          <div className="hero-art">
            <span className="running-lines" aria-hidden="true" />
            <div className="star-sticker" aria-label="All paces welcome">
              <Sparkle />
              <span>
                ALL PACES
                <br />
                WELCOME
              </span>
            </div>
            <figure className="pookie-poster">
              <div className="poster-topline">
                <span>THE COMEBACK ERA</span>
              </div>
              <RunningPookie />
              <figcaption>
                <span>Small steps. Main-character energy.</span>
                <span aria-hidden="true">☺</span>
              </figcaption>
            </figure>
            <div className="hero-note">
              <span aria-hidden="true">↳</span> Your biggest fan. Zero whistle.
            </div>
          </div>
        </section>
        <div className="pep-strip" aria-label="The Pookie approach">
          <div className="page-width flex flex-wrap items-center justify-around gap-x-7 gap-y-3">
            <span>RUN A LITTLE</span>
            <span aria-hidden="true">✳</span>
            <span>REST A LITTLE</span>
            <span aria-hidden="true">✳</span>
            <span>FEEL MORE YOU</span>
            <span aria-hidden="true" className="hidden sm:block">
              ✳
            </span>
          </div>
        </div>
        <section className="week-peek">
          <div className="page-width grid items-center gap-12 py-16 lg:grid-cols-2 lg:gap-20">
            <div>
              <span className="sticker-label">A WEEK IN THE LIFE</span>
              <h2 className="section-title mt-6">
                A little structure.
                <br />
                <em>A lot of you.</em>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-8">
                Choose your days and a time that feels doable. Pookie fills in
                your week, rest days included. Busy day? Shorten a run or move
                it somewhere with breathing room.
              </p>
              <Link className="text-link mt-7" href="/sign-up">
                Make room for my little runs <ArrowUpRight />
              </Link>
            </div>
            <WeekPeek />
          </div>
        </section>
        <section className="page-width py-20 sm:py-24" id="how-it-works">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A routine with a little personality</p>
              <h2 className="section-title mt-4">
                Less “I should.”
                <br />
                More “let’s go.”
              </h2>
            </div>
            <p>
              You bring the trainers.
              <br />
              Pookie brings a plan, a little flexibility,
              <br className="hidden sm:block" /> and a whole lot of rooting for
              you.
            </p>
          </div>
          <div className="feature-grid">
            {[
              {
                pose: "calendar" as const,
                title: "Your life. Your little loop.",
                label: "01 / MAKE A LITTLE ROOM",
                text: "Two or three days. A time limit that feels doable. A week with breathing room built right in.",
                color: "lavender",
              },
              {
                pose: "relief" as const,
                title: "Plot twist? We roll with it.",
                label: "02 / GO WITH YOUR FLOW",
                text: "Move it. Shorten it. Skip it. Life gets busy; your running plan can change with it.",
                color: "yellow",
              },
              {
                pose: "rest" as const,
                title: "Rest is on the menu.",
                label: "03 / KEEP IT FEEL-GOOD",
                text: "Celebrate the runs you do. Enjoy the days you don’t. Start each new week with a fresh choice.",
                color: "pink",
              },
            ].map(({ pose, title, label, text, color }) => (
              <article className={`feature-card ${color}`} key={pose}>
                <div className="feature-art">
                  <Pookie pose={pose} sizes="(max-width: 768px) 85vw, 440px" />
                </div>
                <div className="feature-copy">
                  <p className="eyebrow">{label}</p>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="pricing" className="page-width pricing-section">
          <div className="pricing-story">
            <p className="eyebrow">ONE PLAN. YOUR PACE.</p>
            <h2 className="section-title mt-5">
              Cheaper than
              <br />a cup of <em>coffee!</em>
            </h2>
            <p className="mt-5 max-w-md text-lg leading-8">
              Your own running routine, flexible plans, and an enthusiastic
              Pookie in your corner.
            </p>
            <dl className="mt-7 grid gap-5 text-sm leading-7 sm:grid-cols-2">
              <div>
                <dt className="font-bold">Free weekly workouts</dt>
                <dd className="mt-2">
                  One shared weekly program. Follow the published sessions;
                  checkmarks stay on this browser.
                </dd>
                <dd>
                  <Link
                    className="font-bold underline underline-offset-4"
                    href="/try"
                  >
                    Take a little look ↗
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="font-bold">Your personal plan</dt>
                <dd className="mt-2">
                  Your available days. Runs you can move, shorten, or skip.
                  Saved weeks and recent progress.
                </dd>
              </div>
            </dl>
            <div className="mt-7">
              <CoffeePookie />
            </div>
          </div>
          <div className="price-ticket">
            <span className="price-tag">CHEAPER THAN A CUP OF COFFEE!</span>
            <p className="mt-8">
              <span className="price-number">{priceLabel}</span>
              <span className="ml-2 text-sm font-bold">USD / month</span>
            </p>
            <p className="mt-2 font-bold">First 7 days? On us.</p>
            <ul className="my-7 space-y-4 text-sm">
              {[
                "Your own saved weekly running plan",
                "Move, shorten, or skip when life happens",
                "A fresh choice each week + simple progress",
                "Optional Sunday nudges from Pookie",
              ].map((text) => (
                <li className="flex items-start gap-3" key={text}>
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="w-full">
              <Link href="/sign-up">
                Start my 7-day trial <ArrowRight />
              </Link>
            </Button>
            <p className="mt-5 text-xs leading-6">
              Card required. Renews at {priceLabel}/month after 7 days.
              <br />
              Reminder one day before your first charge.
              <br />
              Cancel in Account before your trial ends to avoid a charge.
            </p>
            <Link
              className="mt-3 inline-block text-xs font-bold underline underline-offset-4"
              href="/pricing"
            >
              All the plan details
            </Link>
          </div>
        </section>
        <section className="faq-section">
          <div className="page-width grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">A FEW THINGS BEFORE WE JOG OFF</p>
              <h2 className="section-title mt-4">
                Curious,
                <br />
                Pookie?
              </h2>
              <Sparkle className="mt-8 h-20 w-20 text-primary" />
            </div>
            <div>
              {faqs.map(([q, a]) => (
                <details key={q} className="pookie-faq">
                  <summary>
                    {q}
                    <Plus className="h-5 w-5 shrink-0" />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="page-width py-16">
          <div className="guide-banner">
            <Sparkle className="h-14 w-14 shrink-0" />
            <div>
              <p className="eyebrow">YOUR NEXT CHAPTER STARTS SMALL</p>
              <h2>Your next little run starts here.</h2>
              <p>
                7 days free, then $4.99/month. Card required. Cancel in Account
                before your trial ends to avoid a charge.
              </p>
            </div>
            <Link className="text-link shrink-0" href="/sign-up">
              Start my 7-day trial <ArrowUpRight />
            </Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
