import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "openclaw/plugin-sdk";
import { jsonResult, readStringParam } from "../../../src/agents/tools/common.js";
import { callGatewayTool, readGatewayCallOptions } from "../../../src/agents/tools/gateway.js";
import type { CronGuardPluginConfig } from "./config.js";

const SharedGatewaySchema = Type.Object(
  {
    gatewayUrl: Type.Optional(Type.String()),
    gatewayToken: Type.Optional(Type.String()),
    timeoutMs: Type.Optional(Type.Number({ minimum: 1 })),
  },
  { additionalProperties: true },
);

const CronGuardListSchema = Type.Intersect([
  SharedGatewaySchema,
  Type.Object(
    {
      includeDisabled: Type.Optional(Type.Boolean()),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
      offset: Type.Optional(Type.Integer({ minimum: 0 })),
      query: Type.Optional(Type.String()),
      enabled: Type.Optional(Type.Union([Type.Literal("all"), Type.Literal("enabled"), Type.Literal("disabled")])),
      sortBy: Type.Optional(Type.Union([Type.Literal("nextRunAtMs"), Type.Literal("updatedAtMs"), Type.Literal("name")])),
      sortDir: Type.Optional(Type.Union([Type.Literal("asc"), Type.Literal("desc")])),
    },
    { additionalProperties: false },
  ),
]);

const CronGuardAddSchema = Type.Intersect([
  SharedGatewaySchema,
  Type.Object(
    {
      job: Type.Object({}, { additionalProperties: true }),
    },
    { additionalProperties: false },
  ),
]);

const CronGuardUpdateSchema = Type.Intersect([
  SharedGatewaySchema,
  Type.Object(
    {
      jobId: Type.Optional(Type.String()),
      id: Type.Optional(Type.String()),
      patch: Type.Object({}, { additionalProperties: true }),
    },
    { additionalProperties: false },
  ),
]);

const CronGuardRemoveSchema = Type.Intersect([
  SharedGatewaySchema,
  Type.Object(
    {
      jobId: Type.Optional(Type.String()),
      id: Type.Optional(Type.String()),
    },
    { additionalProperties: false },
  ),
]);

type ToolCtx = {
  agentId?: string;
  sessionKey?: string;
  messageChannel?: string;
  requesterSenderId?: string;
};

function buildRequester(toolName: string, ctx: ToolCtx) {
  return {
    agentId: ctx.agentId,
    sessionKey: ctx.sessionKey,
    messageChannel: ctx.messageChannel,
    requesterSenderId: ctx.requesterSenderId,
    toolName,
  };
}

function resolveJobId(params: Record<string, unknown>): string {
  const jobId = readStringParam(params, "jobId") ?? readStringParam(params, "id");
  if (!jobId) {
    throw new Error("jobId required");
  }
  return jobId;
}

export function createCronGuardTools(params: {
  config: CronGuardPluginConfig;
  ctx: ToolCtx;
}): AnyAgentTool[] {
  if (!params.config.enabled) {
    return [];
  }
  return [
    {
      name: "cron_guard_status",
      description: "Read-only wrapper around cron.status with no approval required.",
      parameters: SharedGatewaySchema,
      ownerOnly: true,
      execute: async (_toolCallId, rawParams) => {
        const gatewayOpts = readGatewayCallOptions((rawParams ?? {}) as Record<string, unknown>);
        return jsonResult(await callGatewayTool("cron.guard.status", gatewayOpts, {}));
      },
    },
    {
      name: "cron_guard_list",
      description: "Read-only wrapper around cron.list with webhook targets redacted by default.",
      parameters: CronGuardListSchema,
      ownerOnly: true,
      execute: async (_toolCallId, rawParams) => {
        const paramsRecord = (rawParams ?? {}) as Record<string, unknown>;
        const gatewayOpts = readGatewayCallOptions(paramsRecord);
        return jsonResult(
          await callGatewayTool("cron.guard.list", gatewayOpts, {
            includeDisabled: paramsRecord.includeDisabled,
            limit: paramsRecord.limit,
            offset: paramsRecord.offset,
            query: paramsRecord.query,
            enabled: paramsRecord.enabled,
            sortBy: paramsRecord.sortBy,
            sortDir: paramsRecord.sortDir,
          }),
        );
      },
    },
    {
      name: "cron_guard_add_request",
      description: "Create a pending cron.add approval request without mutating live cron state.",
      parameters: CronGuardAddSchema,
      ownerOnly: true,
      execute: async (_toolCallId, rawParams) => {
        const paramsRecord = (rawParams ?? {}) as Record<string, unknown>;
        const gatewayOpts = readGatewayCallOptions(paramsRecord);
        return jsonResult(
          await callGatewayTool("cron.guard.request.add", gatewayOpts, {
            payload: paramsRecord.job,
            requester: buildRequester("cron_guard_add_request", params.ctx),
          }),
        );
      },
    },
    {
      name: "cron_guard_update_request",
      description: "Create a pending cron.update approval request without mutating live cron state.",
      parameters: CronGuardUpdateSchema,
      ownerOnly: true,
      execute: async (_toolCallId, rawParams) => {
        const paramsRecord = (rawParams ?? {}) as Record<string, unknown>;
        const gatewayOpts = readGatewayCallOptions(paramsRecord);
        return jsonResult(
          await callGatewayTool("cron.guard.request.update", gatewayOpts, {
            jobId: resolveJobId(paramsRecord),
            patch: paramsRecord.patch,
            requester: buildRequester("cron_guard_update_request", params.ctx),
          }),
        );
      },
    },
    {
      name: "cron_guard_remove_request",
      description: "Create a pending cron.remove approval request without mutating live cron state.",
      parameters: CronGuardRemoveSchema,
      ownerOnly: true,
      execute: async (_toolCallId, rawParams) => {
        const paramsRecord = (rawParams ?? {}) as Record<string, unknown>;
        const gatewayOpts = readGatewayCallOptions(paramsRecord);
        return jsonResult(
          await callGatewayTool("cron.guard.request.remove", gatewayOpts, {
            jobId: resolveJobId(paramsRecord),
            requester: buildRequester("cron_guard_remove_request", params.ctx),
          }),
        );
      },
    },
  ];
}
