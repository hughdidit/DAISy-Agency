import { describe, expect, it } from "vitest";
<<<<<<< HEAD

import { buildMessagingTarget, ensureTargetId, requireTargetKind } from "./targets.js";

describe("ensureTargetId", () => {
  it("returns the candidate when it matches", () => {
=======
import { buildMessagingTarget, ensureTargetId, requireTargetKind } from "./targets.js";

describe("channel targets", () => {
  it("ensureTargetId returns the candidate when it matches", () => {
>>>>>>> d42ef2ac6 (refactor: consolidate typing lifecycle and queue policy)
    expect(
      ensureTargetId({
        candidate: "U123",
        pattern: /^[A-Z0-9]+$/i,
        errorMessage: "bad",
      }),
    ).toBe("U123");
  });

<<<<<<< HEAD
  it("throws with the provided message on mismatch", () => {
=======
  it("ensureTargetId throws with the provided message on mismatch", () => {
>>>>>>> d42ef2ac6 (refactor: consolidate typing lifecycle and queue policy)
    expect(() =>
      ensureTargetId({
        candidate: "not-ok",
        pattern: /^[A-Z0-9]+$/i,
        errorMessage: "Bad target",
      }),
    ).toThrow(/Bad target/);
  });
<<<<<<< HEAD
});

describe("requireTargetKind", () => {
  it("returns the target id when the kind matches", () => {
=======

  it("requireTargetKind returns the target id when the kind matches", () => {
>>>>>>> d42ef2ac6 (refactor: consolidate typing lifecycle and queue policy)
    const target = buildMessagingTarget("channel", "C123", "C123");
    expect(requireTargetKind({ platform: "Slack", target, kind: "channel" })).toBe("C123");
  });

<<<<<<< HEAD
  it("throws when the kind is missing or mismatched", () => {
=======
  it("requireTargetKind throws when the kind is missing or mismatched", () => {
>>>>>>> d42ef2ac6 (refactor: consolidate typing lifecycle and queue policy)
    expect(() =>
      requireTargetKind({ platform: "Slack", target: undefined, kind: "channel" }),
    ).toThrow(/Slack channel id is required/);
    const target = buildMessagingTarget("user", "U123", "U123");
    expect(() => requireTargetKind({ platform: "Slack", target, kind: "channel" })).toThrow(
      /Slack channel id is required/,
    );
  });
});
