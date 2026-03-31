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

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_docs_read",
    service: "docs",
    action: validated.value.action,
    payload: validated.value,
    readOnly: true,
    buildArgv: (auth) =>
      buildDocsReadCommand(validated.value as Record<string, unknown>, auth.args).argv,
  });
}
