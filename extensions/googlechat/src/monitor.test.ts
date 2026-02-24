import { describe, expect, it } from "vitest";

import { isSenderAllowed } from "./monitor.js";

describe("isSenderAllowed", () => {
<<<<<<< HEAD
  it("matches allowlist entries with users/<email>", () => {
    expect(
      isSenderAllowed("users/123", "Jane@Example.com", ["users/jane@example.com"]),
    ).toBe(true);
=======
  it("matches raw email entries only when dangerous name matching is enabled", () => {
    expect(isSenderAllowed("users/123", "Jane@Example.com", ["jane@example.com"])).toBe(false);
    expect(isSenderAllowed("users/123", "Jane@Example.com", ["jane@example.com"], true)).toBe(true);
>>>>>>> cfa44ea6b (fix(security): make allowFrom id-only by default with dangerous name opt-in (#24907))
  });

  it("matches allowlist entries with raw email", () => {
    expect(isSenderAllowed("users/123", "Jane@Example.com", ["jane@example.com"])).toBe(
      true,
    );
  });

  it("still matches user id entries", () => {
    expect(isSenderAllowed("users/abc", "jane@example.com", ["users/abc"])).toBe(true);
  });

<<<<<<< HEAD
  it("rejects non-matching emails", () => {
    expect(isSenderAllowed("users/123", "jane@example.com", ["users/other@example.com"])).toBe(
=======
  it("rejects non-matching raw email entries", () => {
    expect(isSenderAllowed("users/123", "jane@example.com", ["other@example.com"], true)).toBe(
>>>>>>> cfa44ea6b (fix(security): make allowFrom id-only by default with dangerous name opt-in (#24907))
      false,
    );
  });
});
