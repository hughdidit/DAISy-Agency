import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const runs = [
  {
    name: "unit",
    args: ["vitest", "run", "--config", "vitest.unit.config.ts"],
  },
  {
    name: "extensions",
    args: ["vitest", "run", "--config", "vitest.extensions.config.ts"],
  },
  {
    name: "gateway",
    args: ["vitest", "run", "--config", "vitest.gateway.config.ts"],
  },
];

const children = new Set();
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const isMacOS = process.platform === "darwin" || process.env.RUNNER_OS === "macOS";
const isWindows = process.platform === "win32" || process.env.RUNNER_OS === "Windows";
const isWindowsCi = isCI && isWindows;
<<<<<<< HEAD
const shardOverride = Number.parseInt(process.env.CLAWDBOT_TEST_SHARDS ?? "", 10);
const shardCount = isWindowsCi ? (Number.isFinite(shardOverride) && shardOverride > 1 ? shardOverride : 2) : 1;
const windowsCiArgs = isWindowsCi ? ["--no-file-parallelism", "--dangerouslyIgnoreUnhandledErrors"] : [];
const overrideWorkers = Number.parseInt(process.env.CLAWDBOT_TEST_WORKERS ?? "", 10);
const resolvedOverride = Number.isFinite(overrideWorkers) && overrideWorkers > 0 ? overrideWorkers : null;
const parallelRuns = isWindowsCi ? [] : runs.filter((entry) => entry.name !== "gateway");
const serialRuns = isWindowsCi ? runs : runs.filter((entry) => entry.name === "gateway");
=======
const shardOverride = Number.parseInt(process.env.OPENCLAW_TEST_SHARDS ?? "", 10);
const configuredShardCount =
  Number.isFinite(shardOverride) && shardOverride > 1 ? shardOverride : null;
