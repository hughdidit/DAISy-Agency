import { migrateLegacyCronPayload } from "../payload-migration.js";
import { loadCronStore, saveCronStore } from "../store.js";
import type { CronJob } from "../types.js";
import { inferLegacyName, normalizeOptionalText } from "./normalize.js";
import type { CronServiceState } from "./state.js";

const storeCache = new Map<string, { version: 1; jobs: CronJob[] }>();

<<<<<<< HEAD
export async function ensureLoaded(state: CronServiceState) {
  if (state.store) return;
  const cached = storeCache.get(state.deps.storePath);
  if (cached) {
    state.store = cached;
    return;
  }
=======
function buildDeliveryFromLegacyPayload(payload: Record<string, unknown>) {
  const deliver = payload.deliver;
  const mode = deliver === false ? "none" : "announce";
  const channelRaw =
    typeof payload.channel === "string" ? payload.channel.trim().toLowerCase() : "";
  const toRaw = typeof payload.to === "string" ? payload.to.trim() : "";
  const next: Record<string, unknown> = { mode };
  if (channelRaw) {
    next.channel = channelRaw;
  }
  if (toRaw) {
    next.to = toRaw;
  }
  if (typeof payload.bestEffortDeliver === "boolean") {
    next.bestEffort = payload.bestEffortDeliver;
  }
  return next;
}

function buildDeliveryPatchFromLegacyPayload(payload: Record<string, unknown>) {
  const deliver = payload.deliver;
  const channelRaw =
    typeof payload.channel === "string" ? payload.channel.trim().toLowerCase() : "";
  const toRaw = typeof payload.to === "string" ? payload.to.trim() : "";
  const next: Record<string, unknown> = {};
  let hasPatch = false;

  if (deliver === false) {
    next.mode = "none";
    hasPatch = true;
  } else if (deliver === true || toRaw) {
    next.mode = "announce";
    hasPatch = true;
  }
  if (channelRaw) {
    next.channel = channelRaw;
    hasPatch = true;
  }
  if (toRaw) {
    next.to = toRaw;
    hasPatch = true;
  }
  if (typeof payload.bestEffortDeliver === "boolean") {
    next.bestEffort = payload.bestEffortDeliver;
    hasPatch = true;
  }

  return hasPatch ? next : null;
}

function mergeLegacyDeliveryInto(
  delivery: Record<string, unknown>,
  payload: Record<string, unknown>,
) {
  const patch = buildDeliveryPatchFromLegacyPayload(payload);
  if (!patch) {
    return { delivery, mutated: false };
  }

  const next = { ...delivery };
  let mutated = false;

  if ("mode" in patch && patch.mode !== next.mode) {
    next.mode = patch.mode;
    mutated = true;
  }
  if ("channel" in patch && patch.channel !== next.channel) {
    next.channel = patch.channel;
    mutated = true;
  }
  if ("to" in patch && patch.to !== next.to) {
    next.to = patch.to;
    mutated = true;
  }
  if ("bestEffort" in patch && patch.bestEffort !== next.bestEffort) {
    next.bestEffort = patch.bestEffort;
    mutated = true;
  }

  return { delivery: next, mutated };
}

function stripLegacyDeliveryFields(payload: Record<string, unknown>) {
  if ("deliver" in payload) {
    delete payload.deliver;
  }
  if ("channel" in payload) {
    delete payload.channel;
  }
  if ("to" in payload) {
    delete payload.to;
  }
  if ("bestEffortDeliver" in payload) {
    delete payload.bestEffortDeliver;
  }
}

async function getFileMtimeMs(path: string): Promise<number | null> {
  try {
    const stats = await fs.promises.stat(path);
    return stats.mtimeMs;
  } catch {
    return null;
  }
}

export async function ensureLoaded(state: CronServiceState, opts?: { forceReload?: boolean }) {
  // Fast path: store is already in memory. Other callers (add, list, run, …)
  // trust the in-memory copy to avoid a stat syscall on every operation.
  if (state.store && !opts?.forceReload) {
    return;
  }
  // Force reload always re-reads the file to avoid missing cross-service
  // edits on filesystems with coarse mtime resolution.

  const fileMtimeMs = await getFileMtimeMs(state.deps.storePath);
>>>>>>> 6f200ea77 (fix: force reload cron store)
  const loaded = await loadCronStore(state.deps.storePath);
  const jobs = (loaded.jobs ?? []) as unknown as Array<Record<string, unknown>>;
  let mutated = false;
  for (const raw of jobs) {
    const nameRaw = raw.name;
    if (typeof nameRaw !== "string" || nameRaw.trim().length === 0) {
      raw.name = inferLegacyName({
        schedule: raw.schedule as never,
        payload: raw.payload as never,
      });
      mutated = true;
    } else {
      raw.name = nameRaw.trim();
    }

    const desc = normalizeOptionalText(raw.description);
    if (raw.description !== desc) {
      raw.description = desc;
      mutated = true;
    }

    const payload = raw.payload;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      if (migrateLegacyCronPayload(payload as Record<string, unknown>)) {
        mutated = true;
      }
    }
  }
  state.store = { version: 1, jobs: jobs as unknown as CronJob[] };
  storeCache.set(state.deps.storePath, state.store);
  if (mutated) await persist(state);
}

export function warnIfDisabled(state: CronServiceState, action: string) {
  if (state.deps.cronEnabled) return;
  if (state.warnedDisabled) return;
  state.warnedDisabled = true;
  state.deps.log.warn(
    { enabled: false, action, storePath: state.deps.storePath },
    "cron: scheduler disabled; jobs will not run automatically",
  );
}

export async function persist(state: CronServiceState) {
  if (!state.store) return;
  await saveCronStore(state.deps.storePath, state.store);
}
