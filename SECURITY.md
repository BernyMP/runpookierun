# Security and private data

Report vulnerabilities using this repository's GitHub **Security → Report a vulnerability** feature. Do not include live credentials, personal records, payment identifiers, private logs, or database exports in public issues or pull requests. Provide a minimal reproduction with synthetic data.

Use your own isolated services when running the app. Server functions derive identity from authentication and enforce subscription access. Browser fixtures are outside the Next.js app and must never become an authentication bypass.

Keep `.env` files, service credentials, local worker sessions, runtime journals, mail artifacts, analytics exports, database snapshots, and browser captures out of Git. The examples intentionally contain no service credentials. Public release checks and secret scanning are safeguards; review every contribution before merging.

If a credential is exposed, revoke or rotate it at its provider immediately and review provider access. Remove the exposure from all relevant history and artifacts; deletion alone does not revoke access. Share incident evidence privately.
