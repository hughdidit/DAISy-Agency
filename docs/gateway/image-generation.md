---
title: "Image Generation Configuration"
summary: "Configure the built-in image_generate tool for Google Nano Banana and ComfyUI"
read_when:
  - You are enabling image_generate on a Linux VM
  - You need the exact config keys for Google or ComfyUI image generation
  - You want examples for Google-only, ComfyUI-only, or dual-provider setups
---

# Image generation configuration

This page covers the built-in `image_generate` output tool.

`image_generate` creates one image artifact, validates it, writes it into the workspace, and returns metadata for downstream delivery tools. It is separate from the `image` understanding tool.

## Core fields

### `agents.defaults.imageGenerationModel`

Optional default generation target.

Accepts either:

- a string: `"google/gemini-2.5-flash-image"` or `"comfyui/portrait"`
- an object: `{ primary, fallbacks }`

In v1 the public tool still returns one output, but this field gives you a stable default model or preset selection.

### `tools.imageGeneration`

Top-level tool config:

- `enabled`
- `defaultProvider`
- `google.*`
- `comfyui.*`

## Google Nano Banana

Google uses direct Gemini HTTP calls in TypeScript.

Relevant fields:

- `tools.imageGeneration.google.model`
- `tools.imageGeneration.google.timeoutSeconds`
- `tools.imageGeneration.google.maxInputImages`
- `tools.imageGeneration.google.maxResponseBytes`

Notes:

- auth must resolve through the existing Google provider auth path
- hard timeout is capped at `120` seconds
- keep the model id centrally configured so upgrades are low-risk
- the stale bundled-skill model id is intentionally rejected

Example:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: "google/gemini-2.5-flash-image",
    },
  },
  tools: {
    imageGeneration: {
      enabled: true,
      defaultProvider: "google",
      google: {
        model: "gemini-2.5-flash-image",
        timeoutSeconds: 120,
        maxInputImages: 14,
        maxResponseBytes: 20971520,
      },
    },
  },
}
```

## ComfyUI

ComfyUI is treated as an external HTTP service reachable from the Linux VM.

Relevant fields:

- `tools.imageGeneration.comfyui.baseUrl`
- `tools.imageGeneration.comfyui.defaultPreset`
- `tools.imageGeneration.comfyui.timeoutSeconds`
- `tools.imageGeneration.comfyui.pollIntervalMs`
- `tools.imageGeneration.comfyui.allowRemote`
- `tools.imageGeneration.comfyui.allowedHostnames`
- `tools.imageGeneration.comfyui.maxRequestBytes`
- `tools.imageGeneration.comfyui.maxResponseBytes`
- `tools.imageGeneration.comfyui.presets`

### Security defaults

- local-only by default
- remote targets are rejected unless:
  - `allowRemote: true`, and
  - the hostname is explicitly allowlisted
- tool calls cannot submit arbitrary workflow JSON
- only configured preset mappings can patch workflow inputs

### Preset shape

Each preset contains:

- `workflow`: validated ComfyUI workflow JSON template
- `inputs`: allowed runtime field mappings
- optional `output`: deterministic output selection

Allowed mapped runtime fields in v1:

- `prompt`
- `negativePrompt`
- `seed`
- `steps`
- `cfgScale`
- `width`
- `height`
- `sampler`
- `scheduler`

Example:

```json5
{
  tools: {
    imageGeneration: {
      enabled: true,
      defaultProvider: "comfyui",
      comfyui: {
        baseUrl: "http://127.0.0.1:8188",
        defaultPreset: "portrait",
        timeoutSeconds: 60,
        pollIntervalMs: 1000,
        allowRemote: false,
        allowedHostnames: ["127.0.0.1", "localhost"],
        maxRequestBytes: 524288,
        maxResponseBytes: 20971520,
        presets: {
          portrait: {
            description: "Portrait workflow",
            workflow: {
              "1": {
                class_type: "CLIPTextEncode",
                inputs: {
                  text: "placeholder",
                },
              },
              "9": {
                class_type: "SaveImage",
                inputs: {},
              },
            },
            inputs: {
              prompt: {
                nodeId: "1",
                inputName: "text",
              },
            },
            output: {
              nodeId: "9",
              imageIndex: 0,
            },
          },
        },
      },
    },
  },
}
```

## Dual-provider setup

Use both providers when you want managed cloud generation plus local rendering:

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: "google/gemini-2.5-flash-image",
    },
  },
  tools: {
    imageGeneration: {
      enabled: true,
      defaultProvider: "google",
      google: {
        model: "gemini-2.5-flash-image",
      },
      comfyui: {
        baseUrl: "http://127.0.0.1:8188",
        defaultPreset: "portrait",
        presets: {
          portrait: {
            workflow: {
              "1": {
                class_type: "CLIPTextEncode",
                inputs: {
                  text: "placeholder",
                },
              },
              "9": {
                class_type: "SaveImage",
                inputs: {},
              },
            },
            inputs: {
              prompt: {
                nodeId: "1",
                inputName: "text",
              },
            },
            output: {
              nodeId: "9",
              imageIndex: 0,
            },
          },
        },
      },
    },
  },
}
```

## Operational notes

- Generated files are stored under `<workspace>/generated-images`
- `image_generate` does not upload to Discord, Drive, or other channels directly
- downstream tools can use the returned `localPath`, `mimeType`, and file metadata

## Related docs

- [Image Generate Tool](/tools/image-generate)
- [Configuration Reference](/gateway/configuration-reference)
