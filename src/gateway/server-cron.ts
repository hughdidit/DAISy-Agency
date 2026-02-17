import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { CliDeps } from "../cli/deps.js";
import { loadConfig } from "../config/config.js";
import { resolveAgentMainSessionKey } from "../config/sessions.js";
import { resolveStorePath } from "../config/sessions/paths.js";
import { runCronIsolatedAgentTurn } from "../cron/isolated-agent.js";
import { appendCronRunLog, resolveCronRunLogPath } from "../cron/run-log.js";
import { CronService } from "../cron/service.js";
import { resolveCronStorePath } from "../cron/store.js";
import { runHeartbeatOnce } from "../infra/heartbeat-runner.js";
import { requestHeartbeatNow } from "../infra/heartbeat-wake.js";
import { enqueueSystemEvent } from "../infra/system-events.js";
import { getChildLogger } from "../logging.js";
import { normalizeAgentId, toAgentStoreSessionKey } from "../routing/session-key.js";
import { defaultRuntime } from "../runtime.js";

export type GatewayCronState = {
  cron: CronService;
  storePath: string;
  cronEnabled: boolean;
};

export function buildGatewayCronService(params: {
  cfg: ReturnType<typeof loadConfig>;
  deps: CliDeps;
  broadcast: (event: string, payload: unknown, opts?: { dropIfSlow?: boolean }) => void;
}): GatewayCronState {
  const cronLogger = getChildLogger({ module: "cron" });
  const storePath = resolveCronStorePath(params.cfg.cron?.store);
  const cronEnabled = process.env.CLAWDBOT_SKIP_CRON !== "1" && params.cfg.cron?.enabled !== false;

  const resolveCronAgent = (requested?: string | null) => {
    const runtimeConfig = loadConfig();
    const normalized =
      typeof requested === "string" && requested.trim() ? normalizeAgentId(requested) : undefined;
    const hasAgent =
      normalized !== undefined &&
      Array.isArray(runtimeConfig.agents?.list) &&
      runtimeConfig.agents.list.some(
        (entry) =>
          entry && typeof entry.id === "string" && normalizeAgentId(entry.id) === normalized,
      );
    const agentId = hasAgent ? normalized : resolveDefaultAgentId(runtimeConfig);
    return { agentId, cfg: runtimeConfig };
  };

<<<<<<< HEAD
=======
  const resolveCronSessionKey = (params: {
    runtimeConfig: ReturnType<typeof loadConfig>;
    agentId: string;
    requestedSessionKey?: string | null;
  }) => {
    const requested = params.requestedSessionKey?.trim();
    if (!requested) {
      return resolveAgentMainSessionKey({
        cfg: params.runtimeConfig,
        agentId: params.agentId,
      });
    }
    const candidate = toAgentStoreSessionKey({
      agentId: params.agentId,
      requestKey: requested,
      mainKey: params.runtimeConfig.session?.mainKey,
    });
    const canonical = canonicalizeMainSessionAlias({
      cfg: params.runtimeConfig,
      agentId: params.agentId,
      sessionKey: candidate,
    });
    if (canonical !== "global") {
      const sessionAgentId = resolveAgentIdFromSessionKey(canonical);
      if (normalizeAgentId(sessionAgentId) !== normalizeAgentId(params.agentId)) {
        return resolveAgentMainSessionKey({
          cfg: params.runtimeConfig,
          agentId: params.agentId,
        });
      }
    }
    return canonical;
  };

  const resolveCronWakeTarget = (opts?: { agentId?: string; sessionKey?: string | null }) => {
    const runtimeConfig = loadConfig();
    const requestedAgentId = opts?.agentId ? resolveCronAgent(opts.agentId).agentId : undefined;
    const derivedAgentId =
      requestedAgentId ??
      (opts?.sessionKey
        ? normalizeAgentId(resolveAgentIdFromSessionKey(opts.sessionKey))
        : undefined);
    const agentId = derivedAgentId || undefined;
    const sessionKey =
      opts?.sessionKey && agentId
        ? resolveCronSessionKey({
            runtimeConfig,
            agentId,
            requestedSessionKey: opts.sessionKey,
          })
        : undefined;
    return { runtimeConfig, agentId, sessionKey };
  };

>>>>>>> c20ef582c (fix: align cron session key routing (#18637) (thanks @vignesh07))
  const defaultAgentId = resolveDefaultAgentId(params.cfg);
  const resolveSessionStorePath = (agentId?: string) =>
    resolveStorePath(params.cfg.session?.store, {
      agentId: agentId ?? defaultAgentId,
    });
  const sessionStorePath = resolveSessionStorePath(defaultAgentId);

  const cron = new CronService({
    storePath,
    cronEnabled,
    cronConfig: params.cfg.cron,
    defaultAgentId,
    resolveSessionStorePath,
    sessionStorePath,
    enqueueSystemEvent: (text, opts) => {
      const { agentId, cfg: runtimeConfig } = resolveCronAgent(opts?.agentId);
      const sessionKey = resolveAgentMainSessionKey({
        cfg: runtimeConfig,
        agentId,
      });
      enqueueSystemEvent(text, { sessionKey });
    },
    requestHeartbeatNow,
    runHeartbeatOnce: async (opts) => {
      const runtimeConfig = loadConfig();
      return await runHeartbeatOnce({
        cfg: runtimeConfig,
        reason: opts?.reason,
        deps: { ...params.deps, runtime: defaultRuntime },
      });
    },
    runIsolatedAgentJob: async ({ job, message }) => {
      const { agentId, cfg: runtimeConfig } = resolveCronAgent(job.agentId);
      return await runCronIsolatedAgentTurn({
        cfg: runtimeConfig,
        deps: params.deps,
        job,
        message,
        agentId,
        sessionKey: `cron:${job.id}`,
        lane: "cron",
      });
    },
    log: getChildLogger({ module: "cron", storePath }),
    onEvent: (evt) => {
      params.broadcast("cron", evt, { dropIfSlow: true });
      if (evt.action === "finished") {
        const logPath = resolveCronRunLogPath({
          storePath,
          jobId: evt.jobId,
        });
        void appendCronRunLog(logPath, {
          ts: Date.now(),
          jobId: evt.jobId,
          action: "finished",
          status: evt.status,
          error: evt.error,
          summary: evt.summary,
          sessionId: evt.sessionId,
          sessionKey: evt.sessionKey,
          runAtMs: evt.runAtMs,
          durationMs: evt.durationMs,
          nextRunAtMs: evt.nextRunAtMs,
        }).catch((err) => {
          cronLogger.warn({ err: String(err), logPath }, "cron: run log append failed");
        });
      }
    },
  });

  return { cron, storePath, cronEnabled };
}
