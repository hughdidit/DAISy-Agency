import JSON5 from "json5";
import fs from "node:fs";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

import JSON5 from "json5";
=======
import type { CronStoreFile } from "./types.js";
=======
import JSON5 from "json5";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { CronStoreFile } from "./types.js";
>>>>>>> ed11e93cf (chore(format))
=======
import JSON5 from "json5";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { CronStoreFile } from "./types.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { expandHomePrefix } from "../infra/home-dir.js";
>>>>>>> db137dd65 (fix(paths): respect OPENCLAW_HOME for all internal path resolution (#12091))
import { CONFIG_DIR } from "../utils.js";

export const DEFAULT_CRON_DIR = path.join(CONFIG_DIR, "cron");
export const DEFAULT_CRON_STORE_PATH = path.join(DEFAULT_CRON_DIR, "jobs.json");

export function resolveCronStorePath(storePath?: string) {
  if (storePath?.trim()) {
    const raw = storePath.trim();
    if (raw.startsWith("~")) {
      return path.resolve(expandHomePrefix(raw));
    }
    return path.resolve(raw);
  }
  return DEFAULT_CRON_STORE_PATH;
}

export async function loadCronStore(storePath: string): Promise<CronStoreFile> {
  try {
    const raw = await fs.promises.readFile(storePath, "utf-8");
    const parsed = JSON5.parse(raw);
    const jobs = Array.isArray(parsed?.jobs) ? (parsed?.jobs as never[]) : [];
    return {
      version: 1,
      jobs: jobs.filter(Boolean) as never as CronStoreFile["jobs"],
    };
  } catch {
    return { version: 1, jobs: [] };
  }
}

export async function saveCronStore(storePath: string, store: CronStoreFile) {
  await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
  const tmp = `${storePath}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  const json = JSON.stringify(store, null, 2);
  await fs.promises.writeFile(tmp, json, "utf-8");
  await fs.promises.rename(tmp, storePath);
  try {
    await fs.promises.copyFile(storePath, `${storePath}.bak`);
  } catch {
    // best-effort
  }
}
