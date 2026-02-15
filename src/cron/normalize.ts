import { sanitizeAgentId } from "../routing/session-key.js";
import { isRecord } from "../utils.js";
import {
  buildDeliveryFromLegacyPayload,
  hasLegacyDeliveryHints,
  stripLegacyDeliveryFields,
} from "./legacy-delivery.js";
import { parseAbsoluteTimeMs } from "./parse.js";
import { migrateLegacyCronPayload } from "./payload-migration.js";
import type { CronJobCreate, CronJobPatch } from "./types.js";

type UnknownRecord = Record<string, unknown>;

type NormalizeOptions = {
  applyDefaults?: boolean;
};

const DEFAULT_OPTIONS: NormalizeOptions = {
  applyDefaults: false,
};

function coerceSchedule(schedule: UnknownRecord) {
  const next: UnknownRecord = { ...schedule };
  const kind = typeof schedule.kind === "string" ? schedule.kind : undefined;
  const atMsRaw = schedule.atMs;
  const atRaw = schedule.at;
  const atString = typeof atRaw === "string" ? atRaw.trim() : "";
  const parsedAtMs =
    typeof atMsRaw === "number"
      ? atMsRaw
      : typeof atMsRaw === "string"
        ? parseAbsoluteTimeMs(atMsRaw)
        : atString
          ? parseAbsoluteTimeMs(atString)
          : null;

  if (!kind) {
    if (
      typeof schedule.atMs === "number" ||
      typeof schedule.at === "string" ||
      typeof schedule.atMs === "string"
    ) {
      next.kind = "at";
    } else if (typeof schedule.everyMs === "number") {
      next.kind = "every";
    } else if (typeof schedule.expr === "string") {
      next.kind = "cron";
    }
  }

  if (atString) {
    next.at = parsedAtMs ? new Date(parsedAtMs).toISOString() : atString;
  } else if (parsedAtMs !== null) {
    next.at = new Date(parsedAtMs).toISOString();
  }
  if ("atMs" in next) {
    delete next.atMs;
  }

  return next;
}

