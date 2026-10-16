import { test, expect } from "@playwright/test";
import {
  clerk,
  clerkSetup,
  setupClerkTestingToken,
} from "@clerk/testing/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";

test.beforeAll(async () => {
  await clerkSetup();
});

test("staging signup, saved setup, card-required trial, return, cancellation and deletion", async ({
  page,
}) => {
  const email = `pookie-release-${Date.now()}+clerk_test@example.com`;
  await setupClerkTestingToken({ page });
  await page.goto("/sign-up");
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(email);
  const verificationReady = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("prepare_verification") &&
      response.ok(),
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await verificationReady;
  await expect(
    page.getByRole("heading", { name: /Verify your email/ }),
  ).toBeVisible();
  const code = page
    .getByRole("textbox", { name: /Enter verification code/ })
    .first();
  await code.pressSequentially("424242");
  await expect(
    page.getByRole("heading", { name: "Let’s find your rhythm." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "I’m new to running" }).click();
  await page
    .getByLabel("What would you like running to bring you?")
    .fill("A little fresh air");
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    weekday: "long",
  }).format(new Date());
  await page.getByRole("button", { name: today, exact: true }).click();
  await page
    .getByRole("button", {
      name: days[(days.indexOf(today) + 3) % 7],
      exact: true,
    })
    .click();
  await page.getByLabel("Your timezone").selectOption("America/Phoenix");
  await page.getByRole("button", { name: "20 minutes", exact: true }).click();
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("status")).toHaveText("Progress saved");
  await page.reload();
  await expect(
    page.getByLabel("What would you like running to bring you?"),
  ).toHaveValue("A little fresh air");
  await page.getByRole("button", { name: "Continue to my free trial" }).click();
  await page
    .getByRole("button", { name: "Start my free trial", exact: true })
    .click();
  await expect(
    page.getByText("Cheaper than a cup of coffee!", { exact: true }),
  ).toBeVisible();
  const payment = page.frameLocator('iframe[src*="elements-inner-payment"]');
  await expect(payment.getByLabel("Card number")).toBeVisible({
    timeout: 30000,
  });
  const checkout = page.locator(".cl-checkout-root");
  await expect(
    checkout.getByText("Total Due after trial ends in 7 days", { exact: true }),
  ).toBeVisible();
  await checkout
    .getByRole("button", { name: /subscribe|pay\s\$|start/i })
    .click();
  await expect(payment.getByLabel("Card number")).toBeVisible();
  await payment.getByLabel("Card number").fill("4242424242424242");
  await payment.getByLabel("Expiration date").fill("1234");
  await payment.getByLabel("Security code").fill("123");
  await payment.getByLabel("Country").selectOption({ label: "United States" });
  await payment.getByLabel("ZIP code").fill("85001");
  await page.screenshot({
    path: "artifacts/connected-tests/checkout.png",
    fullPage: true,
  });
  await checkout
    .getByRole("button", { name: /subscribe|pay\s\$|start/i })
    .click();
  await expect(
    page.getByText(/Your free week is underway. First charge:/),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("button", { name: "View run" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "View run" })).toBeVisible();
  await page.getByRole("button", { name: "View run" }).click();
  await page.getByRole("button", { name: "I did it" }).click();
  await page.getByRole("button", { name: "Okay", exact: true }).click();
  await page.goto("/pookie/account");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/pookie");
  await expect(
    page.getByText("1 of 2 runs done", { exact: true }),
  ).toBeVisible();
  await page.goto("/pookie/account");
  await page
    .getByRole("button", { name: "Manage billing or cancel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel free trial", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel free trial", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page.goto("/pookie");
  await expect(
    page.getByText(/Your trial is canceled. You can keep running until/),
  ).toBeVisible();
  await expect(
    page.getByText("1 of 2 runs done", { exact: true }),
  ).toBeVisible();
  const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const { data: users } = await client.users.getUserList({
    emailAddress: [email],
  });
  expect(users).toHaveLength(1);
  const userId = users[0].id;
  const trial = (
    await client.billing.getUserBillingSubscription(userId)
  ).subscriptionItems.find(
    (item) => item.planId === process.env.NEXT_PUBLIC_CLERK_PAID_PLAN_ID,
  );
  expect(trial).toBeDefined();
  await client.billing.cancelSubscriptionItem(trial!.id, { endNow: true });
  await page.goto("/pookie");
  await page
    .getByRole("button", { name: "Continue with Pookie", exact: true })
    .click();
  await expect(checkout.getByText("Free trial", { exact: true })).toHaveCount(
    0,
  );
  await checkout
    .getByRole("radio", { name: "Add payment method", exact: true })
    .click();
  await payment.getByLabel("Card number").fill("4000000000000002");
  await payment.getByLabel("Expiration date").fill("1234");
  await payment.getByLabel("Security code").fill("123");
  await payment.getByLabel("Country").selectOption({ label: "United States" });
  await payment.getByLabel("ZIP code").fill("85001");
  await checkout
    .getByRole("button", { name: /subscribe|pay\s\$|start/i })
    .click();
  await expect(payment.getByText(/Your card was declined/)).toBeVisible();
  const afterDecline = await client.billing.getUserBillingSubscription(userId);
  expect(
    afterDecline.subscriptionItems.some(
      (item) =>
        item.planId === process.env.NEXT_PUBLIC_CLERK_PAID_PLAN_ID &&
        item.status === "active",
    ),
  ).toBe(false);
  await payment.getByLabel("Card number").fill("4242424242424242");
  await checkout
    .getByRole("button", { name: /subscribe|pay\s\$|start/i })
    .click();
  await expect(
    page.getByRole("button", { name: "Continue with Pookie", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(async () => {
      const paid = (
        await client.billing.getUserBillingSubscription(userId)
      ).subscriptionItems.find(
        (item) =>
          item.planId === process.env.NEXT_PUBLIC_CLERK_PAID_PLAN_ID &&
          item.status === "active",
      );
      return paid
        ? { trial: paid.isFreeTrial, amount: paid.plan?.fee?.amount }
        : null;
    })
    .toEqual({ trial: false, amount: 499 });
  await page.goto("/pookie/account");
  await page.getByText("Delete my account", { exact: true }).click();
  await page
    .getByLabel("Type DELETE to confirm account deletion")
    .fill("DELETE");
  await page
    .getByRole("button", { name: "Permanently delete account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(client.users.getUser(userId)).rejects.toMatchObject({
    status: 404,
  });
  mkdirSync("artifacts/setup", { recursive: true });
  writeFileSync(
    "artifacts/setup/connected-browser-result.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        userId,
        email,
        signup: true,
        savedSetup: true,
        cardRequired: true,
        trial: true,
        savedRunAfterSignIn: true,
        cancellation: true,
        immediateExpiry: true,
        declinedCard: true,
        paidTestCharge: true,
        identityDeleted: true,
      },
      null,
      2,
    ),
  );
});
