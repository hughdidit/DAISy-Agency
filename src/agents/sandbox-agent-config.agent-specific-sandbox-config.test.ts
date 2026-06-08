import { EventEmitter } from "node:events";
import path from "node:path";
import { Readable } from "node:stream";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { DEFAULT_SANDBOX_RUNTIME_PROFILE_ID } from "../shared/sandbox-runtime-profiles.js";
import { createRestrictedAgentSandboxConfig } from "./test-helpers/sandbox-agent-config-fixtures.js";

type SpawnCall = {
  command: string;
  args: string[];
};

const spawnState = vi.hoisted(() => ({
  inspectMountsByTarget: {} as Record<string, string>,
}));

const fsPromisesMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

const spawnCalls: SpawnCall[] = [];

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: fsPromisesMocks.readFile,
  };
});

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawn: (command: string, args: string[]) => {
      spawnCalls.push({ command, args });
      const child = new EventEmitter() as {
        stdout?: Readable;
        stderr?: Readable;
        on: (event: string, cb: (...args: unknown[]) => void) => void;
        emit: (event: string, ...args: unknown[]) => boolean;
      };
      child.stdout = new Readable({ read() {} });
      child.stderr = new Readable({ read() {} });

      const dockerArgs = command === "docker" ? args : [];
      let code = 0;
      let stdout = "";
      if (command !== "docker") {
        code = 1;
      } else if (
        dockerArgs[0] === "inspect" &&
        dockerArgs[1] === "-f" &&
        dockerArgs[2] === "{{json .Mounts}}"
      ) {
        const target = dockerArgs[3] ?? "";
        if (target in spawnState.inspectMountsByTarget) {
          stdout = `${spawnState.inspectMountsByTarget[target]}\n`;
        } else {
          code = 1;
        }
      } else if (
        dockerArgs[0] === "inspect" &&
        dockerArgs[1] === "-f" &&
        dockerArgs[2] === "{{.State.Running}}"
      ) {
        code = 1;
      } else if (dockerArgs[0] === "image" && dockerArgs[1] === "inspect") {
        code = 0;
      }

      queueMicrotask(() => {
        if (stdout) {
          child.stdout?.emit("data", Buffer.from(stdout));
        }
        child.emit("close", code);
      });
      return child;
    },
  };
});

vi.mock("./skills.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./skills.js")>();
  return {
    ...actual,
    syncSkillsToWorkspace: vi.fn(async () => undefined),
  };
});

let resolveSandboxContext: typeof import("./sandbox/context.js").resolveSandboxContext;
let resolveSandboxConfigForAgent: typeof import("./sandbox/config.js").resolveSandboxConfigForAgent;
let resolveSandboxRuntimeStatus: typeof import("./sandbox/runtime-status.js").resolveSandboxRuntimeStatus;

async function resolveContext(config: OpenClawConfig, sessionKey: string, workspaceDir: string) {
  return resolveSandboxContext({
    config,
    sessionKey,
    workspaceDir,
  });
}

function expectDockerSetupCommand(command: string) {
  expect(
    spawnCalls.some(
      (call) =>
        call.command === "docker" &&
        call.args[0] === "exec" &&
        call.args.includes("-lc") &&
        call.args.includes(command),
    ),
  ).toBe(true);
}

function createDefaultsSandboxConfig(
  scope: "agent" | "shared" | "session" = "agent",
): OpenClawConfig {
  return {
    agents: {
      defaults: {
        sandbox: {
          mode: "all",
          scope,
        },
      },
    },
  };
}

function createWorkSetupCommandConfig(scope: "agent" | "shared"): OpenClawConfig {
  return {
    agents: {
      defaults: {
        sandbox: {
          mode: "all",
          scope,
          docker: {
            setupCommand: "echo global",
          },
        },
      },
      list: [
        {
          id: "work",
          workspace: "~/openclaw-work",
          sandbox: {
            mode: "all",
            scope,
            docker: {
              setupCommand: "echo work",
            },
          },
        },
      ],
    },
  };
}

