import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD

=======
import { captureEnv } from "../test-utils/env.js";
>>>>>>> 94e84e6f7 (refactor(test): clean up gateway tool env restore)
=======
import { withEnvAsync } from "../test-utils/env.js";
>>>>>>> 8fd8988ff (refactor(test): reuse env helper in gateway tool e2e)
import "./test-helpers/fast-core-tools.js";
import { createMoltbotTools } from "./moltbot-tools.js";

vi.mock("./tools/gateway.js", () => ({
  callGatewayTool: vi.fn(async (method: string) => {
    if (method === "config.get") {
      return { hash: "hash-1" };
    }
    return { ok: true };
  }),
}));

function requireGatewayTool(agentSessionKey?: string) {
  const tool = createOpenClawTools({
    ...(agentSessionKey ? { agentSessionKey } : {}),
    config: { commands: { restart: true } },
  }).find((candidate) => candidate.name === "gateway");
  expect(tool).toBeDefined();
  if (!tool) {
    throw new Error("missing gateway tool");
  }
  return tool;
}

function expectConfigMutationCall(params: {
  callGatewayTool: {
    mock: {
      calls: Array<[string, unknown, Record<string, unknown>]>;
    };
  };
  action: "config.apply" | "config.patch";
  raw: string;
  sessionKey: string;
}) {
  expect(params.callGatewayTool).toHaveBeenCalledWith("config.get", expect.any(Object), {});
  expect(params.callGatewayTool).toHaveBeenCalledWith(
    params.action,
    expect.any(Object),
    expect.objectContaining({
      raw: params.raw.trim(),
      baseHash: "hash-1",
      sessionKey: params.sessionKey,
    }),
  );
}

