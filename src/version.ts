import { createRequire } from "node:module";

<<<<<<< HEAD
declare const __CLAWDBOT_VERSION__: string | undefined;
=======
declare const __OPENCLAW_VERSION__: string | undefined;
const CORE_PACKAGE_NAME = "openclaw";
>>>>>>> 4a59b7786 (fix: CLI harden update restart imports and fix nested bundle version resolution)

const PACKAGE_JSON_CANDIDATES = [
  "../package.json",
  "../../package.json",
  "../../../package.json",
  "./package.json",
] as const;

<<<<<<< HEAD
<<<<<<< HEAD
// Single source of truth for the current moltbot version.
=======
function readVersionFromBuildInfo(): string | null {
=======
const BUILD_INFO_CANDIDATES = [
  "../build-info.json",
  "../../build-info.json",
  "./build-info.json",
] as const;

function readVersionFromJsonCandidates(
  moduleUrl: string,
  candidates: readonly string[],
  opts: { requirePackageName?: boolean } = {},
): string | null {
>>>>>>> 4a59b7786 (fix: CLI harden update restart imports and fix nested bundle version resolution)
  try {
    const require = createRequire(moduleUrl);
    for (const candidate of candidates) {
      try {
        const parsed = require(candidate) as { name?: string; version?: string };
        const version = parsed.version?.trim();
        if (!version) {
          continue;
        }
        if (opts.requirePackageName && parsed.name !== CORE_PACKAGE_NAME) {
          continue;
        }
        return version;
      } catch {
        // ignore missing or unreadable candidate
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function readVersionFromPackageJsonForModuleUrl(moduleUrl: string): string | null {
  return readVersionFromJsonCandidates(moduleUrl, PACKAGE_JSON_CANDIDATES, {
    requirePackageName: true,
  });
}

export function readVersionFromBuildInfoForModuleUrl(moduleUrl: string): string | null {
  return readVersionFromJsonCandidates(moduleUrl, BUILD_INFO_CANDIDATES);
}

export function resolveVersionFromModuleUrl(moduleUrl: string): string | null {
  return (
    readVersionFromPackageJsonForModuleUrl(moduleUrl) ||
    readVersionFromBuildInfoForModuleUrl(moduleUrl)
  );
}

// Single source of truth for the current OpenClaw version.
>>>>>>> a9bb96ade (fix: use build-info for version fallback)
// - Embedded/bundled builds: injected define or env var.
// - Dev/npm builds: package.json.
export const VERSION =
<<<<<<< HEAD
  (typeof __CLAWDBOT_VERSION__ === "string" && __CLAWDBOT_VERSION__) ||
  process.env.CLAWDBOT_BUNDLED_VERSION ||
  readVersionFromPackageJson() ||
  readVersionFromBuildInfo() ||
=======
  (typeof __OPENCLAW_VERSION__ === "string" && __OPENCLAW_VERSION__) ||
  process.env.OPENCLAW_BUNDLED_VERSION ||
  resolveVersionFromModuleUrl(import.meta.url) ||
>>>>>>> 4a59b7786 (fix: CLI harden update restart imports and fix nested bundle version resolution)
  "0.0.0";
