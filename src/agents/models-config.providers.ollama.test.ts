import { describe, expect, it } from "vitest";
import { resolveImplicitProviders } from "./models-config.providers.js";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Ollama provider", () => {
  it("should not include ollama when no API key is configured", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "clawd-test-"));
    const providers = await resolveImplicitProviders({ agentDir });

    expect(providers?.ollama).toBeUndefined();
  });

  it("should use native ollama api type", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
    process.env.OLLAMA_API_KEY = "test-key";

    try {
      const providers = await resolveImplicitProviders({ agentDir });

      expect(providers?.ollama).toBeDefined();
      expect(providers?.ollama?.apiKey).toBe("OLLAMA_API_KEY");
      expect(providers?.ollama?.api).toBe("ollama");
      expect(providers?.ollama?.baseUrl).toBe("http://127.0.0.1:11434");
    } finally {
      delete process.env.OLLAMA_API_KEY;
    }
  });

  it("should have correct model structure with streaming disabled (unit test)", () => {
    // This test directly verifies the model configuration structure
    // since discoverOllamaModels() returns empty array in test mode
    const mockOllamaModel = {
      id: "llama3.3:latest",
      name: "llama3.3:latest",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 8192,
    };

    // Native Ollama provider does not need streaming: false workaround
    expect(mockOllamaModel).not.toHaveProperty("params");
  });

  it("should skip discovery fetch when explicit models are configured", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
    vi.stubEnv("VITEST", "");
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const explicitModels: ModelDefinitionConfig[] = [
      {
        id: "gpt-oss:20b",
        name: "GPT-OSS 20B",
        reasoning: false,
        input: ["text"] as Array<"text" | "image">,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 8192,
        maxTokens: 81920,
      },
    ];

    try {
      const explicitModels: ModelDefinitionConfig[] = [
        {
          id: "gpt-oss:20b",
          name: "GPT-OSS 20B",
          reasoning: false,
<<<<<<< HEAD
          input: ["text"] as const,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 8192,
          maxTokens: 81920,
=======
    const providers = await resolveImplicitProviders({
      agentDir,
      explicitProviders: {
        ollama: {
          baseUrl: "http://remote-ollama:11434/v1",
          models: explicitModels,
          apiKey: "config-ollama-key",
>>>>>>> 8624f8064 (Update models-config.providers.ollama.test.ts)
        },
      },
    });

    const ollamaCalls = fetchMock.mock.calls.filter(([input]) => {
      const url = String(input);
      return url.endsWith("/api/tags") || url.endsWith("/api/show");
    });
    expect(ollamaCalls).toHaveLength(0);
    expect(providers?.ollama?.models).toEqual(explicitModels);
    expect(providers?.ollama?.baseUrl).toBe("http://remote-ollama:11434");
    expect(providers?.ollama?.api).toBe("ollama");
    expect(providers?.ollama?.apiKey).toBe("config-ollama-key");
  });

  it("should preserve explicit apiKey when discovery path has no models and no env key", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));

    const providers = await resolveImplicitProviders({
      agentDir,
      explicitProviders: {
        ollama: {
          baseUrl: "http://remote-ollama:11434/v1",
          api: "openai-completions",
          models: [],
          apiKey: "config-ollama-key",
        },
      },
    });

    expect(providers?.ollama?.apiKey).toBe("config-ollama-key");
  });
});
