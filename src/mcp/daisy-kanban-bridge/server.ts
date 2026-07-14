#!/usr/bin/env node
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { createKanbanMcpRequestHandler } from "../daisy-kanban-mcp/server.js";
import { createKanbanGatewayCaller, type KanbanMcpEnv } from "../daisy-kanban-mcp/server.js";
import type { GatewayCallOptions } from "../../agents/tools/gateway.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 18890;
const NORMAL_BODY_LIMIT = 1 * 1024 * 1024;
const IMPORT_BODY_LIMIT = 10 * 1024 * 1024;
const READ_LIMIT = 120;
const WRITE_LIMIT = 30;
const WINDOW_MS = 60_000;
const MCP_PATH = "/mcp";

type GatewayCaller = ReturnType<typeof createKanbanGatewayCaller>;
type RateBucket = { startedAt: number; reads: number; writes: number; imports: number };

export type KanbanBridgeOptions = {
  env?: KanbanMcpEnv;
  callGateway?: <T = Record<string, unknown>>(
    method: string,
    options: GatewayCallOptions,
    params?: unknown,
    extra?: { expectFinal?: boolean },
  ) => Promise<T>;
  now?: () => number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.end(JSON.stringify(body));
}

function errorBody(
  code:
    | "authentication"
    | "authorization"
    | "validation"
    | "not-found"
    | "version-conflict"
    | "rate-limit"
    | "upstream-unavailable"
    | "internal",
  message: string,
  details?: unknown,
) {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

function bearer(req: IncomingMessage): string | undefined {
  const value = req.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : undefined;
}

function authorized(req: IncomingMessage, expected: string | undefined): boolean {
  return Boolean(expected && bearer(req) === expected);
}

async function readBody(req: IncomingMessage, limit: number): Promise<unknown> {
  const contentLength = Number(req.headers["content-length"] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > limit) {
    throw Object.assign(new Error("request body exceeds limit"), { bridgeCode: "rate-limit" });
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > limit) {
      throw Object.assign(new Error("request body exceeds limit"), { bridgeCode: "rate-limit" });
    }
    chunks.push(buffer);
  }
  if (!size) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("request body must be valid JSON"), { bridgeCode: "validation" });
  }
}

function queryParams(url: URL): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [key, value] of url.searchParams) {
    if (key === "limit") {
      params[key] = Number(value);
    } else if (["includeArchived", "readyForCodex"].includes(key)) {
      params[key] = value === "true";
    } else {
      params[key] = value;
    }
  }
  return params;
}

function routeParts(pathname: string): string[] {
  return pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
}

function isImportPath(parts: string[]): boolean {
  return parts[0] === "v1" && parts[1] === "imports";
}

function isMutation(method: string): boolean {
  return method !== "GET";
}

function rateLimit(
  req: IncomingMessage,
  buckets: Map<string, RateBucket>,
  now: number,
  mutation: boolean,
  importRequest: boolean,
): boolean {
  const key = req.socket.remoteAddress ?? "unknown";
  const existing = buckets.get(key);
  const bucket = !existing || now - existing.startedAt >= WINDOW_MS
    ? { startedAt: now, reads: 0, writes: 0, imports: 0 }
    : existing;
  if (mutation) bucket.writes += 1;
  else bucket.reads += 1;
  if (importRequest) bucket.imports += 1;
  buckets.set(key, bucket);
  return bucket.reads <= READ_LIMIT && bucket.writes <= WRITE_LIMIT && bucket.imports <= 5;
}

function mapUpstreamError(error: unknown): { status: number; body: unknown } {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid request|required|conflicting worker labels|must not be blank/i.test(message)) {
    return { status: 422, body: errorBody("validation", "The request failed DAISy Kanban validation.") };
  }
  if (/not found/i.test(message)) {
    return { status: 404, body: errorBody("not-found", "The requested Kanban card was not found.") };
  }
  if (/version conflict/i.test(message)) {
    return { status: 409, body: errorBody("version-conflict", "The card changed; reread it and retry with its current version.") };
  }
  if (/unavailable|timeout|closed|gateway/i.test(message)) {
    return { status: 503, body: errorBody("upstream-unavailable", "The DAISy gateway is unavailable.") };
  }
  return { status: 500, body: errorBody("internal", "The DAISy bridge could not complete the request.") };
}

