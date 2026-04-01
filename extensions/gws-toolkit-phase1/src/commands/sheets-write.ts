import { buildSheetsWriteCommand } from "../command-builder.js";
import { validateSheetsWriteParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeSheetsWrite(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateSheetsWriteParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_sheets_write",
      service: "sheets",
      readOnly: false,
      action: "unknown",
      message: "Invalid gws_sheets_write params",
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
    tool: "gws_sheets_write",
    service: "sheets",
    action: value.action,
    payload: value,
    readOnly: false,
    confirm: value.confirm,
    buildCommand: (auth) => buildSheetsWriteCommand(value, auth.args),
  });
}
