import fs from "node:fs";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD

import { describe, expect, it, vi } from "vitest";
=======
import { describe, expect, it } from "vitest";
import { installChromeExtension } from "./browser-cli-extension";
>>>>>>> 0621d0e9e (fix(cli): resolve bundled chrome extension path)

describe("browser extension install", () => {
<<<<<<< HEAD
  it("installs into the state dir (never node_modules)", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "moltbot-ext-"));
    const { installChromeExtension } = await import("./browser-cli-extension.js");
=======
  it("installs bundled chrome extension into a state dir", async () => {
<<<<<<< HEAD
    const tmp = path.join(process.cwd(), ".tmp-test-openclaw-state", String(Date.now()));
>>>>>>> 0621d0e9e (fix(cli): resolve bundled chrome extension path)
=======
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-ext-state-"));
>>>>>>> 1008c28f5 (test(cli): use unique temp dir for extension install)

    try {
      const result = await installChromeExtension({ stateDir: tmp });

<<<<<<< HEAD
    expect(result.path).toContain(path.join("browser", "chrome-extension"));
    expect(fs.existsSync(path.join(result.path, "manifest.json"))).toBe(true);
<<<<<<< HEAD
    expect(result.path.includes("node_modules")).toBe(false);
  });

  it("copies extension path to clipboard", async () => {
    const prev = process.env.CLAWDBOT_STATE_DIR;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "moltbot-ext-path-"));
    process.env.CLAWDBOT_STATE_DIR = tmp;

    try {
      copyToClipboard.mockReset();
      copyToClipboard.mockResolvedValue(true);
      runtime.log.mockReset();
      runtime.error.mockReset();
      runtime.exit.mockReset();

      const dir = path.join(tmp, "browser", "chrome-extension");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ manifest_version: 3 }));

      vi.resetModules();
      const { Command } = await import("commander");
      const { registerBrowserExtensionCommands } = await import("./browser-cli-extension.js");

      const program = new Command();
      const browser = program.command("browser").option("--json", false);
      registerBrowserExtensionCommands(
        browser,
        (cmd) => cmd.parent?.opts?.() as { json?: boolean },
      );

      await program.parseAsync(["browser", "extension", "path"], { from: "user" });

      expect(copyToClipboard).toHaveBeenCalledWith(dir);
    } finally {
<<<<<<< HEAD
      if (prev === undefined) delete process.env.CLAWDBOT_STATE_DIR;
      else process.env.CLAWDBOT_STATE_DIR = prev;
=======
      if (prev === undefined) {
        delete process.env.OPENCLAW_STATE_DIR;
      } else {
        process.env.OPENCLAW_STATE_DIR = prev;
      }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
    }
=======
>>>>>>> 0621d0e9e (fix(cli): resolve bundled chrome extension path)
=======
      expect(result.path).toBe(path.join(tmp, "browser", "chrome-extension"));
      expect(fs.existsSync(path.join(result.path, "manifest.json"))).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
>>>>>>> 1008c28f5 (test(cli): use unique temp dir for extension install)
  });
});
