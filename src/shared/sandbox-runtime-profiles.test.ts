import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getSandboxRuntimeProfile,
  isSandboxRuntimeProfileId,
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
      "browser-automation",
    ]);
  });

  it("has no duplicate profile definitions", () => {
    expect(new Set(SUPPORTED_SANDBOX_RUNTIME_PROFILES.map((profile) => profile.id)).size).toBe(
      SUPPORTED_SANDBOX_RUNTIME_PROFILES.length,
    );
  });

  it("requires every profile to define non-empty descriptive fields", () => {
    for (const profile of SUPPORTED_SANDBOX_RUNTIME_PROFILES) {
      expect(profile.label.trim().length).toBeGreaterThan(0);
      expect(profile.description.trim().length).toBeGreaterThan(0);
      expect(profile.intendedWorkload.trim().length).toBeGreaterThan(0);
      expect(profile.trustPosture.trim().length).toBeGreaterThan(0);
      expect(profile.baselineExpectations.trim().length).toBeGreaterThan(0);
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

    expect(isSandboxRuntimeProfileId("coding-extended")).toBe(false);
    expect(isSandboxRuntimeProfileId("data-processing")).toBe(false);
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

