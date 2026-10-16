import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ArticleProse } from "../components/pookie/article-prose";

it("renders approved internal links without interpreting arbitrary URLs or HTML", () => {
  const html = renderToStaticMarkup(
    React.createElement(ArticleProse, {
      text: "Open [the free plan](/try) or [your edition](/try/2026-09-28). <script>alert(1)</script> [bad](javascript:alert(1)) [outside](https://example.com)",
    }),
  );
  expect(html).toContain('href="/try"');
  expect(html).toContain('href="/try/2026-09-28"');
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain('href="javascript:');
  expect(html).not.toContain('href="https:');
});
