const roles = {
  web: [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_CONVEX_URL",
    "NEXT_PUBLIC_CLERK_PAID_PLAN_ID",
    "SITE_URL",
  ],
  convex: [
    "CLERK_SECRET_KEY",
    "CLERK_JWT_ISSUER_DOMAIN",
    "CLERK_PAID_PLAN_ID",
    "CLERK_WEBHOOK_SECRET",
    "WEEKLY_REMINDER_SECRET",
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "APP_URL",
    "POOKIE_EDITOR_WORKER_SECRET",
    "POOKIE_EDITOR_CLERK_IDS",
  ],
  editorial: ["POOKIE_EDITOR_CONVEX_URL", "POOKIE_EDITOR_WORKER_SECRET"],
};
function configurationErrors(role, env) {
  const deployments = {
    staging: env.POOKIE_STAGING_DEPLOYMENT,
    production: env.POOKIE_PRODUCTION_DEPLOYMENT,
  };
  if (!roles[role])
    return ["Choose a configuration role: web, convex, or editorial."];
  const errors = roles[role]
    .filter((key) => !env[key])
    .map((key) => `Missing ${key}.`);
  if (env.ENABLE_AI_PERSONALIZATION === "true")
    errors.push("AI personalization must remain disabled.");
  for (const key of ["WEEKLY_REMINDER_SECRET", "POOKIE_EDITOR_WORKER_SECRET"]) {
    if (roles[role].includes(key) && env[key] && env[key].length < 32)
      errors.push(`${key} must have at least 32 characters.`);
  }
  const tier = env.POOKIE_ENVIRONMENT;
  if (role !== "editorial" && !["staging", "production"].includes(tier))
    errors.push("POOKIE_ENVIRONMENT must be staging or production.");
  if (role !== "editorial" && !deployments[tier])
    errors.push(
      "Configure the matching POOKIE_STAGING_DEPLOYMENT or POOKIE_PRODUCTION_DEPLOYMENT.",
    );
  for (const name of Object.values(deployments)) {
    if (name && !/^[a-z][a-z0-9-]*$/.test(name))
      errors.push(
        "Convex deployment names must contain only lowercase letters, digits, and hyphens.",
      );
  }
  if (deployments.staging && deployments.staging === deployments.production)
    errors.push("Staging and production must use separate deployments.");
  if (
    env.CLERK_SECRET_KEY &&
    role !== "editorial" &&
    !env.CLERK_SECRET_KEY.startsWith(
      tier === "production" ? "sk_live_" : "sk_test_",
    )
  )
    errors.push("Clerk secret does not match the environment.");
  if (role === "web") {
    if (
      env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith(
        tier === "production" ? "pk_live_" : "pk_test_",
      )
    )
      errors.push("Clerk public key does not match the environment.");
    if (
      deployments[tier] &&
      env.NEXT_PUBLIC_CONVEX_URL !== `https://${deployments[tier]}.convex.cloud`
    )
      errors.push("Web app must use the matching clean Pookie backend.");
    if (env.VERCEL_ENV === "production" && tier !== "production")
      errors.push("Production hosting requires production services.");
    if (env.VERCEL_ENV === "preview" && tier !== "staging")
      errors.push("Preview hosting requires test services.");
    for (const key of [
      "META_ACCESS_TOKEN",
      "CLERK_WEBHOOK_SECRET",
      "WEEKLY_REMINDER_SECRET",
      "RESEND_API_KEY",
      "POOKIE_EDITOR_WORKER_SECRET",
    ]) {
      if (env[key])
        errors.push(
          `${key} belongs on Convex or the local worker, not the web app.`,
        );
    }
  }
  if (
    role === "web" &&
    env.NEXT_PUBLIC_META_ENABLED === "true" &&
    !/^\d+$/.test(env.NEXT_PUBLIC_META_PIXEL_ID || "")
  )
    errors.push(
      "Enabled Meta browser measurement requires a valid public Pixel ID.",
    );
  if (role === "convex" && env.META_ENABLED === "true") {
    if (
      !/^\d+$/.test(env.META_PIXEL_ID || "") ||
      !env.META_ACCESS_TOKEN ||
      !/^v\d+\.0$/.test(env.META_API_VERSION || "")
    )
      errors.push(
        "Enabled Meta delivery requires a dataset ID, server token, and supported API version.",
      );
    const names = (env.META_ALLOWED_EVENTS || "")
      .split(",")
      .map((x) => x.trim());
    if (
      !names.length ||
      names.some(
        (name) =>
          !["CompleteRegistration", "StartTrial", "Purchase"].includes(name),
      )
    )
      errors.push(
        "Meta requires an explicit verified conversion-event allowlist.",
      );
  }
  if (role === "editorial") {
    try {
      const url = new URL(env.POOKIE_EDITOR_CONVEX_URL);
      if (
        url.protocol !== "https:" ||
        url.port ||
        !Object.values(deployments).some(
          (name) => name && url.hostname === `${name}.convex.site`,
        )
      )
        errors.push("Editorial must target a clean Pookie Convex HTTP origin.");
    } catch {
      errors.push("Editorial origin must be a valid HTTPS URL.");
    }
    if (env.OPENAI_API_KEY || env.AI_GATEWAY_API_KEY || env.VERCEL)
      errors.push(
        "Editorial runs locally through ChatGPT membership, with no paid API fallback.",
      );
  }
  return errors;
}
module.exports = { configurationErrors };
