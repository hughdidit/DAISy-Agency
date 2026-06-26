import type { ExecApprovalForwarder } from "../../infra/exec-approval-forwarder.js";
import {
  DEFAULT_EXEC_APPROVAL_TIMEOUT_MS,
  type ExecApprovalDecision,
} from "../../infra/exec-approvals.js";
import { isSensitiveApprovalCategory } from "../../infra/sensitive-actions.js";
import { buildSystemRunApprovalBinding } from "../../infra/system-run-approval-binding.js";
import { resolveSystemRunApprovalRequestContext } from "../../infra/system-run-approval-context.js";
import type { ExecApprovalManager } from "../exec-approval-manager.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateExecApprovalRequestParams,
  validateExecApprovalResolveParams,
} from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

function normalizeOperationHash(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return SHA256_HEX_RE.test(trimmed) ? trimmed : null;
}

export function createExecApprovalHandlers(
  manager: ExecApprovalManager,
  opts?: { forwarder?: ExecApprovalForwarder },
): GatewayRequestHandlers {
  const hasApprovalClients = (context: { hasExecApprovalClients?: () => boolean }) => {
    if (typeof context.hasExecApprovalClients === "function") {
      return context.hasExecApprovalClients();
    }
    // Fail closed when no operator-scope probe is available.
    return false;
  };

  return {
    "exec.approval.request": async ({ params, respond, context, client }) => {
      if (!validateExecApprovalRequestParams(params)) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            `invalid exec.approval.request params: ${formatValidationErrors(
              validateExecApprovalRequestParams.errors,
            )}`,
          ),
        );
        return;
      }
      const p = params as {
        id?: string;
        command: string;
        category?: "exec" | "financial" | "deletion";
        operationHash?: string | null;
        operationPreview?: string | null;
        commandArgv?: string[];
        env?: Record<string, string>;
        cwd?: string;
        systemRunPlan?: unknown;
        nodeId?: string;
        host?: string;
        security?: string;
        ask?: string;
        agentId?: string;
        resolvedPath?: string;
        sessionKey?: string;
        turnSourceChannel?: string;
        turnSourceTo?: string;
        turnSourceAccountId?: string;
        turnSourceThreadId?: string | number;
        timeoutMs?: number;
        twoPhase?: boolean;
      };
      const twoPhase = p.twoPhase === true;
      const category: "exec" | "financial" | "deletion" = isSensitiveApprovalCategory(p.category)
        ? p.category
        : "exec";
      const operationHash = normalizeOperationHash(p.operationHash);
      if (isSensitiveApprovalCategory(category) && !operationHash) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            "operationHash is required for financial and deletion approvals",
          ),
        );
        return;
      }
      const timeoutMs =
        typeof p.timeoutMs === "number" ? p.timeoutMs : DEFAULT_EXEC_APPROVAL_TIMEOUT_MS;
      const explicitId = typeof p.id === "string" && p.id.trim().length > 0 ? p.id.trim() : null;
      const host = typeof p.host === "string" ? p.host.trim() : "";
      const nodeId = typeof p.nodeId === "string" ? p.nodeId.trim() : "";
      const approvalContext = resolveSystemRunApprovalRequestContext({
        host,
        command: p.command,
        commandArgv: p.commandArgv,
        systemRunPlan: p.systemRunPlan,
        cwd: p.cwd,
        agentId: p.agentId,
        sessionKey: p.sessionKey,
      });
      const effectiveCommandArgv = approvalContext.commandArgv;
      const effectiveCwd = approvalContext.cwd;
      const effectiveAgentId = approvalContext.agentId;
      const effectiveSessionKey = approvalContext.sessionKey;
      const effectiveCommandText = approvalContext.commandText;
      if (host === "node" && !nodeId) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "nodeId is required for host=node"),
        );
        return;
      }
      if (host === "node" && !approvalContext.plan) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "systemRunPlan is required for host=node"),
        );
        return;
      }
      if (
        host === "node" &&
        (!Array.isArray(effectiveCommandArgv) || effectiveCommandArgv.length === 0)
      ) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "commandArgv is required for host=node"),
        );
        return;
      }
      const systemRunBinding =
        host === "node"
          ? buildSystemRunApprovalBinding({
              argv: effectiveCommandArgv,
              cwd: effectiveCwd,
              agentId: effectiveAgentId,
              sessionKey: effectiveSessionKey,
              env: p.env,
            })
          : null;
      if (explicitId && manager.getSnapshot(explicitId)) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "approval id already pending"),
        );
        return;
      }
      const request = {
        command: effectiveCommandText,
        category,
        operationHash,
        operationPreview:
          typeof p.operationPreview === "string" ? p.operationPreview.slice(0, 2_000) : null,
        commandArgv: effectiveCommandArgv,
        envKeys: systemRunBinding?.envKeys?.length ? systemRunBinding.envKeys : undefined,
        systemRunBinding: systemRunBinding?.binding ?? null,
        systemRunPlan: approvalContext.plan,
        cwd: effectiveCwd ?? null,
        nodeId: host === "node" ? nodeId : null,
        host: host || null,
        security: p.security ?? null,
        ask: p.ask ?? null,
        agentId: effectiveAgentId ?? null,
        resolvedPath: p.resolvedPath ?? null,
        sessionKey: effectiveSessionKey ?? null,
        turnSourceChannel:
          typeof p.turnSourceChannel === "string" ? p.turnSourceChannel.trim() || null : null,
        turnSourceTo: typeof p.turnSourceTo === "string" ? p.turnSourceTo.trim() || null : null,
        turnSourceAccountId:
          typeof p.turnSourceAccountId === "string" ? p.turnSourceAccountId.trim() || null : null,
        turnSourceThreadId: p.turnSourceThreadId ?? null,
      };
      const record = manager.create(request, timeoutMs, explicitId);
      record.requestedByConnId = client?.connId ?? null;
      record.requestedByDeviceId = client?.connect?.device?.id ?? null;
      record.requestedByClientId = client?.connect?.client?.id ?? null;
      // Use register() to synchronously add to pending map before sending any response.
      // This ensures the approval ID is valid immediately after the "accepted" response.
      let decisionPromise: Promise<
        import("../../infra/exec-approvals.js").ExecApprovalDecision | null
      >;
      try {
        decisionPromise = manager.register(record, timeoutMs);
      } catch (err) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `registration failed: ${String(err)}`),
        );
        return;
      }
      context.broadcast(
        "exec.approval.requested",
        {
          id: record.id,
          request: record.request,
          createdAtMs: record.createdAtMs,
          expiresAtMs: record.expiresAtMs,
        },
        { dropIfSlow: true },
      );
      let forwardedToTargets = false;
      if (opts?.forwarder) {
        try {
          forwardedToTargets = await opts.forwarder.handleRequested({
            id: record.id,
            request: record.request,
            createdAtMs: record.createdAtMs,
            expiresAtMs: record.expiresAtMs,
          });
        } catch (err) {
          context.logGateway?.error?.(`exec approvals: forward request failed: ${String(err)}`);
        }
      }

      if (!hasApprovalClients(context) && !forwardedToTargets) {
        manager.expire(record.id, "auto-expire:no-approver-clients");
      }

      // Only send immediate "accepted" response when twoPhase is requested.
      // This preserves single-response semantics for existing callers.
      if (twoPhase) {
        respond(
          true,
          {
            status: "accepted",
            id: record.id,
            createdAtMs: record.createdAtMs,
            expiresAtMs: record.expiresAtMs,
          },
          undefined,
        );
      }

      const decision = await decisionPromise;
      const responseDecision =
        !twoPhase &&
        isSensitiveApprovalCategory(record.request.category) &&
        decision === "allow-once"
          ? manager.consumeAllowOnce(record.id)
            ? decision
            : null
          : decision;
      // Send final response with decision for callers using expectFinal:true.
      respond(
        true,
        {
          id: record.id,
          decision: responseDecision,
          createdAtMs: record.createdAtMs,
          expiresAtMs: record.expiresAtMs,
        },
        undefined,
      );
    },
    "exec.approval.waitDecision": async ({ params, respond }) => {
      const p = params as { id?: string };
      const id = typeof p.id === "string" ? p.id.trim() : "";
      if (!id) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "id is required"));
        return;
      }
      const decisionPromise = manager.awaitDecision(id);
      if (!decisionPromise) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "approval expired or not found"),
        );
        return;
      }
      // Capture snapshot before await (entry may be deleted after grace period)
      const snapshot = manager.getSnapshot(id);
      const decision = await decisionPromise;
      const responseDecision =
        isSensitiveApprovalCategory(snapshot?.request.category) && decision === "allow-once"
          ? manager.consumeAllowOnce(id)
            ? decision
            : null
          : decision;
      // Return decision (can be null on timeout) - let clients handle via askFallback
      respond(
        true,
        {
          id,
          decision: responseDecision,
          createdAtMs: snapshot?.createdAtMs,
          expiresAtMs: snapshot?.expiresAtMs,
        },
        undefined,
      );
    },
    "exec.approval.resolve": async ({ params, respond, client, context }) => {
      if (!validateExecApprovalResolveParams(params)) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.INVALID_REQUEST,
            `invalid exec.approval.resolve params: ${formatValidationErrors(
              validateExecApprovalResolveParams.errors,
            )}`,
          ),
        );
        return;
      }
      const p = params as { id: string; decision: string; operationHash?: string | null };
      const decision = p.decision as ExecApprovalDecision;
      if (decision !== "allow-once" && decision !== "allow-always" && decision !== "deny") {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "invalid decision"));
        return;
      }
      const snapshot = manager.getSnapshot(p.id);
      if (!snapshot) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown approval id"));
        return;
      }
      if (isSensitiveApprovalCategory(snapshot.request.category)) {
        if (decision === "allow-always") {
          respond(
            false,
            undefined,
            errorShape(
              ErrorCodes.INVALID_REQUEST,
              "allow-always is not permitted for financial or deletion approvals",
            ),
          );
          return;
        }
        const suppliedHash = normalizeOperationHash(p.operationHash);
        if (!snapshot.request.operationHash || suppliedHash !== snapshot.request.operationHash) {
          respond(
            false,
            undefined,
            errorShape(ErrorCodes.INVALID_REQUEST, "operationHash does not match approval request"),
          );
          return;
        }
      }
      const resolvedBy = client?.connect?.client?.displayName ?? client?.connect?.client?.id;
      const ok = manager.resolve(p.id, decision, resolvedBy ?? null);
      if (!ok) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown approval id"));
        return;
      }
      context.broadcast(
        "exec.approval.resolved",
        { id: p.id, decision, resolvedBy, ts: Date.now(), request: snapshot?.request },
        { dropIfSlow: true },
      );
      void opts?.forwarder
        ?.handleResolved({
          id: p.id,
          decision,
          resolvedBy,
          ts: Date.now(),
          request: snapshot?.request,
        })
        .catch((err) => {
          context.logGateway?.error?.(`exec approvals: forward resolve failed: ${String(err)}`);
        });
      respond(true, { ok: true }, undefined);
    },
  };
}
