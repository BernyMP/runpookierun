import { LegalPage } from "@/components/pookie/legal";
import config from "@/config";
export const metadata = {
  title: "Privacy policy",
  alternates: { canonical: "/privacy-policy" },
};
export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <section>
        <h2>What we collect</h2>
        <p>
          We store your account identifier, name and email when provided,
          running preferences, timezone, weekly plans, workout completion and
          effort feedback, subscription status, optional reminder preferences,
          acquisition source, campaign/creative codes, verified payment
          receipts, and email delivery records. Card details are handled by
          Clerk and its payment processor; Pookie does not store full card
          numbers. Please do not include medical or sensitive personal
          information in your running motivation.
        </p>
      </section>
      <section>
        <h2>Why we use it</h2>
        <p>
          We use this information to operate your account, prepare and save
          running plans, manage access to your subscription, send trial
          reminders and optional weekly reminders, support you, and maintain
          reliability.
        </p>
      </section>
      <section>
        <h2>Providers</h2>
        <p>
          Clerk provides authentication and billing, Convex stores application
          data and runs backend functions, Vercel hosts the website, and Resend
          delivers emails. Plans use preset rules; AI personalization is
          disabled for this release and your running motivation is not sent to
          an AI provider. Our providers may process information in countries
          outside your own under their applicable terms and safeguards.
        </p>
      </section>
      <section>
        <h2>Analytics and local storage</h2>
        <p>
          On public pages, Vercel Web Analytics measures page views, free-plan
          visits, the first completion interaction for an edition on a browser,
          and signup-link clicks. Before forwarding events to analytics, our
          server removes referrers, query strings, account identifiers, and
          workout details. Event properties contain only the public page path, a
          coarse source such as Google or ChatGPT, validated campaign, creative
          and medium codes, and an edition date where relevant. We do not track
          private account or unsubscribe pages. This aggregate activity is
          separate from account and payment milestones; it does not identify the
          same person across devices. A browser marker prevents repeated
          completion interactions being counted for the same edition. Clearing
          browser storage removes that marker.
        </p>
        <p>
          When configured, PostHog measures limited product milestones such as
          setup, trial activation, completed runs, and subscription changes
          using a pseudonymous identifier. A coarse referral source, campaign
          code, ad creative code, medium, and your optional answer about how you
          found Pookie help us connect acquisition with paid use. We do not
          retain full referrer URLs. We do not include running motivation or
          effort feedback in analytics. Automatic click recording and session
          recordings are disabled. Authentication uses storage necessary to keep
          you signed in. We keep a first-visit source code in your browser for
          up to 30 days; free weekly plan checkmarks are saved on your browser,
          keyed to each edition. They are not sent to your account. You can turn
          off weekly emails in Account or from an email, separately from billing
          notices. Advertising measurement is optional and described below.
        </p>
      </section>
      <section id="advertising">
        <h2>Optional advertising measurement</h2>
        <p>
          Advertising measurement is off unless configured and you choose to
          allow it. If enabled, Meta receives public page visits and verified
          account creation, trial starts, and successful payments. With
          permission, matching data includes Meta browser/click identifiers,
          browser type, a hashed account identifier, and a hashed verified email
          when available. Hashing does not make this information anonymous.
          Payment events include amount and currency. We do not send workout
          activity, running preferences, motivation, effort, or private
          account-page views to Meta.
        </p>
        <p>
          You can decline without changing how Pookie works. Use “Advertising
          choices” in the footer to withdraw permission; signed-in choices also
          update your account for future server-side events. We honor Global
          Privacy Control and Do Not Track. Consent choices last up to 180 days;
          ad-click context is used for up to 30 days. An account’s saved choice
          applies to subsequent payment events while permission remains active.
          Contact us if you need to change account-level permission without
          signing in. Revoking permission stops future delivery; it cannot
          recall events already delivered to Meta.
        </p>
      </section>
      <section>
        <h2>Retention and your choices</h2>
        <p>
          Your saved running data remains available while you maintain an
          account, including read-only access after a subscription ends.
          Deleting your account removes your active running data and cancels
          your subscription. Service providers may retain backups, security
          logs, and billing records according to their retention policies and
          applicable requirements. Contact us to request access, correction, or
          deletion of your information or to ask about analytics records.
        </p>
      </section>
      <section>
        <h2>Adults only</h2>
        <p>
          Pookie is intended for adults aged 18 and over. If you believe a child
          has provided information, contact us so we can investigate and remove
          it.
        </p>
      </section>
      <section>
        <h2>Contact and updates</h2>
        <p>
          Contact{" "}
          <a href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a>{" "}
          with privacy questions. This page reflects the current product.
          Material changes will be communicated when required.
        </p>
      </section>
    </LegalPage>
  );
}
