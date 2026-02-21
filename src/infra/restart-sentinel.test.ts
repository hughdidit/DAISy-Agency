import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
<<<<<<< HEAD

=======
import { captureEnv } from "../test-utils/env.js";
>>>>>>> 992b7e557 (refactor(test): use env snapshots in setup hooks)
import {
  consumeRestartSentinel,
  readRestartSentinel,
  resolveRestartSentinelPath,
  trimLogTail,
  writeRestartSentinel,
} from "./restart-sentinel.js";

describe("restart sentinel", () => {
  let envSnapshot: ReturnType<typeof captureEnv>;
  let tempDir: string;

  beforeEach(async () => {
<<<<<<< HEAD
    prevStateDir = process.env.CLAWDBOT_STATE_DIR;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-sentinel-"));
    process.env.CLAWDBOT_STATE_DIR = tempDir;
  });

  afterEach(async () => {
<<<<<<< HEAD
    if (prevStateDir) process.env.CLAWDBOT_STATE_DIR = prevStateDir;
    else delete process.env.CLAWDBOT_STATE_DIR;
=======
    if (prevStateDir) {
      process.env.OPENCLAW_STATE_DIR = prevStateDir;
    } else {
      delete process.env.OPENCLAW_STATE_DIR;
    }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
=======
    envSnapshot = captureEnv(["OPENCLAW_STATE_DIR"]);
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sentinel-"));
    process.env.OPENCLAW_STATE_DIR = tempDir;
  });

  afterEach(async () => {
    envSnapshot.restore();
>>>>>>> 992b7e557 (refactor(test): use env snapshots in setup hooks)
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("writes and consumes a sentinel", async () => {
    const payload = {
      kind: "update" as const,
      status: "ok" as const,
      ts: Date.now(),
      sessionKey: "agent:main:whatsapp:dm:+15555550123",
      stats: { mode: "git" },
    };
    const filePath = await writeRestartSentinel(payload);
    expect(filePath).toBe(resolveRestartSentinelPath());

    const read = await readRestartSentinel();
    expect(read?.payload.kind).toBe("update");

    const consumed = await consumeRestartSentinel();
    expect(consumed?.payload.sessionKey).toBe(payload.sessionKey);

    const empty = await readRestartSentinel();
    expect(empty).toBeNull();
  });

  it("drops invalid sentinel payloads", async () => {
    const filePath = resolveRestartSentinelPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "not-json", "utf-8");

    const read = await readRestartSentinel();
    expect(read).toBeNull();

    await expect(fs.stat(filePath)).rejects.toThrow();
  });

  it("trims log tails", () => {
    const text = "a".repeat(9000);
    const trimmed = trimLogTail(text, 8000);
    expect(trimmed?.length).toBeLessThanOrEqual(8001);
    expect(trimmed?.startsWith("…")).toBe(true);
  });

  it("formats restart messages without volatile timestamps", () => {
    const payloadA = {
      kind: "restart" as const,
      status: "ok" as const,
      ts: 100,
      message: "Restart requested by /restart",
      stats: { mode: "gateway.restart", reason: "/restart" },
    };
    const payloadB = { ...payloadA, ts: 200 };
    const textA = formatRestartSentinelMessage(payloadA);
    const textB = formatRestartSentinelMessage(payloadB);
    expect(textA).toBe(textB);
    expect(textA).toContain("Gateway restart restart ok");
    expect(textA).not.toContain('"ts"');
  });
});
