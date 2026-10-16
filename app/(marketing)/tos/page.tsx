import { priceLabel } from "@/config";
import Link from "next/link";
import { LegalPage } from "@/components/pookie/legal";
import config from "@/config";
export const metadata = {
  title: "Terms of service",
  alternates: { canonical: "/tos" },
};
export default function Terms() {
  return (
    <LegalPage title="Terms of service">
      <section>
        <h2>Using Pookie</h2>
        <p>
          Run Pookie Run provides easy weekly running plans for personal use by
          adults aged 18 and over. Keep your account details accurate and your
          sign-in secure. Do not misuse the service, interfere with other
          accounts, or attempt to bypass access controls.
        </p>
      </section>
      <section>
        <h2>Running guidance</h2>
        <p>
          Pookie uses fixed workout templates and your saved preferences. It
          provides general fitness guidance, not medical advice, injury
          rehabilitation, or race coaching. Choose activity appropriate for you,
          stop if you experience pain, and seek qualified professional advice
          when needed. We do not guarantee fitness outcomes.
        </p>
      </section>
      <section>
        <h2>Your trial and subscription</h2>
        <p>
          Eligible new customers receive a seven-day free trial with a payment
          method required. Unless canceled before the trial ends, the
          subscription renews at {priceLabel} USD per month. Checkout displays
          the applicable amount and renewal details. Clerk manages payments and
          trial eligibility. We send an additional reminder one day before the
          first scheduled charge, alongside any provider notifications.
        </p>
      </section>
      <section>
        <h2>Cancellation and refunds</h2>
        <p>
          You can manage or cancel your subscription from Account. Canceling
          stops future renewals and retains access until the recorded end of
          your trial or paid period. Account deletion ends access immediately
          and cancels the subscription. For a refund request within seven days
          of a purchase, contact{" "}
          <a href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a>.
          Any rights you have under applicable consumer law remain unaffected.
        </p>
      </section>
      <section>
        <h2>Your information</h2>
        <p>
          Our <Link href="/privacy-policy">privacy policy</Link> explains the
          information we store and the service providers that help us operate
          Pookie.
        </p>
      </section>
      <section>
        <h2>Availability and changes</h2>
        <p>
          Features may occasionally be unavailable during maintenance or
          provider outages. We will communicate material changes to these terms
          or your subscription before they take effect where required.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          <a href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a>
        </p>
      </section>
    </LegalPage>
  );
}
