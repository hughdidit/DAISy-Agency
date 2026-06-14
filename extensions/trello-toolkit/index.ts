import { Type } from "@sinclair/typebox";
import type { AnyAgentTool } from "../../src/agents/tools/common.js";
import type { OpenClawPluginApi, OpenClawPluginToolContext } from "../../src/plugins/types.js";
import { createAuditLogger } from "./src/audit.js";
import { executeRead } from "./src/commands/read.js";
import { executeStatus } from "./src/commands/status.js";
import { executeWrite } from "./src/commands/write.js";
import { resolveConfig, defaultConfig } from "./src/config.js";
import { errorEnvelope } from "./src/errors.js";
import type {
  AuditEvent,
  InvocationContext,
  StructuredEnvelope,
  TrelloToolkitConfig,
} from "./src/types.js";

function toToolResult(payload: StructuredEnvelope) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload),
      },
    ],
    details: payload,
  };
}

function withLabel<N extends string>(
  tool: { name: N } & Record<string, unknown>,
): AnyAgentTool & { name: N } {
  return {
    ...tool,
    label: tool.name,
  } as unknown as AnyAgentTool & { name: N };
}

function createContext(ctx: OpenClawPluginToolContext): InvocationContext {
  return {
    agentId: ctx.agentId,
    sessionId: ctx.sessionId,
    sessionKey: ctx.sessionKey,
  };
}

function createConfigDeniedEnvelope(tool: "trello_status" | "trello_read" | "trello_write") {
  return errorEnvelope({
    tool,
    action:
      tool === "trello_status" ? "status" : tool === "trello_read" ? "list_boards" : "create_card",
    code: "CONFIG_ERROR",
    message:
      "trello-toolkit plugin config is invalid. Check plugins.entries.trello-toolkit.config.",
    latencyMs: 0,
  });
}

function auditEnvelope(
  auditLogger: ReturnType<typeof createAuditLogger>,
  ctx: InvocationContext,
  payload: StructuredEnvelope,
) {
  const event: AuditEvent = {
    timestamp: new Date().toISOString(),
    ...(ctx.agentId ? { agentId: ctx.agentId } : {}),
    ...(ctx.sessionId ? { sessionId: ctx.sessionId } : {}),
    ...(ctx.sessionKey ? { sessionKey: ctx.sessionKey } : {}),
    toolName: payload.meta.tool,
    action: payload.meta.action,
    decision: !payload.ok && payload.error.code === "DENY_POLICY" ? "deny" : "allow",
    ...(!payload.ok && payload.error.code === "DENY_POLICY"
      ? { denyReason: payload.error.message }
      : {}),
    ...(payload.meta.routeName ? { routeName: payload.meta.routeName } : {}),
    latencyMs: payload.meta.latencyMs,
    resultCode: payload.meta.resultCode,
  };
  auditLogger.record(event);
  return payload;
}

