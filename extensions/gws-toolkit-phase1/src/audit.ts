import { redactForOutput, type RedactingLogger } from "./logger.js";
import type { AuditEvent, InvocationContext, ResultCode, ToolName } from "./types.js";

export type AuditEmissionInput = {
  ctx: InvocationContext;
  toolName: ToolName;
  action: string;
  targetService: AuditEvent["targetService"];
  decision: "allow" | "deny";
  denyReason?: string;
  credentialMode?: AuditEvent["credentialMode"];
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
        toolName: input.toolName,
        action: input.action,
        targetService: input.targetService,
        readOnly: true,
        decision: input.decision,
        denyReason: input.denyReason,
        credentialMode: input.credentialMode,
        latencyMs: input.latencyMs,
        exitCode: input.exitCode,
        resultCode: input.resultCode,
      };

      logger.info("gws-toolkit-phase1 audit event", redactForOutput(event));
      return event;
    },
  };
}
