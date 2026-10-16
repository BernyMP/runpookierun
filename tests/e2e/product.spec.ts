import { test, expect } from "@playwright/test";
test("landing page has clear pricing and working essential navigation", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Little runs. Big good vibes.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Free weekly plan", exact: true }).first(),
  ).toHaveAttribute("href", "/try");
  await expect(page.getByText("$4.99", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "Then $4.99/month. Card required. Cancel in Account before your trial ends to avoid a charge.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page
      .getByRole("img", {
        name: /Pookie.*happy little run/,
      })
      .first(),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/home-viewport-${testInfo.project.name}.png`,
    animations: "disabled",
  });
  await page.screenshot({
    path: `artifacts/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const overflow = await page.evaluate(() => ({
      width: window.innerWidth,
      scroll: document.documentElement.scrollWidth,
      elements: Array.from(document.querySelectorAll("body *"))
        .filter(
          (el) => el.getBoundingClientRect().right > window.innerWidth + 1,
        )
        .map((el) => ({
          tag: el.tagName,
          cls: el.className,
          right: el.getBoundingClientRect().right,
        }))
        .slice(0, 10),
    }));
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
      width,
    );
  }
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Privacy policy", exact: true }),
  ).toBeVisible();
  await page.goto("/tos");
  await expect(
    page.getByRole("heading", { name: "Terms of service", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("setup saves progress, validates spacing, and completes", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4318/?setup");
  await page.getByRole("button", { name: "I’m new to running" }).click();
  await page
    .getByLabel("What would you like running to bring you?")
    .fill("A clearer head");
  await page.getByRole("button", { name: "Monday", exact: true }).click();
  await page.getByRole("button", { name: "Tuesday", exact: true }).click();
  await page.getByRole("button", { name: "20 minutes", exact: true }).click();
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("status")).toHaveText("Progress saved");
  await page.reload();
  await expect(
    page.getByLabel("What would you like running to bring you?"),
  ).toHaveValue("A clearer head");
  await page.getByRole("button", { name: "Continue to my free trial" }).click();
  await expect(page.getByRole("alert")).toContainText("rest day");
  await page.getByRole("button", { name: "Tuesday", exact: true }).click();
  await page.getByRole("button", { name: "Thursday", exact: true }).click();
  await page.getByRole("button", { name: "Continue to my free trial" }).click();
  await expect(
    page.getByRole("heading", { name: "Ready for your trial" }),
  ).toBeVisible();
});
test("complete a run and optionally record effort", async ({
  page,
}, testInfo) => {
  await page.goto("http://127.0.0.1:4318/");
  await page.getByRole("button", { name: "View run" }).click();
  await page.getByRole("button", { name: "I did it" }).click();
  await expect(page.getByText("How did it feel?")).toBeVisible();
  await page.screenshot({
    path: `artifacts/celebration-${testInfo.project.name}.png`,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Okay", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({
    path: `artifacts/completed-${testInfo.project.name}.png`,
  });
  await expect(
    page.getByText("1 of 2 runs done", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "You showed up. That counts." }),
  ).toBeVisible();
});
test("shorten and move a run without losing its identity", async ({ page }) => {
  await page.goto("http://127.0.0.1:4318/");
  await page.getByRole("button", { name: "View run" }).click();
  await page.getByRole("button", { name: "Shorten", exact: true }).click();
  await page.getByRole("button", { name: "View run" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("15 minutes · Easy effort", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await page.getByRole("button", { name: "Tue, Sep 22", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Tue, Sep 22, The tiny victory lap, planned",
    }),
  ).toBeVisible();
});
test("skip does not mark a run complete", async ({ page }) => {
  await page.goto("http://127.0.0.1:4318/");
  await page.getByRole("button", { name: "View run" }).click();
  await page
    .getByRole("button", { name: "Skip this run — no catching up" })
    .click();
  await expect(
    page.getByText("0 of 2 runs done", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Skipped. Onward, without catching up."),
  ).toBeVisible();
});
test("expired access retains history and hides mutation controls", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4318/?readonly");
  await page.getByRole("button", { name: "View run" }).click();
  await expect(
    page.getByText(
      "Your week is saved. Renew your subscription to make changes.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "I did it" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("free week preserves checkmarks and has a permanent printable archive", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/try");
  await expect(
    page.getByRole("heading", { name: "The tiny victory lap" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark Day 1 complete" }).click();
  await expect(
    page.getByRole("button", { name: "Done. A little win!" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Done. A little win!" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Keep this week’s link →" }).click();
  await expect(page).toHaveURL(/\/try\/2026-09-14$/);
  await expect(
    page.getByRole("button", { name: "Done. A little win!" }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute("data-printed", "true");
  });
  await page.getByRole("button", { name: "Print this week" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-printed", "true");
  await page.screenshot({
    path: `artifacts/free-week-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("free plan remains usable when browser storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage disabled");
      },
    });
  });
  await page.goto("/try");
  await expect(page.getByRole("status")).toContainText("can't save checkmarks");
  await page.getByRole("button", { name: "Mark Day 3 complete" }).click();
  await expect(
    page.getByRole("button", { name: "Done. A little win!" }),
  ).toBeVisible();
});

test("Pookie uses distinct frames and pauses on demand, offscreen, and for reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const sprite = page.locator(".pookie-run-sprite");
  await sprite.scrollIntoViewIfNeeded();
  await expect(sprite).toHaveCSS("animation-play-state", "running");
  const first = await sprite.evaluate(
    (el) => getComputedStyle(el).backgroundPosition,
  );
  await expect
    .poll(() =>
      sprite.evaluate((el) => getComputedStyle(el).backgroundPosition),
    )
    .not.toBe(first);
  await page.getByRole("button", { name: "Pause Pookie" }).click();
  await expect(sprite).toHaveCSS("animation-play-state", "paused");
  await page.getByRole("button", { name: "Run, Pookie!" }).click();
  await expect(sprite).toHaveCSS("animation-play-state", "running");
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(sprite).toHaveCSS("animation-play-state", "paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(sprite).toHaveCount(0);
  await expect(page.locator(".running-pookie img")).toHaveAttribute(
    "alt",
    /Pookie/,
  );
});

test("Pookie retains original artwork if the new animation cannot load", async ({
  page,
}) => {
  await page.route("**/pookie-run-cycle-v1.webp", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".running-pookie img")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause Pookie" })).toHaveCount(
    0,
  );
});

test("weekly confirmation makes the runner choose the next workload", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4318/?confirm");
  await page
    .getByRole("button", { name: "An easier week · 15 minutes" })
    .click();
  await page.getByRole("button", { name: "Choose my session length" }).click();
  await page
    .getByLabel("Minutes per session, including walking")
    .selectOption("20");
  await expect(
    page.getByLabel("Minutes per session, including walking").locator("option"),
  ).toHaveCount(3);
  await page.getByRole("button", { name: "Confirm my next week" }).click();
  await page.getByRole("button", { name: "View run" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("20 minutes · Easy effort", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Every run counts." }),
  ).toBeVisible();
});

test("pricing and guides are crawlable HTML with canonical URLs", async ({
  page,
  request,
}) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://runpookierun.com/pricing",
  );
  await page.goto("/guides/getting-back-into-running");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    1,
  );
  const response = await request.get("/guides/running-twice-a-week");
  expect(await response.text()).toContain("<h1");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("OAI-SearchBot");
  expect(robots).toContain("https://runpookierun.com/content-sitemap.xml");
  const programHtml = await (await request.get("/try")).text();
  expect(programHtml).toContain("The tiny victory lap");
  const liveSitemap = await (await request.get("/content-sitemap.xml")).text();
  expect(liveSitemap).toContain("https://runpookierun.com/try/2026-09-14");
  expect(robots).toContain("Disallow: /pookie");
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  expect(sitemap).toContain("https://runpookierun.com/pricing");
  expect(sitemap).toContain(
    "https://runpookierun.com/guides/getting-back-into-running",
  );
  expect(sitemap).not.toMatch(
    /<loc>[^<]*(pookie\/account|unsubscribe|sign-up)/,
  );
  await page.goto("/unsubscribe?token=invalid-link");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await page.getByRole("button", { name: "Turn off weekly reminders" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "We couldn’t use that link." }),
  ).toBeVisible();
});

test("an unfinished free week keeps its checkmarks when a new edition arrives", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4318/?free");
  await page.getByRole("button", { name: "Mark Day 1 complete" }).click();
  await page.getByRole("button", { name: "Release next edition" }).click();
  await expect(
    page.getByRole("button", { name: "Done. A little win!" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Finish your previous week →" }),
  ).toHaveAttribute("href", "/try/2026-09-14");
  await page.getByRole("button", { name: "Mark Day 3 complete" }).click();
  await page.getByRole("button", { name: "Return to old edition" }).click();
  await expect(
    page.getByRole("button", { name: "Done. A little win!" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Mark Day 3 complete" }),
  ).toBeVisible();
});

test("stalled account loading offers recovery and resumes when connected", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("http://127.0.0.1:4318/?loading");
  await expect(page.getByRole("status")).toHaveText(
    "Getting your running shoes ready…",
  );
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toHaveCount(0);
  await page.clock.runFor(12001);
  await expect(
    page.getByRole("heading", { name: "A little pause, Pookie." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Use the free weekly plan meanwhile" }),
  ).toHaveAttribute("href", "/try");
  await page.getByRole("button", { name: "Finish connection" }).click();
  await expect(
    page.getByRole("heading", { name: "Account connected" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toHaveCount(0);
});
test("stalled account loading can restart sign-in", async ({ page }) => {
  await page.clock.install();
  await page.goto("http://127.0.0.1:4318/?loading");
  await page.clock.runFor(12001);
  await page
    .getByRole("button", { name: "Sign in again", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sign-in opened" }),
  ).toBeVisible();
});