const shardCount = configuredShardCount ?? (isWindowsCi ? 2 : 1);
const shardIndexOverride = (() => {
  const parsed = Number.parseInt(process.env.OPENCLAW_TEST_SHARD_INDEX ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
})();

if (shardIndexOverride !== null && shardCount <= 1) {
  console.error(
    `[test-parallel] OPENCLAW_TEST_SHARD_INDEX=${String(
      shardIndexOverride,
    )} requires OPENCLAW_TEST_SHARDS>1.`,
  );
  process.exit(2);
}

if (shardIndexOverride !== null && shardIndexOverride > shardCount) {
  console.error(
    `[test-parallel] OPENCLAW_TEST_SHARD_INDEX=${String(
      shardIndexOverride,
    )} exceeds OPENCLAW_TEST_SHARDS=${String(shardCount)}.`,
  );
  process.exit(2);
}
const windowsCiArgs = isWindowsCi ? ["--dangerouslyIgnoreUnhandledErrors"] : [];
const passthroughArgs = process.argv.slice(2);
const overrideWorkers = Number.parseInt(process.env.OPENCLAW_TEST_WORKERS ?? "", 10);
const resolvedOverride =
  Number.isFinite(overrideWorkers) && overrideWorkers > 0 ? overrideWorkers : null;
const parallelRuns = runs.filter((entry) => entry.name !== "gateway");
const serialRuns = runs.filter((entry) => entry.name === "gateway");
>>>>>>> 2d7428a7f (ci: re-enable parallel vitest on Windows CI)
const localWorkers = Math.max(4, Math.min(16, os.cpus().length));
const parallelCount = Math.max(1, parallelRuns.length);
const perRunWorkers = Math.max(1, Math.floor(localWorkers / parallelCount));
const macCiWorkers = isCI && isMacOS ? 1 : perRunWorkers;
// Keep worker counts predictable for local runs; trim macOS CI workers to avoid worker crashes/OOM.
// In CI on linux/windows, prefer Vitest defaults to avoid cross-test interference from lower worker counts.
const maxWorkers = resolvedOverride ?? (isCI && !isMacOS ? null : macCiWorkers);

const WARNING_SUPPRESSION_FLAGS = [
  "--disable-warning=ExperimentalWarning",
  "--disable-warning=DEP0040",
  "--disable-warning=DEP0060",
];

<<<<<<< HEAD
function resolveReportDir() {
  const raw = process.env.OPENCLAW_VITEST_REPORT_DIR?.trim();
  if (!raw) {
    return null;
  }
  try {
    fs.mkdirSync(raw, { recursive: true });
  } catch {
    return null;
  }
  return raw;
}

function buildReporterArgs(entry, extraArgs) {
  const reportDir = resolveReportDir();
  if (!reportDir) {
    return [];
  }

  // Vitest supports both `--shard 1/2` and `--shard=1/2`. We use it in the
  // split-arg form, so we need to read the next arg to avoid overwriting reports.
  const shardIndex = extraArgs.findIndex((arg) => arg === "--shard");
  const inlineShardArg = extraArgs.find(
    (arg) => typeof arg === "string" && arg.startsWith("--shard="),
  );
  const shardValue =
    shardIndex >= 0 && typeof extraArgs[shardIndex + 1] === "string"
      ? extraArgs[shardIndex + 1]
      : typeof inlineShardArg === "string"
        ? inlineShardArg.slice("--shard=".length)
        : "";
  const shardSuffix = shardValue
    ? `-shard${String(shardValue).replaceAll("/", "of").replaceAll(" ", "")}`
    : "";

  const outputFile = path.join(reportDir, `vitest-${entry.name}${shardSuffix}.json`);
  return ["--reporter=default", "--reporter=json", "--outputFile", outputFile];
}
=======
const DEFAULT_CI_MAX_OLD_SPACE_SIZE_MB = 4096;
const maxOldSpaceSizeMb = (() => {
  // CI can hit Node heap limits (especially on large suites). Allow override, default to 4GB.
  const raw = process.env.OPENCLAW_TEST_MAX_OLD_SPACE_SIZE_MB ?? "";
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  if (isCI && !isWindows) {
    return DEFAULT_CI_MAX_OLD_SPACE_SIZE_MB;
  }
  return null;
})();
>>>>>>> 94a5d28d2 (CI: remove Vitest JSON report artifacts (#30976))

const runOnce = (entry, extraArgs = []) =>
  new Promise((resolve) => {
<<<<<<< HEAD
=======
    const maxWorkers = maxWorkersForRun(entry.name);
<<<<<<< HEAD
    const reporterArgs = buildReporterArgs(entry, extraArgs);
>>>>>>> 8fce7dc9b (perf(test): add vitest slowest report artifact)
=======
    // vmForks with a single worker has shown cross-file leakage in extension suites.
    // Fall back to process forks when we intentionally clamp that lane to one worker.
    const entryArgs =
      entry.name === "extensions" && maxWorkers === 1 && entry.args.includes("--pool=vmForks")
        ? entry.args.map((arg) => (arg === "--pool=vmForks" ? "--pool=forks" : arg))
        : entry.args;
>>>>>>> 94a5d28d2 (CI: remove Vitest JSON report artifacts (#30976))
    const args = maxWorkers
      ? [
          ...entry.args,
          "--maxWorkers",
          String(maxWorkers),
<<<<<<< HEAD
          ...reporterArgs,
          ...windowsCiArgs,
          ...extraArgs,
        ]
      : [...entry.args, ...reporterArgs, ...windowsCiArgs, ...extraArgs];
=======
          ...silentArgs,
          ...windowsCiArgs,
          ...extraArgs,
        ]
      : [...entryArgs, ...silentArgs, ...windowsCiArgs, ...extraArgs];
>>>>>>> 94a5d28d2 (CI: remove Vitest JSON report artifacts (#30976))
    const nodeOptions = process.env.NODE_OPTIONS ?? "";
    const nextNodeOptions = WARNING_SUPPRESSION_FLAGS.reduce(
      (acc, flag) => (acc.includes(flag) ? acc : `${acc} ${flag}`.trim()),
      nodeOptions,
    );
    const child = spawn(pnpm, args, {
      stdio: "inherit",
      env: { ...process.env, VITEST_GROUP: entry.name, NODE_OPTIONS: nextNodeOptions },
      shell: process.platform === "win32",
    });
    children.add(child);
    child.on("exit", (code, signal) => {
      children.delete(child);
      resolve(code ?? (signal ? 1 : 0));
    });
  });

const run = async (entry) => {
<<<<<<< HEAD
  if (shardCount <= 1) return runOnce(entry);
=======
  if (shardCount <= 1) {
    return runOnce(entry);
  }
  if (shardIndexOverride !== null) {
    return runOnce(entry, ["--shard", `${shardIndexOverride}/${shardCount}`]);
  }
>>>>>>> 72adf2458 (CI: shard Windows test lane for faster CI critical path (#27234))
  for (let shardIndex = 1; shardIndex <= shardCount; shardIndex += 1) {
    // eslint-disable-next-line no-await-in-loop
    const code = await runOnce(entry, ["--shard", `${shardIndex}/${shardCount}`]);
    if (code !== 0) return code;
  }
  return 0;
};

const shutdown = (signal) => {
  for (const child of children) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

<<<<<<< HEAD
=======
if (passthroughArgs.length > 0) {
  const maxWorkers = maxWorkersForRun("unit");
  const args = maxWorkers
    ? ["vitest", "run", "--maxWorkers", String(maxWorkers), ...windowsCiArgs, ...passthroughArgs]
    : ["vitest", "run", ...windowsCiArgs, ...passthroughArgs];
  const nodeOptions = process.env.NODE_OPTIONS ?? "";
  const nextNodeOptions = WARNING_SUPPRESSION_FLAGS.reduce(
    (acc, flag) => (acc.includes(flag) ? acc : `${acc} ${flag}`.trim()),
    nodeOptions,
  );
  const code = await new Promise((resolve) => {
    const child = spawn(pnpm, args, {
      stdio: "inherit",
      env: { ...process.env, NODE_OPTIONS: nextNodeOptions },
      shell: process.platform === "win32",
    });
    children.add(child);
    child.on("exit", (exitCode, signal) => {
      children.delete(child);
      resolve(exitCode ?? (signal ? 1 : 0));
    });
  });
  process.exit(Number(code) || 0);
}

>>>>>>> 8fce7dc9b (perf(test): add vitest slowest report artifact)
const parallelCodes = await Promise.all(parallelRuns.map(run));
const failedParallel = parallelCodes.find((code) => code !== 0);
if (failedParallel !== undefined) {
  process.exit(failedParallel);
}

for (const entry of serialRuns) {
  // eslint-disable-next-line no-await-in-loop
  const code = await run(entry);
  if (code !== 0) {
    process.exit(code);
  }
}

process.exit(0);
