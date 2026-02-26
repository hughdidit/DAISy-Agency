import { sanitizeBinaryOutput } from "../../agents/shell-utils.js";
import type { ExecApprovalDecision } from "../../infra/exec-approvals.js";
import type { ExecApprovalForwarder } from "../../infra/exec-approval-forwarder.js";
<<<<<<< HEAD
=======
import {
  DEFAULT_EXEC_APPROVAL_TIMEOUT_MS,
  type ExecApprovalDecision,
} from "../../infra/exec-approvals.js";
import { buildSystemRunApprovalBindingV1 } from "../../infra/system-run-approval-binding.js";
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
import type { ExecApprovalManager } from "../exec-approval-manager.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateExecApprovalRequestParams,
  validateExecApprovalResolveParams,
} from "../protocol/index.js";
<<<<<<< HEAD
import { buildSystemRunApprovalEnvBinding } from "../system-run-approval-env-binding.js";
=======
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
import type { GatewayRequestHandlers } from "./types.js";

export function createExecApprovalHandlers(
  manager: ExecApprovalManager,
  opts?: { forwarder?: ExecApprovalForwarder },
): GatewayRequestHandlers {
  return {
    "exec.approval.request": async ({ params, respond, context }) => {
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
        commandArgv?: string[];
        env?: Record<string, string>;
        cwd?: string;
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
      };
      const timeoutMs = typeof p.timeoutMs === "number" ? p.timeoutMs : 120_000;
      const explicitId = typeof p.id === "string" && p.id.trim().length > 0 ? p.id.trim() : null;
<<<<<<< HEAD
=======
      const host = typeof p.host === "string" ? p.host.trim() : "";
      const nodeId = typeof p.nodeId === "string" ? p.nodeId.trim() : "";
      const commandArgv = Array.isArray(p.commandArgv)
        ? p.commandArgv.map((entry) => String(entry))
        : undefined;
<<<<<<< HEAD
      const envBinding = buildSystemRunApprovalEnvBinding(p.env);
=======
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
      if (host === "node" && !nodeId) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "nodeId is required for host=node"),
        );
        return;
      }
<<<<<<< HEAD
>>>>>>> 03e689fc8 (fix(security): bind system.run approvals to argv identity)
=======
      if (host === "node" && (!Array.isArray(commandArgv) || commandArgv.length === 0)) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "commandArgv is required for host=node"),
        );
        return;
      }
      const systemRunBindingV1 =
        host === "node"
          ? buildSystemRunApprovalBindingV1({
              argv: commandArgv,
              cwd: p.cwd,
              agentId: p.agentId,
              sessionKey: p.sessionKey,
              env: p.env,
            })
          : null;
>>>>>>> 10481097f (refactor(security): enforce v1 node exec approval binding)
      if (explicitId && manager.getSnapshot(explicitId)) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "approval id already pending"),
        );
        return;
      }
      const request = {
<<<<<<< HEAD
        command: sanitizeBinaryOutput(p.command).replace(/\r/g, ""),
=======
        command: p.command,
        commandArgv,
<<<<<<< HEAD
>>>>>>> 03e689fc8 (fix(security): bind system.run approvals to argv identity)
=======
        envHash: envBinding.envHash,
        envKeys: envBinding.envKeys.length > 0 ? envBinding.envKeys : undefined,
>>>>>>> 9a4b2266c (fix(security): bind node system.run approvals to env)
        cwd: p.cwd ?? null,
        host: p.host ?? null,
        security: p.security ?? null,
        ask: p.ask ?? null,
        agentId: p.agentId ?? null,
        resolvedPath: p.resolvedPath ?? null,
        sessionKey: p.sessionKey ?? null,
        turnSourceChannel:
          typeof p.turnSourceChannel === "string" ? p.turnSourceChannel.trim() || null : null,
        turnSourceTo: typeof p.turnSourceTo === "string" ? p.turnSourceTo.trim() || null : null,
        turnSourceAccountId:
          typeof p.turnSourceAccountId === "string" ? p.turnSourceAccountId.trim() || null : null,
        turnSourceThreadId: p.turnSourceThreadId ?? null,
      };
      const record = manager.create(request, timeoutMs, explicitId);
      const decisionPromise = manager.waitForDecision(record, timeoutMs);
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
      void opts?.forwarder
        ?.handleRequested({
          id: record.id,
          request: record.request,
          createdAtMs: record.createdAtMs,
          expiresAtMs: record.expiresAtMs,
        })
        .catch((err) => {
          context.logGateway?.error?.(`exec approvals: forward request failed: ${String(err)}`);
        });
      const decision = await decisionPromise;
      respond(
        true,
        {
          id: record.id,
          decision,
          createdAtMs: record.createdAtMs,
          expiresAtMs: record.expiresAtMs,
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
      const p = params as { id: string; decision: string };
      const decision = p.decision as ExecApprovalDecision;
      if (decision !== "allow-once" && decision !== "allow-always" && decision !== "deny") {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "invalid decision"));
        return;
      }
      const resolvedBy = client?.connect?.client?.displayName ?? client?.connect?.client?.id;
      const ok = manager.resolve(p.id, decision, resolvedBy ?? null);
      if (!ok) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown approval id"));
        return;
      }
      context.broadcast(
        "exec.approval.resolved",
        { id: p.id, decision, resolvedBy, ts: Date.now() },
        { dropIfSlow: true },
      );
      void opts?.forwarder
        ?.handleResolved({ id: p.id, decision, resolvedBy, ts: Date.now() })
        .catch((err) => {
          context.logGateway?.error?.(`exec approvals: forward resolve failed: ${String(err)}`);
        });
      respond(true, { ok: true }, undefined);
    },
  };
}
