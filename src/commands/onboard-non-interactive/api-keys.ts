import {
  ensureAuthProfileStore,
  resolveApiKeyForProfile,
  resolveAuthProfileOrder,
} from "../../agents/auth-profiles.js";
import { resolveEnvApiKey } from "../../agents/model-auth.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { MoltbotConfig } from "../../config/config.js";
import type { RuntimeEnv } from "../../runtime.js";
=======
=======
import type { OpenClawConfig } from "../../config/config.js";
import type { RuntimeEnv } from "../../runtime.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { OpenClawConfig } from "../../config/config.js";
import type { RuntimeEnv } from "../../runtime.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { OpenClawConfig } from "../../config/config.js";
import type { RuntimeEnv } from "../../runtime.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { normalizeOptionalSecretInput } from "../../utils/normalize-secret-input.js";
<<<<<<< HEAD
>>>>>>> 42a07791c (fix(auth): strip line breaks from pasted keys)
=======
import type { SecretInputMode } from "../onboard-types.js";
>>>>>>> 5e3a86fd2 (feat(secrets): expand onboarding secret-ref flows and custom-provider parity)

export type NonInteractiveApiKeySource = "flag" | "env" | "profile";

function parseEnvVarNameFromSourceLabel(source: string | undefined): string | undefined {
  if (!source) {
    return undefined;
  }
  const match = /^(?:shell env: |env: )([A-Z][A-Z0-9_]*)$/.exec(source.trim());
  return match?.[1];
}

async function resolveApiKeyFromProfiles(params: {
  provider: string;
  cfg: MoltbotConfig;
  agentDir?: string;
}): Promise<string | null> {
  const store = ensureAuthProfileStore(params.agentDir);
  const order = resolveAuthProfileOrder({
    cfg: params.cfg,
    store,
    provider: params.provider,
  });
  for (const profileId of order) {
    const cred = store.profiles[profileId];
    if (cred?.type !== "api_key") {
      continue;
    }
    const resolved = await resolveApiKeyForProfile({
      cfg: params.cfg,
      store,
      profileId,
      agentDir: params.agentDir,
    });
    if (resolved?.apiKey) {
      return resolved.apiKey;
    }
  }
  return null;
}

export async function resolveNonInteractiveApiKey(params: {
  provider: string;
  cfg: MoltbotConfig;
  flagValue?: string;
  flagName: string;
  envVar: string;
  envVarName?: string;
  runtime: RuntimeEnv;
  agentDir?: string;
  allowProfile?: boolean;
  required?: boolean;
  secretInputMode?: SecretInputMode;
}): Promise<{ key: string; source: NonInteractiveApiKeySource; envVarName?: string } | null> {
  const flagKey = normalizeOptionalSecretInput(params.flagValue);
  const envResolved = resolveEnvApiKey(params.provider);
  const explicitEnvVar = params.envVarName?.trim();
  const explicitEnvKey = explicitEnvVar
    ? normalizeOptionalSecretInput(process.env[explicitEnvVar])
    : undefined;
  const resolvedEnvKey = envResolved?.apiKey ?? explicitEnvKey;
  const resolvedEnvVarName = parseEnvVarNameFromSourceLabel(envResolved?.source) ?? explicitEnvVar;

  if (params.secretInputMode === "ref") {
    if (!resolvedEnvKey && flagKey) {
      params.runtime.error(
        [
          `${params.flagName} cannot be used with --secret-input-mode ref unless ${params.envVar} is set in env.`,
          `Set ${params.envVar} in env and omit ${params.flagName}, or use --secret-input-mode plaintext.`,
        ].join("\n"),
      );
      params.runtime.exit(1);
      return null;
    }
    if (resolvedEnvKey) {
      if (!resolvedEnvVarName) {
        params.runtime.error(
          [
            `--secret-input-mode ref requires an explicit environment variable for provider "${params.provider}".`,
            `Set ${params.envVar} in env and retry, or use --secret-input-mode plaintext.`,
          ].join("\n"),
        );
        params.runtime.exit(1);
        return null;
      }
      return { key: resolvedEnvKey, source: "env", envVarName: resolvedEnvVarName };
    }
  }

  if (flagKey) {
    return { key: flagKey, source: "flag" };
  }

  if (resolvedEnvKey) {
    return { key: resolvedEnvKey, source: "env", envVarName: resolvedEnvVarName };
  }

  if (params.allowProfile ?? true) {
    const profileKey = await resolveApiKeyFromProfiles({
      provider: params.provider,
      cfg: params.cfg,
      agentDir: params.agentDir,
    });
    if (profileKey) {
      return { key: profileKey, source: "profile" };
    }
  }

  if (params.required === false) {
    return null;
  }

  const profileHint =
    params.allowProfile === false ? "" : `, or existing ${params.provider} API-key profile`;
  params.runtime.error(`Missing ${params.flagName} (or ${params.envVar} in env${profileHint}).`);
  params.runtime.exit(1);
  return null;
}
