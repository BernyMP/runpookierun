# Contributing

Use Node.js 22.18 or newer, run `npm ci`, and start from `.env.example`. Public pages can be developed without service credentials. Use synthetic fixtures or your own isolated test services for authenticated features.

Before opening a pull request, run `npm run check`, `npm run test:e2e`, and `npm run check:public`. Describe the user-visible change and relevant verification. Connected billing, email, and editorial tests require separate configuration and explicit opt-in; do not claim they passed based on mocked tests.

Never commit real identities, subscription/payment records, exports, credentials, environment files, session journals, logs, or screenshots containing private information. Do not add production environment values to CI. Keep public issue reports reproducible with invented data.

Preserve authenticated backend boundaries, deterministic workout validation, recovery spacing, reminder consent, accessible controls, and reduced-motion support. Keep test harnesses outside production routes. See `docs/design.md` for Pookie's visual identity and `SECURITY.md` for private vulnerability reporting.

Contributions are submitted under the project's MIT license, with any third-party notices preserved.
