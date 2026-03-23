#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALLOWED_MOCK_POLICY_FILES = new Set(["scripts/check-no-new-mock-files.mjs"]);

function parseArgs(argv) {
  const args = { base: "HEAD", head: "HEAD" };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --base");
      }
      args.base = value;
      index += 1;
      continue;
    }
    if (token === "--head") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --head");
      }
      args.head = value;
      index += 1;
      continue;
    }
    if (token.startsWith("--")) {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function getRepoRoot() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(scriptDir, "..");
}

function git(repoRoot, args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

function isMockPath(filePath) {
  const normalizedPath = normalizePath(filePath);
  const baseName = path.posix.basename(normalizedPath);

  if (ALLOWED_MOCK_POLICY_FILES.has(normalizedPath)) {
    return false;
  }

  if (/(^|\/)(?:__mocks__|mocks?)(\/|$)/i.test(normalizedPath)) {
    return true;
  }

  return /(^|[._-])mocks?([._-]|$)/i.test(baseName);
}

function getAddedOrRenamedPaths(repoRoot, baseRef, headRef) {
  const output = git(repoRoot, [
    "diff",
    "--name-status",
    "--find-renames",
    "--diff-filter=AR",
    baseRef,
    headRef,
    "--",
  ]);

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split("\t"))
    .map((parts) => {
      const status = parts[0] ?? "";
      if (status.startsWith("R")) {
        return parts[2] ?? "";
      }
      return parts[1] ?? "";
    })
    .filter(Boolean);
}

function main() {
  const { base, head } = parseArgs(process.argv.slice(2));
  const repoRoot = getRepoRoot();
  const addedPaths = getAddedOrRenamedPaths(repoRoot, base, head);
  const violations = addedPaths.filter(isMockPath).toSorted();

  if (violations.length === 0) {
    return;
  }

  console.error("New mock-pattern files are blocked by repository policy:");
  for (const violation of violations) {
    console.error(`- ${normalizePath(violation)}`);
  }
  console.error(
    "Prefer real-behavior, fixture-driven, or in-process integration tests. If a new mock file is necessary, get explicit approval before adding it.",
  );
  process.exit(1);
}

main();
