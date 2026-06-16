import { buildGroupsReadCommand } from "../command-builder.js";
import { validateGroupsReadParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeGroupsRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateGroupsReadParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_groups_read",
      service: "groups",
      readOnly: true,
      action: "unknown",
      message: "Invalid gws_groups_read params",
      issues: validated.errors,
    });
  }

  const value = validated.value as Record<string, unknown> & { action: string };

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_groups_read",
    service: "groups",
    action: value.action,
    payload: value,
    readOnly: true,
    buildCommand: (auth) => buildGroupsReadCommand(value, auth.args),
  });
}
