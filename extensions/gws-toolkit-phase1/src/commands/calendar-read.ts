import { buildCalendarReadCommand } from "../command-builder.js";
import { validateCalendarReadParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeCalendarRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateCalendarReadParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_calendar_read",
      service: "calendar",
      readOnly: true,
      action: "unknown",
      message: "Invalid gws_calendar_read params",
      issues: validated.errors,
    });
  }

  const value = validated.value as Record<string, unknown> & { action: string };

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_calendar_read",
    service: "calendar",
    action: value.action,
    payload: value,
    readOnly: true,
    buildCommand: (auth) => buildCalendarReadCommand(value, auth.args),
  });
}
