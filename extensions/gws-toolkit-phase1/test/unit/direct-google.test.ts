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
  enabledServices: ["drive", "gmail", "calendar", "docs", "sheets", "contacts", "groups"],
  enabledWriteServices: ["calendar", "contacts", "groups"],
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

  it("builds expanded Calendar recurrence and property requests", () => {
    expect(
      buildDirectGoogleRequest({
        service: "calendar",
        action: "list_events",
        payload: {
          calendarId: "team@example.com",
          pageSize: 20,
          singleEvents: false,
          showDeleted: true,
          orderBy: "updated",
          q: "planning",
          timeZone: "America/Los_Angeles",
          updatedMin: "2026-07-01T00:00:00Z",
          pageToken: "page-1",
          syncToken: "sync-1",
          iCalUID: "ical-1@example.com",
          maxAttendees: 10,
        },
      }),
    ).toEqual({
      method: "GET",
      url: "https://www.googleapis.com/calendar/v3/calendars/team%40example.com/events",
      params: {
        singleEvents: false,
        maxResults: 20,
        showDeleted: true,
        orderBy: "updated",
        q: "planning",
        timeZone: "America/Los_Angeles",
        updatedMin: "2026-07-01T00:00:00Z",
        pageToken: "page-1",
        syncToken: "sync-1",
        iCalUID: "ical-1@example.com",
        maxAttendees: 10,
      },
    });

    expect(
      buildDirectGoogleRequest({
        service: "calendar",
        action: "update_event",
        payload: {
          calendarId: "team@example.com",
          eventId: "event/1",
          summary: "Weekly planning",
          startDate: "2026-07-06",
          endDate: "2026-07-07",
          recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO"],
          visibility: "private",
          transparency: "transparent",
          colorId: "5",
          reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: 10 }],
          },
          source: {
            title: "DAISy",
            url: "https://daisy.example/workflows/planning",
          },
          extendedProperties: {
            private: { daisyWorkflow: "planning" },
          },
          attachments: [
            {
              fileUrl: "https://drive.google.com/file/d/file-1/view",
              title: "Agenda",
              mimeType: "application/pdf",
            },
          ],
          supportsAttachments: true,
          sendUpdates: "externalOnly",
          guestsCanInviteOthers: false,
          guestsCanModify: true,
          guestsCanSeeOtherGuests: false,
        },
      }),
    ).toEqual({
      method: "PATCH",
      url: "https://www.googleapis.com/calendar/v3/calendars/team%40example.com/events/event%2F1",
      params: { supportsAttachments: true, sendUpdates: "externalOnly" },
      data: {
        summary: "Weekly planning",
        start: { date: "2026-07-06" },
        end: { date: "2026-07-07" },
        recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO"],
        visibility: "private",
        transparency: "transparent",
        colorId: "5",
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 10 }],
        },
        source: {
          title: "DAISy",
          url: "https://daisy.example/workflows/planning",
        },
        extendedProperties: {
          private: { daisyWorkflow: "planning" },
        },
        attachments: [
          {
            fileUrl: "https://drive.google.com/file/d/file-1/view",
            title: "Agenda",
            mimeType: "application/pdf",
          },
        ],
        guestsCanInviteOthers: false,
        guestsCanModify: true,
        guestsCanSeeOtherGuests: false,
      },
    });

    expect(
      buildDirectGoogleRequest({
        service: "calendar",
        action: "update_event",
        payload: {
          calendarId: "team@example.com",
          eventId: "event-1",
          attendees: [],
        },
      }),
    ).toMatchObject({
      method: "PATCH",
      url: "https://www.googleapis.com/calendar/v3/calendars/team%40example.com/events/event-1",
      data: { attendees: [] },
    });
  });

  it("uses action-level scopes for delegated direct calls", () => {
    expect(resolveDirectGoogleScopes({ config, service: "calendar", write: false })).toEqual([
      "https://www.googleapis.com/auth/calendar.readonly",
    ]);
    expect(resolveDirectGoogleScopes({ config, service: "calendar", write: true })).toEqual([
      "https://www.googleapis.com/auth/calendar",
    ]);
    expect(resolveDirectGoogleScopes({ config, service: "contacts", write: false })).toEqual([
      "https://www.googleapis.com/auth/contacts.readonly",
    ]);
    expect(resolveDirectGoogleScopes({ config, service: "contacts", write: true })).toEqual([
      "https://www.googleapis.com/auth/contacts",
    ]);
    expect(resolveDirectGoogleScopes({ config, service: "groups", write: false })).toEqual([
      "https://www.googleapis.com/auth/admin.directory.group.readonly",
      "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
    ]);
    expect(resolveDirectGoogleScopes({ config, service: "groups", write: true })).toEqual([
      "https://www.googleapis.com/auth/admin.directory.group",
      "https://www.googleapis.com/auth/admin.directory.group.member",
    ]);
  });

  it("builds Contacts and contact group direct People API requests", () => {
    expect(
      buildDirectGoogleRequest({
        service: "contacts",
        action: "list_contacts",
        payload: { pageSize: 25, personFields: "names,emailAddresses" },
      }),
    ).toEqual({
      method: "GET",
      url: "https://people.googleapis.com/v1/people/me/connections",
      params: {
        pageSize: 25,
        personFields: "names,emailAddresses",
      },
    });

    expect(
      buildDirectGoogleRequest({
        service: "contacts",
        action: "get_contact_group",
        payload: { resourceName: "contactGroups/friends", maxMembers: 10 },
      }),
    ).toEqual({
      method: "GET",
      url: "https://people.googleapis.com/v1/contactGroups/friends",
      params: { maxMembers: 10 },
    });

    expect(
      buildDirectGoogleRequest({
        service: "contacts",
        action: "create_contact",
        payload: {
          givenName: "Ada",
          familyName: "Lovelace",
          emailAddresses: ["ada@example.com"],
          phoneNumbers: ["+15551234567"],
        },
      }),
    ).toEqual({
      method: "POST",
      url: "https://people.googleapis.com/v1/people:createContact",
      data: {
        names: [{ givenName: "Ada", familyName: "Lovelace" }],
        emailAddresses: [{ value: "ada@example.com" }],
        phoneNumbers: [{ value: "+15551234567" }],
      },
    });

    expect(
      buildDirectGoogleRequest({
        service: "contacts",
        action: "create_contact",
        payload: { displayName: "Ada Lovelace" },
      }),
    ).toMatchObject({
      data: {
        names: [{ unstructuredName: "Ada Lovelace" }],
      },
    });

    expect(
      buildDirectGoogleRequest({
        service: "contacts",
        action: "update_contact",
        payload: {
          resourceName: "people/c123",
          etag: "etag-1",
          givenName: "Ada",
          emailAddresses: ["ada@example.com"],
          personFields: "names,emailAddresses",
        },
      }),
    ).toEqual({
      method: "PATCH",
      url: "https://people.googleapis.com/v1/people/c123:updateContact",
      params: { updatePersonFields: "names,emailAddresses" },
      data: {
        resourceName: "people/c123",
        metadata: {
          sources: [{ type: "CONTACT", etag: "etag-1" }],
        },
        names: [{ givenName: "Ada" }],
        emailAddresses: [{ value: "ada@example.com" }],
      },
    });

    expect(
      buildDirectGoogleRequest({
        service: "contacts",
        action: "create_contact_group",
        payload: { name: "Friends" },
      }),
    ).toEqual({
      method: "POST",
      url: "https://people.googleapis.com/v1/contactGroups",
      data: { contactGroup: { name: "Friends" } },
    });

    expect(
      buildDirectGoogleRequest({
        service: "contacts",
        action: "update_contact_group",
        payload: { resourceName: "contactGroups/friends", name: "Close Friends" },
      }),
    ).toEqual({
      method: "PUT",
      url: "https://people.googleapis.com/v1/contactGroups/friends",
      data: {
        contactGroup: {
          resourceName: "contactGroups/friends",
          name: "Close Friends",
        },
        updateGroupFields: "name",
      },
    });

    expect(
      buildDirectGoogleRequest({
        service: "contacts",
        action: "modify_contact_group_members",
        payload: {
          resourceName: "contactGroups/friends",
          resourceNamesToAdd: ["people/c123"],
          resourceNamesToRemove: ["people/c456"],
        },
      }),
    ).toEqual({
      method: "POST",
      url: "https://people.googleapis.com/v1/contactGroups/friends/members:modify",
      data: {
        resourceNamesToAdd: ["people/c123"],
        resourceNamesToRemove: ["people/c456"],
      },
    });

    expect(() =>
      buildDirectGoogleRequest({
        service: "contacts",
        action: "delete_contact",
        payload: { resourceName: "people/c123" },
      }),
    ).toThrow(/Unsupported direct Google API action/);
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

  it("builds Directory Groups direct Admin SDK requests", () => {
    expect(
      buildDirectGoogleRequest({
        service: "groups",
        action: "list_groups",
        payload: {
          customer: "my_customer",
          domain: "example.com",
          query: "email:agents*",
          maxResults: 20,
          pageToken: "page-1",
        },
      }),
    ).toEqual({
      method: "GET",
      url: "https://admin.googleapis.com/admin/directory/v1/groups",
      params: {
        customer: "my_customer",
        domain: "example.com",
        query: "email:agents*",
        maxResults: 20,
        pageToken: "page-1",
      },
    });

    expect(
      buildDirectGoogleRequest({
        service: "groups",
        action: "get_group",
        payload: { groupKey: "agents@example.com" },
      }),
    ).toEqual({
      method: "GET",
      url: "https://admin.googleapis.com/admin/directory/v1/groups/agents%40example.com",
    });

    expect(
      buildDirectGoogleRequest({
        service: "groups",
        action: "list_group_members",
        payload: {
          groupKey: "agents@example.com",
          roles: ["OWNER", "MEMBER"],
          includeDerivedMembership: true,
          maxResults: 50,
          pageToken: "page-2",
        },
      }),
    ).toEqual({
      method: "GET",
      url: "https://admin.googleapis.com/admin/directory/v1/groups/agents%40example.com/members",
      params: {
        roles: "OWNER,MEMBER",
        includeDerivedMembership: true,
        maxResults: 50,
        pageToken: "page-2",
      },
    });

    expect(
      buildDirectGoogleRequest({
        service: "groups",
        action: "get_group_member",
        payload: { groupKey: "agents@example.com", memberKey: "daisy.ai@example.com" },
      }),
    ).toEqual({
      method: "GET",
      url: "https://admin.googleapis.com/admin/directory/v1/groups/agents%40example.com/members/daisy.ai%40example.com",
    });

    expect(
      buildDirectGoogleRequest({
        service: "groups",
        action: "create_group",
        payload: {
          email: "agents@example.com",
          name: "Agents",
          description: "Delegated agent group",
        },
      }),
    ).toEqual({
      method: "POST",
      url: "https://admin.googleapis.com/admin/directory/v1/groups",
      data: {
        email: "agents@example.com",
        name: "Agents",
        description: "Delegated agent group",
      },
    });

    expect(
      buildDirectGoogleRequest({
        service: "groups",
        action: "update_group",
        payload: { groupKey: "agents@example.com", name: "DAISy Agents" },
      }),
    ).toEqual({
      method: "PATCH",
      url: "https://admin.googleapis.com/admin/directory/v1/groups/agents%40example.com",
      data: { name: "DAISy Agents" },
    });

    expect(
      buildDirectGoogleRequest({
        service: "groups",
        action: "add_group_member",
        payload: { groupKey: "agents@example.com", memberEmail: "daisy.ai@example.com" },
      }),
    ).toEqual({
      method: "POST",
      url: "https://admin.googleapis.com/admin/directory/v1/groups/agents%40example.com/members",
      data: { email: "daisy.ai@example.com", role: "MEMBER" },
    });

    expect(
      buildDirectGoogleRequest({
        service: "groups",
        action: "update_group_member",
        payload: {
          groupKey: "agents@example.com",
          memberKey: "daisy.ai@example.com",
          role: "MANAGER",
        },
      }),
    ).toEqual({
      method: "PATCH",
      url: "https://admin.googleapis.com/admin/directory/v1/groups/agents%40example.com/members/daisy.ai%40example.com",
      data: { role: "MANAGER" },
    });

    expect(
      buildDirectGoogleRequest({
        service: "groups",
        action: "remove_group_member",
        payload: { groupKey: "agents@example.com", memberKey: "daisy.ai@example.com" },
      }),
    ).toEqual({
      method: "DELETE",
      url: "https://admin.googleapis.com/admin/directory/v1/groups/agents%40example.com/members/daisy.ai%40example.com",
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

    expect(
      buildDirectGoogleRequest({
        service: "drive",
        action: "export_file",
        payload: { fileId: "file/1", mimeType: "application/pdf" },
      }),
    ).toMatchObject({
      method: "GET",
      url: "https://www.googleapis.com/drive/v3/files/file%2F1/export",
      params: { mimeType: "application/pdf" },
      responseType: "arraybuffer",
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
