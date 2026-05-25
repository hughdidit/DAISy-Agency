import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDirectDriveDownloadRequests,
  buildDirectGoogleClientRequestOptions,
  buildDirectGoogleRequest,
  createDelegatedGoogleClient,
  driveExportDefaultFileName,
  resolveDirectGoogleScopes,
  resolveDriveWorkspaceOutputPath,
} from "../../src/direct-google.js";
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

  it("omits undefined Google client request options", () => {
    expect(
      buildDirectGoogleClientRequestOptions({
        method: "GET",
        url: "https://www.googleapis.com/calendar/v3/users/me/calendarList/primary",
        params: undefined,
        timeoutMs: 1000,
      }),
    ).toEqual({
      method: "GET",
      url: "https://www.googleapis.com/calendar/v3/users/me/calendarList/primary",
      timeout: 1000,
    });
  });

  it("uses native fetch for delegated JWT transport", async () => {
    const credentialsPath = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), "gws-direct-credentials-")),
      "credentials.json",
    );
    await fs.writeFile(
      credentialsPath,
      JSON.stringify({
        type: "service_account",
        client_email: "service-account@example.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\nMII=\n-----END PRIVATE KEY-----\n",
      }),
      "utf8",
    );

    const client = createDelegatedGoogleClient({
      credentialsFile: credentialsPath,
      subject: "daisy.ai@hughdidit.com",
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    expect(globalThis.fetch).toBeDefined();
    expect(client.transporter.defaults.fetchImplementation).toBe(globalThis.fetch);
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

  it("builds Gmail mark-read modify requests", () => {
    const request = buildDirectGoogleRequest({
      service: "gmail",
      action: "mark_message_read",
      payload: { messageId: "msg/123" },
    });

    expect(request).toEqual({
      method: "POST",
      url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/msg%2F123/modify",
      data: { removeLabelIds: ["UNREAD"] },
    });
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

  it("builds Drive shared-drive read requests and media download requests", () => {
    expect(
      buildDirectGoogleRequest({
        service: "drive",
        action: "list_files",
        payload: {
          pageSize: 25,
          query: "'folder-1' in parents",
          includeItemsFromAllDrives: true,
          corpora: "drive",
          driveId: "shared-drive-1",
        },
      }),
    ).toMatchObject({
      method: "GET",
      url: "https://www.googleapis.com/drive/v3/files",
      params: {
        pageSize: 25,
        q: "'folder-1' in parents",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        corpora: "drive",
        driveId: "shared-drive-1",
      },
    });

    expect(
      buildDirectGoogleRequest({
        service: "drive",
        action: "get_file_metadata",
        payload: { fileId: "file/1" },
      }),
    ).toMatchObject({
      method: "GET",
      url: "https://www.googleapis.com/drive/v3/files/file%2F1",
      params: { supportsAllDrives: true },
    });

    expect(buildDirectDriveDownloadRequests("file/1")).toEqual({
      metadata: {
        method: "GET",
        url: "https://www.googleapis.com/drive/v3/files/file%2F1",
        params: {
          supportsAllDrives: true,
          fields: "id,name,mimeType,size",
        },
      },
      media: {
        method: "GET",
        url: "https://www.googleapis.com/drive/v3/files/file%2F1",
        params: {
          alt: "media",
          supportsAllDrives: true,
        },
        responseType: "arraybuffer",
      },
    });
  });

  it("resolves Drive download targets inside the workspace and applies overwrite policy", async () => {
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "gws-direct-download-"));
    const nested = resolveDriveWorkspaceOutputPath({
      workspaceDir,
      fileId: "file-1",
      fileName: "Quarterly Report.pdf",
      outputPath: "reports/q1.pdf",
    });
    expect(nested.workspaceRelativePath).toBe(path.join("reports", "q1.pdf"));
    expect(nested.path).toBe(path.join(workspaceDir, "reports", "q1.pdf"));

    const defaulted = resolveDriveWorkspaceOutputPath({
      workspaceDir,
      fileId: "file-1",
      fileName: "Quarterly Report?.pdf",
    });
    expect(defaulted.workspaceRelativePath).toBe(
      path.join("drive-downloads", "Quarterly Report_.pdf"),
    );

    expect(() =>
      resolveDriveWorkspaceOutputPath({
        workspaceDir,
        fileId: "file-1",
        fileName: "report.pdf",
        outputPath: path.join(os.tmpdir(), "outside.pdf"),
      }),
    ).toThrow(/inside the active agent workspace/);

    const existingPath = path.join(workspaceDir, "existing.pdf");
    await fs.writeFile(existingPath, "existing", "utf8");
    expect(() =>
      resolveDriveWorkspaceOutputPath({
        workspaceDir,
        fileId: "file-1",
        fileName: "report.pdf",
        outputPath: "existing.pdf",
      }),
    ).toThrow(/already exists/);
    expect(
      resolveDriveWorkspaceOutputPath({
        workspaceDir,
        fileId: "file-1",
        fileName: "report.pdf",
        outputPath: "existing.pdf",
        overwrite: true,
      }).path,
    ).toBe(existingPath);
  });

  it("adds common export extensions to default Drive export file names", () => {
    expect(
      driveExportDefaultFileName({
        fileId: "doc-1",
        mimeType: "application/pdf",
      }),
    ).toBe("doc-1.pdf");
    expect(
      driveExportDefaultFileName({
        fileId: "sheet-1.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    ).toBe("sheet-1.xlsx");
    expect(
      driveExportDefaultFileName({
        fileId: "unknown-1",
        mimeType: "application/octet-stream",
      }),
    ).toBe("unknown-1");
  });
});
