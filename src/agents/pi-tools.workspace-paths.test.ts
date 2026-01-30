import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { createOpenClawCodingTools } from "./pi-tools.js";

async function withTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>) {
  // Capture cwd BEFORE creating temp dir to avoid ENOENT if cwd is a deleted temp dir
  const prevCwd = process.cwd();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    // Restore cwd before cleanup to avoid ENOENT when deleting current directory
    try {
      process.chdir(prevCwd);
    } catch {
      // If prevCwd is gone, fall back to tmpdir
      process.chdir(os.tmpdir());
    }
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function getTextContent(result?: { content?: Array<{ type: string; text?: string }> }) {
  const textBlock = result?.content?.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}

describe.sequential("workspace path resolution", () => {
  it("reads relative paths against workspaceDir even after cwd changes", async () => {
<<<<<<< HEAD
    await withTempDir("moltbot-ws-", async (workspaceDir) => {
      await withTempDir("moltbot-cwd-", async (otherDir) => {
=======
    await withTempDir("openclaw-ws-", async (workspaceDir) => {
      await withTempDir("openclaw-cwd-", async (otherDir) => {
        const prevCwd = process.cwd();
>>>>>>> 9a7160786 (refactor: rename to openclaw)
        const testFile = "read.txt";
        const contents = "workspace read ok";
        await fs.writeFile(path.join(workspaceDir, testFile), contents, "utf8");

        process.chdir(otherDir);
<<<<<<< HEAD
        const tools = createMoltbotCodingTools({ workspaceDir });
        const readTool = tools.find((tool) => tool.name === "read");
        expect(readTool).toBeDefined();
=======
        try {
          const tools = createOpenClawCodingTools({ workspaceDir });
          const readTool = tools.find((tool) => tool.name === "read");
          expect(readTool).toBeDefined();
>>>>>>> 9a7160786 (refactor: rename to openclaw)

        const result = await readTool?.execute("ws-read", { path: testFile });
        expect(getTextContent(result)).toContain(contents);
      });
    });
  });

  it("writes relative paths against workspaceDir even after cwd changes", async () => {
<<<<<<< HEAD
    await withTempDir("moltbot-ws-", async (workspaceDir) => {
      await withTempDir("moltbot-cwd-", async (otherDir) => {
=======
    await withTempDir("openclaw-ws-", async (workspaceDir) => {
      await withTempDir("openclaw-cwd-", async (otherDir) => {
        const prevCwd = process.cwd();
>>>>>>> 9a7160786 (refactor: rename to openclaw)
        const testFile = "write.txt";
        const contents = "workspace write ok";

        process.chdir(otherDir);
<<<<<<< HEAD
        const tools = createMoltbotCodingTools({ workspaceDir });
        const writeTool = tools.find((tool) => tool.name === "write");
        expect(writeTool).toBeDefined();
=======
        try {
          const tools = createOpenClawCodingTools({ workspaceDir });
          const writeTool = tools.find((tool) => tool.name === "write");
          expect(writeTool).toBeDefined();
>>>>>>> 9a7160786 (refactor: rename to openclaw)

        await writeTool?.execute("ws-write", {
          path: testFile,
          content: contents,
        });

        const written = await fs.readFile(path.join(workspaceDir, testFile), "utf8");
        expect(written).toBe(contents);
      });
    });
  });

  it("edits relative paths against workspaceDir even after cwd changes", async () => {
<<<<<<< HEAD
    await withTempDir("moltbot-ws-", async (workspaceDir) => {
      await withTempDir("moltbot-cwd-", async (otherDir) => {
=======
    await withTempDir("openclaw-ws-", async (workspaceDir) => {
      await withTempDir("openclaw-cwd-", async (otherDir) => {
        const prevCwd = process.cwd();
>>>>>>> 9a7160786 (refactor: rename to openclaw)
        const testFile = "edit.txt";
        await fs.writeFile(path.join(workspaceDir, testFile), "hello world", "utf8");

        process.chdir(otherDir);
<<<<<<< HEAD
        const tools = createMoltbotCodingTools({ workspaceDir });
        const editTool = tools.find((tool) => tool.name === "edit");
        expect(editTool).toBeDefined();

        await editTool?.execute("ws-edit", {
          path: testFile,
          oldText: "world",
          newText: "moltbot",
        });

        const updated = await fs.readFile(path.join(workspaceDir, testFile), "utf8");
        expect(updated).toBe("hello moltbot");
=======
        try {
          const tools = createOpenClawCodingTools({ workspaceDir });
          const editTool = tools.find((tool) => tool.name === "edit");
          expect(editTool).toBeDefined();

          await editTool?.execute("ws-edit", {
            path: testFile,
            oldText: "world",
            newText: "openclaw",
          });

          const updated = await fs.readFile(path.join(workspaceDir, testFile), "utf8");
          expect(updated).toBe("hello openclaw");
        } finally {
          process.chdir(prevCwd);
        }
>>>>>>> 9a7160786 (refactor: rename to openclaw)
      });
    });
  });

  it("defaults exec cwd to workspaceDir when workdir is omitted", async () => {
    await withTempDir("openclaw-ws-", async (workspaceDir) => {
      const tools = createOpenClawCodingTools({ workspaceDir });
      const execTool = tools.find((tool) => tool.name === "exec");
      expect(execTool).toBeDefined();

      const result = await execTool?.execute("ws-exec", {
        command: "echo ok",
      });
      const cwd =
        result?.details && typeof result.details === "object" && "cwd" in result.details
          ? (result.details as { cwd?: string }).cwd
          : undefined;
      expect(cwd).toBeTruthy();
      const [resolvedOutput, resolvedWorkspace] = await Promise.all([
        fs.realpath(String(cwd)),
        fs.realpath(workspaceDir),
      ]);
      expect(resolvedOutput).toBe(resolvedWorkspace);
    });
  });

  it("lets exec workdir override the workspace default", async () => {
    await withTempDir("openclaw-ws-", async (workspaceDir) => {
      await withTempDir("openclaw-override-", async (overrideDir) => {
        const tools = createOpenClawCodingTools({ workspaceDir });
        const execTool = tools.find((tool) => tool.name === "exec");
        expect(execTool).toBeDefined();

        const result = await execTool?.execute("ws-exec-override", {
          command: "echo ok",
          workdir: overrideDir,
        });
        const cwd =
          result?.details && typeof result.details === "object" && "cwd" in result.details
            ? (result.details as { cwd?: string }).cwd
            : undefined;
        expect(cwd).toBeTruthy();
        const [resolvedOutput, resolvedOverride] = await Promise.all([
          fs.realpath(String(cwd)),
          fs.realpath(overrideDir),
        ]);
        expect(resolvedOutput).toBe(resolvedOverride);
      });
    });
  });
});

describe.sequential("sandboxed workspace paths", () => {
  it("uses sandbox workspace for relative read/write/edit", async () => {
    await withTempDir("openclaw-sandbox-", async (sandboxDir) => {
      await withTempDir("openclaw-workspace-", async (workspaceDir) => {
        const sandbox = {
          enabled: true,
          sessionKey: "sandbox:test",
          workspaceDir: sandboxDir,
          agentWorkspaceDir: workspaceDir,
          workspaceAccess: "rw",
          containerName: "openclaw-sbx-test",
          containerWorkdir: "/workspace",
          docker: {
            image: "openclaw-sandbox:bookworm-slim",
            containerPrefix: "openclaw-sbx-",
            workdir: "/workspace",
            readOnlyRoot: true,
            tmpfs: [],
            network: "none",
            user: "1000:1000",
            capDrop: ["ALL"],
            env: { LANG: "C.UTF-8" },
          },
          tools: { allow: [], deny: [] },
          browserAllowHostControl: false,
        };

        const testFile = "sandbox.txt";
        await fs.writeFile(path.join(sandboxDir, testFile), "sandbox read", "utf8");
        await fs.writeFile(path.join(workspaceDir, testFile), "workspace read", "utf8");

        const tools = createOpenClawCodingTools({ workspaceDir, sandbox });
        const readTool = tools.find((tool) => tool.name === "read");
        const writeTool = tools.find((tool) => tool.name === "write");
        const editTool = tools.find((tool) => tool.name === "edit");

        expect(readTool).toBeDefined();
        expect(writeTool).toBeDefined();
        expect(editTool).toBeDefined();

        const result = await readTool?.execute("sbx-read", { path: testFile });
        expect(getTextContent(result)).toContain("sandbox read");

        await writeTool?.execute("sbx-write", {
          path: "new.txt",
          content: "sandbox write",
        });
        const written = await fs.readFile(path.join(sandboxDir, "new.txt"), "utf8");
        expect(written).toBe("sandbox write");

        await editTool?.execute("sbx-edit", {
          path: "new.txt",
          oldText: "write",
          newText: "edit",
        });
        const edited = await fs.readFile(path.join(sandboxDir, "new.txt"), "utf8");
        expect(edited).toBe("sandbox edit");
      });
    });
  });
});
