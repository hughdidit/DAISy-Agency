#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import readline from "node:readline";
import { pathToFileURL } from "node:url";
import type { GatewayCallOptions } from "../../agents/tools/gateway.js";
import { createKanbanTools } from "../../agents/tools/kanban-tool.js";
import { GatewayClient } from "../../gateway/client.js";
import { resolveLeastPrivilegeOperatorScopesForMethod } from "../../gateway/method-scopes.js";
import { PROTOCOL_VERSION } from "../../gateway/protocol/index.js";
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../../utils/message-channel.js";

const MCP_PROTOCOL_VERSION = "2024-11-05";
const DEFAULT_GATEWAY_URL = "ws://127.0.0.1:18889";
const DEFAULT_AGENT_ID = "codex-desktop";
const DEFAULT_AGENT_NAME = "Codex Desktop";
const DEFAULT_TIMEOUT_MS = 30_000;

type JsonRpcRequest = {
  jsonrpc?: "2.0";
  id?: string | number | null;
  method?: string;
  params?: unknown;
};

type JsonRpcResponse =
  | {
      jsonrpc: "2.0";
      id: string | number | null;
      result: unknown;
    }
  | {
      jsonrpc: "2.0";
      id: string | number | null;
      error: { code: number; message: string };
    };

export type KanbanMcpEnv = Record<string, string | undefined>;

type GatewayCaller = <T = Record<string, unknown>>(
  method: string,
  opts: GatewayCallOptions,
  params?: unknown,
  extra?: { expectFinal?: boolean },
) => Promise<T>;

export type KanbanMcpServerDeps = {
  env?: KanbanMcpEnv;
  callGateway?: GatewayCaller;
};

type ToolContent = {
  type: "text";
  text: string;
};

function readNonBlank(env: KanbanMcpEnv, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

function sanitizeGatewayUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch (error) {
    throw new Error(`invalid DAISy Kanban gateway URL: ${String(error)}`);
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("DAISy Kanban gateway URL must use ws:// or wss://");
  }
  if (url.username || url.password) {
    throw new Error("DAISy Kanban gateway URL must not include credentials");
  }
  if (url.search || url.hash) {
    throw new Error("DAISy Kanban gateway URL must not include query or hash");
  }
  if (url.pathname && url.pathname !== "/") {
    throw new Error("DAISy Kanban gateway URL must not include a path");
  }
  const host = url.hostname.toLowerCase();
  const isLoopback =
    host === "localhost" || host === "::1" || host === "127.0.0.1" || host.startsWith("127.");
  if (url.protocol === "ws:" && !isLoopback) {
    throw new Error("DAISy Kanban plaintext ws:// gateway URL must be loopback");
  }
  return url.origin;
}

function resolveGatewayUrl(env: KanbanMcpEnv, opts: GatewayCallOptions): string {
  return sanitizeGatewayUrl(
    opts.gatewayUrl ??
      readNonBlank(env, "DAISY_KANBAN_GATEWAY_URL") ??
      readNonBlank(env, "OPENCLAW_GATEWAY_URL") ??
      DEFAULT_GATEWAY_URL,
  );
}

function resolveTimeoutMs(opts: GatewayCallOptions): number {
  return typeof opts.timeoutMs === "number" && Number.isFinite(opts.timeoutMs)
    ? Math.max(1, Math.floor(opts.timeoutMs))
    : DEFAULT_TIMEOUT_MS;
}