describe("Agent-specific sandbox config", () => {
  beforeAll(async () => {
    const [configModule, contextModule, runtimeModule] = await Promise.all([
      import("./sandbox/config.js"),
      import("./sandbox/context.js"),
      import("./sandbox/runtime-status.js"),
    ]);
    ({ resolveSandboxConfigForAgent } = configModule);
    ({ resolveSandboxContext } = contextModule);
    ({ resolveSandboxRuntimeStatus } = runtimeModule);
  });

  beforeEach(() => {
    spawnCalls.length = 0;
    spawnState.inspectMountsByTarget = {};
    fsPromisesMocks.readFile.mockReset();
    fsPromisesMocks.readFile.mockImplementation(async () => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
  });

  it("should use agent-specific workspaceRoot", async () => {
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          sandbox: {
            mode: "all",
            scope: "agent",
            workspaceRoot: "~/.openclaw/sandboxes",
          },
        },
        list: [
          {
            id: "isolated",
            workspace: "~/openclaw-isolated",
            sandbox: {
              mode: "all",
              scope: "agent",
              workspaceRoot: "/tmp/isolated-sandboxes",
            },
          },
        ],
      },
    };

    const context = await resolveContext(cfg, "agent:isolated:main", "/tmp/test-isolated");

    expect(context).toBeDefined();
    expect(context?.workspaceDir).toContain(path.resolve("/tmp/isolated-sandboxes"));
  });

  it("should prefer agent config over global for multiple agents", () => {
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",
            scope: "session",
          },
        },
        list: [
          {
            id: "main",
            workspace: "~/openclaw",
            sandbox: {
              mode: "off",
            },
          },
          {
            id: "family",
            workspace: "~/openclaw-family",
            sandbox: {
              mode: "all",
              scope: "agent",
            },
          },
        ],
      },
    };

    const mainRuntime = resolveSandboxRuntimeStatus({
      cfg,
      sessionKey: "agent:main:telegram:group:789",
    });
    expect(mainRuntime.mode).toBe("off");
    expect(mainRuntime.sandboxed).toBe(false);

    const familyRuntime = resolveSandboxRuntimeStatus({
      cfg,
      sessionKey: "agent:family:whatsapp:group:123",
    });
    expect(familyRuntime.mode).toBe("all");
    expect(familyRuntime.sandboxed).toBe(true);
  });

  it("should prefer agent-specific sandbox tool policy", () => {
    const cfg = createRestrictedAgentSandboxConfig({
      agentTools: {
        sandbox: {
          tools: {
            allow: ["read", "write"],
            deny: ["edit"],
          },
        },
      },
      globalSandboxTools: {
        allow: ["read"],
        deny: ["exec"],
      },
    });

    const sandbox = resolveSandboxConfigForAgent(cfg, "restricted");
    expect(sandbox.tools).toEqual({
      allow: ["read", "write", "image"],
      deny: ["edit"],
    });
  });

  it("should use global sandbox config when no agent-specific config exists", () => {
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          sandbox: {
            mode: "all",
            scope: "agent",
          },
        },
        list: [
          {
            id: "main",
            workspace: "~/openclaw",
          },
        ],
      },
    };

    const sandbox = resolveSandboxConfigForAgent(cfg, "main");
    expect(sandbox.mode).toBe("all");
  });

  it("defaults sandbox profile to coding-base when no explicit profile is configured", () => {
    const sandbox = resolveSandboxConfigForAgent(createDefaultsSandboxConfig(), "main");
    expect(sandbox.profile).toBe(DEFAULT_SANDBOX_RUNTIME_PROFILE_ID);
  });

  it("inherits global sandbox profile and allows per-agent overrides outside shared scope", () => {
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          sandbox: {
            mode: "all",
            scope: "agent",
            profile: "coding-base",
          },
        },
        list: [
          {
            id: "ops",
            workspace: "~/openclaw-ops",
            sandbox: {
              profile: "ops-readonly",
            },
          },
        ],
      },
    };

    expect(resolveSandboxConfigForAgent(cfg, "main").profile).toBe("coding-base");
    expect(resolveSandboxConfigForAgent(cfg, "ops").profile).toBe("ops-readonly");
  });

  it("ignores per-agent sandbox profile overrides when scope resolves to shared", () => {
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          sandbox: {
            mode: "all",
            scope: "shared",
            profile: "coding-base",
          },
        },
        list: [
          {
            id: "browser",
            workspace: "~/openclaw-browser",
            sandbox: {
              profile: "browser-automation",
            },
          },
        ],
      },
    };

    expect(resolveSandboxConfigForAgent(cfg, "browser").profile).toBe("coding-base");
  });

  it("should resolve setupCommand overrides based on sandbox scope", async () => {
    for (const scenario of [
      {
        scope: "agent" as const,
        expectedSetup: "echo work",
        expectedContainerFragment: "agent-work",
      },
      {
        scope: "shared" as const,
        expectedSetup: "echo global",
        expectedContainerFragment: "shared",
      },
    ]) {
      const cfg = createWorkSetupCommandConfig(scenario.scope);
      const context = await resolveContext(cfg, "agent:work:main", "/tmp/test-work");

      expect(context).toBeDefined();
      expect(context?.docker.setupCommand).toBe(scenario.expectedSetup);
      expect(context?.containerName).toContain(scenario.expectedContainerFragment);
      expectDockerSetupCommand(scenario.expectedSetup);
      spawnCalls.length = 0;
    }
  });

  it("isolates shared-scope sandbox containers when a subject-scoped GWS bind is derived", async () => {
    const gatewayCid = "c54802201537ffdc3b8d8af32de3aacd3091de94d8f52ba343aa8f9ed3c6045c";
    fsPromisesMocks.readFile.mockImplementation(async (filePath: unknown) => {
      if (String(filePath) === "/proc/self/mountinfo") {
        return `1176 1165 8:1 /var/lib/docker/containers/${gatewayCid}/hostname /etc/hostname ro,relatime - ext4 /dev/sda1 rw`;
      }
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
    spawnState.inspectMountsByTarget[gatewayCid] = JSON.stringify([
      {
        Type: "bind",
        Source: "/opt/DAISy/config/secrets/gws",
        Destination: "/home/node/.openclaw/secrets/gws",
        Mode: "rw",
        RW: true,
      },
    ]);

    const cfg: OpenClawConfig = {
      plugins: {
        entries: {
          "gws-toolkit-phase1": {
            enabled: true,
            config: {
              approvedCredentialDirs: ["/home/node/.openclaw/secrets/gws"],
              allowUnboundAgents: false,
              credentialRoutes: {
                "ops-main": {
                  mode: "credentials_file",
                  credentialsFile: "/home/node/.openclaw/secrets/gws/credentials.json",
                },
              },
              agentCredentialBindings: {
                "agent:main": "ops-main",
              },
            },
          },
        },
      },
      agents: {
        defaults: {
          sandbox: {
            mode: "all",
            scope: "shared",
          },
        },
      },
    };

    const context = await resolveContext(cfg, "agent:main:discord:channel:123", "/tmp/test-main");

    expect(context).toBeDefined();
    expect(context?.containerName).toContain("agent-main");
    expect(context?.containerName).not.toContain("shared");
  });

  it("should allow agent-specific docker settings beyond setupCommand", () => {
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          sandbox: {
            mode: "all",
            scope: "agent",
            docker: {
              image: "global-image",
              network: "none",
            },
          },
        },
        list: [
          {
            id: "work",
            workspace: "~/openclaw-work",
            sandbox: {
              mode: "all",
              scope: "agent",
              docker: {
                image: "work-image",
                network: "bridge",
              },
            },
          },
        ],
      },
    };

    const sandbox = resolveSandboxConfigForAgent(cfg, "work");
    expect(sandbox.docker.image).toBe("work-image");
    expect(sandbox.docker.network).toBe("bridge");
  });

  it("should honor agent-specific sandbox mode overrides", () => {
    for (const scenario of [
      {
        cfg: {
          agents: {
            defaults: {
              sandbox: {
                mode: "all",
                scope: "agent",
              },
            },
            list: [
              {
                id: "main",
                workspace: "~/openclaw",
                sandbox: {
                  mode: "off",
                },
              },
            ],
          },
        } satisfies OpenClawConfig,
        sessionKey: "agent:main:main",
        assert: (runtime: ReturnType<typeof resolveSandboxRuntimeStatus>) => {
          expect(runtime.mode).toBe("off");
          expect(runtime.sandboxed).toBe(false);
        },
      },
      {
        cfg: {
          agents: {
            defaults: {
              sandbox: {
                mode: "off",
              },
            },
            list: [
              {
                id: "family",
                workspace: "~/openclaw-family",
                sandbox: {
                  mode: "all",
                  scope: "agent",
                },
              },
            ],
          },
        } satisfies OpenClawConfig,
        sessionKey: "agent:family:whatsapp:group:123",
        assert: (runtime: ReturnType<typeof resolveSandboxRuntimeStatus>) => {
          expect(runtime.mode).toBe("all");
          expect(runtime.sandboxed).toBe(true);
        },
      },
    ]) {
      const runtime = resolveSandboxRuntimeStatus({
        cfg: scenario.cfg,
        sessionKey: scenario.sessionKey,
      });
      scenario.assert(runtime);
    }
  });

  it("should use agent-specific scope", () => {
    const cfg: OpenClawConfig = {
      agents: {
        defaults: {
          sandbox: {
            mode: "all",
            scope: "session",
          },
        },
        list: [
          {
            id: "work",
            workspace: "~/openclaw-work",
            sandbox: {
              mode: "all",
              scope: "agent",
            },
          },
        ],
      },
    };

    const sandbox = resolveSandboxConfigForAgent(cfg, "work");
    expect(sandbox.scope).toBe("agent");
  });

  it("enforces required allowlist tools in default and explicit sandbox configs", async () => {
    for (const scenario of [
      {
        cfg: createDefaultsSandboxConfig(),
        expected: ["session_status", "image", "memory_ingest_document"],
        unexpected: ["memory_forget", "memory_hygiene", "memory_audit"],
      },
      {
        cfg: {
          tools: {
            sandbox: {
              tools: {
                allow: ["bash", "read"],
                deny: [],
              },
            },
          },
          agents: {
            defaults: {
              sandbox: {
                mode: "all",
                scope: "agent",
              },
            },
          },
        } satisfies OpenClawConfig,
        expected: ["image"],
        unexpected: [],
      },
    ]) {
      const sandbox = resolveSandboxConfigForAgent(scenario.cfg, "main");
      for (const tool of scenario.expected) {
        expect(sandbox.tools.allow).toContain(tool);
      }
      for (const tool of scenario.unexpected) {
        expect(sandbox.tools.allow).not.toContain(tool);
      }
    }
  });
});
