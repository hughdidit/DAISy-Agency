import { describe, expect, it } from "vitest";
import { PluginError, toStructuredError } from "../../src/errors.js";

describe("structured error redaction", () => {
  it("redacts sensitive error details before surfacing", () => {
    const error = new PluginError("AUTH_ERROR", "denied", {
      credentialsFile: "/home/node/.openclaw/secrets/gws/credentials.json",
      tokenValue: "ya29.super-secret-token-value",
      mode: "0600",
    });

    const mapped = toStructuredError({
      error,
      tool: "gws_status",
      action: "status",
      service: "status",
      latencyMs: 1,
    });

    expect(mapped.ok).toBe(false);
    expect(mapped.error.code).toBe("AUTH_ERROR");
    expect(mapped.error.details).toMatchObject({
      credentialsFile: "[REDACTED]",
      tokenValue: "[REDACTED]",
      mode: "0600",
    });
  });
});
