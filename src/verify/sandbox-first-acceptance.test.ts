import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeReadonlyDiagnostics,
  buildScenarioSummaryEntry,
  runSandboxFirstAcceptance,
  selectIntegrationPath,
} from "./sandbox-first-acceptance.mjs";

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sbx-402-verify-"));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sandbox-first acceptance helpers", () => {
  it("prefers the GWS integration path when gws-toolkit-phase1 is loaded", () => {
    const selection = selectIntegrationPath({
      pluginsPayload: {
        plugins: [
          { id: "gws-toolkit-phase1", status: "loaded" },
          { id: "memory-mongodb", status: "loaded" },
        ],
      },
      memoryPluginSlot: "memory-mongodb",
    });

    expect(selection).toEqual(
      expect.objectContaining({
        kind: "gws",
      }),
    );
  });

  it("selects memory-mongodb when GWS is not loaded but the memory slot is active", () => {
    const selection = selectIntegrationPath({
      pluginsPayload: {
        plugins: [{ id: "memory-mongodb", status: "loaded" }],
      },
      memoryPluginSlot: "memory-mongodb",
    });

    expect(selection).toEqual(
      expect.objectContaining({
        kind: "memory-mongodb",
      }),
    );
  });

  it("returns none when neither supported integration path is active", () => {
    const selection = selectIntegrationPath({
      pluginsPayload: {
        plugins: [{ id: "memory-core", status: "loaded" }],
      },
      memoryPluginSlot: "memory-core",
    });

    expect(selection).toEqual(
      expect.objectContaining({
        kind: "none",
      }),
    );
  });

  it("flags readonly false negatives when gateway unreachable reappears", () => {
    const issues = analyzeReadonlyDiagnostics({
      statusText: "Gateway probe:\ngateway unreachable\n",
      sandboxExplainText: "mode: all",
      skillsCheckText: "Skills Status Check",
    });

    expect(issues).toContain("readonly status regressed to a gateway unreachable false negative");
  });

  it("accepts the current readonly sandbox smoke markers", () => {
    const issues = analyzeReadonlyDiagnostics({
      statusText: "Gateway probe:\nprobe unsupported from readonly sandbox\n",
      sandboxExplainText: "Effective sandbox:\nmode: all\n",
      skillsCheckText: "Skills Status Check\n",
    });

    expect(issues).toEqual([]);
  });

  it("builds stable summary entries", () => {
    expect(
      buildScenarioSummaryEntry({
        scenarioId: "sbx-401-02-runtime-profile-sanity",
        manualChecklistId: "SBX-401-02",
        status: "passed",
        required: true,
        artifacts: ["sandbox-first-acceptance/foo/status.json"],
        automatedScope: "full",
      }),
    ).toEqual({
      scenarioId: "sbx-401-02-runtime-profile-sanity",
      manualChecklistId: "SBX-401-02",
      status: "passed",
      required: true,
      failureClass: null,
      reason: null,
      artifacts: ["sandbox-first-acceptance/foo/status.json"],
      automatedScope: "full",
    });
  });
});

