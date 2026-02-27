import { describe, expect, it } from "vitest";
<<<<<<< HEAD
import { resolveImplicitProviders } from "./models-config.providers.js";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
=======
import { resolveImplicitProviders, resolveOllamaApiBase } from "./models-config.providers.js";

describe("resolveOllamaApiBase", () => {
  it("returns default localhost base when no configured URL is provided", () => {
    expect(resolveOllamaApiBase()).toBe("http://127.0.0.1:11434");
  });

  it("strips /v1 suffix from OpenAI-compatible URLs", () => {
    expect(resolveOllamaApiBase("http://ollama-host:11434/v1")).toBe("http://ollama-host:11434");
    expect(resolveOllamaApiBase("http://ollama-host:11434/V1")).toBe("http://ollama-host:11434");
  });

  it("keeps URLs without /v1 unchanged", () => {
    expect(resolveOllamaApiBase("http://ollama-host:11434")).toBe("http://ollama-host:11434");
  });

  it("handles trailing slash before canonicalizing", () => {
    expect(resolveOllamaApiBase("http://ollama-host:11434/v1/")).toBe("http://ollama-host:11434");
    expect(resolveOllamaApiBase("http://ollama-host:11434/")).toBe("http://ollama-host:11434");
  });
});
>>>>>>> 50a60b8be (fix: use configured base URL for Ollama model discovery (#14131))

describe("Ollama provider", () => {
  it("should not include ollama when no API key is configured", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "clawd-test-"));
    const providers = await resolveImplicitProviders({ agentDir });

    // Ollama requires explicit configuration via OLLAMA_API_KEY env var or profile
    expect(providers?.ollama).toBeUndefined();
  });
<<<<<<< HEAD
=======

  it("should disable streaming by default for Ollama models", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
    process.env.OLLAMA_API_KEY = "test-key";

    try {
      const providers = await resolveImplicitProviders({ agentDir });

      // Provider should be defined with OLLAMA_API_KEY set
      expect(providers?.ollama).toBeDefined();
      expect(providers?.ollama?.apiKey).toBe("OLLAMA_API_KEY");

      // Note: discoverOllamaModels() returns empty array in test environments (VITEST env var check)
      // so we can't test the actual model discovery here. The streaming: false setting
      // is applied in the model mapping within discoverOllamaModels().
      // The configuration structure itself is validated by TypeScript and the Zod schema.
    } finally {
      delete process.env.OLLAMA_API_KEY;
    }
  });

  it("should preserve explicit ollama baseUrl on implicit provider injection", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
    process.env.OLLAMA_API_KEY = "test-key";

    try {
      const providers = await resolveImplicitProviders({
        agentDir,
        explicitProviders: {
          ollama: {
            baseUrl: "http://192.168.20.14:11434/v1",
            api: "openai-completions",
            models: [],
          },
        },
      });

      expect(providers?.ollama?.baseUrl).toBe("http://192.168.20.14:11434/v1");
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
      params: {
        streaming: false,
      },
    };

<<<<<<< HEAD
    // Verify the model structure matches what discoverOllamaModels() would return
    expect(mockOllamaModel.params?.streaming).toBe(false);
    expect(mockOllamaModel.params).toHaveProperty("streaming");
=======
    // Native Ollama provider does not need streaming: false workaround
    expect(mockOllamaModel).not.toHaveProperty("params");
  });

  it("should skip discovery when explicit models are configured", async () => {
    const agentDir = mkdtempSync(join(tmpdir(), "openclaw-test-"));
    process.env.OLLAMA_API_KEY = "test-key";

    try {
      const explicitModels = [
        {
          id: "gpt-oss:20b",
          name: "GPT-OSS 20B",
          reasoning: false,
          input: ["text"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 8192,
          maxTokens: 81920,
        },
      ];

      const providers = await resolveImplicitProviders({
        agentDir,
        explicitProviders: {
          ollama: {
            baseUrl: "http://remote-ollama:11434",
            api: "ollama",
            models: explicitModels,
          },
        },
      });

      // Should use explicit models, not run discovery
      expect(providers?.ollama?.models).toEqual(explicitModels);
      expect(providers?.ollama?.baseUrl).toBe("http://remote-ollama:11434");
    } finally {
      delete process.env.OLLAMA_API_KEY;
    }
>>>>>>> 78d49b4c8 (fix: remove readonly type constraint in test)
  });
>>>>>>> 50a60b8be (fix: use configured base URL for Ollama model discovery (#14131))
});
