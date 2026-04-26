import { formatCliCommand } from "../../cli/command-format.js";

export const SANDBOX_FAILURE_CLASSES = [
  "runtime-capability",
  "config-error",
  "policy-block",
  "projection-defect",
  "gateway-reachability",
  "unsupported-host-only",
] as const;

export type SandboxFailureClass = (typeof SANDBOX_FAILURE_CLASSES)[number];

export type SandboxFailureMessageInput = {
  failureClass: SandboxFailureClass;
  operation: string;
  subject?: string;
  detail?: string;
  remediation?: string;
  hint?: string;
  cause?: string;
};

export type SandboxFailureClassification = SandboxFailureMessageInput & {
  sanitizedCause?: string;
};

const SANDBOX_FAILURE_LABELS: Record<SandboxFailureClass, string> = {
  "runtime-capability": "Sandbox runtime capability failure",
  "config-error": "Sandbox config error",
  "policy-block": "Sandbox policy block",
  "projection-defect": "Sandbox projection defect",
  "gateway-reachability": "Sandbox gateway reachability failure",
  "unsupported-host-only": "Sandbox unsupported host-only operation",
};

const DEFAULT_DETAILS: Record<SandboxFailureClass, string> = {
  "runtime-capability": "The configured sandbox runtime cannot provide the requested capability.",
  "config-error": "Sandbox configuration is incomplete or inconsistent.",
  "policy-block": "Sandbox policy blocked the requested action.",
  "projection-defect": "Required sandbox-projected files or manifests are missing.",
  "gateway-reachability": "The sandboxed flow cannot reach the required gateway or broker path.",
  "unsupported-host-only":
    "The requested operation depends on host execution and is not supported from this sandboxed context.",
};

const DEFAULT_REMEDIATION: Record<SandboxFailureClass, string> = {
  "runtime-capability":
    "Check Docker CLI/socket access, the configured sandbox image, and the selected runtime profile.",
  "config-error": "Set the missing sandbox configuration or required environment value.",
  "policy-block": "Adjust the relevant sandbox policy only if this capability should be allowed.",
  "projection-defect":
    "Repair the sandbox projection so required files, plugin material, and manifests are present.",
  "gateway-reachability":
    "Restore or configure a reachable gateway/provider path for the sandboxed runtime.",
  "unsupported-host-only":
    'Use a sandbox-supported alternative such as runtime="subagent" or a sandboxed target agent.',
};

const LOW_LEVEL_RUNTIME_PATTERNS = [
  /runtime\/cgo:/i,
  /goroutine \d+/i,
  /\bSIG(?:ABRT|SEGV|BUS|ILL)\b/i,
  /pthread_create failed/i,
  /stack trace/i,
];

function normalizeSentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return /[.!?)]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function normalizeInline(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitizeSandboxFailureCause(cause: string | undefined): string | undefined {
  const trimmed = cause?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (LOW_LEVEL_RUNTIME_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return "low-level runtime crash details redacted";
  }
  const firstLine = trimmed
    .split(/\r?\n/)
    .find((line) => line.trim())
    ?.trim();
  if (!firstLine) {
    return undefined;
  }
  return firstLine.length > 180 ? `${firstLine.slice(0, 177)}...` : firstLine;
}

export function formatSandboxFailureMessage(input: SandboxFailureMessageInput): string {
  const label = SANDBOX_FAILURE_LABELS[input.failureClass];
  const operation = normalizeInline(input.operation);
  const subject = normalizeInline(input.subject ?? "");
  const detail = normalizeSentence(
    input.detail?.trim() ? input.detail : DEFAULT_DETAILS[input.failureClass],
  );
  const remediation = normalizeSentence(
    input.remediation?.trim() ? input.remediation : DEFAULT_REMEDIATION[input.failureClass],
  );
  const hint = normalizeInline(input.hint ?? "");
  const sanitizedCause = sanitizeSandboxFailureCause(input.cause);

  const parts = [
    `${label}${operation ? ` during ${operation}` : ""}${subject ? ` (${subject})` : ""}: ${detail}`,
    `Fix: ${remediation}`,
  ];
  if (hint) {
    parts.push(`See: ${normalizeSentence(hint)}`);
  }
  if (sanitizedCause) {
    parts.push(`Cause: ${sanitizedCause}.`);
  }
  return parts.join(" ");
}

function buildDockerImageHint(): string {
  return formatCliCommand("openclaw doctor sandbox");
}

export function classifySandboxFailureText(
  text: string | undefined,
): SandboxFailureClassification | null {
  const raw = text?.trim();
  if (!raw) {
    return null;
  }
  const normalized = normalizeInline(raw);

  if (/Failed to inspect sandbox image/i.test(normalized)) {
    return {
      failureClass: "runtime-capability",
      operation: "sandbox startup",
      subject: "sandbox image inspection",
      detail: "Docker CLI could not inspect the sandbox image in the gateway runtime.",
      remediation:
        "Check Docker CLI/socket access and provision the configured sandbox image/profile.",
      hint: buildDockerImageHint(),
      cause: raw.replace(/^Failed to inspect sandbox image:?\s*/i, ""),
      sanitizedCause: sanitizeSandboxFailureCause(raw),
    };
  }

  if (
    /Sandbox mode requires Docker/i.test(normalized) ||
    /docker.*command was not found/i.test(normalized)
  ) {
    return {
      failureClass: "runtime-capability",
      operation: "sandbox startup",
      subject: "Docker CLI",
      detail: "Docker CLI is unavailable to the gateway runtime.",
      remediation: "Install Docker and ensure the docker command and socket are available.",
      hint: buildDockerImageHint(),
      cause: raw,
      sanitizedCause: sanitizeSandboxFailureCause(raw),
    };
  }

  const missingImage = normalized.match(
    /Sandbox(?: browser)? image not found:\s*((?:[^\s.]|\.(?!\s|$))+)/i,
  );
  if (missingImage) {
    return {
      failureClass: "runtime-capability",
      operation: "sandbox startup",
      subject: `image ${missingImage[1]}`,
      detail: "The configured sandbox image is not available to Docker.",
      remediation: "Build, pull, or deploy the configured sandbox image/profile before retrying.",
      hint: buildDockerImageHint(),
      cause: raw,
      sanitizedCause: sanitizeSandboxFailureCause(raw),
    };
  }

  if (/blocked by sandbox tool policy|sandbox policy block/i.test(normalized)) {
    return {
      failureClass: "policy-block",
      operation: "tool invocation",
      detail: "Sandbox policy blocked the requested tool or capability.",
      remediation: DEFAULT_REMEDIATION["policy-block"],
      cause: raw,
      sanitizedCause: sanitizeSandboxFailureCause(raw),
    };
  }

  if (
    /missing projected|missing required paths|missing-projection|projection defect/i.test(
      normalized,
    )
  ) {
    return {
      failureClass: "projection-defect",
      operation: "sandbox diagnostics",
      detail: "Required projected sandbox material is missing.",
      remediation: DEFAULT_REMEDIATION["projection-defect"],
      cause: raw,
      sanitizedCause: sanitizeSandboxFailureCause(raw),
    };
  }

  if (
    /gateway.*unreachable|gateway reachability|gateway-brokered-availability|probe unsupported from readonly sandbox|readonly-sandbox-local-loopback-unsupported/i.test(
      normalized,
    )
  ) {
    return {
      failureClass: "gateway-reachability",
      operation: "sandbox gateway probe",
      detail:
        /readonly-sandbox-local-loopback-unsupported|probe unsupported from readonly sandbox/i.test(
          normalized,
        )
          ? "A host-loopback gateway probe is unsupported from readonly sandbox context."
          : "The required gateway or broker path is unavailable.",
      remediation: DEFAULT_REMEDIATION["gateway-reachability"],
      cause: raw,
      sanitizedCause: sanitizeSandboxFailureCause(raw),
    };
  }

  if (
    /Sandboxed sessions cannot spawn ACP sessions|runtime="acp" runs on the host|Sandboxed sessions cannot spawn unsandboxed subagents|sandbox="require".*(?:runtime="acp"|unsandboxed|sandboxed target runtime)/i.test(
      normalized,
    )
  ) {
    return {
      failureClass: "unsupported-host-only",
      operation: "session spawn",
      detail:
        "The requested spawn path depends on host execution and is blocked from this sandboxed context.",
      remediation: DEFAULT_REMEDIATION["unsupported-host-only"],
      cause: raw,
      sanitizedCause: sanitizeSandboxFailureCause(raw),
    };
  }

  if (/missing required (?:environment|config)|missing-required-(?:env|config)/i.test(normalized)) {
    return {
      failureClass: "config-error",
      operation: "capability resolution",
      detail: "A required sandbox configuration or environment value is missing.",
      remediation: DEFAULT_REMEDIATION["config-error"],
      cause: raw,
      sanitizedCause: sanitizeSandboxFailureCause(raw),
    };
  }

  return null;
}
