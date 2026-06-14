import path from "node:path";
import { PluginError } from "./errors.js";
import { MIN_SUPPORTED_GWS_VERSION } from "./types.js";
import type { DiscoveryResult, ExecutionResult } from "./types.js";

type CacheEntry = {
  key: string;
  discoveredAtMs: number;
  result: DiscoveryResult;
};

const cache = new Map<string, CacheEntry>();

const NOT_FOUND_PATTERN =
  /enoent|not\s+recognized|not\s+found|cannot\s+find\s+module|module_not_found/i;

function isMissingBinaryError(error: PluginError): boolean {
  return error.details?.code === "ENOENT" || NOT_FOUND_PATTERN.test(error.message);
}

function isCacheEnabled(): boolean {
  return process.env.VITEST === undefined && process.env.NODE_ENV !== "test";
}

function parseVersionText(value: string): DiscoveryResult["version"] | null {
  const match = value.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  return {
    major: Number.parseInt(match[1] ?? "0", 10),
    minor: Number.parseInt(match[2] ?? "0", 10),
    patch: Number.parseInt(match[3] ?? "0", 10),
  };
}

function isVersionSupported(version: DiscoveryResult["version"]): boolean {
  if (version.major !== MIN_SUPPORTED_GWS_VERSION.major) {
    return version.major > MIN_SUPPORTED_GWS_VERSION.major;
  }
  if (version.minor !== MIN_SUPPORTED_GWS_VERSION.minor) {
    return version.minor > MIN_SUPPORTED_GWS_VERSION.minor;
  }
  return version.patch >= MIN_SUPPORTED_GWS_VERSION.patch;
}

export function resolveBinaryPath(configBinaryPath: string | undefined): string {
  if (typeof configBinaryPath === "string" && configBinaryPath.trim()) {
    const trimmed = configBinaryPath.trim();
    if (path.isAbsolute(trimmed) || !/[\\/]/.test(trimmed)) {
      return trimmed;
    }
    return path.resolve(trimmed);
  }
  return "gws";
}

export function clearBinaryCacheForTests(): void {
  cache.clear();
}

export async function discoverBinary(params: {
  configuredPath?: string;
  runVersion: (binaryPath: string) => Promise<ExecutionResult>;
}): Promise<DiscoveryResult> {
  const binaryPath = resolveBinaryPath(params.configuredPath);
  const cacheKey = binaryPath;
  const useCache = isCacheEnabled();

  if (useCache) {
    const hit = cache.get(cacheKey);
    if (hit) {
      return hit.result;
    }
  }

  let versionResult: ExecutionResult;
  try {
    versionResult = await params.runVersion(binaryPath);
  } catch (error) {
    if (error instanceof PluginError) {
      if (error.code === "EXEC_TIMEOUT") {
        throw error;
      }
      if (error.code === "EXEC_ERROR") {
        if (isMissingBinaryError(error)) {
          throw new PluginError("BINARY_NOT_FOUND", "gws binary not found", {
            binaryPath,
          });
        }
      }
    }
    throw error;
  }

  if (versionResult.timedOut) {
    throw new PluginError("EXEC_TIMEOUT", "gws --version timed out");
  }
  if (versionResult.exitCode !== 0) {
    const stderr = versionResult.stderr.trim();
    const stdout = versionResult.stdout.trim();
    const message = stderr || stdout || "binary failed";
    if (NOT_FOUND_PATTERN.test(message)) {
      throw new PluginError("BINARY_NOT_FOUND", "gws binary not found", {
        binaryPath,
      });
    }
    throw new PluginError("EXEC_ERROR", "gws --version command failed", {
      binaryPath,
      exitCode: versionResult.exitCode,
      message: message.slice(0, 240),
    });
  }

  const versionText = (versionResult.stdout || versionResult.stderr || "").trim();
  const parsed = parseVersionText(versionText);
  if (!parsed) {
    throw new PluginError("UNSUPPORTED_GWS_VERSION", "Unable to parse gws version output", {
      output: versionText.slice(0, 120),
    });
  }
  if (!isVersionSupported(parsed)) {
    throw new PluginError("UNSUPPORTED_GWS_VERSION", "gws version is below minimum supported", {
      version: `${parsed.major}.${parsed.minor}.${parsed.patch}`,
    });
  }

  const result: DiscoveryResult = {
    binaryPath,
    versionText,
    version: parsed,
  };

  if (useCache) {
    cache.set(cacheKey, {
      key: cacheKey,
      discoveredAtMs: Date.now(),
      result,
    });
  }

  return result;
}

export const __testing = {
  parseVersionText,
  isVersionSupported,
};
