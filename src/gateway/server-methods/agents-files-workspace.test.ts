import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  config: {} as Record<string, unknown>,
}));

vi.mock("../../config/config.js", () => ({
  loadConfig: () => testState.config,
  writeConfigFile: vi.fn(async () => undefined),
}));

const { agentsHandlers } = await import("./agents.js");

function makeCall(method: string, params: Record<string, unknown>) {
  const respond = vi.fn();
  const handler = (agentsHandlers as Record<string, (args: any) => Promise<void> | void>)[method];
  expect(handler, `missing handler ${method}`).toBeTypeOf("function");
  const promise = handler({
    params,
    respond,
    context: {} as never,
    req: { type: "req" as const, id: "1", method },
    client: null,
    isWebchatConnect: () => false,
  });
  return { respond, promise };
}

async function withTempWorkspace(
  run: (ctx: { workspaceDir: string; inboundRoot: string }) => Promise<void>,
) {
  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-agent-files-workspace-"));
  const inboundRoot = path.join(workspaceDir, "media", "inbound");
  await fs.mkdir(inboundRoot, { recursive: true });
  testState.config = {
    agents: {
      list: [{ id: "main", default: true, workspace: workspaceDir }],
    },
  };
  try {
    await run({ workspaceDir, inboundRoot });
  } finally {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  }
}

function decodeUtf16Be(buffer: Buffer): string {
  const swapped = Buffer.from(buffer);
  for (let index = 0; index + 1 < swapped.length; index += 2) {
    const first = swapped[index];
    swapped[index] = swapped[index + 1] as number;
    swapped[index + 1] = first as number;
  }
  return swapped.toString("utf16le");
}

