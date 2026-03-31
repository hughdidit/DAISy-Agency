import { buildDriveReadCommand } from "../command-builder.js";
import { validateDriveReadParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeDriveRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateDriveReadParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_drive_read",
      service: "drive",
      readOnly: true,
      action: "unknown",
      message: "Invalid gws_drive_read params",
      issues: validated.errors,
    });
  }

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_drive_read",
    service: "drive",
    action: validated.value.action,
    payload: validated.value,
    readOnly: true,
    buildArgv: (auth) => buildDriveReadCommand(validated.value as Record<string, unknown>, auth.args).argv,
  });
}
