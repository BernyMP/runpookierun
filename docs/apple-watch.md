# Apple Watch file-export prototype

## Release status

**Physical-device import: NOT VERIFIED. General workout exports default OFF.**

The website generates a file; it cannot verify installation, schedule workouts, update watch copies, read Health data, or mark runs complete. No companion app or Developer Program membership is required to generate files. Import without another app remains an experiment.

`@bibixx/workoutkit` is pinned to 0.2.0 (MIT, no runtime dependencies). Its reverse-engineered format reports iOS/watchOS 26 coverage, not proof of Safari/Files import on any particular device. The mapper preserves ordered intervals, labels work/recovery, and adds no training targets. All-walking sessions use a single timed outdoor walk; Apple's single-goal format has no custom title. References are content-derived; repeat-import behavior must be observed on hardware.

## One feature switch

Set `NEXT_PUBLIC_APPLE_WATCH_EXPORTS` at build time, then rebuild:

- `off` (default; unknown values also off): no workout buttons, guide returns 404, no guide links or sitemap entry.
- `prototype`: unlisted, noindex `/guides/apple-watch` with only the 20-minute test download. Free/personal workout buttons stay off. General workout exports remain off.
- `enabled`: free and accessible personal workout downloads and guide-list link. Use only after the device checklist passes and guide compatibility text is updated from evidence.

For a local preview: `NEXT_PUBLIC_APPLE_WATCH_EXPORTS=prototype npm run dev -- --port 4320`. Open `/guides/apple-watch`. A paired iPhone cannot access a Mac's localhost; use the live HTTPS prototype guide for the real Safari test. Do not expose local authenticated development servers to the internet. To generate the standalone sample, run `node scripts/export-watch-sample.mjs`; output goes to ignored `artifacts/apple-watch/`, never the public assets directory.

Disable by setting `off` and rebuilding/redeploying. This removes website controls; it cannot delete files already downloaded or watch copies. No database migration or API endpoint is introduced. Browser fixture configuration enables controls only in the isolated Vite harness, which is not an app route.

## Physical-device acceptance — pending user participation

Record actual versions and results; do not infer them from a simulator or binary round-trip test.

| Check                                                                        | Evidence/result |
| ---------------------------------------------------------------------------- | --------------- |
| Tester and date                                                              | Pending         |
| iPhone model and exact iOS version                                           | Pending         |
| Apple Watch model and exact watchOS version                                  | Pending         |
| HTTPS preview URL, code revision, exported filename                          | Pending         |
| Safari download opens in Apple preview, without another installed importer   | Not tested      |
| Exact taps and labels from download through watch addition                   | Not tested      |
| Workout found under Outdoor Run; title and 20-minute duration                | Not tested      |
| 5-minute warm-up; five 30-second jog/90-second walk pairs; 5-minute cooldown | Not tested      |
| Watch interval transitions and normal completion                             | Not tested      |
| Duplicate import behavior                                                    | Not tested      |
| Shortened session: new duration; what happens to the old copy                | Not tested      |
| Ten-minute walking file: found under Outdoor Walk; correct total             | Not tested      |
| Actual device captures, with personal information removed                    | Not captured    |

If Files only shows an unknown file, no add option exists, or the watch never receives it, record the exact failing step and keep public release off. Do not quietly add a third-party importer or build a native app. Report the obstacle and revisit the approach with the owner.

After a successful test, replace the guide's unverified compatibility paragraph and tentative screen instructions with the measured versions and exact steps; add only real device screenshots if useful. Update the public capability copy, enable on staging, run the checks below, and publish only the verified behavior. Broader OS support requires additional device tests.

## Automated verification

- `npm run check`: typecheck, lint, unit/backend tests, production build. The watch tests cover all six templates at all five durations, full binary encode/decode, partial intervals, shortening, stable references, invalid input, and fail-closed switch behavior.
- `npm run test:e2e`: default public build has no watch controls/guide; isolated enabled fixtures exercise downloads, retry, access restrictions, unchanged completion, responsive layout, and keyboard navigation.
- Test the `prototype` preview separately to confirm noindex, unlisted guide, the sample file, and absent public session buttons.

Browser and file-format checks do **not** establish Apple device compatibility. Record actual run results when work finishes.
