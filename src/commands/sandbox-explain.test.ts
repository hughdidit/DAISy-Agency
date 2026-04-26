import { describe, expect, it, vi } from "vitest";
import {
  CAPABILITY_READINESS_PARITY_MATRIX,
  normalizeCapabilitySnapshotParityRows,
} from "../test-utils/capability-readiness-parity.js";
import { createCapabilitySnapshotFixture } from "./capability-readiness.test-helpers.js";

const SANDBOX_EXPLAIN_TEST_TIMEOUT_MS = process.platform === "win32" ? 45_000 : 30_000;

let mockCfg: unknown = {};
const collectCommandCapabilitySnapshot = vi.fn(() => createCapabilitySnapshotFixture());

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig: vi.fn().mockImplementation(() => mockCfg),
  };
});

vi.mock("./capability-readiness.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./capability-readiness.js")>();
  return {
    ...actual,
    collectCommandCapabilitySnapshot,
  };
});

const { sandboxExplainCommand } = await import("./sandbox-explain.js");

describe("sandbox explain command", () => {
  it("uses readonly capability resolution when invoked from the readonly runtime", async () => {
    mockCfg = {
      agents: {
        defaults: {
          sandbox: { mode: "all", scope: "session", workspaceAccess: "none" },
        },
      },
      session: { store: "/tmp/openclaw-test-sessions-{agentId}.json" },
    };
    collectCommandCapabilitySnapshot.mockClear();

    await sandboxExplainCommand(
      {
        json: true,
        agent: "readonly-agent",
        readonlyRuntime: { workspaceDir: "/workspace" },
      },
      {
        log: vi.fn(),
        error: vi.fn(),
        exit: vi.fn(),
      } as unknown as Parameters<typeof sandboxExplainCommand>[1],
    );

    expect(collectCommandCapabilitySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "readonly-agent",
        mode: "readonly-sandbox",
        workspaceDir: "/workspace",
      }),
    );
  });

  it("prints JSON shape + fix-it keys", { timeout: SANDBOX_EXPLAIN_TEST_TIMEOUT_MS }, async () => {
    mockCfg = {
      agents: {
        defaults: {
          sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        },
      },
      tools: {
        sandbox: { tools: { deny: ["browser"] } },
        elevated: { enabled: true, allowFrom: { whatsapp: ["*"] } },
      },
      session: { store: "/tmp/openclaw-test-sessions-{agentId}.json" },
    };

    const logs: string[] = [];
    await sandboxExplainCommand({ json: true, session: "agent:main:main" }, {
      log: (msg: string) => logs.push(msg),
      error: (msg: string) => logs.push(msg),
      exit: (_code: number) => {},
    } as unknown as Parameters<typeof sandboxExplainCommand>[1]);

    const out = logs.join("");
    const parsed = JSON.parse(out);
    expect(parsed).toHaveProperty("docsUrl", "https://docs.openclaw.ai/sandbox");
    expect(parsed).toHaveProperty("sandbox.mode", "all");
    expect(parsed).toHaveProperty("sandbox.trustPosture", "sandbox-first");
    expect(parsed).toHaveProperty("sandbox.trustLabel", "sandbox-first runtime");
    expect(parsed).toHaveProperty("sandbox.tools.sources.allow.source");
    expect(parsed).toHaveProperty("capabilities.counts.byClass.gateway-brokered", 1);
    expect(parsed).toHaveProperty("capabilities.counts.byClass.unsupported-in-current-runtime", 2);
    expect(normalizeCapabilitySnapshotParityRows(parsed.capabilities)).toEqual(
      CAPABILITY_READINESS_PARITY_MATRIX,
    );
    expect(parsed.capabilities.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capabilityClass: "configured-but-blocked",
          primaryReasonCategory: "policy-block",
        }),
        expect.objectContaining({
          capabilityClass: "unsupported-in-current-runtime",
          primaryReasonCategory: "projection-defect",
        }),
      ]),
    );
    expect(Array.isArray(parsed.fixIt)).toBe(true);
    expect(parsed.fixIt).not.toContain("agents.defaults.sandbox.mode=off");
    expect(parsed.fixIt).toContain("tools.sandbox.tools.deny");
  });

  it("prints effective capability classes and normalized reasons in text output", async () => {
    mockCfg = {
      agents: {
        defaults: {
          sandbox: { mode: "all", scope: "session", workspaceAccess: "none" },
        },
      },
      tools: {
        sandbox: { tools: { deny: ["browser"] } },
      },
      session: { store: "/tmp/openclaw-test-sessions-{agentId}.json" },
    };

    const logs: string[] = [];
    await sandboxExplainCommand({ json: false, session: "agent:main:main" }, {
      log: (msg: string) => logs.push(msg),
      error: (msg: string) => logs.push(msg),
      exit: (_code: number) => {},
    } as unknown as Parameters<typeof sandboxExplainCommand>[1]);

    const out = logs.join("\n");
    expect(out).toContain("Effective capabilities:");
    expect(out).toContain("trustPosture:");
    expect(out).toContain("sandbox-first");
    expect(out).toContain("gateway-brokered");
    expect(out).toContain("remote-node-assisted");
    expect(out).toContain("configured-but-blocked");
    expect(out).toContain("unsupported-in-current-runtime");
    expect(out).toContain("policy-block");
    expect(out).toContain("config-gap");
    expect(out).toContain("projection-defect");
    expect(out).toContain("remote-assisted-availability");
    expect(out).toContain("gateway-brokered-availability");
  });

  it("labels unsandboxed explain output as reduced-trust host compatibility", async () => {
    mockCfg = {
      agents: {
        defaults: {
          sandbox: { mode: "off", scope: "session", workspaceAccess: "none" },
        },
      },
      session: { store: "/tmp/openclaw-test-sessions-{agentId}.json" },
    };

    const logs: string[] = [];
    await sandboxExplainCommand({ json: false, session: "agent:main:main" }, {
      log: (msg: string) => logs.push(msg),
      error: (msg: string) => logs.push(msg),
      exit: (_code: number) => {},
    } as unknown as Parameters<typeof sandboxExplainCommand>[1]);

    const out = logs.join("\n");
    expect(out).toContain("reduced-trust host compatibility mode");
    expect(out).toContain("host-compatibility");
    expect(out).toContain('agents.defaults.sandbox.mode="all"');
    expect(out).not.toContain("runtime: direct");
  });
});
