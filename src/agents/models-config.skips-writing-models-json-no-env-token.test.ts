import fs from "node:fs/promises";
import path from "node:path";
<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
import type { OpenClawConfig } from "../config/config.js";
import { resolveOpenClawAgentDir } from "./agent-paths.js";
import {
  CUSTOM_PROXY_MODELS_CONFIG,
  installModelsConfigTestHooks,
  MODELS_CONFIG_IMPLICIT_ENV_VARS,
  unsetEnv,
  withTempEnv,
  withModelsTempHome as withTempHome,
} from "./models-config.e2e-harness.js";
import { ensureOpenClawModelsJson } from "./models-config.js";
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(fn, { prefix: "openclaw-models-" });
}

const MODELS_CONFIG: OpenClawConfig = {
  models: {
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "TEST_KEY",
        api: "openai-completions",
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B (Proxy)",
            api: "openai-completions",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
};

type ProviderConfig = {
  baseUrl?: string;
  apiKey?: string;
  models?: Array<{ id: string }>;
};

async function runEnvProviderCase(params: {
  envVar: "MINIMAX_API_KEY" | "SYNTHETIC_API_KEY";
  envValue: string;
  providerKey: "minimax" | "synthetic";
  expectedBaseUrl: string;
  expectedApiKeyRef: string;
  expectedModelIds: string[];
}) {
  const previousValue = process.env[params.envVar];
  process.env[params.envVar] = params.envValue;
  try {
    await ensureOpenClawModelsJson({});

    const modelPath = path.join(resolveOpenClawAgentDir(), "models.json");
    const raw = await fs.readFile(modelPath, "utf8");
    const parsed = JSON.parse(raw) as { providers: Record<string, ProviderConfig> };
    const provider = parsed.providers[params.providerKey];
    expect(provider?.baseUrl).toBe(params.expectedBaseUrl);
    expect(provider?.apiKey).toBe(params.expectedApiKeyRef);
    const ids = provider?.models?.map((model) => model.id) ?? [];
    for (const expectedId of params.expectedModelIds) {
      expect(ids).toContain(expectedId);
    }
  } finally {
    if (previousValue === undefined) {
      delete process.env[params.envVar];
    } else {
      process.env[params.envVar] = previousValue;
    }
  }
}

describe("models-config", () => {
  it("skips writing models.json when no env token or profile exists", async () => {
    await withTempHome(async (home) => {
      await withTempEnv([...MODELS_CONFIG_IMPLICIT_ENV_VARS, "KIMI_API_KEY"], async () => {
        unsetEnv([...MODELS_CONFIG_IMPLICIT_ENV_VARS, "KIMI_API_KEY"]);

      try {
<<<<<<< HEAD
        vi.resetModules();
        const { ensureOpenClawModelsJson } = await import("./models-config.js");

        const agentDir = path.join(home, "agent-empty");
        const result = await ensureOpenClawModelsJson(
        process.env.OPENCLAW_AGENT_DIR = agentDir;
        process.env.PI_CODING_AGENT_DIR = agentDir;

        const result = await ensureOpenClawModelsJson(
>>>>>>> c06a962bb (test(e2e): stabilize suite)
          {
            models: { providers: {} },
          },
          agentDir,
        );

        await expect(fs.stat(path.join(agentDir, "models.json"))).rejects.toThrow();
        expect(result.wrote).toBe(false);
      });
    });
  });

  it("writes models.json for configured providers", async () => {
    await withTempHome(async () => {
<<<<<<< HEAD
      vi.resetModules();
      const { ensureOpenClawModelsJson } = await import("./models-config.js");
      const { resolveOpenClawAgentDir } = await import("./agent-paths.js");

      await ensureOpenClawModelsJson(MODELS_CONFIG);
=======
      await ensureOpenClawModelsJson(MODELS_CONFIG);
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)

      const modelPath = path.join(resolveOpenClawAgentDir(), "models.json");
      const raw = await fs.readFile(modelPath, "utf8");
      const parsed = JSON.parse(raw) as {
        providers: Record<string, { baseUrl?: string }>;
      };

      expect(parsed.providers["custom-proxy"]?.baseUrl).toBe("http://localhost:4000/v1");
    });
  });

  it("adds minimax provider when MINIMAX_API_KEY is set", async () => {
    await withTempHome(async () => {
      const prevKey = process.env.MINIMAX_API_KEY;
      process.env.MINIMAX_API_KEY = "sk-minimax-test";
      try {
<<<<<<< HEAD
        const { ensureOpenClawModelsJson } = await import("./models-config.js");
        const { resolveOpenClawAgentDir } = await import("./agent-paths.js");

        await ensureOpenClawModelsJson({});

        const modelPath = path.join(resolveOpenClawAgentDir(), "models.json");
        const raw = await fs.readFile(modelPath, "utf8");
        const parsed = JSON.parse(raw) as {
          providers: Record<
            string,
            {
              baseUrl?: string;
              apiKey?: string;
              models?: Array<{ id: string }>;
            }
          >;
        };
        expect(parsed.providers.minimax?.baseUrl).toBe("https://api.minimax.io/anthropic");
        expect(parsed.providers.minimax?.apiKey).toBe("MINIMAX_API_KEY");
        const ids = parsed.providers.minimax?.models?.map((model) => model.id);
        expect(ids).toContain("MiniMax-M2.1");
        expect(ids).toContain("MiniMax-VL-01");
      } finally {
        if (prevKey === undefined) {
          delete process.env.MINIMAX_API_KEY;
        } else {
          process.env.MINIMAX_API_KEY = prevKey;
        }
      }
=======
      await runEnvProviderCase({
        envVar: "MINIMAX_API_KEY",
        envValue: "sk-minimax-test",
        providerKey: "minimax",
        expectedBaseUrl: "https://api.minimax.io/anthropic",
        expectedApiKeyRef: "MINIMAX_API_KEY",
        expectedModelIds: ["MiniMax-M2.1", "MiniMax-VL-01"],
      });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
    });
  });

  it("adds synthetic provider when SYNTHETIC_API_KEY is set", async () => {
    await withTempHome(async () => {
      const prevKey = process.env.SYNTHETIC_API_KEY;
      process.env.SYNTHETIC_API_KEY = "sk-synthetic-test";
      try {
<<<<<<< HEAD
        const { ensureOpenClawModelsJson } = await import("./models-config.js");
        const { resolveOpenClawAgentDir } = await import("./agent-paths.js");

        await ensureOpenClawModelsJson({});

        const modelPath = path.join(resolveOpenClawAgentDir(), "models.json");
        const raw = await fs.readFile(modelPath, "utf8");
        const parsed = JSON.parse(raw) as {
          providers: Record<
            string,
            {
              baseUrl?: string;
              apiKey?: string;
              models?: Array<{ id: string }>;
            }
          >;
        };
        expect(parsed.providers.synthetic?.baseUrl).toBe("https://api.synthetic.new/anthropic");
        expect(parsed.providers.synthetic?.apiKey).toBe("SYNTHETIC_API_KEY");
        const ids = parsed.providers.synthetic?.models?.map((model) => model.id);
        expect(ids).toContain("hf:MiniMaxAI/MiniMax-M2.1");
      } finally {
        if (prevKey === undefined) {
          delete process.env.SYNTHETIC_API_KEY;
        } else {
          process.env.SYNTHETIC_API_KEY = prevKey;
        }
      }
=======
      await runEnvProviderCase({
        envVar: "SYNTHETIC_API_KEY",
        envValue: "sk-synthetic-test",
        providerKey: "synthetic",
        expectedBaseUrl: "https://api.synthetic.new/anthropic",
        expectedApiKeyRef: "SYNTHETIC_API_KEY",
        expectedModelIds: ["hf:MiniMaxAI/MiniMax-M2.1"],
      });
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
    });
  });
});
