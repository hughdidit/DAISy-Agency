import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildResolvedSkillCapability,
  buildResolvedToolCapability,
  createResolvedCapabilityManifest,
  type ResolvedCapabilityRuntimeContext,
} from "../shared/resolved-capability-manifest.js";
import {
  CAPABILITY_READINESS_PARITY_MATRIX,
  normalizeCapabilitySnapshotParityRows,
} from "../test-utils/capability-readiness-parity.js";

const mocks = vi.hoisted(() => ({
  collectGatewayCapabilityInputs: vi.fn(),
  collectReadonlyCapabilityInputs: vi.fn(),
  buildResolvedToolCatalogGroupsFromManifest: vi.fn(() => []),
  buildSkillStatusReportFromManifest: vi.fn(() => ({ skills: [] })),
  resolveCapabilityManifest: vi.fn(),
  resolveAgentWorkspaceDir: vi.fn(),
  resolveDefaultAgentId: vi.fn(() => "main"),
}));

vi.mock("../agents/capabilities/index.js", () => ({
  collectGatewayCapabilityInputs: mocks.collectGatewayCapabilityInputs,
  collectReadonlyCapabilityInputs: mocks.collectReadonlyCapabilityInputs,
  buildResolvedToolCatalogGroupsFromManifest: mocks.buildResolvedToolCatalogGroupsFromManifest,
  buildSkillStatusReportFromManifest: mocks.buildSkillStatusReportFromManifest,
  resolveCapabilityManifest: mocks.resolveCapabilityManifest,
}));

vi.mock("../agents/agent-scope.js", () => ({
  resolveAgentWorkspaceDir: mocks.resolveAgentWorkspaceDir,
  resolveDefaultAgentId: mocks.resolveDefaultAgentId,
}));

const {
  collectCommandCapabilitySnapshot,
  formatCapabilityClassLabel,
  formatCommandCapabilityFindingFailureMessage,
} = await import("./capability-readiness.js");

function createCollectedInputs() {
  return {
    runtimeContext: {
      agentId: "main",
      sandboxMode: "all",
      sandboxScope: "session",
      sandboxed: true,
    },
    managedSkillsDir: "/managed-skills",
    skills: [],
    tools: [],
  };
}

function createRuntimeContext(): ResolvedCapabilityRuntimeContext {
  return {
    agentId: "main",
    sandboxMode: "all",
    sandboxScope: "session",
    sandboxed: true,
  };
}

beforeEach(() => {
  mocks.collectGatewayCapabilityInputs.mockReset();
  mocks.collectReadonlyCapabilityInputs.mockReset();
  mocks.buildResolvedToolCatalogGroupsFromManifest.mockClear();
  mocks.buildSkillStatusReportFromManifest.mockClear();
  mocks.resolveCapabilityManifest.mockReset();
  mocks.resolveAgentWorkspaceDir.mockReset();
  mocks.resolveDefaultAgentId.mockReset();
  mocks.resolveDefaultAgentId.mockReturnValue("main");
  mocks.resolveAgentWorkspaceDir.mockReturnValue("/host/workspace");
  mocks.collectGatewayCapabilityInputs.mockReturnValue(createCollectedInputs());
  mocks.collectReadonlyCapabilityInputs.mockReturnValue(createCollectedInputs());
  mocks.resolveCapabilityManifest.mockImplementation((collected: { runtimeContext: object }) =>
    createResolvedCapabilityManifest({
      runtimeContext: collected.runtimeContext as ResolvedCapabilityRuntimeContext,
      capabilities: [],
    }),
  );
});

