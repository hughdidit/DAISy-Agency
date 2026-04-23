import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ResolvedCapabilityEvidence,
  ResolvedToolCapability,
} from "../../shared/resolved-capability-manifest.js";
import { ErrorCodes } from "../protocol/index.js";
import { toolsCatalogHandlers } from "./tools-catalog.js";

vi.mock("../../config/config.js", () => ({
  loadConfig: vi.fn(() => ({})),
}));

vi.mock("../../agents/agent-scope.js", () => ({
  listAgentIds: vi.fn(() => ["main"]),
  resolveDefaultAgentId: vi.fn(() => "main"),
}));

const {
  collectGatewayCapabilityInputs,
  resolveCapabilityManifest,
  buildResolvedToolCatalogGroupsFromManifest,
} = vi.hoisted(() => ({
  collectGatewayCapabilityInputs: vi.fn(),
  resolveCapabilityManifest: vi.fn(),
  buildResolvedToolCatalogGroupsFromManifest: vi.fn(),
}));

vi.mock("../../agents/capabilities/index.js", () => ({
  collectGatewayCapabilityInputs,
  resolveCapabilityManifest,
  buildResolvedToolCatalogGroupsFromManifest,
}));

type RespondCall = [boolean, unknown?, { code: number; message: string }?];
type ToolCapabilityPolicy = Extract<ResolvedToolCapability, { policy: unknown }>["policy"];
type ToolCapabilityOverrides = {
  id?: string;
  label?: string;
  description?: string;
  source?: "core" | "plugin";
  defaultProfiles?: string[];
  pluginId?: string;
  optional?: boolean;
  policy?: ToolCapabilityPolicy;
  evidence?: ResolvedCapabilityEvidence;
};

function createToolCapability(
  capabilityClass: ResolvedToolCapability["capabilityClass"],
  overrides: ToolCapabilityOverrides = {},
): ResolvedToolCapability {
  return {
    id: overrides.id ?? `tool:${capabilityClass}`,
    label: overrides.label ?? capabilityClass,
    description: overrides.description ?? `${capabilityClass} tool`,
    kind: "tool" as const,
    capabilityClass,
    runtimeContext: { agentId: "main", sandboxMode: "all", sandboxed: true },
    source: overrides.source ?? "core",
    defaultProfiles: overrides.defaultProfiles ?? [],
    ...(overrides.pluginId ? { pluginId: overrides.pluginId } : {}),
    ...(overrides.optional !== undefined ? { optional: Boolean(overrides.optional) } : {}),
    ...("policy" in overrides && overrides.policy ? { policy: overrides.policy } : {}),
    ...("evidence" in overrides && overrides.evidence ? { evidence: overrides.evidence } : {}),
  } as ResolvedToolCapability;
}

function createInvokeParams(params: Record<string, unknown>) {
  const respond = vi.fn();
  return {
    respond,
    invoke: async () =>
      await toolsCatalogHandlers["tools.catalog"]({
        params,
        respond: respond as never,
        context: {} as never,
        client: null,
        req: { type: "req", id: "req-1", method: "tools.catalog" },
        isWebchatConnect: () => false,
      }),
  };
}

