import { describe, expect, it } from "vitest";
import {
  buildCalendarReadCommand,
  buildDriveReadCommand,
  buildGmailReadCommand,
} from "../../src/command-builder.js";

describe("integration: command build", () => {
  it("builds deterministic read-only argv", () => {
    const drive = buildDriveReadCommand({ action: "list_files", pageSize: 10 }, ["--auth"]).argv;
    const gmail = buildGmailReadCommand({ action: "list_messages", maxResults: 5 }, []).argv;
    const calendar = buildCalendarReadCommand({ action: "list_events", pageSize: 7 }, []).argv;

    expect(drive).toEqual(["drive", "--auth", "list-files", "--format", "json", "--page-size", "10"]);
    expect(gmail).toEqual(["gmail", "list-messages", "--format", "json", "--max-results", "5"]);
    expect(calendar).toEqual([
      "calendar",
      "list-events",
      "--format",
      "json",
      "--page-size",
      "7",
    ]);
  });
});
