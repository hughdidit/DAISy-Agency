<<<<<<< HEAD
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetInboundDedupe } from "../auto-reply/reply/inbound-dedupe.js";
import type { MoltbotConfig } from "../config/config.js";
import { peekSystemEvents, resetSystemEventsForTest } from "../infra/system-events.js";
=======
import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { peekSystemEvents } from "../infra/system-events.js";
>>>>>>> 20cefd78c (refactor(test): share signal tool result test setup)
import { resolveAgentRoute } from "../routing/resolve-route.js";
import { normalizeE164 } from "../utils.js";
import {
  config,
  flush,
  getSignalToolResultTestMocks,
  installSignalToolResultTestHooks,
  setSignalToolResultTestConfig,
} from "./monitor.tool-result.test-harness.js";

installSignalToolResultTestHooks();

<<<<<<< HEAD
<<<<<<< HEAD
vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig: () => config,
  };
});

vi.mock("../auto-reply/reply.js", () => ({
  getReplyFromConfig: (...args: unknown[]) => replyMock(...args),
}));

vi.mock("./send.js", () => ({
  sendMessageSignal: (...args: unknown[]) => sendMock(...args),
  sendTypingSignal: vi.fn().mockResolvedValue(true),
  sendReadReceiptSignal: vi.fn().mockResolvedValue(true),
}));

vi.mock("../pairing/pairing-store.js", () => ({
  readChannelAllowFromStore: (...args: unknown[]) => readAllowFromStoreMock(...args),
  upsertChannelPairingRequest: (...args: unknown[]) => upsertPairingRequestMock(...args),
}));

vi.mock("../config/sessions.js", () => ({
  resolveStorePath: vi.fn(() => "/tmp/moltbot-sessions.json"),
  updateLastRoute: (...args: unknown[]) => updateLastRouteMock(...args),
  readSessionUpdatedAt: vi.fn(() => undefined),
  recordSessionMetaFromInbound: vi.fn().mockResolvedValue(undefined),
}));

const streamMock = vi.fn();
const signalCheckMock = vi.fn();
const signalRpcRequestMock = vi.fn();

vi.mock("./client.js", () => ({
  streamSignalEvents: (...args: unknown[]) => streamMock(...args),
  signalCheck: (...args: unknown[]) => signalCheckMock(...args),
  signalRpcRequest: (...args: unknown[]) => signalRpcRequestMock(...args),
}));

vi.mock("./daemon.js", () => ({
  spawnSignalDaemon: vi.fn(() => ({ stop: vi.fn() })),
}));

vi.mock("../infra/transport-ready.js", () => ({
  waitForTransportReady: (...args: unknown[]) => waitForTransportReadyMock(...args),
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  resetInboundDedupe();
  config = {
    messages: { responsePrefix: "PFX" },
    channels: {
      signal: { autoStart: false, dmPolicy: "open", allowFrom: ["*"] },
    },
  };
  sendMock.mockReset().mockResolvedValue(undefined);
  replyMock.mockReset();
  updateLastRouteMock.mockReset();
  streamMock.mockReset();
  signalCheckMock.mockReset().mockResolvedValue({});
  signalRpcRequestMock.mockReset().mockResolvedValue({});
  readAllowFromStoreMock.mockReset().mockResolvedValue([]);
  upsertPairingRequestMock.mockReset().mockResolvedValue({ code: "PAIRCODE", created: true });
  waitForTransportReadyMock.mockReset().mockResolvedValue(undefined);
  resetSystemEventsForTest();
});
=======
=======
// Import after the harness registers `vi.mock(...)` for Signal internals.
await import("./monitor.js");

>>>>>>> 43f75e53b (test: fix TS2742 in harness exports)
const {
  replyMock,
  sendMock,
  streamMock,
  updateLastRouteMock,
  upsertPairingRequestMock,
  waitForTransportReadyMock,
} = getSignalToolResultTestMocks();
>>>>>>> 20cefd78c (refactor(test): share signal tool result test setup)

const SIGNAL_BASE_URL = "http://127.0.0.1:8080";

function createMonitorRuntime() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    exit: ((code: number): never => {
      throw new Error(`exit ${code}`);
    }) as (code: number) => never,
  };
}

function setSignalAutoStartConfig(overrides: Record<string, unknown> = {}) {
  setSignalToolResultTestConfig(createSignalConfig(overrides));
}

function createSignalConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const base = config as OpenClawConfig;
  const channels = (base.channels ?? {}) as Record<string, unknown>;
  const signal = (channels.signal ?? {}) as Record<string, unknown>;
  return {
    ...base,
    channels: {
      ...channels,
      signal: {
        ...signal,
        autoStart: true,
        dmPolicy: "open",
        allowFrom: ["*"],
        ...overrides,
      },
    },
  };
}

