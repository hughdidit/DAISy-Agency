import { describe, expect, it } from "vitest";
import { BREAK_GLASS_HOST_LABEL } from "../agents/sandbox.js";
import {
  BREAK_GLASS_HOST_FLOW_IDS,
  BREAK_GLASS_HOST_FLOWS,
  formatBreakGlassHostAuditEvent,
  formatBreakGlassHostFlowLabel,
  formatBreakGlassHostFlowSummary,
} from "./break-glass-host-flows.js";

describe("break-glass host flows", () => {
  it("defines stable metadata for every SBX-504 flow id", () => {
    expect(BREAK_GLASS_HOST_FLOW_IDS).toEqual([
      "chat-bash",
      "exec-gateway",
      "exec-node",
      "acp-runtime",
      "gateway-restart",
      "runtime-debug",
      "sandbox-dangerous-override",
    ]);

    for (const id of BREAK_GLASS_HOST_FLOW_IDS) {
      expect(BREAK_GLASS_HOST_FLOWS[id]).toEqual(
        expect.objectContaining({
          id,
          title: expect.any(String),
          surface: expect.any(String),
          summary: expect.any(String),
        }),
      );
    }
  });

  it("formats labels and audit events with the shared break-glass wording", () => {
    expect(formatBreakGlassHostFlowLabel("chat-bash")).toContain(BREAK_GLASS_HOST_LABEL);
    expect(formatBreakGlassHostFlowSummary("exec-gateway")).toContain('tools.exec.host="gateway"');
    expect(
      formatBreakGlassHostAuditEvent({
        flowId: "gateway-restart",
        action: "requested",
        subject: "/restart",
        result: "accepted",
      }),
    ).toBe(
      'break-glass host authority: gateway-restart requested subject="/restart" result="accepted"',
    );
  });

  it("normalizes and redacts audit fields before formatting", () => {
    expect(
      formatBreakGlassHostAuditEvent({
        flowId: "chat-bash",
        action: "failed",
        subject: "curl\n--token super-secret https://example.test",
        result: "password=hunter2\nfailed",
      }),
    ).toBe(
      'break-glass host authority: chat-bash failed subject="curl --token [redacted] https://example.test" result="password=[redacted] failed"',
    );
  });
});
