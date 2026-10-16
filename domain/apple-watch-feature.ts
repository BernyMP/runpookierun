// One build-time switch. Prototype exposes only the unlisted guide/sample.
// Enable publicly only after recording physical-device evidence in docs/apple-watch.md.
export function appleWatchMode(value: string | undefined) {
  return value === "prototype" || value === "enabled" ? value : "off";
}
export const watchMode = appleWatchMode(
  process.env.NEXT_PUBLIC_APPLE_WATCH_EXPORTS,
);
export const watchExportsEnabled = watchMode === "enabled";
