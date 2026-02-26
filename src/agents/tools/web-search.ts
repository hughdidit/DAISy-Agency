import { Type } from "@sinclair/typebox";

import type { MoltbotConfig } from "../../config/config.js";
import { formatCliCommand } from "../../cli/command-format.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readNumberParam, readStringParam } from "./common.js";
import {
  CacheEntry,
  DEFAULT_CACHE_TTL_MINUTES,
  DEFAULT_TIMEOUT_SECONDS,
  normalizeCacheKey,
  readCache,
  readResponseText,
  resolveCacheTtlMs,
  resolveTimeoutSeconds,
  writeCache,
} from "./web-shared.js";

const SEARCH_PROVIDERS = ["brave", "perplexity"] as const;
const DEFAULT_SEARCH_COUNT = 5;
const MAX_SEARCH_COUNT = 10;

const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const DEFAULT_PERPLEXITY_BASE_URL = "https://openrouter.ai/api/v1";
const PERPLEXITY_DIRECT_BASE_URL = "https://api.perplexity.ai";
const DEFAULT_PERPLEXITY_MODEL = "perplexity/sonar-pro";
const PERPLEXITY_KEY_PREFIXES = ["pplx-"];
const OPENROUTER_KEY_PREFIXES = ["sk-or-"];

const SEARCH_CACHE = new Map<string, CacheEntry<Record<string, unknown>>>();
const BRAVE_FRESHNESS_SHORTCUTS = new Set(["pd", "pw", "pm", "py"]);
const BRAVE_FRESHNESS_RANGE = /^(\d{4}-\d{2}-\d{2})to(\d{4}-\d{2}-\d{2})$/;

const WebSearchSchema = Type.Object({
  query: Type.String({ description: "Search query string." }),
  count: Type.Optional(
    Type.Number({
      description: "Number of results to return (1-10).",
      minimum: 1,
      maximum: MAX_SEARCH_COUNT,
    }),
  ),
  country: Type.Optional(
    Type.String({
      description:
        "2-letter country code for region-specific results (e.g., 'DE', 'US', 'ALL'). Default: 'US'.",
    }),
  ),
  search_lang: Type.Optional(
    Type.String({
      description: "ISO language code for search results (e.g., 'de', 'en', 'fr').",
    }),
  ),
  ui_lang: Type.Optional(
    Type.String({
      description: "ISO language code for UI elements.",
    }),
  ),
  freshness: Type.Optional(
    Type.String({
      description:
        "Filter results by discovery time (Brave only). Values: 'pd' (past 24h), 'pw' (past week), 'pm' (past month), 'py' (past year), or date range 'YYYY-MM-DDtoYYYY-MM-DD'.",
    }),
  ),
});

type WebSearchConfig = NonNullable<MoltbotConfig["tools"]>["web"] extends infer Web
  ? Web extends { search?: infer Search }
    ? Search
    : undefined
  : undefined;

type BraveSearchResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
};

type BraveSearchResponse = {
  web?: {
    results?: BraveSearchResult[];
  };
};

type PerplexityConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

type PerplexityApiKeySource = "config" | "perplexity_env" | "openrouter_env" | "none";

<<<<<<< HEAD
=======
type GrokConfig = {
  apiKey?: string;
  model?: string;
  inlineCitations?: boolean;
};

type GrokSearchResponse = {
  output?: Array<{
    type?: string;
    role?: string;
    text?: string; // present when type === "output_text" (top-level output_text block)
    content?: Array<{
      type?: string;
      text?: string;
      annotations?: Array<{
        type?: string;
        url?: string;
        start_index?: number;
        end_index?: number;
      }>;
    }>;
    annotations?: Array<{
      type?: string;
      url?: string;
      start_index?: number;
      end_index?: number;
    }>;
  }>;
  output_text?: string; // deprecated field - kept for backwards compatibility
  citations?: string[];
  inline_citations?: Array<{
    start_index: number;
    end_index: number;
    url: string;
  }>;
};

