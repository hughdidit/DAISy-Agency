import { describe, expect, it, vi } from "vitest";

describe("sandbox docker config", () => {
  it("accepts binds array in sandbox.docker config", async () => {
    vi.resetModules();
    const { validateConfigObject } = await import("./config.js");
    const res = validateConfigObject({
      agents: {
        defaults: {
          sandbox: {
            docker: {
              binds: ["/var/run/docker.sock:/var/run/docker.sock", "/home/user/source:/source:rw"],
            },
          },
        },
        list: [
          {
            id: "main",
            sandbox: {
              docker: {
                image: "custom-sandbox:latest",
                binds: ["/home/user/projects:/projects:ro"],
              },
            },
          },
        ],
      },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.config.agents?.defaults?.sandbox?.docker?.binds).toEqual([
        "/var/run/docker.sock:/var/run/docker.sock",
        "/home/user/source:/source:rw",
      ]);
      expect(res.config.agents?.list?.[0]?.sandbox?.docker?.binds).toEqual([
        "/home/user/projects:/projects:ro",
      ]);
    }
  });

<<<<<<< HEAD
  it("rejects non-string values in binds array", async () => {
    vi.resetModules();
    const { validateConfigObject } = await import("./config.js");
=======
  it("rejects network host mode via Zod schema validation", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          sandbox: {
            docker: {
              network: "host",
            },
          },
        },
      },
    });
    expect(res.ok).toBe(false);
  });

  it("rejects container namespace join by default", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          sandbox: {
            docker: {
              network: "container:peer",
            },
          },
        },
      },
    });
    expect(res.ok).toBe(false);
  });

  it("allows container namespace join with explicit dangerous override", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          sandbox: {
            docker: {
              network: "container:peer",
              dangerouslyAllowContainerNamespaceJoin: true,
            },
          },
        },
      },
    });
    expect(res.ok).toBe(true);
  });

  it("uses agent override precedence for dangerouslyAllowContainerNamespaceJoin", () => {
    const inherited = resolveSandboxDockerConfig({
      scope: "agent",
      globalDocker: { dangerouslyAllowContainerNamespaceJoin: true },
      agentDocker: {},
    });
    expect(inherited.dangerouslyAllowContainerNamespaceJoin).toBe(true);

    const overridden = resolveSandboxDockerConfig({
      scope: "agent",
      globalDocker: { dangerouslyAllowContainerNamespaceJoin: true },
      agentDocker: { dangerouslyAllowContainerNamespaceJoin: false },
    });
    expect(overridden.dangerouslyAllowContainerNamespaceJoin).toBe(false);
  });

  it("uses agent override precedence for bind-mount dangerous overrides", () => {
    const inherited = resolveSandboxDockerConfig({
      scope: "agent",
      globalDocker: {
        dangerouslyAllowReservedContainerTargets: true,
        dangerouslyAllowExternalBindSources: true,
      },
      agentDocker: {},
    });
    expect(inherited.dangerouslyAllowReservedContainerTargets).toBe(true);
    expect(inherited.dangerouslyAllowExternalBindSources).toBe(true);

    const overridden = resolveSandboxDockerConfig({
      scope: "agent",
      globalDocker: {
        dangerouslyAllowReservedContainerTargets: true,
        dangerouslyAllowExternalBindSources: true,
      },
      agentDocker: {
        dangerouslyAllowReservedContainerTargets: false,
        dangerouslyAllowExternalBindSources: false,
      },
    });
    expect(overridden.dangerouslyAllowReservedContainerTargets).toBe(false);
    expect(overridden.dangerouslyAllowExternalBindSources).toBe(false);

    const sharedScope = resolveSandboxDockerConfig({
      scope: "shared",
      globalDocker: {
        dangerouslyAllowReservedContainerTargets: true,
        dangerouslyAllowExternalBindSources: true,
      },
      agentDocker: {
        dangerouslyAllowReservedContainerTargets: false,
        dangerouslyAllowExternalBindSources: false,
      },
    });
    expect(sharedScope.dangerouslyAllowReservedContainerTargets).toBe(true);
    expect(sharedScope.dangerouslyAllowExternalBindSources).toBe(true);
  });

  it("rejects seccomp unconfined via Zod schema validation", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          sandbox: {
            docker: {
              seccompProfile: "unconfined",
            },
          },
        },
      },
    });
    expect(res.ok).toBe(false);
  });

  it("rejects apparmor unconfined via Zod schema validation", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          sandbox: {
            docker: {
              apparmorProfile: "unconfined",
            },
          },
        },
      },
    });
    expect(res.ok).toBe(false);
  });

  it("rejects non-string values in binds array", () => {
>>>>>>> e28803503 (fix: add sandbox bind-override regression coverage (#25410) (thanks @skyer-jian))
    const res = validateConfigObject({
      agents: {
        defaults: {
          sandbox: {
            docker: {
              binds: [123, "/valid/path:/path"],
            },
          },
        },
      },
    });
    expect(res.ok).toBe(false);
  });
});
