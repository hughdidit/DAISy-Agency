import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { resolveConfigEnvVars } from "../config/env-substitution.js";
import { resolveDiscordToken } from "./token.js";

describe("resolveDiscordToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers config token over env", () => {
    vi.stubEnv("DISCORD_BOT_TOKEN", "env-token");
    const cfg = {
      channels: { discord: { token: "cfg-token" } },
    } as OpenClawConfig;
    const res = resolveDiscordToken(cfg);
    expect(res.token).toBe("cfg-token");
    expect(res.source).toBe("config");
  });

  it("uses env token when config is missing", () => {
    vi.stubEnv("DISCORD_BOT_TOKEN", "env-token");
    const cfg = {
      channels: { discord: {} },
    } as OpenClawConfig;
    const res = resolveDiscordToken(cfg);
    expect(res.token).toBe("env-token");
    expect(res.source).toBe("env");
  });

  it("does not use default env token for named accounts", () => {
    vi.stubEnv("DISCORD_BOT_TOKEN", "env-token");
    const cfg = {
      channels: {
        discord: {
          accounts: {
            finn: {},
          },
        },
      },
    } as OpenClawConfig;
    const res = resolveDiscordToken(cfg, { accountId: "finn" });
    expect(res.token).toBe("");
    expect(res.source).toBe("none");
  });

  it("prefers account token for non-default accounts", () => {
    vi.stubEnv("DISCORD_BOT_TOKEN", "env-token");
    const cfg = {
      channels: {
        discord: {
          token: "base-token",
          accounts: {
            work: { token: "acct-token" },
          },
        },
      },
    } as OpenClawConfig;
    const res = resolveDiscordToken(cfg, { accountId: "work" });
    expect(res.token).toBe("acct-token");
    expect(res.source).toBe("config");
  });

  it("resolves named account tokens from account-specific env references", () => {
    vi.stubEnv("DISCORD_BOT_TOKEN", "env-token");
    vi.stubEnv("FINN_DISCORD_BOT_TOKEN", "finn-env-token");
    const cfg = resolveConfigEnvVars({
      channels: {
        discord: {
          accounts: {
            default: { token: "${DISCORD_BOT_TOKEN}" },
            finn: { token: "${FINN_DISCORD_BOT_TOKEN}" },
          },
        },
      },
    }) as OpenClawConfig;

    const defaultRes = resolveDiscordToken(cfg, { accountId: "default" });
    const finnRes = resolveDiscordToken(cfg, { accountId: "finn" });

    expect(defaultRes.token).toBe("env-token");
    expect(defaultRes.source).toBe("config");
    expect(finnRes.token).toBe("finn-env-token");
    expect(finnRes.source).toBe("config");
  });

  it("fails config resolution when a named account env reference is missing", () => {
    vi.stubEnv("DISCORD_BOT_TOKEN", "env-token");
    vi.stubEnv("FINN_DISCORD_BOT_TOKEN", "");

    expect(() =>
      resolveConfigEnvVars({
        channels: {
          discord: {
            accounts: {
              default: { token: "${DISCORD_BOT_TOKEN}" },
              finn: { token: "${FINN_DISCORD_BOT_TOKEN}" },
            },
          },
        },
      }),
    ).toThrow(/FINN_DISCORD_BOT_TOKEN/);
  });

  it("falls back to top-level token for non-default accounts without account token", () => {
    const cfg = {
      channels: {
        discord: {
          token: "base-token",
          accounts: {
            work: {},
          },
        },
      },
    } as OpenClawConfig;
    const res = resolveDiscordToken(cfg, { accountId: "work" });
    expect(res.token).toBe("base-token");
    expect(res.source).toBe("config");
  });

  it("does not inherit top-level token when account token is explicitly blank", () => {
    const cfg = {
      channels: {
        discord: {
          token: "base-token",
          accounts: {
            work: { token: "" },
          },
        },
      },
    } as OpenClawConfig;
    const res = resolveDiscordToken(cfg, { accountId: "work" });
    expect(res.token).toBe("");
    expect(res.source).toBe("none");
  });

  it("resolves account token when account key casing differs from normalized id", () => {
    const cfg = {
      channels: {
        discord: {
          accounts: {
            Work: { token: "acct-token" },
          },
        },
      },
    } as OpenClawConfig;
    const res = resolveDiscordToken(cfg, { accountId: "work" });
    expect(res.token).toBe("acct-token");
    expect(res.source).toBe("config");
  });

  it("recognizes unresolved SecretRef objects without materializing a token", () => {
    const cfg = {
      channels: {
        discord: {
          token: { source: "env", provider: "default", id: "DISCORD_BOT_TOKEN" },
        },
      },
    } as unknown as OpenClawConfig;

    const res = resolveDiscordToken(cfg);
    expect(res.token).toBe("");
    expect(res.source).toBe("config");
  });

  it("recognizes unresolved account SecretRef objects without falling back to top-level tokens", () => {
    const cfg = {
      channels: {
        discord: {
          token: "base-token",
          accounts: {
            work: {
              token: {
                source: "gcpSecretManager",
                provider: "daisy-staging",
                id: "discord-bot-token",
              },
            },
          },
        },
      },
      secrets: {
        providers: {
          "daisy-staging": {
            source: "gcpSecretManager",
            projectId: "amiable-raceway-472818-m5",
            allowedSecrets: ["discord-bot-token"],
          },
        },
      },
    } as unknown as OpenClawConfig;

    const res = resolveDiscordToken(cfg, { accountId: "work" });
    expect(res.token).toBe("");
    expect(res.source).toBe("config");
  });

  it("recognizes unresolved account SecretRef objects without a top-level token", () => {
    const cfg = {
      channels: {
        discord: {
          accounts: {
            work: {
              token: {
                source: "gcpSecretManager",
                provider: "daisy-staging",
                id: "discord-bot-token",
              },
            },
          },
        },
      },
      secrets: {
        providers: {
          "daisy-staging": {
            source: "gcpSecretManager",
            projectId: "amiable-raceway-472818-m5",
            allowedSecrets: ["discord-bot-token"],
          },
        },
      },
    } as unknown as OpenClawConfig;

    const res = resolveDiscordToken(cfg, { accountId: "work" });
    expect(res.token).toBe("");
    expect(res.source).toBe("config");
  });
});
