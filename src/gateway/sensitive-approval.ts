import { DEFAULT_EXEC_APPROVAL_TIMEOUT_MS } from "../infra/exec-approvals.js";
import {
  classifySensitiveAction,
  isSensitiveApprovalCategory,
  type SensitiveActionClassification,
} from "../infra/sensitive-actions.js";
import { ADMIN_SCOPE } from "./method-scopes.js";
import { GATEWAY_CLIENT_IDS } from "./protocol/client-info.js";
import { ErrorCodes, errorShape } from "./protocol/index.js";
import type { GatewayClient, GatewayRequestContext, RespondFn } from "./server-methods/types.js";

const SENSITIVE_APPROVAL_SKIP_METHODS = new Set([
  "exec.approval.request",
  "exec.approval.waitDecision",
  "exec.approval.resolve",
]);

function resolveRequesterLabel(client: GatewayClient | null): string | null {
  return client?.connect?.client?.displayName ?? client?.connect?.client?.id ?? null;
}

function hasControlUiAdminScope(client: GatewayClient | null): boolean {
  return (
    client?.connect?.client?.id === GATEWAY_CLIENT_IDS.CONTROL_UI &&
    (client.connect.scopes ?? []).includes(ADMIN_SCOPE)
  );
}

async function awaitSensitiveGatewayApproval(params: {
  context: GatewayRequestContext;
  classification: SensitiveActionClassification;
  method: string;
  client: GatewayClient | null;
}): Promise<"approved" | "denied"> {
  const manager = params.context.execApprovalManager;
  if (!manager) {
    return "denied";
  }
  const record = manager.create(
    {
      command: `[${params.classification.category}] ${params.method}\n${params.classification.operationPreview}`,
      host: "gateway",
      security: "full",
      ask: "always",
      category: params.classification.category,
      operationHash: params.classification.operationHash,
      operationPreview: params.classification.operationPreview,
    },
    DEFAULT_EXEC_APPROVAL_TIMEOUT_MS,
  );
  record.requestedByConnId = params.client?.connId ?? null;
  record.requestedByDeviceId = params.client?.connect?.device?.id ?? null;
  record.requestedByClientId = params.client?.connect?.client?.id ?? null;

  let decisionPromise: Promise<import("../infra/exec-approvals.js").ExecApprovalDecision | null>;
  try {
    decisionPromise = manager.register(record, DEFAULT_EXEC_APPROVAL_TIMEOUT_MS);
  } catch {
    return "denied";
  }

  params.context.broadcast(
    "exec.approval.requested",
    {
      id: record.id,
      request: record.request,
      createdAtMs: record.createdAtMs,
      expiresAtMs: record.expiresAtMs,
    },
    { dropIfSlow: true },
  );

  if (!params.context.hasExecApprovalClients?.()) {
    manager.expire(record.id, "auto-expire:no-approver-clients");
  }

  const decision = await decisionPromise;
  if (decision !== "allow-once") {
    return "denied";
  }
  return manager.consumeAllowOnce(record.id) ? "approved" : "denied";
}

export async function requireSensitiveGatewayApprovalIfNeeded(params: {
  method: string;
  requestParams: unknown;
  client: GatewayClient | null;
  context: GatewayRequestContext;
  respond: RespondFn;
}): Promise<boolean> {
  if (SENSITIVE_APPROVAL_SKIP_METHODS.has(params.method)) {
    return true;
  }
  const classification = classifySensitiveAction({
    surface: "gateway",
    method: params.method,
    payload: params.requestParams,
  });
  if (!classification || !isSensitiveApprovalCategory(classification.category)) {
    return true;
  }
  if (classification.category === "deletion" && hasControlUiAdminScope(params.client)) {
    return true;
  }

  const result = await awaitSensitiveGatewayApproval({
    context: params.context,
    classification,
    method: params.method,
    client: params.client,
  });
  if (result === "approved") {
    return true;
  }
  const requester = resolveRequesterLabel(params.client);
  params.respond(
    false,
    undefined,
    errorShape(
      ErrorCodes.INVALID_REQUEST,
      `Sensitive ${classification.category} action blocked: Hugh approval was not granted for this exact operation.`,
      requester ? { details: { requester } } : undefined,
    ),
  );
  return false;
}
