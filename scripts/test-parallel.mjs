import { spawn } from "node:child_process";
import os from "node:os";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

<<<<<<< HEAD
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
=======
const unitIsolatedFiles = [
  "src/plugins/loader.test.ts",
  "src/plugins/tools.optional.test.ts",
  "src/agents/session-tool-result-guard.tool-result-persist-hook.test.ts",
  "src/security/fix.test.ts",
  "src/security/audit.test.ts",
  "src/utils.test.ts",
  "src/auto-reply/tool-meta.test.ts",
  "src/auto-reply/envelope.test.ts",
  "src/commands/auth-choice.test.ts",
<<<<<<< HEAD
=======
  // Process supervision + docker setup suites are stable but setup-heavy.
  "src/process/supervisor/supervisor.test.ts",
  "src/docker-setup.test.ts",
  // Filesystem-heavy skills sync suite.
  "src/agents/skills.build-workspace-skills-prompt.syncs-merged-skills-into-target-workspace.test.ts",
  // Real git hook integration test; keep signal, move off unit-fast critical path.
  "test/git-hooks-pre-commit.test.ts",
  // Setup-heavy doctor command suites; keep them off the unit-fast critical path.
  "src/commands/doctor.warns-state-directory-is-missing.test.ts",
  "src/commands/doctor.warns-per-agent-sandbox-docker-browser-prune.test.ts",
  "src/commands/doctor.runs-legacy-state-migrations-yes-mode-without.test.ts",
  // Setup-heavy CLI update flow suite; move off unit-fast critical path.
  "src/cli/update-cli.test.ts",
  // Expensive schema build/bootstrap checks; keep coverage but run in isolated lane.
  "src/config/schema.test.ts",
  "src/config/schema.tags.test.ts",
  // CLI smoke/agent flows are stable but setup-heavy.
  "src/cli/program.smoke.test.ts",
  "src/commands/agent.test.ts",
  "src/media/store.test.ts",
>>>>>>> 31f2bf951 (test: fix gate regressions)
  "src/media/store.header-ext.test.ts",
  "src/browser/server.covers-additional-endpoint-branches.test.ts",
  "src/browser/server.post-tabs-open-profile-unknown-returns-404.test.ts",
  "src/browser/server.agent-contract-snapshot-endpoints.test.ts",
  "src/browser/server.agent-contract-form-layout-act-commands.test.ts",
  "src/browser/server.serves-status-starts-browser-requested.test.ts",
  "src/browser/server.skips-default-maxchars-explicitly-set-zero.test.ts",
  "src/browser/server.auth-token-gates-http.test.ts",
  "src/browser/server-context.remote-tab-ops.test.ts",
  "src/browser/server-context.ensure-tab-available.prefers-last-target.test.ts",
>>>>>>> 78ec0a1ed (fix: stabilize test runner and daemon-cli compat)
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
=======
const shardOverride = Number.parseInt(process.env.OPENCLAW_TEST_SHARDS ?? "", 10);
const shardCount = isWindowsCi
  ? Number.isFinite(shardOverride) && shardOverride > 1
    ? shardOverride
    : 2
  : 1;
<<<<<<< HEAD
const windowsCiArgs = isWindowsCi
  ? ["--no-file-parallelism", "--dangerouslyIgnoreUnhandledErrors"]
  : [];
const passthroughArgs = process.argv.slice(2);
=======
const windowsCiArgs = isWindowsCi ? ["--dangerouslyIgnoreUnhandledErrors"] : [];
const rawPassthroughArgs = process.argv.slice(2);
const passthroughArgs =
  rawPassthroughArgs[0] === "--" ? rawPassthroughArgs.slice(1) : rawPassthroughArgs;
>>>>>>> 191da1feb (fix: context overflow compaction and subagent announce improvements (#11664) (thanks @tyler6204))
const overrideWorkers = Number.parseInt(process.env.OPENCLAW_TEST_WORKERS ?? "", 10);
const resolvedOverride =
  Number.isFinite(overrideWorkers) && overrideWorkers > 0 ? overrideWorkers : null;
<<<<<<< HEAD
>>>>>>> d90cac990 (fix: cron scheduler reliability, store hardening, and UX improvements (#10776))
const parallelRuns = isWindowsCi ? [] : runs.filter((entry) => entry.name !== "gateway");
const serialRuns = isWindowsCi ? runs : runs.filter((entry) => entry.name === "gateway");
const localWorkers = Math.max(4, Math.min(16, os.cpus().length));
const parallelCount = Math.max(1, parallelRuns.length);
const perRunWorkers = Math.max(1, Math.floor(localWorkers / parallelCount));
const macCiWorkers = isCI && isMacOS ? 1 : perRunWorkers;
=======
const hostCpuCount = os.cpus().length;
const hostMemoryGiB = Math.floor(os.totalmem() / 1024 ** 3);
// Keep aggressive local defaults for high-memory workstations (Mac Studio class).
const highMemLocalHost = !isCI && hostMemoryGiB >= 96;
const lowMemLocalHost = !isCI && hostMemoryGiB < 64;
const parallelGatewayEnabled =
  process.env.OPENCLAW_TEST_PARALLEL_GATEWAY === "1" || (!isCI && highMemLocalHost);
// Keep gateway serial by default except when explicitly requested or on high-memory local hosts.
const keepGatewaySerial =
  isWindowsCi ||
  process.env.OPENCLAW_TEST_SERIAL_GATEWAY === "1" ||
  testProfile === "serial" ||
  !parallelGatewayEnabled;
const parallelRuns = keepGatewaySerial ? runs.filter((entry) => entry.name !== "gateway") : runs;
const serialRuns = keepGatewaySerial ? runs.filter((entry) => entry.name === "gateway") : [];
const baseLocalWorkers = Math.max(4, Math.min(16, hostCpuCount));
const loadAwareDisabledRaw = process.env.OPENCLAW_TEST_LOAD_AWARE?.trim().toLowerCase();
const loadAwareDisabled = loadAwareDisabledRaw === "0" || loadAwareDisabledRaw === "false";
const loadRatio =
  !isCI && !loadAwareDisabled && process.platform !== "win32" && hostCpuCount > 0
    ? os.loadavg()[0] / hostCpuCount
    : 0;
// Keep the fast-path unchanged on normal load; only throttle under extreme host pressure.
const extremeLoadScale = loadRatio >= 1.1 ? 0.75 : loadRatio >= 1 ? 0.85 : 1;
const localWorkers = Math.max(4, Math.min(16, Math.floor(baseLocalWorkers * extremeLoadScale)));
const defaultWorkerBudget =
  testProfile === "low"
    ? {
        unit: 2,
        unitIsolated: 1,
        extensions: 1,
        gateway: 1,
      }
    : testProfile === "serial"
      ? {
          unit: 1,
          unitIsolated: 1,
          extensions: 1,
          gateway: 1,
        }
      : testProfile === "max"
        ? {
            unit: localWorkers,
            unitIsolated: Math.min(4, localWorkers),
            extensions: Math.max(1, Math.min(6, Math.floor(localWorkers / 2))),
            gateway: Math.max(1, Math.min(2, Math.floor(localWorkers / 4))),
          }
        : highMemLocalHost
          ? {
              // High-memory local hosts can prioritize wall-clock speed.
              unit: Math.max(4, Math.min(14, Math.floor((localWorkers * 7) / 8))),
              unitIsolated: Math.max(1, Math.min(2, Math.floor(localWorkers / 6) || 1)),
              extensions: Math.max(1, Math.min(4, Math.floor(localWorkers / 4))),
              gateway: Math.max(2, Math.min(6, Math.floor(localWorkers / 2))),
            }
          : lowMemLocalHost
            ? {
                // Sub-64 GiB local hosts are prone to OOM with large vmFork runs.
                unit: 2,
                unitIsolated: 1,
                extensions: 1,
                gateway: 1,
              }
            : {
                // 64-95 GiB local hosts: conservative split with some parallel headroom.
                unit: Math.max(2, Math.min(8, Math.floor(localWorkers / 2))),
                unitIsolated: 1,
                extensions: Math.max(1, Math.min(4, Math.floor(localWorkers / 4))),
                gateway: 1,
              };

>>>>>>> 31f2bf951 (test: fix gate regressions)
// Keep worker counts predictable for local runs; trim macOS CI workers to avoid worker crashes/OOM.
// In CI on linux/windows, prefer Vitest defaults to avoid cross-test interference from lower worker counts.
const maxWorkers = resolvedOverride ?? (isCI && !isMacOS ? null : macCiWorkers);

const WARNING_SUPPRESSION_FLAGS = [
  "--disable-warning=ExperimentalWarning",
  "--disable-warning=DEP0040",
  "--disable-warning=DEP0060",
];

const runOnce = (entry, extraArgs = []) =>
  new Promise((resolve) => {
    const args = maxWorkers
      ? [...entry.args, "--maxWorkers", String(maxWorkers), ...windowsCiArgs, ...extraArgs]
      : [...entry.args, ...windowsCiArgs, ...extraArgs];
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
  if (shardCount <= 1) return runOnce(entry);
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

if (passthroughArgs.length > 0) {
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
