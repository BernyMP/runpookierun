# Optional weekly editorial worker

The free program is a fresh weekly starting point. Personal paid plans are not changed by the editorial worker.

`agents/editorial/` runs locally with Node.js 24 and its pinned Eve dependency. Program and article authors save drafts; a separate reviewer records an independent decision. Convex publishes only the exact approved versions. The agents cannot access customer records, billing, deployments, arbitrary HTTP, filesystem, or shell tools.

## Set up

1. Deploy your own isolated staging backend and configure `POOKIE_STAGING_DEPLOYMENT` there. Set `POOKIE_EDITOR_CLERK_IDS` privately to your own owner's authenticated subject.
2. Generate a separate worker secret of at least 32 characters. Put `POOKIE_EDITOR_WORKER_SECRET` on Convex and in ignored `agents/editorial/.env.local`. Set `POOKIE_EDITOR_CONVEX_URL` to your deployment's HTTPS `.convex.site` origin. Set your staging/production deployment names in the worker configuration for launch verification.
3. Run `npm ci` inside `agents/editorial/`. Authenticate locally using your own ChatGPT membership. The worker uses the pinned provider/model configuration and has no paid API fallback. Provider availability must be verified independently.
4. Run `npm run weekly` there to prepare two future editions. Inspect drafts and review decisions in your private `/pookie/editorial` page. Rejected or stale drafts cannot publish; a rejected draft has bounded revision attempts.
5. Verify staging publication and withdrawal before configuring your separate production worker. No recurring automation is created by cloning this repository.

## Scheduling and recovery

The backend publisher checks for approved Monday editions. To prepare future content automatically, arrange your own local schedule with sufficient lead time. Approved content can publish while the local computer is offline; new generation waits for the worker.

Claims, versioned reviews, leases, and an ignored local journal support recovery. Never copy journals, claim tokens, drafts, or authentication into public support channels. Do not share journals between deployments. Pause publishing or withdraw content through the owner dashboard when necessary.

The internal accelerated publication rehearsal requires `POOKIE_ENVIRONMENT=staging` and the exact backend URL built from `POOKIE_STAGING_DEPLOYMENT`. It changes timing only; authorization, exact-version review, pause, and duplicate checks still apply.

## Verify

`npm test` covers authorization, publication, review versions, leases, and recovery with synthetic fixtures. `npm run typecheck --prefix agents/editorial` verifies the optional package after installing its dependencies.

`npm run test:editorial-live` is an explicit local membership test against an in-memory backend. It may fetch real sources and writes evidence under ignored `artifacts/`. It cannot publish online and does not establish production authentication, hosting, or scheduled publication. No saved editorial evidence is included in this repository.
