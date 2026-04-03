import type {
  OpenClawPluginApi,
  PluginCommandContext,
  PluginCommandResult,
} from "openclaw/plugin-sdk";
import { callGateway } from "../../../src/gateway/call.js";
import { isCronGuardApproverAuthorized, type CronGuardPluginConfig } from "./config.js";

function buildApprover(ctx: PluginCommandContext, config: CronGuardPluginConfig) {
  const auth = isCronGuardApproverAuthorized({
    config,
    channel: ctx.channel,
    senderId: ctx.senderId,
    from: ctx.from,
  });
  if (!auth.ok) {
    throw new Error("You are not authorized to approve cron requests.");
  }
  return {
    id: ctx.senderId ?? "unknown",
    principal: auth.principal,
    channel: ctx.channel,
    from: ctx.from,
  };
}

function extractJsonArg(args?: string): Record<string, unknown> {
  if (!args?.trim()) {
    throw new Error("JSON payload required.");
  }
  const parsed = JSON.parse(args) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON payload must be an object.");
  }
  return parsed as Record<string, unknown>;
}

function formatRequestsList(requests: Array<Record<string, unknown>>): string {
  if (requests.length === 0) {
    return "No cron approval requests found.";
  }
  return requests
    .map((request) => {
      const requestId = typeof request.requestId === "string" ? request.requestId : "<unknown>";
      const action = typeof request.action === "string" ? request.action : "<unknown>";
      const status = typeof request.status === "string" ? request.status : "<unknown>";
      return `- ${requestId} ${action} ${status}`;
    })
    .join("\n");
}

function formatMutationResult(
  action: "Approved" | "Denied" | "Modified",
  requestId: string,
  result: unknown,
): string {
  const record = result as {
    requestId?: unknown;
    status?: unknown;
    applyResult?: { jobId?: unknown; error?: unknown } | undefined;
  };
  const resolvedRequestId =
    typeof record?.requestId === "string" && record.requestId.trim() ? record.requestId : requestId;
  const status = typeof record?.status === "string" ? record.status : "unknown";
  const jobId =
    record?.applyResult && typeof record.applyResult.jobId === "string"
      ? record.applyResult.jobId
      : undefined;
  const applyError =
    record?.applyResult && typeof record.applyResult.error === "string"
      ? record.applyResult.error
      : undefined;
  return [
    `✅ ${action} ${resolvedRequestId}.`,
    `Status: ${status}`,
    ...(jobId ? [`Job: ${jobId}`] : []),
    ...(applyError ? [`Apply error: ${applyError}`] : []),
  ].join("\n");
}

export function registerCronGuardCommands(
  api: OpenClawPluginApi,
  config: CronGuardPluginConfig,
): void {
  const safeExecute = async (
    fn: () => Promise<PluginCommandResult>,
  ): Promise<PluginCommandResult> => {
    try {
      return await fn();
    } catch (err) {
      return { text: `❌ ${String(err)}` };
    }
  };

  api.registerCommand({
    name: "cron-approve",
    description: "Approve a pending cron-guard request.",
    acceptsArgs: true,
    handler: async (ctx) =>
      await safeExecute(async () => {
        const requestId = ctx.args?.trim();
        if (!requestId) {
          return { text: "Usage: /cron-approve <requestId>" };
        }
        const result = await callGateway({
          method: "cron.guard.resolve",
          params: {
            requestId,
            disposition: "approve",
            approver: buildApprover(ctx, config),
          },
        });
        return { text: formatMutationResult("Approved", requestId, result) };
      }),
  });

  api.registerCommand({
    name: "cron-deny",
    description: "Deny a pending cron-guard request.",
    acceptsArgs: true,
    handler: async (ctx) =>
      await safeExecute(async () => {
        const requestId = ctx.args?.trim();
        if (!requestId) {
          return { text: "Usage: /cron-deny <requestId>" };
        }
        const result = await callGateway({
          method: "cron.guard.resolve",
          params: {
            requestId,
            disposition: "deny",
            approver: buildApprover(ctx, config),
          },
        });
        return { text: formatMutationResult("Denied", requestId, result) };
      }),
  });

  api.registerCommand({
    name: "cron-modify",
    description: "Modify a pending cron-guard request with validated JSON.",
    acceptsArgs: true,
    handler: async (ctx) =>
      await safeExecute(async () => {
        const args = ctx.args?.trim() ?? "";
        const space = args.indexOf(" ");
        if (space <= 0) {
          return { text: "Usage: /cron-modify <requestId> <json>" };
        }
        const requestId = args.slice(0, space).trim();
        const payload = extractJsonArg(args.slice(space + 1));
        const result = await callGateway({
          method: "cron.guard.modify",
          params: {
            requestId,
            payload,
            approver: buildApprover(ctx, config),
          },
        });
        return { text: formatMutationResult("Modified", requestId, result) };
      }),
  });

  api.registerCommand({
    name: "cron-requests",
    description: "List cron-guard approval requests.",
    handler: async (ctx) =>
      await safeExecute(async () => {
        buildApprover(ctx, config);
        const result = (await callGateway({
          method: "cron.guard.requests.list",
          params: {},
        })) as { requests?: Array<Record<string, unknown>> };
        return { text: formatRequestsList(result.requests ?? []) };
      }),
  });

  api.registerCommand({
    name: "cron-request",
    description: "Show a specific cron-guard approval request.",
    acceptsArgs: true,
    handler: async (ctx) =>
      await safeExecute(async () => {
        buildApprover(ctx, config);
        const requestId = ctx.args?.trim();
        if (!requestId) {
          return { text: "Usage: /cron-request <requestId>" };
        }
        const result = await callGateway({
          method: "cron.guard.requests.get",
          params: { requestId },
        });
        return { text: JSON.stringify(result, null, 2) };
      }),
  });
}
