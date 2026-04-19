import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";

const loadConfig = vi.hoisted(() => vi.fn(() => ({}) as OpenClawConfig));
const resolveDefaultAgentId = vi.hoisted(() => vi.fn(() => "main"));
const getMemorySearchManager = vi.hoisted(() => vi.fn());
const resolveOpenClawPackageRoot = vi.hoisted(() => vi.fn(async () => process.cwd()));
const runCommandWithTimeout = vi.hoisted(
  () =>
    vi.fn(async () => ({
      stdout: "doctor preview output",
      stderr: "",
      code: 0,
      signal: null,
      killed: false,
      termination: "exit",
      noOutputTimedOut: false,
    })),
);
const spawn = vi.hoisted(() =>
  vi.fn(() => ({
    pid: 4321,
    unref: vi.fn(),
  })),
);

vi.mock("../../config/config.js", () => ({
  loadConfig,
}));

vi.mock("../../agents/agent-scope.js", () => ({
  resolveDefaultAgentId,
}));

vi.mock("../../memory/index.js", () => ({
  getMemorySearchManager,
}));

vi.mock("../../infra/openclaw-root.js", () => ({
  resolveOpenClawPackageRoot,
}));

vi.mock("../../process/exec.js", () => ({
  runCommandWithTimeout,
}));

vi.mock("node:child_process", () => ({
  spawn,
}));

import { doctorHandlers } from "./doctor.js";

const invokeDoctorMemoryStatus = async (respond: ReturnType<typeof vi.fn>) => {
  await doctorHandlers["doctor.memory.status"]({
    req: {} as never,
    params: {} as never,
    respond: respond as never,
    context: {} as never,
    client: null,
    isWebchatConnect: () => false,
  });
};

const invokeDoctorRun = async (
  params: Record<string, unknown>,
  respond: ReturnType<typeof vi.fn>,
) => {
  await doctorHandlers["doctor.run"]({
    req: {} as never,
    params: params as never,
    respond: respond as never,
    context: {
      logGateway: {
        info: vi.fn(),
        warn: vi.fn(),
      },
    } as never,
    client: {
      connect: { role: "operator", scopes: ["operator.admin"] },
    } as never,
    isWebchatConnect: () => false,
  });
};

const expectEmbeddingErrorResponse = (respond: ReturnType<typeof vi.fn>, error: string) => {
  expect(respond).toHaveBeenCalledWith(
    true,
    {
      agentId: "main",
      embedding: {
        ok: false,
        error,
      },
    },
    undefined,
  );
};

describe("doctor.memory.status", () => {
  beforeEach(() => {
    loadConfig.mockClear();
    resolveDefaultAgentId.mockClear();
    getMemorySearchManager.mockReset();
    resolveOpenClawPackageRoot.mockClear();
    resolveOpenClawPackageRoot.mockResolvedValue(process.cwd());
    runCommandWithTimeout.mockClear();
    runCommandWithTimeout.mockResolvedValue({
      stdout: "doctor preview output",
      stderr: "",
      code: 0,
      signal: null,
      killed: false,
      termination: "exit",
      noOutputTimedOut: false,
    });
    spawn.mockClear();
    spawn.mockReturnValue({
      pid: 4321,
      unref: vi.fn(),
    });
  });

  it("returns gateway embedding probe status for the default agent", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    getMemorySearchManager.mockResolvedValue({
      manager: {
        status: () => ({ provider: "gemini" }),
        probeEmbeddingAvailability: vi.fn().mockResolvedValue({ ok: true }),
        close,
      },
    });
    const respond = vi.fn();

    await invokeDoctorMemoryStatus(respond);

    expect(getMemorySearchManager).toHaveBeenCalledWith({
      cfg: expect.any(Object),
      agentId: "main",
      purpose: "status",
    });
    expect(respond).toHaveBeenCalledWith(
      true,
      {
        agentId: "main",
        provider: "gemini",
        embedding: { ok: true },
      },
      undefined,
    );
    expect(close).toHaveBeenCalled();
  });

  it("returns unavailable when memory manager is missing", async () => {
    getMemorySearchManager.mockResolvedValue({
      manager: null,
      error: "memory search unavailable",
    });
    const respond = vi.fn();

    await invokeDoctorMemoryStatus(respond);

    expectEmbeddingErrorResponse(respond, "memory search unavailable");
  });

  it("returns probe failure when manager probe throws", async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    getMemorySearchManager.mockResolvedValue({
      manager: {
        status: () => ({ provider: "openai" }),
        probeEmbeddingAvailability: vi.fn().mockRejectedValue(new Error("timeout")),
        close,
      },
    });
    const respond = vi.fn();

    await invokeDoctorMemoryStatus(respond);

    expectEmbeddingErrorResponse(respond, "gateway memory probe failed: timeout");
    expect(close).toHaveBeenCalled();
  });
});

describe("doctor.run", () => {
  beforeEach(() => {
    resolveOpenClawPackageRoot.mockClear();
    resolveOpenClawPackageRoot.mockResolvedValue(process.cwd());
    runCommandWithTimeout.mockClear();
    runCommandWithTimeout.mockResolvedValue({
      stdout: "doctor preview output",
      stderr: "",
      code: 0,
      signal: null,
      killed: false,
      termination: "exit",
      noOutputTimedOut: false,
    });
    spawn.mockClear();
    spawn.mockReturnValue({
      pid: 4321,
      unref: vi.fn(),
    });
  });

  it("runs doctor dry-run synchronously and returns structured output", async () => {
    const respond = vi.fn();

    await invokeDoctorRun({ mode: "dry-run", timeoutMs: 45_000 }, respond);

    expect(runCommandWithTimeout).toHaveBeenCalledWith(
      [process.execPath, expect.stringContaining("openclaw.mjs"), "doctor", "--dry-run", "--non-interactive"],
      expect.objectContaining({
        cwd: process.cwd(),
        timeoutMs: 45_000,
      }),
    );
    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        ok: true,
        mode: "dry-run",
        background: false,
        exitCode: 0,
        stdoutTail: "doctor preview output",
      }),
      undefined,
    );
  });

  it("starts apply mode in the background and returns immediately", async () => {
    const respond = vi.fn();

    await invokeDoctorRun({ mode: "apply" }, respond);

    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      [expect.stringContaining("openclaw.mjs"), "doctor", "--repair", "--yes"],
      expect.objectContaining({
        cwd: process.cwd(),
        detached: true,
        stdio: "ignore",
      }),
    );
    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        ok: true,
        mode: "apply",
        background: true,
        pid: 4321,
      }),
      undefined,
    );
  });

  it("fails closed when the doctor cli entry is unavailable", async () => {
    resolveOpenClawPackageRoot.mockResolvedValueOnce(path.join(process.cwd(), "missing-root"));
    const respond = vi.fn();

    await invokeDoctorRun({ mode: "dry-run" }, respond);

    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        ok: false,
        mode: "dry-run",
        started: false,
      }),
      undefined,
    );
  });
});
