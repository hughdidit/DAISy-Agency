import fs from "node:fs";
import path from "node:path";
import type { PluginLogger } from "openclaw/plugin-sdk";
import { ACPX_LOCAL_INSTALL_COMMAND, ACPX_PINNED_VERSION, ACPX_PLUGIN_ROOT } from "./config.js";
import { resolveSpawnFailure, spawnAndCollect } from "./runtime-internals/process.js";

const SEMVER_PATTERN = /\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b/;

export type AcpxVersionCheckResult =
  | {
      ok: true;
      version: string;
      expectedVersion: string;
    }
  | {
      ok: false;
      reason: "missing-command" | "missing-version" | "version-mismatch" | "execution-failed";
      message: string;
      expectedVersion: string;
      installCommand: string;
      installedVersion?: string;
    };

function extractVersion(stdout: string, stderr: string): string | null {
  const combined = `${stdout}\n${stderr}`;
  const match = combined.match(SEMVER_PATTERN);
  return match?.[0] ?? null;
}

<<<<<<< HEAD
export async function checkPinnedAcpxVersion(params: {
=======
function isExpectedVersionConfigured(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function supportsPathResolution(command: string): boolean {
  return path.isAbsolute(command) || command.includes("/") || command.includes("\\");
}

function isUnsupportedVersionProbe(stdout: string, stderr: string): boolean {
  const combined = `${stdout}\n${stderr}`.toLowerCase();
  return combined.includes("unknown option") && combined.includes("--version");
}

function resolveVersionFromPackage(command: string, cwd: string): string | null {
  if (!supportsPathResolution(command)) {
    return null;
  }
  const commandPath = path.isAbsolute(command) ? command : path.resolve(cwd, command);
  let current: string;
  try {
    current = path.dirname(fs.realpathSync(commandPath));
  } catch {
    return null;
  }
  while (true) {
    const packageJsonPath = path.join(current, "package.json");
    try {
      const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
        name?: unknown;
        version?: unknown;
      };
      if (parsed.name === "acpx" && typeof parsed.version === "string" && parsed.version.trim()) {
        return parsed.version.trim();
      }
    } catch {
      // no-op; continue walking up
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export async function checkAcpxVersion(params: {
>>>>>>> b12c909ea (ACPX: pin 0.1.15 and tolerate missing --version in health check)
  command: string;
  cwd?: string;
  expectedVersion?: string;
}): Promise<AcpxVersionCheckResult> {
  const expectedVersion = params.expectedVersion ?? ACPX_PINNED_VERSION;
  const cwd = params.cwd ?? ACPX_PLUGIN_ROOT;
  const result = await spawnAndCollect({
    command: params.command,
    args: ["--version"],
    cwd,
  });

  if (result.error) {
    const spawnFailure = resolveSpawnFailure(result.error, cwd);
    if (spawnFailure === "missing-command") {
      return {
        ok: false,
        reason: "missing-command",
        message: `acpx command not found at ${params.command}`,
        expectedVersion,
        installCommand: ACPX_LOCAL_INSTALL_COMMAND,
      };
    }
    return {
      ok: false,
      reason: "execution-failed",
      message: result.error.message,
      expectedVersion,
      installCommand: ACPX_LOCAL_INSTALL_COMMAND,
    };
  }

  if ((result.code ?? 0) !== 0) {
    if (hasExpectedVersion && isUnsupportedVersionProbe(result.stdout, result.stderr)) {
      const installedVersion = resolveVersionFromPackage(params.command, cwd);
      if (installedVersion) {
        if (expectedVersion && installedVersion !== expectedVersion) {
          return {
            ok: false,
            reason: "version-mismatch",
            message: `acpx version mismatch: found ${installedVersion}, expected ${expectedVersion}`,
            expectedVersion,
            installCommand,
            installedVersion,
          };
        }
        return {
          ok: true,
          version: installedVersion,
          expectedVersion,
        };
      }
    }
    const stderr = result.stderr.trim();
    return {
      ok: false,
      reason: "execution-failed",
      message: stderr || `acpx --version failed with code ${result.code ?? "unknown"}`,
      expectedVersion,
      installCommand: ACPX_LOCAL_INSTALL_COMMAND,
    };
  }

  const installedVersion = extractVersion(result.stdout, result.stderr);
  if (!installedVersion) {
    return {
      ok: false,
      reason: "missing-version",
      message: "acpx --version output did not include a parseable version",
      expectedVersion,
      installCommand: ACPX_LOCAL_INSTALL_COMMAND,
    };
  }

  if (installedVersion !== expectedVersion) {
    return {
      ok: false,
      reason: "version-mismatch",
      message: `acpx version mismatch: found ${installedVersion}, expected ${expectedVersion}`,
      expectedVersion,
      installCommand: ACPX_LOCAL_INSTALL_COMMAND,
      installedVersion,
    };
  }

  return {
    ok: true,
    version: installedVersion,
    expectedVersion,
  };
}

let pendingEnsure: Promise<void> | null = null;

export async function ensurePinnedAcpx(params: {
  command: string;
  logger?: PluginLogger;
  pluginRoot?: string;
  expectedVersion?: string;
}): Promise<void> {
  if (pendingEnsure) {
    return await pendingEnsure;
  }

  pendingEnsure = (async () => {
    const pluginRoot = params.pluginRoot ?? ACPX_PLUGIN_ROOT;
    const expectedVersion = params.expectedVersion ?? ACPX_PINNED_VERSION;

    const precheck = await checkPinnedAcpxVersion({
      command: params.command,
      cwd: pluginRoot,
      expectedVersion,
    });
    if (precheck.ok) {
      return;
    }

    params.logger?.warn(
      `acpx local binary unavailable or mismatched (${precheck.message}); running plugin-local install`,
    );

    const install = await spawnAndCollect({
      command: "npm",
      args: ["install", "--omit=dev", "--no-save", `acpx@${expectedVersion}`],
      cwd: pluginRoot,
    });

    if (install.error) {
      const spawnFailure = resolveSpawnFailure(install.error, pluginRoot);
      if (spawnFailure === "missing-command") {
        throw new Error("npm is required to install plugin-local acpx but was not found on PATH");
      }
      throw new Error(`failed to install plugin-local acpx: ${install.error.message}`);
    }

    if ((install.code ?? 0) !== 0) {
      const stderr = install.stderr.trim();
      const stdout = install.stdout.trim();
      const detail = stderr || stdout || `npm exited with code ${install.code ?? "unknown"}`;
      throw new Error(`failed to install plugin-local acpx: ${detail}`);
    }

    const postcheck = await checkPinnedAcpxVersion({
      command: params.command,
      cwd: pluginRoot,
      expectedVersion,
    });

    if (!postcheck.ok) {
      throw new Error(`plugin-local acpx verification failed after install: ${postcheck.message}`);
    }

    params.logger?.info(`acpx plugin-local binary ready (version ${postcheck.version})`);
  })();

  try {
    await pendingEnsure;
  } finally {
    pendingEnsure = null;
  }
}
