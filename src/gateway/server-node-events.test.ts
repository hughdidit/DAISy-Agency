import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import type { loadSessionEntry as loadSessionEntryType } from "./session-utils.js";

const buildSessionLookup = (
  sessionKey: string,
  entry: {
    sessionId?: string;
    lastChannel?: string;
    lastTo?: string;
    updatedAt?: number;
  } = {},
): ReturnType<typeof loadSessionEntryType> => ({
  cfg: { session: { mainKey: "agent:main:main" } } as OpenClawConfig,
  storePath: "/tmp/sessions.json",
  store: {} as ReturnType<typeof loadSessionEntryType>["store"],
  entry: {
    sessionId: entry.sessionId ?? `sid-${sessionKey}`,
    updatedAt: entry.updatedAt ?? Date.now(),
    lastChannel: entry.lastChannel,
    lastTo: entry.lastTo,
  },
  canonicalKey: sessionKey,
  legacyKey: undefined,
});

vi.mock("../infra/system-events.js", () => ({
  enqueueSystemEvent: vi.fn(),
}));
vi.mock("../infra/heartbeat-wake.js", () => ({
  requestHeartbeatNow: vi.fn(),
}));
<<<<<<< HEAD
=======
vi.mock("../commands/agent.js", () => ({
  agentCommand: vi.fn(),
}));
vi.mock("../config/config.js", () => ({
  loadConfig: vi.fn(() => ({ session: { mainKey: "agent:main:main" } })),
  STATE_DIR: "/tmp/openclaw-state",
}));
vi.mock("../config/sessions.js", () => ({
  updateSessionStore: vi.fn(),
}));
vi.mock("./session-utils.js", () => ({
  loadSessionEntry: vi.fn((sessionKey: string) => buildSessionLookup(sessionKey)),
  pruneLegacyStoreKeys: vi.fn(),
  resolveGatewaySessionStoreTarget: vi.fn(({ key }: { key: string }) => ({
    canonicalKey: key,
    storeKeys: [key],
  })),
}));
>>>>>>> 6dcc052bb (fix: stabilize model catalog and pi discovery auth storage compatibility)

<<<<<<< HEAD
import { enqueueSystemEvent } from "../infra/system-events.js";
import { requestHeartbeatNow } from "../infra/heartbeat-wake.js";
=======
import type { CliDeps } from "../cli/deps.js";
import { agentCommand } from "../commands/agent.js";
import type { HealthSummary } from "../commands/health.js";
import { updateSessionStore } from "../config/sessions.js";
import { requestHeartbeatNow } from "../infra/heartbeat-wake.js";
import { enqueueSystemEvent } from "../infra/system-events.js";
import type { NodeEventContext } from "./server-node-events-types.js";
<<<<<<< HEAD
>>>>>>> 210bc3797 (chore(subagents): add regression coverage and changelog)
=======
>>>>>>> 6dcc052bb (fix: stabilize model catalog and pi discovery auth storage compatibility)
import { handleNodeEvent } from "./server-node-events.js";
import type { NodeEventContext } from "./server-node-events-types.js";
import type { HealthSummary } from "../commands/health.js";
import type { CliDeps } from "../cli/deps.js";

const enqueueSystemEventMock = vi.mocked(enqueueSystemEvent);
const requestHeartbeatNowMock = vi.mocked(requestHeartbeatNow);

function buildCtx(): NodeEventContext {
  return {
    deps: {} as CliDeps,
    broadcast: () => {},
    nodeSendToSession: () => {},
    nodeSubscribe: () => {},
    nodeUnsubscribe: () => {},
    broadcastVoiceWakeChanged: () => {},
    addChatRun: () => {},
    removeChatRun: () => undefined,
    chatAbortControllers: new Map(),
    chatAbortedRuns: new Map(),
    chatRunBuffers: new Map(),
    chatDeltaSentAt: new Map(),
    dedupe: new Map(),
    agentRunSeq: new Map(),
    getHealthCache: () => null,
    refreshHealthSnapshot: async () => ({}) as HealthSummary,
    loadGatewayModelCatalog: async () => [],
    logGateway: { warn: () => {} },
  };
}