>>>>>>> 21448508a (fix: Grok web_search extracts output_text blocks at top level (openclaw#20508) thanks @echoVic)
type PerplexitySearchResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  citations?: string[];
};

type PerplexityBaseUrlHint = "direct" | "openrouter";

<<<<<<< HEAD
function resolveSearchConfig(cfg?: MoltbotConfig): WebSearchConfig {
=======
function extractGrokContent(data: GrokSearchResponse): {
  text: string | undefined;
  annotationCitations: string[];
} {
  // xAI Responses API format: find the message output with text content
  for (const output of data.output ?? []) {
    if (output.type === "message") {
      for (const block of output.content ?? []) {
        if (block.type === "output_text" && typeof block.text === "string" && block.text) {
          const urls = (block.annotations ?? [])
            .filter((a) => a.type === "url_citation" && typeof a.url === "string")
            .map((a) => a.url as string);
          return { text: block.text, annotationCitations: [...new Set(urls)] };
        }
      }
    }
    // Some xAI responses place output_text blocks directly in the output array
    // without a message wrapper.
    if (
      output.type === "output_text" &&
      "text" in output &&
      typeof output.text === "string" &&
      output.text
    ) {
      const rawAnnotations =
        "annotations" in output && Array.isArray(output.annotations) ? output.annotations : [];
      const urls = rawAnnotations
        .filter(
          (a: Record<string, unknown>) => a.type === "url_citation" && typeof a.url === "string",
        )
        .map((a: Record<string, unknown>) => a.url as string);
      return { text: output.text, annotationCitations: [...new Set(urls)] };
    }
  }
  // Fallback: deprecated output_text field
  const text = typeof data.output_text === "string" ? data.output_text : undefined;
  return { text, annotationCitations: [] };
}

function resolveSearchConfig(cfg?: OpenClawConfig): WebSearchConfig {
>>>>>>> 21448508a (fix: Grok web_search extracts output_text blocks at top level (openclaw#20508) thanks @echoVic)
  const search = cfg?.tools?.web?.search;
  if (!search || typeof search !== "object") return undefined;
  return search as WebSearchConfig;
}

function resolveSearchEnabled(params: { search?: WebSearchConfig; sandboxed?: boolean }): boolean {
  if (typeof params.search?.enabled === "boolean") return params.search.enabled;
  if (params.sandboxed) return true;
  return true;
}

function resolveSearchApiKey(search?: WebSearchConfig): string | undefined {
  const fromConfig =
    search && "apiKey" in search && typeof search.apiKey === "string" ? search.apiKey.trim() : "";
  const fromEnv = (process.env.BRAVE_API_KEY ?? "").trim();
  return fromConfig || fromEnv || undefined;
}

function missingSearchKeyPayload(provider: (typeof SEARCH_PROVIDERS)[number]) {
  if (provider === "perplexity") {
    return {
      error: "missing_perplexity_api_key",
      message:
        "web_search (perplexity) needs an API key. Set PERPLEXITY_API_KEY or OPENROUTER_API_KEY in the Gateway environment, or configure tools.web.search.perplexity.apiKey.",
      docs: "https://docs.molt.bot/tools/web",
    };
  }
  return {
    error: "missing_brave_api_key",
    message: `web_search needs a Brave Search API key. Run \`${formatCliCommand("moltbot configure --section web")}\` to store it, or set BRAVE_API_KEY in the Gateway environment.`,
    docs: "https://docs.molt.bot/tools/web",
  };
}

function resolveSearchProvider(search?: WebSearchConfig): (typeof SEARCH_PROVIDERS)[number] {
  const raw =
    search && "provider" in search && typeof search.provider === "string"
      ? search.provider.trim().toLowerCase()
      : "";
  if (raw === "perplexity") return "perplexity";
  if (raw === "brave") return "brave";
  return "brave";
}

function resolvePerplexityConfig(search?: WebSearchConfig): PerplexityConfig {
  if (!search || typeof search !== "object") return {};
  const perplexity = "perplexity" in search ? search.perplexity : undefined;
  if (!perplexity || typeof perplexity !== "object") return {};
  return perplexity as PerplexityConfig;
}

function resolvePerplexityApiKey(perplexity?: PerplexityConfig): {
  apiKey?: string;
  source: PerplexityApiKeySource;
} {
  const fromConfig = normalizeApiKey(perplexity?.apiKey);
  if (fromConfig) {
    return { apiKey: fromConfig, source: "config" };
  }

  const fromEnvPerplexity = normalizeApiKey(process.env.PERPLEXITY_API_KEY);
  if (fromEnvPerplexity) {
    return { apiKey: fromEnvPerplexity, source: "perplexity_env" };
  }

  const fromEnvOpenRouter = normalizeApiKey(process.env.OPENROUTER_API_KEY);
  if (fromEnvOpenRouter) {
    return { apiKey: fromEnvOpenRouter, source: "openrouter_env" };
  }

  return { apiKey: undefined, source: "none" };
}

function normalizeApiKey(key: unknown): string {
  return typeof key === "string" ? key.trim() : "";
}

function inferPerplexityBaseUrlFromApiKey(apiKey?: string): PerplexityBaseUrlHint | undefined {
  if (!apiKey) return undefined;
  const normalized = apiKey.toLowerCase();
  if (PERPLEXITY_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return "direct";
  }
  if (OPENROUTER_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return "openrouter";
  }
  return undefined;
}

function resolvePerplexityBaseUrl(
  perplexity?: PerplexityConfig,
  apiKeySource: PerplexityApiKeySource = "none",
  apiKey?: string,
): string {
  const fromConfig =
    perplexity && "baseUrl" in perplexity && typeof perplexity.baseUrl === "string"
      ? perplexity.baseUrl.trim()
      : "";
  if (fromConfig) return fromConfig;
  if (apiKeySource === "perplexity_env") return PERPLEXITY_DIRECT_BASE_URL;
  if (apiKeySource === "openrouter_env") return DEFAULT_PERPLEXITY_BASE_URL;
  if (apiKeySource === "config") {
    const inferred = inferPerplexityBaseUrlFromApiKey(apiKey);
    if (inferred === "direct") return PERPLEXITY_DIRECT_BASE_URL;
    if (inferred === "openrouter") return DEFAULT_PERPLEXITY_BASE_URL;
  }
  return DEFAULT_PERPLEXITY_BASE_URL;
}

function resolvePerplexityModel(perplexity?: PerplexityConfig): string {
  const fromConfig =
    perplexity && "model" in perplexity && typeof perplexity.model === "string"
      ? perplexity.model.trim()
      : "";
  return fromConfig || DEFAULT_PERPLEXITY_MODEL;
}

<<<<<<< HEAD
=======
function resolveGrokConfig(search?: WebSearchConfig): GrokConfig {
  if (!search || typeof search !== "object") {
    return {};
  }
  const grok = "grok" in search ? search.grok : undefined;
  if (!grok || typeof grok !== "object") {
    return {};
  }
  return grok as GrokConfig;
}

function resolveGrokApiKey(grok?: GrokConfig): string | undefined {
  const fromConfig = normalizeApiKey(grok?.apiKey);
  if (fromConfig) {
    return fromConfig;
  }
  const fromEnv = normalizeApiKey(process.env.XAI_API_KEY);
  return fromEnv || undefined;
}

function resolveGrokModel(grok?: GrokConfig): string {
  const fromConfig =
    grok && "model" in grok && typeof grok.model === "string" ? grok.model.trim() : "";
  return fromConfig || DEFAULT_GROK_MODEL;
}

function resolveGrokInlineCitations(grok?: GrokConfig): boolean {
  return grok?.inlineCitations === true;
}

<<<<<<< HEAD
>>>>>>> c984e6d8d (fix: prevent false positive context overflow detection in conversation text (#2078))
=======
function resolveKimiConfig(search?: WebSearchConfig): KimiConfig {
  if (!search || typeof search !== "object") {
    return {};
  }
  const kimi = "kimi" in search ? search.kimi : undefined;
  if (!kimi || typeof kimi !== "object") {
    return {};
  }
  return kimi as KimiConfig;
}

function resolveKimiApiKey(kimi?: KimiConfig): string | undefined {
  const fromConfig = normalizeApiKey(kimi?.apiKey);
  if (fromConfig) {
    return fromConfig;
  }
  const fromEnvKimi = normalizeApiKey(process.env.KIMI_API_KEY);
  if (fromEnvKimi) {
    return fromEnvKimi;
  }
  const fromEnvMoonshot = normalizeApiKey(process.env.MOONSHOT_API_KEY);
  return fromEnvMoonshot || undefined;
}

function resolveKimiModel(kimi?: KimiConfig): string {
  const fromConfig =
    kimi && "model" in kimi && typeof kimi.model === "string" ? kimi.model.trim() : "";
  return fromConfig || DEFAULT_KIMI_MODEL;
}

function resolveKimiBaseUrl(kimi?: KimiConfig): string {
  const fromConfig =
    kimi && "baseUrl" in kimi && typeof kimi.baseUrl === "string" ? kimi.baseUrl.trim() : "";
  return fromConfig || DEFAULT_KIMI_BASE_URL;
}

function resolveGeminiConfig(search?: WebSearchConfig): GeminiConfig {
  if (!search || typeof search !== "object") {
    return {};
  }
  const gemini = "gemini" in search ? search.gemini : undefined;
  if (!gemini || typeof gemini !== "object") {
    return {};
  }
  return gemini as GeminiConfig;
}

function resolveGeminiApiKey(gemini?: GeminiConfig): string | undefined {
  const fromConfig = normalizeApiKey(gemini?.apiKey);
  if (fromConfig) {
    return fromConfig;
  }
  const fromEnv = normalizeApiKey(process.env.GEMINI_API_KEY);
  return fromEnv || undefined;
}

function resolveGeminiModel(gemini?: GeminiConfig): string {
  const fromConfig =
    gemini && "model" in gemini && typeof gemini.model === "string" ? gemini.model.trim() : "";
  return fromConfig || DEFAULT_GEMINI_MODEL;
}

async function fetchTrustedWebSearchEndpoint(params: {
  url: string;
  timeoutSeconds: number;
  init: RequestInit;
}): Promise<{ response: Response; release: () => Promise<void> }> {
  const { response, release } = await fetchWithSsrFGuard({
    url: params.url,
    init: params.init,
    timeoutMs: params.timeoutSeconds * 1000,
    policy: TRUSTED_NETWORK_SSRF_POLICY,
    proxy: "env",
  });
  return { response, release };
}

async function runGeminiSearch(params: {
  query: string;
  apiKey: string;
  model: string;
  timeoutSeconds: number;
}): Promise<{ content: string; citations: Array<{ url: string; title?: string }> }> {
  const endpoint = `${GEMINI_API_BASE}/models/${params.model}:generateContent`;

  const { response: res, release } = await fetchTrustedWebSearchEndpoint({
    url: endpoint,
    timeoutSeconds: params.timeoutSeconds,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": params.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: params.query }],
          },
        ],
        tools: [{ google_search: {} }],
      }),
    },
  });
  try {
    if (!res.ok) {
      const detailResult = await readResponseText(res, { maxBytes: 64_000 });
      // Strip API key from any error detail to prevent accidental key leakage in logs
      const safeDetail = (detailResult.text || res.statusText).replace(/key=[^&\s]+/gi, "key=***");
      throw new Error(`Gemini API error (${res.status}): ${safeDetail}`);
    }

    let data: GeminiGroundingResponse;
    try {
      data = (await res.json()) as GeminiGroundingResponse;
    } catch (err) {
      const safeError = String(err).replace(/key=[^&\s]+/gi, "key=***");
      throw new Error(`Gemini API returned invalid JSON: ${safeError}`, { cause: err });
    }

    if (data.error) {
      const rawMsg = data.error.message || data.error.status || "unknown";
      const safeMsg = rawMsg.replace(/key=[^&\s]+/gi, "key=***");
      throw new Error(`Gemini API error (${data.error.code}): ${safeMsg}`);
    }

    const candidate = data.candidates?.[0];
    const content =
      candidate?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("\n") ?? "No response";

    const groundingChunks = candidate?.groundingMetadata?.groundingChunks ?? [];
    const rawCitations = groundingChunks
      .filter((chunk) => chunk.web?.uri)
      .map((chunk) => ({
        url: chunk.web!.uri!,
        title: chunk.web?.title || undefined,
      }));

    // Resolve Google grounding redirect URLs to direct URLs with concurrency cap.
    // Gemini typically returns 3-8 citations; cap at 10 concurrent to be safe.
    const MAX_CONCURRENT_REDIRECTS = 10;
    const citations: Array<{ url: string; title?: string }> = [];
    for (let i = 0; i < rawCitations.length; i += MAX_CONCURRENT_REDIRECTS) {
      const batch = rawCitations.slice(i, i + MAX_CONCURRENT_REDIRECTS);
      const resolved = await Promise.all(
        batch.map(async (citation) => {
          const resolvedUrl = await resolveRedirectUrl(citation.url);
          return { ...citation, url: resolvedUrl };
        }),
      );
      citations.push(...resolved);
    }

    return { content, citations };
  } finally {
    await release();
  }
}

const REDIRECT_TIMEOUT_MS = 5000;

/**
 * Resolve a redirect URL to its final destination using a HEAD request.
 * Returns the original URL if resolution fails or times out.
 */
async function resolveRedirectUrl(url: string): Promise<string> {
  try {
    const { finalUrl, release } = await fetchWithSsrFGuard({
      url,
      init: { method: "HEAD" },
      timeoutMs: REDIRECT_TIMEOUT_MS,
      policy: TRUSTED_NETWORK_SSRF_POLICY,
      proxy: "env",
    });
    try {
      return finalUrl || url;
    } finally {
      await release();
    }
  } catch {
    return url;
  }
}

>>>>>>> 46003e85b (fix: unify web tool proxy path (#27430) (thanks @kevinWangSheng))
function resolveSearchCount(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const clamped = Math.max(1, Math.min(MAX_SEARCH_COUNT, Math.floor(parsed)));
  return clamped;
}

function normalizeFreshness(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase();
  if (BRAVE_FRESHNESS_SHORTCUTS.has(lower)) return lower;

  const match = trimmed.match(BRAVE_FRESHNESS_RANGE);
  if (!match) return undefined;

  const [, start, end] = match;
  if (!isValidIsoDate(start) || !isValidIsoDate(end)) return undefined;
  if (start > end) return undefined;

  return `${start}to${end}`;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function resolveSiteName(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

async function runPerplexitySearch(params: {
  query: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutSeconds: number;
}): Promise<{ content: string; citations: string[] }> {
  const endpoint = `${params.baseUrl.replace(/\/$/, "")}/chat/completions`;

<<<<<<< HEAD
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
      "HTTP-Referer": "https://molt.bot",
      "X-Title": "Moltbot Web Search",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        {
          role: "user",
          content: params.query,
        },
      ],
    }),
    signal: withTimeout(undefined, params.timeoutSeconds * 1000),
=======
  const { response: res, release } = await fetchTrustedWebSearchEndpoint({
    url: endpoint,
    timeoutSeconds: params.timeoutSeconds,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
        "HTTP-Referer": "https://openclaw.ai",
        "X-Title": "OpenClaw Web Search",
      },
      body: JSON.stringify(body),
    },
>>>>>>> 46003e85b (fix: unify web tool proxy path (#27430) (thanks @kevinWangSheng))
  });
  try {
    if (!res.ok) {
      return await throwWebSearchApiError(res, "Perplexity");
    }

<<<<<<< HEAD
  if (!res.ok) {
    const detail = await readResponseText(res);
    throw new Error(`Perplexity API error (${res.status}): ${detail || res.statusText}`);
=======
    const data = (await res.json()) as PerplexitySearchResponse;
    const content = data.choices?.[0]?.message?.content ?? "No response";
    const citations = data.citations ?? [];

    return { content, citations };
  } finally {
    await release();
>>>>>>> 46003e85b (fix: unify web tool proxy path (#27430) (thanks @kevinWangSheng))
  }
}

<<<<<<< HEAD
=======
async function runGrokSearch(params: {
  query: string;
  apiKey: string;
  model: string;
  timeoutSeconds: number;
  inlineCitations: boolean;
}): Promise<{
  content: string;
  citations: string[];
  inlineCitations?: GrokSearchResponse["inline_citations"];
}> {
  const body: Record<string, unknown> = {
    model: params.model,
    input: [
      {
        role: "user",
        content: params.query,
      },
    ],
    tools: [{ type: "web_search" }],
  };

  // Note: xAI's /v1/responses endpoint does not support the `include`
  // parameter (returns 400 "Argument not supported: include"). Inline
  // citations are returned automatically when available — we just parse
  // them from the response without requesting them explicitly (#12910).

  const { response: res, release } = await fetchTrustedWebSearchEndpoint({
    url: XAI_API_ENDPOINT,
    timeoutSeconds: params.timeoutSeconds,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify(body),
    },
  });
  try {
    if (!res.ok) {
      return await throwWebSearchApiError(res, "xAI");
    }

    const data = (await res.json()) as GrokSearchResponse;
    const { text: extractedText, annotationCitations } = extractGrokContent(data);
    const content = extractedText ?? "No response";
    // Prefer top-level citations; fall back to annotation-derived ones
    const citations = (data.citations ?? []).length > 0 ? data.citations! : annotationCitations;
    const inlineCitations = data.inline_citations;

    return { content, citations, inlineCitations };
  } finally {
    await release();
  }
}

function extractKimiMessageText(message: KimiMessage | undefined): string | undefined {
  const content = message?.content?.trim();
  if (content) {
    return content;
  }
  const reasoning = message?.reasoning_content?.trim();
  return reasoning || undefined;
}

function extractKimiCitations(data: KimiSearchResponse): string[] {
  const citations = (data.search_results ?? [])
    .map((entry) => entry.url?.trim())
    .filter((url): url is string => Boolean(url));

  for (const toolCall of data.choices?.[0]?.message?.tool_calls ?? []) {
    const rawArguments = toolCall.function?.arguments;
    if (!rawArguments) {
      continue;
    }
    try {
      const parsed = JSON.parse(rawArguments) as {
        search_results?: Array<{ url?: string }>;
        url?: string;
      };
      if (typeof parsed.url === "string" && parsed.url.trim()) {
        citations.push(parsed.url.trim());
      }
      for (const result of parsed.search_results ?? []) {
        if (typeof result.url === "string" && result.url.trim()) {
          citations.push(result.url.trim());
        }
      }
    } catch {
      // ignore malformed tool arguments
    }
  }

  return [...new Set(citations)];
}

function buildKimiToolResultContent(data: KimiSearchResponse): string {
  return JSON.stringify({
    search_results: (data.search_results ?? []).map((entry) => ({
      title: entry.title ?? "",
      url: entry.url ?? "",
      content: entry.content ?? "",
    })),
  });
}

async function runKimiSearch(params: {
  query: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutSeconds: number;
}): Promise<{ content: string; citations: string[] }> {
  const baseUrl = params.baseUrl.trim().replace(/\/$/, "");
  const endpoint = `${baseUrl}/chat/completions`;
  const messages: Array<Record<string, unknown>> = [
    {
      role: "user",
      content: params.query,
    },
  ];
  const collectedCitations = new Set<string>();
  const MAX_ROUNDS = 3;

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const { response: res, release } = await fetchTrustedWebSearchEndpoint({
      url: endpoint,
      timeoutSeconds: params.timeoutSeconds,
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          messages,
          tools: [KIMI_WEB_SEARCH_TOOL],
        }),
      },
    });
    try {
      if (!res.ok) {
        return await throwWebSearchApiError(res, "Kimi");
      }

      const data = (await res.json()) as KimiSearchResponse;
      for (const citation of extractKimiCitations(data)) {
        collectedCitations.add(citation);
      }
      const choice = data.choices?.[0];
      const message = choice?.message;
      const text = extractKimiMessageText(message);
      const toolCalls = message?.tool_calls ?? [];

      if (choice?.finish_reason !== "tool_calls" || toolCalls.length === 0) {
        return { content: text ?? "No response", citations: [...collectedCitations] };
      }

      messages.push({
        role: "assistant",
        content: message?.content ?? "",
        ...(message?.reasoning_content
          ? {
              reasoning_content: message.reasoning_content,
            }
          : {}),
        tool_calls: toolCalls,
      });

      const toolContent = buildKimiToolResultContent(data);
      let pushedToolResult = false;
      for (const toolCall of toolCalls) {
        const toolCallId = toolCall.id?.trim();
        if (!toolCallId) {
          continue;
        }
        pushedToolResult = true;
        messages.push({
          role: "tool",
          tool_call_id: toolCallId,
          content: toolContent,
        });
      }

      if (!pushedToolResult) {
        return { content: text ?? "No response", citations: [...collectedCitations] };
      }
    } finally {
      await release();
    }
  }

  return {
    content: "Search completed but no final answer was produced.",
    citations: [...collectedCitations],
  };
}

