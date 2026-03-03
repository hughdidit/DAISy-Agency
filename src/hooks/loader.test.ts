import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadInternalHooks } from "./loader.js";
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> 1c928e493 (fix(hooks): replace console logging with proper subsystem logging in loader (openclaw#11029) thanks @shadril238)
import {
  clearInternalHooks,
  getRegisteredEventKeys,
  triggerInternalHook,
  createInternalHookEvent,
} from "./internal-hooks.js";
import type { OpenClawConfig } from "../config/config.js";

describe("loader", () => {
  let fixtureRoot = "";
  let caseId = 0;
  let tmpDir: string;
  let envSnapshot: ReturnType<typeof captureEnv>;

  beforeAll(async () => {
    fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-hooks-loader-"));
  });

  beforeEach(async () => {
    clearInternalHooks();
    // Create a temp directory for test modules
    tmpDir = path.join(os.tmpdir(), `openclaw-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    // Disable bundled hooks during tests by setting env var to non-existent directory
    originalBundledDir = process.env.OPENCLAW_BUNDLED_HOOKS_DIR;
    process.env.OPENCLAW_BUNDLED_HOOKS_DIR = "/nonexistent/bundled/hooks";
  });

  async function writeHandlerModule(
    fileName: string,
    code = "export default async function() {}",
  ): Promise<string> {
    const handlerPath = path.join(tmpDir, fileName);
    await fs.writeFile(handlerPath, code, "utf-8");
    return handlerPath;
  }

  function createEnabledHooksConfig(
    handlers?: Array<{ event: string; module: string; export?: string }>,
  ): OpenClawConfig {
    return {
      hooks: {
        internal: handlers ? { enabled: true, handlers } : { enabled: true },
      },
    };
  }

  afterEach(async () => {
    clearInternalHooks();
    // Restore original env var
    if (originalBundledDir === undefined) {
      delete process.env.OPENCLAW_BUNDLED_HOOKS_DIR;
    } else {
      process.env.OPENCLAW_BUNDLED_HOOKS_DIR = originalBundledDir;
    }
  });

  afterAll(async () => {
    if (!fixtureRoot) {
      return;
    }
    await fs.rm(fixtureRoot, { recursive: true, force: true });
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
                module: handlerPath,
              },
            ],
          },
        },
      ]);

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(1);

      const keys = getRegisteredEventKeys();
      expect(keys).toContain("command:new");
    });

    it("should load multiple handlers", async () => {
      // Create test handler modules
      const handler1Path = await writeHandlerModule("handler1.js");
      const handler2Path = await writeHandlerModule("handler2.js");

      await fs.writeFile(handler1Path, "export default async function() {}", "utf-8");
      await fs.writeFile(handler2Path, "export default async function() {}", "utf-8");

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              { event: "command:new", module: handler1Path },
              { event: "command:stop", module: handler2Path },
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
      const handlerCode = `
        export const myHandler = async function(event) {
          // Named export handler
        }
      `;
      const handlerPath = await writeHandlerModule("named-export.js", handlerCode);

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              {
                event: "command:new",
                module: handlerPath,
                export: "myHandler",
              },
            ],
          },
        },
      ]);

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(1);
    });

    it("should handle module loading errors gracefully", async () => {
<<<<<<< HEAD
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              {
                event: "command:new",
                module: "/nonexistent/path/handler.js",
              },
            ],
          },
=======
      const cfg = createEnabledHooksConfig([
        {
          event: "command:new",
          module: "missing-handler.js",
>>>>>>> d116bcfb1 (refactor(runtime): consolidate followup, gateway, and provider dedupe paths)
        },
      ]);

      // Should not throw and should return 0 (handler failed to load)
      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(0);
    });

    it("should handle non-function exports", async () => {
      // Create a module with a non-function export
      const handlerPath = await writeHandlerModule(
        "bad-export.js",
        'export default "not a function";',
      );

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              {
                event: "command:new",
                module: handlerPath,
              },
            ],
          },
        },
      ]);

      // Should not throw and should return 0 (handler is not a function)
      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(0);
    });

    it("should handle relative paths", async () => {
      // Create a handler module
      const handlerPath = await writeHandlerModule("relative-handler.js");

      // Get relative path from cwd
      const relativePath = path.relative(process.cwd(), handlerPath);

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
      ]);

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(1);
    });

    it("should actually call the loaded handler", async () => {
      // Create a handler that we can verify was called
      const handlerCode = `
        let callCount = 0;
        export default async function(event) {
          callCount++;
        }
        export function getCallCount() {
          return callCount;
        }
      `;
      const handlerPath = await writeHandlerModule("callable-handler.js", handlerCode);

      const cfg: OpenClawConfig = {
        hooks: {
          internal: {
            enabled: true,
            handlers: [
              {
                event: "command:new",
                module: handlerPath,
              },
            ],
          },
        },
      ]);

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

      const cfg = createEnabledHooksConfig();

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

      const cfg = createEnabledHooksConfig([
        {
          event: "command:new",
          module: "legacy-handler.js",
        },
      ]);

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(0);
      expect(getRegisteredEventKeys()).not.toContain("command:new");
    });
<<<<<<< HEAD
=======

    it("rejects directory hook handlers that escape hook dir via hardlink", async () => {
      if (process.platform === "win32") {
        return;
      }
      const outsideHandlerPath = path.join(fixtureRoot, `outside-handler-hardlink-${caseId}.js`);
      await fs.writeFile(outsideHandlerPath, "export default async function() {}", "utf-8");

      const hookDir = path.join(tmpDir, "hooks", "hardlink-hook");
      await fs.mkdir(hookDir, { recursive: true });
      await fs.writeFile(
        path.join(hookDir, "HOOK.md"),
        [
          "---",
          "name: hardlink-hook",
          "description: hardlink test",
          'metadata: {"openclaw":{"events":["command:new"]}}',
          "---",
          "",
          "# Hardlink Hook",
        ].join("\n"),
        "utf-8",
      );
      try {
        await fs.link(outsideHandlerPath, path.join(hookDir, "handler.js"));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EXDEV") {
          return;
        }
        throw err;
      }

      const cfg = createEnabledHooksConfig();
      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(0);
      expect(getRegisteredEventKeys()).not.toContain("command:new");
    });

    it("rejects legacy handler modules that escape workspace via hardlink", async () => {
      if (process.platform === "win32") {
        return;
      }
      const outsideHandlerPath = path.join(fixtureRoot, `outside-legacy-hardlink-${caseId}.js`);
      await fs.writeFile(outsideHandlerPath, "export default async function() {}", "utf-8");

      const linkedHandlerPath = path.join(tmpDir, "legacy-handler.js");
      try {
        await fs.link(outsideHandlerPath, linkedHandlerPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EXDEV") {
          return;
        }
        throw err;
      }

      const cfg = createEnabledHooksConfig([
        {
          event: "command:new",
          module: "legacy-handler.js",
        },
      ]);

      const count = await loadInternalHooks(cfg, tmpDir);
      expect(count).toBe(0);
      expect(getRegisteredEventKeys()).not.toContain("command:new");
    });
>>>>>>> eac86c208 (refactor: unify boundary hardening for file reads)
  });
});
