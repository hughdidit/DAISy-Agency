export type SecretRefSource = "env" | "file";

/**
 * Stable identifier for a secret in a configured source.
 * Examples:
 * - env source: "OPENAI_API_KEY"
 * - file source: "/providers/openai/api_key" (JSON pointer)
 */
export type SecretRef = {
  source: SecretRefSource;
  id: string;
};

export type SecretInput = string | SecretRef;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSecretRef(value: unknown): value is SecretRef {
  if (!isRecord(value)) {
    return false;
  }
  if (Object.keys(value).length !== 2) {
    return false;
  }
  return (
    (value.source === "env" || value.source === "file") &&
    typeof value.id === "string" &&
    value.id.trim().length > 0
  );
}

export type EnvSecretSourceConfig = {
  type?: "env";
};

<<<<<<< HEAD
export type SopsSecretSourceConfig = {
  type: "sops";
=======
export type FileSecretProviderMode = "singleValue" | "json";

export type FileSecretProviderConfig = {
  source: "file";
>>>>>>> 06290b49b (feat(secrets): finalize mode rename and validated exec docs)
  path: string;
  timeoutMs?: number;
};

<<<<<<< HEAD
=======
export type ExecSecretProviderConfig = {
  source: "exec";
  command: string;
  args?: string[];
  timeoutMs?: number;
  noOutputTimeoutMs?: number;
  maxOutputBytes?: number;
  jsonOnly?: boolean;
  env?: Record<string, string>;
  passEnv?: string[];
  trustedDirs?: string[];
  allowInsecurePath?: boolean;
  allowSymlinkCommand?: boolean;
};

export type SecretProviderConfig =
  | EnvSecretProviderConfig
  | FileSecretProviderConfig
  | ExecSecretProviderConfig;

>>>>>>> f46b9c996 (feat(secrets): allow opt-in symlink exec command paths)
export type SecretsConfig = {
  sources?: {
    env?: EnvSecretSourceConfig;
    file?: SopsSecretSourceConfig;
  };
};
