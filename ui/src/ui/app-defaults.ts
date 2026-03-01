import type { LogLevel } from "./types";
import type { CronFormState } from "./ui-types";

export const DEFAULT_LOG_LEVEL_FILTERS: Record<LogLevel, boolean> = {
  trace: true,
  debug: true,
  info: true,
  warn: true,
  error: true,
  fatal: true,
};

export const DEFAULT_CRON_FORM: CronFormState = {
  name: "",
  description: "",
  agentId: "",
  enabled: true,
  scheduleKind: "every",
  scheduleAt: "",
  everyAmount: "30",
  everyUnit: "minutes",
  cronExpr: "0 7 * * *",
  cronTz: "",
<<<<<<< HEAD
  sessionTarget: "main",
  wakeMode: "next-heartbeat",
  payloadKind: "systemEvent",
=======
  sessionTarget: "isolated",
  wakeMode: "now",
  payloadKind: "agentTurn",
>>>>>>> d90cac990 (fix: cron scheduler reliability, store hardening, and UX improvements (#10776))
  payloadText: "",
  deliver: false,
  channel: "last",
  to: "",
  timeoutSeconds: "",
  postToMainPrefix: "",
};
