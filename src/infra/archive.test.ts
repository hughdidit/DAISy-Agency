import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import * as tar from "tar";
import { afterEach, describe, expect, it } from "vitest";
import { extractArchive, resolveArchiveKind, resolvePackedRootDir } from "./archive.js";

const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-archive-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  }
});

describe("archive utils", () => {
  it("detects archive kinds", () => {
    expect(resolveArchiveKind("/tmp/file.zip")).toBe("zip");
    expect(resolveArchiveKind("/tmp/file.tgz")).toBe("tar");
    expect(resolveArchiveKind("/tmp/file.tar.gz")).toBe("tar");
    expect(resolveArchiveKind("/tmp/file.tar")).toBe("tar");
    expect(resolveArchiveKind("/tmp/file.txt")).toBeNull();
  });

  it("extracts zip archives", async () => {
    const workDir = await makeTempDir();
    const archivePath = path.join(workDir, "bundle.zip");
    const extractDir = path.join(workDir, "extract");

    const zip = new JSZip();
    zip.file("package/hello.txt", "hi");
    await fs.writeFile(archivePath, await zip.generateAsync({ type: "nodebuffer" }));

    await fs.mkdir(extractDir, { recursive: true });
    await extractArchive({ archivePath, destDir: extractDir, timeoutMs: 5_000 });
    const rootDir = await resolvePackedRootDir(extractDir);
    const content = await fs.readFile(path.join(rootDir, "hello.txt"), "utf-8");
    expect(content).toBe("hi");
  });

  it("extracts tar archives", async () => {
    const workDir = await makeTempDir();
    const archivePath = path.join(workDir, "bundle.tar");
    const extractDir = path.join(workDir, "extract");
    const packageDir = path.join(workDir, "package");

    await fs.mkdir(packageDir, { recursive: true });
    await fs.writeFile(path.join(packageDir, "hello.txt"), "yo");
    await tar.c({ cwd: workDir, file: archivePath }, ["package"]);

    await fs.mkdir(extractDir, { recursive: true });
    await extractArchive({ archivePath, destDir: extractDir, timeoutMs: 5_000 });
    const rootDir = await resolvePackedRootDir(extractDir);
    const content = await fs.readFile(path.join(rootDir, "hello.txt"), "utf-8");
    expect(content).toBe("yo");
  });
<<<<<<< HEAD
=======

  it("rejects tar path traversal (zip slip)", async () => {
    const workDir = await makeTempDir();
    const archivePath = path.join(workDir, "bundle.tar");
    const extractDir = path.join(workDir, "extract");
    const insideDir = path.join(workDir, "inside");
    await fs.mkdir(insideDir, { recursive: true });
    await fs.writeFile(path.join(workDir, "outside.txt"), "pwnd");

    await tar.c({ cwd: insideDir, file: archivePath }, ["../outside.txt"]);

    await fs.mkdir(extractDir, { recursive: true });
    await expect(
      extractArchive({ archivePath, destDir: extractDir, timeoutMs: 5_000 }),
    ).rejects.toThrow(/escapes destination/i);
  });

  it("rejects zip archives that exceed extracted size budget", async () => {
    const workDir = await makeTempDir();
    const archivePath = path.join(workDir, "bundle.zip");
    const extractDir = path.join(workDir, "extract");

    const zip = new JSZip();
    zip.file("package/big.txt", "x".repeat(64));
    await fs.writeFile(archivePath, await zip.generateAsync({ type: "nodebuffer" }));

    await fs.mkdir(extractDir, { recursive: true });
    await expect(
      extractArchive({
        archivePath,
        destDir: extractDir,
        timeoutMs: 5_000,
        limits: { maxExtractedBytes: 32 },
      }),
    ).rejects.toThrow("archive extracted size exceeds limit");
  });

  it("rejects tar archives that exceed extracted size budget", async () => {
    const workDir = await makeTempDir();
    const archivePath = path.join(workDir, "bundle.tar");
    const extractDir = path.join(workDir, "extract");
    const packageDir = path.join(workDir, "package");

    await fs.mkdir(packageDir, { recursive: true });
    await fs.writeFile(path.join(packageDir, "big.txt"), "x".repeat(64));
    await tar.c({ cwd: workDir, file: archivePath }, ["package"]);

    await fs.mkdir(extractDir, { recursive: true });
    await expect(
      extractArchive({
        archivePath,
        destDir: extractDir,
        timeoutMs: 5_000,
        limits: { maxExtractedBytes: 32 },
      }),
    ).rejects.toThrow("archive extracted size exceeds limit");
  });
>>>>>>> d3ee5deb8 (fix(archive): enforce extraction resource limits)
});
