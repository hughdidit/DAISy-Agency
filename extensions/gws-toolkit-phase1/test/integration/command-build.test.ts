import { describe, expect, it } from "vitest";
import {
  buildCalendarReadCommand,
  buildCalendarWriteCommand,
  buildDocsReadCommand,
  buildDocsWriteCommand,
  buildDriveReadCommand,
  buildDriveWriteCommand,
  buildGmailReadCommand,
  buildGmailWriteCommand,
  buildGroupsReadCommand,
  buildGroupsWriteCommand,
  buildSheetsReadCommand,
  buildSheetsWriteCommand,
} from "../../src/command-builder.js";

function decodeBase64Url(input: string): string {
  const paddingLength = (4 - (input.length % 4 || 4)) % 4;
  return Buffer.from(`${input}${"=".repeat(paddingLength)}`, "base64url").toString("utf8");
}

describe("integration: command build", () => {
  it("builds deterministic read argv", () => {
    const drive = buildDriveReadCommand(
      {
        action: "list_files",
        pageSize: 10,
        includeItemsFromAllDrives: true,
        corpora: "drive",
        driveId: "shared-drive-1",
      },
      ["--auth"],
    ).argv;
    const gmail = buildGmailReadCommand({ action: "list_messages", maxResults: 5 }, []).argv;
    const calendar = buildCalendarReadCommand({ action: "list_events", pageSize: 7 }, []).argv;
    const docs = buildDocsReadCommand({ action: "get_document", documentId: "doc-1" }, []).argv;
    const sheets = buildSheetsReadCommand(
      { action: "get_values", spreadsheetId: "sheet-1", range: "A1:B2" },
      [],
    ).argv;

    expect(drive).toEqual([
      "drive",
      "--auth",
      "files",
      "list",
      "--format",
      "json",
      "--params",
      '{"pageSize":10,"supportsAllDrives":true,"includeItemsFromAllDrives":true,"corpora":"drive","driveId":"shared-drive-1"}',
    ]);
    expect(gmail).toEqual([
      "gmail",
      "users",
      "messages",
      "list",
      "--format",
      "json",
      "--params",
      '{"userId":"me","maxResults":5}',
    ]);
    expect(calendar).toEqual([
      "calendar",
      "events",
      "list",
      "--format",
      "json",
      "--params",
      '{"calendarId":"primary","singleEvents":true,"maxResults":7}',
    ]);
    expect(docs).toEqual([
      "docs",
      "documents",
      "get",
      "--format",
      "json",
      "--params",
      '{"documentId":"doc-1"}',
    ]);
    expect(sheets).toEqual([
      "sheets",
      "spreadsheets",
      "values",
      "get",
      "--format",
      "json",
      "--params",
      '{"spreadsheetId":"sheet-1","range":"A1:B2"}',
    ]);
  });

  it("builds deterministic write argv", () => {
    const drive = buildDriveWriteCommand(
      { action: "create_folder", confirm: true, name: "Folder", parentId: "parent-1" },
      [],
    ).argv;
    const docs = buildDocsWriteCommand(
      { action: "append_text", confirm: true, documentId: "doc-1", text: "Hello" },
      [],
    ).argv;
    const sheets = buildSheetsWriteCommand(
      {
        action: "update_values",
        confirm: true,
        spreadsheetId: "sheet-1",
        range: "A1",
        values: [["hello"]],
      },
      [],
    ).argv;

    expect(drive).toEqual([
      "drive",
      "files",
      "create",
      "--format",
      "json",
      "--json",
      '{"name":"Folder","mimeType":"application/vnd.google-apps.folder","parents":["parent-1"]}',
    ]);
    expect(docs).toEqual([
      "docs",
      "documents",
      "batchUpdate",
      "--format",
      "json",
      "--params",
      '{"documentId":"doc-1"}',
      "--json",
      '{"requests":[{"insertText":{"endOfSegmentLocation":{},"text":"Hello"}}]}',
    ]);
    expect(sheets).toEqual([
      "sheets",
      "spreadsheets",
      "values",
      "update",
      "--format",
      "json",
      "--params",
      '{"spreadsheetId":"sheet-1","range":"A1","valueInputOption":"USER_ENTERED"}',
      "--json",
      '{"values":[["hello"]]}',
    ]);
  });

  it("uses query params for drive parent mutations and html mime bodies for gmail html messages", () => {
    const drive = buildDriveWriteCommand(
      {
        action: "update_file_metadata",
        confirm: true,
        fileId: "file-1",
        name: "Renamed",
        addParents: ["parent-a"],
        removeParents: ["parent-b"],
      },
      [],
    ).argv;
    const gmail = buildGmailWriteCommand(
      {
        action: "send_message",
        confirm: true,
        to: ["person@example.com"],
        subject: "Hello",
        bodyHtml: "<b>Hi</b>",
      },
      [],
    ).argv;

    expect(drive).toEqual([
      "drive",
      "files",
      "update",
      "--format",
      "json",
      "--params",
      '{"fileId":"file-1","addParents":["parent-a"],"removeParents":["parent-b"]}',
      "--json",
      '{"name":"Renamed"}',
    ]);
    expect(gmail.slice(0, 8)).toEqual([
      "gmail",
      "users",
      "messages",
      "send",
      "--format",
      "json",
      "--params",
      '{"userId":"me"}',
    ]);
    expect(gmail[8]).toBe("--json");
    const payload = JSON.parse(gmail[9] as string) as { raw: string };
    expect(decodeBase64Url(payload.raw)).toContain("Content-Type: text/html; charset=UTF-8");
    expect(decodeBase64Url(payload.raw)).toContain("<b>Hi</b>");
  });

  it("preserves negative gmail domain filters while extracting positive wildcard filters", () => {
    const gmail = buildGmailReadCommand(
      {
        action: "list_messages",
        query: "from:(*@trusted.example) -from:bad.example",
      },
      [],
    ).argv;

    const paramsIndex = gmail.indexOf("--params");
    const request = JSON.parse(gmail[paramsIndex + 1] as string) as { q?: string };
    expect(request.q).toBe("-from:bad.example from:trusted.example");
  });

  it("builds Gmail mark-read mutations without requiring message bodies", () => {
    const gmail = buildGmailWriteCommand(
      {
        action: "mark_message_read",
        confirm: true,
        messageId: "msg-123",
      },
      [],
    ).argv;

    expect(gmail).toEqual([
      "gmail",
      "users",
      "messages",
      "modify",
      "--format",
      "json",
      "--params",
      '{"userId":"me","id":"msg-123"}',
      "--json",
      '{"removeLabelIds":["UNREAD"]}',
    ]);
  });

  it("denies legacy CLI media downloads before binary output can be emitted", () => {
    expect(() => buildDriveReadCommand({ action: "download_file", fileId: "file-1" }, [])).toThrow(
      /delegated Google API transport/,
    );
  });

  it("denies legacy CLI Directory Groups operations before shelling out", () => {
    expect(() => buildGroupsReadCommand({ action: "list_groups" }, [])).toThrow(
      /delegated Google API transport/,
    );
    expect(() =>
      buildGroupsWriteCommand(
        {
          action: "add_group_member",
          confirm: true,
          groupKey: "agents@example.com",
          memberEmail: "daisy.ai@example.com",
        },
        [],
      ),
    ).toThrow(/delegated Google API transport/);
  });

  it("builds Calendar recurrence and event property request shapes", () => {
    const read = buildCalendarReadCommand(
      {
        action: "list_events",
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
      ["--auth"],
    ).argv;

    expect(read.slice(0, 7)).toEqual([
      "calendar",
      "--auth",
      "events",
      "list",
      "--format",
      "json",
      "--params",
    ]);
    const readParams = JSON.parse(read[read.indexOf("--params") + 1] as string);
    expect(readParams).toEqual({
      calendarId: "team@example.com",
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
    });

    const write = buildCalendarWriteCommand(
      {
        action: "create_event",
        confirm: true,
        calendarId: "team@example.com",
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
        extendedProperties: {
          private: { daisyWorkflow: "planning" },
        },
        supportsAttachments: true,
        sendUpdates: "externalOnly",
        guestsCanInviteOthers: false,
        guestsCanModify: true,
        guestsCanSeeOtherGuests: false,
      },
      [],
    ).argv;

    expect(write.slice(0, 7)).toEqual([
      "calendar",
      "events",
      "insert",
      "--format",
      "json",
      "--params",
      '{"calendarId":"team@example.com","supportsAttachments":true,"sendUpdates":"externalOnly"}',
    ]);
    expect(write[7]).toBe("--json");
    expect(JSON.parse(write[8] as string)).toEqual({
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
      extendedProperties: {
        private: { daisyWorkflow: "planning" },
      },
      guestsCanInviteOthers: false,
      guestsCanModify: true,
      guestsCanSeeOtherGuests: false,
    });

    const clearAttendees = buildCalendarWriteCommand(
      {
        action: "update_event",
        confirm: true,
        calendarId: "team@example.com",
        eventId: "event-1",
        attendees: [],
      },
      [],
    ).argv;

    expect(clearAttendees.slice(0, 7)).toEqual([
      "calendar",
      "events",
      "patch",
      "--format",
      "json",
      "--params",
      '{"calendarId":"team@example.com","eventId":"event-1"}',
    ]);
    expect(clearAttendees[7]).toBe("--json");
    expect(JSON.parse(clearAttendees[8] as string)).toEqual({ attendees: [] });
  });
});
