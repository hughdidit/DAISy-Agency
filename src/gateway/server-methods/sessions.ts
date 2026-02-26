import { randomUUID } from "node:crypto";
import fs from "node:fs";
<<<<<<< HEAD
<<<<<<< HEAD

=======
import type { GatewayRequestHandlers } from "./types.js";
=======
import { getAcpSessionManager } from "../../acp/control-plane/manager.js";
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
import { resolveDefaultAgentId } from "../../agents/agent-scope.js";
>>>>>>> 38e6da1fe (TUI/Gateway: fix pi streaming + tool routing + model display + msg updating (#8432))
import { abortEmbeddedPiRun, waitForEmbeddedPiRunEnd } from "../../agents/pi-embedded.js";
import { stopSubagentsForRequester } from "../../auto-reply/reply/abort.js";
import { clearSessionQueues } from "../../auto-reply/reply/queue.js";
import { loadConfig } from "../../config/config.js";
import {
  loadSessionStore,
  snapshotSessionOrigin,
  resolveMainSessionKey,
  type SessionEntry,
  updateSessionStore,
} from "../../config/sessions.js";
<<<<<<< HEAD
import { normalizeAgentId, parseAgentSessionKey } from "../../routing/session-key.js";
=======
import { unbindThreadBindingsBySessionKey } from "../../discord/monitor/thread-bindings.js";
import { logVerbose } from "../../globals.js";
import { createInternalHookEvent, triggerInternalHook } from "../../hooks/internal-hooks.js";
import { getGlobalHookRunner } from "../../plugins/hook-runner-global.js";
import {
  isSubagentSessionKey,
  normalizeAgentId,
  parseAgentSessionKey,
} from "../../routing/session-key.js";
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateSessionsCompactParams,
  validateSessionsDeleteParams,
  validateSessionsListParams,
  validateSessionsPatchParams,
  validateSessionsPreviewParams,
  validateSessionsResetParams,
  validateSessionsResolveParams,
} from "../protocol/index.js";
import {
  archiveFileOnDisk,
  listSessionsFromStore,
  loadCombinedSessionStoreForGateway,
  loadSessionEntry,
  readSessionPreviewItemsFromTranscript,
  resolveGatewaySessionStoreTarget,
  resolveSessionModelRef,
  resolveSessionTranscriptCandidates,
  type SessionsPatchResult,
  type SessionsPreviewEntry,
  type SessionsPreviewResult,
} from "../session-utils.js";
import { applySessionsPatchToStore } from "../sessions-patch.js";
import { resolveSessionKeyFromResolveParams } from "../sessions-resolve.js";
import type { GatewayRequestHandlers } from "./types.js";

const ACP_RUNTIME_CLEANUP_TIMEOUT_MS = 15_000;

async function runAcpCleanupStep(params: {
  op: () => Promise<void>;
}): Promise<{ status: "ok" } | { status: "timeout" } | { status: "error"; error: unknown }> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<{ status: "timeout" }>((resolve) => {
    timer = setTimeout(() => resolve({ status: "timeout" }), ACP_RUNTIME_CLEANUP_TIMEOUT_MS);
  });
  const opPromise = params
    .op()
    .then(() => ({ status: "ok" as const }))
    .catch((error: unknown) => ({ status: "error" as const, error }));
  const outcome = await Promise.race([opPromise, timeoutPromise]);
  if (timer) {
    clearTimeout(timer);
  }
  return outcome;
}

