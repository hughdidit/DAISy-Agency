import { describe, expect, it } from "vitest";
import { createCapabilityParitySnapshotFixture } from "../test-utils/capability-readiness-parity.js";
import { buildCapabilityReadinessSection } from "./doctor-workspace-status.js";

describe("doctor workspace status readiness section", () => {
  it("returns structured counts and findings without scraping terminal output", () => {
    const section = buildCapabilityReadinessSection({
      snapshot: createCapabilityParitySnapshotFixture(),
    });

    expect(section.counts.byClass["sandbox-local"]).toBe(1);
    expect(section.counts.byClass["gateway-brokered"]).toBe(1);
    expect(section.counts.byClass["remote-node-assisted"]).toBe(1);
    expect(section.counts.byClass["configured-but-blocked"]).toBe(2);
    expect(section.counts.byClass["unsupported-in-current-runtime"]).toBe(2);
    expect(section.findings.map((finding) => finding.primaryReasonCategory)).toEqual([
      "config-gap",
      "policy-block",
      "projection-defect",
      "runtime-profile-gap",
      "remote-assisted-availability",
      "gateway-brokered-availability",
    ]);
    expect(section.lines).toContain("unsupported-in-current-runtime: 2");
    expect(section.lines.some((line) => line.includes("runtime-profile-gap"))).toBe(true);
  });

  it("uses filter-aware fallback messages when no findings are emitted", () => {
    const limitedSection = buildCapabilityReadinessSection({
      snapshot: createCapabilityParitySnapshotFixture(),
      capabilityClasses: ["gateway-brokered"],
      limit: 0,
    });

    expect(limitedSection.findings).toEqual([]);
    expect(limitedSection.lines).toContain("Findings omitted by the selected limit.");

    const emptySection = buildCapabilityReadinessSection({
      snapshot: createCapabilityParitySnapshotFixture(),
      capabilityClasses: ["sandbox-local"],
    });

    expect(emptySection.findings).toEqual([]);
    expect(emptySection.lines).toContain("No findings in the selected classes.");
  });
});
