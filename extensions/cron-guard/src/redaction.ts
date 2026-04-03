import type { CronJob } from "../../../src/cron/types.js";
import type { CronGuardReadOptions } from "./types.js";

type CronListPage = {
  jobs: CronJob[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  nextOffset: number | null;
};

function redactPayload(payload: CronJob["payload"]): CronJob["payload"] {
  if (payload.kind !== "agentTurn") {
    return payload;
  }
  const { allowUnsafeExternalContent: _ignored, ...rest } = payload;
  return rest;
}

function redactDelivery(job: CronJob, opts: CronGuardReadOptions): CronJob["delivery"] {
  const delivery = job.delivery;
  if (!delivery) {
    return delivery;
  }
  if (!opts.redactWebhookTargets || delivery.mode !== "webhook") {
    return delivery;
  }
  return {
    ...delivery,
    to: delivery.to ? "[redacted]" : delivery.to,
    failureDestination: delivery.failureDestination
      ? {
          ...delivery.failureDestination,
          to:
            delivery.failureDestination.mode === "webhook" && delivery.failureDestination.to
              ? "[redacted]"
              : delivery.failureDestination.to,
        }
      : delivery.failureDestination,
  };
}

export function redactCronGuardJob(job: CronJob, opts: CronGuardReadOptions): CronJob {
  return {
    ...job,
    payload: redactPayload(job.payload),
    delivery: redactDelivery(job, opts),
  };
}

export function redactCronGuardListPage(
  page: CronListPage,
  opts: CronGuardReadOptions,
): CronListPage {
  return {
    ...page,
    jobs: page.jobs.map((job) => redactCronGuardJob(job, opts)),
  };
}