describe("capability readiness helper", () => {
  it("keeps readonly collection on the sandbox mount by default", () => {
    collectCommandCapabilitySnapshot({
      config: {},
      agentId: "readonly-agent",
      mode: "readonly-sandbox",
    });

    expect(mocks.resolveAgentWorkspaceDir).not.toHaveBeenCalled();
    expect(mocks.collectReadonlyCapabilityInputs).toHaveBeenCalledWith({
      config: {},
      agentId: "readonly-agent",
    });
  });

  it("allows readonly callers to pass the sandbox-visible workspace mount explicitly", () => {
    collectCommandCapabilitySnapshot({
      config: {},
      agentId: "readonly-agent",
      mode: "readonly-sandbox",
      workspaceDir: "/workspace",
    });

    expect(mocks.collectReadonlyCapabilityInputs).toHaveBeenCalledWith({
      config: {},
      agentId: "readonly-agent",
      workspaceDir: "/workspace",
    });
  });

  it("threads readonly projection facts through to readonly collection", () => {
    const projection = {
      configPath: "/workspace/.openclaw-readonly/openclaw.json",
      stateDir: "/workspace/.openclaw-readonly/state",
      workspaceDir: "/workspace",
      pathExists: vi.fn(() => true),
    };

    collectCommandCapabilitySnapshot({
      config: {},
      agentId: "readonly-agent",
      mode: "readonly-sandbox",
      projection,
    });

    expect(mocks.collectReadonlyCapabilityInputs).toHaveBeenCalledWith({
      config: {},
      agentId: "readonly-agent",
      projection,
    });
  });

  it("normalizes readiness findings and capability counts from the shared manifest", () => {
    const runtimeContext = createRuntimeContext();
    const capabilities = [
      buildResolvedToolCapability({
        id: "browser",
        label: "Browser",
        description: "Browser automation",
        source: "core",
        defaultProfiles: ["full"],
        runtimeContext,
        capabilityClass: "configured-but-blocked",
        policy: {
          source: {
            kind: "sandbox-tool-policy",
            key: "tools.sandbox.tools.deny",
          },
          denyReason: "tool-denied-by-sandbox-policy",
        },
      }),
      buildResolvedSkillCapability({
        name: "env-blocked-skill",
        description: "Google workspace toolkit",
        source: "workspace",
        skillKey: "env-blocked-skill",
        bundled: false,
        filePath: "/workspace/skills/env-blocked-skill/SKILL.md",
        primaryEnv: "MISSING_GATEWAY_TEST_ENV",
        requirements: {
          bins: [],
          anyBins: [],
          env: ["MISSING_GATEWAY_TEST_ENV"],
          config: [],
          os: [],
        },
        missing: {
          bins: [],
          anyBins: [],
          env: ["MISSING_GATEWAY_TEST_ENV"],
          config: [],
          os: [],
        },
        configChecks: [],
        disabled: false,
        blockedByAllowlist: false,
        remoteSatisfied: null,
        runtimeContext,
      }),
      buildResolvedSkillCapability({
        name: "projection-defect-skill",
        description: "Mongo-backed memory skill",
        source: "workspace",
        skillKey: "projection-defect-skill",
        bundled: false,
        filePath: "/workspace/skills/projection-defect-skill/SKILL.md",
        requirements: { bins: [], anyBins: [], env: [], config: [], os: [] },
        missing: { bins: [], anyBins: [], env: [], config: [], os: [] },
        configChecks: [],
        disabled: false,
        blockedByAllowlist: false,
        remoteSatisfied: null,
        runtimeContext,
        runtimeReasonCodes: ["missing-projection"],
        runtimeDetail:
          "Readonly projection missing required paths: /workspace/.openclaw-readonly/state/extensions",
      }),
      buildResolvedSkillCapability({
        name: "remote-mac-skill",
        description: "Remote macOS clipboard",
        source: "workspace",
        skillKey: "remote-mac-skill",
        bundled: false,
        filePath: "/workspace/skills/remote-mac-skill/SKILL.md",
        requirements: { bins: ["pbpaste"], anyBins: [], env: [], config: [], os: ["darwin"] },
        missing: { bins: ["pbpaste"], anyBins: [], env: [], config: [], os: ["darwin"] },
        configChecks: [],
        disabled: false,
        blockedByAllowlist: false,
        remoteSatisfied: {
          os: ["darwin"],
          bins: ["pbpaste"],
          anyBins: [],
          note: "paired macOS node provides clipboard access",
        },
        runtimeContext,
      }),
      buildResolvedSkillCapability({
        name: "unsupported-runtime-skill",
        description: "Skill requiring unsupported runtime",
        source: "workspace",
        skillKey: "unsupported-runtime-skill",
        bundled: false,
        filePath: "/workspace/skills/unsupported-runtime-skill/SKILL.md",
        requirements: {
          bins: [],
          anyBins: [],
          env: [],
          config: [],
          os: ["never-supported-sbx207"],
        },
        missing: { bins: [], anyBins: [], env: [], config: [], os: ["never-supported-sbx207"] },
        configChecks: [],
        disabled: false,
        blockedByAllowlist: false,
        remoteSatisfied: null,
        runtimeContext,
      }),
      buildResolvedToolCapability({
        id: "web_fetch",
        label: "Web Fetch",
        description: "Gateway web fetch",
        source: "core",
        defaultProfiles: ["coding"],
        runtimeContext,
        capabilityClass: "gateway-brokered",
        evidence: {
          provider: {
            providerId: "gateway",
            providerKind: "gateway",
            transport: "rpc",
            reasonCodes: [],
          },
        },
      }),
    ];

    mocks.resolveCapabilityManifest.mockReturnValue(
      createResolvedCapabilityManifest({
        runtimeContext,
        capabilities,
      }),
    );

    const snapshot = collectCommandCapabilitySnapshot({
      config: {},
      agentId: "main",
    });

    expect(snapshot.counts).toEqual({
      total: 6,
      byClass: {
        "sandbox-local": 0,
        "gateway-brokered": 1,
        "remote-node-assisted": 1,
        "configured-but-blocked": 2,
        "unsupported-in-current-runtime": 2,
      },
    });
    expect(normalizeCapabilitySnapshotParityRows(snapshot)).toEqual(
      CAPABILITY_READINESS_PARITY_MATRIX.filter((row) => row.subject !== "local-skill"),
    );
    const gatewayFinding = snapshot.findings.find((finding) => finding.label === "Web Fetch");
    expect(gatewayFinding?.primaryReasonCategory).toBe("gateway-brokered-availability");
    expect(formatCommandCapabilityFindingFailureMessage(gatewayFinding!)).toBeNull();
  });

  it("returns capability class labels directly", () => {
    expect(formatCapabilityClassLabel("gateway-brokered")).toBe("gateway-brokered");
  });
});
