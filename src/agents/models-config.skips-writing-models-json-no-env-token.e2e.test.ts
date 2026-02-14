import fs from "node:fs/promises";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
import type { MoltbotConfig } from "../config/config.js";
=======
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
=======
import { describe, expect, it } from "vitest";
>>>>>>> 96f80d6d8 (refactor(test): share models-config e2e setup)
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

<<<<<<< HEAD
async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(fn, { prefix: "moltbot-models-" });
}

const MODELS_CONFIG: MoltbotConfig = {
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
=======
installModelsConfigTestHooks();
>>>>>>> 96f80d6d8 (refactor(test): share models-config e2e setup)

describe("models-config", () => {
  it("skips writing models.json when no env token or profile exists", async () => {
    await withTempHome(async (home) => {
      await withTempEnv([...MODELS_CONFIG_IMPLICIT_ENV_VARS, "KIMI_API_KEY"], async () => {
        unsetEnv([...MODELS_CONFIG_IMPLICIT_ENV_VARS, "KIMI_API_KEY"]);

<<<<<<< HEAD
      try {
<<<<<<< HEAD
        vi.resetModules();
        const { ensureMoltbotModelsJson } = await import("./models-config.js");

=======
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)
        const agentDir = path.join(home, "agent-empty");
<<<<<<< HEAD
        const result = await ensureMoltbotModelsJson(
=======
        // Avoid merging in the user's real main auth store via OPENCLAW_AGENT_DIR.
=======
        const agentDir = path.join(home, "agent-empty");
        // ensureAuthProfileStore merges the main auth store into non-main dirs; point main at our temp dir.
>>>>>>> 96f80d6d8 (refactor(test): share models-config e2e setup)
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
<<<<<<< HEAD
      vi.resetModules();
      const { ensureMoltbotModelsJson } = await import("./models-config.js");
      const { resolveMoltbotAgentDir } = await import("./agent-paths.js");
=======
      await ensureOpenClawModelsJson(CUSTOM_PROXY_MODELS_CONFIG);
>>>>>>> 96f80d6d8 (refactor(test): share models-config e2e setup)

      await ensureMoltbotModelsJson(MODELS_CONFIG);
=======
      await ensureOpenClawModelsJson(MODELS_CONFIG);
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)

      const modelPath = path.join(resolveMoltbotAgentDir(), "models.json");
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
        const { ensureMoltbotModelsJson } = await import("./models-config.js");
        const { resolveMoltbotAgentDir } = await import("./agent-paths.js");

        await ensureMoltbotModelsJson({});
=======
        await ensureOpenClawModelsJson({});
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)

        const modelPath = path.join(resolveMoltbotAgentDir(), "models.json");
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
    });
  });

  it("adds synthetic provider when SYNTHETIC_API_KEY is set", async () => {
    await withTempHome(async () => {
      const prevKey = process.env.SYNTHETIC_API_KEY;
      process.env.SYNTHETIC_API_KEY = "sk-synthetic-test";
      try {
<<<<<<< HEAD
        const { ensureMoltbotModelsJson } = await import("./models-config.js");
        const { resolveMoltbotAgentDir } = await import("./agent-paths.js");

        await ensureMoltbotModelsJson({});
=======
        await ensureOpenClawModelsJson({});
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)

        const modelPath = path.join(resolveMoltbotAgentDir(), "models.json");
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
    });
  });
});
