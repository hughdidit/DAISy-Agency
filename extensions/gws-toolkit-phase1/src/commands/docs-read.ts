import { buildDocsReadCommand } from "../command-builder.js";
import { validateDocsReadParams } from "../schema.js";
import type { InvocationContext, StructuredEnvelope } from "../types.js";
import { buildValidationDeniedEnvelope, runToolkitCommand, type RuntimeDeps } from "./helpers.js";

export async function executeDocsRead(params: {
  ctx: InvocationContext;
  deps: RuntimeDeps;
  rawParams: unknown;
}): Promise<StructuredEnvelope> {
  const validated = validateDocsReadParams(params.rawParams);
  if (!validated.ok) {
    return buildValidationDeniedEnvelope({
      deps: params.deps,
      ctx: params.ctx,
      tool: "gws_docs_read",
      service: "docs",
      readOnly: true,
      action: "unknown",
      message: "Invalid gws_docs_read params",
      issues: validated.errors,
    });
  }

  const value = validated.value as Record<string, unknown> & { action: string };

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_docs_read",
    service: "docs",
    action: value.action,
    payload: value,
    readOnly: true,
    buildCommand: (auth) => buildDocsReadCommand(value, auth.args),
  });
}