describe("gateway tool", () => {
<<<<<<< HEAD
=======
  it("marks gateway as owner-only", async () => {
    const tool = requireGatewayTool();
    expect(tool.ownerOnly).toBe(true);
  });

>>>>>>> 185fba1d2 (refactor(agents): dedupe plugin hooks and test helpers)
  it("schedules SIGUSR1 restart", async () => {
    vi.useFakeTimers();
    const kill = vi.spyOn(process, "kill").mockImplementation(() => true);
<<<<<<< HEAD
<<<<<<< HEAD
    const previousStateDir = process.env.CLAWDBOT_STATE_DIR;
    const previousProfile = process.env.CLAWDBOT_PROFILE;
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-test-"));
    process.env.CLAWDBOT_STATE_DIR = stateDir;
    process.env.CLAWDBOT_PROFILE = "isolated";
=======
    const envSnapshot = captureEnv(["OPENCLAW_STATE_DIR", "OPENCLAW_PROFILE"]);
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-test-"));
    process.env.OPENCLAW_STATE_DIR = stateDir;
    process.env.OPENCLAW_PROFILE = "isolated";
>>>>>>> 94e84e6f7 (refactor(test): clean up gateway tool env restore)

    try {
      const tool = createMoltbotTools({
        config: { commands: { restart: true } },
      }).find((candidate) => candidate.name === "gateway");
      expect(tool).toBeDefined();
      if (!tool) {
        throw new Error("missing gateway tool");
      }
=======
    const stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-test-"));

    try {
      await withEnvAsync(
        { OPENCLAW_STATE_DIR: stateDir, OPENCLAW_PROFILE: "isolated" },
        async () => {
<<<<<<< HEAD
          const tool = createOpenClawTools({
            config: { commands: { restart: true } },
          }).find((candidate) => candidate.name === "gateway");
          expect(tool).toBeDefined();
          if (!tool) {
            throw new Error("missing gateway tool");
          }
>>>>>>> 8fd8988ff (refactor(test): reuse env helper in gateway tool e2e)
=======
          const tool = requireGatewayTool();
>>>>>>> 185fba1d2 (refactor(agents): dedupe plugin hooks and test helpers)

          const result = await tool.execute("call1", {
            action: "restart",
            delayMs: 0,
          });
          expect(result.details).toMatchObject({
            ok: true,
            pid: process.pid,
            signal: "SIGUSR1",
            delayMs: 0,
          });

<<<<<<< HEAD
      const sentinelPath = path.join(stateDir, "restart-sentinel.json");
      const raw = await fs.readFile(sentinelPath, "utf-8");
      const parsed = JSON.parse(raw) as {
        payload?: { kind?: string; doctorHint?: string | null };
      };
      expect(parsed.payload?.kind).toBe("restart");
      expect(parsed.payload?.doctorHint).toBe(
        "Run: moltbot --profile isolated doctor --non-interactive",
=======
          const sentinelPath = path.join(stateDir, "restart-sentinel.json");
          const raw = await fs.readFile(sentinelPath, "utf-8");
          const parsed = JSON.parse(raw) as {
            payload?: { kind?: string; doctorHint?: string | null };
          };
          expect(parsed.payload?.kind).toBe("restart");
          expect(parsed.payload?.doctorHint).toBe(
            "Run: openclaw --profile isolated doctor --non-interactive",
          );

          expect(kill).not.toHaveBeenCalled();
          await vi.runAllTimersAsync();
          expect(kill).toHaveBeenCalledWith(process.pid, "SIGUSR1");
        },
>>>>>>> 8fd8988ff (refactor(test): reuse env helper in gateway tool e2e)
      );
    } finally {
      kill.mockRestore();
      vi.useRealTimers();
<<<<<<< HEAD
<<<<<<< HEAD
      if (previousStateDir === undefined) {
        delete process.env.CLAWDBOT_STATE_DIR;
      } else {
        process.env.CLAWDBOT_STATE_DIR = previousStateDir;
      }
      if (previousProfile === undefined) {
        delete process.env.CLAWDBOT_PROFILE;
      } else {
        process.env.CLAWDBOT_PROFILE = previousProfile;
      }
=======
      envSnapshot.restore();
=======
>>>>>>> 8fd8988ff (refactor(test): reuse env helper in gateway tool e2e)
      await fs.rm(stateDir, { recursive: true, force: true });
>>>>>>> 94e84e6f7 (refactor(test): clean up gateway tool env restore)
    }
  });

  it("passes config.apply through gateway call", async () => {
    const { callGatewayTool } = await import("./tools/gateway.js");
<<<<<<< HEAD
    const tool = createMoltbotTools({
      agentSessionKey: "agent:main:whatsapp:dm:+15555550123",
    }).find((candidate) => candidate.name === "gateway");
    expect(tool).toBeDefined();
    if (!tool) {
      throw new Error("missing gateway tool");
    }
=======
    const sessionKey = "agent:main:whatsapp:dm:+15555550123";
    const tool = requireGatewayTool(sessionKey);
>>>>>>> 185fba1d2 (refactor(agents): dedupe plugin hooks and test helpers)

    const raw = '{\n  agents: { defaults: { workspace: "~/clawd" } }\n}\n';
    await tool.execute("call2", {
      action: "config.apply",
      raw,
    });

    expectConfigMutationCall({
      callGatewayTool: vi.mocked(callGatewayTool),
      action: "config.apply",
      raw,
      sessionKey,
    });
  });

  it("passes config.patch through gateway call", async () => {
    const { callGatewayTool } = await import("./tools/gateway.js");
<<<<<<< HEAD
    const tool = createMoltbotTools({
      agentSessionKey: "agent:main:whatsapp:dm:+15555550123",
    }).find((candidate) => candidate.name === "gateway");
    expect(tool).toBeDefined();
    if (!tool) {
      throw new Error("missing gateway tool");
    }
=======
    const sessionKey = "agent:main:whatsapp:dm:+15555550123";
    const tool = requireGatewayTool(sessionKey);
>>>>>>> 185fba1d2 (refactor(agents): dedupe plugin hooks and test helpers)

    const raw = '{\n  channels: { telegram: { groups: { "*": { requireMention: false } } } }\n}\n';
    await tool.execute("call4", {
      action: "config.patch",
      raw,
    });

    expectConfigMutationCall({
      callGatewayTool: vi.mocked(callGatewayTool),
      action: "config.patch",
      raw,
      sessionKey,
    });
  });

  it("passes update.run through gateway call", async () => {
    const { callGatewayTool } = await import("./tools/gateway.js");
<<<<<<< HEAD
    const tool = createMoltbotTools({
      agentSessionKey: "agent:main:whatsapp:dm:+15555550123",
    }).find((candidate) => candidate.name === "gateway");
    expect(tool).toBeDefined();
    if (!tool) {
      throw new Error("missing gateway tool");
    }
=======
    const sessionKey = "agent:main:whatsapp:dm:+15555550123";
    const tool = requireGatewayTool(sessionKey);
>>>>>>> 185fba1d2 (refactor(agents): dedupe plugin hooks and test helpers)

    await tool.execute("call3", {
      action: "update.run",
      note: "test update",
    });

    expect(callGatewayTool).toHaveBeenCalledWith(
      "update.run",
      expect.any(Object),
      expect.objectContaining({
        note: "test update",
        sessionKey,
      }),
    );
    const updateCall = vi
      .mocked(callGatewayTool)
      .mock.calls.find((call) => call[0] === "update.run");
    expect(updateCall).toBeDefined();
    if (updateCall) {
      const [, opts, params] = updateCall;
      expect(opts).toMatchObject({ timeoutMs: 20 * 60_000 });
      expect(params).toMatchObject({ timeoutMs: 20 * 60_000 });
    }
  });
});
