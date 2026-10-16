# Run Pookie Run

An open-source running companion for adults rebuilding a routine. Follow the free weekly run/walk program, or set up a personal plan around two or three available days.

Built with Next.js, React, TypeScript, Tailwind, Convex, and Clerk. Includes flexible workouts, weekly confirmation, progress, subscription checks, optional reminders, and a separate editorial worker.

## Run locally

Use Node.js 22.18 or newer (Node.js 24 for the optional editorial worker).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

The public pages work without service credentials. Authentication, saved plans, checkout, and email need your own services; the repository does not provide access to the hosted product's accounts or data. Set your own domain and support address in `config.ts` and your own origins in environment configuration before hosting a fork. The public site is [runpookierun.com](https://runpookierun.com).

## Project layout

- `app/`, `components/`: public website and authenticated planner.
- `domain/`: validated workout, calendar, billing, and privacy rules.
- `convex/`: authenticated storage, billing reconciliation, editorial publishing, and reminder jobs.
- `agents/editorial/`: optional local author/reviewer worker.
- `tests/`: synthetic unit, backend, and browser fixtures.
- `public/pookie/`: original Pookie artwork and derived animations.

Personal plans use deterministic rules. Optional advertising and Apple Watch exports default off. Watch imports still require physical-device verification; see [the prototype notes](docs/apple-watch.md).

## Verify

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run check:public
```

Local tests use mocks and an isolated backend. Connected tests require explicit opt-in, your own isolated staging deployment, test credentials, and disposable test identities. They do not run against the hosted product.

## Deploy your own instance

Follow [the deployment guide](docs/launch.md). Create separate staging and production services, configure their deployment names explicitly, and keep secrets in local ignored files or your hosting provider's secret store. The [editorial guide](docs/editorial.md) covers the optional worker.

## Source and privacy

This is a clean source release with fresh Git history. Private repository history, operational launch records, customer/account/subscription records, credentials, environment files, database exports, analytics exports, saved editorial evidence, and runtime journals are excluded. Included editorial content is the app's public starter content; tests use synthetic fixtures.

Public contribution checks reject private file types and account identifiers, and CI scans for secrets. Keep real data out of issues, pull requests, screenshots, and logs. See [SECURITY.md](SECURITY.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Project code and creator-owned Pookie artwork are released under [MIT](LICENSE). Third-party components retain their own licenses; bundled Fraunces fonts use the [SIL Open Font License](public/fonts/OFL-Fraunces.txt). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
