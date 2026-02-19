import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { listChannelPlugins } from "../../channels/plugins/index.js";
import {
  CONFIG_PATH,
  loadConfig,
  parseConfigJson5,
  readConfigFileSnapshot,
  resolveConfigSnapshotHash,
  validateConfigObjectWithPlugins,
  writeConfigFile,
} from "../../config/config.js";
import { applyLegacyMigrations } from "../../config/legacy.js";
import { applyMergePatch } from "../../config/merge-patch.js";
import {
  redactConfigObject,
  redactConfigSnapshot,
  restoreRedactedValues,
} from "../../config/redact-snapshot.js";
<<<<<<< HEAD
import { buildConfigSchema } from "../../config/schema.js";
=======
import { buildConfigSchema, type ConfigSchemaResponse } from "../../config/schema.js";
import { extractDeliveryInfo } from "../../config/sessions.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { OpenClawConfig } from "../../config/types.openclaw.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { OpenClawConfig } from "../../config/types.openclaw.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { OpenClawConfig } from "../../config/types.openclaw.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
=======
import type { OpenClawConfig } from "../../config/types.openclaw.js";
>>>>>>> 74c51aeb1 (style: format gateway server methods)
import {
  formatDoctorNonInteractiveHint,
  type RestartSentinelPayload,
  writeRestartSentinel,
} from "../../infra/restart-sentinel.js";
import { scheduleGatewaySigusr1Restart } from "../../infra/restart.js";
import { loadOpenClawPlugins } from "../../plugins/loader.js";
import {
  ErrorCodes,
  errorShape,
  validateConfigApplyParams,
  validateConfigGetParams,
  validateConfigPatchParams,
  validateConfigSchemaParams,
  validateConfigSetParams,
} from "../protocol/index.js";
import { resolveBaseHashParam } from "./base-hash.js";
import { parseRestartRequestParams } from "./restart-request.js";
import type { GatewayRequestHandlers, RespondFn } from "./types.js";
import { assertValidParams } from "./validation.js";

function requireConfigBaseHash(
  params: unknown,
  snapshot: Awaited<ReturnType<typeof readConfigFileSnapshot>>,
  respond: RespondFn,
): boolean {
  if (!snapshot.exists) {
    return true;
  }
  const snapshotHash = resolveConfigSnapshotHash(snapshot);
  if (!snapshotHash) {
    respond(
      false,
      undefined,
      errorShape(
        ErrorCodes.INVALID_REQUEST,
        "config base hash unavailable; re-run config.get and retry",
      ),
    );
    return false;
  }
  const baseHash = resolveBaseHashParam(params);
  if (!baseHash) {
    respond(
      false,
      undefined,
      errorShape(
        ErrorCodes.INVALID_REQUEST,
        "config base hash required; re-run config.get and retry",
      ),
    );
    return false;
  }
  if (baseHash !== snapshotHash) {
    respond(
      false,
      undefined,
      errorShape(
        ErrorCodes.INVALID_REQUEST,
        "config changed since last load; re-run config.get and retry",
      ),
    );
    return false;
  }
  return true;
}

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
function parseRawConfigOrRespond(
  params: unknown,
  requestName: string,
  respond: RespondFn,
): string | null {
  const rawValue = (params as { raw?: unknown }).raw;
  if (typeof rawValue !== "string") {
    respond(
      false,
      undefined,
      errorShape(
        ErrorCodes.INVALID_REQUEST,
        `invalid ${requestName} params: raw (string) required`,
      ),
    );
    return null;
  }
  return rawValue;
}

function parseValidateConfigFromRawOrRespond(
  params: unknown,
  requestName: string,
  snapshot: Awaited<ReturnType<typeof readConfigFileSnapshot>>,
  respond: RespondFn,
): { config: OpenClawConfig; schema: ConfigSchemaResponse } | null {
  const rawValue = parseRawConfigOrRespond(params, requestName, respond);
  if (!rawValue) {
    return null;
  }
  const parsedRes = parseConfigJson5(rawValue);
  if (!parsedRes.ok) {
    respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, parsedRes.error));
    return null;
  }
  const schema = loadSchemaWithPlugins();
  const restored = restoreRedactedValues(parsedRes.parsed, snapshot.config, schema.uiHints);
  if (!restored.ok) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, restored.humanReadableMessage ?? "invalid config"),
    );
    return null;
  }
  const validated = validateConfigObjectWithPlugins(restored.result);
  if (!validated.ok) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, "invalid config", {
        details: { issues: validated.issues },
      }),
    );
    return null;
  }
  return { config: validated.config, schema };
}

