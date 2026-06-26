import { beforeEach, describe, expect, it, vi } from "vitest";

const callGatewayToolMock = vi.hoisted(() => vi.fn());

vi.mock("./tools/gateway.js", () => ({
  callGatewayTool: callGatewayToolMock,
}));

const { requireSensitiveToolApproval } = await import("./sensitive-action-approval.js");

describe("requireSensitiveToolApproval", () => {
  beforeEach(() => {
    callGatewayToolMock.mockReset();
  });

  it("does not request approval for non-sensitive tool calls", async () => {
    await expect(
      requireSensitiveToolApproval({
        toolName: "read",
        params: { path: "notes.md" },
        agentId: "main",
      }),
    ).resolves.toBeUndefined();

    expect(callGatewayToolMock).not.toHaveBeenCalled();
  });

  it("fails closed when the sensitive approval is denied or missing", async () => {
    callGatewayToolMock.mockResolvedValueOnce({ id: "approval-id" });
    callGatewayToolMock.mockResolvedValueOnce({ decision: "deny" });

    await expect(
      requireSensitiveToolApproval({
        toolName: "browser",
        params: { action: "checkout", amount: 10 },
        agentId: "main",
      }),
    ).rejects.toThrow(/Hugh approval was not granted/);
  });

  it("allows an exact one-time sensitive approval", async () => {
    callGatewayToolMock.mockResolvedValueOnce({ id: "approval-id" });
    callGatewayToolMock.mockResolvedValueOnce({ decision: "allow-once" });

    await expect(
      requireSensitiveToolApproval({
        toolName: "gws.files.delete",
        params: { fileId: "abc" },
        agentId: "main",
      }),
    ).resolves.toBeUndefined();

    expect(callGatewayToolMock).toHaveBeenNthCalledWith(
      1,
      "exec.approval.request",
      expect.anything(),
      expect.objectContaining({
        category: "deletion",
        operationHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        twoPhase: true,
      }),
      { expectFinal: false },
    );
  });
});