function createAutoAbortController() {
  const abortController = new AbortController();
  streamMock.mockImplementation(async () => {
    abortController.abort();
    return;
  });
  return abortController;
}

async function runMonitorWithMocks(
  opts: Parameters<(typeof import("./monitor.js"))["monitorSignalProvider"]>[0],
) {
  const { monitorSignalProvider } = await import("./monitor.js");
  return monitorSignalProvider(opts);
}

async function receiveSignalPayloads(params: {
  payloads: unknown[];
  opts?: Partial<Parameters<(typeof import("./monitor.js"))["monitorSignalProvider"]>[0]>;
}) {
  const abortController = new AbortController();
  streamMock.mockImplementation(async ({ onEvent }) => {
    for (const payload of params.payloads) {
      await onEvent({
        event: "receive",
        data: JSON.stringify(payload),
      });
    }
    abortController.abort();
  });

  await runMonitorWithMocks({
    autoStart: false,
    baseUrl: SIGNAL_BASE_URL,
    abortSignal: abortController.signal,
    ...params.opts,
  });

  await flush();
}

function getDirectSignalEventsFor(sender: string) {
  const route = resolveAgentRoute({
    cfg: config as OpenClawConfig,
    channel: "signal",
    accountId: "default",
    peer: { kind: "direct", id: normalizeE164(sender) },
  });
  return peekSystemEvents(route.sessionKey);
}

function makeBaseEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    sourceNumber: "+15550001111",
    sourceName: "Ada",
    timestamp: 1,
    ...overrides,
  };
}

async function receiveSingleEnvelope(
  envelope: Record<string, unknown>,
  opts?: Partial<Parameters<(typeof import("./monitor.js"))["monitorSignalProvider"]>[0]>,
) {
  await receiveSignalPayloads({
    payloads: [{ envelope }],
    opts,
  });
}

function expectNoReplyDeliveryOrRouteUpdate() {
  expect(replyMock).not.toHaveBeenCalled();
  expect(sendMock).not.toHaveBeenCalled();
  expect(updateLastRouteMock).not.toHaveBeenCalled();
}

function setReactionNotificationConfig(mode: "all" | "own", extra: Record<string, unknown> = {}) {
  setSignalToolResultTestConfig(
    createSignalConfig({
      autoStart: false,
      dmPolicy: "open",
      allowFrom: ["*"],
      reactionNotifications: mode,
      ...extra,
    }),
  );
}

function expectWaitForTransportReadyTimeout(timeoutMs: number) {
  expect(waitForTransportReadyMock).toHaveBeenCalledTimes(1);
  expect(waitForTransportReadyMock).toHaveBeenCalledWith(
    expect.objectContaining({
      timeoutMs,
    }),
  );
}

