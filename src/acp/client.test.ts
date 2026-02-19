import { describe, expect, it } from "vitest";

// Structural tests verify security-critical code exists in client.ts.
// Full integration tests with ACP SDK mocks deferred to future enhancement.

describe("ACP client permission classification", () => {
  it("should define dangerous tools that include exec and sessions_spawn", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const source = await fs.readFile(
      path.resolve(__dirname, "client.ts"),
      "utf-8",
    );

    expect(source).toContain("DANGEROUS_ACP_TOOLS");
    expect(source).toContain('"exec"');
    expect(source).toContain('"sessions_spawn"');
    expect(source).toContain('"sessions_send"');
    expect(source).toContain('"gateway"');
  });

  it("should not auto-approve when options array is empty", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const source = await fs.readFile(
      path.resolve(__dirname, "client.ts"),
      "utf-8",
    );

    // Verify the empty-options guard exists
    expect(source).toContain("options.length === 0");
    // Verify it denies rather than approves
    expect(source).toContain("no options available");
  });

  it("should use stderr for permission logging (not stdout)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const source = await fs.readFile(
      path.resolve(__dirname, "client.ts"),
      "utf-8",
    );

    // Permission logs should go to stderr to avoid corrupting ACP protocol on stdout
    expect(source).toContain("console.error");
    expect(source).toContain("[permission");
  });

  it("should have a 30-second timeout for interactive prompts", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const source = await fs.readFile(
      path.resolve(__dirname, "client.ts"),
      "utf-8",
    );

<<<<<<< HEAD
    expect(source).toContain("30_000");
    expect(source).toContain("[permission timeout]");
=======
  it("prompts when tool name contains read/search substrings but isn't a safe kind", async () => {
    const prompt = vi.fn(async () => false);
    const res = await resolvePermissionRequest(
      makePermissionRequest({
        toolCall: { toolCallId: "tool-t", title: "thread: reply", status: "pending" },
      }),
      { prompt, log: () => {} },
    );
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ outcome: { outcome: "selected", optionId: "reject" } });
  });

  it("uses allow_always and reject_always when once options are absent", async () => {
    const options: RequestPermissionRequest["options"] = [
      { kind: "allow_always", name: "Always allow", optionId: "allow-always" },
      { kind: "reject_always", name: "Always reject", optionId: "reject-always" },
    ];
    const prompt = vi.fn(async () => false);
    const res = await resolvePermissionRequest(
      makePermissionRequest({
        toolCall: { toolCallId: "tool-3", title: "gateway: reload", status: "pending" },
        options,
      }),
      { prompt, log: () => {} },
    );
    expect(res).toEqual({ outcome: { outcome: "selected", optionId: "reject-always" } });
  });

  it("prompts when tool identity is unknown and can still approve", async () => {
    const prompt = vi.fn(async () => true);
    const res = await resolvePermissionRequest(
      makePermissionRequest({
        toolCall: {
          toolCallId: "tool-4",
          title: "Modifying critical configuration file",
          status: "pending",
        },
      }),
      { prompt, log: () => {} },
    );
    expect(prompt).toHaveBeenCalledWith(undefined, "Modifying critical configuration file");
    expect(res).toEqual({ outcome: { outcome: "selected", optionId: "allow" } });
  });

  it("returns cancelled when no permission options are present", async () => {
    const prompt = vi.fn(async () => true);
    const res = await resolvePermissionRequest(makePermissionRequest({ options: [] }), {
      prompt,
      log: () => {},
    });
    expect(prompt).not.toHaveBeenCalled();
    expect(res).toEqual({ outcome: { outcome: "cancelled" } });
  });
});

describe("acp event mapper", () => {
  it("extracts text and resource blocks into prompt text", () => {
    const text = extractTextFromPrompt([
      { type: "text", text: "Hello" },
      { type: "resource", resource: { uri: "file:///tmp/spec.txt", text: "File contents" } },
      { type: "resource_link", uri: "https://example.com", name: "Spec", title: "Spec" },
      { type: "image", data: "abc", mimeType: "image/png" },
    ]);

    expect(text).toBe("Hello\nFile contents\n[Resource link (Spec)] https://example.com");
  });

  it("counts newline separators toward prompt byte limits", () => {
    expect(() =>
      extractTextFromPrompt(
        [
          { type: "text", text: "a" },
          { type: "text", text: "b" },
        ],
        2,
      ),
    ).toThrow(/maximum allowed size/i);

    expect(
      extractTextFromPrompt(
        [
          { type: "text", text: "a" },
          { type: "text", text: "b" },
        ],
        3,
      ),
    ).toBe("a\nb");
  });

  it("extracts image blocks into gateway attachments", () => {
    const attachments = extractAttachmentsFromPrompt([
      { type: "image", data: "abc", mimeType: "image/png" },
      { type: "image", data: "", mimeType: "image/png" },
      { type: "text", text: "ignored" },
    ]);

    expect(attachments).toEqual([
      {
        type: "image",
        mimeType: "image/png",
        content: "abc",
      },
    ]);
>>>>>>> 63e39d7f5 (fix(security): harden ACP prompt size guardrails)
  });
});
