import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseConfigSnapshot, createTestRuntime } from "./test-runtime-config-helpers.js";

const readConfigFileSnapshotMock = vi.hoisted(() => vi.fn());
const writeConfigFileMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const wizardMocks = vi.hoisted(() => ({
  createClackPrompter: vi.fn(),
}));
const ensureWorkspaceAndSessionsMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("../config/config.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../config/config.js")>()),
  readConfigFileSnapshot: readConfigFileSnapshotMock,
  writeConfigFile: writeConfigFileMock,
}));

vi.mock("../wizard/clack-prompter.js", () => ({
  createClackPrompter: wizardMocks.createClackPrompter,
}));

vi.mock("./onboard-helpers.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./onboard-helpers.js")>()),
  ensureWorkspaceAndSessions: ensureWorkspaceAndSessionsMock,
}));

import { WizardCancelledError } from "../wizard/prompts.js";
import { agentsAddCommand } from "./agents.js";

const runtime = createTestRuntime();

describe("agents add command", () => {
  beforeEach(() => {
    readConfigFileSnapshotMock.mockClear();
    writeConfigFileMock.mockClear();
    wizardMocks.createClackPrompter.mockClear();
    ensureWorkspaceAndSessionsMock.mockClear();
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

  it("scaffolds delegate preset config and dual GWS bindings without prompting to copy auth", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-delegate-add-"));
    try {
      readConfigFileSnapshotMock.mockResolvedValue({
        ...baseConfigSnapshot,
        config: {
          plugins: {
            entries: {
              "gws-toolkit-phase1": {
                enabled: true,
                config: {
                  credentialRoutes: {
                    "ops-main": {
                      mode: "oauth",
                      allowedServices: ["gmail", "calendar"],
                      allowedTools: ["gws_gmail_read", "gws_calendar_read", "gws_gmail_write"],
                      allowedActions: ["draft_message"],
                    },
                  },
                  agentCredentialBindings: {},
                },
              },
            },
          },
        },
      });

      await agentsAddCommand(
        {
          name: "Ops Delegate",
          workspace: workspaceDir,
          preset: "delegate",
          delegateTier: "tier1",
          gwsRoute: "ops-main",
        },
        runtime,
        { hasFlags: true },
      );

      expect(wizardMocks.createClackPrompter).not.toHaveBeenCalled();
      expect(writeConfigFileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          agents: expect.objectContaining({
            list: expect.arrayContaining([
              expect.objectContaining({
                id: "ops-delegate",
                delegate: expect.objectContaining({
                  enabled: true,
                  tier: "tier1",
                  authIsolation: "strict",
                }),
                sandbox: expect.objectContaining({
                  mode: "all",
                  scope: "agent",
                }),
                identity: expect.objectContaining({
                  name: "Ops Delegate",
                  theme: "delegate",
                }),
              }),
            ]),
          }),
          plugins: expect.objectContaining({
            entries: expect.objectContaining({
              "gws-toolkit-phase1": expect.objectContaining({
                config: expect.objectContaining({
                  agentCredentialBindings: expect.objectContaining({
                    "agent:ops-delegate": "ops-main",
                    "subagent:ops-delegate": "ops-main",
                  }),
                }),
              }),
            }),
          }),
        }),
      );
      expect(ensureWorkspaceAndSessionsMock).toHaveBeenCalledOnce();
      await expect(fs.readFile(path.join(workspaceDir, "AGENTS.md"), "utf8")).resolves.toContain(
        "Delegate Workspace",
      );
      await expect(
        fs.readFile(path.join(workspaceDir, "IDENTITY.md"), "utf8"),
      ).resolves.toContain("Ops Delegate");
    } finally {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  });
});
