import { describe, expect, it } from "vitest";

import { isSenderAllowed } from "./monitor.js";

describe("isSenderAllowed", () => {
<<<<<<< HEAD
  it("matches allowlist entries with users/<email>", () => {
    expect(
      isSenderAllowed("users/123", "Jane@Example.com", ["users/jane@example.com"]),
    ).toBe(true);
  });

=======
>>>>>>> c8424bf29 (fix(googlechat): deprecate users/<email> allowlists (#16243))
  it("matches allowlist entries with raw email", () => {
    expect(isSenderAllowed("users/123", "Jane@Example.com", ["jane@example.com"])).toBe(
      true,
    );
  });

  it("does not treat users/<email> entries as email allowlist (deprecated form)", () => {
    expect(isSenderAllowed("users/123", "Jane@Example.com", ["users/jane@example.com"])).toBe(
      false,
    );
  });

  it("still matches user id entries", () => {
    expect(isSenderAllowed("users/abc", "jane@example.com", ["users/abc"])).toBe(true);
  });

  it("rejects non-matching raw email entries", () => {
    expect(isSenderAllowed("users/123", "jane@example.com", ["other@example.com"])).toBe(false);
  });
});
