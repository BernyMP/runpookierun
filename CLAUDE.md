# Repository guide

Read README.md and docs/launch.md for the current MVP architecture and deployment steps.

Use `npm run check` for typecheck, lint, domain/backend tests and production build; use `npm run test:e2e` for desktop/mobile browser tests. No credentials are required for the local checks. Connected-service release checks are separate and must not be reported as passed without running them.

The backend runs in Convex. Never accept entitlement, user IDs, or replacement workout objects from browser input. Public mutations use the authenticated Clerk identity and enforce subscription access. Plan persistence, billing synchronization, analytics delivery, and reminder delivery are internal functions.

Never point the replacement schema at the old test deployment. Never print or commit credentials. Browser test fixtures live outside the Next.js application and must never become an authentication bypass.
