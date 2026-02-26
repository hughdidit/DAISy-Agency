---
summary: "Use OpenAI via API keys or Codex subscription in Moltbot"
read_when:
  - You want to use OpenAI models in Moltbot
  - You want Codex subscription auth instead of API keys
---

# OpenAI

OpenAI provides developer APIs for GPT models. Codex supports **ChatGPT sign-in** for subscription
access or **API key** sign-in for usage-based access. Codex cloud requires ChatGPT sign-in.

## Option A: OpenAI API key (OpenAI Platform)

**Best for:** direct API access and usage-based billing.
Get your API key from the OpenAI dashboard.

### CLI setup

```bash
moltbot onboard --auth-choice openai-api-key
# or non-interactive
moltbot onboard --openai-api-key "$OPENAI_API_KEY"
```

### Config snippet

```json5
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.2" } } },
}
```

## Option B: OpenAI Code (Codex) subscription

**Best for:** using ChatGPT/Codex subscription access instead of an API key.
Codex cloud requires ChatGPT sign-in, while the Codex CLI supports ChatGPT or API key sign-in.

### CLI setup

```bash
# Run Codex OAuth in the wizard
moltbot onboard --auth-choice openai-codex

# Or run OAuth directly
moltbot models auth login --provider openai-codex
```

### Config snippet

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.2" } } },
}
```

### Codex transport default

OpenClaw uses `pi-ai` for model streaming. For `openai-codex/*` models you can set
`agents.defaults.models.<provider/model>.params.transport` to select transport:

- Default is `"auto"` (WebSocket-first, then SSE fallback).
- `"sse"`: force SSE
- `"websocket"`: force WebSocket
- `"auto"`: try WebSocket, then fall back to SSE

```json5
{
  agents: {
    defaults: {
      model: { primary: "openai-codex/gpt-5.3-codex" },
      models: {
        "openai-codex/gpt-5.3-codex": {
          params: {
            transport: "auto",
          },
        },
      },
    },
  },
}
```

## Notes

- Model refs always use `provider/model` (see [/concepts/models](/concepts/models)).
- Auth details + reuse rules are in [/concepts/oauth](/concepts/oauth).
