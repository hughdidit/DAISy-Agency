#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateOpenClawReadonlyLauncher } from "../../openclaw-readonly/scripts/openclaw-readonly.mjs";

const ALLOWED_OPENCLAW_DOCTOR_READONLY_ARGS = [
  ["triage"],
  ["status"],
  ["sandbox", "explain"],
  ["skills", "list"],
  ["skills", "check"],
];

const TRIAGE_COMMANDS = [
  ["status"],
  ["sandbox", "explain"],
  ["skills", "list"],
  ["skills", "check"],
];

function formatCommand(args) {
  return `openclaw-readonly ${args.join(" ")}`;
}

function writeOutput(stream, text) {
  if (!text) {
    return;
  }
  stream.write(text);
  if (!text.endsWith("\n")) {
    stream.write("\n");
  }
}

function validateAllowedArgs(args) {
  const normalized = args.map((value) => value.trim()).filter(Boolean);
  const allowed = ALLOWED_OPENCLAW_DOCTOR_READONLY_ARGS.some(
    (entry) =>
      entry.length === normalized.length &&
      entry.every((part, index) => part === normalized[index]),
  );
  if (!allowed) {
    throw new Error(
      `Unsupported openclaw-doctor readonly launcher command: ${
        normalized.join(" ") || "(none)"
      }. Allowed commands: triage | status | sandbox explain | skills list | skills check.`,
    );
  }
  return normalized;
}

function runReadonlyCommand(args, params = {}, deps = {}) {
  const env = params.env ?? process.env;
  const validated = validateOpenClawReadonlyLauncher({
    env,
    args,
    pathExists: deps.pathExists,
    binaryPath: deps.binaryPath,
    platform: deps.platform,
  });
  const spawnSyncImpl = deps.spawnSyncImpl ?? spawnSync;
  const result = spawnSyncImpl(validated.binaryPath, validated.args, {
    env,
    encoding: "utf8",
  });
  if (result.error) {
    throw result.error;
  }
  return {
    status: result.status ?? 1,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
  };
}

export function validateOpenClawDoctorReadonlyLauncher(params = {}) {
  const args = validateAllowedArgs(params.args ?? process.argv.slice(2));
  if (args.length === 1 && args[0] === "triage") {
    return { args, mode: "triage" };
  }
  validateOpenClawReadonlyLauncher({
    env: params.env ?? process.env,
    args,
    pathExists: params.pathExists,
    binaryPath: params.binaryPath,
    platform: params.platform,
  });
  return { args, mode: "single" };
}

export function runOpenClawDoctorReadonlyLauncher(params = {}, deps = {}) {
  const env = params.env ?? process.env;
  const validated = validateOpenClawDoctorReadonlyLauncher({
    env,
    args: params.args ?? process.argv.slice(2),
    pathExists: deps.pathExists,
    binaryPath: deps.binaryPath,
    platform: deps.platform,
  });

  if (validated.mode === "single") {
    const result = runReadonlyCommand(validated.args, { env }, deps);
    writeOutput(process.stdout, result.stdout);
    writeOutput(process.stderr, result.stderr);
    return result.status;
  }

  for (const commandArgs of TRIAGE_COMMANDS) {
    writeOutput(process.stdout, `== ${formatCommand(commandArgs)} ==`);
    const result = runReadonlyCommand(commandArgs, { env }, deps);
    writeOutput(process.stdout, result.stdout);
    writeOutput(process.stderr, result.stderr);
    if (result.status !== 0) {
      throw new Error(
        `${formatCommand(commandArgs)} failed with exit ${result.status}. Triage stopped before running additional checks.`,
      );
    }
  }

  return 0;
}

const mainPath = fileURLToPath(import.meta.url);
const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (argv1 && argv1 === mainPath) {
  try {
    process.exit(runOpenClawDoctorReadonlyLauncher());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
