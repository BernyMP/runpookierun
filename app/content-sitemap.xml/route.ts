import { starterEdition } from "@/content/free-program";
import config from "@/config";
import { publicContent } from "@/libs/editorial-content";
export const revalidate = 60;
export async function GET() {
  const { publications, unavailable } = await publicContent();
  if (unavailable)
    return new Response(
      "Published content is temporarily unavailable. Please retry.",
      {
        status: 503,
        headers: { "Retry-After": "60", "Cache-Control": "no-store" },
      },
    );
  const entries = [
    { path: `/try/${starterEdition.id}`, date: starterEdition.publishedAt },
    ...publications.flatMap(({ edition, article }) => [
      { path: `/try/${edition.id}`, date: edition.publishedAt },
      { path: `/guides/${article.slug}`, date: article.publishedAt },
    ]),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>https://${config.domainName}${entry.path}</loc><lastmod>${new Date(entry.date).toISOString()}</lastmod></url>`).join("")}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