>>>>>>> c46f395bb (refactor(gateway): dedupe config raw validation)
function resolveConfigRestartRequest(params: unknown): {
  sessionKey: string | undefined;
  note: string | undefined;
  restartDelayMs: number | undefined;
  deliveryContext: ReturnType<typeof extractDeliveryInfo>["deliveryContext"];
  threadId: ReturnType<typeof extractDeliveryInfo>["threadId"];
} {
  const { sessionKey, note, restartDelayMs } = parseRestartRequestParams(params);

  // Extract deliveryContext + threadId for routing after restart
  // Supports both :thread: (most channels) and :topic: (Telegram)
  const { deliveryContext, threadId } = extractDeliveryInfo(sessionKey);

  return {
    sessionKey,
    note,
    restartDelayMs,
    deliveryContext,
    threadId,
  };
}

function buildConfigRestartSentinelPayload(params: {
  kind: RestartSentinelPayload["kind"];
  mode: string;
  sessionKey: string | undefined;
  deliveryContext: ReturnType<typeof extractDeliveryInfo>["deliveryContext"];
  threadId: ReturnType<typeof extractDeliveryInfo>["threadId"];
  note: string | undefined;
}): RestartSentinelPayload {
  return {
    kind: params.kind,
    status: "ok",
    ts: Date.now(),
    sessionKey: params.sessionKey,
    deliveryContext: params.deliveryContext,
    threadId: params.threadId,
    message: params.note ?? null,
    doctorHint: formatDoctorNonInteractiveHint(),
    stats: {
      mode: params.mode,
      root: CONFIG_PATH,
    },
  };
}

async function tryWriteRestartSentinelPayload(
  payload: RestartSentinelPayload,
): Promise<string | null> {
  try {
    return await writeRestartSentinel(payload);
  } catch {
    return null;
  }
}

function loadSchemaWithPlugins(): ConfigSchemaResponse {
  const cfg = loadConfig();
  const workspaceDir = resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
  const pluginRegistry = loadOpenClawPlugins({
    config: cfg,
    cache: true,
    workspaceDir,
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
  });
  // Note: We can't easily cache this, as there are no callback that can invalidate
  // our cache. However, both loadConfig() and loadOpenClawPlugins() already cache
  // their results, and buildConfigSchema() is just a cheap transformation.
  return buildConfigSchema({
    plugins: pluginRegistry.plugins.map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      configUiHints: plugin.configUiHints,
      configSchema: plugin.configJsonSchema,
    })),
    channels: listChannelPlugins().map((entry) => ({
      id: entry.id,
      label: entry.meta.label,
      description: entry.meta.blurb,
      configSchema: entry.configSchema?.schema,
      configUiHints: entry.configSchema?.uiHints,
    })),
  });
}

>>>>>>> 410422999 (refactor(gateway): share config restart sentinel builder)
export const configHandlers: GatewayRequestHandlers = {
  "config.get": async ({ params, respond }) => {
    if (!assertValidParams(params, validateConfigGetParams, "config.get", respond)) {
      return;
    }
    const snapshot = await readConfigFileSnapshot();
    respond(true, redactConfigSnapshot(snapshot), undefined);
  },
  "config.schema": ({ params, respond }) => {
    if (!assertValidParams(params, validateConfigSchemaParams, "config.schema", respond)) {
      return;
    }
    const cfg = loadConfig();
    const workspaceDir = resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
    const pluginRegistry = loadOpenClawPlugins({
      config: cfg,
      workspaceDir,
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
    });
    const schema = buildConfigSchema({
      plugins: pluginRegistry.plugins.map((plugin) => ({
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        configUiHints: plugin.configUiHints,
        configSchema: plugin.configJsonSchema,
      })),
      channels: listChannelPlugins().map((entry) => ({
        id: entry.id,
        label: entry.meta.label,
        description: entry.meta.blurb,
        configSchema: entry.configSchema?.schema,
        configUiHints: entry.configSchema?.uiHints,
      })),
    });
    respond(true, schema, undefined);
  },
  "config.set": async ({ params, respond }) => {
    if (!assertValidParams(params, validateConfigSetParams, "config.set", respond)) {
      return;
    }
    const snapshot = await readConfigFileSnapshot();
    if (!requireConfigBaseHash(params, snapshot, respond)) {
      return;
    }
    const parsed = parseValidateConfigFromRawOrRespond(params, "config.set", snapshot, respond);
    if (!parsed) {
      return;
    }
<<<<<<< HEAD
    const parsedRes = parseConfigJson5(rawValue);
    if (!parsedRes.ok) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, parsedRes.error));
      return;
    }
    const validated = validateConfigObjectWithPlugins(parsedRes.parsed);
    if (!validated.ok) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "invalid config", {
          details: { issues: validated.issues },
        }),
      );
      return;
    }
    let restored: typeof validated.config;
    try {
      restored = restoreRedactedValues(
        validated.config,
        snapshot.config,
      ) as typeof validated.config;
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, String(err instanceof Error ? err.message : err)),
      );
      return;
    }
    await writeConfigFile(restored);
