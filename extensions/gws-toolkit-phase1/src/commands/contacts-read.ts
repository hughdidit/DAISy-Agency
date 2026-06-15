import { buildContactsReadCommand } from "../command-builder.js";
import { validateContactsReadParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeContactsRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateContactsReadParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_contacts_read",
      service: "contacts",
      readOnly: true,
      action: "unknown",
      message: "Invalid gws_contacts_read params",
      issues: validated.errors,
    });
  }

  const value = validated.value as Record<string, unknown> & { action: string };

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_contacts_read",
    service: "contacts",
    action: value.action,
    payload: value,
    readOnly: true,
    buildCommand: (auth) => buildContactsReadCommand(value, auth.args),
  });
}
