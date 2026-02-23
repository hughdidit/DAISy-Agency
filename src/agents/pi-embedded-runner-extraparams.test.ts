import type { StreamFn } from "@mariozechner/pi-agent-core";
import type { Context, Model, SimpleStreamOptions } from "@mariozechner/pi-ai";
import { AssistantMessageEventStream } from "@mariozechner/pi-ai";
import { describe, expect, it } from "vitest";
import { applyExtraParamsToAgent, resolveExtraParams } from "./pi-embedded-runner.js";

describe("resolveExtraParams", () => {
  it("returns undefined with no model config", () => {
    const result = resolveExtraParams({
      cfg: undefined,
      provider: "zai",
      modelId: "glm-4.7",
    });

    expect(result).toBeUndefined();
  });

  it("returns params for exact provider/model key", () => {
    const result = resolveExtraParams({
      cfg: {
        agents: {
          defaults: {
            models: {
              "openai/gpt-4": {
                params: {
                  temperature: 0.7,
                  maxTokens: 2048,
                },
              },
            },
          },
        },
      },
      provider: "openai",
      modelId: "gpt-4",
    });

    expect(result).toEqual({
      temperature: 0.7,
      maxTokens: 2048,
    });
  });

  it("ignores unrelated model entries", () => {
    const result = resolveExtraParams({
      cfg: {
        agents: {
          defaults: {
            models: {
              "openai/gpt-4": {
                params: {
                  temperature: 0.7,
                },
              },
            },
          },
        },
      },
      provider: "openai",
      modelId: "gpt-4.1-mini",
    });

    expect(result).toBeUndefined();
  });
});

describe("applyExtraParamsToAgent", () => {
  it("adds OpenRouter attribution headers to stream options", () => {
    const calls: Array<SimpleStreamOptions | undefined> = [];
    const baseStreamFn: StreamFn = (_model, _context, options) => {
      calls.push(options);
      return new AssistantMessageEventStream();
    };
    const agent = { streamFn: baseStreamFn };
<<<<<<< HEAD
=======
    applyExtraParamsToAgent(agent, undefined, params.applyProvider, params.applyModelId);
    const context: Context = { messages: [] };
    void agent.streamFn?.(params.model, context, params.options ?? {});
    return payload;
  }

  function runAnthropicHeaderCase(params: {
    cfg: Record<string, unknown>;
    modelId: string;
    options?: SimpleStreamOptions;
  }) {
    const { calls, agent } = createOptionsCaptureAgent();
    applyExtraParamsToAgent(agent, params.cfg, "anthropic", params.modelId);

    const model = {
      api: "anthropic-messages",
      provider: "anthropic",
      id: params.modelId,
    } as Model<"anthropic-messages">;
    const context: Context = { messages: [] };
    void agent.streamFn?.(model, context, params.options ?? {});

    expect(calls).toHaveLength(1);
    return calls[0]?.headers;
  }

  it("does not inject reasoning when thinkingLevel is off (default) for OpenRouter", () => {
    // Regression: "off" is a truthy string, so the old code injected
    // reasoning: { effort: "none" }, causing a 400 on models that require
    // reasoning (e.g. deepseek/deepseek-r1).
    const payloads: Record<string, unknown>[] = [];
    const baseStreamFn: StreamFn = (_model, _context, options) => {
      const payload: Record<string, unknown> = { model: "deepseek/deepseek-r1" };
      options?.onPayload?.(payload);
      payloads.push(payload);
      return {} as ReturnType<StreamFn>;
    };
    const agent = { streamFn: baseStreamFn };

    applyExtraParamsToAgent(agent, undefined, "openrouter", "deepseek/deepseek-r1", undefined, "off");

    const model = {
      api: "openai-completions",
      provider: "openrouter",
      id: "deepseek/deepseek-r1",
    } as Model<"openai-completions">;
    const context: Context = { messages: [] };
    void agent.streamFn?.(model, context, {});

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).not.toHaveProperty("reasoning");
    expect(payloads[0]).not.toHaveProperty("reasoning_effort");
  });

  it("injects reasoning.effort when thinkingLevel is non-off for OpenRouter", () => {
    const payloads: Record<string, unknown>[] = [];
    const baseStreamFn: StreamFn = (_model, _context, options) => {
      const payload: Record<string, unknown> = {};
      options?.onPayload?.(payload);
      payloads.push(payload);
      return {} as ReturnType<StreamFn>;
    };
    const agent = { streamFn: baseStreamFn };

    applyExtraParamsToAgent(agent, undefined, "openrouter", "openrouter/auto", undefined, "low");

    const model = {
      api: "openai-completions",
      provider: "openrouter",
      id: "openrouter/auto",
    } as Model<"openai-completions">;
    const context: Context = { messages: [] };
    void agent.streamFn?.(model, context, {});

    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.reasoning).toEqual({ effort: "low" });
  });

  it("adds OpenRouter attribution headers to stream options", () => {
    const { calls, agent } = createOptionsCaptureAgent();
>>>>>>> 3e974dc93 (fix: don't inject reasoning: { effort: "none" } for OpenRouter when thinking is off)

    applyExtraParamsToAgent(agent, undefined, "openrouter", "openrouter/auto");

    const model = {
      api: "openai-completions",
      provider: "openrouter",
      id: "openrouter/auto",
    } as Model<"openai-completions">;
    const context: Context = { messages: [] };

    void agent.streamFn?.(model, context, { headers: { "X-Custom": "1" } });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.headers).toEqual({
      "HTTP-Referer": "https://openclaw.ai",
      "X-Title": "OpenClaw",
      "X-Custom": "1",
    });
  });
});