async function closeAcpRuntimeForSession(params: {
  cfg: ReturnType<typeof loadConfig>;
  sessionKey: string;
  entry?: SessionEntry;
  reason: "session-reset" | "session-delete";
}) {
  if (!params.entry?.acp) {
    return undefined;
  }
  const acpManager = getAcpSessionManager();
  const cancelOutcome = await runAcpCleanupStep({
    op: async () => {
      await acpManager.cancelSession({
        cfg: params.cfg,
        sessionKey: params.sessionKey,
        reason: params.reason,
      });
    },
  });
  if (cancelOutcome.status === "timeout") {
    return errorShape(
      ErrorCodes.UNAVAILABLE,
      `Session ${params.sessionKey} is still active; try again in a moment.`,
    );
  }
  if (cancelOutcome.status === "error") {
    logVerbose(
      `sessions.${params.reason}: ACP cancel failed for ${params.sessionKey}: ${String(cancelOutcome.error)}`,
    );
  }

  const closeOutcome = await runAcpCleanupStep({
    op: async () => {
      await acpManager.closeSession({
        cfg: params.cfg,
        sessionKey: params.sessionKey,
        reason: params.reason,
        requireAcpSession: false,
        allowBackendUnavailable: true,
      });
    },
  });
  if (closeOutcome.status === "timeout") {
    return errorShape(
      ErrorCodes.UNAVAILABLE,
      `Session ${params.sessionKey} is still active; try again in a moment.`,
    );
  }
  if (closeOutcome.status === "error") {
    logVerbose(
      `sessions.${params.reason}: ACP runtime close failed for ${params.sessionKey}: ${String(closeOutcome.error)}`,
    );
  }
  return undefined;
}

export const sessionsHandlers: GatewayRequestHandlers = {
  "sessions.list": ({ params, respond }) => {
    if (!validateSessionsListParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid sessions.list params: ${formatValidationErrors(validateSessionsListParams.errors)}`,
        ),
      );
      return;
    }
    const p = params as import("../protocol/index.js").SessionsListParams;
    const cfg = loadConfig();
    const { storePath, store } = loadCombinedSessionStoreForGateway(cfg);
    const result = listSessionsFromStore({
      cfg,
      storePath,
      store,
      opts: p,
    });
    respond(true, result, undefined);
  },
  "sessions.preview": ({ params, respond }) => {
    if (!validateSessionsPreviewParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid sessions.preview params: ${formatValidationErrors(
            validateSessionsPreviewParams.errors,
          )}`,
        ),
      );
      return;
    }
    const p = params as import("../protocol/index.js").SessionsPreviewParams;
    const keysRaw = Array.isArray(p.keys) ? p.keys : [];
    const keys = keysRaw
      .map((key) => String(key ?? "").trim())
      .filter(Boolean)
      .slice(0, 64);
    const limit =
      typeof p.limit === "number" && Number.isFinite(p.limit) ? Math.max(1, p.limit) : 12;
    const maxChars =
      typeof p.maxChars === "number" && Number.isFinite(p.maxChars)
        ? Math.max(20, p.maxChars)
        : 240;

    if (keys.length === 0) {
      respond(true, { ts: Date.now(), previews: [] } satisfies SessionsPreviewResult, undefined);
      return;
    }

    const cfg = loadConfig();
    const storeCache = new Map<string, Record<string, SessionEntry>>();
    const previews: SessionsPreviewEntry[] = [];

    for (const key of keys) {
      try {
        const target = resolveGatewaySessionStoreTarget({ cfg, key });
        const store = storeCache.get(target.storePath) ?? loadSessionStore(target.storePath);
        storeCache.set(target.storePath, store);
        const entry =
          target.storeKeys.map((candidate) => store[candidate]).find(Boolean) ??
          store[target.canonicalKey];
        if (!entry?.sessionId) {
          previews.push({ key, status: "missing", items: [] });
          continue;
        }
        const items = readSessionPreviewItemsFromTranscript(
          entry.sessionId,
          target.storePath,
          entry.sessionFile,
          target.agentId,
          limit,
          maxChars,
        );
        previews.push({
          key,
          status: items.length > 0 ? "ok" : "empty",
          items,
        });
      } catch {
        previews.push({ key, status: "error", items: [] });
      }
    }

    respond(true, { ts: Date.now(), previews } satisfies SessionsPreviewResult, undefined);
  },
  "sessions.resolve": ({ params, respond }) => {
    if (!validateSessionsResolveParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid sessions.resolve params: ${formatValidationErrors(validateSessionsResolveParams.errors)}`,
        ),
      );
      return;
    }
    const p = params as import("../protocol/index.js").SessionsResolveParams;
    const cfg = loadConfig();

    const resolved = resolveSessionKeyFromResolveParams({ cfg, p });
    if (!resolved.ok) {
      respond(false, undefined, resolved.error);
      return;
    }
    respond(true, { ok: true, key: resolved.key }, undefined);
  },
<<<<<<< HEAD
  "sessions.patch": async ({ params, respond, context }) => {
    if (!validateSessionsPatchParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid sessions.patch params: ${formatValidationErrors(validateSessionsPatchParams.errors)}`,
        ),
      );
