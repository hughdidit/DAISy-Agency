import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import "./test-helpers/fast-core-tools.js";
import { createOpenClawTools } from "./openclaw-tools.js";

vi.mock("./tools/gateway.js", () => ({
  callGatewayTool: vi.fn(async () => ({
    ok: true,
    background: false,
  })),
  readGatewayCallOptions: vi.fn(() => ({})),
}));

vi.mock("./bash-tools.exec-approval-request.js", () => ({
  requestExecApprovalDecisionForHost: vi.fn(async () => "allow-once"),
}));

function buildRemoteConfig(overrides: Record<string, unknown> = {}): OpenClawConfig {
  return {
    gateway: {
      mode: "remote",
      remote: {
        url: "wss://gateway.example",
        token: "remote-token",
        ...overrides,
      },
    },
  };
}

function requireDoctorRepairTool(config: OpenClawConfig, agentSessionKey?: string) {
  const tool = createOpenClawTools({
    ...(agentSessionKey ? { agentSessionKey } : {}),
    config,
  }).find((candidate) => candidate.name === "openclaw_doctor_repair");
  expect(tool).toBeDefined();
  if (!tool) {
    throw new Error("missing openclaw_doctor_repair tool");
  }
  return tool;
}

describe("openclaw_doctor_repair tool", () => {
  beforeEach(async () => {
    const { callGatewayTool } = await import("./tools/gateway.js");
    const { requestExecApprovalDecisionForHost } =
      await import("./bash-tools.exec-approval-request.js");
    vi.mocked(callGatewayTool).mockClear();
    vi.mocked(callGatewayTool).mockResolvedValue({
      ok: true,
      background: false,
    });
    vi.mocked(requestExecApprovalDecisionForHost).mockClear();
    vi.mocked(requestExecApprovalDecisionForHost).mockResolvedValue("allow-once");
  });

  it("registers as an owner-only core tool", () => {
    const tool = requireDoctorRepairTool(buildRemoteConfig());
    expect(tool.ownerOnly).toBe(true);
  });

  it("dispatches preview to doctor.run after approval", async () => {
    const { callGatewayTool } = await import("./tools/gateway.js");
    const { requestExecApprovalDecisionForHost } =
      await import("./bash-tools.exec-approval-request.js");
    const tool = requireDoctorRepairTool(
      buildRemoteConfig(),
      "agent:main:whatsapp:dm:+15555550123",
    );

    const result = await tool.execute("call-preview", {
      action: "preview",
      timeoutMs: 120_000,
    });

    expect(requestExecApprovalDecisionForHost).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "openclaw doctor --dry-run --non-interactive",
        host: "gateway",
        security: "full",
        ask: "always",
        sessionKey: "agent:main:whatsapp:dm:+15555550123",
      }),
    );
    expect(callGatewayTool).toHaveBeenCalledWith(
      "doctor.run",
      { timeoutMs: 125_000 },
      { mode: "dry-run", timeoutMs: 120_000 },
    );
    expect(result.details).toMatchObject({
      ok: true,
      mode: "dry-run",
      transport: "direct",
      target: "wss://gateway.example",
    });
  });

  it("dispatches apply to doctor.run after approval", async () => {
    const { callGatewayTool } = await import("./tools/gateway.js");
    const tool = requireDoctorRepairTool(buildRemoteConfig());

    const result = await tool.execute("call-apply", {
      action: "apply",
    });

    expect(callGatewayTool).toHaveBeenCalledWith(
      "doctor.run",
      { timeoutMs: 30_000 },
      { mode: "apply" },
    );
    expect(result.details).toMatchObject({
      ok: true,
      mode: "apply",
      transport: "direct",
    });
  });

  it("treats malformed gateway responses as failure", async () => {
    const { callGatewayTool } = await import("./tools/gateway.js");
    vi.mocked(callGatewayTool).mockResolvedValueOnce({
      background: false,
    });
    const tool = requireDoctorRepairTool(buildRemoteConfig());

    const result = await tool.execute("call-preview-malformed", {
      action: "preview",
    });

    expect(result.details).toMatchObject({
      ok: false,
      mode: "dry-run",
      transport: "direct",
      target: "wss://gateway.example",
      result: {
        background: false,
      },
    });
  });

  it("fails closed on direct loopback targets", async () => {
    const tool = requireDoctorRepairTool(
      buildRemoteConfig({
        url: "ws://127.0.0.1:18789",
      }),
    );

    await expect(
      tool.execute("call-loopback", {
        action: "preview",
      }),
    ).rejects.toThrow(/refuses loopback gateway\.remote\.url/i);
  });

  it("allows ssh transport routes even when the forwarded url is loopback", async () => {
    const { callGatewayTool } = await import("./tools/gateway.js");
    const tool = requireDoctorRepairTool(
      buildRemoteConfig({
        transport: "ssh",
        url: "ws://127.0.0.1:18789",
        sshTarget: "ops@gateway-host",
      }),
    );

    const result = await tool.execute("call-ssh", {
      action: "preview",
    });

    expect(callGatewayTool).toHaveBeenCalledWith(
      "doctor.run",
      { timeoutMs: 605_000 },
      { mode: "dry-run" },
    );
    expect(result.details).toMatchObject({
      transport: "ssh",
      target: "ssh:ops@gateway-host",
    });
  });

  it("returns a structured no-op when approval is denied", async () => {
    const { callGatewayTool } = await import("./tools/gateway.js");
    const { requestExecApprovalDecisionForHost } =
      await import("./bash-tools.exec-approval-request.js");
    vi.mocked(requestExecApprovalDecisionForHost).mockResolvedValueOnce("deny");
    const tool = requireDoctorRepairTool(buildRemoteConfig());

    const result = await tool.execute("call-deny", {
      action: "preview",
    });

    expect(callGatewayTool).not.toHaveBeenCalled();
    expect(result.details).toMatchObject({
      ok: false,
      status: "not-approved",
      decision: "deny",
      mode: "dry-run",
    });
  });

  it("fails closed when remote credentials are missing", async () => {
    const tool = requireDoctorRepairTool(
      buildRemoteConfig({
        token: "",
        password: undefined,
      }),
    );

    await expect(
      tool.execute("call-missing-creds", {
        action: "preview",
      }),
    ).rejects.toThrow(/Configure gateway\.remote\.token or gateway\.remote\.password/i);
  });
});