export function createKanbanBridgeServer(options: KanbanBridgeOptions = {}): Server {
  const env = options.env ?? process.env;
  const callGateway = options.callGateway ?? (createKanbanGatewayCaller(env) as GatewayCaller);
  const now = options.now ?? Date.now;
  const buckets = new Map<string, RateBucket>();
  const mcp = createKanbanMcpRequestHandler({ env, callGateway });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? DEFAULT_HOST}`);
    const parts = routeParts(url.pathname);
    const isMcp = url.pathname === MCP_PATH;
    const expectedToken = isMcp ? env.DAISY_KANBAN_MCP_TOKEN : env.DAISY_KANBAN_BRIDGE_TOKEN;
    if (!authorized(req, expectedToken)) {
      json(res, 401, errorBody("authentication", "A valid bridge credential is required."));
      return;
    }
    if (isMcp) {
      if (req.method !== "POST") {
        json(res, 405, errorBody("validation", "MCP requires POST."));
        return;
      }
      try {
        const request = await readBody(req, NORMAL_BODY_LIMIT);
        const response = await mcp(request as Parameters<typeof mcp>[0]);
        if (response) json(res, 200, response);
        else res.statusCode = 202, res.end();
      } catch {
        json(res, 400, errorBody("validation", "Invalid MCP request."));
      }
      return;
    }
    if (!url.pathname.startsWith("/v1/")) {
      json(res, 404, errorBody("not-found", "Unknown bridge route."));
      return;
    }
    const mutation = isMutation(req.method ?? "GET");
    const importRequest = isImportPath(parts);
    if (!rateLimit(req, buckets, now(), mutation, importRequest)) {
      json(res, 429, errorBody("rate-limit", "Bridge rate limit exceeded."));
      return;
    }
    try {
      const body = req.method === "GET" ? {} : await readBody(req, importRequest ? IMPORT_BODY_LIMIT : NORMAL_BODY_LIMIT);
      if (!isRecord(body)) {
        json(res, 422, errorBody("validation", "Request body must be a JSON object."));
        return;
      }
      const params = { ...(req.method === "GET" ? queryParams(url) : body) };
      const cardId = parts[2];
      let method = "";
      if (req.method === "GET" && parts[1] === "status") method = "kanban.status";
      else if (req.method === "GET" && parts[1] === "board") method = "kanban.board.get";
      else if (req.method === "GET" && parts[1] === "cards" && !cardId) method = "kanban.cards.list";
      else if (req.method === "GET" && parts[1] === "cards" && cardId) method = "kanban.cards.get", params.cardId = cardId;
      else if (req.method === "GET" && parts[1] === "activity") method = "kanban.activity.list";
      else if (req.method === "POST" && parts.length === 2 && parts[1] === "cards") method = "kanban.cards.create";
      else if (req.method === "PATCH" && parts[1] === "cards" && cardId) method = "kanban.cards.update", params.cardId = cardId;
      else if (req.method === "POST" && parts[1] === "cards" && parts[3] === "move") method = "kanban.cards.move", params.cardId = cardId;
      else if (req.method === "POST" && parts[1] === "cards" && parts[3] === "comments") method = "kanban.cards.comment", params.cardId = cardId;
      else if (req.method === "POST" && parts[1] === "cards" && parts[3] === "archive") method = "kanban.cards.archive", params.cardId = cardId;
      else if (req.method === "POST" && parts[1] === "imports" && parts[3] === "preview") method = "kanban.import.trello.preview";
      else if (req.method === "POST" && parts[1] === "imports" && parts[3] === "run") method = "kanban.import.trello.run";
      else if (req.method === "POST" && parts[1] === "tasks" && parts[2] === "pick-next") method = "kanban.agent.pickNext";
      else if (req.method === "POST" && parts[1] === "tasks" && parts[3] === "handoff") method = "kanban.agent.handoff", params.cardId = cardId;
      else if (req.method === "POST" && parts[1] === "tasks" && parts[3] === "complete") method = "kanban.agent.complete", params.cardId = cardId;
      else {
        json(res, 404, errorBody("not-found", "Unknown bridge route."));
        return;
      }
      if (method === "kanban.cards.update") {
        const updates = params.updates;
        params.updates = isRecord(updates) ? updates : params;
      }
      const result = await callGateway(method, { timeoutMs: 30_000 }, params);
      json(res, 200, result);
    } catch (error) {
      const bridgeError = error as { bridgeCode?: string };
      if (bridgeError.bridgeCode === "validation") {
        json(res, 422, errorBody("validation", error instanceof Error ? error.message : "Invalid request."));
        return;
      }
      if (bridgeError.bridgeCode === "rate-limit") {
        json(res, 413, errorBody("rate-limit", "Request body exceeds the bridge limit."));
        return;
      }
      const mapped = mapUpstreamError(error);
      json(res, mapped.status, mapped.body);
    }
  });
  return server;
}

export async function runKanbanBridgeServer(options: KanbanBridgeOptions = {}): Promise<void> {
  const env = options.env ?? process.env;
  if (!env.DAISY_KANBAN_BRIDGE_TOKEN || !env.DAISY_KANBAN_MCP_TOKEN) {
    throw new Error("DAISY_KANBAN_BRIDGE_TOKEN and DAISY_KANBAN_MCP_TOKEN are required");
  }
  const port = Number(env.DAISY_KANBAN_BRIDGE_PORT ?? DEFAULT_PORT);
  const server = createKanbanBridgeServer(options);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, DEFAULT_HOST, () => resolve());
  });
  await new Promise<void>((resolve) => server.once("close", resolve));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runKanbanBridgeServer();
}
