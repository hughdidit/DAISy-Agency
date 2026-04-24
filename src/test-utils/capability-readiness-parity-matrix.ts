import type {
  ResolvedCapability,
  ResolvedCapabilityClass,
} from "../shared/resolved-capability-manifest.js";

export type CapabilityParityRow = {
  subject: string;
  kind: ResolvedCapability["kind"];
  capabilityClass: ResolvedCapabilityClass;
  primaryReasonCategory:
    | null
    | "policy-block"
    | "config-gap"
    | "runtime-profile-gap"
    | "projection-defect"
    | "remote-assisted-availability"
    | "gateway-brokered-availability";
};

export const CAPABILITY_READINESS_PARITY_MATRIX: CapabilityParityRow[] = [
  {
    subject: "local-skill",
    kind: "skill",
    capabilityClass: "sandbox-local",
    primaryReasonCategory: null,
  },
  {
    subject: "web_fetch",
    kind: "tool",
    capabilityClass: "gateway-brokered",
    primaryReasonCategory: "gateway-brokered-availability",
  },
  {
    subject: "remote-mac-skill",
    kind: "skill",
    capabilityClass: "remote-node-assisted",
    primaryReasonCategory: "remote-assisted-availability",
  },
  {
    subject: "env-blocked-skill",
    kind: "skill",
    capabilityClass: "configured-but-blocked",
    primaryReasonCategory: "config-gap",
  },
  {
    subject: "browser",
    kind: "tool",
    capabilityClass: "configured-but-blocked",
    primaryReasonCategory: "policy-block",
  },
  {
    subject: "projection-defect-skill",
    kind: "skill",
    capabilityClass: "unsupported-in-current-runtime",
    primaryReasonCategory: "projection-defect",
  },
  {
    subject: "unsupported-runtime-skill",
    kind: "skill",
    capabilityClass: "unsupported-in-current-runtime",
    primaryReasonCategory: "runtime-profile-gap",
  },
];

export const CAPABILITY_PARITY_GATEWAY_SKILL_SUBJECTS = [
  "local-skill",
  "remote-mac-skill",
  "env-blocked-skill",
  "unsupported-runtime-skill",
] as const;

export const CAPABILITY_PARITY_SKILL_SUBJECTS = [
  "local-skill",
  "remote-mac-skill",
  "env-blocked-skill",
  "projection-defect-skill",
  "unsupported-runtime-skill",
] as const;

export const CAPABILITY_PARITY_READONLY_SUBJECTS = [
  "local-skill",
  "web_fetch",
  "remote-mac-skill",
  "env-blocked-skill",
  "browser",
  "projection-defect-skill",
  "unsupported-runtime-skill",
] as const;

const CAPABILITY_PARITY_ORDER = new Map(
  CAPABILITY_READINESS_PARITY_MATRIX.map((row, index) => [row.subject, index]),
);

export function sortCapabilityParityRows(rows: CapabilityParityRow[]): CapabilityParityRow[] {
  return [...rows].toSorted((left, right) => {
    const leftOrder = CAPABILITY_PARITY_ORDER.get(left.subject) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = CAPABILITY_PARITY_ORDER.get(right.subject) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }
    return left.subject.localeCompare(right.subject);
  });
}

export function filterCapabilityParityRows(subjects: readonly string[]): CapabilityParityRow[] {
  const allowed = new Set(subjects);
  return sortCapabilityParityRows(
    CAPABILITY_READINESS_PARITY_MATRIX.filter((row) => allowed.has(row.subject)),
  );
}
