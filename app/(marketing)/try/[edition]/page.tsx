import { notFound } from "next/navigation";
import { FreeProgramPage } from "@/components/pookie/free-program-page";
import { freeEdition } from "@/libs/editorial-content";
import { pageMetadata } from "@/libs/metadata";
export const revalidate = 60;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ edition: string }>;
}) {
  const { edition: id } = await params;
  const { edition } = await freeEdition(id);
  if (!edition) notFound();
  return pageMetadata(
    `${edition.theme} — free running week`,
    edition.introduction,
    `/try/${id}`,
  );
}
export default async function EditionPage({
  params,
}: {
  params: Promise<{ edition: string }>;
}) {
  const { edition: id } = await params;
  const content = await freeEdition(id);
  if (!content.edition) notFound();
  return <FreeProgramPage {...content} edition={content.edition} archived />;
}
