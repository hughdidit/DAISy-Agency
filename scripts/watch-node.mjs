#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);
const env = { ...process.env };
const cwd = process.cwd();
<<<<<<< HEAD
<<<<<<< HEAD
const compiler = env.CLAWDBOT_TS_COMPILER === "tsc" ? "tsc" : "tsgo";
const projectArgs = ["--project", "tsconfig.json"];
=======
>>>>>>> 68ba1afb3 (fix: Fix `scripts/watch-node.mjs` and use `tsdown --watch`.)
=======
const compilerOverride = env.OPENCLAW_TS_COMPILER ?? env.CLAWDBOT_TS_COMPILER;
const compiler = compilerOverride === "tsc" ? "tsc" : "tsgo";
const projectArgs = ["--project", "tsconfig.json"];
>>>>>>> dae00fe18 (fix: Update `CONTRIBUTING.md` + adjust `watch-node.mjs` again to be faster with `tsc`.)

const initialBuild = spawnSync("pnpm", ["exec", compiler, ...projectArgs], {
  cwd,
  env,
  stdio: "inherit",
});

if (initialBuild.status !== 0) {
  process.exit(initialBuild.status ?? 1);
}

<<<<<<< HEAD
const compilerProcess = spawn("pnpm", ["tsdown", '--watch', 'src/'], {
=======
const watchArgs =
  compiler === "tsc"
    ? [...projectArgs, "--watch", "--preserveWatchOutput"]
    : [...projectArgs, "--watch"];

const compilerProcess = spawn("pnpm", ["exec", compiler, ...watchArgs], {
>>>>>>> dae00fe18 (fix: Update `CONTRIBUTING.md` + adjust `watch-node.mjs` again to be faster with `tsc`.)
  cwd,
  env,
  stdio: "inherit",
});

<<<<<<< HEAD
<<<<<<< HEAD
const nodeProcess = spawn(process.execPath, ["--watch", "moltbot.mjs", ...args], {
=======
const nodeProcess = spawn(process.execPath, ["--watch", "openclaw.mjs", ...args], {
>>>>>>> dae00fe18 (fix: Update `CONTRIBUTING.md` + adjust `watch-node.mjs` again to be faster with `tsc`.)
  cwd,
  env,
  stdio: "inherit",
});
<<<<<<< HEAD
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
=======
>>>>>>> dae00fe18 (fix: Update `CONTRIBUTING.md` + adjust `watch-node.mjs` again to be faster with `tsc`.)

let exiting = false;

function cleanup(code = 0) {
  if (exiting) {
    return;
  }
  exiting = true;
  nodeProcess.kill("SIGTERM");
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

nodeProcess.on("exit", (code, signal) => {
  if (signal || exiting) {
    return;
  }
  cleanup(code ?? 1);
});
