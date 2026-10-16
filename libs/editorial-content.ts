import "server-only";
import { unstable_cache } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { starterEdition } from "@/content/free-program";
import { guides, type Guide } from "@/content/guides";
import type { PublicEdition, PublishedArticle } from "@/domain/editorial";
type Publication = { edition: PublicEdition; article: PublishedArticle };
const readPublished = unstable_cache(
  async (): Promise<Publication[]> => {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) return [];
    return await fetchQuery(api.editorial.published, {});
  },
  ["pookie-editorial-publications-v1"],
  { revalidate: 60 },
);
export async function publicContent() {
  try {
    return { publications: await readPublished(), unavailable: false };
  } catch {
    return { publications: [] as Publication[], unavailable: true };
  }
}
export async function freeEdition(id?: string) {
  const { publications, unavailable } = await publicContent();
  const edition = id
    ? (publications.find((row) => row.edition.id === id)?.edition ??
      (id === starterEdition.id ? starterEdition : null))
    : (publications[0]?.edition ?? starterEdition);
  if (id && !edition && unavailable) {
    throw new Error("Published program temporarily unavailable. Please retry.");
  }
  return {
    edition,
    unavailable,
    editions: [...publications.map((row) => row.edition), starterEdition],
  };
}
export type Article = Guide & { editionId?: string };
export async function allArticles(): Promise<Article[]> {
  const { publications } = await publicContent();
  return [...publications.map((row) => row.article), ...guides];
}

export async function articleBySlug(
  slug: string,
): Promise<Article | undefined> {
  const evergreen = guides.find((guide) => guide.slug === slug);
  if (evergreen) return evergreen;
  const { publications, unavailable } = await publicContent();
  if (unavailable)
    throw new Error("Published article temporarily unavailable. Please retry.");
  return publications.find((row) => row.article.slug === slug)?.article;
}
