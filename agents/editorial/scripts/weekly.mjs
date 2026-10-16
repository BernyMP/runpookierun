import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { Client } from "eve/client";
const root = fileURLToPath(new URL("../", import.meta.url));
try {
  process.loadEnvFile(resolve(root, ".env.local"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const preview = process.argv.includes("--preview");
const origin = process.env.POOKIE_EDITOR_CONVEX_URL;
const secret = process.env.POOKIE_EDITOR_WORKER_SECRET;
if (!origin || !secret || secret.length < 32)
  throw new Error(
    "Pookie editorial is not connected. Set the NEW Pookie Convex HTTP origin and dedicated worker secret in agents/editorial/.env.local. No content was generated or published.",
  );
const destination = new URL(origin);
if (
  preview
    ? destination.hostname !== "127.0.0.1"
    : destination.protocol !== "https:" ||
      !destination.hostname.endsWith(".convex.site") ||
      destination.port
)
  throw new Error("Refusing an unexpected editorial destination.");
const stateDir = resolve(
  root,
  ".eve",
  preview
    ? `preview-worker-${createHash("sha256").update(origin).digest("hex").slice(0, 12)}`
    : "worker",
);
await mkdir(stateDir, { recursive: true });
const lock = resolve(stateDir, "lock");
try {
  await mkdir(lock);
} catch {
  let pid;
  try {
    pid = Number(await readFile(resolve(lock, "pid"), "utf8"));
  } catch {
    throw new Error("Worker lock is incomplete. Inspect it before retrying.");
  }
  let alive = true;
  try {
    process.kill(pid, 0);
  } catch {
    alive = false;
  }
  if (alive) throw new Error("Pookie's editorial worker is already running.");
  await rm(lock, { recursive: true });
  await mkdir(lock);
}
await writeFile(resolve(lock, "pid"), String(process.pid), { mode: 0o600 });
const journalPath = resolve(stateDir, "journal.json");
async function saveJournal(value) {
  await writeFile(`${journalPath}.tmp`, JSON.stringify(value), { mode: 0o600 });
  await rename(`${journalPath}.tmp`, journalPath);
}
async function readJournal() {
  try {
    return JSON.parse(await readFile(journalPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return null;
  }
}
async function bridge(operation, job, extra = {}) {
  const response = await fetch(new URL("/editorial/worker", origin), {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(25000),
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operation,
      token: job?.token ?? randomUUID(),
      ...(job?.runId ? { runId: job.runId } : {}),
      ...extra,
    }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? "Editorial request failed.");
  return result;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let child;
async function stopChild() {
  if (!child || child.exitCode !== null) {
    child = undefined;
    return;
  }
  const running = child;
  child = undefined;
  running.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => running.once("exit", resolve)),
    sleep(5000),
  ]);
  if (running.exitCode === null) running.kill("SIGKILL");
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    void stopChild().finally(() => process.exit(1));
  });
try {
  await bridge("queue");
  for (let turn = 0; turn < 24; turn++) {
    let job = await readJournal();
    if (!job) {
      job = { token: randomUUID(), phase: "claiming" };
      await saveJournal(job);
    }
    const receipt = await bridge("claim", job);
    if (!receipt) {
      await rm(journalPath, { force: true });
      console.log(
        "No pending Pookie drafts. The next two editions are prepared or need owner attention.",
      );
      break;
    }
    job = { ...job, ...receipt };
    await saveJournal(job);
    if (!["writing", "reviewing"].includes(receipt.status)) {
      await rm(journalPath, { force: true });
      continue;
    }
    const role =
      job.role === "reviewer"
        ? "reviewer"
        : job.kind === "program"
          ? "program"
          : "writer";
    // A durable project per claim keeps resumed Eve sessions bound to their original assignment.
    const jobRoot = resolve(stateDir, "jobs", job.token);
    await mkdir(resolve(jobRoot, "agent", "tools"), { recursive: true });
    await mkdir(resolve(jobRoot, "agent", "channels"), { recursive: true });
    const writeOnce = async (path, content) => {
      try {
        await writeFile(path, content, { flag: "wx", mode: 0o600 });
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
      }
    };
    await writeOnce(
      resolve(jobRoot, "package.json"),
      JSON.stringify({
        name: "pookie-editorial-job",
        private: true,
        type: "module",
        dependencies: { eve: "0.57.0" },
      }),
    );
    const roleRoot = resolve(root, "roles", role, "agent");
    await writeOnce(
      resolve(jobRoot, "agent", "agent.ts"),
      `export { default } from ${JSON.stringify(resolve(roleRoot, "agent.ts"))};`,
    );
    await writeOnce(
      resolve(jobRoot, "agent", "instructions.md"),
      await readFile(resolve(roleRoot, "instructions.md"), "utf8"),
    );
    for (const tool of [
      "get_context",
      "fetch_source",
      role === "reviewer" ? "record_review" : "save_draft",
    ])
      await writeOnce(
        resolve(jobRoot, "agent", "tools", `${tool}.ts`),
        `export { default } from ${JSON.stringify(resolve(roleRoot, "tools", `${tool}.ts`))};`,
      );
    await writeOnce(
      resolve(jobRoot, "agent", "channels", "eve.ts"),
      `export { default } from ${JSON.stringify(resolve(roleRoot, "channels", "eve.ts"))};`,
    );
    const localSecret = randomUUID();
    const env = {
      ...process.env,
      NODE_ENV: "development",
      POOKIE_LOCAL_EDITOR: "1",
      POOKIE_EDITOR_LOCAL_SECRET: localSecret,
      POOKIE_JOB_ID: job.runId,
      POOKIE_JOB_TOKEN: job.token,
      POOKIE_EDITOR_PREVIEW: preview ? "1" : "0",
      EVE_TRACES_CONTENT: "off",
    };
    for (const key of [
      "OPENAI_API_KEY",
      "AI_GATEWAY_API_KEY",
      "ANTHROPIC_API_KEY",
      "VERCEL",
      "VERCEL_OIDC_TOKEN",
    ])
      env[key] = "";
    const port = preview ? 3043 : 3042;
    const local = `http://127.0.0.1:${port}`;
    const logPath = resolve(stateDir, `${role}-${job.token}.log`);
    const log = await import("node:fs").then((fs) =>
      fs.openSync(logPath, "a", 0o600),
    );
    child = spawn(
      process.env.POOKIE_NODE_BINARY || process.execPath,
      [
        resolve(root, "node_modules/eve/bin/eve.js"),
        "dev",
        "--no-ui",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { cwd: jobRoot, env, stdio: ["ignore", log, log] },
    );
    await import("node:fs").then((fs) => fs.closeSync(log));
    let healthy = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if (child.exitCode !== null)
        throw new Error(`Eve ${role} did not start. Inspect its local log.`);
      try {
        healthy = (
          await fetch(`${local}/eve/v1/health`, {
            signal: AbortSignal.timeout(1000),
          })
        ).ok;
      } catch {
        /* starting */
      }
      if (healthy) break;
      await sleep(500);
    }
    if (!healthy) throw new Error("Local Eve did not become ready.");
    // Persist dispatch intent first. Eve's operationId and cloud binding recover uncertain responses.
    job.phase = "dispatching";
    await saveJournal(job);
    if (!job.sessionId) {
      const response = await fetch(`${local}/eve/v1/session`, {
        method: "POST",
        signal: AbortSignal.timeout(25000),
        headers: {
          Authorization: `Bearer ${localSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operationId: job.token,
          message: `${role === "reviewer" ? "Independently review" : "Prepare"} the ${job.kind} for ${job.editionId}. Call get_context first, follow your role instructions, save the required decision, and stop.`,
        }),
      });
      if (!response.ok)
        throw new Error(
          "Eve dispatch was not confirmed. The journal is retained for recovery.",
        );
      const result = await response.json();
      job.sessionId = result.sessionId;
      await saveJournal(job);
    }
    const eve = new Client({
      host: local,
      auth: { bearer: localSecret },
      redirect: "error",
    });
    console.log(`${job.editionId}: ${role} started (${job.kind}).`);
    let settled = false;
    let settledStatus = "";
    let failure = "";
    for (let poll = 0; poll < 240; poll++) {
      await sleep(5000);
      const state = await bridge("claim", job);
      if (!state) {
        failure = "Editorial work was paused by the owner.";
        break;
      }
      if (state.status !== "writing" && state.status !== "reviewing") {
        settled = true;
        settledStatus = state.status;
        console.log(`${job.editionId}: ${job.kind} → ${state.status}.`);
        break;
      }
      if (child.exitCode !== null) break;
      const logText = (await readFile(logPath, "utf8")).slice(-16000);
      if (
        /failed terminally|DynamicModelSelectionError|usage_limit_reached|insufficient_quota|rate_limit_exceeded|authentication_error|invalid_api_key|model_not_found/.test(
          logText,
        )
      ) {
        failure =
          "ChatGPT sign-in, model access, or membership allowance needs attention. There is no paid fallback.";
        break;
      }
      if (poll % 2 === 1) {
        const snapshot = await eve.sessions
          .attach(job.sessionId)
          .snapshot({ signal: AbortSignal.timeout(10000) });
        if (
          snapshot.events.some((event) =>
            [
              "session.failed",
              "session.completed",
              "session.waiting",
              "authorization.required",
            ].includes(event.type),
          )
        ) {
          const latest = await bridge("claim", job);
          if (latest && !["writing", "reviewing"].includes(latest.status)) {
            settled = true;
            settledStatus = latest.status;
            break;
          }
          failure =
            "Eve stopped without saving a valid draft or review. Inspect the local session and retry the failed job; no content was published.";
          break;
        }
      }
      // A bound session after an uncertain create is the canonical receipt.
      if (state.sessionId && state.sessionId !== job.sessionId) {
        job.sessionId = state.sessionId;
        await saveJournal(job);
      }
    }
    await stopChild();
    if (!settled) {
      await bridge("fail", job, {
        data:
          failure ||
          "Eve did not produce a confirmed saved result. Inspect the local run; sign-in or membership allowance may need attention. No API fallback was used.",
      });
      throw new Error(
        "Editorial run stopped without a saved result. No content was published. The job is visible in the owner page.",
      );
    }
    await rm(journalPath, { force: true });
    if (settledStatus === "failed")
      throw new Error(
        "The review revision limit was reached. The owner page has the saved feedback; no unapproved content was scheduled.",
      );
  }
  const activation = await bridge("activate");
  console.log(
    activation.enabled
      ? "The first two editions passed review. Scheduled publishing is enabled."
      : "Publishing remains gated until both pieces for the next two weeks pass independent review.",
  );
} finally {
  await stopChild();
  await rm(lock, { recursive: true, force: true });
}
