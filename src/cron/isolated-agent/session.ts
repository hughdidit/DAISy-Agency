import crypto from "node:crypto";
<<<<<<< HEAD

import type { MoltbotConfig } from "../../config/config.js";
=======
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> fe57bea08 (Subagents: restore announce chain + fix nested retry/drop regressions (#22223))
import { loadSessionStore, resolveStorePath, type SessionEntry } from "../../config/sessions.js";

export function resolveCronSession(params: {
  cfg: MoltbotConfig;
  sessionKey: string;
  nowMs: number;
  agentId: string;
}) {
  const sessionCfg = params.cfg.session;
  const storePath = resolveStorePath(sessionCfg?.store, {
    agentId: params.agentId,
  });
  const store = loadSessionStore(storePath);
  const entry = store[params.sessionKey];
  const sessionId = crypto.randomUUID();
  const systemSent = false;
<<<<<<< HEAD
=======

>>>>>>> fe57bea08 (Subagents: restore announce chain + fix nested retry/drop regressions (#22223))
  const sessionEntry: SessionEntry = {
    sessionId,
    updatedAt: params.nowMs,
    systemSent,
<<<<<<< HEAD
    thinkingLevel: entry?.thinkingLevel,
    verboseLevel: entry?.verboseLevel,
    model: entry?.model,
    modelOverride: entry?.modelOverride,
    providerOverride: entry?.providerOverride,
    contextTokens: entry?.contextTokens,
    sendPolicy: entry?.sendPolicy,
    lastChannel: entry?.lastChannel,
    lastTo: entry?.lastTo,
    lastAccountId: entry?.lastAccountId,
    label: entry?.label,
    displayName: entry?.displayName,
    skillsSnapshot: entry?.skillsSnapshot,
=======
    // When starting a fresh session (forceNew / isolated), clear delivery routing
    // state inherited from prior sessions. Without this, lastThreadId leaks into
    // the new session and causes announce-mode cron deliveries to post as thread
    // replies instead of channel top-level messages.
    // deliveryContext must also be cleared because normalizeSessionEntryDelivery
    // repopulates lastThreadId from deliveryContext.threadId on store writes.
    ...(isNewSession && {
      lastChannel: undefined,
      lastTo: undefined,
      lastAccountId: undefined,
      lastThreadId: undefined,
      deliveryContext: undefined,
    }),
>>>>>>> e1df1c60b (fix: clear delivery routing state when creating isolated cron sessions (#27778))
  };
  return { storePath, store, sessionEntry, systemSent, isNewSession: true };
}
