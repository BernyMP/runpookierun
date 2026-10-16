import type { Metadata } from "next";
import config from "@/config";
export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const fullTitle = title.endsWith(`| ${config.appName}`)
    ? title
    : `${title} | ${config.appName}`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      type: "website",
    },
  };
}
