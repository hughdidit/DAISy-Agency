import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createHarness, defaultPluginConfig, executeTool } from "../fixtures/harness.js";

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

describe("integration: OPENCLAW_CONFIG_FILE posture", () => {
  it("reports config source posture for present and missing plugin config", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gws-config-source-"));
    try {
      const configPath = path.join(dir, "openclaw.config.json");
      await fs.writeFile(configPath, JSON.stringify({ plugins: { entries: {} } }), "utf8");
      process.env.OPENCLAW_CONFIG_FILE = configPath;

      const okHarness = createHarness({
        pluginConfig: defaultPluginConfig(),
      });
      const ok = await executeTool(okHarness, "gws_status", {});
      expect(ok.ok).toBe(true);
      expect(ok.data).toMatchObject({
        config: {
          posture: {
            sourcePathPresent: true,
            pluginConfigProvided: true,
          },
        },
      });

      const missingHarness = createHarness({
        pluginConfig: undefined,
      });
      const missing = await executeTool(missingHarness, "gws_status", {});
      expect(missing.ok).toBe(false);
      expect(missing.error).toMatchObject({ code: "CONFIG_ERROR" });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("falls back to OPENCLAW_CONFIG_PATH when OPENCLAW_CONFIG_FILE is unset", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gws-config-path-source-"));
    try {
      const configPath = path.join(dir, "openclaw.json");
      await fs.writeFile(configPath, JSON.stringify({ plugins: { entries: {} } }), "utf8");
      delete process.env.OPENCLAW_CONFIG_FILE;
      process.env.OPENCLAW_CONFIG_PATH = configPath;

      const harness = createHarness({
        pluginConfig: defaultPluginConfig(),
      });
      const status = await executeTool(harness, "gws_status", {});

      expect(status.ok).toBe(true);
      expect(status.data).toMatchObject({
        config: {
          posture: {
            sourceEnvVar: "OPENCLAW_CONFIG_PATH",
            sourcePathPresent: true,
            sourcePathBasename: "openclaw.json",
            pluginConfigProvided: true,
          },
        },
      });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("honors gws_status include flags", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";
    const harness = createHarness({
      pluginConfig: defaultPluginConfig(),
    });

    const status = await executeTool(harness, "gws_status", {
      includeVersion: false,
      includeAuthStatus: false,
    });

    expect(status.ok).toBe(true);
    expect(status.data.binary).not.toHaveProperty("version");
    expect(status.data).not.toHaveProperty("auth");
  });

  it("accepts contacts services and route policies in config posture", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";
    const harness = createHarness({
      pluginConfig: defaultPluginConfig({
        enabledServices: ["contacts"],
        enabledWriteServices: ["contacts"],
        allowWriteOperations: true,
        defaultScopesProfile: "service-set",
        credentialRoutes: {
          contacts: {
            mode: "token",
            allowedServices: ["contacts"],
            allowedTools: ["gws_contacts_read", "gws_contacts_write"],
            allowedActions: [
              "contacts:list_contact_groups",
              "contacts:modify_contact_group_members",
            ],
          },
        },
        agentCredentialBindings: {
          "agent:main": "contacts",
        },
      }),
    });

    const status = await executeTool(harness, "gws_status", {});

    expect(status.ok).toBe(true);
    expect(status.data.config.enabledServices).toEqual(["contacts"]);
    expect(status.data.config.enabledWriteServices).toEqual(["contacts"]);
    expect(status.data.scopes.scopes).toContain("https://www.googleapis.com/auth/contacts");
    expect(status.data.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "contacts",
          allowedServices: ["contacts"],
          allowedTools: ["gws_contacts_read", "gws_contacts_write"],
          allowedActions: ["contacts:list_contact_groups", "contacts:modify_contact_group_members"],
        }),
      ]),
    );
  });

  it("accepts directory groups services and route policies in config posture", async () => {
    process.env.GOOGLE_WORKSPACE_CLI_TOKEN = "token";
    const harness = createHarness({
      pluginConfig: defaultPluginConfig({
        enabledServices: ["groups"],
        enabledWriteServices: ["groups"],
        allowWriteOperations: true,
        defaultScopesProfile: "service-set",
        credentialRoutes: {
          groups: {
            mode: "token",
            allowedServices: ["groups"],
            allowedTools: ["gws_groups_read", "gws_groups_write"],
            allowedActions: ["groups:list_groups", "groups:add_group_member"],
          },
        },
        agentCredentialBindings: {
          "agent:main": "groups",
        },
      }),
    });

    const status = await executeTool(harness, "gws_status", {});

    expect(status.ok).toBe(true);
    expect(status.data.config.enabledServices).toEqual(["groups"]);
    expect(status.data.config.enabledWriteServices).toEqual(["groups"]);
    expect(status.data.scopes.scopes).toEqual(
      expect.arrayContaining([
        "https://www.googleapis.com/auth/admin.directory.group",
        "https://www.googleapis.com/auth/admin.directory.group.member",
      ]),
    );
    expect(status.data.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "groups",
          allowedServices: ["groups"],
          allowedTools: ["gws_groups_read", "gws_groups_write"],
          allowedActions: ["groups:list_groups", "groups:add_group_member"],
        }),
      ]),
    );
  });
});
