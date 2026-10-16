import { expect, test } from "@playwright/test";
test("canonical public pages and sitemap entries remain search-ready", async ({
  request,
  page,
}) => {
  const home = await request.get("/");
  expect(await home.text()).toContain(
    "<title>Get Back Into Running | Run Pookie Run</title>",
  );
  const redirect = await request.get("/try?utm_source=google", {
    headers: { host: "www.runpookierun.com" },
    maxRedirects: 0,
  });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe(
    "https://runpookierun.com/try?utm_source=google",
  );
  const sitemap = await (await request.get("/sitemap-0.xml")).text();
  expect(sitemap).not.toContain("content-sitemap.xml");
  expect(sitemap).not.toContain("<lastmod>");
  expect(sitemap).toContain("https://runpookierun.com/about");
  for (const path of ["/sign-in", "/sign-up"]) {
    expect(await (await request.get(path)).text()).toContain(
      'name="robots" content="noindex, nofollow"',
    );
  }
  for (const agent of [
    "Googlebot",
    "bingbot",
    "OAI-SearchBot",
    "PerplexityBot",
  ]) {
    const response = await request.get("/guides/getting-back-into-running", {
      headers: { "user-agent": agent },
    });
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(
      "How to get back into running after a break",
    );
  }
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { name: "How our guides are made" }),
  ).toBeVisible();
  await page.goto("/guides");
  await expect(page.locator("article").first()).toContainText(
    "How to get back into running after a break",
  );
});
test("public measurement counts the first completion once and strips private fields", async ({
  page,
}) => {
  const events: { en?: string; ed?: Record<string, unknown>; o?: string }[] =
    [];
  await page.route("**/_vercel/insights/script.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
    let filter = e => e;
    window.va = (kind, data) => {
      if (kind === 'beforeSend') { filter = data; return; }
      const event = filter({ type: kind, url: location.href });
      if (!event || !['event','pageview'].includes(kind)) return;
      fetch('/api/public-analytics/' + (kind === 'event' ? 'event' : 'view'), {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({o:event.url, en:data.name, ed:data.data})});
    };
    (window.vaq || []).forEach(args => window.va(...args));
  `,
    }),
  );
  await page.route("**/api/public-analytics/*", async (route) => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await page.goto("/?utm_source=perplexity&token=private");
  await page.getByRole("link", { name: "Free weekly plan", exact: true }).first().click();
  await expect
    .poll(() => events.filter((e) => e.en === "free_plan_viewed").length)
    .toBe(1);
  await page.getByRole("button", { name: "Mark Day 1 complete" }).click();
  await expect
    .poll(
      () => events.filter((e) => e.en === "free_plan_first_completion").length,
    )
    .toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "Mark Day 3 complete" }).click();
  await page.getByRole("link", { name: "Start my 7-day free trial" }).click();
  await expect
    .poll(() => events.filter((e) => e.en === "signup_clicked").length)
    .toBe(1);
  expect(
    events.filter((e) => e.en === "free_plan_first_completion"),
  ).toHaveLength(1);
  expect(JSON.stringify(events)).not.toMatch(
    /private|token|utm_source|unsubscribe/,
  );
  expect(events.find((e) => e.en === "free_plan_viewed")?.o).toBe("https://runpookierun.com/try");
  expect(events.find((e) => e.en === "free_plan_viewed")?.ed?.source).toBe(
    "perplexity",
  );
  const before = events.length;
  await page.goto("/unsubscribe?token=private");
  await expect(
    page.getByRole("button", { name: "Turn off weekly reminders" }),
  ).toBeVisible();
  expect(events).toHaveLength(before);
});
