#!/usr/bin/env node
import process from "node:process";
import { loadConfig } from "../config/config.js";
import { resolveStorePath, updateSessionStore } from "../config/sessions.js";
import type { SessionEntry } from "../config/sessions.js";
import { resolveCronStorePath, updateCronStore } from "../cron/store.js";
import { archiveSessionTranscripts } from "../gateway/session-utils.js";

type CleanupResult =
  | {
      ok: true;
      mode: "cron-job";
      removed: boolean;
      path: string;
    }
  | {
      ok: true;
      mode: "session";
      deleted: boolean;
      archived: string[];
      path: string;
    };

function usage(): never {
  throw new Error("usage: node dist/verify/acceptance-cleanup.js <cron-job|session> <exact-id>");
}

function parseArgs(argv: string[]): { mode: "cron-job" | "session"; id: string } {
  const [mode, id, ...rest] = argv;
  if ((mode !== "cron-job" && mode !== "session") || !id || rest.length > 0) {
    usage();
  }
  return { mode, id };
}

async function removeCronJob(jobId: string): Promise<CleanupResult> {
  const cfg = loadConfig();
  const storePath = resolveCronStorePath(cfg.cron?.store);
  const removed = await updateCronStore(storePath, (store) => {
    const before = store.jobs.length;
    store.jobs = store.jobs.filter((job) => job?.id !== jobId);
    return store.jobs.length !== before;
  });
  return { ok: true, mode: "cron-job", removed, path: storePath };
}

function resolveAgentIdFromSessionKey(key: string): string {
  return /^agent:([^:]+):/.exec(key)?.[1]?.toLowerCase() ?? "main";
}

async function deleteSession(sessionKey: string): Promise<CleanupResult> {
  const cfg = loadConfig();
  const agentId = resolveAgentIdFromSessionKey(sessionKey);
  const storePath = resolveStorePath(cfg.session?.store, { agentId });
  let sessionId: string | undefined;
  let sessionFile: string | undefined;
  const deleted = await updateSessionStore(
    storePath,
    (store: Record<string, SessionEntry>) => {
      const entry = store[sessionKey];
      sessionId = entry?.sessionId;
      sessionFile = entry?.sessionFile;
      if (entry) {
        delete store[sessionKey];
      }
      return Boolean(entry);
    },
    { skipMaintenance: true },
  );
  const archived =
    deleted && sessionId
      ? archiveSessionTranscripts({
          sessionId,
          storePath,
          sessionFile,
          agentId,
          reason: "deleted",
          restrictToStoreDir: true,
        })
      : [];
  return { ok: true, mode: "session", deleted, archived, path: storePath };
}

async function main(): Promise<void> {
  const { mode, id } = parseArgs(process.argv.slice(2));
  const result = mode === "cron-job" ? await removeCronJob(id) : await deleteSession(id);
  console.log(JSON.stringify(result, null, 2));
}

await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exitCode = 1;
});
