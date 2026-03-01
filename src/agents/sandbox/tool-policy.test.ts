import { describe, expect, it } from "vitest";
import type { SandboxToolPolicy } from "./types.js";
import { isToolAllowed, resolveSandboxToolPolicyForAgent } from "./tool-policy.js";

describe("sandbox tool policy", () => {
  it("allows all tools with * allow", () => {
    const policy: SandboxToolPolicy = { allow: ["*"], deny: [] };
    expect(isToolAllowed(policy, "browser")).toBe(true);
  });

  it("denies all tools with * deny", () => {
    const policy: SandboxToolPolicy = { allow: [], deny: ["*"] };
    expect(isToolAllowed(policy, "read")).toBe(false);
  });

  it("supports wildcard patterns", () => {
    const policy: SandboxToolPolicy = { allow: ["web_*"] };
    expect(isToolAllowed(policy, "web_fetch")).toBe(true);
    expect(isToolAllowed(policy, "read")).toBe(false);
  });

  it("defaults to read-only style tool allowlist", () => {
    const policy = resolveSandboxToolPolicyForAgent();

    expect(policy.allow).toContain("read");
    expect(policy.allow).toContain("sessions_list");
    expect(policy.allow).toContain("sessions_history");
    expect(policy.allow).toContain("session_status");

    expect(policy.allow).not.toContain("write");
    expect(policy.allow).not.toContain("edit");
    expect(policy.allow).not.toContain("apply_patch");
    expect(policy.allow).not.toContain("exec");
    expect(policy.allow).not.toContain("browser");
  });
});
