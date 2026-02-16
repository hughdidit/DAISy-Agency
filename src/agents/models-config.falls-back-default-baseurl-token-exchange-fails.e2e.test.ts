import fs from "node:fs/promises";
import path from "node:path";
<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
=======
=======
import { describe, expect, it, vi } from "vitest";
>>>>>>> 96f80d6d8 (refactor(test): share models-config e2e setup)
import { DEFAULT_COPILOT_API_BASE_URL } from "../providers/github-copilot-token.js";
import { captureEnv } from "../test-utils/env.js";
import {
  installModelsConfigTestHooks,
  withModelsTempHome as withTempHome,
} from "./models-config.e2e-harness.js";
import { ensureOpenClawModelsJson } from "./models-config.js";
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)

<<<<<<< HEAD
async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(fn, { prefix: "moltbot-models-" });
}

const _MODELS_CONFIG: MoltbotConfig = {
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
installModelsConfigTestHooks({ restoreFetch: true });
>>>>>>> 96f80d6d8 (refactor(test): share models-config e2e setup)

describe("models-config", () => {
  it("falls back to default baseUrl when token exchange fails", async () => {
    await withTempHome(async () => {
      const envSnapshot = captureEnv(["COPILOT_GITHUB_TOKEN"]);
      process.env.COPILOT_GITHUB_TOKEN = "gh-token";
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: "boom" }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      try {
<<<<<<< HEAD
        vi.resetModules();

        vi.doMock("../providers/github-copilot-token.js", () => ({
          DEFAULT_COPILOT_API_BASE_URL: "https://api.default.test",
          resolveCopilotApiToken: vi.fn().mockRejectedValue(new Error("boom")),
        }));

        const { ensureMoltbotModelsJson } = await import("./models-config.js");
        const { resolveMoltbotAgentDir } = await import("./agent-paths.js");

        await ensureMoltbotModelsJson({ models: { providers: {} } });

        const agentDir = resolveMoltbotAgentDir();
=======
        await ensureOpenClawModelsJson({ models: { providers: {} } });

        const agentDir = path.join(process.env.HOME ?? "", ".openclaw", "agents", "main", "agent");
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)
        const raw = await fs.readFile(path.join(agentDir, "models.json"), "utf8");
        const parsed = JSON.parse(raw) as {
          providers: Record<string, { baseUrl?: string }>;
        };

        expect(parsed.providers["github-copilot"]?.baseUrl).toBe(DEFAULT_COPILOT_API_BASE_URL);
      } finally {
        envSnapshot.restore();
      }
    });
  });

  it("uses agentDir override auth profiles for copilot injection", async () => {
    await withTempHome(async (home) => {
      const envSnapshot = captureEnv(["COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"]);
      delete process.env.COPILOT_GITHUB_TOKEN;
      delete process.env.GH_TOKEN;
      delete process.env.GITHUB_TOKEN;

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          token: "copilot-token;proxy-ep=proxy.copilot.example",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      try {
        const agentDir = path.join(home, "agent-override");
        await fs.mkdir(agentDir, { recursive: true });
        await fs.writeFile(
          path.join(agentDir, "auth-profiles.json"),
          JSON.stringify(
            {
              version: 1,
              profiles: {
                "github-copilot:github": {
                  type: "token",
                  provider: "github-copilot",
                  token: "gh-profile-token",
                },
              },
            },
            null,
            2,
          ),
        );

<<<<<<< HEAD
        vi.doMock("../providers/github-copilot-token.js", () => ({
          DEFAULT_COPILOT_API_BASE_URL: "https://api.individual.githubcopilot.com",
          resolveCopilotApiToken: vi.fn().mockResolvedValue({
            token: "copilot",
            expiresAt: Date.now() + 60 * 60 * 1000,
            source: "mock",
            baseUrl: "https://api.copilot.example",
          }),
        }));

        const { ensureMoltbotModelsJson } = await import("./models-config.js");

        await ensureMoltbotModelsJson({ models: { providers: {} } }, agentDir);
=======
        await ensureOpenClawModelsJson({ models: { providers: {} } }, agentDir);
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)

        const raw = await fs.readFile(path.join(agentDir, "models.json"), "utf8");
        const parsed = JSON.parse(raw) as {
          providers: Record<string, { baseUrl?: string }>;
        };

        expect(parsed.providers["github-copilot"]?.baseUrl).toBe("https://api.copilot.example");
      } finally {
        envSnapshot.restore();
      }
    });
  });
});