describe("agents.files.workspace.*", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    testState.config = {};
  });

  it("lists nested directories and files from workspace media/inbound", async () => {
    await withTempWorkspace(async ({ workspaceDir, inboundRoot }) => {
      await fs.mkdir(path.join(inboundRoot, "docs"), { recursive: true });
      await fs.writeFile(path.join(inboundRoot, "docs", "notes.txt"), "hello\n", "utf8");

      const { respond, promise } = makeCall("agents.files.workspace.list", {
        agentId: "main",
        dir: "docs",
      });
      await promise;

      expect(respond).toHaveBeenCalledWith(
        true,
        expect.objectContaining({
          agentId: "main",
          workspace: workspaceDir,
          root: inboundRoot,
          dir: "docs",
          entries: [
            expect.objectContaining({
              path: "docs/notes.txt",
              name: "notes.txt",
              kind: "file",
            }),
          ],
        }),
        undefined,
      );
    });
  });

  it("reads UTF-16LE text files with emoji and exposes download content", async () => {
    await withTempWorkspace(async ({ workspaceDir, inboundRoot }) => {
      const bytes = Buffer.from("\ufeffhello 😀", "utf16le");
      await fs.writeFile(path.join(inboundRoot, "emoji.txt"), bytes);

      const { respond, promise } = makeCall("agents.files.workspace.get", {
        agentId: "main",
        path: "emoji.txt",
      });
      await promise;

      expect(respond).toHaveBeenCalledWith(
        true,
        expect.objectContaining({
          agentId: "main",
          workspace: workspaceDir,
          root: inboundRoot,
          file: expect.objectContaining({
            path: "emoji.txt",
            name: "emoji.txt",
            kind: "file",
            textEditable: true,
            textContent: "hello 😀",
            encoding: "utf-16le",
            includeBom: true,
            contentBase64: bytes.toString("base64"),
          }),
        }),
        undefined,
      );
    });
  });

  it("writes nested UTF-16BE text files and round-trips them", async () => {
    await withTempWorkspace(async ({ inboundRoot }) => {
      const { respond, promise } = makeCall("agents.files.workspace.set", {
        agentId: "main",
        path: "nested/emoji.txt",
        content: "saved 😀",
        encoding: "utf-16be",
        includeBom: true,
      });
      await promise;

      expect(respond).toHaveBeenCalledWith(
        true,
        expect.objectContaining({
          ok: true,
          file: expect.objectContaining({
            path: "nested/emoji.txt",
            textEditable: true,
            textContent: "saved 😀",
            encoding: "utf-16be",
            includeBom: true,
          }),
        }),
        undefined,
      );

      const written = await fs.readFile(path.join(inboundRoot, "nested", "emoji.txt"));
      expect(written.subarray(0, 2).toString("hex")).toBe("feff");
      expect(decodeUtf16Be(written.subarray(2))).toBe("saved 😀");
    });
  });

  it("uploads binary content while marking it non-editable", async () => {
    await withTempWorkspace(async ({ inboundRoot }) => {
      const binary = Buffer.from([0x00, 0xff, 0x10, 0x11, 0x12]);
      const setCall = makeCall("agents.files.workspace.set", {
        agentId: "main",
        path: "bin/payload.bin",
        contentBase64: binary.toString("base64"),
      });
      await setCall.promise;

      const getCall = makeCall("agents.files.workspace.get", {
        agentId: "main",
        path: "bin/payload.bin",
      });
      await getCall.promise;

      expect(getCall.respond).toHaveBeenCalledWith(
        true,
        expect.objectContaining({
          file: expect.objectContaining({
            path: "bin/payload.bin",
            textEditable: false,
            textError: expect.stringContaining("text"),
            contentBase64: binary.toString("base64"),
          }),
        }),
        undefined,
      );
      await expect(fs.readFile(path.join(inboundRoot, "bin", "payload.bin"))).resolves.toEqual(
        binary,
      );
    });
  });

  it("creates directories, moves files, and deletes directories", async () => {
    await withTempWorkspace(async ({ inboundRoot }) => {
      const mkdirCall = makeCall("agents.files.workspace.mkdir", {
        agentId: "main",
        path: "docs/archive",
      });
      await mkdirCall.promise;

      await fs.writeFile(path.join(inboundRoot, "docs", "archive", "draft.txt"), "draft", "utf8");

      const moveCall = makeCall("agents.files.workspace.move", {
        agentId: "main",
        fromPath: "docs/archive/draft.txt",
        toPath: "docs/final.txt",
      });
      await moveCall.promise;

      const deleteCall = makeCall("agents.files.workspace.delete", {
        agentId: "main",
        path: "docs/archive",
      });
      await deleteCall.promise;

      await expect(fs.readFile(path.join(inboundRoot, "docs", "final.txt"), "utf8")).resolves.toBe(
        "draft",
      );
      await expect(fs.access(path.join(inboundRoot, "docs", "archive"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    });
  });

  it("rejects traversal, symlink escapes, and hardlinked aliases", async () => {
    await withTempWorkspace(async ({ inboundRoot, workspaceDir }) => {
      const traversalCall = makeCall("agents.files.workspace.get", {
        agentId: "main",
        path: "../outside.txt",
      });
      await traversalCall.promise;
      expect(traversalCall.respond).toHaveBeenCalledWith(
        false,
        undefined,
        expect.objectContaining({ message: expect.stringContaining("unsafe workspace path") }),
      );

      const outsideFile = path.join(workspaceDir, "..", "outside-hardlink.txt");
      await fs.writeFile(outsideFile, "outside", "utf8");
      await fs.link(outsideFile, path.join(inboundRoot, "hardlink.txt"));

      const hardlinkCall = makeCall("agents.files.workspace.get", {
        agentId: "main",
        path: "hardlink.txt",
      });
      await hardlinkCall.promise;
      expect(hardlinkCall.respond).toHaveBeenCalledWith(
        false,
        undefined,
        expect.objectContaining({ message: expect.stringContaining("unsafe workspace path") }),
      );

      try {
        await fs.symlink(outsideFile, path.join(inboundRoot, "symlink.txt"));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EPERM" || code === "EACCES") {
          return;
        }
        throw error;
      }

      const symlinkCall = makeCall("agents.files.workspace.get", {
        agentId: "main",
        path: "symlink.txt",
      });
      await symlinkCall.promise;
      expect(symlinkCall.respond).toHaveBeenCalledWith(
        false,
        undefined,
        expect.objectContaining({ message: expect.stringContaining("unsafe workspace path") }),
      );
    });
  });

  it("keeps the protected core-files allowlist unchanged", async () => {
    await withTempWorkspace(async () => {
      const { respond, promise } = makeCall("agents.files.set", {
        agentId: "main",
        name: "docs/notes.txt",
        content: "x",
      });
      await promise;

      expect(respond).toHaveBeenCalledWith(
        false,
        undefined,
        expect.objectContaining({ message: expect.stringContaining("unsupported file") }),
      );
    });
  });
});
