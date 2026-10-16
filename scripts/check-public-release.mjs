import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync } from "node:fs";

const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const failures = [];
for (const path of paths) {
  const parts = path.split("/");
  if (
    parts.some((part) =>
      [
        "node_modules",
        ".next",
        ".vercel",
        ".clerk",
        ".eve",
        "artifacts",
        "test-results",
        "playwright-report",
        "exports",
        "backups",
        "secrets",
        "credentials",
      ].includes(part),
    ) ||
    parts.some((part) => part.startsWith(".env") && part !== ".env.example") ||
    /\.(?:pem|key|p12|pfx|sqlite\d*|db|dump|har|log|csv|zip)$/i.test(path)
  )
    failures.push(`${path}: private or generated file type`);
  if (lstatSync(path).isSymbolicLink()) {
    failures.push(`${path}: source releases must not contain symbolic links`);
    continue;
  }
  const bytes = readFileSync(path);
  // Inspect binary metadata too, without logging matched values.
  const text = bytes.toString("utf8");
  if (
    /\b(?:user|cplan|csub(?:_item)?|dpl|prj|team)_[A-Za-z0-9]{16,}/.test(text)
  )
    failures.push(`${path}: service account or deployment identifier`);
  if (/\/Users\/[^\s"'`]+/.test(text))
    failures.push(`${path}: personal filesystem path`);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))
    failures.push(`${path}: private key material`);
  if (path.endsWith(".env.example")) {
    for (const line of text.split("\n")) {
      const match = line.match(
        /^([A-Z0-9_]*(?:SECRET|TOKEN|API_KEY|PASSWORD|CLERK_IDS)[A-Z0-9_]*)=(.*)$/,
      );
      if (match && match[2].trim())
        failures.push(`${path}: credential example must be blank`);
    }
  }
}
if (!paths.length) failures.push("No tracked source files to inspect.");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Public source hygiene passed for ${paths.length} tracked files. Run Gitleaks separately for credential detection.`,
  );
