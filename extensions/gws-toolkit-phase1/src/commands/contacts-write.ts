import { buildContactsWriteCommand } from "../command-builder.js";
import { validateContactsWriteParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeContactsWrite(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateContactsWriteParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_contacts_write",
      service: "contacts",
      readOnly: false,
      action: "unknown",
      message: "Invalid gws_contacts_write params",
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
    tool: "gws_contacts_write",
    service: "contacts",
    action: value.action,
    payload: value,
    readOnly: false,
    confirm: value.confirm,
    buildCommand: (auth) => buildContactsWriteCommand(value, auth.args),
  });
}
