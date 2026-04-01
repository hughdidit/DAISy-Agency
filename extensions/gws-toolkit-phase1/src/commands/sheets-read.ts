import { buildSheetsReadCommand } from "../command-builder.js";
import { validateSheetsReadParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeSheetsRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateSheetsReadParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_sheets_read",
      service: "sheets",
      readOnly: true,
      action: "unknown",
      message: "Invalid gws_sheets_read params",
      issues: validated.errors,
    });
  }

  const value = validated.value as Record<string, unknown> & { action: string };

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_sheets_read",
    service: "sheets",
    action: value.action,
    payload: value,
    readOnly: true,
    buildArgv: (auth) => buildSheetsReadCommand(value, auth.args).argv,
  });
}
