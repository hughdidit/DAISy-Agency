import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD

import { describe, expect, it } from "vitest";

import { readTelegramUpdateOffset, writeTelegramUpdateOffset } from "./update-offset-store.js";

async function withTempStateDir<T>(fn: (dir: string) => Promise<T>) {
  const previous = process.env.CLAWDBOT_STATE_DIR;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-telegram-"));
  process.env.CLAWDBOT_STATE_DIR = dir;
  try {
    return await fn(dir);
  } finally {
<<<<<<< HEAD
    if (previous === undefined) delete process.env.CLAWDBOT_STATE_DIR;
    else process.env.CLAWDBOT_STATE_DIR = previous;
=======
=======
import { describe, expect, it } from "vitest";
import {
  deleteTelegramUpdateOffset,
  readTelegramUpdateOffset,
  writeTelegramUpdateOffset,
} from "./update-offset-store.js";

async function withTempStateDir<T>(fn: (dir: string) => Promise<T>) {
  const previous = process.env.OPENCLAW_STATE_DIR;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-tg-offset-"));
  process.env.OPENCLAW_STATE_DIR = dir;
  try {
    return await fn(dir);
  } finally {
>>>>>>> 6757a9fed (fix(telegram): clean up update offset on channels remove --delete (#18233))
    if (previous === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = previous;
    }
<<<<<<< HEAD
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
=======
>>>>>>> 6757a9fed (fix(telegram): clean up update offset on channels remove --delete (#18233))
    await fs.rm(dir, { recursive: true, force: true });
  }
}

<<<<<<< HEAD
describe("telegram update offset store", () => {
  it("persists and reloads the last update id", async () => {
    await withTempStateDir(async () => {
      expect(await readTelegramUpdateOffset({ accountId: "primary" })).toBeNull();

      await writeTelegramUpdateOffset({
        accountId: "primary",
        updateId: 421,
      });

      expect(await readTelegramUpdateOffset({ accountId: "primary" })).toBe(421);
=======
describe("deleteTelegramUpdateOffset", () => {
  it("removes the offset file so a new bot starts fresh", async () => {
    await withTempStateDir(async () => {
      await writeTelegramUpdateOffset({ accountId: "default", updateId: 432_000_000 });
      expect(await readTelegramUpdateOffset({ accountId: "default" })).toBe(432_000_000);

      await deleteTelegramUpdateOffset({ accountId: "default" });
      expect(await readTelegramUpdateOffset({ accountId: "default" })).toBeNull();
    });
  });

  it("does not throw when the offset file does not exist", async () => {
    await withTempStateDir(async () => {
      await expect(deleteTelegramUpdateOffset({ accountId: "nonexistent" })).resolves.not.toThrow();
    });
  });

  it("only removes the targeted account offset, leaving others intact", async () => {
    await withTempStateDir(async () => {
      await writeTelegramUpdateOffset({ accountId: "default", updateId: 100 });
      await writeTelegramUpdateOffset({ accountId: "alerts", updateId: 200 });

      await deleteTelegramUpdateOffset({ accountId: "default" });

      expect(await readTelegramUpdateOffset({ accountId: "default" })).toBeNull();
      expect(await readTelegramUpdateOffset({ accountId: "alerts" })).toBe(200);
>>>>>>> 6757a9fed (fix(telegram): clean up update offset on channels remove --delete (#18233))
    });
  });
});
