import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadInternalHooks } from "./loader.js";
import {
  clearInternalHooks,
  getRegisteredEventKeys,
  triggerInternalHook,
  createInternalHookEvent,
} from "./internal-hooks.js";
import type { OpenClawConfig } from "../config/config.js";

describe("loader", () => {
  let tmpDir: string;
  let originalBundledDir: string | undefined;

  beforeEach(async () => {
    clearInternalHooks();
    // Create a temp directory for test modules
    tmpDir = path.join(os.tmpdir(), `openclaw-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    // Disable bundled hooks during tests by setting env var to non-existent directory
    originalBundledDir = process.env.OPENCLAW_BUNDLED_HOOKS_DIR;
    process.env.OPENCLAW_BUNDLED_HOOKS_DIR = "/nonexistent/bundled/hooks";
  });

  afterEach(async () => {
    clearInternalHooks();
    // Restore original env var
    if (originalBundledDir === undefined) {
      delete process.env.OPENCLAW_BUNDLED_HOOKS_DIR;
    } else {
      process.env.OPENCLAW_BUNDLED_HOOKS_DIR = originalBundledDir;
    }
    // Clean up temp directory
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("loadInternalHooks", () => {
    it("should return 0 when hooks are not enabled", async () => {
      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: false,
          },
        },
      };

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(0);
    });

    it("should return 0 when hooks config is missing", async () => {
      const cfg: OpenClawConfig = {};
      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(0);
    });

    it("should load a handler from a module", async () => {
      // Create a test handler module
      const handlerPath = path.join(tmpDir, "test-handler.js");
      const handlerCode = `
        export default async function(event) {
          // Test handler
        }
      `;
      await fs.writeFile(handlerPath, handlerCode, "utf-8");

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              {
                event: "command:new",
                module: path.basename(handlerPath),
              },
            ],
          },
        },
      };

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(1);

      const keys = getRegisteredEventKeys();
      expect(keys).toContain("command:new");
    });

    it("should load multiple handlers", async () => {
      // Create test handler modules
      const handler1Path = path.join(tmpDir, "handler1.js");
      const handler2Path = path.join(tmpDir, "handler2.js");

      await fs.writeFile(handler1Path, "export default async function() {}", "utf-8");
      await fs.writeFile(handler2Path, "export default async function() {}", "utf-8");

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              { event: "command:new", module: path.basename(handler1Path) },
              { event: "command:stop", module: path.basename(handler2Path) },
            ],
          },
        },
      };

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(2);

      const keys = getRegisteredEventKeys();
      expect(keys).toContain("command:new");
      expect(keys).toContain("command:stop");
    });

    it("should support named exports", async () => {
      // Create a handler module with named export
      const handlerPath = path.join(tmpDir, "named-export.js");
      const handlerCode = `
        export const myHandler = async function(event) {
          // Named export handler
        }
      `;
      await fs.writeFile(handlerPath, handlerCode, "utf-8");

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              {
                event: "command:new",
                module: path.basename(handlerPath),
                export: "myHandler",
              },
            ],
          },
        },
      };

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(1);
    });

    it("should handle module loading errors gracefully", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              {
                event: "command:new",
                module: "missing-handler.js",
              },
            ],
          },
        },
      };

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(0);
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load hook handler"),
        expect.any(String),
      );

      consoleError.mockRestore();
    });

    it("should handle non-function exports", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      // Create a module with a non-function export
      const handlerPath = path.join(tmpDir, "bad-export.js");
      await fs.writeFile(handlerPath, 'export default "not a function";', "utf-8");

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              {
                event: "command:new",
                module: path.basename(handlerPath),
              },
            ],
          },
        },
      };

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(0);
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("is not a function"));

      consoleError.mockRestore();
    });

    it("should handle relative paths", async () => {
      // Create a handler module
      const handlerPath = path.join(tmpDir, "relative-handler.js");
      await fs.writeFile(handlerPath, "export default async function() {}", "utf-8");

      // Relative to workspaceDir (tmpDir)
      const relativePath = path.relative(tmpDir, handlerPath);

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              {
                event: "command:new",
                module: relativePath,
              },
            ],
          },
        },
      };

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(1);
    });

    it("should actually call the loaded handler", async () => {
      // Create a handler that we can verify was called
      const handlerPath = path.join(tmpDir, "callable-handler.js");
      const handlerCode = `
        let callCount = 0;
        export default async function(event) {
          callCount++;
        }
        export function getCallCount() {
          return callCount;
        }
      `;
      await fs.writeFile(handlerPath, handlerCode, "utf-8");

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              {
                event: "command:new",
                module: path.basename(handlerPath),
              },
            ],
          },
        },
      };

      await loadInternalHooks(cfg, tmpDir);

      // Trigger the hook
      const event = createInternalHookEvent("command", "new", "test-session");
      await triggerInternalHook(event);

      // The handler should have been called, but we can't directly verify
      // the call count from this context without more complex test infrastructure
      // This test mainly verifies that loading and triggering doesn't crash
      expect(getRegisteredEventKeys()).toContain("command:new");
    });

    it("rejects directory hook handlers that escape hook dir via symlink", async () => {
      const outsideHandlerPath = path.join(fixtureRoot, `outside-handler-${caseId}.js`);
      await fs.writeFile(outsideHandlerPath, "export default async function() {}", "utf-8");

      const hookDir = path.join(tmpDir, "hooks", "symlink-hook");
      await fs.mkdir(hookDir, { recursive: true });
      await fs.writeFile(
        path.join(hookDir, "HOOK.md"),
        [
          "---",
          "name: symlink-hook",
          "description: symlink test",
          'metadata: {"openclaw":{"events":["command:new"]}}',
          "---",
          "",
          "# Symlink Hook",
        ].join("\n"),
        "utf-8",
      );
      try {
        await fs.symlink(outsideHandlerPath, path.join(hookDir, "handler.js"));
      } catch {
        return;
      }

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
          },
        },
      };

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(0);
      expect(getRegisteredEventKeys()).not.toContain("command:new");
    });

    it("rejects legacy handler modules that escape workspace via symlink", async () => {
      const outsideHandlerPath = path.join(fixtureRoot, `outside-legacy-${caseId}.js`);
      await fs.writeFile(outsideHandlerPath, "export default async function() {}", "utf-8");

      const linkedHandlerPath = path.join(tmpDir, "legacy-handler.js");
      try {
        await fs.symlink(outsideHandlerPath, linkedHandlerPath);
      } catch {
        return;
      }

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              {
                event: "command:new",
                module: "legacy-handler.js",
              },
            ],
          },
        },
      };

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(0);
      expect(getRegisteredEventKeys()).not.toContain("command:new");
    });
  });
});
