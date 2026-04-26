import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clearConfigCache } from "../config/config.js";
import { withEnvAsync } from "../test-utils/env.js";
import { sandboxExplainCommand } from "./sandbox-explain.js";

async function withSandboxExplainFixture(run: (fixture: { configPath: string }) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-sandbox-explain-"));
  try {
    const stateDir = path.join(root, "state");
    const configPath = path.join(root, "openclaw.json");
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          agents: {
            defaults: {
              sandbox: {
                mode: "off",
                scope: "session",
                workspaceAccess: "none",
              },
            },
          },
          session: {
            store: path.join(stateDir, "sessions-{agentId}.json"),
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    await withEnvAsync(
      {
        OPENCLAW_CONFIG_PATH: configPath,
        OPENCLAW_STATE_DIR: stateDir,
      },
      async () => {
        clearConfigCache();
        await run({ configPath });
      },
    );
  } finally {
    clearConfigCache();
    await fs.rm(root, { recursive: true, force: true });
  }
}

describe("sandbox explain command with real config", () => {
  it("loads host compatibility trust posture from the configured config file", async () => {
    await withSandboxExplainFixture(async () => {
      const stdout: string[] = [];
      const stderr: string[] = [];

      await sandboxExplainCommand({ json: false, session: "agent:main:main" }, {
        log: (message: string) => stdout.push(message),
        error: (message: string) => stderr.push(message),
        exit: (code: number) => {
          throw new Error(`sandbox explain exited with ${code}`);
        },
      } as unknown as Parameters<typeof sandboxExplainCommand>[1]);

      const output = stdout.join("\n");
      expect(stderr).toEqual([]);
      expect(output).toContain("reduced-trust host compatibility mode");
      expect(output).toContain("host-compatibility");
      expect(output).toContain('agents.defaults.sandbox.mode="all"');
      expect(output).not.toContain("runtime: direct");
    });
  });
});
