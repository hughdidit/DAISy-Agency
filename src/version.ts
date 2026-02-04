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
function readVersionFromBuildInfo(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const info = require("../build-info.json") as { version?: string };
    return info.version ?? null;
  } catch {
    return null;
  }
}

// Single source of truth for the current OpenClaw version.
>>>>>>> a9bb96ade (fix: use build-info for version fallback)
// - Embedded/bundled builds: injected define or env var.
// - Dev/npm builds: package.json.
export const VERSION =
  (typeof __CLAWDBOT_VERSION__ === "string" && __CLAWDBOT_VERSION__) ||
  process.env.CLAWDBOT_BUNDLED_VERSION ||
  readVersionFromPackageJson() ||
  readVersionFromBuildInfo() ||
  "0.0.0";
