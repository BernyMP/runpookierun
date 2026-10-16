import { test, expect, type Page } from "@playwright/test";
async function mockPixel(page: Page) {
  const requests: string[] = [];
  await page.route("**/api/ad-consent", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/connect.facebook.net/**", (route) => {
    requests.push(route.request().url());
    return route.fulfill({
      contentType: "application/javascript",
      body: `
      window.pixelEvents=[];
      window.fbq.callMethod=(...args)=>window.pixelEvents.push(args);
      (window.fbq.queue||[]).forEach(args=>window.fbq.callMethod(...args));
      document.cookie='_fbp=fb.1.1790186400000.1234; Path=/';
    `,
    });
  });
  return requests;
}
test("advertising waits for consent, strips URLs and sends no browser conversions", async ({
  page,
}) => {
  const requests = await mockPixel(page);
  await page.goto(
    "http://127.0.0.1:4318/?ad-consent&utm_source=instagram&fbclid=click123&private=not-for-meta",
  );
  await expect(
    page.getByRole("button", { name: "Allow measurement" }),
  ).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "Allow measurement" }).click();
  await expect.poll(() => requests.length).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            (window as unknown as { pixelEvents: unknown[][] }).pixelEvents ||
            []
          ).filter((e) => e[0] === "track").length,
      ),
    )
    .toBe(1);
  expect(new URL(page.url()).search).toBe("");
  const events = await page.evaluate(
    () => (window as unknown as { pixelEvents: unknown[][] }).pixelEvents,
  );
  expect(events.filter((e) => e[0] === "track").map((e) => e[1])).toEqual([
    "PageView",
  ]);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("pookie:ad-context:v1")!).fbc,
    ),
  ).toMatch(/click123$/);
  await page.getByRole("button", { name: "Advertising choices" }).click();
  await page.getByRole("button", { name: "No thanks" }).click();
  expect(await page.evaluate(() => document.cookie)).not.toContain("_fbp");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("pookie:ad-consent:v1")!).allowed,
    ),
  ).toBe(false);
});
test("declining and browser privacy signals never load Meta", async ({
  page,
}) => {
  const requests = await mockPixel(page);
  await page.goto("http://127.0.0.1:4318/?ad-consent");
  await page.getByRole("button", { name: "No thanks" }).click();
  await page.reload();
  expect(requests).toHaveLength(0);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "globalPrivacyControl", { value: true }),
  );
  await page.goto("http://127.0.0.1:4318/?ad-consent");
  await page.getByRole("button", { name: "Advertising choices" }).click();
  await expect(
    page.getByRole("button", { name: "Allow measurement" }),
  ).toHaveCount(0);
  expect(requests).toHaveLength(0);
});
test("failed account consent sync is visible and retryable", async ({
  page,
}) => {
  await mockPixel(page);
  await page.route("**/api/ad-consent", (route) =>
    route.fulfill({ status: 503 }),
  );
  await page.goto("http://127.0.0.1:4318/?ad-consent");
  await page.getByRole("button", { name: "No thanks" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "couldn’t update your account",
  );
  await page.route("**/api/ad-consent", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.getByRole("button", { name: "Retry account update" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
