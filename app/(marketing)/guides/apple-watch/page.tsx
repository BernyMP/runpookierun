import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/pookie/marketing-shell";
import { AppleWatchGuide } from "@/components/pookie/apple-watch-guide";
import { watchMode } from "@/domain/apple-watch-feature";
import { pageMetadata } from "@/libs/metadata";

export const metadata = {
  ...pageMetadata(
    "Take a Pookie workout to Apple Watch",
    "A step-by-step guide to downloading one Pookie workout and trying it on your Apple Watch.",
    "/guides/apple-watch",
  ),
  ...(watchMode !== "enabled"
    ? { robots: { index: false, follow: false } }
    : {}),
};
export default function Page() {
  if (watchMode === "off") notFound();
  return (
    <MarketingShell>
      <AppleWatchGuide />
    </MarketingShell>
  );
}
