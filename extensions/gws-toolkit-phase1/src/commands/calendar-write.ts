import { buildCalendarWriteCommand } from "../command-builder.js";
import { validateCalendarWriteParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeCalendarWrite(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateCalendarWriteParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_calendar_write",
      service: "calendar",
      readOnly: false,
      action: "unknown",
      message: "Invalid gws_calendar_write params",
      issues: validated.errors,
    });
  }

  const value = validated.value as Record<string, unknown> & {
    action: string;
    confirm?: boolean;
  };

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_calendar_write",
    service: "calendar",
    action: value.action,
    payload: value,
    readOnly: false,
    confirm: value.confirm,
    buildArgv: (auth) => buildCalendarWriteCommand(value, auth.args).argv,
  });
}
