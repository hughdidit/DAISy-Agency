import { buildGmailWriteCommand } from "../command-builder.js";
import { validateGmailWriteParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeGmailWrite(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateGmailWriteParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_gmail_write",
      service: "gmail",
      readOnly: false,
      action: "unknown",
      message: "Invalid gws_gmail_write params",
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
    tool: "gws_gmail_write",
    service: "gmail",
    action: value.action,
    payload: value,
    readOnly: false,
    confirm: value.confirm,
    buildCommand: (auth) =>
      buildGmailWriteCommand(value, auth.args, { workspaceDir: params.ctx.workspaceDir }),
  });
}
