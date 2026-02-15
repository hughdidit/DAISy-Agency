import { setCliSessionId } from "../../agents/cli-session.js";
import { hasNonzeroUsage, type NormalizedUsage } from "../../agents/usage.js";
import {
  type SessionSystemPromptReport,
  type SessionEntry,
  updateSessionStoreEntry,
} from "../../config/sessions.js";
import { logVerbose } from "../../globals.js";

function applyCliSessionIdToSessionPatch(
  params: {
    providerUsed?: string;
    cliSessionId?: string;
  },
  entry: SessionEntry,
  patch: Partial<SessionEntry>,
): Partial<SessionEntry> {
  const cliProvider = params.providerUsed ?? entry.modelProvider;
  if (params.cliSessionId && cliProvider) {
    const nextEntry = { ...entry, ...patch };
    setCliSessionId(nextEntry, cliProvider, params.cliSessionId);
    return {
      ...patch,
      cliSessionIds: nextEntry.cliSessionIds,
      claudeCliSessionId: nextEntry.claudeCliSessionId,
    };
  }
  return patch;
}

export async function persistSessionUsageUpdate(params: {
  storePath?: string;
  sessionKey?: string;
  usage?: NormalizedUsage;
  modelUsed?: string;
  providerUsed?: string;
  contextTokensUsed?: number;
  promptTokens?: number;
  systemPromptReport?: SessionSystemPromptReport;
  cliSessionId?: string;
  logLabel?: string;
}): Promise<void> {
  const { storePath, sessionKey } = params;
  if (!storePath || !sessionKey) {
    return;
  }

  const label = params.logLabel ? `${params.logLabel} ` : "";
  if (hasNonzeroUsage(params.usage)) {
    try {
      await updateSessionStoreEntry({
        storePath,
        sessionKey,
        update: async (entry) => {
          const input = params.usage?.input ?? 0;
          const output = params.usage?.output ?? 0;
          const promptTokens =
            input + (params.usage?.cacheRead ?? 0) + (params.usage?.cacheWrite ?? 0);
          const patch: Partial<SessionEntry> = {
            inputTokens: input,
            outputTokens: output,
<<<<<<< HEAD
            totalTokens: promptTokens > 0 ? promptTokens : (params.usage?.total ?? input),
=======
            totalTokens:
              deriveSessionTotalTokens({
                usage: usageForContext,
                contextTokens: resolvedContextTokens,
                promptTokens: params.promptTokens,
              }) ?? input,
>>>>>>> 957b88308 (fix(agents): stabilize overflow compaction retries and session context accounting (openclaw#14102) thanks @vpesh)
            modelProvider: params.providerUsed ?? entry.modelProvider,
            model: params.modelUsed ?? entry.model,
            contextTokens: params.contextTokensUsed ?? entry.contextTokens,
            systemPromptReport: params.systemPromptReport ?? entry.systemPromptReport,
            updatedAt: Date.now(),
          };
          return applyCliSessionIdToSessionPatch(params, entry, patch);
        },
      });
    } catch (err) {
      logVerbose(`failed to persist ${label}usage update: ${String(err)}`);
    }
    return;
  }

  if (params.modelUsed || params.contextTokensUsed) {
    try {
      await updateSessionStoreEntry({
        storePath,
        sessionKey,
        update: async (entry) => {
          const patch: Partial<SessionEntry> = {
            modelProvider: params.providerUsed ?? entry.modelProvider,
            model: params.modelUsed ?? entry.model,
            contextTokens: params.contextTokensUsed ?? entry.contextTokens,
            systemPromptReport: params.systemPromptReport ?? entry.systemPromptReport,
            updatedAt: Date.now(),
          };
          return applyCliSessionIdToSessionPatch(params, entry, patch);
        },
      });
    } catch (err) {
      logVerbose(`failed to persist ${label}model/context update: ${String(err)}`);
    }
  }
}