=======
  "sessions.patch": async ({ params, respond, context, client, isWebchatConnect }) => {
    if (!assertValidParams(params, validateSessionsPatchParams, "sessions.patch", respond)) {
>>>>>>> 981d26648 (security(gateway): block webchat session mutators (#20800))
      return;
    }
    const p = params as import("../protocol/index.js").SessionsPatchParams;
    const key = String(p.key ?? "").trim();
    if (!key) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "key required"));
      return;
    }
    if (client?.connect && isWebchatConnect(client.connect)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "webchat clients cannot patch sessions; use chat.send for session-scoped updates",
        ),
      );
      return;
    }

    const cfg = loadConfig();
    const target = resolveGatewaySessionStoreTarget({ cfg, key });
    const storePath = target.storePath;
    const applied = await updateSessionStore(storePath, async (store) => {
      const primaryKey = target.storeKeys[0] ?? key;
      const existingKey = target.storeKeys.find((candidate) => store[candidate]);
      if (existingKey && existingKey !== primaryKey && !store[primaryKey]) {
        store[primaryKey] = store[existingKey];
        delete store[existingKey];
      }
      return await applySessionsPatchToStore({
        cfg,
        store,
        storeKey: primaryKey,
        patch: p,
        loadGatewayModelCatalog: context.loadGatewayModelCatalog,
      });
    });
    if (!applied.ok) {
      respond(false, undefined, applied.error);
      return;
    }
    const parsed = parseAgentSessionKey(target.canonicalKey ?? key);
    const agentId = normalizeAgentId(parsed?.agentId ?? resolveDefaultAgentId(cfg));
    const resolved = resolveSessionModelRef(cfg, applied.entry, agentId);
    const result: SessionsPatchResult = {
      ok: true,
      path: storePath,
      key: target.canonicalKey,
      entry: applied.entry,
      resolved: {
        modelProvider: resolved.provider,
        model: resolved.model,
      },
    };
    respond(true, result, undefined);
  },
  "sessions.reset": async ({ params, respond }) => {
    if (!validateSessionsResetParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid sessions.reset params: ${formatValidationErrors(validateSessionsResetParams.errors)}`,
        ),
      );
      return;
    }
    const p = params as import("../protocol/index.js").SessionsResetParams;
    const key = String(p.key ?? "").trim();
    if (!key) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "key required"));
      return;
    }

<<<<<<< HEAD
    const cfg = loadConfig();
    const target = resolveGatewaySessionStoreTarget({ cfg, key });
    const storePath = target.storePath;
=======
    const { cfg, target, storePath } = resolveGatewaySessionTargetFromKey(key);
    const { entry, legacyKey, canonicalKey } = loadSessionEntry(key);
    const hadExistingEntry = Boolean(entry);
    const commandReason = p.reason === "new" ? "new" : "reset";
    const hookEvent = createInternalHookEvent(
      "command",
      commandReason,
      target.canonicalKey ?? key,
      {
        sessionEntry: entry,
        previousSessionEntry: entry,
        commandSource: "gateway:sessions.reset",
        cfg,
      },
    );
    await triggerInternalHook(hookEvent);
    const sessionId = entry?.sessionId;
    const cleanupError = await ensureSessionRuntimeCleanup({ cfg, key, target, sessionId });
    if (cleanupError) {
      respond(false, undefined, cleanupError);
      return;
    }
    const acpCleanupError = await closeAcpRuntimeForSession({
      cfg,
      sessionKey: legacyKey ?? canonicalKey ?? target.canonicalKey ?? key,
      entry,
      reason: "session-reset",
    });
    if (acpCleanupError) {
      respond(false, undefined, acpCleanupError);
      return;
    }
    let oldSessionId: string | undefined;
    let oldSessionFile: string | undefined;
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
    const next = await updateSessionStore(storePath, (store) => {
      const primaryKey = target.storeKeys[0] ?? key;
      const existingKey = target.storeKeys.find((candidate) => store[candidate]);
      if (existingKey && existingKey !== primaryKey && !store[primaryKey]) {
        store[primaryKey] = store[existingKey];
        delete store[existingKey];
      }
      const entry = store[primaryKey];
      const now = Date.now();
      const nextEntry: SessionEntry = {
        sessionId: randomUUID(),
        updatedAt: now,
        systemSent: false,
        abortedLastRun: false,
        thinkingLevel: entry?.thinkingLevel,
        verboseLevel: entry?.verboseLevel,
        reasoningLevel: entry?.reasoningLevel,
        responseUsage: entry?.responseUsage,
        model: entry?.model,
        contextTokens: entry?.contextTokens,
        sendPolicy: entry?.sendPolicy,
        label: entry?.label,
        origin: snapshotSessionOrigin(entry),
        lastChannel: entry?.lastChannel,
        lastTo: entry?.lastTo,
        skillsSnapshot: entry?.skillsSnapshot,
        // Reset token counts to 0 on session reset (#1523)
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      };
      store[primaryKey] = nextEntry;
      return nextEntry;
    });
    respond(true, { ok: true, key: target.canonicalKey, entry: next }, undefined);
  },
<<<<<<< HEAD
  "sessions.delete": async ({ params, respond }) => {
    if (!validateSessionsDeleteParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid sessions.delete params: ${formatValidationErrors(validateSessionsDeleteParams.errors)}`,
        ),
      );
