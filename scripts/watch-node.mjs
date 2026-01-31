#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);
const env = { ...process.env };
const cwd = process.cwd();
<<<<<<< HEAD
const compiler = env.CLAWDBOT_TS_COMPILER === "tsc" ? "tsc" : "tsgo";
const projectArgs = ["--project", "tsconfig.json"];
=======
>>>>>>> 68ba1afb3 (fix: Fix `scripts/watch-node.mjs` and use `tsdown --watch`.)

const initialBuild = spawnSync("pnpm", ["build"], {
  cwd,
  env,
  stdio: "inherit",
});

if (initialBuild.status !== 0) {
  process.exit(initialBuild.status ?? 1);
}

const compilerProcess = spawn("pnpm", ["tsdown", '--watch', 'src/'], {
  cwd,
  env,
  stdio: "inherit",
});

<<<<<<< HEAD
const nodeProcess = spawn(process.execPath, ["--watch", "moltbot.mjs", ...args], {
  cwd,
  env,
  stdio: "inherit",
});
=======
let nodeProcess = null;
let restartTimer = null;

function spawnNode() {
  nodeProcess = spawn(process.execPath, ["--watch", "openclaw.mjs", ...args], {
    cwd,
    env,
    stdio: "inherit",
  });

  nodeProcess.on("exit", (code, signal) => {
    if (signal || exiting) {
      return;
    }
    // If the build is mid-refresh, node can exit on missing modules. Retry.
    if (restartTimer) {
      clearTimeout(restartTimer);
    }
    restartTimer = setTimeout(() => {
      restartTimer = null;
      spawnNode();
    }, 250);
  });
}

spawnNode();
>>>>>>> e25fedf93 (fix: retry gateway watch after dist rebuild)

let exiting = false;

function cleanup(code = 0) {
  if (exiting) {
    return;
  }
  exiting = true;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  nodeProcess?.kill("SIGTERM");
  compilerProcess.kill("SIGTERM");
  process.exit(code);
}

process.on("SIGINT", () => cleanup(130));
process.on("SIGTERM", () => cleanup(143));

compilerProcess.on("exit", (code) => {
  if (exiting) {
    return;
  }
  cleanup(code ?? 1);
});
