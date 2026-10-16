import { priceLabel } from "@/config";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/pookie/marketing-shell";
import { Button } from "@/components/ui/button";
import { guides } from "@/content/guides";
import { articleBySlug } from "@/libs/editorial-content";
import { ArticleProse } from "@/components/pookie/article-prose";
export const revalidate = 60;
import { pageMetadata } from "@/libs/metadata";
export const dynamicParams = true;
export function generateStaticParams() {
  return guides.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await articleBySlug(slug);
  if (!guide) notFound();
  return pageMetadata(guide.title, guide.description, `/guides/${slug}`);
}
export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await articleBySlug(slug);
  if (!guide) notFound();
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    ...(guide.publishedAt
      ? {
          datePublished: new Date(guide.publishedAt).toISOString(),
          dateModified: new Date(
            guide.modifiedAt ?? guide.publishedAt,
          ).toISOString(),
        }
      : {}),
    ...(guide.modifiedAt && !guide.publishedAt
      ? { dateModified: new Date(guide.modifiedAt).toISOString() }
      : {}),
    publisher: {
      "@id": "https://runpookierun.com/#organization",
      "@type": "Organization",
      name: "Run Pookie Run",
      url: "https://runpookierun.com",
    },
    description: guide.description,
    mainEntityOfPage: `https://runpookierun.com/guides/${slug}`,
    author: {
      "@type": "Organization",
      "@id": "https://runpookierun.com/#organization",
      name: "Run Pookie Run",
      url: "https://runpookierun.com",
    },
  };
  return (
    <MarketingShell>
      <main id="main" className="app-width pb-20 pt-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              schema,
              {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "The Pookie Post",
                    item: "https://runpookierun.com/guides",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: guide.title,
                    item: `https://runpookierun.com/guides/${slug}`,
                  },
                ],
              },
            ]).replace(/</g, "\\u003c"),
          }}
        />
        <nav
          aria-label="Breadcrumb"
          className="mb-7 text-sm text-muted-foreground"
        >
          <Link href="/guides" className="underline">
            The Pookie Post
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{guide.title}</span>
        </nav>
        <article>
          <header>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {guide.title}
            </h1>
            <p className="mt-5 text-xs text-muted-foreground">
              By{" "}
              <Link href="/about" className="underline">
                the Run Pookie Run team
              </Link>{" "}
              · Practical planning guidance for adults
              {guide.publishedAt
                ? ` · ${new Date(guide.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Phoenix" })}`
                : ""}
              {guide.modifiedAt
                ? ` · Updated ${new Date(guide.modifiedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Phoenix" })}`
                : ""}
            </p>
          </header>
          <p className="my-8 rounded-2xl bg-[#eef2e9] p-6 text-lg leading-8">
            {guide.summary}
          </p>
          <div className="space-y-9">
            {guide.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="mb-4 text-2xl font-bold tracking-tight">
                  {section.heading}
                </h2>
                <div className="space-y-4 leading-8 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>
                      <ArticleProse text={paragraph} />
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
          {guide.sources.length > 0 && (
            <section className="mt-10 border-t pt-6">
              <h2 className="font-bold">Sources and further reading</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {guide.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} className="text-primary underline">
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
        <section className="panel my-10 space-y-4 border-orange-200">
          <h2 className="text-2xl font-bold">
            See what a flexible week feels like.
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Follow two easy outings and an optional third. No account or card
            needed.
          </p>
          <Button asChild className="h-12 rounded-full">
            <Link href={guide.editionId ? `/try/${guide.editionId}` : "/try"}>
              Free weekly plan
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Your own saved plan: 7 days free, then {priceLabel}/month. Card
            required.
          </p>
        </section>
        <nav aria-label="Related guides">
          <h2 className="mb-4 text-xl font-bold">Keep reading</h2>
          <ul className="space-y-4">
            {guide.related.map((related) => {
              const item = guides.find((g) => g.slug === related);
              return item ? (
                <li key={related}>
                  <Link
                    href={`/guides/${related}`}
                    className="text-primary underline"
                  >
                    {item.title}
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        </nav>
      </main>
    </MarketingShell>
  );
}
