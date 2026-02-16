import { beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD

import type { RuntimeEnv } from "../runtime.js";
=======
import { baseConfigSnapshot, createTestRuntime } from "./test-runtime-config-helpers.js";
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

const readConfigFileSnapshotMock = vi.hoisted(() => vi.fn());
const writeConfigFileMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const wizardMocks = vi.hoisted(() => ({
  createClackPrompter: vi.fn(),
}));

vi.mock("../config/config.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../config/config.js")>()),
  readConfigFileSnapshot: readConfigFileSnapshotMock,
  writeConfigFile: writeConfigFileMock,
}));

vi.mock("../wizard/clack-prompter.js", () => ({
  createClackPrompter: wizardMocks.createClackPrompter,
}));

import { WizardCancelledError } from "../wizard/prompts.js";
import { agentsAddCommand } from "./agents.js";

<<<<<<< HEAD
const runtime: RuntimeEnv = {
  log: vi.fn(),
  error: vi.fn(),
  exit: vi.fn(),
};

const baseSnapshot = {
  path: "/tmp/moltbot.json",
  exists: true,
  raw: "{}",
  parsed: {},
  valid: true,
  config: {},
  issues: [],
  legacyIssues: [],
};
=======
const runtime = createTestRuntime();
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

describe("agents add command", () => {
  beforeEach(() => {
    readConfigFileSnapshotMock.mockReset();
    writeConfigFileMock.mockClear();
    wizardMocks.createClackPrompter.mockReset();
    runtime.log.mockClear();
    runtime.error.mockClear();
    runtime.exit.mockClear();
  });

  it("requires --workspace when flags are present", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({ ...baseConfigSnapshot });

    await agentsAddCommand({ name: "Work" }, runtime, { hasFlags: true });

    expect(runtime.error).toHaveBeenCalledWith(expect.stringContaining("--workspace"));
    expect(runtime.exit).toHaveBeenCalledWith(1);
    expect(writeConfigFileMock).not.toHaveBeenCalled();
  });

  it("requires --workspace in non-interactive mode", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({ ...baseConfigSnapshot });

    await agentsAddCommand({ name: "Work", nonInteractive: true }, runtime, {
      hasFlags: false,
    });

    expect(runtime.error).toHaveBeenCalledWith(expect.stringContaining("--workspace"));
    expect(runtime.exit).toHaveBeenCalledWith(1);
    expect(writeConfigFileMock).not.toHaveBeenCalled();
  });

  it("exits with code 1 when the interactive wizard is cancelled", async () => {
    readConfigFileSnapshotMock.mockResolvedValue({ ...baseConfigSnapshot });
    wizardMocks.createClackPrompter.mockReturnValue({
      intro: vi.fn().mockRejectedValue(new WizardCancelledError()),
      text: vi.fn(),
      confirm: vi.fn(),
      note: vi.fn(),
      outro: vi.fn(),
    });

    await agentsAddCommand({}, runtime);

    expect(runtime.exit).toHaveBeenCalledWith(1);
    expect(writeConfigFileMock).not.toHaveBeenCalled();
  });
});
