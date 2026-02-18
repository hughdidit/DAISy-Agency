import { createRequire } from "node:module";

declare const __CLAWDBOT_VERSION__: string | undefined;

function readVersionFromPackageJson(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json") as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

<<<<<<< HEAD
// Single source of truth for the current moltbot version.
=======
function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
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

export type RuntimeVersionEnv = {
  [key: string]: string | undefined;
};

export function resolveRuntimeServiceVersion(
  env: RuntimeVersionEnv = process.env as RuntimeVersionEnv,
  fallback = "dev",
): string {
  return (
    firstNonEmpty(
      env["OPENCLAW_VERSION"],
      env["OPENCLAW_SERVICE_VERSION"],
      env["npm_package_version"],
    ) ?? fallback
  );
}

// Single source of truth for the current OpenClaw version.
>>>>>>> 07fdceb5f (refactor: centralize presence routing and version precedence coverage (#19609))
// - Embedded/bundled builds: injected define or env var.
// - Dev/npm builds: package.json.
export const VERSION =
  (typeof __CLAWDBOT_VERSION__ === "string" && __CLAWDBOT_VERSION__) ||
  process.env.CLAWDBOT_BUNDLED_VERSION ||
  readVersionFromPackageJson() ||
  "0.0.0";
