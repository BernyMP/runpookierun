import { z } from "zod";
import { buildSession, sessionTemplate } from "./sessions";
const text = (max: number) => z.string().trim().min(1).max(max);
export const editionSchema = z
  .object({
    theme: text(80),
    introduction: text(450),
    sessions: z
      .array(
        z
          .object({
            templateId: z.enum(["tiny-victory", "fresh-air", "curiosity-loop"]),
            prompt: text(220),
          })
          .strict(),
      )
      .length(3),
  })
  .strict()
  .superRefine((edition, ctx) => {
    if (new Set(edition.sessions.map((s) => s.templateId)).size < 2)
      ctx.addIssue({
        code: "custom",
        message: "Use at least two different session structures.",
      });
  });
export const articleSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(90),
    title: text(120),
    description: text(200),
    summary: text(600),
    sections: z
      .array(
        z
          .object({
            heading: text(100),
            paragraphs: z.array(text(1500)).min(1).max(4),
          })
          .strict(),
      )
      .min(3)
      .max(8),
    sources: z
      .array(
        z.object({ label: text(150), url: z.string().url().max(500) }).strict(),
      )
      .min(1)
      .max(6),
    related: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(4),
  })
  .strict();
export type EditionDraft = z.infer<typeof editionSchema>;
export type ArticleDraft = z.infer<typeof articleSchema>;
export type PublicEdition = EditionDraft & {
  id: string;
  publishedAt: number;
  articleSlug?: string;
};
export type PublishedArticle = ArticleDraft & {
  publishedAt: number;
  editionId: string;
};
export const approvedSourceHosts = [
  "www.nhs.uk",
  "www.cdc.gov",
  "odphp.health.gov",
];
export function validateArticle(raw: unknown) {
  const article = articleSchema.parse(raw);
  const words = [
    article.summary,
    ...article.sections.flatMap((section) => section.paragraphs),
  ]
    .join(" ")
    .trim()
    .split(/\s+/).length;
  if (words < 450 || words > 800)
    throw new Error("Articles must contain 450–800 words of useful copy.");
  for (const source of article.sources) {
    const url = new URL(source.url);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !approvedSourceHosts.includes(url.hostname)
    )
      throw new Error("Use a verified NHS, CDC, or HHS source.");
  }
  return article;
}
export function editionSessions(edition: EditionDraft) {
  return editionSchema
    .parse({
      theme: edition.theme,
      introduction: edition.introduction,
      sessions: edition.sessions,
    })
    .sessions.map((session, index) => ({
      id: `session-${index + 1}`,
      day: [1, 3, 6][index],
      optional: index === 2,
      minutes: index === 2 ? 15 : 20,
      kind: sessionTemplate(session.templateId).kind,
      ...buildSession(session.templateId, index === 2 ? 15 : 20),
      playfulPrompt: session.prompt,
    }));
}
export function publicationTime(id: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) throw new Error("Invalid edition date.");
  const date = new Date(`${id}T13:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== id ||
    date.getUTCDay() !== 1
  )
    throw new Error("Editions publish on Monday at 6 a.m. Phoenix time.");
  return date.getTime();
}
export function upcomingEditions(now = Date.now()) {
  const day = new Date(now);
  day.setUTCHours(13, 0, 0, 0);
  day.setUTCDate(day.getUTCDate() + ((8 - day.getUTCDay()) % 7));
  if (day.getTime() <= now) day.setUTCDate(day.getUTCDate() + 7);
  return [0, 7].map((offset) =>
    new Date(day.getTime() + offset * 86400000).toISOString().slice(0, 10),
  );
}
export const reviewSchema = z
  .object({
    approved: z.boolean(),
    notes: text(1200),
    checks: z
      .object({
        accurate: z.boolean(),
        accessible: z.boolean(),
        sourcesVerified: z.boolean(),
        distinct: z.boolean(),
        onBrand: z.boolean(),
      })
      .strict(),
  })
  .strict();
export function validateReview(raw: unknown) {
  const review = reviewSchema.parse(raw);
  if (review.approved && !Object.values(review.checks).every(Boolean))
    throw new Error("Every review check must pass before approval.");
  return review;
}
