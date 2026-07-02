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

  it("classifies camelCase and PascalCase sensitive names", () => {
    expect(
      classifySensitiveAction({
        surface: "gateway",
        method: "deleteWorkspaceAccount",
        payload: {},
      })?.category,
    ).toBe("deletion");
    expect(
      classifySensitiveAction({
        surface: "tool",
        toolName: "SpendBudget",
        payload: {},
      })?.category,
    ).toBe("financial");
  });

  it("hashes full redacted operation identity, not only the bounded preview", () => {
    const first = classifySensitiveAction({
      surface: "tool",
      toolName: "browser",
      payload: { action: "checkout", note: `${"x".repeat(300)}a` },
    });
    const second = classifySensitiveAction({
      surface: "tool",
      toolName: "browser",
      payload: { action: "checkout", note: `${"x".repeat(300)}b` },
    });

    expect(first?.operationPreview).toBe(second?.operationPreview);
    expect(first?.operationHash).not.toBe(second?.operationHash);
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

  it("does not classify Gmail read queries that exclude trash as deletions", () => {
    expect(
      classifySensitiveAction({
        surface: "tool",
        toolName: "gws_gmail_read",
        payload: {
          action: "list_messages",
          query: "in:inbox is:unread -in:spam -in:trash",
          maxResults: 10,
        },
      }),
    ).toBeNull();
  });

  it("classifies apply_patch delete hunks as deletions without scanning arbitrary inputs", () => {
    const result = classifySensitiveAction({
      surface: "tool",
      toolName: "apply_patch",
      payload: {
        input: ["*** Begin Patch", "*** Delete File: notes.md", "*** End Patch"].join("\n"),
      },
    });

    expect(result?.category).toBe("deletion");
  });

  it("does not classify disabled sensitive-shaped payload flags", () => {
    expect(
      classifySensitiveAction({
        surface: "tool",
        toolName: "status",
        payload: { deleteCount: 0, removeItems: [], chargeNote: "" },
      }),
    ).toBeNull();
  });

  it("classifies common action-like payload aliases", () => {
    expect(
      classifySensitiveAction({
        surface: "tool",
        toolName: "gateway",
        payload: { cmd: "delete workspace" },
      })?.category,
    ).toBe("deletion");
    expect(
      classifySensitiveAction({
        surface: "tool",
        toolName: "gateway",
        payload: { APICommand: "checkout" },
      })?.category,
    ).toBe("financial");
  });
});