=======
    await writeConfigFile(parsed.config, writeOptions);
>>>>>>> c46f395bb (refactor(gateway): dedupe config raw validation)
    respond(
      true,
      {
        ok: true,
        path: CONFIG_PATH,
<<<<<<< HEAD
        config: redactConfigObject(restored),
=======
        config: redactConfigObject(parsed.config, parsed.schema.uiHints),
>>>>>>> c46f395bb (refactor(gateway): dedupe config raw validation)
      },
      undefined,
    );
  },
  "config.patch": async ({ params, respond }) => {
    if (!assertValidParams(params, validateConfigPatchParams, "config.patch", respond)) {
      return;
    }
    const snapshot = await readConfigFileSnapshot();
    if (!requireConfigBaseHash(params, snapshot, respond)) {
      return;
    }
    if (!snapshot.valid) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "invalid config; fix before patching"),
      );
      return;
    }
    const rawValue = (params as { raw?: unknown }).raw;
    if (typeof rawValue !== "string") {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "invalid config.patch params: raw (string) required",
        ),
      );
      return;
    }
    const parsedRes = parseConfigJson5(rawValue);
    if (!parsedRes.ok) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, parsedRes.error));
      return;
    }
    if (
      !parsedRes.parsed ||
      typeof parsedRes.parsed !== "object" ||
      Array.isArray(parsedRes.parsed)
    ) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "config.patch raw must be an object"),
      );
      return;
    }
<<<<<<< HEAD
    const merged = applyMergePatch(snapshot.config, parsedRes.parsed);
    let restoredMerge: unknown;
    try {
      restoredMerge = restoreRedactedValues(merged, snapshot.config);
    } catch (err) {
=======
    const merged = applyMergePatch(snapshot.config, parsedRes.parsed, {
      mergeObjectArraysById: true,
    });
    const schemaPatch = loadSchemaWithPlugins();
    const restoredMerge = restoreRedactedValues(merged, snapshot.config, schemaPatch.uiHints);
    if (!restoredMerge.ok) {
>>>>>>> 8ec0ef586 (fix (gateway/config): merge config.patch object arrays by id)
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, String(err instanceof Error ? err.message : err)),
      );
      return;
    }
    const migrated = applyLegacyMigrations(restoredMerge);
    const resolved = migrated.next ?? restoredMerge;
    const validated = validateConfigObjectWithPlugins(resolved);
    if (!validated.ok) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "invalid config", {
          details: { issues: validated.issues },
        }),
      );
      return;
    }
    await writeConfigFile(validated.config);

<<<<<<< HEAD
    const sessionKey =
      typeof (params as { sessionKey?: unknown }).sessionKey === "string"
        ? (params as { sessionKey?: string }).sessionKey?.trim() || undefined
        : undefined;
    const note =
      typeof (params as { note?: unknown }).note === "string"
        ? (params as { note?: string }).note?.trim() || undefined
        : undefined;
    const restartDelayMsRaw = (params as { restartDelayMs?: unknown }).restartDelayMs;
    const restartDelayMs =
      typeof restartDelayMsRaw === "number" && Number.isFinite(restartDelayMsRaw)
        ? Math.max(0, Math.floor(restartDelayMsRaw))
        : undefined;

    const payload: RestartSentinelPayload = {
      kind: "config-apply",
      status: "ok",
      ts: Date.now(),
      sessionKey,
      message: note ?? null,
      doctorHint: formatDoctorNonInteractiveHint(),
      stats: {
        mode: "config.patch",
        root: CONFIG_PATH,
      },
    };
    let sentinelPath: string | null = null;
    try {
      sentinelPath = await writeRestartSentinel(payload);
    } catch {
      sentinelPath = null;
    }
