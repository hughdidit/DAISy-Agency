import { describe, expect, it } from "vitest";
import {
  buildCalendarReadCommand,
  buildDocsReadCommand,
  buildDocsWriteCommand,
  buildDriveReadCommand,
  buildDriveWriteCommand,
  buildGmailReadCommand,
  buildSheetsReadCommand,
  buildSheetsWriteCommand,
} from "../../src/command-builder.js";

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
      '{"calendarId":"primary","maxResults":7,"singleEvents":true}',
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
}
