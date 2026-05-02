import { describe, expect, it } from "vitest";
import { resolveCredentialRoute, resolveBindingSubject } from "../../src/credential-routing.js";
import type { GwsToolkitConfig } from "../../src/types.js";

const config: GwsToolkitConfig = {
  enabledServices: ["drive", "gmail"],
  enabledWriteServices: ["drive"],
  approvedCredentialDirs: [],
  tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
  timeoutMs: 1000,
  maxStdoutBytes: 1024,
  maxStderrBytes: 1024,
  safeMode: true,
  allowedCredentialModes: ["token"],
  allowWriteOperations: true,
  allowUnboundAgents: false,
  defaultCredentialRoute: null,
  credentialRoutes: {
    "drive-writer": {
      mode: "token",
      allowedServices: ["drive"],
      allowedTools: ["gws_drive_read", "gws_drive_write"],
    },
    "gmail-reader": {
      mode: "token",
      allowedServices: ["gmail"],
      allowedTools: ["gws_gmail_read"],
    },
  },
  agentCredentialBindings: {
    "agent:ops": "drive-writer",
    "subagent:ops": "gmail-reader",
  },
  workspaceIdentityDomains: [],
  defaultScopesProfile: "minimal",
  requireHumanApprovalFor: [],
  warnings: [],
};

describe("credential routing", () => {
  it("uses explicit subagent binding for subagent sessions", () => {
    expect(
      resolveBindingSubject({
        agentId: "ops",
        sessionKey: "agent:ops:subagent:worker",
      }),
    ).toBe("subagent:ops");

    const resolved = resolveCredentialRoute(config, {
      agentId: "ops",
      sessionKey: "agent:ops:subagent:worker",
    });
    expect(resolved.route.name).toBe("gmail-reader");
  });

  it("uses agent binding for non-subagent sessions", () => {
    const resolved = resolveCredentialRoute(config, {
      agentId: "ops",
      sessionKey: "agent:ops:main",
    });
    expect(resolved.route.name).toBe("drive-writer");
  });
});
