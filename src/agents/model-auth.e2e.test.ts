import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { Api, Model } from "@mariozechner/pi-ai";
import { describe, expect, it, vi } from "vitest";
=======
=======
import type { Api, Model } from "@mariozechner/pi-ai";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { Api, Model } from "@mariozechner/pi-ai";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { Api, Model } from "@mariozechner/pi-ai";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { describe, expect, it } from "vitest";
import { withEnvAsync } from "../test-utils/env.js";
import { ensureAuthProfileStore } from "./auth-profiles.js";
import { getApiKeyForModel, resolveApiKeyForProvider, resolveEnvApiKey } from "./model-auth.js";
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)

const oauthFixture = {
  access: "access-token",
  refresh: "refresh-token",
  expires: Date.now() + 60_000,
  accountId: "acct_123",
};

const BEDROCK_PROVIDER_CFG = {
  models: {
    providers: {
      "amazon-bedrock": {
        baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
        api: "bedrock-converse-stream",
        auth: "aws-sdk",
        models: [],
      },
    },
  },
} as const;

async function resolveBedrockProvider() {
  return resolveApiKeyForProvider({
    provider: "amazon-bedrock",
    store: { version: 1, profiles: {} },
    cfg: BEDROCK_PROVIDER_CFG as never,
  });
}

