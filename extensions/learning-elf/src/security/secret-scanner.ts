export type SecretFinding = {
  pattern: string;
  message: string;
};

const SECRET_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: ["BEGIN", "PRIVATE", "KEY"].join(" "), regex: /BEGIN\s+PRIVATE\s+KEY/i },
  { label: "api_key=", regex: /api_key\s*=/i },
  { label: "OPENAI_API_KEY", regex: /OPENAI_API_KEY/i },
  { label: "ANTHROPIC_API_KEY", regex: /ANTHROPIC_API_KEY/i },
  { label: "GITHUB_TOKEN", regex: /GITHUB_TOKEN/i },
  { label: "GOOGLE_APPLICATION_CREDENTIALS", regex: /GOOGLE_APPLICATION_CREDENTIALS/i },
  { label: "refresh_token", regex: /refresh_token/i },
  { label: "access_token", regex: /access_token/i },
  { label: "client_secret", regex: /client_secret/i },
  { label: "password=", regex: /password\s*=/i },
  { label: "mongodb+srv://", regex: /mongodb\+srv:\/\//i },
  { label: "Bearer", regex: /Bearer\s+[A-Za-z0-9._~+/=-]+/i },
];

function toScanText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export function scanForSecrets(value: unknown): SecretFinding[] {
  const text = toScanText(value);
  return SECRET_PATTERNS.filter((pattern) => pattern.regex.test(text)).map((pattern) => ({
    pattern: pattern.label,
    message: `Secret-like content rejected: ${pattern.label}`,
  }));
}

export function assertNoSecrets(value: unknown): void {
  const findings = scanForSecrets(value);
  if (findings.length > 0) {
    throw new Error(findings.map((finding) => finding.message).join("; "));
  }
}
