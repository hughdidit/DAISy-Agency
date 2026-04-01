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

  const value = validated.value as Record<string, unknown> & { action: string };

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_gmail_read",
    service: "gmail",
    action: value.action,
    payload: value,
    readOnly: true,
    buildCommand: (auth) => buildGmailReadCommand(value, auth.args),
  });
}
