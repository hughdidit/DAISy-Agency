import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";
import * as tar from "tar";
<<<<<<< HEAD
import { afterEach, describe, expect, it } from "vitest";
=======
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> 6f7d31c42 (fix(security): harden plugin/hook npm installs)

const tempDirs: string[] = [];

async function packToArchive({
  pkgDir,
  outDir,
  outName,
}: {
  pkgDir: string;
  outDir: string;
  outName: string;
}) {
  const dest = path.join(outDir, outName);
  fs.rmSync(dest, { force: true });
  await tar.c(
    {
      gzip: true,
      file: dest,
      cwd: path.dirname(pkgDir),
    },
    [path.basename(pkgDir)],
  );
  return dest;
}

function makeTempDir() {
  const dir = path.join(os.tmpdir(), `openclaw-hook-install-${randomUUID()}`);
  fs.mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

<<<<<<< HEAD
afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
=======
const { runCommandWithTimeout } = await import("../process/exec.js");
const { installHooksFromArchive, installHooksFromNpmSpec, installHooksFromPath } =
  await import("./install.js");

afterAll(() => {
  try {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  } catch {
    // ignore cleanup failures
>>>>>>> 6f7d31c42 (fix(security): harden plugin/hook npm installs)
  }
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("installHooksFromArchive", () => {
  it("installs hook packs from zip archives", async () => {
    const stateDir = makeTempDir();
    const workDir = makeTempDir();
    const archivePath = path.join(workDir, "hooks.zip");

    const zip = new JSZip();
    zip.file(
      "package/package.json",
      JSON.stringify({
        name: "@openclaw/zip-hooks",
        version: "0.0.1",
        openclaw: { hooks: ["./hooks/zip-hook"] },
      }),
    );
    zip.file(
      "package/hooks/zip-hook/HOOK.md",
      [
        "---",
        "name: zip-hook",
        "description: Zip hook",
        'metadata: {"openclaw":{"events":["command:new"]}}',
        "---",
        "",
        "# Zip Hook",
      ].join("\n"),
    );
    zip.file("package/hooks/zip-hook/handler.ts", "export default async () => {};\n");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    fs.writeFileSync(archivePath, buffer);

    const hooksDir = path.join(stateDir, "hooks");
    const { installHooksFromArchive } = await import("./install.js");
    const result = await installHooksFromArchive({ archivePath, hooksDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hookPackId).toBe("zip-hooks");
    expect(result.hooks).toContain("zip-hook");
    expect(result.targetDir).toBe(path.join(stateDir, "hooks", "zip-hooks"));
    expect(fs.existsSync(path.join(result.targetDir, "hooks", "zip-hook", "HOOK.md"))).toBe(true);
  });

  it("installs hook packs from tar archives", async () => {
    const stateDir = makeTempDir();
    const workDir = makeTempDir();
    const archivePath = path.join(workDir, "hooks.tar");
    const pkgDir = path.join(workDir, "package");

    fs.mkdirSync(path.join(pkgDir, "hooks", "tar-hook"), { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({
        name: "@openclaw/tar-hooks",
        version: "0.0.1",
        openclaw: { hooks: ["./hooks/tar-hook"] },
      }),
      "utf-8",
    );
    fs.writeFileSync(
      path.join(pkgDir, "hooks", "tar-hook", "HOOK.md"),
      [
        "---",
        "name: tar-hook",
        "description: Tar hook",
        'metadata: {"openclaw":{"events":["command:new"]}}',
        "---",
        "",
        "# Tar Hook",
      ].join("\n"),
      "utf-8",
    );
    fs.writeFileSync(
      path.join(pkgDir, "hooks", "tar-hook", "handler.ts"),
      "export default async () => {};\n",
      "utf-8",
    );
    await tar.c({ cwd: workDir, file: archivePath }, ["package"]);

    const hooksDir = path.join(stateDir, "hooks");
    const { installHooksFromArchive } = await import("./install.js");
    const result = await installHooksFromArchive({ archivePath, hooksDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hookPackId).toBe("tar-hooks");
    expect(result.hooks).toContain("tar-hook");
    expect(result.targetDir).toBe(path.join(stateDir, "hooks", "tar-hooks"));
  });
});

describe("installHooksFromPath", () => {
  it("installs a single hook directory", async () => {
    const stateDir = makeTempDir();
    const workDir = makeTempDir();
    const hookDir = path.join(workDir, "my-hook");
    fs.mkdirSync(hookDir, { recursive: true });
    fs.writeFileSync(
      path.join(hookDir, "HOOK.md"),
      [
        "---",
        "name: my-hook",
        "description: My hook",
        'metadata: {"openclaw":{"events":["command:new"]}}',
        "---",
        "",
        "# My Hook",
      ].join("\n"),
      "utf-8",
    );
    fs.writeFileSync(path.join(hookDir, "handler.ts"), "export default async () => {};\n");

    const hooksDir = path.join(stateDir, "hooks");
    const { installHooksFromPath } = await import("./install.js");
    const result = await installHooksFromPath({ path: hookDir, hooksDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hookPackId).toBe("my-hook");
    expect(result.hooks).toEqual(["my-hook"]);
    expect(result.targetDir).toBe(path.join(stateDir, "hooks", "my-hook"));
    expect(fs.existsSync(path.join(result.targetDir, "HOOK.md"))).toBe(true);
  });
});

describe("installHooksFromNpmSpec", () => {
  it("uses --ignore-scripts for npm pack and cleans up temp dir", async () => {
    const workDir = makeTempDir();
    const stateDir = makeTempDir();
    const pkgDir = path.join(workDir, "package");
    fs.mkdirSync(path.join(pkgDir, "hooks", "one-hook"), { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({
        name: "@openclaw/test-hooks",
        version: "0.0.1",
        openclaw: { hooks: ["./hooks/one-hook"] },
      }),
      "utf-8",
    );
    fs.writeFileSync(
      path.join(pkgDir, "hooks", "one-hook", "HOOK.md"),
      [
        "---",
        "name: one-hook",
        "description: One hook",
        'metadata: {"openclaw":{"events":["command:new"]}}',
        "---",
        "",
        "# One Hook",
      ].join("\n"),
      "utf-8",
    );
    fs.writeFileSync(
      path.join(pkgDir, "hooks", "one-hook", "handler.ts"),
      "export default async () => {};\n",
      "utf-8",
    );

    const run = vi.mocked(runCommandWithTimeout);
    let packTmpDir = "";
    const packedName = "test-hooks-0.0.1.tgz";
    run.mockImplementation(async (argv, opts) => {
      if (argv[0] === "npm" && argv[1] === "pack") {
        packTmpDir = String(opts?.cwd ?? "");
        await packToArchive({ pkgDir, outDir: packTmpDir, outName: packedName });
        return { code: 0, stdout: `${packedName}\n`, stderr: "", signal: null, killed: false };
      }
      throw new Error(`unexpected command: ${argv.join(" ")}`);
    });

    const hooksDir = path.join(stateDir, "hooks");
    const result = await installHooksFromNpmSpec({
      spec: "@openclaw/test-hooks@0.0.1",
      hooksDir,
      logger: { info: () => {}, warn: () => {} },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.hookPackId).toBe("test-hooks");
    expect(fs.existsSync(path.join(result.targetDir, "hooks", "one-hook", "HOOK.md"))).toBe(true);

    const packCalls = run.mock.calls.filter(
      (c) => Array.isArray(c[0]) && c[0][0] === "npm" && c[0][1] === "pack",
    );
    expect(packCalls.length).toBe(1);
    const packCall = packCalls[0];
    if (!packCall) {
      throw new Error("expected npm pack call");
    }
    const [argv, options] = packCall;
    expect(argv).toEqual(["npm", "pack", "@openclaw/test-hooks@0.0.1", "--ignore-scripts"]);
    expect(options?.env).toMatchObject({ NPM_CONFIG_IGNORE_SCRIPTS: "true" });

    expect(packTmpDir).not.toBe("");
    expect(fs.existsSync(packTmpDir)).toBe(false);
  });

  it("rejects non-registry npm specs", async () => {
    const result = await installHooksFromNpmSpec({ spec: "github:evil/evil" });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toContain("unsupported npm spec");
  });
});
