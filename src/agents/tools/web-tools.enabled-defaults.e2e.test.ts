import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createWebFetchTool, createWebSearchTool } from "./web-tools.js";

function installMockFetch(payload: unknown) {
  const mockFetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(payload),
    } as Response),
  );
  // @ts-expect-error mock fetch
  global.fetch = mockFetch;
  return mockFetch;
}

function createPerplexitySearchTool(perplexityConfig?: { apiKey?: string; baseUrl?: string }) {
  return createWebSearchTool({
    config: {
      tools: {
        web: {
          search: {
            provider: "perplexity",
            ...(perplexityConfig ? { perplexity: perplexityConfig } : {}),
          },
        },
      },
    },
    sandboxed: true,
  });
}

describe("web tools defaults", () => {
  it("enables web_fetch by default (non-sandbox)", () => {
    const tool = createWebFetchTool({ config: {}, sandboxed: false });
    expect(tool?.name).toBe("web_fetch");
  });

  it("disables web_fetch when explicitly disabled", () => {
    const tool = createWebFetchTool({
      config: { tools: { web: { fetch: { enabled: false } } } },
      sandboxed: false,
    });
    expect(tool).toBeNull();
  });

  it("enables web_search by default", () => {
    const tool = createWebSearchTool({ config: {}, sandboxed: false });
    expect(tool?.name).toBe("web_search");
  });
});

describe("web_search country and language parameters", () => {
  const priorFetch = global.fetch;

  beforeEach(() => {
    vi.stubEnv("BRAVE_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // @ts-expect-error global fetch cleanup
    global.fetch = priorFetch;
  });

  it("should pass country parameter to Brave API", async () => {
    const mockFetch = installMockFetch({ web: { results: [] } });
    const tool = createWebSearchTool({ config: undefined, sandboxed: true });
    expect(tool).not.toBeNull();

    await tool?.execute?.(1, { query: "test", country: "DE" });

    expect(mockFetch).toHaveBeenCalled();
    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.get("country")).toBe("DE");
  });

  it("should pass search_lang parameter to Brave API", async () => {
    const mockFetch = installMockFetch({ web: { results: [] } });
    const tool = createWebSearchTool({ config: undefined, sandboxed: true });
    await tool?.execute?.(1, { query: "test", search_lang: "de" });

    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.get("search_lang")).toBe("de");
  });

  it("should pass ui_lang parameter to Brave API", async () => {
    const mockFetch = installMockFetch({ web: { results: [] } });
    const tool = createWebSearchTool({ config: undefined, sandboxed: true });
    await tool?.execute?.(1, { query: "test", ui_lang: "de" });

    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.get("ui_lang")).toBe("de");
  });

  it("should pass freshness parameter to Brave API", async () => {
    const mockFetch = installMockFetch({ web: { results: [] } });
    const tool = createWebSearchTool({ config: undefined, sandboxed: true });
    await tool?.execute?.(1, { query: "test", freshness: "pw" });

    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.get("freshness")).toBe("pw");
  });

  it("rejects invalid freshness values", async () => {
    const mockFetch = installMockFetch({ web: { results: [] } });
    const tool = createWebSearchTool({ config: undefined, sandboxed: true });
    const result = await tool?.execute?.(1, { query: "test", freshness: "yesterday" });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result?.details).toMatchObject({ error: "invalid_freshness" });
  });
});

