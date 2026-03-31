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

  const value = validated.value as Record<string, unknown> & {
    action: string;
    confirm?: boolean;
  };

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_drive_write",
    service: "drive",
    action: value.action,
    payload: value,
    readOnly: false,
    confirm: value.confirm,
    buildArgv: (auth) => buildDriveWriteCommand(value, auth.args).argv,
  });
}
