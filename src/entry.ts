#!/usr/bin/env node
import { spawn } from "node:child_process";
import { enableCompileCache } from "node:module";
import process from "node:process";

=======
import { isRootHelpInvocation, isRootVersionInvocation } from "./cli/argv.js";
>>>>>>> 38da2d076 (CLI: add root --help fast path and lazy channel option resolution (#30975))
import { applyCliProfileEnv, parseCliProfileArgs } from "./cli/profile.js";
<<<<<<< HEAD
import { isTruthyEnvValue } from "./infra/env.js";
import { installProcessWarningFilter } from "./infra/warnings.js";
=======
import { normalizeWindowsArgv } from "./cli/windows-argv.js";
>>>>>>> d1f36bfd8 (refactor(cli): share windows argv normalization)
import { isTruthyEnvValue, normalizeEnv } from "./infra/env.js";
import { installProcessWarningFilter } from "./infra/warning-filter.js";
>>>>>>> a1123dd9b (Centralize date/time formatting utilities (#11831))
import { attachChildProcessBridge } from "./process/child-process-bridge.js";

process.title = "moltbot";
installProcessWarningFilter();
=======
  if (!isTruthyEnvValue(process.env.NODE_DISABLE_COMPILE_CACHE)) {
    try {
      enableCompileCache();
    } catch {
      // Best-effort only; never block startup.
    }
  }
>>>>>>> 8c4071f36 (Entry: enable Node compile cache on startup)

if (process.argv.includes("--no-color")) {
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";
}

const EXPERIMENTAL_WARNING_FLAG = "--disable-warning=ExperimentalWarning";

function hasExperimentalWarningSuppressed(): boolean {
  const nodeOptions = process.env.NODE_OPTIONS ?? "";
  if (nodeOptions.includes(EXPERIMENTAL_WARNING_FLAG) || nodeOptions.includes("--no-warnings")) {
    return true;
  }
  for (const arg of process.execArgv) {
    if (arg === EXPERIMENTAL_WARNING_FLAG || arg === "--no-warnings") {
      return true;
    }
  }
  return false;
}

function ensureExperimentalWarningSuppressed(): boolean {
<<<<<<< HEAD
  if (isTruthyEnvValue(process.env.CLAWDBOT_NO_RESPAWN)) return false;
  if (isTruthyEnvValue(process.env.CLAWDBOT_NODE_OPTIONS_READY)) return false;
  if (isTruthyEnvValue(process.env.OPENCLAW_NO_RESPAWN)) {
    return false;
  }
  if (isTruthyEnvValue(process.env.OPENCLAW_NODE_OPTIONS_READY)) {
    return false;
  }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
  const nodeOptions = process.env.NODE_OPTIONS ?? "";
  if (hasExperimentalWarningSuppressed(nodeOptions)) {
    return false;
  }

  process.env.CLAWDBOT_NODE_OPTIONS_READY = "1";
  process.env.NODE_OPTIONS = `${nodeOptions} ${EXPERIMENTAL_WARNING_FLAG}`.trim();

  const child = spawn(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: "inherit",
    env: process.env,
  });

  attachChildProcessBridge(child);

  child.once("exit", (code, signal) => {
    if (signal) {
      process.exitCode = 1;
      return;
    }
    process.exit(code ?? 1);
  });

  child.once("error", (error) => {
    console.error(
      "[moltbot] Failed to respawn CLI:",
      error instanceof Error ? (error.stack ?? error.message) : error,
    );
    process.exit(1);
  });

  // Parent must not continue running the CLI.
  return true;
}

process.argv = normalizeWindowsArgv(process.argv);

if (!ensureExperimentalWarningSuppressed()) {
  const parsed = parseCliProfileArgs(process.argv);
  if (!parsed.ok) {
    // Keep it simple; Commander will handle rich help/errors after we strip flags.
    console.error(`[moltbot] ${parsed.error}`);
    process.exit(2);
  }

  if (parsed.profile) {
    applyCliProfileEnv({ profile: parsed.profile });
    // Keep Commander and ad-hoc argv checks consistent.
    process.argv = parsed.argv;
  }

  import("./cli/run-main.js")
    .then(({ runCli }) => runCli(process.argv))
    .catch((error) => {
      console.error(
        "[moltbot] Failed to start CLI:",
        error instanceof Error ? (error.stack ?? error.message) : error,
      );
      process.exitCode = 1;
    });

    // Parent must not continue running the CLI.
    return true;
  }

  function tryHandleRootVersionFastPath(argv: string[]): boolean {
    if (!isRootVersionInvocation(argv)) {
      return false;
    }
    import("./version.js")
      .then(({ VERSION }) => {
        console.log(VERSION);
      })
      .catch((error) => {
        console.error(
          "[openclaw] Failed to resolve version:",
          error instanceof Error ? (error.stack ?? error.message) : error,
        );
        process.exitCode = 1;
      });
    return true;
  }

  function tryHandleRootHelpFastPath(argv: string[]): boolean {
    if (!isRootHelpInvocation(argv)) {
      return false;
    }
    import("./cli/program.js")
      .then(({ buildProgram }) => {
        buildProgram().outputHelp();
      })
      .catch((error) => {
        console.error(
          "[openclaw] Failed to display help:",
          error instanceof Error ? (error.stack ?? error.message) : error,
        );
        process.exitCode = 1;
      });
    return true;
  }

  process.argv = normalizeWindowsArgv(process.argv);

  if (!ensureExperimentalWarningSuppressed()) {
    const parsed = parseCliProfileArgs(process.argv);
    if (!parsed.ok) {
      // Keep it simple; Commander will handle rich help/errors after we strip flags.
      console.error(`[openclaw] ${parsed.error}`);
      process.exit(2);
    }

    if (parsed.profile) {
      applyCliProfileEnv({ profile: parsed.profile });
      // Keep Commander and ad-hoc argv checks consistent.
      process.argv = parsed.argv;
    }

    if (!tryHandleRootVersionFastPath(process.argv) && !tryHandleRootHelpFastPath(process.argv)) {
      import("./cli/run-main.js")
        .then(({ runCli }) => runCli(process.argv))
        .catch((error) => {
          console.error(
            "[openclaw] Failed to start CLI:",
            error instanceof Error ? (error.stack ?? error.message) : error,
          );
          process.exitCode = 1;
        });
    }
  }
}
