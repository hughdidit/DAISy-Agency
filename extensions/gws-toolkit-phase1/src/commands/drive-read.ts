import { buildDriveReadCommand } from "../command-builder.js";
import { PluginError } from "../errors.js";
import { validateDriveParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { runReadOnlyCommand, type RuntimeDeps } from "./helpers.js";

export async function executeDriveRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateDriveParams(params.rawParams);
  if (!validated.ok) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid gws_drive_read params",
        details: {
          issues: validated.errors,
        },
      },
      meta: {
        tool: "gws_drive_read",
        action: "unknown",
        service: "drive",
        latencyMs: 0,
      },
    };
  }

  const action = validated.value.action;
  return await runReadOnlyCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_drive_read",
    service: "drive",
    action,
    payload: validated.value,
    buildArgv: (auth) => {
      try {
        return buildDriveReadCommand(validated.value, auth.args).argv;
      } catch (error) {
        throw error instanceof PluginError
          ? error
          : new PluginError("VALIDATION_ERROR", "Invalid drive action arguments");
      }
    },
  });
}
