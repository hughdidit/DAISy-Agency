import { buildGmailReadCommand } from "../command-builder.js";
import { PluginError } from "../errors.js";
import { validateGmailParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { runReadOnlyCommand, type RuntimeDeps } from "./helpers.js";

export async function executeGmailRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateGmailParams(params.rawParams);
  if (!validated.ok) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid gws_gmail_read params",
        details: {
          issues: validated.errors,
        },
      },
      meta: {
        tool: "gws_gmail_read",
        action: "unknown",
        service: "gmail",
        latencyMs: 0,
      },
    };
  }

  const action = validated.value.action;
  return await runReadOnlyCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_gmail_read",
    service: "gmail",
    action,
    payload: validated.value,
    buildArgv: (auth) => {
      try {
        return buildGmailReadCommand(validated.value, auth.args).argv;
      } catch (error) {
        throw error instanceof PluginError
          ? error
          : new PluginError("VALIDATION_ERROR", "Invalid gmail action arguments");
      }
    },
  });
}
