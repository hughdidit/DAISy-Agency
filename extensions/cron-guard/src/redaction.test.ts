import { describe, expect, it } from "vitest";
import { redactCronGuardJob, redactCronGuardListPage } from "./redaction.js";

describe("cron-guard redaction", () => {
  it("redacts webhook targets and strips unsafe agent-turn fields", () => {
    const job = redactCronGuardJob(
      {
        id: "job-1",
        name: "notify",
        enabled: true,
        createdAtMs: 1,
        updatedAtMs: 2,
        schedule: { kind: "cron", expr: "* * * * *" },
        sessionTarget: "isolated",
        wakeMode: "now",
        payload: {
          kind: "agentTurn",
          message: "hello",
          allowUnsafeExternalContent: true,
        },
        delivery: {
          mode: "webhook",
          to: "https://example.test/webhook",
          failureDestination: {
            mode: "webhook",
            to: "https://example.test/failure",
          },
        },
        state: {},
      },
      { redactWebhookTargets: true },
    );

    expect(job.payload).toEqual({
      kind: "agentTurn",
      message: "hello",
    });
    expect(job.delivery).toEqual({
      mode: "webhook",
      to: "[redacted]",
      failureDestination: {
        mode: "webhook",
        to: "[redacted]",
      },
    });
  });

  it("preserves non-webhook targets and paginated list metadata", () => {
    const page = redactCronGuardListPage(
      {
        jobs: [
          {
            id: "job-1",
            name: "announce",
            enabled: false,
            createdAtMs: 1,
            updatedAtMs: 2,
            schedule: { kind: "every", everyMs: 60_000 },
            sessionTarget: "main",
            wakeMode: "next-heartbeat",
            payload: { kind: "systemEvent", text: "hi" },
            delivery: {
              mode: "announce",
              channel: "discord",
              to: "ops-room",
            },
            state: {},
          },
        ],
        total: 1,
        offset: 20,
        limit: 10,
        hasMore: false,
        nextOffset: null,
      },
      { redactWebhookTargets: true },
    );

    expect(page).toEqual({
      jobs: [
        {
          id: "job-1",
          name: "announce",
          enabled: false,
          createdAtMs: 1,
          updatedAtMs: 2,
          schedule: { kind: "every", everyMs: 60_000 },
          sessionTarget: "main",
          wakeMode: "next-heartbeat",
          payload: { kind: "systemEvent", text: "hi" },
          delivery: {
            mode: "announce",
            channel: "discord",
            to: "ops-room",
          },
          state: {},
        },
      ],
      total: 1,
      offset: 20,
      limit: 10,
      hasMore: false,
      nextOffset: null,
    });
  });
});