function createDirectGatewayCaller(env: KanbanMcpEnv): GatewayCaller {
  return async <T = Record<string, unknown>>(
    method: string,
    opts: GatewayCallOptions,
    params?: unknown,
    extra?: { expectFinal?: boolean },
  ): Promise<T> => {
    const url = resolveGatewayUrl(env, opts);
    const token =
      opts.gatewayToken ??
      readNonBlank(env, "OPENCLAW_GATEWAY_TOKEN") ??
      readNonBlank(env, "CLAWDBOT_GATEWAY_TOKEN");
    const timeoutMs = resolveTimeoutMs(opts);
    return await new Promise<T>((resolve, reject) => {
      let settled = false;
      const stop = (client: GatewayClient, error?: Error, value?: T) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        client.stop();
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      };
      const client = new GatewayClient({
        url,
        token,
        instanceId: randomUUID(),
        clientName: GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT,
        clientDisplayName: "Codex Desktop Kanban MCP",
        mode: GATEWAY_CLIENT_MODES.BACKEND,
        role: "operator",
        scopes: resolveLeastPrivilegeOperatorScopesForMethod(method),
        minProtocol: PROTOCOL_VERSION,
        maxProtocol: PROTOCOL_VERSION,
        onHelloOk: async () => {
          try {
            stop(client, undefined, await client.request<T>(method, params, extra));
          } catch (error) {
            stop(client, error instanceof Error ? error : new Error(String(error)));
          }
        },
        onConnectError: (error) => stop(client, error),
        onClose: (code, reason) => {
          if (!settled) {
            stop(client, new Error(`gateway closed (${code}): ${reason}`));
          }
        },
      });
      const timer = setTimeout(() => {
        stop(client, new Error(`gateway timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      client.start();
    });
  };
}

function errorResponse(id: JsonRpcRequest["id"], code: number, message: string): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  };
}

function resultResponse(id: JsonRpcRequest["id"], result: unknown): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result,
  };
}

export function createKanbanMcpRequestHandler(deps: KanbanMcpServerDeps = {}) {
  const env = deps.env ?? process.env;
  const callGateway = deps.callGateway ?? createDirectGatewayCaller(env);
  const tools = createKanbanTools(
    {
      agentId: readNonBlank(env, "DAISY_KANBAN_AGENT_ID") ?? DEFAULT_AGENT_ID,
      agentName: readNonBlank(env, "DAISY_KANBAN_AGENT_NAME") ?? DEFAULT_AGENT_NAME,
    },
    { callGatewayTool: callGateway },
  );
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

  return async function handleKanbanMcpRequest(
    request: JsonRpcRequest,
  ): Promise<JsonRpcResponse | null> {
    if (request.method === "notifications/initialized") {
      return null;
    }
    if (request.method === "initialize") {
      return resultResponse(request.id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "daisy-kanban", version: "1.0.0" },
      });
    }
    if (request.method === "ping") {
      return resultResponse(request.id, {});
    }
    if (request.method === "tools/list") {
      return resultResponse(request.id, {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.parameters,
        })),
      });
    }
    if (request.method === "tools/call") {
      const params =
        request.params && typeof request.params === "object"
          ? (request.params as Record<string, unknown>)
          : {};
      const name = typeof params.name === "string" ? params.name : "";
      const tool = toolMap.get(name);
      if (!tool?.execute) {
        return errorResponse(request.id, -32602, `unknown Kanban MCP tool: ${name}`);
      }
      try {
        const result = await tool.execute("mcp-tool-call", (params.arguments ?? {}) as never);
        return resultResponse(request.id, {
          content: result.content as ToolContent[],
          structuredContent: result.details,
        });
      } catch (error) {
        return resultResponse(request.id, {
          isError: true,
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
        });
      }
    }
    return errorResponse(request.id, -32601, `unknown MCP method: ${request.method ?? ""}`);
  };
}

export async function runKanbanMcpServer(deps: KanbanMcpServerDeps = {}): Promise<void> {
  const handleRequest = createKanbanMcpRequestHandler(deps);
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    let request: JsonRpcRequest;
    try {
      request = JSON.parse(trimmed) as JsonRpcRequest;
    } catch {
      process.stdout.write(
        `${JSON.stringify(errorResponse(null, -32700, "invalid JSON-RPC request"))}\n`,
      );
      continue;
    }
    const response = await handleRequest(request);
    if (response) {
      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runKanbanMcpServer();
}
