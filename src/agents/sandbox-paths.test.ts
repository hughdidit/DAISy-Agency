import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveSandboxedMediaSource } from "./sandbox-paths.js";

async function withSandboxRoot<T>(run: (sandboxDir: string) => Promise<T>) {
  const sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-media-"));
  try {
    return await run(sandboxDir);
  } finally {
    await fs.rm(sandboxDir, { recursive: true, force: true });
  }
}

async function expectSandboxRejection(media: string, sandboxRoot: string, pattern: RegExp) {
  await expect(resolveSandboxedMediaSource({ media, sandboxRoot })).rejects.toThrow(pattern);
}

function isPathInside(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function makeTmpProbePath(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`;
}

async function withOutsideHardlinkInOpenClawTmp<T>(
  params: {
    openClawTmpDir: string;
    hardlinkPrefix: string;
    symlinkPrefix?: string;
  },
  run: (paths: { hardlinkPath: string; symlinkPath?: string }) => Promise<T>,
): Promise<void> {
  const outsideDir = await fs.mkdtemp(path.join(process.cwd(), "sandbox-media-hardlink-outside-"));
  const outsideFile = path.join(outsideDir, "outside-secret.txt");
  const hardlinkPath = path.join(params.openClawTmpDir, makeTmpProbePath(params.hardlinkPrefix));
  const symlinkPath = params.symlinkPrefix
    ? path.join(params.openClawTmpDir, makeTmpProbePath(params.symlinkPrefix))
    : undefined;
  try {
    if (isPathInside(params.openClawTmpDir, outsideFile)) {
      return;
    }
    await fs.writeFile(outsideFile, "secret", "utf8");
    await fs.mkdir(params.openClawTmpDir, { recursive: true });
    try {
      await fs.link(outsideFile, hardlinkPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EXDEV") {
        return;
      }
      throw err;
    }
    if (symlinkPath) {
      await fs.symlink(hardlinkPath, symlinkPath);
    }
    await run({ hardlinkPath, symlinkPath });
  } finally {
    if (symlinkPath) {
      await fs.rm(symlinkPath, { force: true });
    }
    await fs.rm(hardlinkPath, { force: true });
    await fs.rm(outsideDir, { recursive: true, force: true });
  }
}

describe("resolveSandboxedMediaSource", () => {
  // Group 1: /tmp paths (the bug fix)
  it.each([
    {
      name: "absolute paths under os.tmpdir()",
      media: path.join(os.tmpdir(), "image.png"),
      expected: path.join(os.tmpdir(), "image.png"),
    },
    {
      name: "file:// URLs pointing to os.tmpdir()",
      media: pathToFileURL(path.join(os.tmpdir(), "photo.png")).href,
      expected: path.join(os.tmpdir(), "photo.png"),
    },
    {
      name: "nested paths under os.tmpdir()",
      media: path.join(os.tmpdir(), "subdir", "deep", "file.png"),
      expected: path.join(os.tmpdir(), "subdir", "deep", "file.png"),
    },
  ])("allows $name", async ({ media, expected }) => {
    await withSandboxRoot(async (sandboxDir) => {
      const result = await resolveSandboxedMediaSource({
        media,
        sandboxRoot: sandboxDir,
      });
      expect(result).toBe(path.resolve(expected));
    });
  });

  // Group 2: Sandbox-relative paths (existing behavior)
  it("resolves sandbox-relative paths", async () => {
    await withSandboxRoot(async (sandboxDir) => {
      const result = await resolveSandboxedMediaSource({
        media: "./data/file.txt",
        sandboxRoot: sandboxDir,
      });
      expect(result).toBe(path.join(sandboxDir, "data", "file.txt"));
    });
  });

  it("maps container /workspace absolute paths into sandbox root", async () => {
    await withSandboxRoot(async (sandboxDir) => {
      const result = await resolveSandboxedMediaSource({
        media: "/workspace/media/pic.png",
        sandboxRoot: sandboxDir,
      });
      expect(result).toBe(path.join(sandboxDir, "media", "pic.png"));
    });
  });

  it("maps file:// URLs under /workspace into sandbox root", async () => {
    await withSandboxRoot(async (sandboxDir) => {
      const result = await resolveSandboxedMediaSource({
        media: "file:///workspace/media/pic.png",
        sandboxRoot: sandboxDir,
      });
      expect(result).toBe(path.join(sandboxDir, "media", "pic.png"));
    });
  });

  // Group 3: Rejections (security)
  it("rejects paths outside sandbox root and tmpdir", async () => {
    const sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-media-"));
    try {
      await expect(
        resolveSandboxedMediaSource({ media: "/etc/passwd", sandboxRoot: sandboxDir }),
      ).rejects.toThrow(/sandbox/i);
    } finally {
      await fs.rm(sandboxDir, { recursive: true, force: true });
    }
  });

  it("rejects path traversal through tmpdir", async () => {
    const sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-media-"));
    try {
      await expect(
        resolveSandboxedMediaSource({
          media: path.join(os.tmpdir(), "..", "etc", "passwd"),
          sandboxRoot: sandboxDir,
        }),
      ).rejects.toThrow(/sandbox/i);
    } finally {
      await fs.rm(sandboxDir, { recursive: true, force: true });
    }
  });

  it("rejects file:// URLs outside sandbox", async () => {
    const sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-media-"));
    try {
      await expect(
        resolveSandboxedMediaSource({
          media: "file:///etc/passwd",
          sandboxRoot: sandboxDir,
        }),
      ).rejects.toThrow(/sandbox/i);
    } finally {
      await fs.rm(sandboxDir, { recursive: true, force: true });
    }
  });

  it("throws on invalid file:// URLs", async () => {
    const sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-media-"));
    try {
      await expect(
        resolveSandboxedMediaSource({
          media: "file://not a valid url\x00",
          sandboxRoot: sandboxDir,
        }),
      ).rejects.toThrow(/Invalid file:\/\/ URL/);
    } finally {
      await fs.rm(sandboxDir, { recursive: true, force: true });
    }
  });

  it("rejects hardlinked OpenClaw tmp paths to outside files", async () => {
    if (process.platform === "win32") {
      return;
    }
    await withOutsideHardlinkInOpenClawTmp(
      {
        openClawTmpDir,
        hardlinkPrefix: "sandbox-media-hardlink",
      },
      async ({ hardlinkPath }) => {
        await withSandboxRoot(async (sandboxDir) => {
          await expectSandboxRejection(hardlinkPath, sandboxDir, /hard.?link|sandbox/i);
        });
      },
    );
  });

  it("rejects symlinked OpenClaw tmp paths to hardlinked outside files", async () => {
    if (process.platform === "win32") {
      return;
    }
    await withOutsideHardlinkInOpenClawTmp(
      {
        openClawTmpDir,
        hardlinkPrefix: "sandbox-media-hardlink-target",
        symlinkPrefix: "sandbox-media-hardlink-symlink",
      },
      async ({ symlinkPath }) => {
        if (!symlinkPath) {
          return;
        }
        await withSandboxRoot(async (sandboxDir) => {
          await expectSandboxRejection(symlinkPath, sandboxDir, /hard.?link|sandbox/i);
        });
      },
    );
  });

  // Group 4: Passthrough
  it("passes HTTP URLs through unchanged", async () => {
    const result = await resolveSandboxedMediaSource({
      media: "https://example.com/image.png",
      sandboxRoot: "/any/path",
    });
    expect(result).toBe("https://example.com/image.png");
  });

  it("returns empty string for empty input", async () => {
    const result = await resolveSandboxedMediaSource({
      media: "",
      sandboxRoot: "/any/path",
    });
    expect(result).toBe("");
  });

  it("returns empty string for whitespace-only input", async () => {
    const result = await resolveSandboxedMediaSource({
      media: "   ",
      sandboxRoot: "/any/path",
    });
    expect(result).toBe("");
  });
});
