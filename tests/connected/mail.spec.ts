import { test, expect } from "@playwright/test";
import {
  clerk,
  clerkSetup,
  setupClerkTestingToken,
} from "@clerk/testing/playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";

test("opt-in staging mailbox rehearsal", async ({ page }) => {
  test.skip(
    process.env.POOKIE_MAIL_TESTS !== "1",
    "Explicit mailbox-test opt-in required",
  );
  const fixture = JSON.parse(
    readFileSync("artifacts/setup/mail-user.json", "utf8"),
  );
  const email = fixture.email_addresses[0].email_address;
  expect(fixture.private_metadata.pookie_release_mail_test).toBe(true);
  expect(email).toMatch(/\+pookie-mail-\d+@gmail\.com$/);
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const plan = (
    await client.billing.getPlanList({ payerType: "user" })
  ).data.find((p) => p.id === process.env.NEXT_PUBLIC_CLERK_PAID_PLAN_ID);
  expect(plan?.freeTrialDays).toBe(1);
  await clerkSetup();
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/pookie");
  await page.getByRole("button", { name: "I’m new to running" }).click();
  await page
    .getByLabel("What would you like running to bring you?")
    .fill("A little fresh air");
  await page.getByRole("button", { name: "Monday", exact: true }).click();
  await page.getByRole("button", { name: "Thursday", exact: true }).click();
  await page.getByLabel("Your timezone").selectOption("America/Phoenix");
  await page.getByRole("button", { name: "20 minutes", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to my free trial" }).click();
  await page
    .getByRole("button", { name: "Start my free trial", exact: true })
    .click();
  const checkout = page.locator(".cl-checkout-root");
  await expect(
    checkout.getByText(/Total Due after trial ends in 1 day/),
  ).toBeVisible();
  const payment = page.frameLocator('iframe[src*="elements-inner-payment"]');
  await payment.getByLabel("Card number").fill("4242424242424242");
  await payment.getByLabel("Expiration date").fill("1234");
  await payment.getByLabel("Security code").fill("123");
  await payment.getByLabel("Country").selectOption({ label: "United States" });
  await payment.getByLabel("ZIP code").fill("85001");
  await checkout
    .getByRole("button", { name: /subscribe|pay\s\$|start/i })
    .click();
  await expect(
    page.getByText(/Your free week is underway. First charge:/),
  ).toBeVisible({ timeout: 30000 });
  const subscription = await client.billing.getUserBillingSubscription(
    fixture.id,
  );
  const trial = subscription.subscriptionItems.find(
    (item) => item.planId === process.env.NEXT_PUBLIC_CLERK_PAID_PLAN_ID,
  );
  expect(trial?.isFreeTrial).toBe(true);
  writeFileSync(
    "artifacts/setup/mail-checkout-result.json",
    JSON.stringify(
      {
        userId: fixture.id,
        trialId: trial?.id,
        trialEnd: trial?.periodEnd,
        verifiedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
});
