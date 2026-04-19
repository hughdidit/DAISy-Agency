import { beforeAll, describe, expect, it } from "vitest";
import {
  confirm,
  createDoctorRuntime,
  detectLegacyStateMigrations,
  mockDoctorConfigSnapshot,
  note,
  runLegacyStateMigrations,
  writeConfigFile,
} from "./doctor.e2e-harness.js";

let doctorCommand: typeof import("./doctor.js").doctorCommand;

describe("doctor --dry-run", () => {
  beforeAll(async () => {
    ({ doctorCommand } = await import("./doctor.js"));
  });

  it("rejects conflicting apply-only flags", async () => {
    mockDoctorConfigSnapshot();

    await expect(
      doctorCommand(createDoctorRuntime(), {
        dryRun: true,
        repair: true,
      }),
    ).rejects.toThrow(/--dry-run cannot be combined with --repair\/--fix/i);

    await expect(
      doctorCommand(createDoctorRuntime(), {
        dryRun: true,
        yes: true,
      }),
    ).rejects.toThrow(/--dry-run cannot be combined with --yes/i);

    await expect(
      doctorCommand(createDoctorRuntime(), {
        dryRun: true,
        force: true,
      }),
    ).rejects.toThrow(/--dry-run cannot be combined with --force/i);

    await expect(
      doctorCommand(createDoctorRuntime(), {
        dryRun: true,
        generateGatewayToken: true,
      }),
    ).rejects.toThrow(/--dry-run cannot be combined with --generate-gateway-token/i);
  });

  it("previews config changes without writing them", async () => {
    mockDoctorConfigSnapshot({
      parsed: {
        routing: {
          allowFrom: ["*"],
        },
      },
      config: {},
      legacyIssues: [{ path: "routing.allowFrom", message: "legacy key" }],
    });
    writeConfigFile.mockClear();
    note.mockClear();
    confirm.mockClear();

    await doctorCommand(createDoctorRuntime(), {
      dryRun: true,
      workspaceSuggestions: false,
    });

    expect(writeConfigFile).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(
      note.mock.calls.some(
        ([message, title]) =>
          title === "Doctor mode" && String(message).includes("Target mode: dry-run"),
      ),
    ).toBe(true);
    expect(
      note.mock.calls.some(
        ([message, title]) =>
          title === "Doctor dry-run" &&
          String(message).includes("Config changes were previewed only"),
      ),
    ).toBe(true);
  });

  it("does not run legacy state migrations in dry-run mode", async () => {
    mockDoctorConfigSnapshot();
    detectLegacyStateMigrations.mockResolvedValueOnce({
      targetAgentId: "main",
      targetMainKey: "main",
      targetScope: undefined,
      stateDir: "/tmp/state",
      oauthDir: "/tmp/oauth",
      sessions: {
        legacyDir: "/tmp/state/sessions",
        legacyStorePath: "/tmp/state/sessions/sessions.json",
        targetDir: "/tmp/state/agents/main/sessions",
        targetStorePath: "/tmp/state/agents/main/sessions/sessions.json",
        hasLegacy: true,
        legacyKeys: [],
      },
      agentDir: {
        legacyDir: "/tmp/state/agent",
        targetDir: "/tmp/state/agents/main/agent",
        hasLegacy: false,
      },
      whatsappAuth: {
        legacyDir: "/tmp/oauth",
        targetDir: "/tmp/oauth/whatsapp/default",
        hasLegacy: false,
      },
      pairingAllowFrom: {
        legacyTelegramPath: "/tmp/oauth/telegram-allowFrom.json",
        targetTelegramPath: "/tmp/oauth/telegram-default-allowFrom.json",
        hasLegacyTelegram: false,
      },
      preview: ["- Legacy sessions detected"],
    });
    runLegacyStateMigrations.mockClear();
    note.mockClear();

    await doctorCommand(createDoctorRuntime(), {
      dryRun: true,
      workspaceSuggestions: false,
    });

    expect(runLegacyStateMigrations).not.toHaveBeenCalled();
    expect(
      note.mock.calls.some(
        ([message, title]) =>
          title === "Doctor dry-run" &&
          String(message).includes("Would migrate legacy state on apply mode"),
      ),
    ).toBe(true);
  });
});
