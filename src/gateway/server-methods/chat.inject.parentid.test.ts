import fs from "node:fs";
<<<<<<< HEAD
import os from "node:os";
import path from "node:path";
import { CURRENT_SESSION_VERSION } from "@mariozechner/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import type { GatewayRequestContext } from "./types.js";
=======
import { describe, expect, it } from "vitest";
import { appendInjectedAssistantMessageToTranscript } from "./chat-transcript-inject.js";
import { createTranscriptFixtureSync } from "./chat.test-helpers.js";
>>>>>>> 142c0a7f7 (refactor: extract gateway transcript append helper)

// Guardrail: Ensure gateway "injected" assistant transcript messages are appended via SessionManager,
// so they are attached to the current leaf with a `parentId` and do not sever compaction history.
describe("gateway chat.inject transcript writes", () => {
  it("appends a Pi session entry that includes parentId", async () => {
<<<<<<< HEAD
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-chat-inject-"));
    const transcriptPath = path.join(dir, "sess.jsonl");

    // Minimal Pi session header so SessionManager can open/append safely.
    fs.writeFileSync(
      transcriptPath,
      `${JSON.stringify({
        type: "session",
        version: CURRENT_SESSION_VERSION,
        id: "sess-1",
        timestamp: new Date(0).toISOString(),
        cwd: "/tmp",
      })}\n`,
      "utf-8",
    );

    vi.doMock("../session-utils.js", async (importOriginal) => {
      const original = await importOriginal<typeof import("../session-utils.js")>();
      return {
        ...original,
        loadSessionEntry: () => ({
          storePath: "/tmp/store.json",
          entry: {
            sessionId: "sess-1",
            sessionFile: transcriptPath,
          },
        }),
      };
    });
=======
    const { dir, transcriptPath } = createTranscriptFixtureSync({
      prefix: "openclaw-chat-inject-",
      sessionId: "sess-1",
    });

    try {
      const appended = appendInjectedAssistantMessageToTranscript({
        transcriptPath,
        message: "hello",
      });
      expect(appended.ok).toBe(true);
      expect(appended.messageId).toBeTruthy();
>>>>>>> 142c0a7f7 (refactor: extract gateway transcript append helper)

      const lines = fs.readFileSync(transcriptPath, "utf-8").split(/\r?\n/).filter(Boolean);
      expect(lines.length).toBeGreaterThanOrEqual(2);

      const last = JSON.parse(lines.at(-1) as string) as Record<string, unknown>;
      expect(last.type).toBe("message");

      // The regression we saw: raw jsonl appends omitted this field entirely.
      expect(Object.prototype.hasOwnProperty.call(last, "parentId")).toBe(true);
      expect(last).toHaveProperty("id");
      expect(last).toHaveProperty("message");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
