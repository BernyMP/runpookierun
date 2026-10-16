import React, { type ReactNode } from "react";

// Editorial copy is plain text with a small, safe internal-link vocabulary.
// Never interpret HTML or arbitrary URLs supplied by an author agent.
export function ArticleProse({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const links =
    /\[([^\]\n]{1,150})\]\((\/(?:try(?:\/\d{4}-\d{2}-\d{2})?|guides(?:\/[a-z0-9-]+)?|pricing))\)/g;
  let cursor = 0;
  for (const match of text.matchAll(links)) {
    parts.push(text.slice(cursor, match.index));
    parts.push(
      <a key={match.index} href={match[2]} className="text-primary underline">
        {match[1]}
      </a>,
    );
    cursor = match.index! + match[0].length;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