>>>>>>> 46003e85b (fix: unify web tool proxy path (#27430) (thanks @kevinWangSheng))
async function runWebSearch(params: {
  query: string;
  count: number;
  apiKey: string;
  timeoutSeconds: number;
  cacheTtlMs: number;
  provider: (typeof SEARCH_PROVIDERS)[number];
  country?: string;
  search_lang?: string;
  ui_lang?: string;
  freshness?: string;
  perplexityBaseUrl?: string;
  perplexityModel?: string;
}): Promise<Record<string, unknown>> {
  const cacheKey = normalizeCacheKey(
    params.provider === "brave"
      ? `${params.provider}:${params.query}:${params.count}:${params.country || "default"}:${params.search_lang || "default"}:${params.ui_lang || "default"}:${params.freshness || "default"}`
<<<<<<< HEAD
      : `${params.provider}:${params.query}:${params.count}:${params.country || "default"}:${params.search_lang || "default"}:${params.ui_lang || "default"}`,
=======
      : params.provider === "perplexity"
        ? `${params.provider}:${params.query}:${params.perplexityBaseUrl ?? DEFAULT_PERPLEXITY_BASE_URL}:${params.perplexityModel ?? DEFAULT_PERPLEXITY_MODEL}`
        : `${params.provider}:${params.query}:${params.grokModel ?? DEFAULT_GROK_MODEL}:${String(params.grokInlineCitations ?? false)}`,
>>>>>>> c984e6d8d (fix: prevent false positive context overflow detection in conversation text (#2078))
  );
  const cached = readCache(SEARCH_CACHE, cacheKey);
  if (cached) return { ...cached.value, cached: true };

  const start = Date.now();

  if (params.provider === "perplexity") {
    const { content, citations } = await runPerplexitySearch({
      query: params.query,
      apiKey: params.apiKey,
      baseUrl: params.perplexityBaseUrl ?? DEFAULT_PERPLEXITY_BASE_URL,
      model: params.perplexityModel ?? DEFAULT_PERPLEXITY_MODEL,
      timeoutSeconds: params.timeoutSeconds,
    });

    const payload = {
      query: params.query,
      provider: params.provider,
      model: params.perplexityModel ?? DEFAULT_PERPLEXITY_MODEL,
      tookMs: Date.now() - start,
      content,
      citations,
    };
    writeCache(SEARCH_CACHE, cacheKey, payload, params.cacheTtlMs);
    return payload;
  }

  if (params.provider !== "brave") {
    throw new Error("Unsupported web search provider.");
  }

  const url = new URL(BRAVE_SEARCH_ENDPOINT);
  url.searchParams.set("q", params.query);
  url.searchParams.set("count", String(params.count));
  if (params.country) {
    url.searchParams.set("country", params.country);
  }
  if (params.search_lang) {
    url.searchParams.set("search_lang", params.search_lang);
  }
  if (params.ui_lang) {
    url.searchParams.set("ui_lang", params.ui_lang);
  }
  if (params.freshness) {
    url.searchParams.set("freshness", params.freshness);
  }

<<<<<<< HEAD
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": params.apiKey,
    },
    signal: withTimeout(undefined, params.timeoutSeconds * 1000),
=======
  const { response: res, release } = await fetchTrustedWebSearchEndpoint({
    url: url.toString(),
    timeoutSeconds: params.timeoutSeconds,
    init: {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": params.apiKey,
      },
    },
>>>>>>> 46003e85b (fix: unify web tool proxy path (#27430) (thanks @kevinWangSheng))
  });
  let mapped: Array<{
    title: string;
    url: string;
    description: string;
    published?: string;
    siteName?: string;
  }> = [];
  try {
    if (!res.ok) {
      const detailResult = await readResponseText(res, { maxBytes: 64_000 });
      const detail = detailResult.text;
      throw new Error(`Brave Search API error (${res.status}): ${detail || res.statusText}`);
    }

<<<<<<< HEAD
  if (!res.ok) {
    const detail = await readResponseText(res);
    throw new Error(`Brave Search API error (${res.status}): ${detail || res.statusText}`);
  }

  const data = (await res.json()) as BraveSearchResponse;
  const results = Array.isArray(data.web?.results) ? (data.web?.results ?? []) : [];
  const mapped = results.map((entry) => ({
    title: entry.title ?? "",
    url: entry.url ?? "",
    description: entry.description ?? "",
    published: entry.age ?? undefined,
    siteName: resolveSiteName(entry.url ?? ""),
  }));

=======
    const data = (await res.json()) as BraveSearchResponse;
    const results = Array.isArray(data.web?.results) ? (data.web?.results ?? []) : [];
    mapped = results.map((entry) => {
      const description = entry.description ?? "";
      const title = entry.title ?? "";
      const url = entry.url ?? "";
      const rawSiteName = resolveSiteName(url);
      return {
        title: title ? wrapWebContent(title, "web_search") : "",
        url, // Keep raw for tool chaining
        description: description ? wrapWebContent(description, "web_search") : "",
        published: entry.age || undefined,
        siteName: rawSiteName || undefined,
      };
    });
  } finally {
    await release();
  }

>>>>>>> 46003e85b (fix: unify web tool proxy path (#27430) (thanks @kevinWangSheng))
  const payload = {
    query: params.query,
    provider: params.provider,
    count: mapped.length,
    tookMs: Date.now() - start,
    results: mapped,
  };
  writeCache(SEARCH_CACHE, cacheKey, payload, params.cacheTtlMs);
  return payload;
}

export function createWebSearchTool(options?: {
  config?: MoltbotConfig;
  sandboxed?: boolean;
}): AnyAgentTool | null {
  const search = resolveSearchConfig(options?.config);
  if (!resolveSearchEnabled({ search, sandboxed: options?.sandboxed })) return null;

  const provider = resolveSearchProvider(search);
  const perplexityConfig = resolvePerplexityConfig(search);

  const description =
    provider === "perplexity"
      ? "Search the web using Perplexity Sonar (direct or via OpenRouter). Returns AI-synthesized answers with citations from real-time web search."
      : "Search the web using Brave Search API. Supports region-specific and localized search via country and language parameters. Returns titles, URLs, and snippets for fast research.";

  return {
    label: "Web Search",
    name: "web_search",
    description,
    parameters: WebSearchSchema,
    execute: async (_toolCallId, args) => {
      const perplexityAuth =
        provider === "perplexity" ? resolvePerplexityApiKey(perplexityConfig) : undefined;
      const apiKey =
        provider === "perplexity" ? perplexityAuth?.apiKey : resolveSearchApiKey(search);

      if (!apiKey) {
        return jsonResult(missingSearchKeyPayload(provider));
      }
      const params = args as Record<string, unknown>;
      const query = readStringParam(params, "query", { required: true });
      const count =
        readNumberParam(params, "count", { integer: true }) ?? search?.maxResults ?? undefined;
      const country = readStringParam(params, "country");
      const search_lang = readStringParam(params, "search_lang");
      const ui_lang = readStringParam(params, "ui_lang");
      const rawFreshness = readStringParam(params, "freshness");
      if (rawFreshness && provider !== "brave") {
        return jsonResult({
          error: "unsupported_freshness",
          message: "freshness is only supported by the Brave web_search provider.",
          docs: "https://docs.molt.bot/tools/web",
        });
      }
      const freshness = rawFreshness ? normalizeFreshness(rawFreshness) : undefined;
      if (rawFreshness && !freshness) {
        return jsonResult({
          error: "invalid_freshness",
          message:
            "freshness must be one of pd, pw, pm, py, or a range like YYYY-MM-DDtoYYYY-MM-DD.",
          docs: "https://docs.molt.bot/tools/web",
        });
      }
      const result = await runWebSearch({
        query,
        count: resolveSearchCount(count, DEFAULT_SEARCH_COUNT),
        apiKey,
        timeoutSeconds: resolveTimeoutSeconds(search?.timeoutSeconds, DEFAULT_TIMEOUT_SECONDS),
        cacheTtlMs: resolveCacheTtlMs(search?.cacheTtlMinutes, DEFAULT_CACHE_TTL_MINUTES),
        provider,
        country,
        search_lang,
        ui_lang,
        freshness,
        perplexityBaseUrl: resolvePerplexityBaseUrl(
          perplexityConfig,
          perplexityAuth?.source,
          perplexityAuth?.apiKey,
        ),
        perplexityModel: resolvePerplexityModel(perplexityConfig),
      });
      return jsonResult(result);
    },
  };
}

export const __testing = {
  inferPerplexityBaseUrlFromApiKey,
  resolvePerplexityBaseUrl,
  normalizeFreshness,
} as const;
