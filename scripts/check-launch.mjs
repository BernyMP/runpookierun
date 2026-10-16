import config from "../config.ts";
import { existsSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import checks from "./launch-config.cjs";
const argument = (name) =>
  process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
const role = argument("role") ?? "web";
const envFile = argument("env-file") ?? ".env.local";
if (existsSync(envFile)) process.loadEnvFile(envFile);
const errors = checks.configurationErrors(role, process.env);
if (errors.length) {
  console.error("Launch configuration blocked:\n" + errors.join("\n"));
  process.exit(1);
}
if (role !== "editorial") {
  try {
    const client = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const { data: plans } = await client.billing.getPlanList({
      payerType: "user",
      limit: 100,
    });
    const planId =
      process.env[
        role === "web" ? "NEXT_PUBLIC_CLERK_PAID_PLAN_ID" : "CLERK_PAID_PLAN_ID"
      ];
    const plan = plans.find((item) => item.id === planId);
    if (
      !plan ||
      plan.isDefault ||
      !plan.isRecurring ||
      !plan.publiclyVisible ||
      !plan.freeTrialEnabled ||
      plan.freeTrialDays !== 7 ||
      plan.fee?.amount !== config.priceCents ||
      plan.fee?.currency.toUpperCase() !== "USD" ||
      plan.annualFee
    )
      throw new Error("offer");
    if (
      plans.some(
        (item) =>
          item.id !== plan.id && !item.isDefault && item.publiclyVisible,
      )
    )
      throw new Error("offer");
  } catch {
    console.error(
      "Launch blocked: could not verify one public $4.99 USD monthly plan with a seven-day trial.",
    );
    process.exit(1);
  }
}
console.log(`${role} configuration verified. No secret values printed.`);
console.log(
  "This does not certify release readiness. Connected checkout, webhook, reminder delivery, renewal, cancellation, and editorial publication checks still apply.",
);
