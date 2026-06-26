import {
  DEFAULT_EXEC_APPROVAL_TIMEOUT_MS,
  type ExecApprovalDecision,
} from "../infra/exec-approvals.js";
import {
  classifySensitiveAction,
  type SensitiveActionClassification,
} from "../infra/sensitive-actions.js";
import { callGatewayTool } from "./tools/gateway.js";

export type SensitiveToolApprovalParams = {
  toolName: string;
  params: unknown;
  agentId?: string;
  sessionKey?: string;
};

function parseDecision(value: unknown): ExecApprovalDecision | null {
  if (!value || typeof value !== "object" || !Object.hasOwn(value, "decision")) {
    return null;
  }
  const decision = (value as { decision?: unknown }).decision;
  return decision === "allow-once" || decision === "allow-always" || decision === "deny"
    ? decision
    : null;
}

async function waitForSensitiveApprovalDecision(id: string): Promise<ExecApprovalDecision | null> {
  try {
    const result = await callGatewayTool<{ decision?: unknown }>(
      "exec.approval.waitDecision",
      { timeoutMs: DEFAULT_EXEC_APPROVAL_TIMEOUT_MS + 5_000 },
      { id },
    );
    return parseDecision(result);
  } catch (err) {
    if (String(err).toLowerCase().includes("approval expired or not found")) {
      return null;
    }
    throw err;
  }
}

async function requestSensitiveApproval(params: {
  toolName: string;
  classification: SensitiveActionClassification;
  agentId?: string;
  sessionKey?: string;
}): Promise<ExecApprovalDecision | null> {
  const registration = await callGatewayTool<{ id?: string; decision?: unknown }>(
    "exec.approval.request",
    { timeoutMs: DEFAULT_EXEC_APPROVAL_TIMEOUT_MS + 5_000 },
    {
      command: `[${params.classification.category}] ${params.toolName}\n${params.classification.operationPreview}`,
      host: "gateway",
      category: params.classification.category,
      operationHash: params.classification.operationHash,
      operationPreview: params.classification.operationPreview,
      agentId: params.agentId,
      sessionKey: params.sessionKey,
      timeoutMs: DEFAULT_EXEC_APPROVAL_TIMEOUT_MS,
      twoPhase: true,
    },
    { expectFinal: false },
  );
  const preResolvedDecision = parseDecision(registration);
  if (preResolvedDecision) {
    return preResolvedDecision;
  }
  const approvalId =
    typeof registration.id === "string" && registration.id.trim().length > 0
      ? registration.id.trim()
      : null;
  return approvalId ? waitForSensitiveApprovalDecision(approvalId) : null;
}

export async function requireSensitiveToolApproval(
  params: SensitiveToolApprovalParams,
): Promise<void> {
  const classification = classifySensitiveAction({
    surface: "tool",
    toolName: params.toolName,
    payload: params.params,
    agentId: params.agentId,
    sessionKey: params.sessionKey,
  });
  if (!classification) {
    return;
  }

  const decision = await requestSensitiveApproval({
    toolName: params.toolName,
    classification,
    agentId: params.agentId,
    sessionKey: params.sessionKey,
  });
  if (decision !== "allow-once") {
    throw new Error(
      `Sensitive ${classification.category} action blocked: Hugh approval was not granted for this exact operation.`,
    );
  }
}
