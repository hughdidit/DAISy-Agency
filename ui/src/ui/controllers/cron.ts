<<<<<<< HEAD
import { toNumber } from "../format";
import type { GatewayBrowserClient } from "../gateway";
import type { CronJob, CronRunLogEntry, CronStatus } from "../types";
import type { CronFormState } from "../ui-types";
=======
import { t } from "../../i18n/index.ts";
import { DEFAULT_CRON_FORM } from "../app-defaults.ts";
import { toNumber } from "../format.ts";
import type { GatewayBrowserClient } from "../gateway.ts";
import type {
  CronJob,
  CronDeliveryStatus,
  CronJobsEnabledFilter,
  CronJobsListResult,
  CronJobsSortBy,
  CronRunScope,
  CronRunLogEntry,
  CronRunsResult,
  CronRunsStatusFilter,
  CronRunsStatusValue,
  CronSortDir,
  CronStatus,
} from "../types.ts";
import { CRON_CHANNEL_LAST } from "../ui-types.ts";
import type { CronFormState } from "../ui-types.ts";

export type CronFieldKey =
  | "name"
  | "scheduleAt"
  | "everyAmount"
  | "cronExpr"
  | "staggerAmount"
  | "payloadText"
  | "payloadModel"
  | "payloadThinking"
  | "timeoutSeconds"
  | "deliveryTo";

export type CronFieldErrors = Partial<Record<CronFieldKey, string>>;
>>>>>>> 8c98cf05b (i18n: add zh-CN for cron page and validation errors (#29315))

export type CronState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  cronLoading: boolean;
  cronJobs: CronJob[];
  cronStatus: CronStatus | null;
  cronError: string | null;
  cronForm: CronFormState;
  cronRunsJobId: string | null;
  cronRuns: CronRunLogEntry[];
  cronBusy: boolean;
};

<<<<<<< HEAD
=======
export type CronModelSuggestionsState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  cronModelSuggestions: string[];
};

export function supportsAnnounceDelivery(
  form: Pick<CronFormState, "sessionTarget" | "payloadKind">,
) {
  return form.sessionTarget === "isolated" && form.payloadKind === "agentTurn";
}

export function normalizeCronFormState(form: CronFormState): CronFormState {
  if (form.deliveryMode !== "announce") {
    return form;
  }
  if (supportsAnnounceDelivery(form)) {
    return form;
  }
  return {
    ...form,
    deliveryMode: "none",
  };
}

export function validateCronForm(form: CronFormState): CronFieldErrors {
  const errors: CronFieldErrors = {};
  if (!form.name.trim()) {
    errors.name = "cron.errors.nameRequired";
  }
  if (form.scheduleKind === "at") {
    const ms = Date.parse(form.scheduleAt);
    if (!Number.isFinite(ms)) {
      errors.scheduleAt = "cron.errors.scheduleAtInvalid";
    }
  } else if (form.scheduleKind === "every") {
    const amount = toNumber(form.everyAmount, 0);
    if (amount <= 0) {
      errors.everyAmount = "cron.errors.everyAmountInvalid";
    }
  } else {
    if (!form.cronExpr.trim()) {
      errors.cronExpr = "cron.errors.cronExprRequired";
    }
    if (!form.scheduleExact) {
      const staggerAmount = form.staggerAmount.trim();
      if (staggerAmount) {
        const stagger = toNumber(staggerAmount, 0);
        if (stagger <= 0) {
          errors.staggerAmount = "cron.errors.staggerAmountInvalid";
        }
      }
    }
  }
  if (!form.payloadText.trim()) {
    errors.payloadText =
      form.payloadKind === "systemEvent"
        ? "cron.errors.systemTextRequired"
        : "cron.errors.agentMessageRequired";
  }
  if (form.payloadKind === "agentTurn") {
    const timeoutRaw = form.timeoutSeconds.trim();
    if (timeoutRaw) {
      const timeout = toNumber(timeoutRaw, 0);
      if (timeout <= 0) {
        errors.timeoutSeconds = "cron.errors.timeoutInvalid";
      }
    }
  }
  if (form.deliveryMode === "webhook") {
    const target = form.deliveryTo.trim();
    if (!target) {
      errors.deliveryTo = "cron.errors.webhookUrlRequired";
    } else if (!/^https?:\/\//i.test(target)) {
      errors.deliveryTo = "cron.errors.webhookUrlInvalid";
    }
  }
  return errors;
}

