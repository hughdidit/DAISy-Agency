import { buildCalendarReadCommand } from "../command-builder.js";
import { PluginError } from "../errors.js";
import { validateCalendarParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import {
  buildValidationDeniedEnvelope,
  runReadOnlyCommand,
  type RuntimeDeps,
} from "./helpers.js";

export async function executeCalendarRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateCalendarParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_calendar_read",
      service: "calendar",
      message: "Invalid gws_calendar_read params",
      issues: validated.errors,
    });
  }

  const action = validated.value.action;
  return await runReadOnlyCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_calendar_read",
    service: "calendar",
    action,
    payload: validated.value,
    buildArgv: (auth) => {
      try {
        return buildCalendarReadCommand(validated.value, auth.args).argv;
      } catch (error) {
        throw error instanceof PluginError
          ? error
          : new PluginError("VALIDATION_ERROR", "Invalid calendar action arguments");
      }
    },
  });
}