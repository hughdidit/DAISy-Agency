import type { OpenClawConfig } from "../config/config.js";
import type { SecretRef } from "../config/types.secrets.js";
import { resolveUserPath } from "../utils.js";
import { readJsonPointer } from "./json-pointer.js";
import { isNonEmptyString, isRecord, normalizePositiveInt } from "./shared.js";
import { decryptSopsJsonFile, DEFAULT_SOPS_TIMEOUT_MS } from "./sops.js";

export type SecretRefResolveCache = {
  fileSecretsPromise?: Promise<unknown> | null;
};

type ResolveSecretRefOptions = {
  config: OpenClawConfig;
  env?: NodeJS.ProcessEnv;
  cache?: SecretRefResolveCache;
  missingBinaryMessage?: string;
};

const DEFAULT_SOPS_MISSING_BINARY_MESSAGE =
  "sops binary not found in PATH. Install sops >= 3.9.0 or disable secrets.sources.file.";

async function resolveFileSecretPayload(options: ResolveSecretRefOptions): Promise<unknown> {
  const fileSource = options.config.secrets?.sources?.file;
  if (!fileSource) {
    throw new Error(
      'Secret reference source "file" is not configured. Configure secrets.sources.file first.',
    );
  }
  if (fileSource.type !== "sops") {
    throw new Error(`Unsupported secrets.sources.file.type "${String(fileSource.type)}".`);
  }

  const cache = options.cache;
  if (cache?.fileSecretsPromise) {
    return await cache.fileSecretsPromise;
  }

  const promise = decryptSopsJsonFile({
    path: resolveUserPath(fileSource.path),
    timeoutMs: normalizePositiveInt(fileSource.timeoutMs, DEFAULT_SOPS_TIMEOUT_MS),
    missingBinaryMessage: options.missingBinaryMessage ?? DEFAULT_SOPS_MISSING_BINARY_MESSAGE,
  }).then((payload) => {
    if (!isRecord(payload)) {
      throw new Error("sops decrypt failed: decrypted payload is not a JSON object");
    }
<<<<<<< HEAD
    return payload;
  });
=======
  }

  const stat = await safeStat(params.targetPath);
  if (!stat.ok) {
    throw new Error(`${params.label} is not readable: ${params.targetPath}`);
  }
  if (stat.isDir) {
    throw new Error(`${params.label} must be a file: ${params.targetPath}`);
  }
  if (stat.isSymlink) {
    throw new Error(`${params.label} must not be a symlink: ${params.targetPath}`);
  }
  if (params.allowInsecurePath) {
    return;
  }

  const perms = await inspectPathPermissions(params.targetPath);
  if (!perms.ok) {
    throw new Error(`${params.label} permissions could not be verified: ${params.targetPath}`);
  }
  const writableByOthers = perms.worldWritable || perms.groupWritable;
  const readableByOthers = perms.worldReadable || perms.groupReadable;
  if (writableByOthers || (!params.allowReadableByOthers && readableByOthers)) {
    throw new Error(`${params.label} permissions are too open: ${params.targetPath}`);
  }

  if (process.platform === "win32" && perms.source === "unknown") {
    throw new Error(
      `${params.label} ACL verification unavailable on Windows for ${params.targetPath}.`,
    );
  }

  if (process.platform !== "win32" && typeof process.getuid === "function" && stat.uid != null) {
    const uid = process.getuid();
    if (stat.uid !== uid) {
      throw new Error(
        `${params.label} must be owned by the current user (uid=${uid}): ${params.targetPath}`,
      );
    }
  }
}

async function readFileProviderPayload(params: {
  providerName: string;
  providerConfig: FileSecretProviderConfig;
  cache?: SecretRefResolveCache;
}): Promise<unknown> {
  const cacheKey = params.providerName;
  const cache = params.cache;
  if (cache?.filePayloadByProvider?.has(cacheKey)) {
    return await (cache.filePayloadByProvider.get(cacheKey) as Promise<unknown>);
  }

  const filePath = resolveUserPath(params.providerConfig.path);
  const readPromise = (async () => {
    await assertSecurePath({
      targetPath: filePath,
      label: `secrets.providers.${params.providerName}.path`,
    });
    const timeoutMs = normalizePositiveInt(
      params.providerConfig.timeoutMs,
      DEFAULT_FILE_TIMEOUT_MS,
    );
    const maxBytes = normalizePositiveInt(params.providerConfig.maxBytes, DEFAULT_FILE_MAX_BYTES);
    const abortController = new AbortController();
    const timeoutErrorMessage = `File provider "${params.providerName}" timed out after ${timeoutMs}ms.`;
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(() => {
        abortController.abort();
        reject(new Error(timeoutErrorMessage));
      }, timeoutMs);
    });
    try {
      const payload = await Promise.race([
        fs.readFile(filePath, { signal: abortController.signal }),
        timeoutPromise,
      ]);
      if (payload.byteLength > maxBytes) {
        throw new Error(`File provider "${params.providerName}" exceeded maxBytes (${maxBytes}).`);
      }
      const text = payload.toString("utf8");
      if (params.providerConfig.mode === "raw") {
        return text.replace(/\r?\n$/, "");
      }
      const parsed = JSON.parse(text) as unknown;
      if (!isRecord(parsed)) {
        throw new Error(`File provider "${params.providerName}" payload is not a JSON object.`);
      }
      return parsed;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(timeoutErrorMessage, { cause: error });
      }
      throw error;
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  })();

>>>>>>> 86622ebea (fix(secrets): enforce file provider read timeouts)
  if (cache) {
    cache.fileSecretsPromise = promise;
  }
  return await promise;
}

export async function resolveSecretRefValue(
  ref: SecretRef,
  options: ResolveSecretRefOptions,
): Promise<unknown> {
  const id = ref.id.trim();
  if (!id) {
    throw new Error("Secret reference id is empty.");
  }

  if (ref.source === "env") {
    const envValue = options.env?.[id] ?? process.env[id];
    if (!isNonEmptyString(envValue)) {
      throw new Error(`Environment variable "${id}" is missing or empty.`);
    }
    return envValue;
  }

  if (ref.source === "file") {
    const payload = await resolveFileSecretPayload(options);
    return readJsonPointer(payload, id, { onMissing: "throw" });
  }

  throw new Error(`Unsupported secret source "${String((ref as { source?: unknown }).source)}".`);
}

export async function resolveSecretRefString(
  ref: SecretRef,
  options: ResolveSecretRefOptions,
): Promise<string> {
  const resolved = await resolveSecretRefValue(ref, options);
  if (!isNonEmptyString(resolved)) {
    throw new Error(
      `Secret reference "${ref.source}:${ref.id}" resolved to a non-string or empty value.`,
    );
  }
  return resolved;
}
