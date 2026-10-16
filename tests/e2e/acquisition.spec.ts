import { test, expect } from "@playwright/test";
test("familiar landing style clarifies the paid offer and preserves attribution", async ({
  page,
}) => {
  const metaRequests: string[] = [];
  page.on("request", (r) => {
    if (/facebook\.com|facebook\.net/.test(r.url())) metaRequests.push(r.url());
  });
  await page.goto(
    "/?utm_source=instagram&utm_medium=paid_social&utm_campaign=comeback-us-v1&utm_content=flexibility-feed",
  );
  await expect(
    page.getByRole("heading", { name: "Little runs. Big good vibes." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Free weekly plan" }).first(),
  ).toHaveAttribute("href", "/try");
  await expect(
    page.getByText("Take a look at our free weekly workouts, too!"),
  ).toBeVisible();
  await expect(page.locator('a[data-cta="hero"]')).toHaveAttribute(
    "href",
    "/sign-up",
  );
  const sample = page.getByTestId("week-peek");
  await sample.getByRole("button", { name: "Shorten Monday’s run" }).click();
  await expect(sample.getByRole("status")).toHaveText(
    "20 → 15 minutes. A little still counts.",
  );
  await sample.getByRole("button", { name: "Reset sample" }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  await sample
    .getByRole("button", { name: "Peek inside the actual planner" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your little running era." }),
  ).toBeVisible();
  const dialog = page.getByRole("dialog");
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "View run", exact: true }).click();
  await page.getByRole("button", { name: "Shorten", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(sample.getByRole("status")).toHaveText(
    "20 → 15 minutes. A little still counts.",
  );
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("pookie:source:v1")!),
    ),
  ).toMatchObject({
    source: "instagram",
    medium: "paid_social",
    campaign: "comeback-us-v1",
    content: "flexibility-feed",
  });
  expect(metaRequests).toEqual([]);
});
for (const browser of ["Instagram", "FBAN/FBIOS;FBAV/500"])
  test(`paid attribution survives navigation with ${browser} user agent`, async ({
    browser: engine,
  }) => {
    const context = await engine.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile ${browser}`,
    });
    const page = await context.newPage();
    await page.goto(
      "http://localhost:" +
        (process.env.POOKIE_E2E_PORT || "4317") +
        "/?utm_source=instagram&utm_medium=paid_social&utm_campaign=comeback-us-v1&utm_content=restart-stories",
    );
    await page.locator('a[href="/sign-up"]').first().click();
    await expect(page).toHaveURL(/sign-up/);
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("pookie:source:v1")!),
      ),
    ).toMatchObject({ source: "instagram", content: "restart-stories" });
    await context.close();
  });
