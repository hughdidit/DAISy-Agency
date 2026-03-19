import { buildGmailReadCommand } from "../command-builder.js";
import { PluginError } from "../errors.js";
import { validateGmailParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import {
  buildValidationDeniedEnvelope,
  runReadOnlyCommand,
  type RuntimeDeps,
} from "./helpers.js";

export async function executeGmailRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateGmailParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_gmail_read",
      service: "gmail",
      message: "Invalid gws_gmail_read params",
      issues: validated.errors,
    });
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