import fs from "node:fs";
import path from "node:path";
import type { OAuthCredentials } from "@mariozechner/pi-ai";
import { resolveMoltbotAgentDir } from "../agents/agent-paths.js";
import { upsertAuthProfile } from "../agents/auth-profiles.js";
import { resolveStateDir } from "../config/paths.js";
import { isSecretRef, type SecretInput, type SecretRef } from "../config/types.secrets.js";
import { KILOCODE_DEFAULT_MODEL_REF } from "../providers/kilocode-shared.js";
import { PROVIDER_ENV_VARS } from "../secrets/provider-env-vars.js";
import { normalizeSecretInput } from "../utils/normalize-secret-input.js";
import type { SecretInputMode } from "./onboard-types.js";
export { CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF } from "../agents/cloudflare-ai-gateway.js";
export { MISTRAL_DEFAULT_MODEL_REF, XAI_DEFAULT_MODEL_REF } from "./onboard-auth.models.js";
export { KILOCODE_DEFAULT_MODEL_REF };

const resolveAuthAgentDir = (agentDir?: string) => agentDir ?? resolveMoltbotAgentDir();

const ENV_REF_PATTERN = /^\$\{([A-Z][A-Z0-9_]*)\}$/;

export type ApiKeyStorageOptions = {
  secretInputMode?: SecretInputMode;
};

function buildEnvSecretRef(id: string): SecretRef {
  return { source: "env", id };
}

function parseEnvSecretRef(value: string): SecretRef | null {
  const match = ENV_REF_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  return buildEnvSecretRef(match[1]);
}

function resolveProviderDefaultEnvSecretRef(provider: string): SecretRef {
  const envVars = PROVIDER_ENV_VARS[provider];
  const envVar = envVars?.find((candidate) => candidate.trim().length > 0);
  if (!envVar) {
    throw new Error(
      `Provider "${provider}" does not have a default env var mapping for secret-input-mode=ref.`,
    );
  }
  return buildEnvSecretRef(envVar);
}

function resolveApiKeySecretInput(
  provider: string,
  input: SecretInput,
  options?: ApiKeyStorageOptions,
): SecretInput {
  if (isSecretRef(input)) {
    return input;
  }
  const normalized = normalizeSecretInput(input);
  const inlineEnvRef = parseEnvSecretRef(normalized);
  if (inlineEnvRef) {
    return inlineEnvRef;
  }
  if (options?.secretInputMode === "ref") {
    return resolveProviderDefaultEnvSecretRef(provider);
  }
  return normalized;
}

function buildApiKeyCredential(
  provider: string,
  input: SecretInput,
  metadata?: Record<string, string>,
  options?: ApiKeyStorageOptions,
): {
  type: "api_key";
  provider: string;
  key?: string;
  keyRef?: SecretRef;
  metadata?: Record<string, string>;
} {
  const secretInput = resolveApiKeySecretInput(provider, input, options);
  if (typeof secretInput === "string") {
    return {
      type: "api_key",
      provider,
      key: secretInput,
      ...(metadata ? { metadata } : {}),
    };
  }
  return {
    type: "api_key",
    provider,
    keyRef: secretInput,
    ...(metadata ? { metadata } : {}),
  };
}

export type WriteOAuthCredentialsOptions = {
  syncSiblingAgents?: boolean;
};

/** Resolve real path, returning null if the target doesn't exist. */
function safeRealpathSync(dir: string): string | null {
  try {
    return fs.realpathSync(path.resolve(dir));
  } catch {
    return null;
  }
}

function resolveSiblingAgentDirs(primaryAgentDir: string): string[] {
  const normalized = path.resolve(primaryAgentDir);

  // Derive agentsRoot from primaryAgentDir when it matches the standard
  // layout (.../agents/<name>/agent). Falls back to global state dir.
  const parentOfAgent = path.dirname(normalized);
  const candidateAgentsRoot = path.dirname(parentOfAgent);
  const looksLikeStandardLayout =
    path.basename(normalized) === "agent" && path.basename(candidateAgentsRoot) === "agents";

  const agentsRoot = looksLikeStandardLayout
    ? candidateAgentsRoot
    : path.join(resolveStateDir(), "agents");

  const entries = (() => {
    try {
      return fs.readdirSync(agentsRoot, { withFileTypes: true });
    } catch {
      return [];
    }
  })();
  // Include both directories and symlinks-to-directories.
  const discovered = entries
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => path.join(agentsRoot, entry.name, "agent"));

  // Deduplicate via realpath to handle symlinks and path normalization.
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dir of [normalized, ...discovered]) {
    const real = safeRealpathSync(dir);
    if (real && !seen.has(real)) {
      seen.add(real);
      result.push(real);
    }
  }
  return result;
}

