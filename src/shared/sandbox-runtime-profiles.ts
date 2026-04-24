export const SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS = [
  "ops-readonly",
  "coding-base",
  "browser-automation",
] as const;

export type SandboxRuntimeProfileId = (typeof SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS)[number];

export type SandboxRuntimeProfileAssistance = {
  sandboxLocal: boolean;
  gatewayBrokered: boolean;
  browser: boolean;
  remoteNode: boolean;
};

export type SandboxRuntimeProfile = {
  id: SandboxRuntimeProfileId;
  label: string;
  description: string;
  intendedWorkload: string;
  trustPosture: string;
  baselineExpectations: string;
  assistance: SandboxRuntimeProfileAssistance;
};

export const DEFAULT_SANDBOX_RUNTIME_PROFILE_ID = "coding-base" as const;

export const SUPPORTED_SANDBOX_RUNTIME_PROFILES = [
  {
    id: "ops-readonly",
    label: "Ops Readonly",
    description:
      "Read-only sandbox profile for diagnostics, inspection, and other non-mutating operator workflows.",
    intendedWorkload:
      "Sandbox-safe triage, status inspection, config/state projection review, and read-only skill execution.",
    trustPosture:
      "Minimal authority with read-only projections and no implied mutable workspace or browser support.",
    baselineExpectations:
      "Should support readonly diagnostics against projected config/state/workspace inputs and fail closed when projection material is missing.",
    assistance: {
      sandboxLocal: true,
      gatewayBrokered: true,
      browser: false,
      remoteNode: false,
    },
  },
  {
    id: "coding-base",
    label: "Coding Base",
    description:
      "Default sandbox profile for normal coding and editing workflows inside the declared sandbox boundary.",
    intendedWorkload:
      "Routine code editing, repository inspection, patch application, and command execution within the configured workspace access policy.",
    trustPosture:
      "Sandbox-first coding runtime with explicit workspace access and no default guarantee of direct network egress.",
    baselineExpectations:
      "Should support ordinary coding tools inside the sandbox boundary, rely on brokered capabilities where required, and avoid assuming extra packages from setupCommand accidents.",
    assistance: {
      sandboxLocal: true,
      gatewayBrokered: true,
      browser: false,
      remoteNode: true,
    },
  },
  {
    id: "browser-automation",
    label: "Browser Automation",
    description:
      "Sandbox profile for browser and CDP-driven workflows when the sandbox browser runtime is enabled.",
    intendedWorkload:
      "Browser automation, page inspection, and web workflows that depend on the dedicated sandbox browser container.",
    trustPosture:
      "Sandboxed browser workload with isolated browser runtime and explicit broker/browser enablement requirements.",
    baselineExpectations:
      "Should pair the normal sandbox runtime with the dedicated sandbox browser runtime and must not claim browser support when browser sandboxing is disabled.",
    assistance: {
      sandboxLocal: true,
      gatewayBrokered: true,
      browser: true,
      remoteNode: false,
    },
  },
] as const satisfies readonly SandboxRuntimeProfile[];

const SANDBOX_RUNTIME_PROFILE_BY_ID = new Map<SandboxRuntimeProfileId, SandboxRuntimeProfile>(
  SUPPORTED_SANDBOX_RUNTIME_PROFILES.map((profile) => [profile.id, profile]),
);

export function isSandboxRuntimeProfileId(value: unknown): value is SandboxRuntimeProfileId {
  return (
    typeof value === "string" &&
    SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS.includes(value as SandboxRuntimeProfileId)
  );
}

export function getSandboxRuntimeProfile(
  id: SandboxRuntimeProfileId,
): SandboxRuntimeProfile | undefined {
  return SANDBOX_RUNTIME_PROFILE_BY_ID.get(id);
}

