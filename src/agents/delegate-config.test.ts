import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  buildDelegatePreset,
  resolveAgentAuthIsolation,
  resolveDelegateConfig,
} from "./delegate-config.js";

describe("delegate config helpers", () => {
  it("defaults delegate auth isolation to strict", () => {
    const cfg = {
      agents: {
        list: [
          {
            id: "ops",
            workspace: "/tmp/ops",
            delegate: {
              enabled: true,
              tier: "tier2",
            },
          },
        ],
      },
    } satisfies OpenClawConfig;

    expect(resolveDelegateConfig(cfg, "ops")).toMatchObject({
      enabled: true,
      tier: "tier2",
      authIsolation: "strict",
      gwsRouting: { requireExplicitBindings: true },
      cron: { allowed: false },
    });
    expect(resolveAgentAuthIsolation(cfg, "ops")).toBe("strict");
  });

  it("maps tier1 preset to read-mostly delegate posture", () => {
    const preset = buildDelegatePreset("ops", "tier1");

    expect(preset.delegate).toMatchObject({
      enabled: true,
      tier: "tier1",
      authIsolation: "strict",
      cron: { allowed: false },
    });
    expect(preset.sandbox).toMatchObject({
      mode: "all",
      scope: "agent",
      sessionToolsVisibility: "spawned",
    });
    expect(preset.tools.allow).toContain("gws_gmail_write");
    expect(preset.tools.allow).toContain("gws_contacts_read");
    expect(preset.tools.allow).not.toContain("gws_contacts_write");
    expect(preset.tools.allow).not.toContain("cron");
    expect(preset.tools.deny).toContain("cron");
  });

  it("maps tier3 preset to proactive delegate posture", () => {
    const preset = buildDelegatePreset("ops", "tier3");

    expect(preset.delegate.cron?.allowed).toBe(true);
    expect(preset.tools.allow).toContain("cron");
    expect(preset.tools.allow).toContain("gws_calendar_write");
    expect(preset.tools.allow).toContain("gws_contacts_read");
    expect(preset.tools.allow).toContain("gws_contacts_write");
    expect(preset.tools.deny).not.toContain("cron");
  });
});