export function hasCronFormErrors(errors: CronFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

>>>>>>> 8c98cf05b (i18n: add zh-CN for cron page and validation errors (#29315))
export async function loadCronStatus(state: CronState) {
  if (!state.client || !state.connected) return;
  try {
    const res = (await state.client.request("cron.status", {})) as CronStatus;
    state.cronStatus = res;
  } catch (err) {
    state.cronError = String(err);
  }
}

export async function loadCronJobs(state: CronState) {
  if (!state.client || !state.connected) return;
  if (state.cronLoading) return;
  state.cronLoading = true;
  state.cronError = null;
  try {
    const res = (await state.client.request("cron.list", {
      includeDisabled: true,
    })) as { jobs?: CronJob[] };
    state.cronJobs = Array.isArray(res.jobs) ? res.jobs : [];
  } catch (err) {
    state.cronError = String(err);
  } finally {
    state.cronLoading = false;
  }
}

export function buildCronSchedule(form: CronFormState) {
  if (form.scheduleKind === "at") {
    const ms = Date.parse(form.scheduleAt);
<<<<<<< HEAD
    if (!Number.isFinite(ms)) throw new Error("Invalid run time.");
    return { kind: "at" as const, atMs: ms };
  }
  if (form.scheduleKind === "every") {
    const amount = toNumber(form.everyAmount, 0);
    if (amount <= 0) throw new Error("Invalid interval amount.");
=======
    if (!Number.isFinite(ms)) {
      throw new Error(t("cron.errors.invalidRunTime"));
    }
    return { kind: "at" as const, at: new Date(ms).toISOString() };
  }
  if (form.scheduleKind === "every") {
    const amount = toNumber(form.everyAmount, 0);
    if (amount <= 0) {
      throw new Error(t("cron.errors.invalidIntervalAmount"));
    }
>>>>>>> 8c98cf05b (i18n: add zh-CN for cron page and validation errors (#29315))
    const unit = form.everyUnit;
    const mult = unit === "minutes" ? 60_000 : unit === "hours" ? 3_600_000 : 86_400_000;
    return { kind: "every" as const, everyMs: amount * mult };
  }
  const expr = form.cronExpr.trim();
<<<<<<< HEAD
  if (!expr) throw new Error("Cron expression required.");
  return { kind: "cron" as const, expr, tz: form.cronTz.trim() || undefined };
=======
  if (!expr) {
    throw new Error(t("cron.errors.cronExprRequiredShort"));
  }
  if (form.scheduleExact) {
    return { kind: "cron" as const, expr, tz: form.cronTz.trim() || undefined, staggerMs: 0 };
  }
  const staggerAmount = form.staggerAmount.trim();
  if (!staggerAmount) {
    return { kind: "cron" as const, expr, tz: form.cronTz.trim() || undefined };
  }
  const staggerValue = toNumber(staggerAmount, 0);
  if (staggerValue <= 0) {
    throw new Error(t("cron.errors.invalidStaggerAmount"));
  }
  const staggerMs = form.staggerUnit === "minutes" ? staggerValue * 60_000 : staggerValue * 1_000;
  return { kind: "cron" as const, expr, tz: form.cronTz.trim() || undefined, staggerMs };
>>>>>>> 8c98cf05b (i18n: add zh-CN for cron page and validation errors (#29315))
}

export function buildCronPayload(form: CronFormState) {
  if (form.payloadKind === "systemEvent") {
    const text = form.payloadText.trim();
<<<<<<< HEAD
    if (!text) throw new Error("System event text required.");
    return { kind: "systemEvent" as const, text };
  }
  const message = form.payloadText.trim();
  if (!message) throw new Error("Agent message required.");
=======
    if (!text) {
      throw new Error(t("cron.errors.systemEventTextRequired"));
    }
    return { kind: "systemEvent" as const, text };
  }
  const message = form.payloadText.trim();
  if (!message) {
    throw new Error(t("cron.errors.agentMessageRequiredShort"));
  }
>>>>>>> 8c98cf05b (i18n: add zh-CN for cron page and validation errors (#29315))
  const payload: {
    kind: "agentTurn";
    message: string;
    deliver?: boolean;
    channel?: string;
    to?: string;
    timeoutSeconds?: number;
  } = { kind: "agentTurn", message };
  if (form.deliver) payload.deliver = true;
  if (form.channel) payload.channel = form.channel;
  if (form.to.trim()) payload.to = form.to.trim();
  const timeoutSeconds = toNumber(form.timeoutSeconds, 0);
  if (timeoutSeconds > 0) payload.timeoutSeconds = timeoutSeconds;
  return payload;
}

export async function addCronJob(state: CronState) {
  if (!state.client || !state.connected || state.cronBusy) return;
  state.cronBusy = true;
  state.cronError = null;
  try {
    const schedule = buildCronSchedule(state.cronForm);
    const payload = buildCronPayload(state.cronForm);
    const agentId = state.cronForm.agentId.trim();
    const job = {
      name: state.cronForm.name.trim(),
      description: state.cronForm.description.trim() || undefined,
      agentId: agentId || undefined,
      enabled: state.cronForm.enabled,
      schedule,
      sessionTarget: state.cronForm.sessionTarget,
      wakeMode: state.cronForm.wakeMode,
      payload,
      isolation:
        state.cronForm.postToMainPrefix.trim() &&
        state.cronForm.sessionTarget === "isolated"
          ? { postToMainPrefix: state.cronForm.postToMainPrefix.trim() }
          : undefined,
    };
    if (!job.name) throw new Error("Name required.");
    await state.client.request("cron.add", job);
    state.cronForm = {
      ...state.cronForm,
      name: "",
      description: "",
      payloadText: "",
    };
<<<<<<< HEAD
=======
    if (!job.name) {
      throw new Error(t("cron.errors.nameRequiredShort"));
    }
    if (state.cronEditingJobId) {
      await state.client.request("cron.update", {
        id: state.cronEditingJobId,
        patch: job,
      });
      clearCronEditState(state);
    } else {
      await state.client.request("cron.add", job);
      resetCronFormToDefaults(state);
    }
>>>>>>> 8c98cf05b (i18n: add zh-CN for cron page and validation errors (#29315))
    await loadCronJobs(state);
    await loadCronStatus(state);
  } catch (err) {
    state.cronError = String(err);
  } finally {
    state.cronBusy = false;
  }
}

export async function toggleCronJob(
  state: CronState,
  job: CronJob,
  enabled: boolean,
) {
  if (!state.client || !state.connected || state.cronBusy) return;
  state.cronBusy = true;
  state.cronError = null;
  try {
    await state.client.request("cron.update", { id: job.id, patch: { enabled } });
    await loadCronJobs(state);
    await loadCronStatus(state);
  } catch (err) {
    state.cronError = String(err);
  } finally {
    state.cronBusy = false;
  }
}

export async function runCronJob(state: CronState, job: CronJob) {
  if (!state.client || !state.connected || state.cronBusy) return;
  state.cronBusy = true;
  state.cronError = null;
  try {
    await state.client.request("cron.run", { id: job.id, mode: "force" });
    await loadCronRuns(state, job.id);
  } catch (err) {
    state.cronError = String(err);
  } finally {
    state.cronBusy = false;
  }
}

export async function removeCronJob(state: CronState, job: CronJob) {
  if (!state.client || !state.connected || state.cronBusy) return;
  state.cronBusy = true;
  state.cronError = null;
  try {
    await state.client.request("cron.remove", { id: job.id });
    if (state.cronRunsJobId === job.id) {
      state.cronRunsJobId = null;
      state.cronRuns = [];
    }
    await loadCronJobs(state);
    await loadCronStatus(state);
  } catch (err) {
    state.cronError = String(err);
  } finally {
    state.cronBusy = false;
  }
}

export async function loadCronRuns(state: CronState, jobId: string) {
  if (!state.client || !state.connected) return;
  try {
    const res = (await state.client.request("cron.runs", {
      id: jobId,
      limit: 50,
    })) as { entries?: CronRunLogEntry[] };
    state.cronRunsJobId = jobId;
    state.cronRuns = Array.isArray(res.entries) ? res.entries : [];
  } catch (err) {
    state.cronError = String(err);
  }
}
