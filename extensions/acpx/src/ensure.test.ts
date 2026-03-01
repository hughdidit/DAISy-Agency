<<<<<<< HEAD
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACPX_LOCAL_INSTALL_COMMAND, ACPX_PINNED_VERSION } from "./config.js";
=======
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACPX_LOCAL_INSTALL_COMMAND,
  ACPX_PINNED_VERSION,
  buildAcpxLocalInstallCommand,
} from "./config.js";
>>>>>>> b12c909ea (ACPX: pin 0.1.15 and tolerate missing --version in health check)

const { resolveSpawnFailureMock, spawnAndCollectMock } = vi.hoisted(() => ({
  resolveSpawnFailureMock: vi.fn(() => null),
  spawnAndCollectMock: vi.fn(),
}));

vi.mock("./runtime-internals/process.js", () => ({
  resolveSpawnFailure: resolveSpawnFailureMock,
  spawnAndCollect: spawnAndCollectMock,
}));

import { checkPinnedAcpxVersion, ensurePinnedAcpx } from "./ensure.js";

describe("acpx ensure", () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    resolveSpawnFailureMock.mockReset();
    resolveSpawnFailureMock.mockReturnValue(null);
    spawnAndCollectMock.mockReset();
  });

  function makeTempAcpxInstall(version: string): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "acpx-ensure-test-"));
    tempDirs.push(root);
    const packageRoot = path.join(root, "node_modules", "acpx");
    fs.mkdirSync(path.join(packageRoot, "dist"), { recursive: true });
    fs.mkdirSync(path.join(root, "node_modules", ".bin"), { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, "package.json"),
      JSON.stringify({ name: "acpx", version }, null, 2),
      "utf8",
    );
    fs.writeFileSync(path.join(packageRoot, "dist", "cli.js"), "#!/usr/bin/env node\n", "utf8");
    const binPath = path.join(root, "node_modules", ".bin", "acpx");
    fs.symlinkSync(path.join(packageRoot, "dist", "cli.js"), binPath);
    return binPath;
  }

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts the pinned acpx version", async () => {
    spawnAndCollectMock.mockResolvedValueOnce({
      stdout: `acpx ${ACPX_PINNED_VERSION}\n`,
      stderr: "",
      code: 0,
      error: null,
    });

    const result = await checkPinnedAcpxVersion({
      command: "/plugin/node_modules/.bin/acpx",
      cwd: "/plugin",
      expectedVersion: ACPX_PINNED_VERSION,
    });

    expect(result).toEqual({
      ok: true,
      version: ACPX_PINNED_VERSION,
      expectedVersion: ACPX_PINNED_VERSION,
    });
  });

  it("reports version mismatch", async () => {
    spawnAndCollectMock.mockResolvedValueOnce({
      stdout: "acpx 0.0.9\n",
      stderr: "",
      code: 0,
      error: null,
    });

    const result = await checkPinnedAcpxVersion({
      command: "/plugin/node_modules/.bin/acpx",
      cwd: "/plugin",
      expectedVersion: ACPX_PINNED_VERSION,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "version-mismatch",
      expectedVersion: ACPX_PINNED_VERSION,
      installedVersion: "0.0.9",
      installCommand: ACPX_LOCAL_INSTALL_COMMAND,
    });
  });

<<<<<<< HEAD
=======
  it("falls back to package.json version when --version is unsupported", async () => {
    const command = makeTempAcpxInstall(ACPX_PINNED_VERSION);
    spawnAndCollectMock.mockResolvedValueOnce({
      stdout: "",
      stderr: "error: unknown option '--version'",
      code: 2,
      error: null,
    });

    const result = await checkAcpxVersion({
      command,
      cwd: path.dirname(path.dirname(command)),
      expectedVersion: ACPX_PINNED_VERSION,
    });

    expect(result).toEqual({
      ok: true,
      version: ACPX_PINNED_VERSION,
      expectedVersion: ACPX_PINNED_VERSION,
    });
  });

  it("accepts command availability when expectedVersion is unset", async () => {
    spawnAndCollectMock.mockResolvedValueOnce({
      stdout: "Usage: acpx [options]\n",
      stderr: "",
      code: 0,
      error: null,
    });

    const result = await checkAcpxVersion({
      command: "/custom/acpx",
      cwd: "/custom",
      expectedVersion: undefined,
    });

    expect(result).toEqual({
      ok: true,
      version: "unknown",
      expectedVersion: undefined,
    });
    expect(spawnAndCollectMock).toHaveBeenCalledWith({
      command: "/custom/acpx",
      args: ["--help"],
      cwd: "/custom",
    });
  });

>>>>>>> b12c909ea (ACPX: pin 0.1.15 and tolerate missing --version in health check)
  it("installs and verifies pinned acpx when precheck fails", async () => {
    spawnAndCollectMock
      .mockResolvedValueOnce({
        stdout: "acpx 0.0.9\n",
        stderr: "",
        code: 0,
        error: null,
      })
      .mockResolvedValueOnce({
        stdout: "added 1 package\n",
        stderr: "",
        code: 0,
        error: null,
      })
      .mockResolvedValueOnce({
        stdout: `acpx ${ACPX_PINNED_VERSION}\n`,
        stderr: "",
        code: 0,
        error: null,
      });

    await ensurePinnedAcpx({
      command: "/plugin/node_modules/.bin/acpx",
      pluginRoot: "/plugin",
      expectedVersion: ACPX_PINNED_VERSION,
    });

    expect(spawnAndCollectMock).toHaveBeenCalledTimes(3);
    expect(spawnAndCollectMock.mock.calls[1]?.[0]).toMatchObject({
      command: "npm",
      args: ["install", "--omit=dev", "--no-save", `acpx@${ACPX_PINNED_VERSION}`],
      cwd: "/plugin",
    });
  });

  it("fails with actionable error when npm install fails", async () => {
    spawnAndCollectMock
      .mockResolvedValueOnce({
        stdout: "acpx 0.0.9\n",
        stderr: "",
        code: 0,
        error: null,
      })
      .mockResolvedValueOnce({
        stdout: "",
        stderr: "network down",
        code: 1,
        error: null,
      });

    await expect(
      ensurePinnedAcpx({
        command: "/plugin/node_modules/.bin/acpx",
        pluginRoot: "/plugin",
        expectedVersion: ACPX_PINNED_VERSION,
      }),
    ).rejects.toThrow("failed to install plugin-local acpx");
  });
});