describe("node exec events", () => {
  beforeEach(() => {
    enqueueSystemEventMock.mockReset();
    requestHeartbeatNowMock.mockReset();
  });

  it("enqueues exec.started events", async () => {
    const ctx = buildCtx();
    await handleNodeEvent(ctx, "node-1", {
      event: "exec.started",
      payloadJSON: JSON.stringify({
        sessionKey: "agent:main:main",
        runId: "run-1",
        command: "ls -la",
      }),
    });

    expect(enqueueSystemEventMock).toHaveBeenCalledWith(
      "Exec started (node=node-1 id=run-1): ls -la",
      { sessionKey: "agent:main:main", contextKey: "exec:run-1" },
    );
    expect(requestHeartbeatNowMock).toHaveBeenCalledWith({ reason: "exec-event" });
  });

  it("enqueues exec.finished events with output", async () => {
    const ctx = buildCtx();
    await handleNodeEvent(ctx, "node-2", {
      event: "exec.finished",
      payloadJSON: JSON.stringify({
        runId: "run-2",
        exitCode: 0,
        timedOut: false,
        output: "done",
      }),
    });

    expect(enqueueSystemEventMock).toHaveBeenCalledWith(
      "Exec finished (node=node-2 id=run-2, code 0)\ndone",
      { sessionKey: "node-node-2", contextKey: "exec:run-2" },
    );
    expect(requestHeartbeatNowMock).toHaveBeenCalledWith({ reason: "exec-event" });
  });

  it("enqueues exec.denied events with reason", async () => {
    const ctx = buildCtx();
    await handleNodeEvent(ctx, "node-3", {
      event: "exec.denied",
      payloadJSON: JSON.stringify({
        sessionKey: "agent:demo:main",
        runId: "run-3",
        command: "rm -rf /",
        reason: "allowlist-miss",
      }),
    });

    expect(enqueueSystemEventMock).toHaveBeenCalledWith(
      "Exec denied (node=node-3 id=run-3, allowlist-miss): rm -rf /",
      { sessionKey: "agent:demo:main", contextKey: "exec:run-3" },
    );
    expect(requestHeartbeatNowMock).toHaveBeenCalledWith({ reason: "exec-event" });
  });
});
<<<<<<< HEAD
=======