function coercePayload(payload: UnknownRecord) {
  const next: UnknownRecord = { ...payload };
  // Back-compat: older configs used `provider` for delivery channel.
  migrateLegacyCronPayload(next);
<<<<<<< HEAD
=======
  const kindRaw = typeof next.kind === "string" ? next.kind.trim().toLowerCase() : "";
  if (kindRaw === "agentturn") {
    next.kind = "agentTurn";
  } else if (kindRaw === "systemevent") {
    next.kind = "systemEvent";
  } else if (kindRaw) {
    next.kind = kindRaw;
  }
  if (!next.kind) {
    const hasMessage = typeof next.message === "string" && next.message.trim().length > 0;
    const hasText = typeof next.text === "string" && next.text.trim().length > 0;
    const hasAgentTurnHint =
      typeof next.model === "string" ||
      typeof next.thinking === "string" ||
      typeof next.timeoutSeconds === "number" ||
      typeof next.allowUnsafeExternalContent === "boolean";
    if (hasMessage) {
      next.kind = "agentTurn";
    } else if (hasText) {
      next.kind = "systemEvent";
    } else if (hasAgentTurnHint) {
      // Accept partial agentTurn payload patches that only tweak agent-turn-only fields.
      next.kind = "agentTurn";
    }
  }
  if (typeof next.message === "string") {
    const trimmed = next.message.trim();
    if (trimmed) {
      next.message = trimmed;
    }
  }
  if (typeof next.text === "string") {
    const trimmed = next.text.trim();
    if (trimmed) {
      next.text = trimmed;
    }
  }
  if ("model" in next) {
    if (typeof next.model === "string") {
      const trimmed = next.model.trim();
      if (trimmed) {
        next.model = trimmed;
      } else {
        delete next.model;
      }
    } else {
      delete next.model;
    }
  }
  if ("thinking" in next) {
    if (typeof next.thinking === "string") {
      const trimmed = next.thinking.trim();
      if (trimmed) {
        next.thinking = trimmed;
      } else {
        delete next.thinking;
      }
    } else {
      delete next.thinking;
    }
  }
  if ("timeoutSeconds" in next) {
    if (typeof next.timeoutSeconds === "number" && Number.isFinite(next.timeoutSeconds)) {
      next.timeoutSeconds = Math.max(1, Math.floor(next.timeoutSeconds));
    } else {
      delete next.timeoutSeconds;
    }
  }
  if (
    "allowUnsafeExternalContent" in next &&
    typeof next.allowUnsafeExternalContent !== "boolean"
  ) {
    delete next.allowUnsafeExternalContent;
  }
>>>>>>> 89dccc79a (cron: infer payload kind for model-only update patches (openclaw#15664) thanks @rodrigouroz)
  return next;
}

function coerceDelivery(delivery: UnknownRecord) {
  const next: UnknownRecord = { ...delivery };
  if (typeof delivery.mode === "string") {
    const mode = delivery.mode.trim().toLowerCase();
    next.mode = mode === "deliver" ? "announce" : mode;
  }
  if (typeof delivery.channel === "string") {
    const trimmed = delivery.channel.trim().toLowerCase();
    if (trimmed) {
      next.channel = trimmed;
    } else {
      delete next.channel;
    }
  }
  if (typeof delivery.to === "string") {
    const trimmed = delivery.to.trim();
    if (trimmed) {
      next.to = trimmed;
    } else {
      delete next.to;
    }
  }
  return next;
}

function unwrapJob(raw: UnknownRecord) {
  if (isRecord(raw.data)) {
    return raw.data;
  }
  if (isRecord(raw.job)) {
    return raw.job;
  }
  return raw;
}

export function normalizeCronJobInput(
  raw: unknown,
  options: NormalizeOptions = DEFAULT_OPTIONS,
): UnknownRecord | null {
  if (!isRecord(raw)) {
    return null;
  }
  const base = unwrapJob(raw);
  const next: UnknownRecord = { ...base };

  if ("agentId" in base) {
    const agentId = base.agentId;
    if (agentId === null) {
      next.agentId = null;
    } else if (typeof agentId === "string") {
      const trimmed = agentId.trim();
      if (trimmed) {
        next.agentId = sanitizeAgentId(trimmed);
      } else {
        delete next.agentId;
      }
    }
  }

  if ("enabled" in base) {
    const enabled = base.enabled;
    if (typeof enabled === "boolean") {
      next.enabled = enabled;
    } else if (typeof enabled === "string") {
      const trimmed = enabled.trim().toLowerCase();
      if (trimmed === "true") {
        next.enabled = true;
      }
      if (trimmed === "false") {
        next.enabled = false;
      }
    }
  }

  if (isRecord(base.schedule)) {
    next.schedule = coerceSchedule(base.schedule);
  }

  if (isRecord(base.payload)) {
    next.payload = coercePayload(base.payload);
  }

  if (isRecord(base.delivery)) {
    next.delivery = coerceDelivery(base.delivery);
  }

  if (isRecord(base.isolation)) {
    delete next.isolation;
  }

  if (options.applyDefaults) {
    if (!next.wakeMode) {
      next.wakeMode = "next-heartbeat";
    }
    if (typeof next.enabled !== "boolean") {
      next.enabled = true;
    }
    if (!next.sessionTarget && isRecord(next.payload)) {
      const kind = typeof next.payload.kind === "string" ? next.payload.kind : "";
      if (kind === "systemEvent") {
        next.sessionTarget = "main";
      }
      if (kind === "agentTurn") {
        next.sessionTarget = "isolated";
      }
    }
    if (
      "schedule" in next &&
      isRecord(next.schedule) &&
      next.schedule.kind === "at" &&
      !("deleteAfterRun" in next)
    ) {
      next.deleteAfterRun = true;
    }
    const payload = isRecord(next.payload) ? next.payload : null;
    const payloadKind = payload && typeof payload.kind === "string" ? payload.kind : "";
    const sessionTarget = typeof next.sessionTarget === "string" ? next.sessionTarget : "";
    const isIsolatedAgentTurn =
      sessionTarget === "isolated" || (sessionTarget === "" && payloadKind === "agentTurn");
    const hasDelivery = "delivery" in next && next.delivery !== undefined;
    const hasLegacyDelivery = payload ? hasLegacyDeliveryHints(payload) : false;
    if (!hasDelivery && isIsolatedAgentTurn && payloadKind === "agentTurn") {
      if (payload && hasLegacyDelivery) {
        next.delivery = buildDeliveryFromLegacyPayload(payload);
        stripLegacyDeliveryFields(payload);
      } else {
        next.delivery = { mode: "announce" };
      }
    }
  }

  return next;
}

export function normalizeCronJobCreate(
  raw: unknown,
  options?: NormalizeOptions,
): CronJobCreate | null {
  return normalizeCronJobInput(raw, {
    applyDefaults: true,
    ...options,
  }) as CronJobCreate | null;
}

export function normalizeCronJobPatch(
  raw: unknown,
  options?: NormalizeOptions,
): CronJobPatch | null {
  return normalizeCronJobInput(raw, {
    applyDefaults: false,
    ...options,
  }) as CronJobPatch | null;
}
