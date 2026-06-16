import { buildGroupsWriteCommand } from "../command-builder.js";
import { validateGroupsWriteParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeGroupsWrite(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateGroupsWriteParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_groups_write",
      service: "groups",
      readOnly: false,
      action: "unknown",
      message: "Invalid gws_groups_write params",
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
    tool: "gws_groups_write",
    service: "groups",
    action: value.action,
    payload: value,
    readOnly: false,
    confirm: value.confirm,
    buildCommand: (auth) => buildGroupsWriteCommand(value, auth.args),
  });
}
