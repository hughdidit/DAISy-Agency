#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);
const env = { ...process.env };
const cwd = process.cwd();
<<<<<<< HEAD
const compiler = env.OPENCLAW_TS_COMPILER === "tsc" ? "tsc" : "tsgo";
const projectArgs = ["--project", "tsconfig.json"];
=======
const compiler = "tsdown";
>>>>>>> a03d852d6 (chore: Migrate to tsdown, speed up JS bundling by ~10x (thanks @hyf0).)

const initialBuild = spawnSync("pnpm", ["exec", compiler], {
  cwd,
  env,
  stdio: "inherit",
});

if (initialBuild.status !== 0) {
  process.exit(initialBuild.status ?? 1);
}

<<<<<<< HEAD
<<<<<<< HEAD
const watchArgs =
  compiler === "tsc"
    ? [...projectArgs, "--watch", "--preserveWatchOutput"]
    : [...projectArgs, "--watch"];

const compilerProcess = spawn("pnpm", ["exec", compiler, ...watchArgs], {
=======
const compilerProcess = spawn("pnpm", ["tsc", '-p', 'tsconfig.json', '--noEmit', 'false', '--watch'], {
>>>>>>> 76361ae3a (revert: Switch back to `tsc` for compiling.)
=======
const compilerProcess = spawn("pnpm", ["exec", compiler, "--watch"], {
>>>>>>> a03d852d6 (chore: Migrate to tsdown, speed up JS bundling by ~10x (thanks @hyf0).)
  cwd,
  env,
  stdio: "inherit",
});

const nodeProcess = spawn(process.execPath, ["--watch", "openclaw.mjs", ...args], {
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
