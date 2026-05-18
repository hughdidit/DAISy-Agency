import { describe, expect, it } from "vitest";
import {
  buildCalendarReadCommand,
  buildDocsReadCommand,
  buildDocsWriteCommand,
  buildDriveReadCommand,
  buildDriveWriteCommand,
  buildGmailReadCommand,
  buildGmailWriteCommand,
  buildSheetsReadCommand,
  buildSheetsWriteCommand,
} from "../../src/command-builder.js";

function decodeBase64Url(input: string): string {
  const paddingLength = (4 - (input.length % 4 || 4)) % 4;
  return Buffer.from(`${input}${"=".repeat(paddingLength)}`, "base64url").toString("utf8");
}

describe("integration: command build", () => {
  it("builds deterministic read argv", () => {
    const drive = buildDriveReadCommand({ action: "list_files", pageSize: 10 }, ["--auth"]).argv;
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
      '{"pageSize":10}',
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
});
