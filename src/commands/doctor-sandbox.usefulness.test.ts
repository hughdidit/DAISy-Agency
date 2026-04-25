import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  buildResolvedToolCapability,
  createResolvedCapabilityManifest,
} from "../shared/resolved-capability-manifest.js";
import {
  OFFICIAL_SANDBOX_BASE_IMAGE,
  OFFICIAL_SANDBOX_BROWSER_IMAGE,
  OFFICIAL_SANDBOX_COMMON_IMAGE,
} from "../shared/sandbox-runtime-profiles.js";
import type { CommandCapabilitySnapshot } from "./capability-readiness.js";
import { createEmptyCapabilitySnapshotFixture } from "./capability-readiness.test-helpers.js";

const mocks = vi.hoisted(() => ({
  runExec: vi.fn(),
  note: vi.fn(),
  collectCommandCapabilitySnapshot: vi.fn(),
}));

const { runExec, note, collectCommandCapabilitySnapshot } = mocks;

vi.mock("../process/exec.js", () => ({
  runExec,
  runCommandWithTimeout: vi.fn(),
}));

vi.mock("../terminal/note.js", () => ({
  note,
}));

vi.mock("./capability-readiness.js", () => ({
  collectCommandCapabilitySnapshot,
}));

const { noteSandboxUsefulnessWarnings } = await import("./doctor-sandbox.js");

function createConfig(
  overrides: Partial<{
    profile: "ops-readonly" | "coding-base" | "coding-extended" | "browser-automation";
    dockerImage: string;
    browserEnabled: boolean;
    browserImage: string;
  }> = {},
): OpenClawConfig {
  return {
    agents: {
      defaults: {
        sandbox: {
          mode: "all",
          scope: "session",
          profile: overrides.profile ?? "coding-base",
          docker: {
            image: overrides.dockerImage ?? OFFICIAL_SANDBOX_BASE_IMAGE,
          },
          browser: {
            enabled: overrides.browserEnabled ?? false,
            image: overrides.browserImage ?? OFFICIAL_SANDBOX_BROWSER_IMAGE,
          },
        },
      },
    },
  } satisfies OpenClawConfig;
}

function createSnapshot(params?: {
  runtimeProfile?: "ops-readonly" | "coding-base" | "coding-extended" | "browser-automation";
  capabilities?: ReturnType<typeof buildResolvedToolCapability>[];
}): CommandCapabilitySnapshot {
  const runtimeContext = {
    agentId: "main",
    sandboxMode: "all",
    sandboxScope: "session",
    runtimeProfile: params?.runtimeProfile ?? "coding-base",
    sandboxed: true,
  } as const;
  return {
    ...createEmptyCapabilitySnapshotFixture(),
    runtimeContext,
    manifest: createResolvedCapabilityManifest({
      runtimeContext,
      capabilities: params?.capabilities ?? [],
    }),
  };
}

function configureDocker(params: { available?: boolean; existingImages?: string[] }) {
  const existingImages = new Set(params.existingImages ?? []);
  runExec.mockImplementation(async (_command: string, args: string[]) => {
    if (args[0] === "version") {
      if (params.available === false) {
        throw new Error("Docker not installed");
      }
      return { stdout: "24.0.0", stderr: "" };
    }
    if (args[0] === "image" && args[1] === "inspect") {
      const image = args[2] ?? "";
      if (existingImages.has(image)) {
        return { stdout: "{}", stderr: "" };
      }
      const error = new Error(`No such image: ${image}`) as Error & { stderr: string };
      error.stderr = `Error response from daemon: No such image: ${image}`;
      throw error;
    }
    return { stdout: "", stderr: "" };
  });
}

function getSandboxUsefulnessMessage(): string | undefined {
  const call = note.mock.calls.find(([, title]) => title === "Sandbox usefulness");
  return typeof call?.[0] === "string" ? call[0] : undefined;
}

describe("noteSandboxUsefulnessWarnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureDocker({
      available: true,
      existingImages: [OFFICIAL_SANDBOX_BASE_IMAGE, OFFICIAL_SANDBOX_BROWSER_IMAGE],
    });
    collectCommandCapabilitySnapshot.mockImplementation((params?: { mode?: string }) =>
      createSnapshot({
        runtimeProfile: params?.mode === "readonly-sandbox" ? "ops-readonly" : "coding-base",
      }),
    );
  });

  it("warns when the selected profile uses another official profile's image", async () => {
    configureDocker({
      available: true,
      existingImages: [OFFICIAL_SANDBOX_COMMON_IMAGE, OFFICIAL_SANDBOX_BROWSER_IMAGE],
    });

    await noteSandboxUsefulnessWarnings(
      createConfig({
        profile: "coding-base",
        dockerImage: OFFICIAL_SANDBOX_COMMON_IMAGE,
      }),
    );

    const message = getSandboxUsefulnessMessage();
    expect(message).toContain("Unsupported official profile/image combination");
    expect(message).toContain("coding-extended");
    expect(message).toContain('use the official image set for "coding-base"');
  });

  it("warns when a custom base image exists but is outside declared support", async () => {
    configureDocker({
      available: true,
      existingImages: ["ghcr.io/example/custom-sandbox:latest", OFFICIAL_SANDBOX_BROWSER_IMAGE],
    });

    await noteSandboxUsefulnessWarnings(
      createConfig({
        profile: "coding-base",
        dockerImage: "ghcr.io/example/custom-sandbox:latest",
      }),
    );

    const message = getSandboxUsefulnessMessage();
    expect(message).toContain("Custom image outside declared support");
    expect(message).toContain("ghcr.io/example/custom-sandbox:latest");
  });

  it("warns when browser automation is selected but the browser runtime is disabled", async () => {
    await noteSandboxUsefulnessWarnings(
      createConfig({
        profile: "browser-automation",
        browserEnabled: false,
      }),
    );

    const message = getSandboxUsefulnessMessage();
    expect(message).toContain("Browser profile/runtime mismatch");
    expect(message).toContain("requires the dedicated sandbox browser runtime");
  });

  it("warns when browser runtime is enabled on a non-browser profile", async () => {
    await noteSandboxUsefulnessWarnings(
      createConfig({
        profile: "coding-base",
        browserEnabled: true,
      }),
    );

    const message = getSandboxUsefulnessMessage();
    expect(message).toContain("Browser profile/runtime mismatch");
    expect(message).toContain(
      'declared profile "coding-base" does not include browser runtime support',
    );
  });

  it("warns when readonly diagnostics are missing projected runtime material", async () => {
    collectCommandCapabilitySnapshot.mockImplementation((params?: { mode?: string }) =>
      params?.mode === "readonly-sandbox"
        ? createSnapshot({
            runtimeProfile: "ops-readonly",
            capabilities: [
              buildResolvedToolCapability({
                id: "read",
                label: "Read",
                description: "Read files",
                source: "core",
                defaultProfiles: ["coding"],
                runtimeContext: {
                  agentId: "main",
                  sandboxMode: "all",
                  sandboxScope: "session",
                  runtimeProfile: "ops-readonly",
                  sandboxed: true,
                },
                capabilityClass: "unsupported-in-current-runtime",
                evidence: {
                  projection: {
                    missingPaths: [
                      "/workspace/.openclaw-readonly/openclaw.json",
                      "/workspace/.openclaw-readonly/state/extensions",
                    ],
                    reasonCodes: ["missing-projection"],
                    detail: "Readonly projection incomplete.",
                  },
                },
              }),
            ],
          })
        : createSnapshot(),
    );

    await noteSandboxUsefulnessWarnings(createConfig());

    const message = getSandboxUsefulnessMessage();
    expect(message).toContain("Missing projected assets");
    expect(message).toContain("/workspace/.openclaw-readonly/openclaw.json");
  });

  it("warns only for missing runtime dependencies that belong to the declared profile", async () => {
    collectCommandCapabilitySnapshot.mockImplementation((params?: { mode?: string }) =>
      params?.mode === "gateway"
        ? createSnapshot({
            capabilities: [
              buildResolvedToolCapability({
                id: "exec",
                label: "Exec",
                description: "Execute commands",
                source: "core",
                defaultProfiles: ["coding"],
                runtimeContext: {
                  agentId: "main",
                  sandboxMode: "all",
                  sandboxScope: "session",
                  runtimeProfile: "coding-base",
                  sandboxed: true,
                },
                capabilityClass: "unsupported-in-current-runtime",
                evidence: {
                  runtime: {
                    profile: "coding-base",
                    supportStatus: "official",
                    declaredImage: OFFICIAL_SANDBOX_BASE_IMAGE,
                    matchedImage: OFFICIAL_SANDBOX_BASE_IMAGE,
                    missingBins: ["node", "xcodebuild"],
                    missingAnyBins: [],
                    missingOs: [],
                    reasonCodes: ["missing-runtime-binaries"],
                    detail: "Runtime baseline is incomplete.",
                  },
                },
              }),
            ],
          })
        : createSnapshot({
            runtimeProfile: "ops-readonly",
          }),
    );

    await noteSandboxUsefulnessWarnings(createConfig());

    const message = getSandboxUsefulnessMessage();
    expect(message).toContain("Missing expected runtime dependency");
    expect(message).toContain("node");
    expect(message).not.toContain("xcodebuild");
  });

  it("does not emit a usefulness warning for a healthy official coding-base runtime", async () => {
    await noteSandboxUsefulnessWarnings(createConfig());

    expect(getSandboxUsefulnessMessage()).toBeUndefined();
  });
});
