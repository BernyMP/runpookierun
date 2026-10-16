import Link from "next/link";
import { MarketingShell } from "@/components/pookie/marketing-shell";
import { allArticles } from "@/libs/editorial-content";
import { watchExportsEnabled } from "@/domain/apple-watch-feature";
export const revalidate = 60;
import { pageMetadata } from "@/libs/metadata";
export const metadata = pageMetadata(
  "Guides for getting back into running",
  "Practical guides for returning casual runners: fit running around your schedule, handle missed weeks, and choose the support you need.",
  "/guides",
);
export default async function GuidesPage() {
  const guides = (await allArticles()).sort(
    (a, b) => Number(!!a.editionId) - Number(!!b.editionId),
  );
  return (
    <MarketingShell>
      <main id="main" className="page-width pb-20 pt-10">
        <div className="page-intro">
          <p className="eyebrow">THE POOKIE POST</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Running tips for your comeback.
          </h1>
          <p className="mt-6 max-w-2xl leading-8 text-muted-foreground">
            Practical ways to plan a casual routine, handle a changing week, and
            decide what support is useful to you.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {watchExportsEnabled && <article className="panel !bg-accent">
            <p className="eyebrow">A LITTLE HELP ON YOUR WRIST</p>
            <h2 className="mt-4 text-2xl font-bold"><Link href="/guides/apple-watch">Take Pookie to Apple Watch</Link></h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">Download one workout, open it on your iPhone, and follow the guide to add it to your watch.</p>
            <Link href="/guides/apple-watch" className="mt-5 inline-block text-sm font-semibold text-primary underline">Read the guide →</Link>
          </article>}
          {guides.map((guide, index) => (
            <article
              key={guide.slug}
              className={`panel ${index === 0 ? "!bg-secondary" : ""}`}
            >
              <p className="eyebrow">
                {guide.editionId
                  ? "Fresh from Pookie"
                  : index === 0
                    ? "Start here"
                    : "A practical guide"}
              </p>
              <h2 className="mt-4 text-2xl font-bold">
                <Link
                  href={`/guides/${guide.slug}`}
                  className="hover:text-primary"
                >
                  {guide.title}
                </Link>
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {guide.description}
              </p>
              <Link
                href={`/guides/${guide.slug}`}
                className="mt-5 inline-block text-sm font-semibold text-primary underline"
              >
                Read the guide →
              </Link>
            </article>
          ))}
        </div>
      </main>
    </MarketingShell>
  );
}
