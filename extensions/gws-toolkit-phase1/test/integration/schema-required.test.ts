import { describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig, executeTool } from "../fixtures/harness.js";

describe("integration: action-specific required params", () => {
  it("rejects missing required ids at schema layer", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    const driveMissingFileId = await executeTool(harness, "gws_drive_read", {
      action: "get_file_metadata",
    });
    expect(driveMissingFileId.ok).toBe(false);
    expect(driveMissingFileId.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const downloadMissingFileId = await executeTool(harness, "gws_drive_read", {
      action: "download_file",
    });
    expect(downloadMissingFileId.ok).toBe(false);
    expect(downloadMissingFileId.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const calendarMissingEventId = await executeTool(harness, "gws_calendar_read", {
      action: "get_event",
    });
    expect(calendarMissingEventId.ok).toBe(false);
    expect(calendarMissingEventId.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const gmailMissingMessageId = await executeTool(harness, "gws_gmail_write", {
      action: "mark_message_read",
      confirm: true,
    });
    expect(gmailMissingMessageId.ok).toBe(false);
    expect(gmailMissingMessageId.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("accepts Drive download params but rejects unknown read params", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    const download = await executeTool(harness, "gws_drive_read", {
      action: "download_file",
      fileId: "file-1",
      outputPath: "reports/report.pdf",
      overwrite: true,
    });
    expect(download.ok).toBe(false);
    expect(download.error).toMatchObject({ code: "AUTH_ERROR" });
    expect(download.error.message).toContain("delegated Google API transport");

    const unknown = await executeTool(harness, "gws_drive_read", {
      action: "download_file",
      fileId: "file-1",
      destination: "reports/report.pdf",
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("accepts curated Calendar recurrence fields and rejects unsafe event shapes", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig({
        allowWriteOperations: true,
        enabledWriteServices: ["calendar"],
        credentialRoutes: {
          writer: {
            mode: "token",
            allowedServices: ["calendar"],
            allowedTools: ["gws_calendar_read", "gws_calendar_write"],
          },
        },
        agentCredentialBindings: {
          "agent:main": "writer",
        },
      }),
    });

    const recurring = await executeTool(harness, "gws_calendar_write", {
      action: "create_event",
      confirm: true,
      summary: "Weekly planning",
      start: "2026-07-06T09:00:00-07:00",
      end: "2026-07-06T09:30:00-07:00",
      recurrence: ["RRULE:FREQ=WEEKLY;COUNT=6"],
      visibility: "private",
      transparency: "opaque",
      reminders: {
        useDefault: false,
        overrides: [{ method: "popup", minutes: 10 }],
      },
    });
    expect(recurring.ok).toBe(true);

    const recurringMasters = await executeTool(harness, "gws_calendar_read", {
      action: "list_events",
      calendarId: "primary",
      singleEvents: false,
      showDeleted: true,
      orderBy: "updated",
      q: "planning",
      timeZone: "America/Los_Angeles",
      maxAttendees: 10,
    });
    expect(recurringMasters.ok).toBe(true);

    const invalidRecurrence = await executeTool(harness, "gws_calendar_write", {
      action: "create_event",
      confirm: true,
      summary: "Bad recurrence",
      start: "2026-07-06T09:00:00-07:00",
      end: "2026-07-06T09:30:00-07:00",
      recurrence: ["FREQ=WEEKLY"],
    });
    expect(invalidRecurrence.ok).toBe(false);
    expect(invalidRecurrence.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const mixedDateBoundary = await executeTool(harness, "gws_calendar_write", {
      action: "create_event",
      confirm: true,
      summary: "Mixed boundary",
      start: "2026-07-06T09:00:00-07:00",
      startDate: "2026-07-06",
      end: "2026-07-06T09:30:00-07:00",
    });
    expect(mixedDateBoundary.ok).toBe(false);
    expect(mixedDateBoundary.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const rawBody = await executeTool(harness, "gws_calendar_write", {
      action: "update_event",
      confirm: true,
      eventId: "event-1",
      raw: { anyoneCanAddSelf: true },
    });
    expect(rawBody.ok).toBe(false);
    expect(rawBody.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