describe("monitorSignalProvider tool results", () => {
  it("uses bounded readiness checks when auto-starting the daemon", async () => {
    const runtime = createMonitorRuntime();
    setSignalAutoStartConfig();
    const abortController = createAutoAbortController();
    await runMonitorWithMocks({
      autoStart: true,
      baseUrl: SIGNAL_BASE_URL,
      abortSignal: abortController.signal,
      runtime,
    });

    expect(waitForTransportReadyMock).toHaveBeenCalledTimes(1);
    expect(waitForTransportReadyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "signal daemon",
        timeoutMs: 30_000,
        logAfterMs: 10_000,
        logIntervalMs: 10_000,
        pollIntervalMs: 150,
        runtime,
        abortSignal: abortController.signal,
      }),
    );
  });

  it("uses startupTimeoutMs override when provided", async () => {
    const runtime = createMonitorRuntime();
    setSignalAutoStartConfig({ startupTimeoutMs: 60_000 });
    const abortController = createAutoAbortController();

    await runMonitorWithMocks({
      autoStart: true,
      baseUrl: SIGNAL_BASE_URL,
      abortSignal: abortController.signal,
      runtime,
      startupTimeoutMs: 90_000,
    });

    expectWaitForTransportReadyTimeout(90_000);
  });

  it("caps startupTimeoutMs at 2 minutes", async () => {
    const runtime = createMonitorRuntime();
    setSignalAutoStartConfig({ startupTimeoutMs: 180_000 });
    const abortController = createAutoAbortController();

    await runMonitorWithMocks({
      autoStart: true,
      baseUrl: SIGNAL_BASE_URL,
      abortSignal: abortController.signal,
      runtime,
    });

    expectWaitForTransportReadyTimeout(120_000);
  });

  it("skips tool summaries with responsePrefix", async () => {
    replyMock.mockResolvedValue({ text: "final reply" });

    await receiveSignalPayloads({
      payloads: [
        {
          envelope: {
            sourceNumber: "+15550001111",
            sourceName: "Ada",
            timestamp: 1,
            dataMessage: {
              message: "hello",
            },
          },
        },
      ],
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][1]).toBe("PFX final reply");
  });

  it("replies with pairing code when dmPolicy is pairing and no allowFrom is set", async () => {
    setSignalToolResultTestConfig(
      createSignalConfig({ autoStart: false, dmPolicy: "pairing", allowFrom: [] }),
    );
    await receiveSignalPayloads({
      payloads: [
        {
          envelope: {
            sourceNumber: "+15550001111",
            sourceName: "Ada",
            timestamp: 1,
            dataMessage: {
              message: "hello",
            },
          },
        },
      ],
    });

    expect(replyMock).not.toHaveBeenCalled();
    expect(upsertPairingRequestMock).toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(String(sendMock.mock.calls[0]?.[1] ?? "")).toContain("Your Signal number: +15550001111");
    expect(String(sendMock.mock.calls[0]?.[1] ?? "")).toContain("Pairing code: PAIRCODE");
  });

  it("ignores reaction-only messages", async () => {
    await receiveSingleEnvelope({
      ...makeBaseEnvelope(),
      reactionMessage: {
        emoji: "👍",
        targetAuthor: "+15550002222",
        targetSentTimestamp: 2,
      },
    });

    expectNoReplyDeliveryOrRouteUpdate();
  });

  it("ignores reaction-only dataMessage.reaction events (don’t treat as broken attachments)", async () => {
    await receiveSingleEnvelope({
      ...makeBaseEnvelope(),
      dataMessage: {
        reaction: {
          emoji: "👍",
          targetAuthor: "+15550002222",
          targetSentTimestamp: 2,
        },
        attachments: [{}],
      },
    });

    expectNoReplyDeliveryOrRouteUpdate();
  });

  it("enqueues system events for reaction notifications", async () => {
    setReactionNotificationConfig("all");
    await receiveSingleEnvelope({
      ...makeBaseEnvelope(),
      reactionMessage: {
        emoji: "✅",
        targetAuthor: "+15550002222",
        targetSentTimestamp: 2,
      },
    });

<<<<<<< HEAD
    const route = resolveAgentRoute({
      cfg: config as MoltbotConfig,
      channel: "signal",
      accountId: "default",
      peer: { kind: "direct", id: normalizeE164("+15550001111") },
    });
    const events = peekSystemEvents(route.sessionKey);
=======
    const events = getDirectSignalEventsFor("+15550001111");
>>>>>>> 93ca0ed54 (refactor(channels): dedupe transport and gateway test scaffolds)
    expect(events.some((text) => text.includes("Signal reaction added"))).toBe(true);
  });

  it("notifies on own reactions when target includes uuid + phone", async () => {
    setReactionNotificationConfig("own", { account: "+15550002222" });
    await receiveSingleEnvelope({
      ...makeBaseEnvelope(),
      reactionMessage: {
        emoji: "✅",
        targetAuthor: "+15550002222",
        targetAuthorUuid: "123e4567-e89b-12d3-a456-426614174000",
        targetSentTimestamp: 2,
      },
    });

<<<<<<< HEAD
    const route = resolveAgentRoute({
      cfg: config as MoltbotConfig,
      channel: "signal",
      accountId: "default",
      peer: { kind: "direct", id: normalizeE164("+15550001111") },
    });
    const events = peekSystemEvents(route.sessionKey);
=======
    const events = getDirectSignalEventsFor("+15550001111");
>>>>>>> 93ca0ed54 (refactor(channels): dedupe transport and gateway test scaffolds)
    expect(events.some((text) => text.includes("Signal reaction added"))).toBe(true);
  });

  it("processes messages when reaction metadata is present", async () => {
    replyMock.mockResolvedValue({ text: "pong" });

    await receiveSignalPayloads({
      payloads: [
        {
          envelope: {
            sourceNumber: "+15550001111",
            sourceName: "Ada",
            timestamp: 1,
            reactionMessage: {
              emoji: "👍",
              targetAuthor: "+15550002222",
              targetSentTimestamp: 2,
            },
            dataMessage: {
              message: "ping",
            },
          },
        },
      ],
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(updateLastRouteMock).toHaveBeenCalled();
  });

  it("does not resend pairing code when a request is already pending", async () => {
    setSignalToolResultTestConfig(
      createSignalConfig({ autoStart: false, dmPolicy: "pairing", allowFrom: [] }),
    );
    upsertPairingRequestMock
      .mockResolvedValueOnce({ code: "PAIRCODE", created: true })
      .mockResolvedValueOnce({ code: "PAIRCODE", created: false });

    const payload = {
      envelope: {
        sourceNumber: "+15550001111",
        sourceName: "Ada",
        timestamp: 1,
        dataMessage: {
          message: "hello",
        },
      },
    };
    await receiveSignalPayloads({
      payloads: [
        payload,
        {
          ...payload,
          envelope: { ...payload.envelope, timestamp: 2 },
        },
      ],
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
