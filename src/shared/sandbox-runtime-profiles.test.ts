import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SANDBOX_RUNTIME_CAPABILITY_FAMILY_IDS,
  SANDBOX_RUNTIME_SKILL_FAMILY_IDS,
  getSandboxRuntimeProfile,
  isSandboxRuntimeProfileId,
  resolveCoreToolCapabilityFamily,
  SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS,
  SUPPORTED_SANDBOX_RUNTIME_PROFILES,
} from "./sandbox-runtime-profiles.js";

function readRepoFile(...segments: string[]) {
  return fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");
}

function extractProfileTableIds(markdown: string): string[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\|\s*`[a-z-]+`\s*\|/.test(line))
    .map((line) => line.match(/`([a-z-]+)`/)?.[1] ?? "")
    .filter(Boolean);
}

describe("sandbox runtime profiles", () => {
  it("keeps the official sandbox runtime profile ids stable", () => {
    expect(SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS).toEqual([
      "ops-readonly",
      "coding-base",
      "coding-extended",
      "browser-automation",
    ]);
  });

  it("has no duplicate profile definitions", () => {
    expect(new Set(SUPPORTED_SANDBOX_RUNTIME_PROFILES.map((profile) => profile.id)).size).toBe(
      SUPPORTED_SANDBOX_RUNTIME_PROFILES.length,
    );
  });

  it("requires every profile to define complete SBX-301 and SBX-302 metadata", () => {
    for (const profile of SUPPORTED_SANDBOX_RUNTIME_PROFILES) {
      expect(profile.label.trim().length).toBeGreaterThan(0);
      expect(profile.description.trim().length).toBeGreaterThan(0);
      expect(profile.intendedWorkload.trim().length).toBeGreaterThan(0);
      expect(profile.trustPosture.trim().length).toBeGreaterThan(0);
      expect(profile.baselineExpectations.trim().length).toBeGreaterThan(0);
      expect(profile.supportMode).toBeTruthy();
      expect(profile.expectedNetworkPosture).toBeTruthy();
      expect(profile.filesystemExpectation).toBeTruthy();
      expect(profile.supportedSkillFamilies.length).toBeGreaterThan(0);
      expect(profile.supportedCapabilityFamilies.length).toBeGreaterThan(0);
      expect(profile.unsupportedBehaviors.length).toBeGreaterThan(0);
      expect(profile.expectedBinaries.length).toBeGreaterThan(0);
      expect(profile.expectedRuntimes.length).toBeGreaterThan(0);
      for (const family of profile.supportedSkillFamilies) {
        expect(SANDBOX_RUNTIME_SKILL_FAMILY_IDS).toContain(family);
      }
      for (const family of profile.supportedCapabilityFamilies) {
        expect(SANDBOX_RUNTIME_CAPABILITY_FAMILY_IDS).toContain(family);
      }
    }
  });

  it("declares every assistance boolean explicitly", () => {
    for (const profile of SUPPORTED_SANDBOX_RUNTIME_PROFILES) {
      expect(profile.assistance).toHaveProperty("sandboxLocal");
      expect(profile.assistance).toHaveProperty("gatewayBrokered");
      expect(profile.assistance).toHaveProperty("browser");
      expect(profile.assistance).toHaveProperty("remoteNode");
      expect(typeof profile.assistance.sandboxLocal).toBe("boolean");
      expect(typeof profile.assistance.gatewayBrokered).toBe("boolean");
      expect(typeof profile.assistance.browser).toBe("boolean");
      expect(typeof profile.assistance.remoteNode).toBe("boolean");
    }
  });

  it("accepts only supported ids through guard and lookup helpers", () => {
    for (const id of SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS) {
      expect(isSandboxRuntimeProfileId(id)).toBe(true);
      expect(getSandboxRuntimeProfile(id)?.id).toBe(id);
    }

    expect(isSandboxRuntimeProfileId("coding-extended")).toBe(true);
    expect(isSandboxRuntimeProfileId("data-processing")).toBe(false);
  });

  it("declares zip tooling in sandbox profiles backed by the default runtime image", () => {
    for (const id of ["coding-base", "coding-extended", "browser-automation"] as const) {
      expect(getSandboxRuntimeProfile(id)?.expectedBinaries).toEqual(
        expect.arrayContaining(["zip", "unzip"]),
      );
    }
  });

  it("uses a generic core-tool fallback instead of classifying unknown core tools as plugin-brokered", () => {
    expect(resolveCoreToolCapabilityFamily("read")).toBe("filesystem-read");
    expect(resolveCoreToolCapabilityFamily("some-future-core-tool")).toBe("automation");
  });

  it("documents exactly the supported official profile ids in English and zh-CN docs", () => {
    const englishDoc = readRepoFile("docs", "gateway", "sandbox-runtime-profiles.md");
    const chineseDoc = readRepoFile("docs", "zh-CN", "gateway", "sandbox-runtime-profiles.md");
    const docsJson = readRepoFile("docs", "docs.json");

    expect(extractProfileTableIds(englishDoc)).toEqual([...SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS]);
    expect(extractProfileTableIds(chineseDoc)).toEqual([...SUPPORTED_SANDBOX_RUNTIME_PROFILE_IDS]);
    expect(docsJson).toContain('"gateway/sandbox-runtime-profiles"');
    expect(docsJson).toContain('"zh-CN/gateway/sandbox-runtime-profiles"');
  });
});
