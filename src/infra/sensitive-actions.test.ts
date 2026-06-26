import { describe, expect, it } from "vitest";
import { classifySensitiveAction } from "./sensitive-actions.js";

describe("classifySensitiveAction", () => {
  it("classifies delete-shaped tool names and bounds payload previews", () => {
    const result = classifySensitiveAction({
      surface: "tool",
      toolName: "gws.files.delete",
      payload: {
        fileId: "abc",
        accessToken: "secret-token",
        nested: { value: "x".repeat(500) },
      },
      agentId: "main",
      sessionKey: "agent:main:discord:channel:1",
    });

    expect(result?.category).toBe("deletion");
    expect(result?.reason).toContain("delete");
    expect(result?.operationPreview).toContain("[redacted]");
    expect(result?.operationPreview).not.toContain("secret-token");
    expect(result?.operationHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("classifies financial semantics from bounded payloads", () => {
    const result = classifySensitiveAction({
      surface: "tool",
      toolName: "browser",
      payload: { action: "checkout", amount: 25 },
    });

    expect(result?.category).toBe("financial");
    expect(result?.reason).toContain("checkout");
  });

  it("does not classify ordinary reads", () => {
    expect(
      classifySensitiveAction({
        surface: "gateway",
        method: "agents.files.get",
        payload: { path: "IDENTITY.md" },
      }),
    ).toBeNull();
  });
});
