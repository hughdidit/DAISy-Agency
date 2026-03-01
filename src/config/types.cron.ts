/** Error types that can trigger retries for one-shot jobs. */
export type CronRetryOn = "rate_limit" | "network" | "timeout" | "server_error";

export type CronRetryConfig = {
  /** Max retries for transient errors before permanent disable (default: 3). */
  maxAttempts?: number;
  /** Backoff delays in ms for each retry attempt (default: [30000, 60000, 300000]). */
  backoffMs?: number[];
  /** Error types to retry; omit to retry all transient types. */
  retryOn?: CronRetryOn[];
};

export type CronConfig = {
  enabled?: boolean;
  store?: string;
  maxConcurrentRuns?: number;
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
  /** Override default retry policy for one-shot jobs on transient errors. */
  retry?: CronRetryConfig;
>>>>>>> ea3955cd7 (fix(cron): add retry policy for one-shot jobs on transient errors (#24355) (openclaw#24435) thanks @hugenshen)
  /**
   * Deprecated legacy fallback webhook URL used only for stored jobs with notify=true.
   * Prefer per-job delivery.mode="webhook" with delivery.to.
   */
>>>>>>> bc67af6ad (cron: separate webhook POST delivery from announce (#17901))
  webhook?: string;
  /** Bearer token for cron webhook POST delivery. */
  webhookToken?: string;
  /**
   * How long to retain completed cron run sessions before automatic pruning.
   * Accepts a duration string (e.g. "24h", "7d", "1h30m") or `false` to disable pruning.
   * Default: "24h".
   */
  sessionRetention?: string | false;
<<<<<<< HEAD
>>>>>>> 115cfb443 (gateway: add cron finished-run webhook (#14535))
=======
  /**
   * Run-log pruning controls for `cron/runs/<jobId>.jsonl`.
   * Defaults: `maxBytes=2_000_000`, `keepLines=2000`.
   */
  runLog?: {
    maxBytes?: number | string;
    keepLines?: number;
  };
>>>>>>> eff3c5c70 (Session/Cron maintenance hardening and cleanup UX (#24753))
};
