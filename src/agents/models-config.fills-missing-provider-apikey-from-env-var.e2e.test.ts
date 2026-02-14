import fs from "node:fs/promises";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
import type { MoltbotConfig } from "../config/config.js";
=======
import { afterEach, beforeEach, describe, expect, it } from "vitest";
=======
import { describe, expect, it } from "vitest";
>>>>>>> 96f80d6d8 (refactor(test): share models-config e2e setup)
import type { OpenClawConfig } from "../config/config.js";
import { resolveOpenClawAgentDir } from "./agent-paths.js";
import {
  CUSTOM_PROXY_MODELS_CONFIG,
  installModelsConfigTestHooks,
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
  it("fills missing provider.apiKey from env var name when models exist", async () => {
    await withTempHome(async () => {
      const prevKey = process.env.MINIMAX_API_KEY;
      process.env.MINIMAX_API_KEY = "sk-minimax-test";
      try {
<<<<<<< HEAD
        const { ensureMoltbotModelsJson } = await import("./models-config.js");
        const { resolveMoltbotAgentDir } = await import("./agent-paths.js");

        const cfg: MoltbotConfig = {
=======
        const cfg: OpenClawConfig = {
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)
          models: {
            providers: {
              minimax: {
                baseUrl: "https://api.minimax.io/anthropic",
                api: "anthropic-messages",
                models: [
                  {
                    id: "MiniMax-M2.1",
                    name: "MiniMax M2.1",
                    reasoning: false,
                    input: ["text"],
                    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                    contextWindow: 200000,
                    maxTokens: 8192,
                  },
                ],
              },
            },
          },
        };

        await ensureMoltbotModelsJson(cfg);

        const modelPath = path.join(resolveMoltbotAgentDir(), "models.json");
        const raw = await fs.readFile(modelPath, "utf8");
        const parsed = JSON.parse(raw) as {
          providers: Record<string, { apiKey?: string; models?: Array<{ id: string }> }>;
        };
        expect(parsed.providers.minimax?.apiKey).toBe("MINIMAX_API_KEY");
        const ids = parsed.providers.minimax?.models?.map((model) => model.id);
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
  it("merges providers by default", async () => {
    await withTempHome(async () => {
<<<<<<< HEAD
      vi.resetModules();
      const { ensureMoltbotModelsJson } = await import("./models-config.js");
      const { resolveMoltbotAgentDir } = await import("./agent-paths.js");

      const agentDir = resolveMoltbotAgentDir();
=======
      const agentDir = resolveOpenClawAgentDir();
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)
      await fs.mkdir(agentDir, { recursive: true });
      await fs.writeFile(
        path.join(agentDir, "models.json"),
        JSON.stringify(
          {
            providers: {
              existing: {
                baseUrl: "http://localhost:1234/v1",
                apiKey: "EXISTING_KEY",
                api: "openai-completions",
                models: [
                  {
                    id: "existing-model",
                    name: "Existing",
                    api: "openai-completions",
                    reasoning: false,
                    input: ["text"],
                    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                    contextWindow: 8192,
                    maxTokens: 2048,
                  },
                ],
              },
            },
          },
          null,
          2,
        ),
        "utf8",
      );

<<<<<<< HEAD
      await ensureMoltbotModelsJson(MODELS_CONFIG);
=======
      await ensureOpenClawModelsJson(CUSTOM_PROXY_MODELS_CONFIG);
>>>>>>> 96f80d6d8 (refactor(test): share models-config e2e setup)

      const raw = await fs.readFile(path.join(agentDir, "models.json"), "utf8");
      const parsed = JSON.parse(raw) as {
        providers: Record<string, { baseUrl?: string }>;
      };

      expect(parsed.providers.existing?.baseUrl).toBe("http://localhost:1234/v1");
      expect(parsed.providers["custom-proxy"]?.baseUrl).toBe("http://localhost:4000/v1");
    });
  });
});
