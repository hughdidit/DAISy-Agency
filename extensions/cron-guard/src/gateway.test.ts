import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cronGuardGatewayHandlers } from "./gateway.js";
import {
  getCronGuardRuntime,
  initializeCronGuardRuntime,
  stopCronGuardRuntime,
} from "./service.js";

const tempRoots: string[] = [];

beforeEach(() => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cron-guard-gateway-"));
  tempRoots.push(root);
});

afterEach(async () => {
  await stopCronGuardRuntime();
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

describe("cron-guard gateway", () => {
  it("redacts webhook targets from guarded cron.list responses", async () => {
    const stateDir = tempRoots[0]!;
    await initializeCronGuardRuntime({
      stateDir,
      config: {
        enabled: true,
        approvers: [],
        approvalTtlMs: 60_000,
        read: { redactWebhookTargets: true },
        discord: {
          enabled: false,
          target: "dm",
          cleanupAfterResolve: false,
          agentFilter: [],
          sessionFilter: [],
        },
        audit: { retention: { maxAgeMs: 60_000, maxResolved: 10 } },
      },
      logger: {
        info() {},
        warn() {},
        error() {},
      },
    });

    let response: { ok: true; payload: unknown } | { ok: false; error: unknown } | undefined;

    await cronGuardGatewayHandlers["cron.guard.list"]({
      params: {},
      respond: (ok, payload, error) => {
        response = ok ? { ok: true, payload } : { ok: false, error };
      },
      context: {
        cron: {
          listPage: async () => ({
            jobs: [
              {
                id: "job-1",
                name: "nightly",
                createdAtMs: 1_000,
                updatedAtMs: 1_500,
                schedule: {
                  kind: "cron",
                  expr: "0 * * * *",
                },
                sessionTarget: "main",
                wakeMode: "next-heartbeat",
                enabled: true,
                payload: {
                  kind: "systemEvent",
                  text: "run nightly sync",
                },
                delivery: {
                  mode: "webhook",
                  to: "https://example.invalid/hook",
                  failureDestination: {
                    mode: "webhook",
                    to: "https://example.invalid/failure",
                  },
                },
                state: {},
              },
            ],
            total: 1,
            limit: 50,
            offset: 0,
            hasMore: false,
          }),
        },
      } as never,
    });

    expect(response).toMatchObject({
      ok: true,
      payload: {
        jobs: [
          {
            delivery: {
              to: "[redacted]",
              failureDestination: { to: "[redacted]" },
            },
          },
        ],
      },
    });
  });

  it("rejects unauthorized approvers for guarded resolution", async () => {
    const stateDir = tempRoots[0]!;
    await initializeCronGuardRuntime({
      stateDir,
      config: {
        enabled: true,
        approvers: ["discord:123"],
        approvalTtlMs: 60_000,
        read: { redactWebhookTargets: true },
        discord: {
          enabled: false,
          target: "dm",
          cleanupAfterResolve: false,
          agentFilter: [],
          sessionFilter: [],
        },
        audit: { retention: { maxAgeMs: 60_000, maxResolved: 10 } },
      },
      logger: {
        info() {},
        warn() {},
        error() {},
      },
    });

    const runtime = getCronGuardRuntime();
    const request = await runtime.createAddRequest({
      payload: {
        name: "nightly",
        enabled: true,
        schedule: { kind: "cron", expr: "0 * * * *" },
        sessionTarget: "main",
        wakeMode: "next-heartbeat",
        payload: { kind: "systemEvent", text: "run nightly sync" },
      },
      requester: {
        toolName: "cron_guard_add_request",
      },
    });

    let response: { ok: true; payload: unknown } | { ok: false; error: unknown } | undefined;
    await cronGuardGatewayHandlers["cron.guard.resolve"]({
      params: {
        requestId: request.requestId,
        disposition: "approve",
        approver: {
          id: "999",
          principal: "discord:999",
          channel: "discord",
          from: "discord:999",
        },
      },
      respond: (ok, payload, error) => {
        response = ok ? { ok: true, payload } : { ok: false, error };
      },
      context: {
        cron: {},
      } as never,
    });

    expect(response).toMatchObject({
      ok: false,
      error: {
        message: expect.stringContaining("not authorized"),
      },
    });
  });
});
