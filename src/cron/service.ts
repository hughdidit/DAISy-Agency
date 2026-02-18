<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
import type { CronJob, CronJobCreate, CronJobPatch } from "./types.js";
>>>>>>> 115cfb443 (gateway: add cron finished-run webhook (#14535))
import * as ops from "./service/ops.js";
import { type CronServiceDeps, createCronServiceState } from "./service/state.js";
import type { CronJobCreate, CronJobPatch } from "./types.js";
=======
import * as ops from "./service/ops.js";
import { type CronServiceDeps, createCronServiceState } from "./service/state.js";
import type { CronJob, CronJobCreate, CronJobPatch } from "./types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { CronJob, CronJobCreate, CronJobPatch } from "./types.js";
import * as ops from "./service/ops.js";
import { type CronServiceDeps, createCronServiceState } from "./service/state.js";
>>>>>>> ed11e93cf (chore(format))
=======
import * as ops from "./service/ops.js";
import { type CronServiceDeps, createCronServiceState } from "./service/state.js";
import type { CronJob, CronJobCreate, CronJobPatch } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { CronJob, CronJobCreate, CronJobPatch } from "./types.js";
import * as ops from "./service/ops.js";
import { type CronServiceDeps, createCronServiceState } from "./service/state.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)

export type { CronEvent, CronServiceDeps } from "./service/state.js";

export class CronService {
  private readonly state;
  constructor(deps: CronServiceDeps) {
    this.state = createCronServiceState(deps);
  }

  async start() {
    await ops.start(this.state);
  }

  stop() {
    ops.stop(this.state);
  }

  async status() {
    return await ops.status(this.state);
  }

  async list(opts?: { includeDisabled?: boolean }) {
    return await ops.list(this.state, opts);
  }

  async add(input: CronJobCreate) {
    return await ops.add(this.state, input);
  }

  async update(id: string, patch: CronJobPatch) {
    return await ops.update(this.state, id, patch);
  }

  async remove(id: string) {
    return await ops.remove(this.state, id);
  }

  async run(id: string, mode?: "due" | "force") {
    return await ops.run(this.state, id, mode);
  }

  getJob(id: string): CronJob | undefined {
    return this.state.store?.jobs.find((job) => job.id === id);
  }

  wake(opts: { mode: "now" | "next-heartbeat"; text: string }) {
    return ops.wakeNow(this.state, opts);
  }
}