describe("getApiKeyForModel", () => {
  it("migrates legacy oauth.json into auth-profiles.json", async () => {
<<<<<<< HEAD
<<<<<<< HEAD
    const previousStateDir = process.env.CLAWDBOT_STATE_DIR;
    const previousAgentDir = process.env.CLAWDBOT_AGENT_DIR;
    const previousPiAgentDir = process.env.PI_CODING_AGENT_DIR;
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-oauth-"));
=======
    const envSnapshot = captureEnv([
      "OPENCLAW_STATE_DIR",
      "OPENCLAW_AGENT_DIR",
      "PI_CODING_AGENT_DIR",
    ]);
=======
>>>>>>> e588e3cc2 (refactor(test): standardize env helpers across suites)
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-oauth-"));
>>>>>>> e9c8540e2 (refactor(test): simplify model auth env restore)

    try {
<<<<<<< HEAD
      process.env.CLAWDBOT_STATE_DIR = tempDir;
      process.env.CLAWDBOT_AGENT_DIR = path.join(tempDir, "agent");
      process.env.PI_CODING_AGENT_DIR = process.env.CLAWDBOT_AGENT_DIR;
=======
      const agentDir = path.join(tempDir, "agent");
      await withEnvAsync(
        {
          OPENCLAW_STATE_DIR: tempDir,
          OPENCLAW_AGENT_DIR: agentDir,
          PI_CODING_AGENT_DIR: agentDir,
        },
        async () => {
          const oauthDir = path.join(tempDir, "credentials");
          await fs.mkdir(oauthDir, { recursive: true, mode: 0o700 });
          await fs.writeFile(
            path.join(oauthDir, "oauth.json"),
            `${JSON.stringify({ "openai-codex": oauthFixture }, null, 2)}\n`,
            "utf8",
          );
>>>>>>> e588e3cc2 (refactor(test): standardize env helpers across suites)

          const model = {
            id: "codex-mini-latest",
            provider: "openai-codex",
            api: "openai-codex-responses",
          } as Model<Api>;

<<<<<<< HEAD
      const model = {
        id: "codex-mini-latest",
        provider: "openai-codex",
        api: "openai-codex-responses",
      } as Model<Api>;

      const store = ensureAuthProfileStore(process.env.CLAWDBOT_AGENT_DIR, {
        allowKeychainPrompt: false,
      });
      const apiKey = await getApiKeyForModel({
        model,
        cfg: {
          auth: {
            profiles: {
              "openai-codex:default": {
                provider: "openai-codex",
                mode: "oauth",
              },
            },
          },
        },
        store,
        agentDir: process.env.CLAWDBOT_AGENT_DIR,
      });
      expect(apiKey.apiKey).toBe(oauthFixture.access);
=======
          const store = ensureAuthProfileStore(process.env.OPENCLAW_AGENT_DIR, {
            allowKeychainPrompt: false,
          });
          const apiKey = await getApiKeyForModel({
            model,
            cfg: {
              auth: {
                profiles: {
                  "openai-codex:default": {
                    provider: "openai-codex",
                    mode: "oauth",
                  },
                },
              },
            },
            store,
            agentDir: process.env.OPENCLAW_AGENT_DIR,
          });
          expect(apiKey.apiKey).toBe(oauthFixture.access);
>>>>>>> e588e3cc2 (refactor(test): standardize env helpers across suites)

          const authProfiles = await fs.readFile(
            path.join(tempDir, "agent", "auth-profiles.json"),
            "utf8",
          );
          const authData = JSON.parse(authProfiles) as Record<string, unknown>;
          expect(authData.profiles).toMatchObject({
            "openai-codex:default": {
              type: "oauth",
              provider: "openai-codex",
              access: oauthFixture.access,
              refresh: oauthFixture.refresh,
            },
          });
        },
      );
    } finally {
<<<<<<< HEAD
<<<<<<< HEAD
      if (previousStateDir === undefined) {
        delete process.env.CLAWDBOT_STATE_DIR;
      } else {
        process.env.CLAWDBOT_STATE_DIR = previousStateDir;
      }
      if (previousAgentDir === undefined) {
        delete process.env.CLAWDBOT_AGENT_DIR;
      } else {
        process.env.CLAWDBOT_AGENT_DIR = previousAgentDir;
      }
      if (previousPiAgentDir === undefined) {
        delete process.env.PI_CODING_AGENT_DIR;
      } else {
        process.env.PI_CODING_AGENT_DIR = previousPiAgentDir;
      }
=======
      envSnapshot.restore();
>>>>>>> e9c8540e2 (refactor(test): simplify model auth env restore)
=======
>>>>>>> e588e3cc2 (refactor(test): standardize env helpers across suites)
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("suggests openai-codex when only Codex OAuth is configured", async () => {
<<<<<<< HEAD
<<<<<<< HEAD
    const previousStateDir = process.env.CLAWDBOT_STATE_DIR;
    const previousAgentDir = process.env.CLAWDBOT_AGENT_DIR;
    const previousPiAgentDir = process.env.PI_CODING_AGENT_DIR;
    const previousOpenAiKey = process.env.OPENAI_API_KEY;
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-auth-"));
=======
    const envSnapshot = captureEnv([
      "OPENAI_API_KEY",
      "OPENCLAW_STATE_DIR",
      "OPENCLAW_AGENT_DIR",
      "PI_CODING_AGENT_DIR",
    ]);
=======
>>>>>>> e588e3cc2 (refactor(test): standardize env helpers across suites)
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-auth-"));
>>>>>>> e9c8540e2 (refactor(test): simplify model auth env restore)

    try {
<<<<<<< HEAD
      delete process.env.OPENAI_API_KEY;
      process.env.CLAWDBOT_STATE_DIR = tempDir;
      process.env.CLAWDBOT_AGENT_DIR = path.join(tempDir, "agent");
      process.env.PI_CODING_AGENT_DIR = process.env.CLAWDBOT_AGENT_DIR;

      const authProfilesPath = path.join(tempDir, "agent", "auth-profiles.json");
      await fs.mkdir(path.dirname(authProfilesPath), {
        recursive: true,
        mode: 0o700,
      });
      await fs.writeFile(
        authProfilesPath,
        `${JSON.stringify(
          {
            version: 1,
            profiles: {
              "openai-codex:default": {
                type: "oauth",
                provider: "openai-codex",
                ...oauthFixture,
=======
      const agentDir = path.join(tempDir, "agent");
      await withEnvAsync(
        {
          OPENAI_API_KEY: undefined,
          OPENCLAW_STATE_DIR: tempDir,
          OPENCLAW_AGENT_DIR: agentDir,
          PI_CODING_AGENT_DIR: agentDir,
        },
        async () => {
          const authProfilesPath = path.join(tempDir, "agent", "auth-profiles.json");
          await fs.mkdir(path.dirname(authProfilesPath), {
            recursive: true,
            mode: 0o700,
          });
          await fs.writeFile(
            authProfilesPath,
            `${JSON.stringify(
              {
                version: 1,
                profiles: {
                  "openai-codex:default": {
                    type: "oauth",
                    provider: "openai-codex",
                    ...oauthFixture,
                  },
                },
>>>>>>> e588e3cc2 (refactor(test): standardize env helpers across suites)
              },
              null,
              2,
            )}\n`,
            "utf8",
          );

<<<<<<< HEAD
      let error: unknown = null;
      try {
        await resolveApiKeyForProvider({ provider: "openai" });
      } catch (err) {
        error = err;
      }
      expect(String(error)).toContain("openai-codex/gpt-5.2");
    } finally {
<<<<<<< HEAD
      if (previousOpenAiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = previousOpenAiKey;
      }
      if (previousStateDir === undefined) {
        delete process.env.CLAWDBOT_STATE_DIR;
      } else {
        process.env.CLAWDBOT_STATE_DIR = previousStateDir;
      }
      if (previousAgentDir === undefined) {
        delete process.env.CLAWDBOT_AGENT_DIR;
      } else {
        process.env.CLAWDBOT_AGENT_DIR = previousAgentDir;
      }
      if (previousPiAgentDir === undefined) {
        delete process.env.PI_CODING_AGENT_DIR;
      } else {
        process.env.PI_CODING_AGENT_DIR = previousPiAgentDir;
      }
=======
      envSnapshot.restore();
>>>>>>> e9c8540e2 (refactor(test): simplify model auth env restore)
=======
          let error: unknown = null;
          try {
            await resolveApiKeyForProvider({ provider: "openai" });
          } catch (err) {
            error = err;
          }
          expect(String(error)).toContain("openai-codex/gpt-5.3-codex");
        },
      );
    } finally {
>>>>>>> e588e3cc2 (refactor(test): standardize env helpers across suites)
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("throws when ZAI API key is missing", async () => {
    await withEnvAsync(
      {
        ZAI_API_KEY: undefined,
        Z_AI_API_KEY: undefined,
      },
      async () => {
        let error: unknown = null;
        try {
          await resolveApiKeyForProvider({
            provider: "zai",
            store: { version: 1, profiles: {} },
          });
        } catch (err) {
          error = err;
        }

        expect(String(error)).toContain('No API key found for provider "zai".');
      },
    );
  });

  it("accepts legacy Z_AI_API_KEY for zai", async () => {
    await withEnvAsync(
      {
        ZAI_API_KEY: undefined,
        Z_AI_API_KEY: "zai-test-key",
      },
      async () => {
        const resolved = await resolveApiKeyForProvider({
          provider: "zai",
          store: { version: 1, profiles: {} },
        });
        expect(resolved.apiKey).toBe("zai-test-key");
        expect(resolved.source).toContain("Z_AI_API_KEY");
      },
    );
  });

  it("resolves Synthetic API key from env", async () => {
    await withEnvAsync({ SYNTHETIC_API_KEY: "synthetic-test-key" }, async () => {
      const resolved = await resolveApiKeyForProvider({
        provider: "synthetic",
        store: { version: 1, profiles: {} },
      });
      expect(resolved.apiKey).toBe("synthetic-test-key");
      expect(resolved.source).toContain("SYNTHETIC_API_KEY");
    });
  });

<<<<<<< HEAD
=======
  it("resolves Qianfan API key from env", async () => {
    await withEnvAsync({ QIANFAN_API_KEY: "qianfan-test-key" }, async () => {
      const resolved = await resolveApiKeyForProvider({
        provider: "qianfan",
        store: { version: 1, profiles: {} },
      });
      expect(resolved.apiKey).toBe("qianfan-test-key");
      expect(resolved.source).toContain("QIANFAN_API_KEY");
    });
  });

>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)
  it("resolves Vercel AI Gateway API key from env", async () => {
    await withEnvAsync({ AI_GATEWAY_API_KEY: "gateway-test-key" }, async () => {
      const resolved = await resolveApiKeyForProvider({
        provider: "vercel-ai-gateway",
        store: { version: 1, profiles: {} },
      });
      expect(resolved.apiKey).toBe("gateway-test-key");
      expect(resolved.source).toContain("AI_GATEWAY_API_KEY");
    });
  });

  it("prefers Bedrock bearer token over access keys and profile", async () => {
    await withEnvAsync(
      {
        AWS_BEARER_TOKEN_BEDROCK: "bedrock-token",
        AWS_ACCESS_KEY_ID: "access-key",
        AWS_SECRET_ACCESS_KEY: "secret-key",
        AWS_PROFILE: "profile",
      },
      async () => {
        const resolved = await resolveBedrockProvider();

        expect(resolved.mode).toBe("aws-sdk");
        expect(resolved.apiKey).toBeUndefined();
        expect(resolved.source).toContain("AWS_BEARER_TOKEN_BEDROCK");
      },
    );
  });

  it("prefers Bedrock access keys over profile", async () => {
    await withEnvAsync(
      {
        AWS_BEARER_TOKEN_BEDROCK: undefined,
        AWS_ACCESS_KEY_ID: "access-key",
        AWS_SECRET_ACCESS_KEY: "secret-key",
        AWS_PROFILE: "profile",
      },
      async () => {
        const resolved = await resolveBedrockProvider();

        expect(resolved.mode).toBe("aws-sdk");
        expect(resolved.apiKey).toBeUndefined();
        expect(resolved.source).toContain("AWS_ACCESS_KEY_ID");
      },
    );
  });

  it("uses Bedrock profile when access keys are missing", async () => {
    await withEnvAsync(
      {
        AWS_BEARER_TOKEN_BEDROCK: undefined,
        AWS_ACCESS_KEY_ID: undefined,
        AWS_SECRET_ACCESS_KEY: undefined,
        AWS_PROFILE: "profile",
      },
      async () => {
        const resolved = await resolveBedrockProvider();

        expect(resolved.mode).toBe("aws-sdk");
        expect(resolved.apiKey).toBeUndefined();
        expect(resolved.source).toContain("AWS_PROFILE");
      },
    );
  });

  it("accepts VOYAGE_API_KEY for voyage", async () => {
    await withEnvAsync({ VOYAGE_API_KEY: "voyage-test-key" }, async () => {
      const voyage = await resolveApiKeyForProvider({
        provider: "voyage",
        store: { version: 1, profiles: {} },
      });
      expect(voyage.apiKey).toBe("voyage-test-key");
      expect(voyage.source).toContain("VOYAGE_API_KEY");
    });
  });

  it("strips embedded CR/LF from ANTHROPIC_API_KEY", async () => {
    await withEnvAsync({ ANTHROPIC_API_KEY: "sk-ant-test-\r\nkey" }, async () => {
      const resolved = resolveEnvApiKey("anthropic");
      expect(resolved?.apiKey).toBe("sk-ant-test-key");
      expect(resolved?.source).toContain("ANTHROPIC_API_KEY");
    });
  });

  it("resolveEnvApiKey('huggingface') returns HUGGINGFACE_HUB_TOKEN when set", async () => {
    await withEnvAsync(
      {
        HUGGINGFACE_HUB_TOKEN: "hf_hub_xyz",
        HF_TOKEN: undefined,
      },
      async () => {
        const resolved = resolveEnvApiKey("huggingface");
        expect(resolved?.apiKey).toBe("hf_hub_xyz");
        expect(resolved?.source).toContain("HUGGINGFACE_HUB_TOKEN");
      },
    );
  });

  it("resolveEnvApiKey('huggingface') prefers HUGGINGFACE_HUB_TOKEN over HF_TOKEN when both set", async () => {
    await withEnvAsync(
      {
        HUGGINGFACE_HUB_TOKEN: "hf_hub_first",
        HF_TOKEN: "hf_second",
      },
      async () => {
        const resolved = resolveEnvApiKey("huggingface");
        expect(resolved?.apiKey).toBe("hf_hub_first");
        expect(resolved?.source).toContain("HUGGINGFACE_HUB_TOKEN");
      },
    );
  });

  it("resolveEnvApiKey('huggingface') returns HF_TOKEN when only HF_TOKEN set", async () => {
    await withEnvAsync(
      {
        HUGGINGFACE_HUB_TOKEN: undefined,
        HF_TOKEN: "hf_abc123",
      },
      async () => {
        const resolved = resolveEnvApiKey("huggingface");
        expect(resolved?.apiKey).toBe("hf_abc123");
        expect(resolved?.source).toContain("HF_TOKEN");
      },
    );
  });
});
