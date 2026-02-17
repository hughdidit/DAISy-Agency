import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
<<<<<<< HEAD

import { resolveBootstrapContextForRun, resolveBootstrapFilesForRun } from "./bootstrap-files.js";
import { makeTempWorkspace } from "../test-helpers/workspace.js";
=======
import type { WorkspaceBootstrapFile } from "./workspace.js";
>>>>>>> ed11e93cf (chore(format))
import {
  clearInternalHooks,
  registerInternalHook,
  type AgentBootstrapHookContext,
} from "../hooks/internal-hooks.js";
<<<<<<< HEAD
=======
import { makeTempWorkspace } from "../test-helpers/workspace.js";
import { resolveBootstrapContextForRun, resolveBootstrapFilesForRun } from "./bootstrap-files.js";
<<<<<<< HEAD
import type { WorkspaceBootstrapFile } from "./workspace.js";
>>>>>>> 18cc48dfd (chore: Fix types in tests 20/N.)
=======
>>>>>>> ed11e93cf (chore(format))

describe("resolveBootstrapFilesForRun", () => {
  beforeEach(() => clearInternalHooks());
  afterEach(() => clearInternalHooks());

  it("applies bootstrap hook overrides", async () => {
    registerInternalHook("agent:bootstrap", (event) => {
      const context = event.context as AgentBootstrapHookContext;
      context.bootstrapFiles = [
        ...context.bootstrapFiles,
        {
          name: "EXTRA.md",
          path: path.join(context.workspaceDir, "EXTRA.md"),
          content: "extra",
          missing: false,
        } as unknown as WorkspaceBootstrapFile,
      ];
    });

    const workspaceDir = await makeTempWorkspace("moltbot-bootstrap-");
    const files = await resolveBootstrapFilesForRun({ workspaceDir });

    expect(files.some((file) => file.path === path.join(workspaceDir, "EXTRA.md"))).toBe(true);
  });
});

describe("resolveBootstrapContextForRun", () => {
  beforeEach(() => clearInternalHooks());
  afterEach(() => clearInternalHooks());

  it("returns context files for hook-adjusted bootstrap files", async () => {
    registerInternalHook("agent:bootstrap", (event) => {
      const context = event.context as AgentBootstrapHookContext;
      context.bootstrapFiles = [
        ...context.bootstrapFiles,
        {
          name: "EXTRA.md",
          path: path.join(context.workspaceDir, "EXTRA.md"),
          content: "extra",
          missing: false,
        } as unknown as WorkspaceBootstrapFile,
      ];
    });

    const workspaceDir = await makeTempWorkspace("moltbot-bootstrap-");
    const result = await resolveBootstrapContextForRun({ workspaceDir });
    const extra = result.contextFiles.find((file) => file.path === "EXTRA.md");

    expect(extra?.content).toBe("extra");
  });
});
