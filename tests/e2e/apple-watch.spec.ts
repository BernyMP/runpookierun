import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { decode } from "@bibixx/workoutkit/decode";

test("unverified exports and guide remain unpublished in the default build", async ({
  page,
  request,
}) => {
  await page.goto("/try");
  await expect(
    page.getByRole("button", { name: "Add to Apple Watch" }),
  ).toHaveCount(0);
  await page.goto("/guides");
  await expect(page.locator('a[href="/guides/apple-watch"]')).toHaveCount(0);
  expect((await request.get("/guides/apple-watch")).status()).toBe(404);
  expect(await (await request.get("/sitemap-0.xml")).text()).not.toContain(
    "/guides/apple-watch",
  );
});

test("free workout downloads preserve intervals and leave checkmarks alone", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4318/?free");
  const button = page
    .getByRole("button", { name: "Add to Apple Watch" })
    .first();
  await button.focus();
  const downloading = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const download = await downloading;
  expect(download.suggestedFilename()).toBe(
    "pookie-the-tiny-victory-lap-20min.workout",
  );
  const plan = decode(
    new Uint8Array(await readFile((await download.path())!)),
  ).toJSON();
  expect(plan.custom!.displayName).toContain("20 min");
  expect(plan.custom!.blocks[0].steps).toHaveLength(10);
  await expect(
    page.getByRole("button", { name: "Mark Day 1 complete" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("status").filter({ hasText: "Download requested" }),
  ).toContainText("can’t confirm");
  await expect(button).toBeEnabled();
});

test("personal downloads follow shortening and respect locked, skipped and rest sessions", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4318/");
  await page.getByRole("button", { name: "View run" }).click();
  await page.getByRole("button", { name: "Shorten", exact: true }).click();
  await page.getByRole("button", { name: "View run" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to Apple Watch" }).click();
  expect((await downloading).suggestedFilename()).toContain("15min.workout");
  await page
    .getByRole("button", { name: "Skip this run — no catching up" })
    .click();
  await page.getByRole("button", { name: "View run" }).click();
  await expect(
    page.getByRole("button", { name: "Add to Apple Watch" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Tue, Sep 22, Room to recharge, planned" })
    .click();
  await expect(
    page.getByRole("button", { name: "Add to Apple Watch" }),
  ).toHaveCount(0);
  await page.goto("http://127.0.0.1:4318/?readonly");
  await page.getByRole("button", { name: "View run" }).click();
  await expect(
    page.getByRole("button", { name: "Add to Apple Watch" }),
  ).toHaveCount(0);
});

test("download failures offer retry without changing completion", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL;
    URL.createObjectURL = () => {
      URL.createObjectURL = create;
      throw new Error("Download unavailable");
    };
  });
  await page.goto("http://127.0.0.1:4318/?free");
  const button = page
    .getByRole("button", { name: "Add to Apple Watch" })
    .first();
  await button.click();
  await expect(page.getByRole("alert")).toContainText("couldn’t prepare");
  await expect(button).toBeEnabled();
  const downloading = page.waitForEvent("download");
  await button.click();
  await downloading;
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mark Day 1 complete" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("illustrated guide is readable on narrow screens and keyboard accessible", async ({
  page,
}, testInfo) => {
  await page.goto("http://127.0.0.1:4318/?watch-guide");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Ready for your wrist",
  );
  await expect(
    page.getByRole("img", { name: /Pookie.*smartwatch/ }),
  ).toHaveCount(2);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({
    width: testInfo.project.name === "mobile" ? 390 : 1280,
    height: 900,
  });
  const help = page.locator("summary").filter({ hasText: "There’s no option" });
  await help.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Downloading a file does not prove", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/apple-watch-guide-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
