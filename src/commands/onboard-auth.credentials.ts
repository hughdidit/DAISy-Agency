import type { OAuthCredentials } from "@mariozechner/pi-ai";
import { resolveOpenClawAgentDir } from "../agents/agent-paths.js";
import { upsertAuthProfile } from "../agents/auth-profiles.js";
<<<<<<< HEAD

const resolveAuthAgentDir = (agentDir?: string) => agentDir ?? resolveOpenClawAgentDir();

=======
import { resolveStateDir } from "../config/paths.js";
import {
  coerceSecretRef,
  DEFAULT_SECRET_PROVIDER_ALIAS,
  type SecretInput,
  type SecretRef,
} from "../config/types.secrets.js";
import { KILOCODE_DEFAULT_MODEL_REF } from "../providers/kilocode-shared.js";
import { PROVIDER_ENV_VARS } from "../secrets/provider-env-vars.js";
import { normalizeSecretInput } from "../utils/normalize-secret-input.js";
import type { SecretInputMode } from "./onboard-types.js";
export { CLOUDFLARE_AI_GATEWAY_DEFAULT_MODEL_REF } from "../agents/cloudflare-ai-gateway.js";
export { MISTRAL_DEFAULT_MODEL_REF, XAI_DEFAULT_MODEL_REF } from "./onboard-auth.models.js";
export { KILOCODE_DEFAULT_MODEL_REF };

const resolveAuthAgentDir = (agentDir?: string) => agentDir ?? resolveOpenClawAgentDir();

const ENV_REF_PATTERN = /^\$\{([A-Z][A-Z0-9_]*)\}$/;

export type ApiKeyStorageOptions = {
  secretInputMode?: SecretInputMode;
};

function buildEnvSecretRef(id: string): SecretRef {
  return { source: "env", provider: DEFAULT_SECRET_PROVIDER_ALIAS, id };
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
  const coercedRef = coerceSecretRef(input);
  if (coercedRef) {
    return coercedRef;
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

>>>>>>> 4e7a833a2 (feat(security): add provider-based external secrets management)
export async function writeOAuthCredentials(
  provider: string,
  creds: OAuthCredentials,
  agentDir?: string,
): Promise<void> {
<<<<<<< HEAD
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: `${provider}:${creds.email ?? "default"}`,
=======
  const email =
    typeof creds.email === "string" && creds.email.trim() ? creds.email.trim() : "default";
  upsertAuthProfile({
    profileId: `${provider}:${email}`,
>>>>>>> 08ed62852 (chore: update deps and pi model discovery)
    credential: {
      type: "oauth",
      provider,
      ...creds,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setAnthropicApiKey(key: string, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "anthropic:default",
    credential: {
      type: "api_key",
      provider: "anthropic",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setGeminiApiKey(key: string, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "google:default",
    credential: {
      type: "api_key",
      provider: "google",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setMinimaxApiKey(key: string, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "minimax:default",
    credential: {
      type: "api_key",
      provider: "minimax",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setMoonshotApiKey(key: string, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "moonshot:default",
    credential: {
      type: "api_key",
      provider: "moonshot",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setKimiCodeApiKey(key: string, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "kimi-code:default",
    credential: {
      type: "api_key",
      provider: "kimi-code",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setSyntheticApiKey(key: string, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "synthetic:default",
    credential: {
      type: "api_key",
      provider: "synthetic",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setVeniceApiKey(key: string, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "venice:default",
    credential: {
      type: "api_key",
      provider: "venice",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export const ZAI_DEFAULT_MODEL_REF = "zai/glm-4.7";
export const OPENROUTER_DEFAULT_MODEL_REF = "openrouter/auto";
export const VERCEL_AI_GATEWAY_DEFAULT_MODEL_REF = "vercel-ai-gateway/anthropic/claude-opus-4.6";

export async function setZaiApiKey(key: string, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "zai:default",
    credential: {
      type: "api_key",
      provider: "zai",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setOpenrouterApiKey(key: string, agentDir?: string) {
  upsertAuthProfile({
    profileId: "openrouter:default",
    credential: {
      type: "api_key",
      provider: "openrouter",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setVercelAiGatewayApiKey(key: string, agentDir?: string) {
  upsertAuthProfile({
    profileId: "vercel-ai-gateway:default",
    credential: {
      type: "api_key",
      provider: "vercel-ai-gateway",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setOpencodeZenApiKey(key: string, agentDir?: string) {
  upsertAuthProfile({
    profileId: "opencode:default",
    credential: {
      type: "api_key",
      provider: "opencode",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}
