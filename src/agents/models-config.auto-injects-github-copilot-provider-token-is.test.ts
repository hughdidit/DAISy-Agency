import fs from "node:fs/promises";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
=======
=======
import { describe, expect, it, vi } from "vitest";
=======
import { describe, expect, it } from "vitest";
<<<<<<< HEAD
>>>>>>> 0900ec38a (test(agents): dedupe copilot models-config token setup)
import { captureEnv } from "../test-utils/env.js";
=======
import { withEnvAsync } from "../test-utils/env.js";
>>>>>>> bc037dfe0 (refactor(test): dedupe provider env setup in model config tests)
import {
  installModelsConfigTestHooks,
  mockCopilotTokenExchangeSuccess,
  withCopilotGithubToken,
  withModelsTempHome as withTempHome,
} from "./models-config.e2e-harness.js";
>>>>>>> 96f80d6d8 (refactor(test): share models-config e2e setup)
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
  it("auto-injects github-copilot provider when token is present", async () => {
    await withTempHome(async (home) => {
<<<<<<< HEAD
      const envSnapshot = captureEnv(["COPILOT_GITHUB_TOKEN"]);
      process.env.COPILOT_GITHUB_TOKEN = "gh-token";
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
<<<<<<< HEAD
        vi.resetModules();

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

=======
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)
=======
      await withCopilotGithubToken("gh-token", async () => {
>>>>>>> 0900ec38a (test(agents): dedupe copilot models-config token setup)
        const agentDir = path.join(home, "agent-default-base-url");
        await ensureMoltbotModelsJson({ models: { providers: {} } }, agentDir);

        const raw = await fs.readFile(path.join(agentDir, "models.json"), "utf8");
        const parsed = JSON.parse(raw) as {
          providers: Record<string, { baseUrl?: string; models?: unknown[] }>;
        };

        expect(parsed.providers["github-copilot"]?.baseUrl).toBe("https://api.copilot.example");
        expect(parsed.providers["github-copilot"]?.models?.length ?? 0).toBe(0);
      });
    });
  });

  it("prefers COPILOT_GITHUB_TOKEN over GH_TOKEN and GITHUB_TOKEN", async () => {
    await withTempHome(async () => {
      await withEnvAsync(
        {
          COPILOT_GITHUB_TOKEN: "copilot-token",
          GH_TOKEN: "gh-token",
          GITHUB_TOKEN: "github-token",
        },
        async () => {
          const fetchMock = mockCopilotTokenExchangeSuccess();

          await ensureOpenClawModelsJson({ models: { providers: {} } });

<<<<<<< HEAD
      try {
<<<<<<< HEAD
        vi.resetModules();

        const resolveCopilotApiToken = vi.fn().mockResolvedValue({
          token: "copilot",
          expiresAt: Date.now() + 60 * 60 * 1000,
          source: "mock",
          baseUrl: "https://api.copilot.example",
        });

        vi.doMock("../providers/github-copilot-token.js", () => ({
          DEFAULT_COPILOT_API_BASE_URL: "https://api.individual.githubcopilot.com",
          resolveCopilotApiToken,
        }));

        const { ensureMoltbotModelsJson } = await import("./models-config.js");

        await ensureMoltbotModelsJson({ models: { providers: {} } });
=======
        await ensureOpenClawModelsJson({ models: { providers: {} } });
>>>>>>> 02fe0c840 (perf(test): remove resetModules from auth/models/subagent suites)

        const [, opts] = fetchMock.mock.calls[0] as [string, { headers?: Record<string, string> }];
        expect(opts?.headers?.Authorization).toBe("Bearer copilot-token");
      } finally {
        envSnapshot.restore();
      }
=======
          const [, opts] = fetchMock.mock.calls[0] as [
            string,
            { headers?: Record<string, string> },
          ];
          expect(opts?.headers?.Authorization).toBe("Bearer copilot-token");
        },
      );
>>>>>>> bc037dfe0 (refactor(test): dedupe provider env setup in model config tests)
    });
  });
});
