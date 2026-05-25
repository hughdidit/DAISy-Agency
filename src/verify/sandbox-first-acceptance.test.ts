import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { selectGwsBindingSubjects } from "../../scripts/gws/subject-selection.mjs";
import {
  analyzeReadonlyDiagnostics,
  buildScenarioSummaryEntry,
  isValidAgentCronRunSessionKey,
  runSandboxFirstAcceptance,
  SANDBOX_FIRST_ACCEPTANCE_SCENARIOS,
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

function parseSessionDeleteParams(command: string) {
  const match = command.match(/--params '(.+)'$/);
  if (!match?.[1]) {
    throw new Error(`sessions.delete command did not include quoted params: ${command}`);
  }
  return JSON.parse(match[1].replace(/'\\''/g, "'")) as {
    key: string;
    deleteTranscript: boolean;
    emitLifecycleHooks: boolean;
  };
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
      statusText:
        "Gateway probe:\nSandbox gateway reachability failure during sandbox gateway probe: A host-loopback gateway probe is unsupported from readonly sandbox context.\n",
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

  it("keeps SBX-404 scenario metadata additive in the summary contract", () => {
    const sbx404 = SANDBOX_FIRST_ACCEPTANCE_SCENARIOS.filter((entry: { scenarioId: string }) =>
      entry.scenarioId.startsWith("sbx-404-"),
    );
    expect(sbx404.map((entry: { scenarioId: string }) => entry.scenarioId)).toEqual([
      "sbx-404-01-direct-session-runtime",
      "sbx-404-02-group-session-runtime",
      "sbx-404-03-subagent-sandbox-inheritance",
      "sbx-404-04-cron-isolation-and-subagent-model",
      "sbx-404-05-host-only-blocks",
    ]);

    expect(
      buildScenarioSummaryEntry({
        ...sbx404[4],
        status: "passed",
        artifacts: ["sandbox-first-acceptance/sbx-404-05-host-only-blocks/result.json"],
      }),
    ).toEqual(
      expect.objectContaining({
        scenarioId: "sbx-404-05-host-only-blocks",
        manualChecklistId: "SBX-404-05",
        operationalContext: "host-only-exception",
        expectedOutcome: "blocked",
        manualRemainder: "None for ACP policy block baseline.",
      }),
    );
  });

  it("validates configured-agent cron run session keys against canonical agent id shape", () => {
    expect(isValidAgentCronRunSessionKey("agent:main:cron:job-1:run:run-1")).toBe(true);
    expect(isValidAgentCronRunSessionKey("agent:daisy_1:cron:job-1:run:run-1")).toBe(true);
    expect(isValidAgentCronRunSessionKey("agent:daisy-1:cron:job-1:run:run-1")).toBe(true);

    expect(isValidAgentCronRunSessionKey("agent:Daisy:cron:job-1:run:run-1")).toBe(false);
    expect(isValidAgentCronRunSessionKey("agent:daisy.ops:cron:job-1:run:run-1")).toBe(false);
    expect(isValidAgentCronRunSessionKey("subagent:daisy:cron:job-1:run:run-1")).toBe(false);
    expect(isValidAgentCronRunSessionKey("agent:daisy:cron:job-1")).toBe(false);
  });

  it("selects a configured GWS agent subject as the baseline", () => {
    expect(
      selectGwsBindingSubjects({
        "subagent:daisy": "workspace-service-account",
        "agent:daisy": "workspace-service-account",
        "agent:main!": "invalid",
      }),
    ).toEqual({
      agentSubjects: ["agent:daisy"],
      subagentSubjects: ["subagent:daisy"],
      baselineSubject: "agent:daisy",
      delegateSubjects: ["subagent:daisy"],
    });
  });

  it("falls back to a configured GWS subagent subject when no agent binding exists", () => {
    expect(
      selectGwsBindingSubjects({
        "subagent:daisy": "workspace-service-account",
      }),
    ).toEqual({
      agentSubjects: [],
      subagentSubjects: ["subagent:daisy"],
      baselineSubject: "subagent:daisy",
      delegateSubjects: [],
    });
  });

  it("reports no configured GWS subject when no valid bindings exist", () => {
    expect(
      selectGwsBindingSubjects({
        main: "workspace-service-account",
        "agent:main!": "workspace-service-account",
      }),
    ).toEqual({
      agentSubjects: [],
      subagentSubjects: [],
      baselineSubject: null,
      delegateSubjects: [],
    });
  });
});

describe("runSandboxFirstAcceptance", () => {
  it("covers the GWS integration path and uses the shared artifact root", async () => {
    await withTempDir(async (artifactRoot) => {
      const sshCommands: string[] = [];
      const dockerExecBash = vi.fn((command: string) => {
        if (command.startsWith("cd /app && node dist/index.js sandbox explain --session ")) {
          const sessionKey = command.match(/--session '([^']+)'/)?.[1] ?? "agent:main:main";
          return JSON.stringify(
            {
              agentId: "main",
              sessionKey,
              sandbox: {
                mode: "all",
                profile: "ops-readonly",
                sessionIsSandboxed: true,
              },
              elevated: {
                channel: sessionKey.includes(":discord:") ? "discord" : "internal",
              },
            },
            null,
            2,
          );
        }
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
                docker: {
                  image: "ghcr.io/hughdidit/daisy-agency-sandbox:dev-22121f1",
                },
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
        if (
          command === "cd /app && node scripts/gws/inspect-active-route.mjs --subject 'agent:daisy'"
        ) {
          return JSON.stringify(
            {
              bindingSubject: "agent:daisy",
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
            },
            null,
            2,
          );
        }
        if (command.includes("process.stdout.write(classified)")) {
          return "service_account_json";
        }
        if (command === "cd /app && node scripts/gws/select-delegate-subject.mjs") {
          return JSON.stringify(
            {
              agentSubjects: ["agent:daisy"],
              subagentSubjects: ["subagent:daisy"],
              baselineSubject: "agent:daisy",
              delegateSubjects: ["subagent:daisy"],
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node scripts/gws/run-auth-health.mjs --subject 'agent:daisy'") {
          return JSON.stringify(
            {
              ok: true,
              data: {
                route: {
                  bindingSubject: "agent:daisy",
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
          command === "cd /app && node scripts/gws/run-auth-health.mjs --subject 'subagent:daisy'"
        ) {
          return JSON.stringify(
            {
              ok: true,
              data: {
                route: {
                  bindingSubject: "subagent:daisy",
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
                  sessionKey: "agent:daisy:cron:job-2:run:run-2",
                  provider: "anthropic",
                  model: "claude-sonnet-4-5",
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
        if (command.includes("node dist/index.js gateway call sessions.delete")) {
          return JSON.stringify({ ok: true, deleted: true, archived: [] }, null, 2);
        }
        if (command.includes("spawnAcpDirect")) {
          return JSON.stringify(
            {
              status: "forbidden",
              error:
                'Sandbox blocked break-glass host-only operation during ACP session spawn (runtime="acp"): runtime="acp" uses break-glass host authority and cannot be spawned from a sandboxed session.',
            },
            null,
            2,
          );
        }
        throw new Error(`Unhandled docker command: ${command}`);
      });

      const runSsh = vi.fn((command: string) => {
        sshCommands.push(command);
        if (command.includes("openclaw-readonly status")) {
          return "Gateway probe:\nSandbox gateway reachability failure during sandbox gateway probe: A host-loopback gateway probe is unsupported from readonly sandbox context.\n";
        }
        if (command.includes("openclaw-readonly sandbox explain")) {
          return "Effective sandbox:\nmode: all\n";
        }
        if (command.includes("openclaw-readonly skills check")) {
          return "Skills Status Check\n";
        }
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
      expect(result.results.map((entry: { status: string }) => entry.status)).toEqual([
        "passed",
        "passed",
        "passed",
        "passed",
        "passed",
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
      const sessionDeleteParams: Array<{
        key: string;
        deleteTranscript: boolean;
        emitLifecycleHooks: boolean;
      }> = [];
      const dockerExecBash = vi.fn((command: string) => {
        commands.push(command);
        if (command.startsWith("cd /app && node dist/index.js sandbox explain --session ")) {
          const sessionKey = command.match(/--session '([^']+)'/)?.[1] ?? "agent:main:main";
          return JSON.stringify(
            {
              agentId: "main",
              sessionKey,
              sandbox: {
                mode: "all",
                profile: "ops-readonly",
                sessionIsSandboxed: true,
              },
              elevated: {
                channel: sessionKey.includes(":discord:") ? "discord" : "internal",
              },
            },
            null,
            2,
          );
        }
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
                docker: {
                  image: "ghcr.io/hughdidit/daisy-agency-sandbox:dev-22121f1",
                },
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
          if (command.includes("SBX-404 cron isolation")) {
            return JSON.stringify({ id: "job-2" }, null, 2);
          }
          return JSON.stringify({ id: "job-1" }, null, 2);
        }
        if (command === "cd /app && node dist/index.js cron run 'job-1'") {
          return JSON.stringify({ ok: true, ran: true }, null, 2);
        }
        if (command === "cd /app && node dist/index.js cron run 'job-2'") {
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
                  sessionKey: "agent:main:cron:job-1:run:run-1",
                  provider: "anthropic",
                  model: "claude-sonnet-4-5",
                },
              ],
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js cron runs --id 'job-2' --limit 20") {
          return JSON.stringify(
            {
              entries: [
                {
                  action: "finished",
                  status: "ok",
                  deliveryStatus: "not-requested",
                  sessionKey: "agent:daisy:cron:job-2:run:run-2",
                  provider: "anthropic",
                  model: "claude-sonnet-4-5",
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
        if (command === "cd /app && node dist/index.js cron rm 'job-2' --json") {
          return JSON.stringify({ ok: true, removed: false }, null, 2);
        }
        if (command.includes("node dist/index.js gateway call sessions.delete")) {
          sessionDeleteParams.push(parseSessionDeleteParams(command));
          return JSON.stringify({ ok: true, deleted: true, archived: [] }, null, 2);
        }
        if (command.includes("spawnAcpDirect")) {
          return JSON.stringify(
            {
              status: "forbidden",
              error:
                'Sandbox blocked break-glass host-only operation during ACP session spawn (runtime="acp"): runtime="acp" uses break-glass host authority and cannot be spawned from a sandboxed session.',
            },
            null,
            2,
          );
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
          runSsh: vi.fn((command: string) => {
            if (command.includes("openclaw-readonly status")) {
              return "Gateway probe:\nSandbox gateway reachability failure during sandbox gateway probe: A host-loopback gateway probe is unsupported from readonly sandbox context.\n";
            }
            if (command.includes("openclaw-readonly sandbox explain")) {
              return "Effective sandbox:\nmode: all\n";
            }
            if (command.includes("openclaw-readonly skills check")) {
              return "Skills Status Check\n";
            }
            return "";
          }),
          dockerExecBash,
          dockerExecSh: vi.fn(() => ""),
        },
        log: vi.fn(),
        now: () => new Date("2026-04-25T20:00:00.000Z"),
      });

      expect(result.hasRequiredFailure).toBe(false);
      expect(result.results.map((entry: { status: string }) => entry.status)).toEqual([
        "passed",
        "passed",
        "passed",
        "passed",
        "passed",
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
        expectedOutcome?: string;
      }>;
      expect(summary).toHaveLength(10);
      expect(summary.every((entry) => entry.status === "passed")).toBe(true);
      expect(summary.find((entry) => entry.scenarioId === "sbx-404-05-host-only-blocks")).toEqual(
        expect.objectContaining({ expectedOutcome: "blocked" }),
      );

      const cleanupPath = path.join(
        artifactRoot,
        "sandbox-first-acceptance",
        "sbx-401-08-isolated-cron",
        "cron-cleanup.json",
      );
      const cleanup = JSON.parse(await fs.readFile(cleanupPath, "utf8")) as {
        jobId: string;
        runSessionKey: string;
        baseSessionKey: string;
        outputs: Array<{ action: string; key: string }>;
        errors: unknown[];
      };
      expect(cleanup).toEqual(
        expect.objectContaining({
          jobId: "job-1",
          runSessionKey: "agent:main:cron:job-1:run:run-1",
          baseSessionKey: "agent:main:cron:job-1",
          errors: [],
        }),
      );
      expect(cleanup.outputs.map((entry) => entry.action)).toEqual([
        "cron.rm",
        "sessions.delete.run",
        "sessions.delete.base",
      ]);
      expect(sessionDeleteParams).toEqual([
        {
          key: "agent:main:cron:job-1:run:run-1",
          deleteTranscript: true,
          emitLifecycleHooks: false,
        },
        {
          key: "agent:main:cron:job-1",
          deleteTranscript: true,
          emitLifecycleHooks: false,
        },
        {
          key: "agent:daisy:cron:job-2:run:run-2",
          deleteTranscript: true,
          emitLifecycleHooks: false,
        },
        {
          key: "agent:daisy:cron:job-2",
          deleteTranscript: true,
          emitLifecycleHooks: false,
        },
      ]);
      expect(commands.some((command) => command.includes("cron rm 'job-1' --json"))).toBe(true);
      expect(
        commands.some((command) => command.includes('"key":"agent:main:cron:job-1:run:run-1"')),
      ).toBe(true);
      expect(commands.some((command) => command.includes('"key":"agent:main:cron:job-1"'))).toBe(
        true,
      );
    });
  });

  it("fails the isolated cron scenario when verified cleanup fails", async () => {
    await withTempDir(async (artifactRoot) => {
      const dockerExecBash = vi.fn((command: string) => {
        if (command.includes("node dist/index.js cron add")) {
          return JSON.stringify({ id: "job-cleanup-failure" }, null, 2);
        }
        if (command === "cd /app && node dist/index.js cron run 'job-cleanup-failure'") {
          return JSON.stringify({ ok: true, ran: true }, null, 2);
        }
        if (
          command ===
          "cd /app && node dist/index.js cron runs --id 'job-cleanup-failure' --limit 20"
        ) {
          return JSON.stringify(
            {
              entries: [
                {
                  action: "finished",
                  status: "ok",
                  deliveryStatus: "not-requested",
                  sessionKey: "agent:main:cron:job-cleanup-failure:run:run-cleanup-failure",
                },
              ],
            },
            null,
            2,
          );
        }
        if (command === "cd /app && node dist/index.js cron rm 'job-cleanup-failure' --json") {
          return JSON.stringify({ ok: true, removed: true }, null, 2);
        }
        if (command.includes("node dist/index.js gateway call sessions.delete")) {
          const params = parseSessionDeleteParams(command);
          if (params.key === "agent:main:cron:job-cleanup-failure") {
            const error = new Error("base delete failed") as Error & {
              stdout?: string;
              stderr?: string;
            };
            error.stdout = '{"ok":false}';
            error.stderr = "delete failed";
            throw error;
          }
          return JSON.stringify({ ok: true, deleted: true, archived: [] }, null, 2);
        }
        throw new Error(`Unhandled docker command: ${command}`);
      });

      const ctx = {
        now: () => new Date("2026-04-25T20:00:00.000Z"),
        dockerExecBash,
        writeArtifactText: async (name: string, content: string) => {
          await fs.writeFile(path.join(artifactRoot, name), content, "utf8");
        },
        writeArtifactJson: async (name: string, payload: unknown) => {
          await fs.writeFile(
            path.join(artifactRoot, name),
            `${JSON.stringify(payload, null, 2)}\n`,
            "utf8",
          );
        },
      };
      const acceptanceModule = (await import("./sandbox-first-acceptance.mjs")) as unknown as {
        runIsolatedCronScenario: (scenarioContext: typeof ctx) => Promise<void>;
      };

      await expect(acceptanceModule.runIsolatedCronScenario(ctx)).rejects.toMatchObject({
        failureClass: "scheduler-gap",
        message: "isolated cron acceptance cleanup failed; see cron-cleanup-error.txt",
      });

      const cleanupError = await fs.readFile(
        path.join(artifactRoot, "cron-cleanup-error.txt"),
        "utf8",
      );
      expect(cleanupError).toContain("sessions.delete.base");
      expect(cleanupError).toContain("base delete failed");
    });
  });
});
