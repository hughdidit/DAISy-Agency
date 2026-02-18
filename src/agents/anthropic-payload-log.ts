<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import crypto from "node:crypto";
import path from "node:path";
<<<<<<< HEAD

import type { AgentMessage, StreamFn } from "@mariozechner/pi-agent-core";
import type { Api, Model } from "@mariozechner/pi-ai";

=======
import type { AgentMessage, StreamFn } from "@mariozechner/pi-agent-core";
import type { Api, Model } from "@mariozechner/pi-ai";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { AgentMessage, StreamFn } from "@mariozechner/pi-agent-core";
import type { Api, Model } from "@mariozechner/pi-ai";
import crypto from "node:crypto";
import path from "node:path";
>>>>>>> dee013426 (style: reformat dedupe-touched files)
=======
import crypto from "node:crypto";
import path from "node:path";
import type { AgentMessage, StreamFn } from "@mariozechner/pi-agent-core";
import type { Api, Model } from "@mariozechner/pi-ai";
>>>>>>> c70597dae (chore: Fix formatting.)
=======
import type { AgentMessage, StreamFn } from "@mariozechner/pi-agent-core";
import type { Api, Model } from "@mariozechner/pi-ai";
import crypto from "node:crypto";
import path from "node:path";
>>>>>>> ed11e93cf (chore(format))
=======
import crypto from "node:crypto";
import path from "node:path";
import type { AgentMessage, StreamFn } from "@mariozechner/pi-agent-core";
import type { Api, Model } from "@mariozechner/pi-ai";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { AgentMessage, StreamFn } from "@mariozechner/pi-agent-core";
import type { Api, Model } from "@mariozechner/pi-ai";
import crypto from "node:crypto";
import path from "node:path";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { resolveStateDir } from "../config/paths.js";
import { parseBooleanValue } from "../utils/boolean.js";
<<<<<<< HEAD
import { resolveUserPath } from "../utils.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
=======
import { safeJsonStringify } from "../utils/safe-json.js";
<<<<<<< HEAD
>>>>>>> d82c5ea9d (refactor(utils): share safe json stringify)
=======
import { getQueuedFileWriter, type QueuedFileWriter } from "./queued-file-writer.js";
>>>>>>> 817b5812e (refactor(agents): share queued JSONL file writer)

type PayloadLogStage = "request" | "usage";

type PayloadLogEvent = {
  ts: string;
  stage: PayloadLogStage;
  runId?: string;
  sessionId?: string;
  sessionKey?: string;
  provider?: string;
  modelId?: string;
  modelApi?: string | null;
  workspaceDir?: string;
  payload?: unknown;
  usage?: Record<string, unknown>;
  error?: string;
  payloadDigest?: string;
};

type PayloadLogConfig = {
  enabled: boolean;
  filePath: string;
};

type PayloadLogWriter = QueuedFileWriter;

const writers = new Map<string, PayloadLogWriter>();
const log = createSubsystemLogger("agent/anthropic-payload");

function resolvePayloadLogConfig(env: NodeJS.ProcessEnv): PayloadLogConfig {
  const enabled = parseBooleanValue(env.CLAWDBOT_ANTHROPIC_PAYLOAD_LOG) ?? false;
  const fileOverride = env.CLAWDBOT_ANTHROPIC_PAYLOAD_LOG_FILE?.trim();
  const filePath = fileOverride
    ? resolveUserPath(fileOverride)
    : path.join(resolveStateDir(env), "logs", "anthropic-payload.jsonl");
  return { enabled, filePath };
}

function getWriter(filePath: string): PayloadLogWriter {
  return getQueuedFileWriter(writers, filePath);
}

function formatError(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "number" || typeof error === "boolean" || typeof error === "bigint") {
    return String(error);
  }
  if (error && typeof error === "object") {
    return safeJsonStringify(error) ?? "unknown error";
  }
  return undefined;
}

function digest(value: unknown): string | undefined {
  const serialized = safeJsonStringify(value);
  if (!serialized) {
    return undefined;
  }
  return crypto.createHash("sha256").update(serialized).digest("hex");
}

function isAnthropicModel(model: Model<Api> | undefined | null): boolean {
  return (model as { api?: unknown })?.api === "anthropic-messages";
}

function findLastAssistantUsage(messages: AgentMessage[]): Record<string, unknown> | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i] as { role?: unknown; usage?: unknown };
    if (msg?.role === "assistant" && msg.usage && typeof msg.usage === "object") {
      return msg.usage as Record<string, unknown>;
    }
  }
  return null;
}

export type AnthropicPayloadLogger = {
  enabled: true;
  wrapStreamFn: (streamFn: StreamFn) => StreamFn;
  recordUsage: (messages: AgentMessage[], error?: unknown) => void;
};

export function createAnthropicPayloadLogger(params: {
  env?: NodeJS.ProcessEnv;
  runId?: string;
  sessionId?: string;
  sessionKey?: string;
  provider?: string;
  modelId?: string;
  modelApi?: string | null;
  workspaceDir?: string;
}): AnthropicPayloadLogger | null {
  const env = params.env ?? process.env;
  const cfg = resolvePayloadLogConfig(env);
  if (!cfg.enabled) {
    return null;
  }

  const writer = getWriter(cfg.filePath);
  const base: Omit<PayloadLogEvent, "ts" | "stage"> = {
    runId: params.runId,
    sessionId: params.sessionId,
    sessionKey: params.sessionKey,
    provider: params.provider,
    modelId: params.modelId,
    modelApi: params.modelApi,
    workspaceDir: params.workspaceDir,
  };

  const record = (event: PayloadLogEvent) => {
    const line = safeJsonStringify(event);
    if (!line) {
      return;
    }
    writer.write(`${line}\n`);
  };

  const wrapStreamFn: AnthropicPayloadLogger["wrapStreamFn"] = (streamFn) => {
    const wrapped: StreamFn = (model, context, options) => {
      if (!isAnthropicModel(model)) {
        return streamFn(model, context, options);
      }
      const nextOnPayload = (payload: unknown) => {
        record({
          ...base,
          ts: new Date().toISOString(),
          stage: "request",
          payload,
          payloadDigest: digest(payload),
        });
        options?.onPayload?.(payload);
      };
      return streamFn(model, context, {
        ...options,
        onPayload: nextOnPayload,
      });
    };
    return wrapped;
  };

  const recordUsage: AnthropicPayloadLogger["recordUsage"] = (messages, error) => {
    const usage = findLastAssistantUsage(messages);
    const errorMessage = formatError(error);
    if (!usage) {
      if (errorMessage) {
        record({
          ...base,
          ts: new Date().toISOString(),
          stage: "usage",
          error: errorMessage,
        });
      }
      return;
    }
    record({
      ...base,
      ts: new Date().toISOString(),
      stage: "usage",
      usage,
      error: errorMessage,
    });
    log.info("anthropic usage", {
      runId: params.runId,
      sessionId: params.sessionId,
      usage,
    });
  };

  log.info("anthropic payload logger enabled", { filePath: writer.filePath });
  return { enabled: true, wrapStreamFn, recordUsage };
}
