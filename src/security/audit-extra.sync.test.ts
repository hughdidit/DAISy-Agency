import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  collectAttackSurfaceSummaryFindings,
  collectHostModeStopgapFindings,
  collectSandboxDangerousConfigFindings,
} from "./audit-extra.sync.js";
import { safeEqualSecret } from "./secret-equal.js";

describe("collectAttackSurfaceSummaryFindings", () => {
  it("distinguishes external webhooks from internal hooks when only internal hooks are enabled", () => {
    const cfg: OpenClawConfig = {
      hooks: { internal: { enabled: true } },
    };

    const [finding] = collectAttackSurfaceSummaryFindings(cfg);
    expect(finding.checkId).toBe("summary.attack_surface");
    expect(finding.detail).toContain("hooks.webhooks: disabled");
    expect(finding.detail).toContain("hooks.internal: enabled");
  });

  it("reports both hook systems as enabled when both are configured", () => {
    const cfg: OpenClawConfig = {
      hooks: { enabled: true, internal: { enabled: true } },
    };

    const [finding] = collectAttackSurfaceSummaryFindings(cfg);
    expect(finding.detail).toContain("hooks.webhooks: enabled");
    expect(finding.detail).toContain("hooks.internal: enabled");
  });

  it("reports both hook systems as disabled when neither is configured", () => {
    const cfg: OpenClawConfig = {};

    const [finding] = collectAttackSurfaceSummaryFindings(cfg);
    expect(finding.detail).toContain("hooks.webhooks: disabled");
    expect(finding.detail).toContain("hooks.internal: disabled");
    expect(finding.detail).toContain("tools.elevated: disabled");
  });
});

describe("collectHostModeStopgapFindings", () => {
  it("reports explicit host-mode filesystem and elevated opt-outs", () => {
    const cfg: OpenClawConfig = {
      commands: { bash: true, debug: true, restart: true },
      tools: {
        fs: { workspaceOnly: false },
        exec: { host: "gateway" },
        elevated: { enabled: true, allowFrom: { whatsapp: ["+1"] } },
      },
      agents: {
        list: [
          {
            id: "ops",
            tools: { fs: { workspaceOnly: false }, exec: { host: "node" } },
          },
        ],
      },
    };

    const findings = collectHostModeStopgapFindings(cfg);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ checkId: "tools.fs.workspace_only_disabled_defaults" }),
        expect.objectContaining({ checkId: "tools.fs.workspace_only_disabled_agents" }),
        expect.objectContaining({ checkId: "commands.bash.break_glass_enabled" }),
        expect.objectContaining({ checkId: "commands.debug.break_glass_enabled" }),
        expect.objectContaining({ checkId: "commands.restart.break_glass_enabled" }),
        expect.objectContaining({ checkId: "tools.elevated.enabled_explicit" }),
        expect.objectContaining({ checkId: "tools.exec.host_compatibility_explicit_defaults" }),
        expect.objectContaining({ checkId: "tools.exec.host_compatibility_explicit_agents" }),
      ]),
    );
  });

  it("does not report restart when the command is explicitly disabled", () => {
    const findings = collectHostModeStopgapFindings({
      commands: { restart: false },
    });

    expect(findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ checkId: "commands.restart.break_glass_enabled" }),
      ]),
    );
  });
});

describe("collectSandboxDangerousConfigFindings", () => {
  it("reports explicit dangerous sandbox overrides as break-glass", () => {
    const findings = collectSandboxDangerousConfigFindings({
      agents: {
        defaults: {
          sandbox: {
            docker: {
              dangerouslyAllowContainerNamespaceJoin: true,
            },
          },
        },
        list: [
          {
            id: "ops",
            sandbox: {
              docker: {
                dangerouslyAllowExternalBindSources: true,
              },
            },
          },
        ],
      },
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          checkId: "sandbox.dangerous_override_enabled",
          detail: expect.stringContaining("break-glass host authority"),
        }),
      ]),
    );
  });
});

describe("safeEqualSecret", () => {
  it("matches identical secrets", () => {
    expect(safeEqualSecret("secret-token", "secret-token")).toBe(true);
  });

  it("rejects mismatched secrets", () => {
    expect(safeEqualSecret("secret-token", "secret-tokEn")).toBe(false);
  });

  it("rejects different-length secrets", () => {
    expect(safeEqualSecret("short", "much-longer")).toBe(false);
  });

  it("rejects missing values", () => {
    expect(safeEqualSecret(undefined, "secret")).toBe(false);
    expect(safeEqualSecret("secret", undefined)).toBe(false);
    expect(safeEqualSecret(null, "secret")).toBe(false);
  });
});
