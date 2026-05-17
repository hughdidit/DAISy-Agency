import { buildGmailReadCommand } from "../command-builder.js";
import {
  buildGmailReadPolicyPayload,
  evaluateGmailMetadataContactPolicy,
} from "../gmail-policy.js";
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

  const value = buildGmailReadPolicyPayload(
    validated.value as Record<string, unknown> & { action: string },
    params.deps.config.gmailPolicy,
  ) as Record<string, unknown> & { action: string };

  return runToolkitCommand({
    deps: params.deps,
    ctx: params.ctx,
    tool: "gws_gmail_read",
    service: "gmail",
    action: value.action,
    payload: value,
    readOnly: true,
    buildCommand: (auth) => buildGmailReadCommand(value, auth.args),
    postPolicy:
      value.action === "get_message_metadata"
        ? ({ payload }) => {
            const metadataPolicy = evaluateGmailMetadataContactPolicy({
              payload,
              policy: params.deps.config.gmailPolicy,
            });
            return metadataPolicy.allowed
              ? undefined
              : {
                  allowed: false,
                  reason: metadataPolicy.reason,
                  service: "gmail",
                  action: value.action,
                };
          }
        : undefined,
  });
}