export async function writeOAuthCredentials(
  provider: string,
  creds: OAuthCredentials,
  agentDir?: string,
<<<<<<< HEAD
<<<<<<< HEAD
): Promise<void> {
  // Write to resolved agent dir so gateway finds credentials on startup.
  const email = typeof creds.email === "string" ? creds.email.trim() : "";
  upsertAuthProfile({
    profileId: `${provider}:${email || "default"}`,
=======
=======
  options?: WriteOAuthCredentialsOptions,
>>>>>>> 7ecfc1d93 (fix(auth): bidirectional mode/type compat + sync OAuth to all agents (#12692))
): Promise<string> {
  const email =
    typeof creds.email === "string" && creds.email.trim() ? creds.email.trim() : "default";
  const profileId = `${provider}:${email}`;
  const resolvedAgentDir = path.resolve(resolveAuthAgentDir(agentDir));
  const targetAgentDirs = options?.syncSiblingAgents
    ? resolveSiblingAgentDirs(resolvedAgentDir)
    : [resolvedAgentDir];

  const credential = {
    type: "oauth" as const,
    provider,
    ...creds,
  };

  // Primary write must succeed — let it throw on failure.
  upsertAuthProfile({
    profileId,
<<<<<<< HEAD
>>>>>>> 38b4fb5d5 (fix(auth/session): preserve override reset behavior and repair oauth profile-id drift (openclaw#18820) thanks @Glucksberg)
    credential: {
      type: "oauth",
      provider,
      ...creds,
    },
    agentDir: resolveAuthAgentDir(agentDir),
=======
    credential,
    agentDir: resolvedAgentDir,
>>>>>>> 7ecfc1d93 (fix(auth): bidirectional mode/type compat + sync OAuth to all agents (#12692))
  });

  // Sibling sync is best-effort — log and ignore individual failures.
  if (options?.syncSiblingAgents) {
    const primaryReal = safeRealpathSync(resolvedAgentDir);
    for (const targetAgentDir of targetAgentDirs) {
      const targetReal = safeRealpathSync(targetAgentDir);
      if (targetReal && primaryReal && targetReal === primaryReal) {
        continue;
      }
      try {
        upsertAuthProfile({
          profileId,
          credential,
          agentDir: targetAgentDir,
        });
      } catch {
        // Best-effort: sibling sync failure must not block primary onboarding.
      }
    }
  }
  return profileId;
}

export async function setAnthropicApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "anthropic:default",
    credential: buildApiKeyCredential("anthropic", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

<<<<<<< HEAD
export async function setOpenaiApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  upsertAuthProfile({
    profileId: "openai:default",
    credential: buildApiKeyCredential("openai", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setGeminiApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "google:default",
    credential: buildApiKeyCredential("google", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setMinimaxApiKey(
  key: SecretInput,
  agentDir?: string,
  profileId: string = "minimax:default",
  options?: ApiKeyStorageOptions,
) {
  const provider = profileId.split(":")[0] ?? "minimax";
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId,
    credential: buildApiKeyCredential(provider, key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setMoonshotApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "moonshot:default",
    credential: buildApiKeyCredential("moonshot", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setKimiCodingApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "kimi-coding:default",
    credential: buildApiKeyCredential("kimi-coding", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setVolcengineApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  upsertAuthProfile({
    profileId: "volcengine:default",
    credential: buildApiKeyCredential("volcengine", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setByteplusApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  upsertAuthProfile({
    profileId: "byteplus:default",
    credential: buildApiKeyCredential("byteplus", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setSyntheticApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "synthetic:default",
    credential: buildApiKeyCredential("synthetic", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setVeniceApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "venice:default",
    credential: buildApiKeyCredential("venice", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export const ZAI_DEFAULT_MODEL_REF = "zai/glm-5";
export const XIAOMI_DEFAULT_MODEL_REF = "xiaomi/mimo-v2-flash";
export const OPENROUTER_DEFAULT_MODEL_REF = "openrouter/auto";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
export const VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF = "vercel-ai-gateway/anthropic/claude-opus-4.5";
=======
export const TOGETHER_DEFAULT_MODEL_REF = "together/zai-org/GLM-4.7";
=======
=======
export const HUGGINGFACE_DEFAULT_MODEL_REF = "huggingface/deepseek-ai/DeepSeek-R1";
>>>>>>> 08b7932df (feat(agents) : Hugging Face Inference provider first-class support and Together API fix and Direct Injection Refactor Auths [AI-assisted] (#13472))
export const TOGETHER_DEFAULT_MODEL_REF = "together/moonshotai/Kimi-K2.5";
<<<<<<< HEAD
>>>>>>> be6de9bb7 (Update Together default model to together/moonshotai/Kimi-K2.5 (#13324))
=======
export const LITELLM_DEFAULT_MODEL_REF = "litellm/claude-opus-4-6";
>>>>>>> a36b9be24 (Feat/litellm provider (#12823))
export const VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF = "vercel-ai-gateway/anthropic/claude-opus-4.6";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 661279cbf (feat: adding support for Together ai provider (#10304))
=======
export const KILOCODE_DEFAULT_MODEL_REF = "kilocode/anthropic/claude-opus-4.6";
>>>>>>> 13f32e2f7 (feat: Add Kilo Gateway provider (#20212))
=======
>>>>>>> e6484cb65 (refactor: harden kilocode auth ordering and dedupe provider wiring)

export async function setZaiApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "zai:default",
    credential: buildApiKeyCredential("zai", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setXiaomiApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  upsertAuthProfile({
    profileId: "xiaomi:default",
    credential: buildApiKeyCredential("xiaomi", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setOpenrouterApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  // Never persist the literal "undefined" (e.g. when prompt returns undefined and caller used String(key)).
  const safeKey = typeof key === "string" && key === "undefined" ? "" : key;
  upsertAuthProfile({
    profileId: "openrouter:default",
    credential: buildApiKeyCredential("openrouter", safeKey, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setCloudflareAiGatewayConfig(
  accountId: string,
  gatewayId: string,
  apiKey: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  const normalizedAccountId = accountId.trim();
  const normalizedGatewayId = gatewayId.trim();
  upsertAuthProfile({
    profileId: "cloudflare-ai-gateway:default",
    credential: buildApiKeyCredential(
      "cloudflare-ai-gateway",
      apiKey,
      {
        accountId: normalizedAccountId,
        gatewayId: normalizedGatewayId,
      },
      options,
    ),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setLitellmApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  upsertAuthProfile({
    profileId: "litellm:default",
    credential: buildApiKeyCredential("litellm", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setVercelAiGatewayApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  upsertAuthProfile({
    profileId: "vercel-ai-gateway:default",
    credential: buildApiKeyCredential("vercel-ai-gateway", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setOpencodeZenApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  upsertAuthProfile({
    profileId: "opencode:default",
    credential: buildApiKeyCredential("opencode", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
export async function setTogetherApiKey(key: string, agentDir?: string) {
=======
export async function setTogetherApiKey(key: SecretInput, agentDir?: string) {
>>>>>>> 7e1557b8c (Onboard: persist env-backed API keys as secret refs)
=======
export async function setTogetherApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
>>>>>>> 04aa856fc (Onboard: require explicit mode for env secret refs)
  upsertAuthProfile({
    profileId: "together:default",
    credential: buildApiKeyCredential("together", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 661279cbf (feat: adding support for Together ai provider (#10304))
=======
export async function setHuggingfaceApiKey(key: string, agentDir?: string) {
=======
export async function setHuggingfaceApiKey(key: SecretInput, agentDir?: string) {
>>>>>>> 7e1557b8c (Onboard: persist env-backed API keys as secret refs)
=======
export async function setHuggingfaceApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
>>>>>>> 04aa856fc (Onboard: require explicit mode for env secret refs)
  upsertAuthProfile({
    profileId: "huggingface:default",
    credential: buildApiKeyCredential("huggingface", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 08b7932df (feat(agents) : Hugging Face Inference provider first-class support and Together API fix and Direct Injection Refactor Auths [AI-assisted] (#13472))
export function setQianfanApiKey(key: string, agentDir?: string) {
  upsertAuthProfile({
    profileId: "qianfan:default",
    credential: {
      type: "api_key",
      provider: "qianfan",
=======
export async function setXaiApiKey(key: string, agentDir?: string) {
=======
export function setXaiApiKey(key: string, agentDir?: string) {
>>>>>>> 155dfa93e (fix(onboard): align xAI default model to grok-4)
  upsertAuthProfile({
    profileId: "xai:default",
    credential: {
      type: "api_key",
      provider: "xai",
>>>>>>> db31c0ccc (feat: add xAI Grok provider support)
      key,
    },
=======
export function setQianfanApiKey(key: SecretInput, agentDir?: string) {
=======
export function setQianfanApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
>>>>>>> 04aa856fc (Onboard: require explicit mode for env secret refs)
  upsertAuthProfile({
    profileId: "qianfan:default",
    credential: buildApiKeyCredential("qianfan", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export function setXaiApiKey(key: SecretInput, agentDir?: string, options?: ApiKeyStorageOptions) {
  upsertAuthProfile({
    profileId: "xai:default",
<<<<<<< HEAD
    credential: buildApiKeyCredential("xai", key),
>>>>>>> 7e1557b8c (Onboard: persist env-backed API keys as secret refs)
=======
    credential: buildApiKeyCredential("xai", key, undefined, options),
>>>>>>> 04aa856fc (Onboard: require explicit mode for env secret refs)
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setMistralApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  upsertAuthProfile({
    profileId: "mistral:default",
    credential: buildApiKeyCredential("mistral", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setKilocodeApiKey(
  key: SecretInput,
  agentDir?: string,
  options?: ApiKeyStorageOptions,
) {
  upsertAuthProfile({
    profileId: "kilocode:default",
    credential: buildApiKeyCredential("kilocode", key, undefined, options),
    agentDir: resolveAuthAgentDir(agentDir),
  });
}
