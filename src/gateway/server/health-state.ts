import { resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { getHealthSnapshot, type HealthSummary } from "../../commands/health.js";
import { CONFIG_PATH, STATE_DIR, loadConfig } from "../../config/config.js";
import { resolveMainSessionKey } from "../../config/sessions.js";
<<<<<<< HEAD
=======
import { getUpdateAvailable } from "../../infra/update-startup.js";
import { listSystemPresence } from "../../infra/system-presence.js";
>>>>>>> 2ddc13cdb (feat(ui): add update warning banner to control dashboard)
import { normalizeMainKey } from "../../routing/session-key.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { listSystemPresence } from "../../infra/system-presence.js";
import type { Snapshot } from "../protocol/index.js";
=======
import { resolveGatewayAuth } from "../auth.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 1fb52b4d7 (feat(gateway): add trusted-proxy auth mode (#15940))
=======
import type { Snapshot } from "../protocol/index.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { resolveGatewayAuth } from "../auth.js";
>>>>>>> ed11e93cf (chore(format))
=======
import type { Snapshot } from "../protocol/index.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import { resolveGatewayAuth } from "../auth.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { Snapshot } from "../protocol/index.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

let presenceVersion = 1;
let healthVersion = 1;
let healthCache: HealthSummary | null = null;
let healthRefresh: Promise<HealthSummary> | null = null;
let broadcastHealthUpdate: ((snap: HealthSummary) => void) | null = null;

export function buildGatewaySnapshot(): Snapshot {
  const cfg = loadConfig();
  const defaultAgentId = resolveDefaultAgentId(cfg);
  const mainKey = normalizeMainKey(cfg.session?.mainKey);
  const mainSessionKey = resolveMainSessionKey(cfg);
  const scope = cfg.session?.scope ?? "per-sender";
  const presence = listSystemPresence();
  const uptimeMs = Math.round(process.uptime() * 1000);
  const auth = resolveGatewayAuth({ authConfig: cfg.gateway?.auth, env: process.env });
  const updateAvailable = getUpdateAvailable() ?? undefined;
  // Health is async; caller should await getHealthSnapshot and replace later if needed.
  const emptyHealth: unknown = {};
  return {
    presence,
    health: emptyHealth,
    stateVersion: { presence: presenceVersion, health: healthVersion },
    uptimeMs,
    // Surface resolved paths so UIs can display the true config location.
    configPath: CONFIG_PATH,
    stateDir: STATE_DIR,
    sessionDefaults: {
      defaultAgentId,
      mainKey,
      mainSessionKey,
      scope,
    },
    authMode: auth.mode,
    updateAvailable,
  };
}

export function getHealthCache(): HealthSummary | null {
  return healthCache;
}

export function getHealthVersion(): number {
  return healthVersion;
}

export function incrementPresenceVersion(): number {
  presenceVersion += 1;
  return presenceVersion;
}

export function getPresenceVersion(): number {
  return presenceVersion;
}

export function setBroadcastHealthUpdate(fn: ((snap: HealthSummary) => void) | null) {
  broadcastHealthUpdate = fn;
}

export async function refreshGatewayHealthSnapshot(opts?: { probe?: boolean }) {
  if (!healthRefresh) {
    healthRefresh = (async () => {
      const snap = await getHealthSnapshot({ probe: opts?.probe });
      healthCache = snap;
      healthVersion += 1;
      if (broadcastHealthUpdate) {
        broadcastHealthUpdate(snap);
      }
      return snap;
    })().finally(() => {
      healthRefresh = null;
    });
  }
  return healthRefresh;
}
