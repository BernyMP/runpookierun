# Deploy your own Run Pookie Run

Use services you control. No production data or service credentials are supplied with this source release.

## Isolate environments

Create separate Convex staging and production deployments and Clerk test/live configurations. Put only the deployment names in `POOKIE_STAGING_DEPLOYMENT` and `POOKIE_PRODUCTION_DEPLOYMENT`; put the matching HTTPS Convex URL in `NEXT_PUBLIC_CONVEX_URL`. Set `POOKIE_ENVIRONMENT=staging` or `production`. Staging and production names must differ. Web deployment checks reject mismatched URLs, live keys in previews, and missing deployment bindings.

Do not reuse another application's database. Generate API definitions against your own Convex project before deploying the schema. Create fresh staging accounts and keep any database backups private.

## Configure services

1. Copy `.env.example` to ignored `.env.local`. Replace the public product domain and support address in `config.ts`; update the canonical `www` redirect in `next.config.js` and use your own `SITE_URL`/`APP_URL`.
2. Clerk: require verified email, configure sign-in/sign-up routes and `/pookie` redirects, and configure the Convex JWT template/application ID. Put the same paid plan ID in web and backend settings. The default UI describes a monthly USD 4.99 plan with a seven-day card-required trial; configure your offer to match, or update the code and tests together.
3. Convex: configure the Clerk issuer, server key, plan ID, webhook secret, and environment tier. Configure both deployment-name settings there as well. Add a signed Clerk webhook at your Convex HTTP origin's `/webhooks/clerk` route for subscription/subscriptionItem lifecycle, paymentAttempt events, and account deletion.
4. Email: configure Resend, a verified sender, matching `APP_URL`, and a randomly generated `WEEKLY_REMINDER_SECRET` of at least 32 characters on Convex. Optional weekly reminders require explicit user consent. Validate delivery with a mailbox you control.
5. Optional server analytics use `POSTHOG_KEY` and `POSTHOG_HOST` on Convex. Advertising is disabled by default; keep it off until your own configuration and consent requirements are ready. Never upload customer lists or analytics exports to the repository.
6. Optional editorial publishing uses a dedicated worker secret and owner allowlist; see [editorial.md](editorial.md). Keep local worker authentication out of hosting environments.

Only web-required configuration belongs on the web host. Email, webhook, reminder-signing, advertising access tokens, and editorial worker secrets belong on the backend or local worker as documented in `.env.example`. Never prefix a server secret with `NEXT_PUBLIC_`.

## Validate before signup

Run `npm run check`, `npm run test:e2e`, and `npm run check:public`. Use `npm run verify:launch -- --role=web` for web configuration and `--role=convex --env-file=<ignored-backend-env-file>` for backend configuration. This verifies configuration and the connected offer, not actual payment or mail delivery.

The opt-in connected browser suite requires `POOKIE_CONNECTED_TESTS=1`, staging tier, test Clerk credentials, and the exact configured staging backend. Start the app on `localhost:4317`, then run `npx playwright test --config playwright.connected.config.ts`. Use only disposable identities and test cards. The mail rehearsal additionally requires `POOKIE_MAIL_TESTS=1` and a controlled test mailbox; its internal scheduler refuses production, an unconfigured staging name, and absent user consent.

Verify authenticated setup persistence, cross-account isolation, trial presentation, signed billing reconciliation, cancellation and expiry, reminder delivery, opt-out, and account deletion. Local mocked checks do not establish live service behavior. Keep verification notes and captures outside Git.

## Operate and recover

Deploy backend and frontend changes together to their matching environment. Preserve a private rollback reference. If billing or access fails, pause new signup while retaining existing account and cancellation access.

Monitor billing reconciliation, reminder failures, scheduled jobs, webhook retries, and provider delivery status. Reminder jobs use bounded retries, leases, consent versions, capacity budgets, and idempotency keys. Rotate exposed credentials at the provider and review access; deleting a public file alone does not revoke a credential.
