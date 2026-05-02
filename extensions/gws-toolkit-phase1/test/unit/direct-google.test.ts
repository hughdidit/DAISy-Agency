import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDirectGoogleRequest, resolveDirectGoogleScopes } from "../../src/direct-google.js";
import type { GwsToolkitConfig } from "../../src/types.js";

const config: GwsToolkitConfig = {
  enabledServices: ["drive", "gmail", "calendar", "docs", "sheets"],
  enabledWriteServices: ["calendar"],
  approvedCredentialDirs: [],
  tokenEnvVar: "GOOGLE_WORKSPACE_CLI_TOKEN",
  timeoutMs: 1000,
  maxStdoutBytes: 1024,
  maxStderrBytes: 1024,
  safeMode: true,
  allowedCredentialModes: ["credentials_file"],
  allowWriteOperations: true,
  allowUnboundAgents: false,
  defaultCredentialRoute: null,
  credentialRoutes: {},
  agentCredentialBindings: {},
  workspaceIdentityDomains: [],
  defaultScopesProfile: "minimal",
  requireHumanApprovalFor: [],
  warnings: [],
};

describe("direct Google API transport", () => {
  it("builds Calendar read and write requests without the gws CLI shape", () => {
    expect(
      buildDirectGoogleRequest({
        service: "calendar",
        action: "list_events",
        payload: { calendarId: "primary", pageSize: 10 },
      }),
    ).toMatchObject({
      method: "GET",
      url: "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      params: { singleEvents: true, maxResults: 10 },
    });

    expect(
      buildDirectGoogleRequest({
        service: "calendar",
        action: "create_event",
        payload: {
          calendarId: "primary",
          summary: "Review",
          start: "2026-04-28T09:00:00-07:00",
          end: "2026-04-28T09:30:00-07:00",
        },
      }),
    ).toMatchObject({
      method: "POST",
      url: "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      data: {
        summary: "Review",
        start: { dateTime: "2026-04-28T09:00:00-07:00" },
        end: { dateTime: "2026-04-28T09:30:00-07:00" },
      },
    });
  });

  it("uses action-level scopes for delegated direct calls", () => {
    expect(resolveDirectGoogleScopes({ config, service: "calendar", write: false })).toEqual([
      "https://www.googleapis.com/auth/calendar.readonly",
    ]);
    expect(resolveDirectGoogleScopes({ config, service: "calendar", write: true })).toEqual([
      "https://www.googleapis.com/auth/calendar",
    ]);
  });

  it("sanitizes Gmail headers for direct send requests", () => {
    const request = buildDirectGoogleRequest({
      service: "gmail",
      action: "send_message",
      payload: {
        to: ["user@example.com\r\nBcc: attacker@example.com"],
        subject: "Status\r\nInjected: yes",
        bodyText: "Hello",
      },
    });
    expect(request.data).toMatchObject({ raw: expect.any(String) });
    const raw = (request.data as { raw: string }).raw;
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    expect(decoded).toContain("To: user@example.comBcc: attacker@example.com");
    expect(decoded).toContain("Subject: StatusInjected: yes");
    expect(decoded).not.toContain("\r\nBcc: attacker@example.com");
    expect(decoded).not.toContain("\r\nInjected: yes");
  });

  it("formats Drive parent parameters and restricts uploads to the workspace", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "gws-direct-upload-"));
    const uploadPath = path.join(workspaceDir, "report.txt");
    await fs.writeFile(uploadPath, "hello", "utf8");

    const upload = buildDirectGoogleRequest({
      service: "drive",
      action: "upload_file",
      payload: { filePath: "report.txt" },
      ctx: { workspaceDir },
    });
    expect(upload.data).toBeInstanceOf(Buffer);

    expect(
      buildDirectGoogleRequest({
        service: "drive",
        action: "update_file_metadata",
        payload: {
          fileId: "file-1",
          addParents: ["folder-a", "folder-b"],
          removeParents: ["folder-c"],
        },
      }),
    ).toMatchObject({
      params: { addParents: "folder-a,folder-b", removeParents: "folder-c" },
    });

    expect(() =>
      buildDirectGoogleRequest({
        service: "drive",
        action: "upload_file",
        payload: { filePath: path.join(os.tmpdir(), "outside.txt") },
        ctx: { workspaceDir },
      }),
    ).toThrow(/inside the active agent workspace/);
  });
});
