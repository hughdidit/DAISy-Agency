import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createAuditLogger } from "../../src/audit.js";
import { executeCalendarRead } from "../../src/commands/calendar-read.js";
import { resolveConfig } from "../../src/config.js";
import type { ConfigPosture, GwsToolkitConfig } from "../../src/types.js";

function createConfigResolution(raw: Record<string, unknown>): {
  ok: true;
  config: GwsToolkitConfig;
  posture: ConfigPosture;
} {
  const resolved = resolveConfig(raw);
  if (!resolved.ok) {
    throw new Error(resolved.error.error.message);
  }
  return {
    ok: true,
    config: resolved.value.config,
    posture: resolved.value.posture,
  };
}

const audit = createAuditLogger({
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
});

describe("integration: delegated direct Google API transport", () => {
  it("uses direct transport for agent Google Workspace identity routes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "gws-direct-"));
    const credentialsFile = path.join(root, "service-account.json");
    await fs.writeFile(
      credentialsFile,
      JSON.stringify({
        type: "service_account",
        client_email: "svc@example.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
      }),
      "utf8",
    );
    if (process.platform !== "win32") {
      await fs.chmod(credentialsFile, 0o600);
    }

    const configResolution = createConfigResolution({
      enabledServices: ["calendar"],
      allowedCredentialModes: ["credentials_file"],
      approvedCredentialDirs: [root],
      workspaceIdentityDomains: ["hughdidit.com"],
      credentialRoutes: {
        main: {
          mode: "credentials_file",
          allowedServices: ["calendar"],
          allowedTools: ["gws_calendar_read"],
          credentialsFile,
        },
      },
      agentCredentialBindings: {
        "agent:main": "main",
      },
    });

    let directCalls = 0;
    const result = await executeCalendarRead({
      ctx: {
        agentId: "main",
        sessionKey: "agent:main:main",
        googleWorkspaceEmail: "daisy.ai@hughdidit.com",
      },
      deps: {
        config: configResolution.config,
        audit,
        directGoogleExecutor: async ({ auth, action }) => {
          directCalls += 1;
          expect(action).toBe("list_events");
          expect(auth.transport).toBe("google_api");
          expect(auth.impersonatedUser).toBe("daisy.ai@hughdidit.com");
          return {
            payload: { items: [] },
            output: { stdoutTruncated: false, stderrTruncated: false },
          };
        },
      },
      rawParams: { action: "list_events", calendarId: "primary", pageSize: 1 },
    });

    expect(result.ok).toBe(true);
    expect(directCalls).toBe(1);
    if (!result.ok) {
      return;
    }
    expect(result.data.route).toMatchObject({
      transport: "google_api",
      delegatedSubject: "daisy.ai@hughdidit.com",
    });
  });
});