describe("tools.catalog handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collectGatewayCapabilityInputs.mockReturnValue({
      runtimeContext: { agentId: "main", sandboxMode: "all", sandboxed: true },
      managedSkillsDir: "/tmp/skills",
      skills: [],
      tools: [{ id: "tts" }],
    });
    resolveCapabilityManifest.mockReturnValue({
      schemaVersion: 1,
      runtimeContext: {},
      capabilities: [],
    });
    buildResolvedToolCatalogGroupsFromManifest.mockReturnValue([
      {
        id: "media",
        label: "Media",
        source: "core",
        tools: [
          {
            id: "tts",
            label: "tts",
            description: "Text-to-speech",
            source: "core",
            defaultProfiles: [],
            capabilityClass: "sandbox-local",
            capability: createToolCapability("sandbox-local", { id: "tts", label: "tts" }),
          },
        ],
      },
    ]);
  });

  it("rejects invalid params", async () => {
    const { respond, invoke } = createInvokeParams({ extra: true });
    await invoke();
    const call = respond.mock.calls[0] as RespondCall | undefined;
    expect(call?.[0]).toBe(false);
    expect(call?.[2]?.code).toBe(ErrorCodes.INVALID_REQUEST);
    expect(call?.[2]?.message).toContain("invalid tools.catalog params");
  });

  it("rejects unknown agent ids", async () => {
    const { respond, invoke } = createInvokeParams({ agentId: "unknown-agent" });
    await invoke();
    const call = respond.mock.calls[0] as RespondCall | undefined;
    expect(call?.[0]).toBe(false);
    expect(call?.[2]?.code).toBe(ErrorCodes.INVALID_REQUEST);
    expect(call?.[2]?.message).toContain("unknown agent id");
  });

  it("returns core groups including tts and excludes plugins when includePlugins=false", async () => {
    const { respond, invoke } = createInvokeParams({ includePlugins: false });
    await invoke();
    const call = respond.mock.calls[0] as RespondCall | undefined;
    expect(call?.[0]).toBe(true);
    const payload = call?.[1] as
      | {
          agentId: string;
          groups: Array<{
            id: string;
            source: "core" | "plugin";
            tools: Array<{
              id: string;
              source: "core" | "plugin";
              capabilityClass: string;
              capability: { capabilityClass: string };
            }>;
          }>;
        }
      | undefined;
    expect(payload?.agentId).toBe("main");
    expect(payload?.groups.some((group) => group.source === "plugin")).toBe(false);
    const media = payload?.groups.find((group) => group.id === "media");
    expect(
      media?.tools.some(
        (tool) =>
          tool.id === "tts" &&
          tool.source === "core" &&
          tool.capabilityClass === "sandbox-local" &&
          tool.capability.capabilityClass === "sandbox-local",
      ),
    ).toBe(true);
    expect(collectGatewayCapabilityInputs).toHaveBeenCalledWith({
      config: {},
      agentId: "main",
      includePlugins: false,
      includeSkills: false,
    });
  });

  it("returns resolver-backed capability fields for all readiness classes", async () => {
    buildResolvedToolCatalogGroupsFromManifest.mockReturnValue([
      {
        id: "core",
        label: "Core",
        source: "core",
        tools: [
          {
            id: "sandbox-tool",
            label: "sandbox-tool",
            description: "Sandbox local tool",
            source: "core",
            defaultProfiles: ["coding"],
            capabilityClass: "sandbox-local",
            capability: createToolCapability("sandbox-local", {
              id: "sandbox-tool",
              defaultProfiles: ["coding"],
            }),
          },
          {
            id: "web_fetch",
            label: "web_fetch",
            description: "Gateway tool",
            source: "core",
            defaultProfiles: ["full"],
            capabilityClass: "gateway-brokered",
            capability: createToolCapability("gateway-brokered", {
              id: "web_fetch",
              evidence: {
                provider: {
                  providerId: "gateway",
                  providerKind: "gateway",
                  transport: "rpc",
                  reasonCodes: [],
                },
              },
              defaultProfiles: ["full"],
            }),
          },
          {
            id: "remote-tool",
            label: "remote-tool",
            description: "Remote tool",
            source: "core",
            defaultProfiles: [],
            capabilityClass: "remote-node-assisted",
            capability: createToolCapability("remote-node-assisted", {
              id: "remote-tool",
              evidence: {
                remote: {
                  satisfiedBins: ["jq"],
                  satisfiedAnyBins: [],
                  satisfiedOs: [],
                  note: "Remote node provides jq",
                },
              },
            }),
          },
          {
            id: "blocked-tool",
            label: "blocked-tool",
            description: "Blocked tool",
            source: "core",
            defaultProfiles: [],
            capabilityClass: "configured-but-blocked",
            capability: createToolCapability("configured-but-blocked", {
              id: "blocked-tool",
              policy: {
                source: { kind: "sandbox-tool-policy", key: "tools.deny" },
                denyReason: "tool-denied-by-sandbox-policy",
                detail: "Denied by agent policy",
              },
            }),
          },
          {
            id: "unsupported-tool",
            label: "unsupported-tool",
            description: "Unsupported tool",
            source: "core",
            defaultProfiles: [],
            capabilityClass: "unsupported-in-current-runtime",
            capability: createToolCapability("unsupported-in-current-runtime", {
              id: "unsupported-tool",
              evidence: {
                runtime: {
                  profile: "minimal",
                  missingBins: ["ffmpeg"],
                  missingAnyBins: [],
                  missingOs: [],
                  reasonCodes: ["missing-runtime-binaries"],
                  detail: "ffmpeg is not installed",
                },
              },
            }),
          },
        ],
      },
      {
        id: "plugin:voice-call",
        label: "voice-call",
        source: "plugin",
        pluginId: "voice-call",
        tools: [
          {
            id: "voice_call",
            label: "voice_call",
            description: "Plugin calling tool",
            source: "plugin",
            pluginId: "voice-call",
            optional: true,
            defaultProfiles: [],
            capabilityClass: "gateway-brokered",
            capability: createToolCapability("gateway-brokered", {
              id: "voice_call",
              source: "plugin",
              pluginId: "voice-call",
              optional: true,
              evidence: {
                provider: {
                  providerId: "voice-call",
                  providerKind: "plugin",
                  transport: "gateway-plugin",
                  reasonCodes: [],
                },
              },
            }),
          },
        ],
      },
    ]);

    const { respond, invoke } = createInvokeParams({});
    await invoke();
    const call = respond.mock.calls[0] as RespondCall | undefined;
    expect(call?.[0]).toBe(true);
    const payload = call?.[1] as
      | {
          groups: Array<{
            source: "core" | "plugin";
            pluginId?: string;
            tools: Array<{
              id: string;
              source: "core" | "plugin";
              pluginId?: string;
              optional?: boolean;
              capabilityClass?: string;
              capability?: { capabilityClass?: string };
            }>;
          }>;
        }
      | undefined;
    const classes = (payload?.groups ?? [])
      .flatMap((group) => group.tools)
      .map((tool) => tool.capabilityClass);
    expect(classes).toEqual(
      expect.arrayContaining([
        "sandbox-local",
        "gateway-brokered",
        "remote-node-assisted",
        "configured-but-blocked",
        "unsupported-in-current-runtime",
      ]),
    );
    const voiceCall = (payload?.groups ?? [])
      .flatMap((group) => group.tools)
      .find((tool) => tool.id === "voice_call");
    expect(voiceCall).toMatchObject({
      source: "plugin",
      pluginId: "voice-call",
      optional: true,
      capabilityClass: "gateway-brokered",
      capability: {
        capabilityClass: "gateway-brokered",
      },
    });
  });
});
