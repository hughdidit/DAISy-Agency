import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
<<<<<<< HEAD
import { emitAgentEvent } from "../infra/agent-events.js";
=======
import type { GetReplyOptions } from "../auto-reply/types.js";
import { __setMaxChatHistoryMessagesBytesForTest } from "./server-constants.js";
>>>>>>> b62bd290c (fix: remove hardcoded disableBlockStreaming to honor agent config for TUI (#19693))
import {
  connectOk,
  getReplyFromConfig,
  installGatewayTestHooks,
  onceMessage,
  rpcReq,
  sessionStoreSaveDelayMs,
  startServerWithClient,
  testState,
  writeSessionStore,
} from "./test-helpers.js";
import { __setMaxChatHistoryMessagesBytesForTest } from "./server-constants.js";
installGatewayTestHooks({ scope: "suite" });
async function waitFor(condition: () => boolean, timeoutMs = 1500) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("timeout waiting for condition");
}
const sendReq = (
  ws: { send: (payload: string) => void },
  id: string,
  method: string,
  params: unknown,
) => {
  ws.send(
    JSON.stringify({
      type: "req",
      id,
      method,
      params,
    }),
  );
};
describe("gateway server chat", () => {
  const timeoutMs = 120_000;
  test(
    "handles history, abort, idempotency, and ordering flows",
    { timeout: timeoutMs },
    async () => {
      const tempDirs: string[] = [];
      const { server, ws } = await startServerWithClient();
      const spy = vi.mocked(getReplyFromConfig);
      const resetSpy = () => {
        spy.mockReset();
        spy.mockResolvedValue(undefined);
      };
      try {
        const historyMaxBytes = 192 * 1024;
        __setMaxChatHistoryMessagesBytesForTest(historyMaxBytes);
        await connectOk(ws);
        const sessionDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-gw-"));
        tempDirs.push(sessionDir);
        testState.sessionStorePath = path.join(sessionDir, "sessions.json");
        const writeStore = async (
          entries: Record<
            string,
            { sessionId: string; updatedAt: number; lastChannel?: string; lastTo?: string }
          >,
        ) => {
          await writeSessionStore({ entries });
        };

        await writeStore({ main: { sessionId: "sess-main", updatedAt: Date.now() } });
        const bigText = "x".repeat(4_000);
        const largeLines: string[] = [];
        for (let i = 0; i < 60; i += 1) {
          largeLines.push(
            JSON.stringify({
              message: {
                role: "user",
                content: [{ type: "text", text: `${i}:${bigText}` }],
                timestamp: Date.now() + i,
              },
            }),
          );
        }
        await fs.writeFile(
          path.join(sessionDir, "sess-main.jsonl"),
          largeLines.join("\n"),
          "utf-8",
        );
        const cappedRes = await rpcReq<{ messages?: unknown[] }>(ws, "chat.history", {
          sessionKey: "main",
          limit: 1000,
        });
        expect(cappedRes.ok).toBe(true);
        const cappedMsgs = cappedRes.payload?.messages ?? [];
        const bytes = Buffer.byteLength(JSON.stringify(cappedMsgs), "utf8");
        expect(bytes).toBeLessThanOrEqual(historyMaxBytes);
        expect(cappedMsgs.length).toBeLessThan(60);

        await writeStore({
          main: {
            sessionId: "sess-main",
            updatedAt: Date.now(),
            lastChannel: "whatsapp",
            lastTo: "+1555",
          },
<<<<<<< HEAD
=======
        },
      });

      const sendRes = await rpcReq(ws, "chat.send", {
        sessionKey: "main",
        message: "hello",
        idempotencyKey: "idem-route",
      });
      expect(sendRes.ok).toBe(true);

      const sessionStorePath = testState.sessionStorePath;
      if (!sessionStorePath) {
        throw new Error("expected session store path");
      }
      const stored = JSON.parse(await fs.readFile(sessionStorePath, "utf-8")) as Record<
        string,
        { lastChannel?: string; lastTo?: string } | undefined
      >;
      expect(stored["agent:main:main"]?.lastChannel).toBe("whatsapp");
      expect(stored["agent:main:main"]?.lastTo).toBe("+1555");
    });
  });

  test("chat.send does not force-disable block streaming", async () => {
    await withGatewayChatHarness(async ({ ws, createSessionDir }) => {
      const spy = getReplyFromConfig;
      await connectOk(ws);

      await createSessionDir();
      await writeMainSessionStore();
      testState.agentConfig = { blockStreamingDefault: "on" };
      try {
        spy.mockReset();
        let capturedOpts: GetReplyOptions | undefined;
        spy.mockImplementationOnce(async (_ctx: unknown, opts?: GetReplyOptions) => {
          capturedOpts = opts;
        });

        const sendRes = await rpcReq(ws, "chat.send", {
          sessionKey: "main",
          message: "hello",
          idempotencyKey: "idem-block-streaming",
        });
        expect(sendRes.ok).toBe(true);

        await vi.waitFor(
          () => {
            expect(spy.mock.calls.length).toBeGreaterThan(0);
          },
          { timeout: 2_000, interval: 10 },
        );

        expect(capturedOpts?.disableBlockStreaming).toBeUndefined();
      } finally {
        testState.agentConfig = undefined;
      }
    });
  });

  test("chat.history hard-caps single oversized nested payloads", async () => {
    await withGatewayChatHarness(async ({ ws, createSessionDir }) => {
      const historyMaxBytes = 64 * 1024;
      __setMaxChatHistoryMessagesBytesForTest(historyMaxBytes);
      await connectOk(ws);

      const sessionDir = await createSessionDir();
      await writeMainSessionStore();

      const hugeNestedText = "n".repeat(450_000);
      const oversizedLine = JSON.stringify({
        message: {
          role: "assistant",
          timestamp: Date.now(),
          content: [
            {
              type: "tool_result",
              toolUseId: "tool-1",
              output: {
                nested: {
                  payload: hugeNestedText,
                },
              },
            },
          ],
        },
      });
      await fs.writeFile(path.join(sessionDir, "sess-main.jsonl"), `${oversizedLine}\n`, "utf-8");

      const historyRes = await rpcReq<{ messages?: unknown[] }>(ws, "chat.history", {
        sessionKey: "main",
        limit: 1000,
      });
      expect(historyRes.ok).toBe(true);
      const messages = historyRes.payload?.messages ?? [];
      expect(messages.length).toBe(1);

      const serialized = JSON.stringify(messages);
      const bytes = Buffer.byteLength(serialized, "utf8");
      expect(bytes).toBeLessThanOrEqual(historyMaxBytes);
      expect(serialized).toContain("[chat.history omitted: message too large]");
      expect(serialized.includes(hugeNestedText.slice(0, 256))).toBe(false);
    });
  });

  test("chat.history keeps recent small messages when latest message is oversized", async () => {
    await withGatewayChatHarness(async ({ ws, createSessionDir }) => {
      const historyMaxBytes = 64 * 1024;
      __setMaxChatHistoryMessagesBytesForTest(historyMaxBytes);
      await connectOk(ws);

      const sessionDir = await createSessionDir();
      await writeMainSessionStore();

      const baseText = "s".repeat(1_200);
      const lines: string[] = [];
      for (let i = 0; i < 30; i += 1) {
        lines.push(
          JSON.stringify({
            message: {
              role: "user",
              timestamp: Date.now() + i,
              content: [{ type: "text", text: `small-${i}:${baseText}` }],
            },
          }),
        );
      }

      const hugeNestedText = "z".repeat(450_000);
      lines.push(
        JSON.stringify({
          message: {
            role: "assistant",
            timestamp: Date.now() + 1_000,
            content: [
              {
                type: "tool_result",
                toolUseId: "tool-1",
                output: {
                  nested: {
                    payload: hugeNestedText,
                  },
                },
              },
            ],
          },
        }),
      );

      await fs.writeFile(
        path.join(sessionDir, "sess-main.jsonl"),
        `${lines.join("\n")}\n`,
        "utf-8",
      );

      const historyRes = await rpcReq<{ messages?: unknown[] }>(ws, "chat.history", {
        sessionKey: "main",
        limit: 1000,
      });
      expect(historyRes.ok).toBe(true);

      const messages = historyRes.payload?.messages ?? [];
      const serialized = JSON.stringify(messages);
      const bytes = Buffer.byteLength(serialized, "utf8");

      expect(bytes).toBeLessThanOrEqual(historyMaxBytes);
      expect(messages.length).toBeGreaterThan(1);
      expect(serialized).toContain("small-29:");
      expect(serialized).toContain("[chat.history omitted: message too large]");
      expect(serialized.includes(hugeNestedText.slice(0, 256))).toBe(false);
    });
  });

  test("smoke: supports abort and idempotent completion", async () => {
    await withGatewayChatHarness(async ({ ws, createSessionDir }) => {
      const spy = getReplyFromConfig;
      let aborted = false;
      await connectOk(ws);

      await createSessionDir();
      await writeMainSessionStore();

      spy.mockReset();
      spy.mockImplementationOnce(async (_ctx, opts) => {
        opts?.onAgentRunStart?.(opts.runId ?? "idem-abort-1");
        const signal = opts?.abortSignal;
        await new Promise<void>((resolve) => {
          if (!signal || signal.aborted) {
            aborted = Boolean(signal?.aborted);
            resolve();
            return;
          }
          signal.addEventListener(
            "abort",
            () => {
              aborted = true;
              resolve();
            },
            { once: true },
          );
>>>>>>> b62bd290c (fix: remove hardcoded disableBlockStreaming to honor agent config for TUI (#19693))
        });
        const routeRes = await rpcReq(ws, "chat.send", {
          sessionKey: "main",
          message: "hello",
          idempotencyKey: "idem-route",
        });
        expect(routeRes.ok).toBe(true);
        const stored = JSON.parse(
          await fs.readFile(testState.sessionStorePath as string, "utf-8"),
        ) as Record<string, { lastChannel?: string; lastTo?: string } | undefined>;
        expect(stored["agent:main:main"]?.lastChannel).toBe("whatsapp");
        expect(stored["agent:main:main"]?.lastTo).toBe("+1555");

        await writeStore({ main: { sessionId: "sess-main", updatedAt: Date.now() } });
        resetSpy();
        let abortInFlight: Promise<unknown> | undefined;
        try {
          const callsBefore = spy.mock.calls.length;
          spy.mockImplementationOnce(async (_ctx, opts) => {
            opts?.onAgentRunStart?.(opts.runId ?? "idem-abort-1");
            const signal = opts?.abortSignal;
            await new Promise<void>((resolve) => {
              if (!signal) return resolve();
              if (signal.aborted) return resolve();
              signal.addEventListener("abort", () => resolve(), { once: true });
            });
          });
          const sendResP = onceMessage(
            ws,
            (o) => o.type === "res" && o.id === "send-abort-1",
            8000,
          );
          const abortResP = onceMessage(ws, (o) => o.type === "res" && o.id === "abort-1", 8000);
          const abortedEventP = onceMessage(
            ws,
            (o) => o.type === "event" && o.event === "chat" && o.payload?.state === "aborted",
            8000,
          );
          abortInFlight = Promise.allSettled([sendResP, abortResP, abortedEventP]);
          sendReq(ws, "send-abort-1", "chat.send", {
            sessionKey: "main",
            message: "hello",
            idempotencyKey: "idem-abort-1",
            timeoutMs: 30_000,
          });
          const sendRes = await sendResP;
          expect(sendRes.ok).toBe(true);
          await new Promise<void>((resolve, reject) => {
            const deadline = Date.now() + 1000;
            const tick = () => {
              if (spy.mock.calls.length > callsBefore) return resolve();
              if (Date.now() > deadline)
                return reject(new Error("timeout waiting for getReplyFromConfig"));
              setTimeout(tick, 5);
            };
            tick();
          });
          sendReq(ws, "abort-1", "chat.abort", {
            sessionKey: "main",
            runId: "idem-abort-1",
          });
          const abortRes = await abortResP;
          expect(abortRes.ok).toBe(true);
          const evt = await abortedEventP;
          expect(evt.payload?.runId).toBe("idem-abort-1");
          expect(evt.payload?.sessionKey).toBe("main");
        } finally {
          await abortInFlight;
        }

        await writeStore({ main: { sessionId: "sess-main", updatedAt: Date.now() } });
        sessionStoreSaveDelayMs.value = 120;
        resetSpy();
        try {
          spy.mockImplementationOnce(async (_ctx, opts) => {
            opts?.onAgentRunStart?.(opts.runId ?? "idem-abort-save-1");
            const signal = opts?.abortSignal;
            await new Promise<void>((resolve) => {
              if (!signal) return resolve();
              if (signal.aborted) return resolve();
              signal.addEventListener("abort", () => resolve(), { once: true });
            });
          });
          const abortedEventP = onceMessage(
            ws,
            (o) => o.type === "event" && o.event === "chat" && o.payload?.state === "aborted",
          );
          const sendResP = onceMessage(ws, (o) => o.type === "res" && o.id === "send-abort-save-1");
          sendReq(ws, "send-abort-save-1", "chat.send", {
            sessionKey: "main",
            message: "hello",
            idempotencyKey: "idem-abort-save-1",
            timeoutMs: 30_000,
          });
          const abortResP = onceMessage(ws, (o) => o.type === "res" && o.id === "abort-save-1");
          sendReq(ws, "abort-save-1", "chat.abort", {
            sessionKey: "main",
            runId: "idem-abort-save-1",
          });
          const abortRes = await abortResP;
          expect(abortRes.ok).toBe(true);
          const sendRes = await sendResP;
          expect(sendRes.ok).toBe(true);
          const evt = await abortedEventP;
          expect(evt.payload?.runId).toBe("idem-abort-save-1");
          expect(evt.payload?.sessionKey).toBe("main");
        } finally {
          sessionStoreSaveDelayMs.value = 0;
        }

        await writeStore({ main: { sessionId: "sess-main", updatedAt: Date.now() } });
        resetSpy();
        const callsBeforeStop = spy.mock.calls.length;
        spy.mockImplementationOnce(async (_ctx, opts) => {
          opts?.onAgentRunStart?.(opts.runId ?? "idem-stop-1");
          const signal = opts?.abortSignal;
          await new Promise<void>((resolve) => {
            if (!signal) return resolve();
            if (signal.aborted) return resolve();
            signal.addEventListener("abort", () => resolve(), { once: true });
          });
        });
        const stopSendResP = onceMessage(
          ws,
          (o) => o.type === "res" && o.id === "send-stop-1",
          8000,
        );
        sendReq(ws, "send-stop-1", "chat.send", {
          sessionKey: "main",
          message: "hello",
          idempotencyKey: "idem-stop-run",
        });
        const stopSendRes = await stopSendResP;
        expect(stopSendRes.ok).toBe(true);
        await waitFor(() => spy.mock.calls.length > callsBeforeStop);
        const abortedStopEventP = onceMessage(
          ws,
          (o) =>
            o.type === "event" &&
            o.event === "chat" &&
            o.payload?.state === "aborted" &&
            o.payload?.runId === "idem-stop-run",
          8000,
        );
        const stopResP = onceMessage(ws, (o) => o.type === "res" && o.id === "send-stop-2", 8000);
        sendReq(ws, "send-stop-2", "chat.send", {
          sessionKey: "main",
          message: "/stop",
          idempotencyKey: "idem-stop-req",
        });
        const stopRes = await stopResP;
        expect(stopRes.ok).toBe(true);
        const stopEvt = await abortedStopEventP;
        expect(stopEvt.payload?.sessionKey).toBe("main");
        expect(spy.mock.calls.length).toBe(callsBeforeStop + 1);
        resetSpy();
        let resolveRun: (() => void) | undefined;
        const runDone = new Promise<void>((resolve) => {
          resolveRun = resolve;
        });
        spy.mockImplementationOnce(async (_ctx, opts) => {
          opts?.onAgentRunStart?.(opts.runId ?? "idem-status-1");
          await runDone;
        });
        const started = await rpcReq<{ runId?: string; status?: string }>(ws, "chat.send", {
          sessionKey: "main",
          message: "hello",
          idempotencyKey: "idem-status-1",
        });
        expect(started.ok).toBe(true);
        expect(started.payload?.status).toBe("started");
        const inFlightRes = await rpcReq<{ runId?: string; status?: string }>(ws, "chat.send", {
          sessionKey: "main",
          message: "hello",
          idempotencyKey: "idem-status-1",
        });
        expect(inFlightRes.ok).toBe(true);
        expect(inFlightRes.payload?.status).toBe("in_flight");
        resolveRun?.();
        let completed = false;
        for (let i = 0; i < 20; i++) {
          const again = await rpcReq<{ runId?: string; status?: string }>(ws, "chat.send", {
            sessionKey: "main",
            message: "hello",
            idempotencyKey: "idem-status-1",
          });
          if (again.ok && again.payload?.status === "ok") {
            completed = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 10));
        }
        expect(completed).toBe(true);
        resetSpy();
        spy.mockImplementationOnce(async (_ctx, opts) => {
          opts?.onAgentRunStart?.(opts.runId ?? "idem-abort-all-1");
          const signal = opts?.abortSignal;
          await new Promise<void>((resolve) => {
            if (!signal) return resolve();
            if (signal.aborted) return resolve();
            signal.addEventListener("abort", () => resolve(), { once: true });
          });
        });
        const abortedEventP = onceMessage(
          ws,
          (o) =>
            o.type === "event" &&
            o.event === "chat" &&
            o.payload?.state === "aborted" &&
            o.payload?.runId === "idem-abort-all-1",
        );
        const startedAbortAll = await rpcReq(ws, "chat.send", {
          sessionKey: "main",
          message: "hello",
          idempotencyKey: "idem-abort-all-1",
        });
        expect(startedAbortAll.ok).toBe(true);
        const abortRes = await rpcReq<{
          ok?: boolean;
          aborted?: boolean;
          runIds?: string[];
        }>(ws, "chat.abort", { sessionKey: "main" });
        expect(abortRes.ok).toBe(true);
        expect(abortRes.payload?.aborted).toBe(true);
        expect(abortRes.payload?.runIds ?? []).toContain("idem-abort-all-1");
        await abortedEventP;
        const noDeltaP = onceMessage(
          ws,
          (o) =>
            o.type === "event" &&
            o.event === "chat" &&
            (o.payload?.state === "delta" || o.payload?.state === "final") &&
            o.payload?.runId === "idem-abort-all-1",
          250,
        );
        emitAgentEvent({
          runId: "idem-abort-all-1",
          stream: "assistant",
          data: { text: "should be suppressed" },
        });
        emitAgentEvent({
          runId: "idem-abort-all-1",
          stream: "lifecycle",
          data: { phase: "end" },
        });
        await expect(noDeltaP).rejects.toThrow(/timeout/i);
        await writeStore({});
        const abortUnknown = await rpcReq<{
          ok?: boolean;
          aborted?: boolean;
        }>(ws, "chat.abort", { sessionKey: "main", runId: "missing-run" });
        expect(abortUnknown.ok).toBe(true);
        expect(abortUnknown.payload?.aborted).toBe(false);

        await writeStore({ main: { sessionId: "sess-main", updatedAt: Date.now() } });
        resetSpy();
        let agentStartedResolve: (() => void) | undefined;
        const agentStartedP = new Promise<void>((resolve) => {
          agentStartedResolve = resolve;
        });
        spy.mockImplementationOnce(async (_ctx, opts) => {
          agentStartedResolve?.();
          const signal = opts?.abortSignal;
          await new Promise<void>((resolve) => {
            if (!signal) return resolve();
            if (signal.aborted) return resolve();
            signal.addEventListener("abort", () => resolve(), { once: true });
          });
        });
        const sendResP = onceMessage(
          ws,
          (o) => o.type === "res" && o.id === "send-mismatch-1",
          10_000,
        );
        sendReq(ws, "send-mismatch-1", "chat.send", {
          sessionKey: "main",
          message: "hello",
          idempotencyKey: "idem-mismatch-1",
          timeoutMs: 30_000,
        });
        await agentStartedP;
        const abortMismatch = await rpcReq(ws, "chat.abort", {
          sessionKey: "other",
          runId: "idem-mismatch-1",
        });
        expect(abortMismatch.ok).toBe(false);
        expect(abortMismatch.error?.code).toBe("INVALID_REQUEST");
        const abortMismatch2 = await rpcReq(ws, "chat.abort", {
          sessionKey: "main",
          runId: "idem-mismatch-1",
        });
        expect(abortMismatch2.ok).toBe(true);
        const sendRes = await sendResP;
        expect(sendRes.ok).toBe(true);

        await writeStore({ main: { sessionId: "sess-main", updatedAt: Date.now() } });
        resetSpy();
        spy.mockResolvedValueOnce(undefined);
        sendReq(ws, "send-complete-1", "chat.send", {
          sessionKey: "main",
          message: "hello",
          idempotencyKey: "idem-complete-1",
          timeoutMs: 30_000,
        });
        const sendCompleteRes = await onceMessage(
          ws,
          (o) => o.type === "res" && o.id === "send-complete-1",
        );
        expect(sendCompleteRes.ok).toBe(true);
        let completedRun = false;
        for (let i = 0; i < 20; i++) {
          const again = await rpcReq<{ runId?: string; status?: string }>(ws, "chat.send", {
            sessionKey: "main",
            message: "hello",
            idempotencyKey: "idem-complete-1",
            timeoutMs: 30_000,
          });
          if (again.ok && again.payload?.status === "ok") {
            completedRun = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 10));
        }
        expect(completedRun).toBe(true);
        const abortCompleteRes = await rpcReq(ws, "chat.abort", {
          sessionKey: "main",
          runId: "idem-complete-1",
        });
        expect(abortCompleteRes.ok).toBe(true);
        expect(abortCompleteRes.payload?.aborted).toBe(false);

        await writeStore({ main: { sessionId: "sess-main", updatedAt: Date.now() } });
        const res1 = await rpcReq(ws, "chat.send", {
          sessionKey: "main",
          message: "first",
          idempotencyKey: "idem-1",
        });
        expect(res1.ok).toBe(true);
        const res2 = await rpcReq(ws, "chat.send", {
          sessionKey: "main",
          message: "second",
          idempotencyKey: "idem-2",
        });
        expect(res2.ok).toBe(true);
        const final1P = onceMessage(
          ws,
          (o) => o.type === "event" && o.event === "chat" && o.payload?.state === "final",
          8000,
        );
        emitAgentEvent({
          runId: "idem-1",
          stream: "lifecycle",
          data: { phase: "end" },
        });
        const final1 = await final1P;
        const run1 =
          final1.payload && typeof final1.payload === "object"
            ? (final1.payload as { runId?: string }).runId
            : undefined;
        expect(run1).toBe("idem-1");
        const final2P = onceMessage(
          ws,
          (o) => o.type === "event" && o.event === "chat" && o.payload?.state === "final",
          8000,
        );
        emitAgentEvent({
          runId: "idem-2",
          stream: "lifecycle",
          data: { phase: "end" },
        });
        const final2 = await final2P;
        const run2 =
          final2.payload && typeof final2.payload === "object"
            ? (final2.payload as { runId?: string }).runId
            : undefined;
        expect(run2).toBe("idem-2");
      } finally {
        __setMaxChatHistoryMessagesBytesForTest();
        testState.sessionStorePath = undefined;
        sessionStoreSaveDelayMs.value = 0;
        ws.close();
        await server.close();
        await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
      }
    },
  );
});
