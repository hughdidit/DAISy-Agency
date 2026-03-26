---
title: "Image Generate Tool"
summary: "Generate one image artifact through Google Nano Banana or ComfyUI and save it into the workspace"
read_when:
  - You want to create images from an agent
  - You need exact image_generate parameters, defaults, or output details
  - You are configuring Google Nano Banana or ComfyUI image generation
---

# Image Generate tool

`image_generate` is an output tool.

It creates one image, validates the bytes, saves the file into the workspace under `generated-images/`, and returns `MEDIA:<localPath>` plus structured metadata for downstream delivery tools.

It does not analyze images. For image understanding, use [`image`](/tools/index#image).

## Providers

v1 supports two explicit providers:

- Google Nano Banana via direct Gemini API calls in TypeScript
- ComfyUI via a configured HTTP endpoint and validated presets

No bundled skill is used at runtime for the built-in `image_generate` path.

## Availability

The tool is only registered when:

- `tools.imageGeneration.enabled` is not `false`, and
- at least one provider is usable:
  - Google: auth resolves through the normal Google provider auth path
  - ComfyUI: `tools.imageGeneration.comfyui.baseUrl` is set and at least one preset exists

## Input reference

- `prompt` (`string`, required): generation prompt
- `provider` (`"google" | "comfyui"`): optional provider override
- `model` (`string`): optional override in `provider/id` form
  - Google: `google/<model-id>`
  - ComfyUI: `comfyui/<preset-id>`
- `image` (`string`): optional single Google input image path or URL
- `images` (`string[]`): optional Google input images
- `size` (`"1K" | "2K" | "4K"`): optional output size hint
- `resolution` (`"1K" | "2K" | "4K"`): alias for `size`
- `preset` (`string`): optional ComfyUI preset override

ComfyUI-only constrained overrides:

- `negativePrompt`
- `seed`
- `steps`
- `cfgScale`
- `width`
- `height`
- `sampler`
- `scheduler`

Notes:

- Public API is single-output in v1.
- Google supports prompt-only generation and optional input-image composition/editing.
- ComfyUI v1 is preset-driven and does not accept arbitrary workflow JSON from the tool call.
- ComfyUI input-image editing is not supported in v1.

## Output contract

The tool returns:

- `content[0].text = MEDIA:<localPath>`
- one image block loaded from the saved file
- structured `details` containing:
  - `localPath`
  - `mimeType`
  - `fileName`
  - `provider`
  - `model` or `workflowId`
  - `width`, `height` when available
  - `sizeBytes`
  - optional `seed`, `jobId`

Saved file behavior:

- directory: `<workspace>/generated-images`
- filename: UTC timestamp + hash + optional collision suffix
- prompt text is never used in the filename
- returned provider MIME type is never trusted without byte-signature validation

## Examples

Google prompt-only:

```json
{
  "prompt": "Cinematic product photo of a brass compass on black volcanic glass",
  "provider": "google",
  "size": "2K"
}
```

Google image edit/composition:

```json
{
  "prompt": "Turn these reference shots into one polished travel-poster composition",
  "provider": "google",
  "images": ["/workspace/media/inbound/ref-1.png", "/workspace/media/inbound/ref-2.png"],
  "size": "2K"
}
```

ComfyUI preset generation:

```json
{
  "prompt": "Editorial portrait, overcast daylight, 85mm lens look",
  "provider": "comfyui",
  "preset": "portrait",
  "negativePrompt": "low quality, extra fingers",
  "steps": 28,
  "cfgScale": 6.5,
  "seed": 42
}
```

## Configuration

High-level defaults live in:

- `agents.defaults.imageGenerationModel`
- `tools.imageGeneration.defaultProvider`
- `tools.imageGeneration.google.*`
- `tools.imageGeneration.comfyui.*`

See [Image Generation Configuration](/gateway/image-generation) for full config blocks and security guidance.

## Defaults and limits

- Google timeout hard cap: `120` seconds
- ComfyUI default timeout: `60` seconds
- ComfyUI hard timeout cap: `300` seconds
- ComfyUI poll interval default: `1000` ms
- Google max input images default: `14`
- ComfyUI remote targets are denied by default

## Error behavior

Common failure cases:

- missing Google auth
- unknown provider
- unsupported or stale Google model id
- unknown ComfyUI preset
- Google timeout
- ComfyUI timeout or unreachable server
- provider returns non-image bytes
- ComfyUI returns multiple outputs when one deterministic result is required
- workspace write failure
- sandbox path escape attempt

Representative error strings:

- `Unsupported image generation provider "..."`
- `Google image generation timed out after 120 seconds.`
- `Configured Google image generation model "..." is stale or unsupported.`
- `ComfyUI remote targets are disabled by default.`
- `ComfyUI workflow "..." returned multiple image outputs...`

## Troubleshooting

- Tool missing:
  - confirm `tools.imageGeneration.enabled` is not `false`
  - confirm Google auth exists or ComfyUI config is complete
- Google fails immediately:
  - verify `GEMINI_API_KEY` or agent auth profile resolution
  - verify the configured model id is current
- ComfyUI fails immediately:
  - verify `tools.imageGeneration.comfyui.baseUrl`
  - verify the preset id exists under `tools.imageGeneration.comfyui.presets`
  - keep remote targets disabled unless you explicitly trust and allowlist them
- File saved but downstream delivery fails:
  - `image_generate` only creates and stores the local artifact
  - delivery/upload is handled by other tools
