import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const launcherModuleUrl = new URL(
  "../../skills/openclaw-readonly/scripts/openclaw-readonly.mjs",
  import.meta.url,
);

async function loadLauncherModule() {
  return await import(launcherModuleUrl.href);
}

describe("openclaw-readonly launcher", () => {
  it("fails when the readonly runtime binary is missing", async () => {
    const { validateOpenClawReadonlyLauncher } = await loadLauncherModule();

    expect(() =>
      validateOpenClawReadonlyLauncher({
        args: ["status"],
        env: {
          OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
          OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
        },
        pathExists: () => true,
        binaryPath: null,
      }),
    ).toThrow('The sandbox runtime command "openclaw-readonly" is not on PATH.');
  });

  it("requires workspace mounts for skills diagnostics", async () => {
    const { validateOpenClawReadonlyLauncher } = await loadLauncherModule();

    expect(() =>
      validateOpenClawReadonlyLauncher({
        args: ["skills", "check"],
        env: {
          OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
          OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
        },
        pathExists: () => true,
        binaryPath: "/usr/local/bin/openclaw-readonly",
      }),
    ).toThrow("Missing OPENCLAW_READONLY_WORKSPACE_DIR");
  });

  it("rejects unsupported launcher commands", async () => {
    const { validateOpenClawReadonlyLauncher } = await loadLauncherModule();

    expect(() =>
      validateOpenClawReadonlyLauncher({
        args: ["doctor", "--plain"],
        env: {
          OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
          OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
        },
        pathExists: () => true,
        binaryPath: "/usr/local/bin/openclaw-readonly",
      }),
    ).toThrow("Unsupported openclaw-readonly launcher command");
  });

  it("resolves openclaw-readonly from PATH", async () => {
    const { resolveOpenClawReadonlyBinary } = await loadLauncherModule();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-readonly-path-"));
    try {
      const binaryPath = path.join(tempDir, "openclaw-readonly");
      await fs.writeFile(binaryPath, "#!/usr/bin/env node\n", { mode: 0o755 });

      expect(
        resolveOpenClawReadonlyBinary({
          pathValue: `${tempDir}${path.delimiter}${process.env.PATH ?? ""}`,
          env: process.env,
          platform: process.platform,
        }),
      ).toBe(binaryPath);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("resolves openclaw-readonly from Path on Windows env objects", async () => {
    const { resolveOpenClawReadonlyBinary } = await loadLauncherModule();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-readonly-win-path-"));
    try {
      const binaryPath = path.join(tempDir, "openclaw-readonly.CMD");
      await fs.writeFile(binaryPath, "@echo off\r\n", { mode: 0o755 });

      expect(
        resolveOpenClawReadonlyBinary({
          env: {
            Path: `${tempDir};C:\\Windows\\System32`,
            PATHEXT: ".EXE;.CMD",
          },
          platform: "win32",
        }),
      ).toBe(binaryPath);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("spawns the readonly runtime with the exact verb tuple", async () => {
    const { runOpenClawReadonlyLauncher } = await loadLauncherModule();
    const calls: Array<{ command: string; args: string[] }> = [];

    const status = runOpenClawReadonlyLauncher(
      {
        args: ["sandbox", "explain"],
        env: {
          OPENCLAW_READONLY_CONFIG_PATH: "/readonly/openclaw.json",
          OPENCLAW_READONLY_STATE_DIR: "/readonly/state",
        },
      },
      {
        binaryPath: "/usr/local/bin/openclaw-readonly",
        pathExists: () => true,
        spawnSyncImpl: (command: string, args: string[]) => {
          calls.push({ command, args });
          return { status: 0 };
        },
      },
    );

    expect(status).toBe(0);
    expect(calls).toEqual([
      {
        command: "/usr/local/bin/openclaw-readonly",
        args: ["sandbox", "explain"],
      },
    ]);
  });
});
