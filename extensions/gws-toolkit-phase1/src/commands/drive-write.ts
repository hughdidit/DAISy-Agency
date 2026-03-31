import { buildDriveWriteCommand } from "../command-builder.js";
import { validateDriveWriteParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeDriveWrite(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateDriveWriteParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_drive_write",
      service: "drive",
      readOnly: false,
      action: "unknown",
      message: "Invalid gws_drive_write params",
      issues: validated.errors,
    });
  }

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_drive_write",
    service: "drive",
    action: validated.value.action,
    payload: validated.value,
    readOnly: false,
    confirm: validated.value.confirm,
    buildArgv: (auth) =>
      buildDriveWriteCommand(validated.value as Record<string, unknown>, auth.args).argv,
  });
}
