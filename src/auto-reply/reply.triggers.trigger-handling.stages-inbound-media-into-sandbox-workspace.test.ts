import fs from "node:fs/promises";
import { basename, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
import type { MsgContext, TemplateContext } from "./templating.js";
=======
import {
  createSandboxMediaContexts,
  createSandboxMediaStageConfig,
  withSandboxMediaTempHome,
} from "./stage-sandbox-media.test-harness.js";
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

const sandboxMocks = vi.hoisted(() => ({
  ensureSandboxWorkspaceForSession: vi.fn(),
}));

vi.mock("../agents/sandbox.js", () => sandboxMocks);

import { ensureSandboxWorkspaceForSession } from "../agents/sandbox.js";
import { stageSandboxMedia } from "./reply/stage-sandbox-media.js";

<<<<<<< HEAD
async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(async (home) => await fn(home), { prefix: "moltbot-triggers-" });
}

=======
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
afterEach(() => {
  vi.restoreAllMocks();
});

describe("stageSandboxMedia", () => {
  it("stages inbound media into the sandbox workspace", async () => {
<<<<<<< HEAD
    await withTempHome(async (home) => {
      const inboundDir = join(home, ".clawdbot", "media", "inbound");
=======
    await withSandboxMediaTempHome("openclaw-triggers-", async (home) => {
      const inboundDir = join(home, ".openclaw", "media", "inbound");
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
      await fs.mkdir(inboundDir, { recursive: true });
      const mediaPath = join(inboundDir, "photo.jpg");
      await fs.writeFile(mediaPath, "test");

      const sandboxDir = join(home, "sandboxes", "session");
      vi.mocked(ensureSandboxWorkspaceForSession).mockResolvedValue({
        workspaceDir: sandboxDir,
        containerWorkdir: "/work",
      });

      const { ctx, sessionCtx } = createSandboxMediaContexts(mediaPath);

      await stageSandboxMedia({
        ctx,
        sessionCtx,
<<<<<<< HEAD
        cfg: {
          agents: {
            defaults: {
              model: "anthropic/claude-opus-4-5",
              workspace: join(home, "clawd"),
              sandbox: {
                mode: "non-main",
                workspaceRoot: join(home, "sandboxes"),
              },
            },
          },
          channels: { whatsapp: { allowFrom: ["*"] } },
          session: { store: join(home, "sessions.json") },
        },
=======
        cfg: createSandboxMediaStageConfig(home),
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
        sessionKey: "agent:main:main",
        workspaceDir: join(home, "clawd"),
      });

      const stagedPath = `media/inbound/${basename(mediaPath)}`;
      expect(ctx.MediaPath).toBe(stagedPath);
      expect(sessionCtx.MediaPath).toBe(stagedPath);
      expect(ctx.MediaUrl).toBe(stagedPath);
      expect(sessionCtx.MediaUrl).toBe(stagedPath);

      const stagedFullPath = join(sandboxDir, "media", "inbound", basename(mediaPath));
      await expect(fs.stat(stagedFullPath)).resolves.toBeTruthy();
    });
  });

  it("rejects staging host files from outside the media directory", async () => {
    await withSandboxMediaTempHome("openclaw-triggers-bypass-", async (home) => {
      // Sensitive host file outside .openclaw
      const sensitiveFile = join(home, "secrets.txt");
      await fs.writeFile(sensitiveFile, "SENSITIVE DATA");

      const sandboxDir = join(home, "sandboxes", "session");
      vi.mocked(ensureSandboxWorkspaceForSession).mockResolvedValue({
        workspaceDir: sandboxDir,
        containerWorkdir: "/work",
      });

      const { ctx, sessionCtx } = createSandboxMediaContexts(sensitiveFile);

      // This should fail or skip the file
      await stageSandboxMedia({
        ctx,
        sessionCtx,
        cfg: createSandboxMediaStageConfig(home),
        sessionKey: "agent:main:main",
        workspaceDir: join(home, "openclaw"),
      });

      const stagedFullPath = join(sandboxDir, "media", "inbound", basename(sensitiveFile));
      // Expect the file NOT to be staged
      await expect(fs.stat(stagedFullPath)).rejects.toThrow();

      // Context should NOT be rewritten to a sandbox path if it failed to stage
      expect(ctx.MediaPath).toBe(sensitiveFile);
    });
  });
});