describe("voice transcript events", () => {
  beforeEach(() => {
    agentCommandMock.mockReset();
    updateSessionStoreMock.mockReset();
    agentCommandMock.mockResolvedValue({ status: "ok" } as never);
    updateSessionStoreMock.mockImplementation(async (_storePath, update) => {
      update({});
    });
  });

  it("dedupes repeated transcript payloads for the same session", async () => {
    const addChatRun = vi.fn();
    const ctx = buildCtx();
    ctx.addChatRun = addChatRun;

    const payload = {
      text: "hello from mic",
      sessionKey: "voice-dedupe-session",
    };

    await handleNodeEvent(ctx, "node-v1", {
      event: "voice.transcript",
      payloadJSON: JSON.stringify(payload),
    });
    await handleNodeEvent(ctx, "node-v1", {
      event: "voice.transcript",
      payloadJSON: JSON.stringify(payload),
    });

    expect(agentCommandMock).toHaveBeenCalledTimes(1);
    expect(addChatRun).toHaveBeenCalledTimes(1);
    expect(updateSessionStoreMock).toHaveBeenCalledTimes(1);
  });

  it("does not dedupe identical text when source event IDs differ", async () => {
    const ctx = buildCtx();

    await handleNodeEvent(ctx, "node-v1", {
      event: "voice.transcript",
      payloadJSON: JSON.stringify({
        text: "hello from mic",
        sessionKey: "voice-dedupe-eventid-session",
        eventId: "evt-voice-1",
      }),
    });
    await handleNodeEvent(ctx, "node-v1", {
      event: "voice.transcript",
      payloadJSON: JSON.stringify({
        text: "hello from mic",
        sessionKey: "voice-dedupe-eventid-session",
        eventId: "evt-voice-2",
      }),
    });

    expect(agentCommandMock).toHaveBeenCalledTimes(2);
    expect(updateSessionStoreMock).toHaveBeenCalledTimes(2);
  });

  it("forwards transcript with voice provenance", async () => {
    const ctx = buildCtx();

    await handleNodeEvent(ctx, "node-v2", {
      event: "voice.transcript",
      payloadJSON: JSON.stringify({
        text: "check provenance",
        sessionKey: "voice-provenance-session",
      }),
    });

    expect(agentCommandMock).toHaveBeenCalledTimes(1);
    const [opts] = agentCommandMock.mock.calls[0] ?? [];
    expect(opts).toMatchObject({
      message: "check provenance",
      deliver: false,
      messageChannel: "node",
      inputProvenance: {
        kind: "external_user",
        sourceChannel: "voice",
        sourceTool: "gateway.voice.transcript",
      },
    });
  });

  it("does not block agent dispatch when session-store touch fails", async () => {
    const warn = vi.fn();
    const ctx = buildCtx();
    ctx.logGateway = { warn };
    updateSessionStoreMock.mockRejectedValueOnce(new Error("disk down"));

    await handleNodeEvent(ctx, "node-v3", {
      event: "voice.transcript",
      payloadJSON: JSON.stringify({
        text: "continue anyway",
        sessionKey: "voice-store-fail-session",
      }),
    });
    await Promise.resolve();

    expect(agentCommandMock).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("voice session-store update failed"));
  });
});

describe("agent request events", () => {
  beforeEach(() => {
    agentCommandMock.mockReset();
    updateSessionStoreMock.mockReset();
    loadSessionEntryMock.mockReset();
    agentCommandMock.mockResolvedValue({ status: "ok" } as never);
    updateSessionStoreMock.mockImplementation(async (_storePath, update) => {
      update({});
    });
    loadSessionEntryMock.mockImplementation((sessionKey: string) => buildSessionLookup(sessionKey));
  });

  it("disables delivery when route is unresolved instead of falling back globally", async () => {
    const warn = vi.fn();
    const ctx = buildCtx();
    ctx.logGateway = { warn };

    await handleNodeEvent(ctx, "node-route-miss", {
      event: "agent.request",
      payloadJSON: JSON.stringify({
        message: "summarize this",
        sessionKey: "agent:main:main",
        deliver: true,
      }),
    });

    expect(agentCommandMock).toHaveBeenCalledTimes(1);
    const [opts] = agentCommandMock.mock.calls[0] ?? [];
    expect(opts).toMatchObject({
      message: "summarize this",
      sessionKey: "agent:main:main",
      deliver: false,
      channel: undefined,
      to: undefined,
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("agent delivery disabled node=node-route-miss"),
    );
  });

  it("reuses the current session route when delivery target is omitted", async () => {
    const ctx = buildCtx();
    loadSessionEntryMock.mockReturnValueOnce({
      ...buildSessionLookup("agent:main:main", {
        sessionId: "sid-current",
        lastChannel: "telegram",
        lastTo: "123",
      }),
      canonicalKey: "agent:main:main",
    });

    await handleNodeEvent(ctx, "node-route-hit", {
      event: "agent.request",
      payloadJSON: JSON.stringify({
        message: "route on session",
        sessionKey: "agent:main:main",
        deliver: true,
      }),
    });

    expect(agentCommandMock).toHaveBeenCalledTimes(1);
    const [opts] = agentCommandMock.mock.calls[0] ?? [];
    expect(opts).toMatchObject({
      message: "route on session",
      sessionKey: "agent:main:main",
      deliver: true,
      channel: "telegram",
      to: "123",
    });
  });
});
>>>>>>> 6dcc052bb (fix: stabilize model catalog and pi discovery auth storage compatibility)