function createTools(params: {
  toolCtx: OpenClawPluginToolContext;
  config: TrelloToolkitConfig;
  configValid: boolean;
  auditLogger: ReturnType<typeof createAuditLogger>;
}) {
  const ctx = createContext(params.toolCtx);
  const statusTool: AnyAgentTool = withLabel({
    name: "trello_status",
    description:
      "Check Trello toolkit config, credentials, route posture, and optional account health.",
    parameters: Type.Object(
      {
        includeAccount: Type.Optional(Type.Boolean()),
      },
      { additionalProperties: false },
    ),
    async execute(_id: string, rawParams: Record<string, unknown>) {
      const payload = params.configValid
        ? await executeStatus({ config: params.config, ctx, rawParams })
        : createConfigDeniedEnvelope("trello_status");
      return toToolResult(auditEnvelope(params.auditLogger, ctx, payload));
    },
  });

  const readTool: AnyAgentTool = withLabel({
    name: "trello_read",
    description:
      "Read Trello boards, lists, and cards through the gateway-brokered Trello toolkit.",
    parameters: Type.Object(
      {
        action: Type.String({
          enum: ["list_boards", "list_lists", "list_cards", "get_card"],
        }),
        boardId: Type.Optional(Type.String()),
        listId: Type.Optional(Type.String()),
        cardId: Type.Optional(Type.String()),
      },
      { additionalProperties: false },
    ),
    async execute(_id: string, rawParams: Record<string, unknown>) {
      const payload = params.configValid
        ? await executeRead({ config: params.config, ctx, rawParams })
        : createConfigDeniedEnvelope("trello_read");
      return toToolResult(auditEnvelope(params.auditLogger, ctx, payload));
    },
  });

  const writeTool: AnyAgentTool = withLabel({
    name: "trello_write",
    description: "Write Trello cards through policy-gated gateway broker operations.",
    parameters: Type.Object(
      {
        action: Type.String({
          enum: ["create_card", "move_card", "add_comment", "archive_card"],
        }),
        listId: Type.Optional(Type.String()),
        targetListId: Type.Optional(Type.String()),
        cardId: Type.Optional(Type.String()),
        name: Type.Optional(Type.String()),
        desc: Type.Optional(Type.String()),
        text: Type.Optional(Type.String()),
        confirm: Type.Optional(Type.Boolean()),
      },
      { additionalProperties: false },
    ),
    async execute(_id: string, rawParams: Record<string, unknown>) {
      const payload = params.configValid
        ? await executeWrite({ config: params.config, ctx, rawParams })
        : createConfigDeniedEnvelope("trello_write");
      return toToolResult(auditEnvelope(params.auditLogger, ctx, payload));
    },
  });

  return [statusTool, readTool, writeTool];
}

export default {
  id: "trello-toolkit",
  name: "Trello Toolkit",
  description: "Gateway-brokered Trello integration with per-agent policy controls.",
  register(api: OpenClawPluginApi) {
    const resolvedConfig = resolveConfig(api.pluginConfig);
    const config = resolvedConfig.ok ? resolvedConfig.value.config : defaultConfig();
    const configValid = resolvedConfig.ok;
    const auditLogger = createAuditLogger(api.logger);

    api.registerTool(
      (toolCtx) =>
        createTools({
          toolCtx,
          config,
          configValid,
          auditLogger,
        }),
      { names: ["trello_status", "trello_read", "trello_write"] },
    );

    api.registerCli(
      ({ program }) => {
        const trello = program.command("trello").description("Trello Toolkit diagnostics");
        trello
          .command("status")
          .description("Print Trello toolkit config and credential posture")
          .option("--agent <id>", "Agent id used to resolve Trello route policy", "daisy")
          .option("--include-account", "Run a live Trello account health request", false)
          .option("--json", "Print JSON output", false)
          .action(async (opts?: { agent?: string; includeAccount?: boolean; json?: boolean }) => {
            const agentId = opts?.agent?.trim() || "daisy";
            const payload = configValid
              ? await executeStatus({
                  config,
                  ctx: { agentId, sessionId: "cli", sessionKey: `agent:${agentId}:main` },
                  rawParams: { includeAccount: opts?.includeAccount === true },
                })
              : errorEnvelope({
                  tool: "trello_status",
                  action: "status",
                  code: "CONFIG_ERROR",
                  message: "trello-toolkit plugin config is invalid.",
                  latencyMs: 0,
                });
            auditEnvelope(
              auditLogger,
              { agentId, sessionId: "cli", sessionKey: `agent:${agentId}:main` },
              payload,
            );
            console.log(
              opts?.json === true
                ? JSON.stringify(payload, null, 2)
                : `Trello Toolkit: ${payload.ok ? "OK" : payload.error.code}`,
            );
            if (!payload.ok) {
              process.exitCode = 1;
            }
          });
      },
      { commands: ["trello"] },
    );
  },
};
