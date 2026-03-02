import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureAuthProfileStore } from "../agents/auth-profiles.js";
=======
import { afterEach, describe, expect, it } from "vitest";
import { ensureAuthProfileStore, type AuthProfileStore } from "../agents/auth-profiles.js";
>>>>>>> 8a4d8c889 (fix(secrets): normalize inline SecretRef token/key to tokenRef/keyRef in runtime snapshot (#31047))
import { loadConfig, type OpenClawConfig } from "../config/config.js";
import {
  activateSecretsRuntimeSnapshot,
  clearSecretsRuntimeSnapshot,
  prepareSecretsRuntimeSnapshot,
} from "./runtime.js";

const runExecMock = vi.hoisted(() => vi.fn());

vi.mock("../process/exec.js", () => ({
  runExec: runExecMock,
}));

describe("secrets runtime snapshot", () => {
  afterEach(() => {
    runExecMock.mockReset();
    clearSecretsRuntimeSnapshot();
  });

  it("resolves env refs for config and auth profiles", async () => {
    const config: OpenClawConfig = {
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            apiKey: { source: "env", id: "OPENAI_API_KEY" },
            models: [],
          },
        },
      },
      skills: {
        entries: {
          "review-pr": {
            enabled: true,
            apiKey: { source: "env", id: "REVIEW_SKILL_API_KEY" },
          },
        },
      },
    };

    const snapshot = await prepareSecretsRuntimeSnapshot({
      config,
      env: {
        OPENAI_API_KEY: "sk-env-openai",
        GITHUB_TOKEN: "ghp-env-token",
        REVIEW_SKILL_API_KEY: "sk-skill-ref",
      },
      agentDirs: ["/tmp/openclaw-agent-main"],
      loadAuthStore: () => ({
        version: 1,
        profiles: {
          "openai:default": {
            type: "api_key",
            provider: "openai",
            key: "old-openai",
            keyRef: { source: "env", id: "OPENAI_API_KEY" },
          },
          "github-copilot:default": {
            type: "token",
            provider: "github-copilot",
            token: "old-gh",
            tokenRef: { source: "env", id: "GITHUB_TOKEN" },
          },
        },
      }),
    });

    expect(snapshot.config.models?.providers?.openai?.apiKey).toBe("sk-env-openai");
    expect(snapshot.config.skills?.entries?.["review-pr"]?.apiKey).toBe("sk-skill-ref");
    expect(snapshot.warnings).toHaveLength(2);
    expect(snapshot.authStores[0]?.store.profiles["openai:default"]).toMatchObject({
      type: "api_key",
      key: "sk-env-openai",
    });
    expect(snapshot.authStores[0]?.store.profiles["github-copilot:default"]).toMatchObject({
      type: "token",
      token: "ghp-env-token",
    });
<<<<<<< HEAD
=======
    expect(snapshot.authStores[0]?.store.profiles["openai:inline"]).toMatchObject({
      type: "api_key",
      key: "sk-env-openai",
    });
    // After normalization, inline SecretRef string should be promoted to keyRef
    expect(
      (snapshot.authStores[0].store.profiles["openai:inline"] as Record<string, unknown>).keyRef,
    ).toEqual({ source: "env", provider: "default", id: "OPENAI_API_KEY" });
  });

  it("normalizes inline SecretRef object on token to tokenRef", async () => {
    const config: OpenClawConfig = { models: {}, secrets: {} };
    const snapshot = await prepareSecretsRuntimeSnapshot({
      config,
      env: { MY_TOKEN: "resolved-token-value" },
      agentDirs: ["/tmp/openclaw-agent-main"],
      loadAuthStore: ((_agentDir?: string) =>
        ({
          version: 1,
          profiles: {
            "custom:inline-token": {
              type: "token",
              provider: "custom",
              token: { source: "env", provider: "default", id: "MY_TOKEN" },
            },
          },
        }) as unknown as AuthProfileStore) as (agentDir?: string) => AuthProfileStore,
    });

    const profile = snapshot.authStores[0]?.store.profiles["custom:inline-token"] as Record<
      string,
      unknown
    >;
    // tokenRef should be set from the inline SecretRef
    expect(profile.tokenRef).toEqual({ source: "env", provider: "default", id: "MY_TOKEN" });
    // token should be resolved to the actual value after activation
    activateSecretsRuntimeSnapshot(snapshot);
    expect(profile.token).toBe("resolved-token-value");
  });

  it("normalizes inline SecretRef object on key to keyRef", async () => {
    const config: OpenClawConfig = { models: {}, secrets: {} };
    const snapshot = await prepareSecretsRuntimeSnapshot({
      config,
      env: { MY_KEY: "resolved-key-value" },
      agentDirs: ["/tmp/openclaw-agent-main"],
      loadAuthStore: ((_agentDir?: string) =>
        ({
          version: 1,
          profiles: {
            "custom:inline-key": {
              type: "api_key",
              provider: "custom",
              key: { source: "env", provider: "default", id: "MY_KEY" },
            },
          },
        }) as unknown as AuthProfileStore) as (agentDir?: string) => AuthProfileStore,
    });

    const profile = snapshot.authStores[0]?.store.profiles["custom:inline-key"] as Record<
      string,
      unknown
    >;
    // keyRef should be set from the inline SecretRef
    expect(profile.keyRef).toEqual({ source: "env", provider: "default", id: "MY_KEY" });
    // key should be resolved to the actual value after activation
    activateSecretsRuntimeSnapshot(snapshot);
    expect(profile.key).toBe("resolved-key-value");
  });

  it("keeps explicit keyRef when inline key SecretRef is also present", async () => {
    const config: OpenClawConfig = { models: {}, secrets: {} };
    const snapshot = await prepareSecretsRuntimeSnapshot({
      config,
      env: {
        PRIMARY_KEY: "primary-key-value",
        SHADOW_KEY: "shadow-key-value",
      },
      agentDirs: ["/tmp/openclaw-agent-main"],
      loadAuthStore: () =>
        ({
          version: 1,
          profiles: {
            "custom:explicit-keyref": {
              type: "api_key",
              provider: "custom",
              keyRef: { source: "env", provider: "default", id: "PRIMARY_KEY" },
              key: { source: "env", provider: "default", id: "SHADOW_KEY" },
            },
          },
        }) as AuthProfileStore,
    });

    const profile = snapshot.authStores[0]?.store.profiles["custom:explicit-keyref"] as Record<
      string,
      unknown
    >;
    expect(profile.keyRef).toEqual({ source: "env", provider: "default", id: "PRIMARY_KEY" });
    activateSecretsRuntimeSnapshot(snapshot);
    expect(profile.key).toBe("primary-key-value");
>>>>>>> 8a4d8c889 (fix(secrets): normalize inline SecretRef token/key to tokenRef/keyRef in runtime snapshot (#31047))
  });

<<<<<<< HEAD
  it("resolves file refs via sops json payload", async () => {
    runExecMock.mockResolvedValueOnce({
      stdout: JSON.stringify({
        providers: {
          openai: {
            apiKey: "sk-from-sops",
          },
        },
      }),
      stderr: "",
    });

    const config: OpenClawConfig = {
      secrets: {
        sources: {
          file: {
            type: "sops",
            path: "~/.openclaw/secrets.enc.json",
            timeoutMs: 7000,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            apiKey: { source: "file", id: "/providers/openai/apiKey" },
            models: [],
          },
        },
      },
    };

    const snapshot = await prepareSecretsRuntimeSnapshot({
      config,
      agentDirs: ["/tmp/openclaw-agent-main"],
      loadAuthStore: () => ({ version: 1, profiles: {} }),
    });

    expect(snapshot.config.models?.providers?.openai?.apiKey).toBe("sk-from-sops");
    expect(runExecMock).toHaveBeenCalledWith(
      "sops",
      ["--decrypt", "--output-type", "json", expect.stringContaining("secrets.enc.json")],
      expect.objectContaining({
        timeoutMs: 7000,
        maxBuffer: 10 * 1024 * 1024,
        cwd: expect.stringContaining(".openclaw"),
      }),
    );
  });

  it("fails when sops decrypt payload is not a JSON object", async () => {
    runExecMock.mockResolvedValueOnce({
      stdout: JSON.stringify(["not-an-object"]),
      stderr: "",
    });

    await expect(
      prepareSecretsRuntimeSnapshot({
        config: {
          secrets: {
            sources: {
              file: {
                type: "sops",
                path: "~/.openclaw/secrets.enc.json",
              },
            },
          },
          models: {
=======
  it("resolves file refs via configured file provider", async () => {
    if (process.platform === "win32") {
      return;
    }
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-secrets-file-provider-"));
    const secretsPath = path.join(root, "secrets.json");
    try {
      await fs.writeFile(
        secretsPath,
        JSON.stringify(
          {
>>>>>>> 060ede8aa (test(secrets): skip windows ACL-sensitive file-provider runtime tests)
            providers: {
              openai: {
                baseUrl: "https://api.openai.com/v1",
                apiKey: { source: "file", id: "/providers/openai/apiKey" },
                models: [],
              },
            },
          },
<<<<<<< HEAD
=======
          null,
          2,
        ),
        "utf8",
      );
      await fs.chmod(secretsPath, 0o600);

      const config: OpenClawConfig = {
        secrets: {
          providers: {
            default: {
              source: "file",
              path: secretsPath,
              mode: "json",
            },
          },
          defaults: {
            file: "default",
          },
>>>>>>> 06290b49b (feat(secrets): finalize mode rename and validated exec docs)
        },
        agentDirs: ["/tmp/openclaw-agent-main"],
        loadAuthStore: () => ({ version: 1, profiles: {} }),
<<<<<<< HEAD
      }),
    ).rejects.toThrow("sops decrypt failed: decrypted payload is not a JSON object");
=======
      });

      expect(snapshot.config.models?.providers?.openai?.apiKey).toBe("sk-from-file-provider");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("fails when file provider payload is not a JSON object", async () => {
    if (process.platform === "win32") {
      return;
    }
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-secrets-file-provider-bad-"));
    const secretsPath = path.join(root, "secrets.json");
    try {
      await fs.writeFile(secretsPath, JSON.stringify(["not-an-object"]), "utf8");
      await fs.chmod(secretsPath, 0o600);

      await expect(
        prepareSecretsRuntimeSnapshot({
          config: {
            secrets: {
              providers: {
                default: {
                  source: "file",
                  path: secretsPath,
                  mode: "json",
                },
              },
            },
            models: {
              providers: {
                openai: {
                  baseUrl: "https://api.openai.com/v1",
                  apiKey: { source: "file", provider: "default", id: "/providers/openai/apiKey" },
                  models: [],
                },
              },
            },
          },
          agentDirs: ["/tmp/openclaw-agent-main"],
          loadAuthStore: () => ({ version: 1, profiles: {} }),
        }),
      ).rejects.toThrow("payload is not a JSON object");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
>>>>>>> 060ede8aa (test(secrets): skip windows ACL-sensitive file-provider runtime tests)
  });

  it("activates runtime snapshots for loadConfig and ensureAuthProfileStore", async () => {
    const prepared = await prepareSecretsRuntimeSnapshot({
      config: {
        models: {
          providers: {
            openai: {
              baseUrl: "https://api.openai.com/v1",
              apiKey: { source: "env", id: "OPENAI_API_KEY" },
              models: [],
            },
          },
        },
      },
      env: { OPENAI_API_KEY: "sk-runtime" },
      agentDirs: ["/tmp/openclaw-agent-main"],
      loadAuthStore: () => ({
        version: 1,
        profiles: {
          "openai:default": {
            type: "api_key",
            provider: "openai",
            keyRef: { source: "env", id: "OPENAI_API_KEY" },
          },
        },
      }),
    });

    activateSecretsRuntimeSnapshot(prepared);

    expect(loadConfig().models?.providers?.openai?.apiKey).toBe("sk-runtime");
    const store = ensureAuthProfileStore("/tmp/openclaw-agent-main");
    expect(store.profiles["openai:default"]).toMatchObject({
      type: "api_key",
      key: "sk-runtime",
    });
  });

  it("does not write inherited auth stores during runtime secret activation", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-secrets-runtime-"));
    const stateDir = path.join(root, ".openclaw");
    const mainAgentDir = path.join(stateDir, "agents", "main", "agent");
    const workerStorePath = path.join(stateDir, "agents", "worker", "agent", "auth-profiles.json");
    const prevStateDir = process.env.OPENCLAW_STATE_DIR;

    try {
      await fs.mkdir(mainAgentDir, { recursive: true });
      await fs.writeFile(
        path.join(mainAgentDir, "auth-profiles.json"),
        JSON.stringify({
          version: 1,
          profiles: {
            "openai:default": {
              type: "api_key",
              provider: "openai",
              keyRef: { source: "env", id: "OPENAI_API_KEY" },
            },
          },
        }),
        "utf8",
      );
      process.env.OPENCLAW_STATE_DIR = stateDir;

      await prepareSecretsRuntimeSnapshot({
        config: {
          agents: {
            list: [{ id: "worker" }],
          },
        },
        env: { OPENAI_API_KEY: "sk-runtime-worker" },
      });

      await expect(fs.access(workerStorePath)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      if (prevStateDir === undefined) {
        delete process.env.OPENCLAW_STATE_DIR;
      } else {
        process.env.OPENCLAW_STATE_DIR = prevStateDir;
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
