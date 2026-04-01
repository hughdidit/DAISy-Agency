import { redactForOutput, type RedactingLogger } from "./logger.js";
import type { AuditEvent, InvocationContext, ResultCode, ToolName } from "./types.js";

export type AuditEmissionInput = {
  ctx: InvocationContext;
  toolName: ToolName;
  action: string;
  targetService: AuditEvent["targetService"];
  readOnly: boolean;
  decision: "allow" | "deny";
  denyReason?: string;
  credentialMode?: AuditEvent["credentialMode"];
  routeName?: string;
  bindingSubject?: string;
  latencyMs: number;
  exitCode?: number | null;
  resultCode: ResultCode;
};

export type AuditLogger = {
  emit: (event: AuditEmissionInput) => AuditEvent;
};

export function createAuditLogger(logger: RedactingLogger): AuditLogger {
  return {
    emit(input) {
      const event: AuditEvent = {
        timestamp: new Date().toISOString(),
        agentId: input.ctx.agentId,
        sessionId: input.ctx.sessionId,
        sessionKey: input.ctx.sessionKey,
        bindingSubject: input.bindingSubject ?? input.ctx.bindingSubject,
        routeName: input.routeName ?? input.ctx.routeName,
        toolName: input.toolName,
        action: input.action,
        targetService: input.targetService,
        readOnly: input.readOnly,
        decision: input.decision,
        credentialMode: input.credentialMode,
        latencyMs: input.latencyMs,
        exitCode: input.exitCode,
        resultCode: input.resultCode,
      };

      if (input.decision === "deny" && input.denyReason) {
        event.denyReason = input.denyReason;
      }

      logger.info("gws-toolkit-phase1 audit event", redactForOutput(event));
      return event;
    },
  };
}
