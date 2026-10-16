import { FreeProgramPage } from "@/components/pookie/free-program-page";
import { freeEdition } from "@/libs/editorial-content";
import { pageMetadata } from "@/libs/metadata";
export const revalidate = 60;
export const metadata = pageMetadata(
  "Free weekly running plan",
  "A real free running week: two easy outings, an optional third, room to rest, and checkmarks saved on your browser. No account or card.",
  "/try",
);
export default async function TryPage() {
  const content = await freeEdition();
  return <FreeProgramPage {...content} edition={content.edition!} />;
}
