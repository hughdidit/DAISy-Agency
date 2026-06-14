import { evaluatePolicy, resolveSubject } from "../policy.js";
import type { InvocationContext, TrelloToolkitConfig } from "../types.js";
import {
  deniedEnvelope,
  exceptionEnvelope,
  nowMs,
  readBooleanParam,
  resolveCredentials,
  successEnvelope,
} from "./helpers.js";

export async function executeStatus(params: {
  config: TrelloToolkitConfig;
  ctx: InvocationContext;
  rawParams: Record<string, unknown>;
}) {
  const startedAt = nowMs();
  const subject = resolveSubject(params.ctx.agentId);
  const decision = evaluatePolicy({
    config: params.config,
    subject,
    tool: "trello_status",
    action: "status",
  });
  if (!decision.allowed) {
    return deniedEnvelope({ tool: "trello_status", action: "status", decision, startedAt });
  }
  const credentials = resolveCredentials(params.config);
  const baseData = {
    subject,
    routeName: decision.routeName,
    credentialEnv: {
      apiKeyEnvVar: params.config.apiKeyEnvVar,
      tokenEnvVar: params.config.tokenEnvVar,
      present: credentials.ok,
      missing: credentials.ok ? [] : credentials.missing,
    },
  };
  if (!credentials.ok || !readBooleanParam(params.rawParams, "includeAccount")) {
    return successEnvelope({
      tool: "trello_status",
      action: "status",
      data: baseData,
      routeName: decision.routeName,
      startedAt,
    });
  }
  try {
    const account = await credentials.client.getMember();
    return successEnvelope({
      tool: "trello_status",
      action: "status",
      data: { ...baseData, account },
      routeName: decision.routeName,
      startedAt,
    });
  } catch (error) {
    return exceptionEnvelope({
      tool: "trello_status",
      action: "status",
      routeName: decision.routeName,
      startedAt,
      error,
    });
  }
}