describe("web_search perplexity baseUrl defaults", () => {
  const priorFetch = global.fetch;

  afterEach(() => {
    vi.unstubAllEnvs();
    // @ts-expect-error global fetch cleanup
    global.fetch = priorFetch;
  });

  it("defaults to Perplexity direct when PERPLEXITY_API_KEY is set", async () => {
    vi.stubEnv("PERPLEXITY_API_KEY", "pplx-test");
    const mockFetch = installMockFetch({
      choices: [{ message: { content: "ok" } }],
      citations: [],
    });
    const tool = createPerplexitySearchTool();
    await tool?.execute?.(1, { query: "test-openrouter" });

    expect(mockFetch).toHaveBeenCalled();
    expect(mockFetch.mock.calls[0]?.[0]).toBe("https://api.perplexity.ai/chat/completions");
    const request = mockFetch.mock.calls[0]?.[1] as RequestInit | undefined;
    const requestBody = request?.body;
    const body = JSON.parse(typeof requestBody === "string" ? requestBody : "{}") as {
      model?: string;
    };
    expect(body.model).toBe("sonar-pro");
  });

  it("passes freshness to Perplexity provider as search_recency_filter", async () => {
    vi.stubEnv("PERPLEXITY_API_KEY", "pplx-test");
    const mockFetch = installMockFetch({
      choices: [{ message: { content: "ok" } }],
      citations: [],
    });
    const tool = createPerplexitySearchTool();
    await tool?.execute?.(1, { query: "perplexity-freshness-test", freshness: "pw" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.search_recency_filter).toBe("week");
  });

  it("defaults to OpenRouter when OPENROUTER_API_KEY is set", async () => {
    vi.stubEnv("PERPLEXITY_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    const mockFetch = installMockFetch({
      choices: [{ message: { content: "ok" } }],
      citations: [],
    });
    const tool = createPerplexitySearchTool();
    await tool?.execute?.(1, { query: "test-openrouter-env" });

    expect(mockFetch).toHaveBeenCalled();
    expect(mockFetch.mock.calls[0]?.[0]).toBe("https://openrouter.ai/api/v1/chat/completions");
    const request = mockFetch.mock.calls[0]?.[1] as RequestInit | undefined;
    const requestBody = request?.body;
    const body = JSON.parse(typeof requestBody === "string" ? requestBody : "{}") as {
      model?: string;
    };
    expect(body.model).toBe("perplexity/sonar-pro");
  });

  it("prefers PERPLEXITY_API_KEY when both env keys are set", async () => {
    vi.stubEnv("PERPLEXITY_API_KEY", "pplx-test");
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    const mockFetch = installMockFetch({
      choices: [{ message: { content: "ok" } }],
      citations: [],
    });
    const tool = createPerplexitySearchTool();
    await tool?.execute?.(1, { query: "test-both-env" });

    expect(mockFetch).toHaveBeenCalled();
    expect(mockFetch.mock.calls[0]?.[0]).toBe("https://api.perplexity.ai/chat/completions");
  });

  it("uses configured baseUrl even when PERPLEXITY_API_KEY is set", async () => {
    vi.stubEnv("PERPLEXITY_API_KEY", "pplx-test");
    const mockFetch = installMockFetch({
      choices: [{ message: { content: "ok" } }],
      citations: [],
    });
    const tool = createPerplexitySearchTool({ baseUrl: "https://example.com/pplx" });
    await tool?.execute?.(1, { query: "test-config-baseurl" });

    expect(mockFetch).toHaveBeenCalled();
    expect(mockFetch.mock.calls[0]?.[0]).toBe("https://example.com/pplx/chat/completions");
  });

  it("defaults to Perplexity direct when apiKey looks like Perplexity", async () => {
    const mockFetch = installMockFetch({
      choices: [{ message: { content: "ok" } }],
      citations: [],
    });
    const tool = createPerplexitySearchTool({ apiKey: "pplx-config" });
    await tool?.execute?.(1, { query: "test-config-apikey" });

    expect(mockFetch).toHaveBeenCalled();
    expect(mockFetch.mock.calls[0]?.[0]).toBe("https://api.perplexity.ai/chat/completions");
  });

  it("defaults to OpenRouter when apiKey looks like OpenRouter", async () => {
    const mockFetch = installMockFetch({
      choices: [{ message: { content: "ok" } }],
      citations: [],
    });
    const tool = createPerplexitySearchTool({ apiKey: "sk-or-v1-test" });
    await tool?.execute?.(1, { query: "test-openrouter-config" });

    expect(mockFetch).toHaveBeenCalled();
    expect(mockFetch.mock.calls[0]?.[0]).toBe("https://openrouter.ai/api/v1/chat/completions");
  });
});
