import { buildDocsWriteCommand } from "../command-builder.js";
import { validateDocsWriteParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeDocsWrite(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateDocsWriteParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_docs_write",
      service: "docs",
      readOnly: false,
      action: "unknown",
      message: "Invalid gws_docs_write params",
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
    tool: "gws_docs_write",
    service: "docs",
    action: value.action,
    payload: value,
    readOnly: false,
    confirm: value.confirm,
    buildCommand: (auth) => buildDocsWriteCommand(value, auth.args),
  });
}
