import { describe, expect, it } from "vitest";
import { createAuditLogger } from "../../src/audit.js";
import { createRedactingLogger } from "../../src/logger.js";

describe("audit", () => {
  it("emits normalized allow/deny events with route and binding metadata", () => {
    const logs: string[] = [];
    const logger = createRedactingLogger({
      info(message, payload) {
        logs.push(`${message} ${JSON.stringify(payload)}`);
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
    const event = audit.emit({
      ctx: {
        agentId: "agent",
        sessionId: "session",
        sessionKey: "agent:agent:main",
      },
      toolName: "gws_drive_write",
      action: "create_folder",
      targetService: "drive",
      readOnly: false,
      decision: "allow",
      routeName: "ops-drive",
      bindingSubject: "agent:agent",
      credentialMode: "token",
      latencyMs: 12,
      resultCode: "OK",
    });

    expect(event.readOnly).toBe(false);
    expect(event.routeName).toBe("ops-drive");
    expect(event.bindingSubject).toBe("agent:agent");
    expect(logs.join("\n")).toContain('"routeName":"ops-drive"');
  });
});
