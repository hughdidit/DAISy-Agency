#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function resolveOpenClawReadonlyBinary(params = {}) {
  const env = params.env ?? process.env;
  const platform = params.platform ?? process.platform;
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

  for (const rawDir of pathValue.split(path.delimiter)) {
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

  if (!binaryPath) {
    throw new Error(
      'The sandbox runtime command "openclaw-readonly" is not on PATH. Rebuild the sandbox image so the readonly runtime wrapper is installed before using this skill.',
    );
  }

  const configPath = env.OPENCLAW_READONLY_CONFIG_PATH?.trim();
  if (!configPath) {
    throw new Error(
      "Missing OPENCLAW_READONLY_CONFIG_PATH. Mount the readonly OpenClaw config file into the sandbox before running this skill.",
    );
  }
  if (!pathExists(configPath)) {
    throw new Error(
      `Missing readonly config mount: ${configPath}. Bind the config file read-only and keep OPENCLAW_READONLY_CONFIG_PATH pointed at that file.`,
    );
  }

  const stateDir = env.OPENCLAW_READONLY_STATE_DIR?.trim();
  if (!stateDir) {
    throw new Error(
      "Missing OPENCLAW_READONLY_STATE_DIR. Mount a synthetic readonly state root into the sandbox before running this skill.",
    );
  }
  if (!pathExists(stateDir)) {
    throw new Error(
      `Missing readonly state mount: ${stateDir}. Bind the readonly state directory and keep OPENCLAW_READONLY_STATE_DIR pointed at that directory.`,
    );
  }

  const needsWorkspace = args[0] === "skills" && (args[1] === "list" || args[1] === "check");
  const workspaceDir = env.OPENCLAW_READONLY_WORKSPACE_DIR?.trim();
  if (needsWorkspace && !workspaceDir) {
    throw new Error(
      'Missing OPENCLAW_READONLY_WORKSPACE_DIR. Mount the sandbox-visible workspace (for example "/agent") before using skills diagnostics.',
    );
  }
  if (needsWorkspace && workspaceDir && !pathExists(workspaceDir)) {
    throw new Error(
      `Missing readonly workspace mount: ${workspaceDir}. Bind the sandbox-visible workspace read-only and keep OPENCLAW_READONLY_WORKSPACE_DIR pointed at that mount.`,
    );
  }

  return { binaryPath, args };
}

export function runOpenClawReadonlyLauncher(
  params = {},
  deps = {},
) {
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
