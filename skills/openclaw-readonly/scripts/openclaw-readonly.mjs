#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_OPENCLAW_READONLY_ARGS = [
  ["status"],
  ["sandbox", "explain"],
  ["skills", "list"],
  ["skills", "check"],
];

function resolveReadonlyProjectionRoot(env) {
  return env.OPENCLAW_READONLY_PROJECTION_ROOT?.trim() || path.posix.join("/workspace", ".openclaw-readonly");
}

function resolveReadonlyConfigPath(env) {
  return (
    env.OPENCLAW_READONLY_CONFIG_PATH?.trim() ||
    env.OPENCLAW_CONFIG_PATH?.trim() ||
    path.posix.join(resolveReadonlyProjectionRoot(env), "openclaw.json")
  );
}

function resolveReadonlyStateDir(env) {
  return (
    env.OPENCLAW_READONLY_STATE_DIR?.trim() ||
    env.OPENCLAW_STATE_DIR?.trim() ||
    path.posix.join(resolveReadonlyProjectionRoot(env), "state")
  );
}

function resolveReadonlyWorkspaceDir(env, pathExists) {
  const explicit = env.OPENCLAW_READONLY_WORKSPACE_DIR?.trim();
  if (explicit) {
    return explicit;
  }
  if (pathExists("/agent")) {
    return "/agent";
  }
  if (pathExists("/workspace")) {
    return "/workspace";
  }
  return undefined;
}

export function resolveOpenClawReadonlyBinary(params = {}) {
  const env = params.env ?? process.env;
  const platform = params.platform ?? process.platform;
  const pathDelimiter = platform === "win32" ? ";" : path.delimiter;
  const pathValue =
    params.pathValue ?? (platform === "win32" ? (env.Path ?? env.PATH) : env.PATH) ?? "";
  const pathext = platform === "win32" ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM") : "";
  const extensions =
    platform === "win32"
      ? pathext
          .split(";")
          .map((value) => value.trim())
          .filter(Boolean)
      : [""];

  for (const rawDir of pathValue.split(pathDelimiter)) {
    const dir = rawDir.trim();
    if (!dir) {
      continue;
    }
    for (const extension of extensions) {
      const candidate = path.join(dir, `openclaw-readonly${extension}`);
      try {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      } catch {
        // Keep scanning PATH entries.
      }
    }
  }

  return null;
}

export function validateOpenClawReadonlyLauncher(params = {}) {
  const env = params.env ?? process.env;
  const args = (params.args ?? process.argv.slice(2)).map((value) => value.trim()).filter(Boolean);
  const pathExists = params.pathExists ?? ((targetPath) => fs.existsSync(targetPath));
  const binaryPath =
    params.binaryPath ?? resolveOpenClawReadonlyBinary({ env, platform: params.platform });
  const commandAllowed = ALLOWED_OPENCLAW_READONLY_ARGS.some(
    (allowedArgs) =>
      allowedArgs.length === args.length &&
      allowedArgs.every((allowedArg, index) => allowedArg === args[index]),
  );

  if (!commandAllowed) {
    throw new Error(
      `Unsupported openclaw-readonly launcher command: ${args.join(" ") || "(none)"}. ` +
        "Allowed commands: status | sandbox explain | skills list | skills check.",
    );
  }

  if (!binaryPath) {
    throw new Error(
      'The sandbox runtime command "openclaw-readonly" is not on PATH. Rebuild the sandbox image so the readonly runtime wrapper is installed before using this skill.',
    );
  }

  const projectionRoot = resolveReadonlyProjectionRoot(env);
  const configPath = resolveReadonlyConfigPath(env);
  if (!pathExists(configPath)) {
    throw new Error(
      `Missing readonly config mount: ${configPath}. Set OPENCLAW_READONLY_CONFIG_PATH explicitly, keep OPENCLAW_CONFIG_PATH available in the sandbox, or let the sandbox project ${path.posix.join(projectionRoot, "openclaw.json")} before using this skill.`,
    );
  }

  const stateDir = resolveReadonlyStateDir(env);
  if (!pathExists(stateDir)) {
    throw new Error(
      `Missing readonly state mount: ${stateDir}. Set OPENCLAW_READONLY_STATE_DIR explicitly, keep OPENCLAW_STATE_DIR available in the sandbox, or let the sandbox project ${path.posix.join(projectionRoot, "state")} before using this skill.`,
    );
  }

  const needsWorkspace = args[0] === "skills" && (args[1] === "list" || args[1] === "check");
  const workspaceDir = resolveReadonlyWorkspaceDir(env, pathExists);
  if (needsWorkspace && !workspaceDir) {
    throw new Error(
      'Missing OPENCLAW_READONLY_WORKSPACE_DIR. Mount the sandbox-visible workspace (for example "/agent") or keep /workspace available before using skills diagnostics.',
    );
  }
  if (needsWorkspace && workspaceDir && !pathExists(workspaceDir)) {
    throw new Error(
      `Missing readonly workspace mount: ${workspaceDir}. Bind the sandbox-visible workspace read-only and keep OPENCLAW_READONLY_WORKSPACE_DIR pointed at that mount.`,
    );
  }

  return { binaryPath, args };
}

export function runOpenClawReadonlyLauncher(params = {}, deps = {}) {
  const env = params.env ?? process.env;
  const args = (params.args ?? process.argv.slice(2)).map((value) => value.trim()).filter(Boolean);
  const spawnSyncImpl = deps.spawnSyncImpl ?? spawnSync;
  const validated = validateOpenClawReadonlyLauncher({
    env,
    args,
    pathExists: deps.pathExists,
    binaryPath: deps.binaryPath,
    platform: deps.platform,
  });
  const result = spawnSyncImpl(validated.binaryPath, validated.args, {
    stdio: "inherit",
    env,
  });

  if (result.error) {
    throw result.error;
  }
  return result.status ?? 1;
}

const mainPath = fileURLToPath(import.meta.url);
const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (argv1 && argv1 === mainPath) {
  try {
    process.exit(runOpenClawReadonlyLauncher());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