=======
    const { sessionKey, note, restartDelayMs, deliveryContext, threadId } =
      resolveConfigRestartRequest(params);
    const payload = buildConfigRestartSentinelPayload({
      kind: "config-patch",
      mode: "config.patch",
      sessionKey,
      deliveryContext,
      threadId,
      note,
    });
    const sentinelPath = await tryWriteRestartSentinelPayload(payload);
>>>>>>> 410422999 (refactor(gateway): share config restart sentinel builder)
    const restart = scheduleGatewaySigusr1Restart({
      delayMs: restartDelayMs,
      reason: "config.patch",
    });
    respond(
      true,
      {
        ok: true,
        path: CONFIG_PATH,
        config: redactConfigObject(validated.config),
        restart,
        sentinel: {
          path: sentinelPath,
          payload,
        },
      },
      undefined,
    );
  },
  "config.apply": async ({ params, respond }) => {
    if (!assertValidParams(params, validateConfigApplyParams, "config.apply", respond)) {
      return;
    }
    const snapshot = await readConfigFileSnapshot();
    if (!requireConfigBaseHash(params, snapshot, respond)) {
      return;
    }
    const parsed = parseValidateConfigFromRawOrRespond(params, "config.apply", snapshot, respond);
    if (!parsed) {
      return;
    }
<<<<<<< HEAD
    const parsedRes = parseConfigJson5(rawValue);
    if (!parsedRes.ok) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, parsedRes.error));
      return;
    }
    const validated = validateConfigObjectWithPlugins(parsedRes.parsed);
    if (!validated.ok) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, "invalid config", {
          details: { issues: validated.issues },
        }),
      );
      return;
    }
    let restoredApply: typeof validated.config;
    try {
      restoredApply = restoreRedactedValues(
        validated.config,
        snapshot.config,
      ) as typeof validated.config;
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, String(err instanceof Error ? err.message : err)),
      );
      return;
    }
    await writeConfigFile(restoredApply);
=======
    await writeConfigFile(parsed.config, writeOptions);
>>>>>>> c46f395bb (refactor(gateway): dedupe config raw validation)

<<<<<<< HEAD
    const sessionKey =
      typeof (params as { sessionKey?: unknown }).sessionKey === "string"
        ? (params as { sessionKey?: string }).sessionKey?.trim() || undefined
        : undefined;
    const note =
      typeof (params as { note?: unknown }).note === "string"
        ? (params as { note?: string }).note?.trim() || undefined
        : undefined;
    const restartDelayMsRaw = (params as { restartDelayMs?: unknown }).restartDelayMs;
    const restartDelayMs =
      typeof restartDelayMsRaw === "number" && Number.isFinite(restartDelayMsRaw)
        ? Math.max(0, Math.floor(restartDelayMsRaw))
        : undefined;

    const payload: RestartSentinelPayload = {
=======
    const { sessionKey, note, restartDelayMs, deliveryContext, threadId } =
      resolveConfigRestartRequest(params);
    const payload = buildConfigRestartSentinelPayload({
>>>>>>> 410422999 (refactor(gateway): share config restart sentinel builder)
      kind: "config-apply",
      mode: "config.apply",
      sessionKey,
<<<<<<< HEAD
      message: note ?? null,
      doctorHint: formatDoctorNonInteractiveHint(),
      stats: {
        mode: "config.apply",
        root: CONFIG_PATH,
      },
    };
    let sentinelPath: string | null = null;
    try {
      sentinelPath = await writeRestartSentinel(payload);
    } catch {
      sentinelPath = null;
    }
=======
      deliveryContext,
      threadId,
      note,
    });
    const sentinelPath = await tryWriteRestartSentinelPayload(payload);
>>>>>>> 410422999 (refactor(gateway): share config restart sentinel builder)
    const restart = scheduleGatewaySigusr1Restart({
      delayMs: restartDelayMs,
      reason: "config.apply",
    });
    respond(
      true,
      {
        ok: true,
        path: CONFIG_PATH,
<<<<<<< HEAD
        config: redactConfigObject(restoredApply),
=======
        config: redactConfigObject(parsed.config, parsed.schema.uiHints),
>>>>>>> c46f395bb (refactor(gateway): dedupe config raw validation)
        restart,
        sentinel: {
          path: sentinelPath,
          payload,
        },
      },
      undefined,
    );
  },
};
