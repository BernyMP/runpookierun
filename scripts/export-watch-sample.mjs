import { mkdir, writeFile } from "node:fs/promises";
import { buildSession } from "../domain/sessions.ts";
import { exportAppleWorkout } from "../domain/apple-watch.ts";

const output = new URL("../artifacts/apple-watch/", import.meta.url);
await mkdir(output, { recursive: true });
const sample = await exportAppleWorkout({
  ...buildSession("tiny-victory", 20),
  minutes: 20,
});
await writeFile(new URL(sample.filename, output), sample.bytes);
console.log(
  `Created ${new URL(sample.filename, output).pathname}. Device import is NOT verified.`,
);
