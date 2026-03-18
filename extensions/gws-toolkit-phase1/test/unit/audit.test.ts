import { describe, expect, it } from "vitest";
import { createAuditLogger } from "../../src/audit.js";
import { createRedactingLogger } from "../../src/logger.js";

describe("audit", () => {
  it("emits normalized allow/deny events with redaction", () => {
    const logs: string[] = [];
    const logger = createRedactingLogger({
      info(message) {
        logs.push(message);
      },
      warn(message) {
        logs.push(message);
      },
      error(message) {
        logs.push(message);
      },
      debug(message) {
        logs.push(message);
      },
    });

    const audit = createAuditLogger(logger);
    const allowEvent = audit.emit({
      ctx: { agentId: "agent", sessionId: "session" },
      toolName: "gws_status",
      action: "status",
      targetService: "status",
      decision: "allow",
      latencyMs: 12,
      resultCode: "OK",
    });

    expect(allowEvent.decision).toBe("allow");
    expect(allowEvent.readOnly).toBe(true);
    expect(logs.join("\n")).not.toContain("authorization");
  });
});
