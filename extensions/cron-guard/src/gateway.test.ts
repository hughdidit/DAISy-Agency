import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cronGuardGatewayHandlers } from "./gateway.js";
import { initializeCronGuardRuntime, stopCronGuardRuntime } from "./service.js";

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
                schedule: "0 * * * *",
                enabled: true,
                delivery: { mode: "webhook", to: "https://example.invalid/hook" },
                failureDestination: {
                  mode: "webhook",
                  to: "https://example.invalid/failure",
                },
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
            delivery: { to: "[redacted]" },
            failureDestination: { to: "[redacted]" },
          },
        ],
      },
    });
  });
});
