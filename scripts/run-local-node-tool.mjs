#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [, , tool, ...toolArgs] = process.argv;

if (!tool) {
  console.error("usage: node scripts/run-local-node-tool.mjs <tool> [args...]");
  process.exit(2);
}

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), "..");
const invocationCwd = process.cwd();
const rootPackageManager = getRootPackageManager();

const packageJsonPath = findPackageJsonPath(tool);
if (!packageJsonPath) {
  console.error(
    `Unable to locate local package for '${tool}'. Checked node_modules, node_modules/.ignored, and node_modules/.pnpm.`,
  );
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
if (shouldUsePackageManagerFallback(tool, packageJson)) {
  const fallbackResult = runPackageManagerTool(tool, packageJson, toolArgs);
  exitWithResult(fallbackResult);
}

const binPath = resolveBinPath(tool, packageJsonPath, packageJson);
if (!binPath) {
  console.error(`Unable to resolve a bin entry for '${tool}' from ${packageJsonPath}.`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [binPath, ...toolArgs], {
  cwd: invocationCwd,
  stdio: "inherit",
});

exitWithResult(result);

function findPackageJsonPath(toolName) {
  const packageParts = toolName.split("/");
  const standardPackageJsonPath = path.join(
    rootDir,
    "node_modules",
    ...packageParts,
    "package.json",
  );
  if (existsSync(standardPackageJsonPath)) {
    return standardPackageJsonPath;
  }

  const ignoredPackageJsonPath = path.join(
    rootDir,
    "node_modules",
    ".ignored",
    ...packageParts,
    "package.json",
  );
  if (existsSync(ignoredPackageJsonPath)) {
    return ignoredPackageJsonPath;
  }

  const pnpmRoot = path.join(rootDir, "node_modules", ".pnpm");
  if (!existsSync(pnpmRoot)) {
    return null;
  }

  const pnpmPrefix = `${toolName.replace("/", "+")}@`;
  for (const entry of readdirSync(pnpmRoot)) {
    if (!entry.startsWith(pnpmPrefix)) {
      continue;
    }

    const pnpmPackageJsonPath = path.join(
      pnpmRoot,
      entry,
      "node_modules",
      ...packageParts,
      "package.json",
    );
    if (existsSync(pnpmPackageJsonPath)) {
      return pnpmPackageJsonPath;
    }
  }

  return null;
}

function resolveBinPath(toolName, packageJsonPath, packageJson) {
  if (typeof packageJson.bin === "string") {
    return path.resolve(path.dirname(packageJsonPath), packageJson.bin);
  }

  if (!packageJson.bin || typeof packageJson.bin !== "object") {
    return null;
  }

  const binName = packageJson.bin[toolName] ? toolName : toolName.split("/").at(-1);
  const selectedBin = packageJson.bin[binName] ?? Object.values(packageJson.bin)[0];
  if (typeof selectedBin !== "string") {
    return null;
  }

  return path.resolve(path.dirname(packageJsonPath), selectedBin);
}

function shouldUsePackageManagerFallback(toolName, _packageJson) {
  if (toolName !== "oxlint" || process.platform !== "win32") {
    return false;
  }

  const bindingPackageName = getOxlintBindingPackageName();
  return Boolean(bindingPackageName) && !findPackageJsonPath(bindingPackageName);
}

function getOxlintBindingPackageName() {
  if (process.arch === "x64") {
    return process.config?.variables?.shlib_suffix === "dll.a" ||
      process.config?.variables?.node_target_type === "shared_library"
      ? "@oxlint/binding-win32-x64-gnu"
      : "@oxlint/binding-win32-x64-msvc";
  }

  if (process.arch === "arm64") {
    return "@oxlint/binding-win32-arm64-msvc";
  }

  if (process.arch === "ia32") {
    return "@oxlint/binding-win32-ia32-msvc";
  }

  return null;
}

function runPackageManagerTool(toolName, packageJson, args) {
  const packageSpec = `${packageJson.name}@${packageJson.version}`;
  const candidates = [];

  if (rootPackageManager?.startsWith("pnpm@") || existsSync(path.join(rootDir, "pnpm-lock.yaml"))) {
    candidates.push({ command: "pnpm", args: ["dlx", packageSpec, ...args] });
  }

  if (
    rootPackageManager?.startsWith("bun@") ||
    existsSync(path.join(rootDir, "bun.lockb")) ||
    existsSync(path.join(rootDir, "bun.lock"))
  ) {
    candidates.push({ command: "bun", args: ["x", "--bun", packageSpec, ...args] });
  }

  candidates.push({
    command: "npm",
    args: ["exec", "--yes", `--package=${packageSpec}`, "--", toolName, ...args],
  });

  for (const candidate of candidates) {
    if (!isCommandAvailable(candidate.command)) {
      continue;
    }

    const result = spawnSync(candidate.command, candidate.args, {
      cwd: invocationCwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    if (result.error?.code === "ENOENT") {
      continue;
    }

    return result;
  }

  console.error("Missing package manager: pnpm, bun, or npm required.");
  return { status: 1 };
}

function isCommandAvailable(command) {
  const checker = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(checker, [command], { stdio: "ignore" });
  return result.status === 0;
}

function getRootPackageManager() {
  const rootPackageJsonPath = path.join(rootDir, "package.json");
  if (!existsSync(rootPackageJsonPath)) {
    return null;
  }

  try {
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf8"));
    return typeof rootPackageJson.packageManager === "string"
      ? rootPackageJson.packageManager
      : null;
  } catch {
    return null;
  }
}

function exitWithResult(result) {
  if (result.error) {
    const attemptedCommand = [
      result.error.path,
      ...(Array.isArray(result.error.spawnargs) ? result.error.spawnargs : []),
    ]
      .filter(Boolean)
      .join(" ");

    console.error(
      attemptedCommand
        ? `Failed to start command: ${attemptedCommand} (${result.error.message})`
        : `Failed to start command: ${result.error.message}`,
    );
    process.exit(1);
  }

  if (typeof result.status === "number") {
    process.exit(result.status);
  }

  process.exit(1);
}
