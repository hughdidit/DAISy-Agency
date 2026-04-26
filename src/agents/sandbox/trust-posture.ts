import type { SandboxConfig } from "./types.js";

export type SandboxTrustPosture = "sandbox-first" | "host-compatibility";

export type SandboxTrustPostureInfo = {
  trustPosture: SandboxTrustPosture;
  trustLabel: string;
  trustSummary: string;
  correctiveAction?: string;
};

export const SANDBOX_FIRST_LABEL = "sandbox-first runtime";
export const HOST_COMPATIBILITY_LABEL = "reduced-trust host compatibility mode";
export const BREAK_GLASS_HOST_LABEL = "break-glass host authority";

export function resolveSandboxTrustPosture(params: {
  mode: SandboxConfig["mode"];
  sandboxed: boolean;
}): SandboxTrustPostureInfo {
  if (params.sandboxed) {
    return {
      trustPosture: "sandbox-first",
      trustLabel: SANDBOX_FIRST_LABEL,
      trustSummary: "Tool execution is isolated by the configured sandbox boundary.",
    };
  }

  const correctiveAction =
    params.mode === "all"
      ? undefined
      : 'Prefer sandbox-first operation with agents.defaults.sandbox.mode="all" when this workflow does not require host compatibility.';
  return {
    trustPosture: "host-compatibility",
    trustLabel: HOST_COMPATIBILITY_LABEL,
    trustSummary:
      "Tool execution runs on the gateway host and should be treated as lower trust compatibility behavior.",
    ...(correctiveAction ? { correctiveAction } : {}),
  };
}

export function formatSandboxTrustPostureLine(params: {
  mode: SandboxConfig["mode"];
  sandboxed: boolean;
}): string {
  const posture = resolveSandboxTrustPosture(params);
  return posture.trustLabel;
}
