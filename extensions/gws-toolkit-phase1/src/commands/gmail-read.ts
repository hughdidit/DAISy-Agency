import { buildGmailReadCommand } from "../command-builder.js";
import { validateGmailReadParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeGmailRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateGmailReadParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_gmail_read",
      service: "gmail",
      readOnly: true,
      action: "unknown",
      message: "Invalid gws_gmail_read params",
      issues: validated.errors,
    });
  }

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_gmail_read",
    service: "gmail",
    action: validated.value.action,
    payload: validated.value,
    readOnly: true,
    buildArgv: (auth) => buildGmailReadCommand(validated.value as Record<string, unknown>, auth.args).argv,
  });
}
