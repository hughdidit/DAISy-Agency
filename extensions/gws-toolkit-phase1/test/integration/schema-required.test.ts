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

    const contactsMissingResourceName = await executeTool(harness, "gws_contacts_read", {
      action: "get_contact",
    });
    expect(contactsMissingResourceName.ok).toBe(false);
    expect(contactsMissingResourceName.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const contactsMissingEtag = await executeTool(harness, "gws_contacts_write", {
      action: "update_contact",
      confirm: true,
      resourceName: "people/c123",
      givenName: "Ada",
    });
    expect(contactsMissingEtag.ok).toBe(false);
    expect(contactsMissingEtag.error).toMatchObject({ code: "VALIDATION_ERROR" });
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

  it("accepts curated Contacts and contact group params and rejects raw/delete shapes", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig({
        allowWriteOperations: true,
        enabledServices: ["contacts"],
        enabledWriteServices: ["contacts"],
        credentialRoutes: {
          writer: {
            mode: "token",
            allowedServices: ["contacts"],
            allowedTools: ["gws_contacts_read", "gws_contacts_write"],
          },
        },
        agentCredentialBindings: {
          "agent:main": "writer",
        },
      }),
    });

    const listGroups = await executeTool(harness, "gws_contacts_read", {
      action: "list_contact_groups",
      pageSize: 10,
    });
    expect(listGroups.ok).toBe(true);

    const wrongContactResource = await executeTool(harness, "gws_contacts_read", {
      action: "get_contact",
      resourceName: "contactGroups/friends",
    });
    expect(wrongContactResource.ok).toBe(false);
    expect(wrongContactResource.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const createGroup = await executeTool(harness, "gws_contacts_write", {
      action: "create_contact_group",
      confirm: true,
      name: "Friends",
    });
    expect(createGroup.ok).toBe(true);

    const emptyMembershipChange = await executeTool(harness, "gws_contacts_write", {
      action: "modify_contact_group_members",
      confirm: true,
      resourceName: "contactGroups/friends",
    });
    expect(emptyMembershipChange.ok).toBe(false);
    expect(emptyMembershipChange.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const rawContact = await executeTool(harness, "gws_contacts_write", {
      action: "create_contact",
      confirm: true,
      raw: { names: [{ displayName: "Ada" }] },
    });
    expect(rawContact.ok).toBe(false);
    expect(rawContact.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const malformedEmail = await executeTool(harness, "gws_contacts_write", {
      action: "create_contact",
      confirm: true,
      emailAddresses: ["not-an-email"],
    });
    expect(malformedEmail.ok).toBe(false);
    expect(malformedEmail.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const malformedPhone = await executeTool(harness, "gws_contacts_write", {
      action: "create_contact",
      confirm: true,
      phoneNumbers: ["extension-only"],
    });
    expect(malformedPhone.ok).toBe(false);
    expect(malformedPhone.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const malformedGroupMember = await executeTool(harness, "gws_contacts_write", {
      action: "modify_contact_group_members",
      confirm: true,
      resourceName: "contactGroups/friends",
      resourceNamesToAdd: ["contactGroups/not-a-person"],
    });
    expect(malformedGroupMember.ok).toBe(false);
    expect(malformedGroupMember.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const wrongGroupResource = await executeTool(harness, "gws_contacts_write", {
      action: "modify_contact_group_members",
      confirm: true,
      resourceName: "people/c123",
      resourceNamesToAdd: ["people/c456"],
    });
    expect(wrongGroupResource.ok).toBe(false);
    expect(wrongGroupResource.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const deleteGroup = await executeTool(harness, "gws_contacts_write", {
      action: "delete_contact_group",
      confirm: true,
      resourceName: "contactGroups/friends",
    });
    expect(deleteGroup.ok).toBe(false);
    expect(deleteGroup.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("accepts curated Directory Groups params and rejects raw/delete shapes", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";

    const harness = createHarness({
      pluginConfig: defaultPluginConfig({
        allowWriteOperations: true,
        enabledServices: ["groups"],
        enabledWriteServices: ["groups"],
        credentialRoutes: {
          writer: {
            mode: "token",
            allowedServices: ["groups"],
            allowedTools: ["gws_groups_read", "gws_groups_write"],
          },
        },
        agentCredentialBindings: {
          "agent:main": "writer",
        },
      }),
    });

    const listGroups = await executeTool(harness, "gws_groups_read", {
      action: "list_groups",
      customer: "my_customer",
      maxResults: 10,
    });
    expect(listGroups.ok).toBe(false);
    expect(listGroups.error).toMatchObject({ code: "AUTH_ERROR" });
    expect(listGroups.error.message).toContain("delegated Google API transport");

    const conflictingListSelectors = await executeTool(harness, "gws_groups_read", {
      action: "list_groups",
      customer: "my_customer",
      domain: "example.com",
    });
    expect(conflictingListSelectors.ok).toBe(false);
    expect(conflictingListSelectors.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const missingGroupKey = await executeTool(harness, "gws_groups_read", {
      action: "list_group_members",
    });
    expect(missingGroupKey.ok).toBe(false);
    expect(missingGroupKey.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const missingMemberKey = await executeTool(harness, "gws_groups_read", {
      action: "get_group_member",
      groupKey: "agents@example.com",
    });
    expect(missingMemberKey.ok).toBe(false);
    expect(missingMemberKey.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const createGroup = await executeTool(harness, "gws_groups_write", {
      action: "create_group",
      confirm: true,
      email: "agents@example.com",
      name: "Agents",
      description: "Delegated agent group",
    });
    expect(createGroup.ok).toBe(false);
    expect(createGroup.error).toMatchObject({ code: "AUTH_ERROR" });
    expect(createGroup.error.message).toContain("delegated Google API transport");

    const missingGroupName = await executeTool(harness, "gws_groups_write", {
      action: "create_group",
      confirm: true,
      email: "agents@example.com",
    });
    expect(missingGroupName.ok).toBe(false);
    expect(missingGroupName.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const missingConfirm = await executeTool(harness, "gws_groups_write", {
      action: "add_group_member",
      groupKey: "agents@example.com",
      memberEmail: "daisy.ai@example.com",
    });
    expect(missingConfirm.ok).toBe(false);
    expect(missingConfirm.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const malformedRole = await executeTool(harness, "gws_groups_write", {
      action: "add_group_member",
      confirm: true,
      groupKey: "agents@example.com",
      memberEmail: "daisy.ai@example.com",
      role: "ADMIN",
    });
    expect(malformedRole.ok).toBe(false);
    expect(malformedRole.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const emptyUpdate = await executeTool(harness, "gws_groups_write", {
      action: "update_group",
      confirm: true,
      groupKey: "agents@example.com",
    });
    expect(emptyUpdate.ok).toBe(false);
    expect(emptyUpdate.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const rawGroup = await executeTool(harness, "gws_groups_write", {
      action: "create_group",
      confirm: true,
      raw: { email: "agents@example.com" },
    });
    expect(rawGroup.ok).toBe(false);
    expect(rawGroup.error).toMatchObject({ code: "VALIDATION_ERROR" });

    const deleteGroup = await executeTool(harness, "gws_groups_write", {
      action: "delete_group",
      confirm: true,
      groupKey: "agents@example.com",
    });
    expect(deleteGroup.ok).toBe(false);
    expect(deleteGroup.error).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
