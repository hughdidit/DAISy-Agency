import { describe, expect, it } from "vitest";
import { validateConfigObject } from "./config.js";

describe("config schema regressions", () => {
  it("accepts nested telegram groupPolicy overrides", () => {
    const res = validateConfigObject({
      channels: {
        telegram: {
          groups: {
            "-1001234567890": {
              groupPolicy: "open",
              topics: {
                "42": {
                  groupPolicy: "disabled",
                },
              },
            },
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it('accepts memorySearch fallback "voyage"', () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          memorySearch: {
            fallback: "voyage",
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it('accepts memorySearch provider "mistral"', () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          memorySearch: {
            provider: "mistral",
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("accepts safe iMessage remoteHost", () => {
    const res = validateConfigObject({
      channels: {
        imessage: {
          remoteHost: "bot@gateway-host",
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("accepts channels.whatsapp.enabled", () => {
    const res = validateConfigObject({
      channels: {
        whatsapp: {
          enabled: true,
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("rejects unsafe iMessage remoteHost", () => {
    const res = validateConfigObject({
      channels: {
        imessage: {
          remoteHost: "bot@gateway-host -oProxyCommand=whoami",
        },
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.issues[0]?.path).toBe("channels.imessage.remoteHost");
    }
  });

  it("accepts iMessage attachment root patterns", () => {
    const res = validateConfigObject({
      channels: {
        imessage: {
          attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
          remoteAttachmentRoots: ["/Volumes/relay/attachments"],
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("accepts string values for agents defaults model inputs", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          model: "anthropic/claude-opus-4-6",
          imageModel: "openai/gpt-4.1-mini",
          imageGenerationModel: "google/gemini-2.5-flash-image",
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("accepts structured image generation default model config", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          imageGenerationModel: {
            primary: "comfyui/portrait",
            fallbacks: ["google/gemini-2.5-flash-image"],
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("accepts pdf default model and limits", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          pdfModel: {
            primary: "anthropic/claude-opus-4-6",
            fallbacks: ["openai/gpt-5-mini"],
          },
          pdfMaxBytesMb: 12,
          pdfMaxPages: 25,
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("rejects non-positive pdf limits", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          pdfModel: { primary: "openai/gpt-5-mini" },
          pdfMaxBytesMb: 0,
          pdfMaxPages: 0,
        },
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.issues.some((issue) => issue.path.includes("agents.defaults.pdfMax"))).toBe(true);
    }
  });

  it("rejects relative iMessage attachment roots", () => {
    const res = validateConfigObject({
      channels: {
        imessage: {
          attachmentRoots: ["./attachments"],
        },
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.issues[0]?.path).toBe("channels.imessage.attachmentRoots.0");
    }
  });

  it("accepts tools.web.fetch firecrawl/readability compatibility keys", () => {
    const res = validateConfigObject({
      tools: {
        web: {
          fetch: {
            maxResponseBytes: 262144,
            readability: true,
            firecrawl: {
              enabled: true,
              apiKey: {
                source: "env",
                provider: "default",
                id: "FIRECRAWL_API_KEY",
              },
              baseUrl: "https://api.firecrawl.dev",
              onlyMainContent: true,
              maxAgeMs: 300000,
              timeoutSeconds: 20,
            },
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("accepts image generation tool config for google and comfyui", () => {
    const res = validateConfigObject({
      tools: {
        imageGeneration: {
          enabled: true,
          defaultProvider: "google",
          google: {
            model: "gemini-2.5-flash-image",
            timeoutSeconds: 120,
            maxInputImages: 4,
            maxResponseBytes: 10485760,
          },
          comfyui: {
            baseUrl: "http://127.0.0.1:8188",
            defaultPreset: "portrait",
            timeoutSeconds: 90,
            pollIntervalMs: 1000,
            allowRemote: false,
            allowedHostnames: ["127.0.0.1"],
            maxRequestBytes: 262144,
            maxResponseBytes: 10485760,
            presets: {
              portrait: {
                description: "Portrait preset",
                workflow: {
                  "1": {
                    class_type: "CLIPTextEncode",
                    inputs: {
                      text: "placeholder",
                    },
                  },
                },
                inputs: {
                  prompt: {
                    nodeId: "1",
                    inputName: "text",
                  },
                },
                output: {
                  nodeId: "1",
                  imageIndex: 0,
                },
              },
            },
          },
        },
      },
    });

    expect(res.ok).toBe(true);
  });

  it("rejects enabled image generation without any provider config", () => {
    const res = validateConfigObject({
      tools: {
        imageGeneration: {
          enabled: true,
        },
      },
    });

    expect(res.ok).toBe(false);
  });

  it("accepts browser.extraArgs for proxy and custom flags", () => {
    const res = validateConfigObject({
      browser: {
        extraArgs: ["--proxy-server=http://127.0.0.1:7890"],
      },
    });

    expect(res.ok).toBe(true);
  });

  it("rejects browser.extraArgs with non-array value", () => {
    const res = validateConfigObject({
      browser: {
        extraArgs: "--proxy-server=http://127.0.0.1:7890" as unknown,
      },
    });

    expect(res.ok).toBe(false);
  });
});
