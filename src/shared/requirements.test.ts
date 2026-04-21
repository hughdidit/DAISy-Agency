import { describe, expect, it } from "vitest";
import {
  buildConfigChecks,
  evaluateRequirementsFromMetadata,
  resolveMissingAnyBins,
  resolveMissingBins,
  resolveMissingEnv,
  resolveMissingOs,
  resolveRemoteSatisfiedAnyBins,
  resolveRemoteSatisfiedBins,
  resolveRemoteSatisfiedOs,
} from "./requirements.js";

describe("requirements helpers", () => {
  it("resolveMissingBins respects local+remote", () => {
    expect(
      resolveMissingBins({
        required: ["a", "b", "c"],
        hasLocalBin: (bin) => bin === "a",
        hasRemoteBin: (bin) => bin === "b",
      }),
    ).toEqual(["c"]);
  });

  it("resolveRemoteSatisfiedBins records remote-only binary matches", () => {
    expect(
      resolveRemoteSatisfiedBins({
        required: ["a", "b", "c"],
        hasLocalBin: (bin) => bin === "a",
        hasRemoteBin: (bin) => bin === "b",
      }),
    ).toEqual(["b"]);
  });

  it("resolveMissingAnyBins requires at least one", () => {
    expect(
      resolveMissingAnyBins({
        required: ["a", "b"],
        hasLocalBin: () => false,
        hasRemoteAnyBin: () => false,
      }),
    ).toEqual(["a", "b"]);
    expect(
      resolveMissingAnyBins({
        required: ["a", "b"],
        hasLocalBin: (bin) => bin === "b",
      }),
    ).toEqual([]);
  });

  it("resolveRemoteSatisfiedAnyBins records remote any-bin support", () => {
    expect(
      resolveRemoteSatisfiedAnyBins({
        required: ["a", "b"],
        hasLocalBin: () => false,
        hasRemoteAnyBin: () => true,
      }),
    ).toEqual(["a", "b"]);
    expect(
      resolveRemoteSatisfiedAnyBins({
        required: ["a", "b"],
        hasLocalBin: (bin) => bin === "b",
        hasRemoteAnyBin: () => true,
      }),
    ).toEqual([]);
  });

  it("resolveMissingOs allows remote platform", () => {
    expect(
      resolveMissingOs({
        required: ["darwin"],
        localPlatform: "linux",
        remotePlatforms: ["darwin"],
      }),
    ).toEqual([]);
    expect(resolveMissingOs({ required: ["darwin"], localPlatform: "linux" })).toEqual(["darwin"]);
  });

  it("resolveRemoteSatisfiedOs records remote platform support", () => {
    expect(
      resolveRemoteSatisfiedOs({
        required: ["darwin"],
        localPlatform: "linux",
        remotePlatforms: ["darwin"],
      }),
    ).toEqual(["darwin"]);
    expect(resolveRemoteSatisfiedOs({ required: ["darwin"], localPlatform: "darwin" })).toEqual([]);
  });

  it("resolveMissingEnv uses predicate", () => {
    expect(
      resolveMissingEnv({ required: ["A", "B"], isSatisfied: (name) => name === "B" }),
    ).toEqual(["A"]);
  });

  it("buildConfigChecks includes status", () => {
    expect(
      buildConfigChecks({
        required: ["a.b"],
        isSatisfied: (p) => p === "a.b",
      }),
    ).toEqual([{ path: "a.b", satisfied: true }]);
  });

  it("evaluateRequirementsFromMetadata derives required+missing", () => {
    const res = evaluateRequirementsFromMetadata({
      always: false,
      metadata: {
        requires: { bins: ["a"], anyBins: ["b"], env: ["E"], config: ["cfg.value"] },
        os: ["darwin"],
      },
      hasLocalBin: (bin) => bin === "a",
      localPlatform: "linux",
      isEnvSatisfied: (name) => name === "E",
      isConfigSatisfied: () => false,
    });

    expect(res.required.bins).toEqual(["a"]);
    expect(res.missing.config).toEqual(["cfg.value"]);
    expect(res.missing.os).toEqual(["darwin"]);
    expect(res.remoteSatisfied).toEqual({ bins: [], anyBins: [], os: [] });
    expect(res.eligible).toBe(false);
  });

  it("evaluateRequirementsFromMetadata records remote-backed provenance", () => {
    const res = evaluateRequirementsFromMetadata({
      always: false,
      metadata: {
        requires: { bins: ["xcodebuild"], anyBins: ["rg", "grep"] },
        os: ["darwin"],
      },
      hasLocalBin: () => false,
      hasRemoteBin: (bin) => bin === "xcodebuild",
      hasRemoteAnyBin: () => true,
      localPlatform: "linux",
      remotePlatforms: ["darwin"],
      remoteNote: "Remote macOS node available.",
      isEnvSatisfied: () => true,
      isConfigSatisfied: () => true,
    });

    expect(res.missing).toEqual({
      bins: [],
      anyBins: [],
      env: [],
      config: [],
      os: [],
    });
    expect(res.remoteSatisfied).toEqual({
      bins: ["xcodebuild"],
      anyBins: ["rg", "grep"],
      os: ["darwin"],
      note: "Remote macOS node available.",
    });
    expect(res.eligible).toBe(true);
  });
});