describe("runSandboxFirstAcceptance", () => {
  it("covers the GWS integration path and uses the shared artifact root", async () => {
    await withTempDir(async (artifactRoot) => {
      const sshCommands: string[] = [];
      const dockerExecBash = vi.fn((command: string) => {
        if (command === "cd /app && node dist/index.js status --json") {
          return JSON.stringify(
            {
              capabilities: {
                counts: {
                  byClass: {
                    "sandbox-local": 1,
                    "gateway-brokered": 1,
                    "configured-but-blocked": 0,
                    "unsupported-in-current-runtime": 0,
                  },
                },
              },
              memoryPlugin: {
                enabled: true,
                slot: "memory-core",
              },
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js sandbox explain --json") {
          return JSON.stringify(
            {
              sandbox: {
                mode: "all",
                profile: "ops-readonly",
              },
              capabilities: {
                counts: {
                  byClass: {
                    "sandbox-local": 1,
                    "gateway-brokered": 1,
                    "configured-but-blocked": 0,
                    "unsupported-in-current-runtime": 0,
                  },
                },
              },
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js doctor --non-interactive") {
          return "doctor ok\n";
        }
        if (
          command ===
          "cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs status"
        ) {
          return "Gateway probe:\nprobe unsupported from readonly sandbox\n";
        }
        if (
          command ===
          "cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs sandbox explain"
        ) {
          return "Effective sandbox:\nmode: all\n";
        }
        if (
          command ===
          "cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs skills check"
        ) {
          return "Skills Status Check\n";
        }
        if (command === "cd /app && node dist/index.js skills check --json") {
          return JSON.stringify(
            {
              summary: {
                total: 1,
                eligible: 1,
                disabled: 0,
                blocked: 0,
                missingRequirements: 0,
              },
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js skills info openclaw-readonly --json") {
          return JSON.stringify(
            {
              name: "openclaw-readonly",
              eligible: true,
              description:
                "Sandbox-safe OpenClaw diagnostics through a tightly scoped read-only launcher.",
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js plugins list --json") {
          return JSON.stringify(
            {
              plugins: [{ id: "gws-toolkit-phase1", status: "loaded" }],
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node scripts/gws/inspect-active-route.mjs") {
          return JSON.stringify(
            {
              mode: "credentials_file",
              credentialsFile: "/home/node/.openclaw/google-workspace/credentials.json",
              impersonationConfigured: false,
              impersonationMissing: false,
              impersonatedUser: "",
            },
            null,
            2,
          );
        }
        if (command.includes("gws auth status")) {
          return JSON.stringify(
            {
              plain_credentials_exists: true,
              token_valid: true,
              type: "service_account",
              has_refresh_token: false,
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node scripts/gws/select-delegate-subject.mjs") {
          return JSON.stringify(
            {
              delegateSubjects: ["subagent:ops"],
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node scripts/gws/run-auth-health.mjs --subject agent:main") {
          return JSON.stringify(
            {
              ok: true,
              data: {
                route: {
                  bindingSubject: "agent:main",
                },
                authHealth: {
                  tokenValid: true,
                  credentialSourceType: "service_account_json",
                  serviceAccountPolicyEnforced: true,
                  serviceAccountPolicyCompliant: true,
                },
              },
            },
            null,
            2,
          );
        }
        if (
          command === "cd /app && node scripts/gws/run-auth-health.mjs --subject 'subagent:ops'"
        ) {
          return JSON.stringify(
            {
              ok: true,
              data: {
                route: {
                  bindingSubject: "subagent:ops",
                },
                authHealth: {
                  tokenValid: true,
                  credentialSourceType: "service_account_json",
                  serviceAccountPolicyEnforced: true,
                  serviceAccountPolicyCompliant: true,
                },
              },
            },
            null,
            2,
          );
        }
        if (command.includes("node dist/index.js cron add")) {
          return JSON.stringify({ id: "job-2" }, null, 2);
        }
        if (command === "cd /app && node dist/index.js cron run 'job-2'") {
          return JSON.stringify({ ok: true, ran: true }, null, 2);
        }
        if (command === "cd /app && node dist/index.js cron runs --id 'job-2' --limit 20") {
          return JSON.stringify(
            {
              entries: [
                {
                  action: "finished",
                  status: "ok",
                  deliveryStatus: "not-requested",
                },
              ],
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js cron rm 'job-2' --json") {
          return JSON.stringify({ ok: true, removed: false }, null, 2);
        }
        throw new Error(`Unhandled docker command: ${command}`);
      });

      const runSsh = vi.fn((command: string) => {
        sshCommands.push(command);
        if (command.includes('stat -c "present(size=%s)"')) {
          return "present(size=1234)\n";
        }
        throw new Error(`Unhandled ssh command: ${command}`);
      });

      const result = await runSandboxFirstAcceptance({
        artifactRoot,
        env: {
          VERIFY_ENV: "staging",
          GCE_INSTANCE_NAME: "daisy-staging-1",
          GCP_PROJECT_ID: "proj",
          GCP_ZONE: "us-west1-b",
          VERIFY_GCE_CONTAINER: "openclaw-gateway",
        },
        commandContext: {
          container: "openclaw-gateway",
          runSsh,
          dockerExecBash,
          dockerExecSh: vi.fn(() => ""),
        },
        log: vi.fn(),
        now: () => new Date("2026-04-25T20:10:00.000Z"),
      });

      expect(result.hasRequiredFailure).toBe(false);
      expect(result.results.map((entry) => entry.status)).toEqual([
        "passed",
        "passed",
        "passed",
        "passed",
        "passed",
      ]);
      const hostPathProbeCommand = sshCommands.find((command) =>
        command.includes('stat -c "present(size=%s)"'),
      );
      expect(hostPathProbeCommand).toContain("sudo -n sh -c 'if [ -f ");
      expect(hostPathProbeCommand).toContain("/opt/DAISy/config/google-workspace/credentials.json");
    });
  });

  it("writes per-scenario artifacts, a summary file, and cron cleanup output", async () => {
    await withTempDir(async (artifactRoot) => {
      const commands: string[] = [];
      const dockerExecBash = vi.fn((command: string) => {
        commands.push(command);
        if (command === "cd /app && node dist/index.js status --json") {
          return JSON.stringify(
            {
              capabilities: {
                counts: {
                  byClass: {
                    "sandbox-local": 1,
                    "gateway-brokered": 1,
                    "configured-but-blocked": 0,
                    "unsupported-in-current-runtime": 0,
                  },
                },
              },
              memoryPlugin: {
                enabled: true,
                slot: "memory-mongodb",
              },
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js sandbox explain --json") {
          return JSON.stringify(
            {
              sandbox: {
                mode: "all",
                profile: "ops-readonly",
              },
              capabilities: {
                counts: {
                  byClass: {
                    "sandbox-local": 1,
                    "gateway-brokered": 1,
                    "configured-but-blocked": 0,
                    "unsupported-in-current-runtime": 0,
                  },
                },
              },
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js doctor --non-interactive") {
          return "doctor ok\n";
        }
        if (
          command ===
          "cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs status"
        ) {
          return "Gateway probe:\nprobe unsupported from readonly sandbox\n";
        }
        if (
          command ===
          "cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs sandbox explain"
        ) {
          return "Effective sandbox:\nmode: all\n";
        }
        if (
          command ===
          "cd /app && node skills/openclaw-readonly/scripts/openclaw-readonly.mjs skills check"
        ) {
          return "Skills Status Check\n";
        }
        if (command === "cd /app && node dist/index.js skills check --json") {
          return JSON.stringify(
            {
              summary: {
                total: 1,
                eligible: 1,
                disabled: 0,
                blocked: 0,
                missingRequirements: 0,
              },
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js skills info openclaw-readonly --json") {
          return JSON.stringify(
            {
              name: "openclaw-readonly",
              eligible: true,
              description:
                "Sandbox-safe OpenClaw diagnostics through a tightly scoped read-only launcher.",
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js plugins list --json") {
          return JSON.stringify(
            {
              plugins: [{ id: "memory-mongodb", status: "loaded" }],
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js memory status --deep --agent main --json") {
          return JSON.stringify(
            [
              {
                agentId: "main",
                status: {
                  provider: "mongodb-mcp",
                },
                embeddingProbe: {
                  ok: true,
                },
              },
            ],
            null,
            2,
          );
        }
        if (command.includes("node dist/index.js cron add")) {
          return JSON.stringify({ id: "job-1" }, null, 2);
        }
        if (command === "cd /app && node dist/index.js cron run 'job-1'") {
          return JSON.stringify({ ok: true, ran: true }, null, 2);
        }
        if (command === "cd /app && node dist/index.js cron runs --id 'job-1' --limit 20") {
          return JSON.stringify(
            {
              entries: [
                {
                  action: "finished",
                  status: "ok",
                  deliveryStatus: "not-requested",
                },
              ],
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js cron rm 'job-1' --json") {
          return JSON.stringify({ ok: true, removed: false }, null, 2);
        }
        throw new Error(`Unhandled docker command: ${command}`);
      });

      const result = await runSandboxFirstAcceptance({
        artifactRoot,
        env: {
          VERIFY_ENV: "staging",
          GCE_INSTANCE_NAME: "daisy-staging-1",
          GCP_PROJECT_ID: "proj",
          GCP_ZONE: "us-west1-b",
          VERIFY_GCE_CONTAINER: "openclaw-gateway",
        },
        commandContext: {
          container: "openclaw-gateway",
          runSsh: vi.fn(() => ""),
          dockerExecBash,
          dockerExecSh: vi.fn(() => ""),
        },
        log: vi.fn(),
        now: () => new Date("2026-04-25T20:00:00.000Z"),
      });

      expect(result.hasRequiredFailure).toBe(false);
      expect(result.results.map((entry) => entry.status)).toEqual([
        "passed",
        "passed",
        "passed",
        "passed",
        "passed",
      ]);

      const summaryPath = path.join(
        artifactRoot,
        "sandbox-first-acceptance",
        "sandbox-first-acceptance-summary.json",
      );
      const summary = JSON.parse(await fs.readFile(summaryPath, "utf8")) as Array<{
        scenarioId: string;
        status: string;
      }>;
      expect(summary).toHaveLength(5);
      expect(summary.every((entry) => entry.status === "passed")).toBe(true);

      const cleanupPath = path.join(
        artifactRoot,
        "sandbox-first-acceptance",
        "sbx-401-08-isolated-cron",
        "cron-cleanup.json",
      );
      expect(await fs.readFile(cleanupPath, "utf8")).toContain('"removed": false');
      expect(commands.some((command) => command.includes("cron rm 'job-1' --json"))).toBe(true);
    });
  });
});
