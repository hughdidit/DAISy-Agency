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
<<<<<<< HEAD
=======
  childProcessMocks.spawn.mockClear();
>>>>>>> d6d73d0ed (test(core): trim redundant test resets and use mockClear)
});

describe("stageSandboxMedia", () => {
<<<<<<< HEAD
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

=======
  it("stages allowed media and blocks unsafe paths", async () => {
    await withSandboxMediaTempHome("openclaw-triggers-", async (home) => {
      const cfg = createSandboxMediaStageConfig(home);
      const workspaceDir = join(home, "openclaw");
>>>>>>> c88915b72 (test: consolidate trigger handling suites)
      const sandboxDir = join(home, "sandboxes", "session");
      vi.mocked(ensureSandboxWorkspaceForSession).mockResolvedValue({
        workspaceDir: sandboxDir,
        containerWorkdir: "/work",
      });

      {
        const inboundDir = join(home, ".openclaw", "media", "inbound");
        await fs.mkdir(inboundDir, { recursive: true });
        const mediaPath = join(inboundDir, "photo.jpg");
        await fs.writeFile(mediaPath, "test");
        const { ctx, sessionCtx } = createSandboxMediaContexts(mediaPath);

<<<<<<< HEAD
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
=======
        await stageSandboxMedia({
          ctx,
          sessionCtx,
          cfg,
          sessionKey: "agent:main:main",
          workspaceDir,
        });
>>>>>>> c88915b72 (test: consolidate trigger handling suites)

        const stagedPath = `media/inbound/${basename(mediaPath)}`;
        expect(ctx.MediaPath).toBe(stagedPath);
        expect(sessionCtx.MediaPath).toBe(stagedPath);
        expect(ctx.MediaUrl).toBe(stagedPath);
        expect(sessionCtx.MediaUrl).toBe(stagedPath);
        await expect(
          fs.stat(join(sandboxDir, "media", "inbound", basename(mediaPath))),
        ).resolves.toBeTruthy();
      }

      {
        const sensitiveFile = join(home, "secrets.txt");
        await fs.writeFile(sensitiveFile, "SENSITIVE DATA");
        const { ctx, sessionCtx } = createSandboxMediaContexts(sensitiveFile);

        await stageSandboxMedia({
          ctx,
          sessionCtx,
          cfg,
          sessionKey: "agent:main:main",
          workspaceDir,
        });

        await expect(
          fs.stat(join(sandboxDir, "media", "inbound", basename(sensitiveFile))),
        ).rejects.toThrow();
        expect(ctx.MediaPath).toBe(sensitiveFile);
      }

      {
        childProcessMocks.spawn.mockClear();
        const { ctx, sessionCtx } = createSandboxMediaContexts("/etc/passwd");
        ctx.Provider = "imessage";
        ctx.MediaRemoteHost = "user@gateway-host";
        sessionCtx.Provider = "imessage";
        sessionCtx.MediaRemoteHost = "user@gateway-host";

        await stageSandboxMedia({
          ctx,
          sessionCtx,
          cfg,
          sessionKey: "agent:main:main",
          workspaceDir,
        });

<<<<<<< HEAD
      const stagedFullPath = join(sandboxDir, "media", "inbound", basename(sensitiveFile));
      // Expect the file NOT to be staged
      await expect(fs.stat(stagedFullPath)).rejects.toThrow();

      // Context should NOT be rewritten to a sandbox path if it failed to stage
      expect(ctx.MediaPath).toBe(sensitiveFile);
=======
        expect(childProcessMocks.spawn).not.toHaveBeenCalled();
        expect(ctx.MediaPath).toBe("/etc/passwd");
      }
>>>>>>> c88915b72 (test: consolidate trigger handling suites)
    });
  });
});