=======
  "sessions.delete": async ({ params, respond, client, isWebchatConnect }) => {
    if (!assertValidParams(params, validateSessionsDeleteParams, "sessions.delete", respond)) {
>>>>>>> 981d26648 (security(gateway): block webchat session mutators (#20800))
      return;
    }
    const p = params as import("../protocol/index.js").SessionsDeleteParams;
    const key = String(p.key ?? "").trim();
    if (!key) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "key required"));
      return;
    }
    if (client?.connect && isWebchatConnect(client.connect)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "webchat clients cannot delete sessions; use chat.send for session-scoped updates",
        ),
      );
      return;
    }

    const cfg = loadConfig();
    const mainKey = resolveMainSessionKey(cfg);
    const target = resolveGatewaySessionStoreTarget({ cfg, key });
    if (target.canonicalKey === mainKey) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, `Cannot delete the main session (${mainKey}).`),
      );
      return;
    }

    const deleteTranscript = typeof p.deleteTranscript === "boolean" ? p.deleteTranscript : true;

<<<<<<< HEAD
    const storePath = target.storePath;
    const { entry } = loadSessionEntry(key);
    const sessionId = entry?.sessionId;
    const existed = Boolean(entry);
    const queueKeys = new Set<string>(target.storeKeys);
    queueKeys.add(target.canonicalKey);
    if (sessionId) queueKeys.add(sessionId);
    clearSessionQueues([...queueKeys]);
    stopSubagentsForRequester({ cfg, requesterSessionKey: target.canonicalKey });
    if (sessionId) {
      abortEmbeddedPiRun(sessionId);
      const ended = await waitForEmbeddedPiRunEnd(sessionId, 15_000);
      if (!ended) {
        respond(
          false,
          undefined,
          errorShape(
            ErrorCodes.UNAVAILABLE,
            `Session ${key} is still active; try again in a moment.`,
          ),
        );
        return;
=======
    const { entry, legacyKey, canonicalKey } = loadSessionEntry(key);
    const sessionId = entry?.sessionId;
    const cleanupError = await ensureSessionRuntimeCleanup({ cfg, key, target, sessionId });
    if (cleanupError) {
      respond(false, undefined, cleanupError);
      return;
    }
    const acpCleanupError = await closeAcpRuntimeForSession({
      cfg,
      sessionKey: legacyKey ?? canonicalKey ?? target.canonicalKey ?? key,
      entry,
      reason: "session-delete",
    });
    if (acpCleanupError) {
      respond(false, undefined, acpCleanupError);
      return;
    }
    const deleted = await updateSessionStore(storePath, (store) => {
      const { primaryKey } = migrateAndPruneSessionStoreKey({ cfg, key, store });
      const hadEntry = Boolean(store[primaryKey]);
      if (hadEntry) {
        delete store[primaryKey];
>>>>>>> a7d56e355 (feat: ACP thread-bound agents (#23580))
      }
    }
    await updateSessionStore(storePath, (store) => {
      const primaryKey = target.storeKeys[0] ?? key;
      const existingKey = target.storeKeys.find((candidate) => store[candidate]);
      if (existingKey && existingKey !== primaryKey && !store[primaryKey]) {
        store[primaryKey] = store[existingKey];
        delete store[existingKey];
      }
      if (store[primaryKey]) delete store[primaryKey];
    });

    const archived: string[] = [];
    if (deleteTranscript && sessionId) {
      for (const candidate of resolveSessionTranscriptCandidates(
        sessionId,
        storePath,
        entry?.sessionFile,
        target.agentId,
      )) {
        if (!fs.existsSync(candidate)) continue;
        try {
          archived.push(archiveFileOnDisk(candidate, "deleted"));
        } catch {
          // Best-effort.
        }
      }
    }

    respond(true, { ok: true, key: target.canonicalKey, deleted: existed, archived }, undefined);
  },
  "sessions.compact": async ({ params, respond }) => {
    if (!validateSessionsCompactParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid sessions.compact params: ${formatValidationErrors(validateSessionsCompactParams.errors)}`,
        ),
      );
      return;
    }
    const p = params as import("../protocol/index.js").SessionsCompactParams;
    const key = String(p.key ?? "").trim();
    if (!key) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "key required"));
      return;
    }

    const maxLines =
      typeof p.maxLines === "number" && Number.isFinite(p.maxLines)
        ? Math.max(1, Math.floor(p.maxLines))
        : 400;

    const cfg = loadConfig();
    const target = resolveGatewaySessionStoreTarget({ cfg, key });
    const storePath = target.storePath;
    // Lock + read in a short critical section; transcript work happens outside.
    const compactTarget = await updateSessionStore(storePath, (store) => {
      const primaryKey = target.storeKeys[0] ?? key;
      const existingKey = target.storeKeys.find((candidate) => store[candidate]);
      if (existingKey && existingKey !== primaryKey && !store[primaryKey]) {
        store[primaryKey] = store[existingKey];
        delete store[existingKey];
      }
      return { entry: store[primaryKey], primaryKey };
    });
    const entry = compactTarget.entry;
    const sessionId = entry?.sessionId;
    if (!sessionId) {
      respond(
        true,
        {
          ok: true,
          key: target.canonicalKey,
          compacted: false,
          reason: "no sessionId",
        },
        undefined,
      );
      return;
    }

    const filePath = resolveSessionTranscriptCandidates(
      sessionId,
      storePath,
      entry?.sessionFile,
      target.agentId,
    ).find((candidate) => fs.existsSync(candidate));
    if (!filePath) {
      respond(
        true,
        {
          ok: true,
          key: target.canonicalKey,
          compacted: false,
          reason: "no transcript",
        },
        undefined,
      );
      return;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= maxLines) {
      respond(
        true,
        {
          ok: true,
          key: target.canonicalKey,
          compacted: false,
          kept: lines.length,
        },
        undefined,
      );
      return;
    }

    const archived = archiveFileOnDisk(filePath, "bak");
    const keptLines = lines.slice(-maxLines);
    fs.writeFileSync(filePath, `${keptLines.join("\n")}\n`, {
      encoding: "utf-8",
      mode: 0o600,
    });

    await updateSessionStore(storePath, (store) => {
      const entryKey = compactTarget.primaryKey;
      const entryToUpdate = store[entryKey];
      if (!entryToUpdate) return;
      delete entryToUpdate.inputTokens;
      delete entryToUpdate.outputTokens;
      delete entryToUpdate.totalTokens;
      entryToUpdate.updatedAt = Date.now();
    });

    respond(
      true,
      {
        ok: true,
        key: target.canonicalKey,
        compacted: true,
        archived,
        kept: keptLines.length,
      },
      undefined,
    );
  },
};
