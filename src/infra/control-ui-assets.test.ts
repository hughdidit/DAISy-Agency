import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD

import { describe, expect, it } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD

import { resolveControlUiDistIndexPath, resolveControlUiRepoRoot } from "./control-ui-assets.js";
=======
import {
  resolveControlUiDistIndexHealth,
  resolveControlUiDistIndexPath,
  resolveControlUiDistIndexPathForRoot,
  resolveControlUiRepoRoot,
  resolveControlUiRootOverrideSync,
  resolveControlUiRootSync,
} from "./control-ui-assets.js";
>>>>>>> 5935c4d23 (fix(ui): fix web UI after tsdown migration and typing changes)
=======
=======
import { afterAll, beforeAll, describe, expect, it } from "vitest";
>>>>>>> 6a361685a (perf(test): speed up control-ui-assets suite)
import {
  resolveControlUiDistIndexHealth,
  resolveControlUiDistIndexPath,
  resolveControlUiDistIndexPathForRoot,
  resolveControlUiRepoRoot,
  resolveControlUiRootOverrideSync,
  resolveControlUiRootSync,
} from "./control-ui-assets.js";
import { resolveOpenClawPackageRoot } from "./openclaw-root.js";
=======
import { pathToFileURL } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)

type FakeFsEntry = { kind: "file"; content: string } | { kind: "dir" };

const state = vi.hoisted(() => ({
  entries: new Map<string, FakeFsEntry>(),
  realpaths: new Map<string, string>(),
}));

const abs = (p: string) => path.resolve(p);

function setFile(p: string, content = "") {
  state.entries.set(abs(p), { kind: "file", content });
}

function setDir(p: string) {
  state.entries.set(abs(p), { kind: "dir" });
}
>>>>>>> 571a237d5 (chore: move local imports to the top)

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const pathMod = await import("node:path");
  const absInMock = (p: string) => pathMod.resolve(p);
  const fixturesRoot = `${absInMock("fixtures")}${pathMod.sep}`;
  const isFixturePath = (p: string) => {
    const resolved = absInMock(p);
    return resolved === fixturesRoot.slice(0, -1) || resolved.startsWith(fixturesRoot);
  };

  const wrapped = {
    ...actual,
    existsSync: (p: string) =>
      isFixturePath(p) ? state.entries.has(absInMock(p)) : actual.existsSync(p),
    readFileSync: (p: string, encoding?: unknown) => {
      if (!isFixturePath(p)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return actual.readFileSync(p as any, encoding as any) as unknown;
      }
      const entry = state.entries.get(absInMock(p));
      if (!entry || entry.kind !== "file") {
        throw new Error(`ENOENT: no such file, open '${p}'`);
      }
      return entry.content;
    },
    statSync: (p: string) => {
      if (!isFixturePath(p)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return actual.statSync(p as any) as unknown;
      }
      const entry = state.entries.get(absInMock(p));
      if (!entry) {
        throw new Error(`ENOENT: no such file or directory, stat '${p}'`);
      }
      return {
        isFile: () => entry.kind === "file",
        isDirectory: () => entry.kind === "dir",
      };
    },
    realpathSync: (p: string) =>
      isFixturePath(p)
        ? (state.realpaths.get(absInMock(p)) ?? absInMock(p))
        : actual.realpathSync(p),
  };

  return { ...wrapped, default: wrapped };
});

vi.mock("./openclaw-root.js", () => ({
  resolveOpenClawPackageRoot: vi.fn(async () => null),
  resolveOpenClawPackageRootSync: vi.fn(() => null),
}));

describe("control UI assets helpers (fs-mocked)", () => {
  beforeEach(() => {
    state.entries.clear();
    state.realpaths.clear();
    vi.clearAllMocks();
  });

  it("resolves repo root from src argv1", async () => {
<<<<<<< HEAD
<<<<<<< HEAD
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-ui-"));
    try {
=======
    await withTempDir(async (tmp) => {
>>>>>>> 6a361685a (perf(test): speed up control-ui-assets suite)
      await fs.mkdir(path.join(tmp, "ui"), { recursive: true });
      await fs.writeFile(path.join(tmp, "ui", "vite.config.ts"), "export {};\n");
      await fs.writeFile(path.join(tmp, "package.json"), "{}\n");
      await fs.mkdir(path.join(tmp, "src"), { recursive: true });
      await fs.writeFile(path.join(tmp, "src", "index.ts"), "export {};\n");
=======
    const { resolveControlUiRepoRoot } = await import("./control-ui-assets.js");
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)

    const root = abs("fixtures/ui-src");
    setFile(path.join(root, "ui", "vite.config.ts"), "export {};\n");

    const argv1 = path.join(root, "src", "index.ts");
    expect(resolveControlUiRepoRoot(argv1)).toBe(root);
  });

<<<<<<< HEAD
  it("resolves repo root from dist argv1", async () => {
<<<<<<< HEAD
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-ui-"));
    try {
=======
    await withTempDir(async (tmp) => {
>>>>>>> 6a361685a (perf(test): speed up control-ui-assets suite)
      await fs.mkdir(path.join(tmp, "ui"), { recursive: true });
      await fs.writeFile(path.join(tmp, "ui", "vite.config.ts"), "export {};\n");
      await fs.writeFile(path.join(tmp, "package.json"), "{}\n");
      await fs.mkdir(path.join(tmp, "dist"), { recursive: true });
      await fs.writeFile(path.join(tmp, "dist", "index.js"), "export {};\n");
=======
  it("resolves repo root by traversing up (dist argv1)", async () => {
    const { resolveControlUiRepoRoot } = await import("./control-ui-assets.js");
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)

    const root = abs("fixtures/ui-dist");
    setFile(path.join(root, "package.json"), "{}\n");
    setFile(path.join(root, "ui", "vite.config.ts"), "export {};\n");

    const argv1 = path.join(root, "dist", "index.js");
    expect(resolveControlUiRepoRoot(argv1)).toBe(root);
  });

<<<<<<< HEAD
  it("resolves dist control-ui index path for dist argv1", () => {
    const argv1 = path.resolve("/tmp", "pkg", "dist", "index.js");
    const distDir = path.dirname(argv1);
    expect(resolveControlUiDistIndexPath(argv1)).toBe(
=======
  it("resolves dist control-ui index path for dist argv1", async () => {
    const { resolveControlUiDistIndexPath } = await import("./control-ui-assets.js");

    const argv1 = abs(path.join("fixtures", "pkg", "dist", "index.js"));
    const distDir = path.dirname(argv1);
    await expect(resolveControlUiDistIndexPath(argv1)).resolves.toBe(
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
      path.join(distDir, "control-ui", "index.html"),
    );
  });
<<<<<<< HEAD
=======

  it("uses resolveOpenClawPackageRoot when available", async () => {
    const openclawRoot = await import("./openclaw-root.js");
    const { resolveControlUiDistIndexPath } = await import("./control-ui-assets.js");

    const pkgRoot = abs("fixtures/openclaw");
    (
      openclawRoot.resolveOpenClawPackageRoot as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(pkgRoot);

    await expect(resolveControlUiDistIndexPath(abs("fixtures/bin/openclaw"))).resolves.toBe(
      path.join(pkgRoot, "dist", "control-ui", "index.html"),
    );
  });

  it("falls back to package.json name matching when root resolution fails", async () => {
    const { resolveControlUiDistIndexPath } = await import("./control-ui-assets.js");

    const root = abs("fixtures/fallback");
    setFile(path.join(root, "package.json"), JSON.stringify({ name: "openclaw" }));
    setFile(path.join(root, "dist", "control-ui", "index.html"), "<html></html>\n");

    await expect(resolveControlUiDistIndexPath(path.join(root, "openclaw.mjs"))).resolves.toBe(
      path.join(root, "dist", "control-ui", "index.html"),
    );
  });

  it("returns null when fallback package name does not match", async () => {
    const { resolveControlUiDistIndexPath } = await import("./control-ui-assets.js");

    const root = abs("fixtures/not-openclaw");
    setFile(path.join(root, "package.json"), JSON.stringify({ name: "malicious-pkg" }));
    setFile(path.join(root, "dist", "control-ui", "index.html"), "<html></html>\n");

    await expect(resolveControlUiDistIndexPath(path.join(root, "index.mjs"))).resolves.toBeNull();
  });

  it("reports health for missing + existing dist assets", async () => {
    const { resolveControlUiDistIndexHealth } = await import("./control-ui-assets.js");

    const root = abs("fixtures/health");
    const indexPath = path.join(root, "dist", "control-ui", "index.html");

    await expect(resolveControlUiDistIndexHealth({ root })).resolves.toEqual({
      indexPath,
      exists: false,
    });

    setFile(indexPath, "<html></html>\n");
    await expect(resolveControlUiDistIndexHealth({ root })).resolves.toEqual({
      indexPath,
      exists: true,
    });
  });

  it("resolves control-ui root from override file or directory", async () => {
    const { resolveControlUiRootOverrideSync } = await import("./control-ui-assets.js");

    const root = abs("fixtures/override");
    const uiDir = path.join(root, "dist", "control-ui");
    const indexPath = path.join(uiDir, "index.html");

    setDir(uiDir);
    setFile(indexPath, "<html></html>\n");

    expect(resolveControlUiRootOverrideSync(uiDir)).toBe(uiDir);
    expect(resolveControlUiRootOverrideSync(indexPath)).toBe(uiDir);
    expect(resolveControlUiRootOverrideSync(path.join(uiDir, "missing.html"))).toBeNull();
  });

  it("resolves control-ui root for dist bundle argv1 and moduleUrl candidates", async () => {
    const openclawRoot = await import("./openclaw-root.js");
    const { resolveControlUiRootSync } = await import("./control-ui-assets.js");

    const pkgRoot = abs("fixtures/openclaw-bundle");
    (
      openclawRoot.resolveOpenClawPackageRootSync as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValueOnce(pkgRoot);

    const uiDir = path.join(pkgRoot, "dist", "control-ui");
    setFile(path.join(uiDir, "index.html"), "<html></html>\n");

    // argv1Dir candidate: <argv1Dir>/control-ui
    expect(resolveControlUiRootSync({ argv1: path.join(pkgRoot, "dist", "bundle.js") })).toBe(
      uiDir,
    );

<<<<<<< HEAD
  it("resolves control-ui root for package entrypoint argv1", async () => {
    await withTempDir(async (tmp) => {
      await fs.writeFile(path.join(tmp, "package.json"), JSON.stringify({ name: "openclaw" }));
      await fs.writeFile(path.join(tmp, "openclaw.mjs"), "export {};\n");
      await fs.mkdir(path.join(tmp, "dist", "control-ui"), { recursive: true });
      await fs.writeFile(path.join(tmp, "dist", "control-ui", "index.html"), "<html></html>\n");

      expect(resolveControlUiRootSync({ argv1: path.join(tmp, "openclaw.mjs") })).toBe(
        path.join(tmp, "dist", "control-ui"),
      );
    });
  });

  it("resolves dist control-ui index path from .bin argv1", async () => {
    await withTempDir(async (tmp) => {
      const binDir = path.join(tmp, "node_modules", ".bin");
      const pkgRoot = path.join(tmp, "node_modules", "openclaw");
      await fs.mkdir(binDir, { recursive: true });
      await fs.mkdir(path.join(pkgRoot, "dist", "control-ui"), { recursive: true });
      await fs.writeFile(path.join(binDir, "openclaw"), "#!/usr/bin/env node\n");
      await fs.writeFile(path.join(pkgRoot, "package.json"), JSON.stringify({ name: "openclaw" }));
      await fs.writeFile(path.join(pkgRoot, "dist", "control-ui", "index.html"), "<html></html>\n");

      expect(await resolveControlUiDistIndexPath(path.join(binDir, "openclaw"))).toBe(
        path.join(pkgRoot, "dist", "control-ui", "index.html"),
      );
    });
  });
<<<<<<< HEAD
>>>>>>> 5935c4d23 (fix(ui): fix web UI after tsdown migration and typing changes)
=======

  it("resolves via fallback when package root resolution fails but package name matches", async () => {
    await withTempDir(async (tmp) => {
      // Package named "openclaw" but resolveOpenClawPackageRoot failed for other reasons
      await fs.writeFile(path.join(tmp, "package.json"), JSON.stringify({ name: "openclaw" }));
      await fs.writeFile(path.join(tmp, "openclaw.mjs"), "export {};\n");
      await fs.mkdir(path.join(tmp, "dist", "control-ui"), { recursive: true });
      await fs.writeFile(path.join(tmp, "dist", "control-ui", "index.html"), "<html></html>\n");

      expect(await resolveControlUiDistIndexPath(path.join(tmp, "openclaw.mjs"))).toBe(
        path.join(tmp, "dist", "control-ui", "index.html"),
      );
    });
  });

  it("returns null when package name does not match openclaw", async () => {
    await withTempDir(async (tmp) => {
      // Package with different name should not be resolved
      await fs.writeFile(path.join(tmp, "package.json"), JSON.stringify({ name: "malicious-pkg" }));
      await fs.writeFile(path.join(tmp, "index.mjs"), "export {};\n");
      await fs.mkdir(path.join(tmp, "dist", "control-ui"), { recursive: true });
      await fs.writeFile(path.join(tmp, "dist", "control-ui", "index.html"), "<html></html>\n");

      expect(await resolveControlUiDistIndexPath(path.join(tmp, "index.mjs"))).toBeNull();
    });
  });

  it("returns null when no control-ui assets exist", async () => {
    await withTempDir(async (tmp) => {
      // Just a package.json, no dist/control-ui
      await fs.writeFile(path.join(tmp, "package.json"), JSON.stringify({ name: "some-pkg" }));
      await fs.writeFile(path.join(tmp, "index.mjs"), "export {};\n");

      expect(await resolveControlUiDistIndexPath(path.join(tmp, "index.mjs"))).toBeNull();
    });
  });

  it("reports health for existing control-ui assets at a known root", async () => {
    await withTempDir(async (tmp) => {
      const indexPath = resolveControlUiDistIndexPathForRoot(tmp);
      await fs.mkdir(path.dirname(indexPath), { recursive: true });
      await fs.writeFile(indexPath, "<html></html>\n");

      await expect(resolveControlUiDistIndexHealth({ root: tmp })).resolves.toEqual({
        indexPath,
        exists: true,
      });
    });
  });

  it("reports health for missing control-ui assets at a known root", async () => {
    await withTempDir(async (tmp) => {
      const indexPath = resolveControlUiDistIndexPathForRoot(tmp);
      await expect(resolveControlUiDistIndexHealth({ root: tmp })).resolves.toEqual({
        indexPath,
        exists: false,
      });
    });
  });
<<<<<<< HEAD
>>>>>>> c75275f10 (Update: harden control UI asset handling in update flow (#10146))
=======

  it("resolves control-ui root when argv1 is a symlink (nvm scenario)", async () => {
    await withTempDir(async (tmp) => {
      const realPkg = path.join(tmp, "real-pkg");
      const bin = path.join(tmp, "bin");
      await fs.mkdir(realPkg, { recursive: true });
      await fs.mkdir(bin, { recursive: true });
      await fs.writeFile(path.join(realPkg, "package.json"), JSON.stringify({ name: "openclaw" }));
      await fs.writeFile(path.join(realPkg, "openclaw.mjs"), "export {};\n");
      await fs.mkdir(path.join(realPkg, "dist", "control-ui"), { recursive: true });
      await fs.writeFile(path.join(realPkg, "dist", "control-ui", "index.html"), "<html></html>\n");
      const ok = await trySymlink(
        path.join("..", "real-pkg", "openclaw.mjs"),
        path.join(bin, "openclaw"),
      );
      if (!ok) {
        return; // symlinks not supported (Windows CI)
      }

      const resolvedRoot = resolveControlUiRootSync({ argv1: path.join(bin, "openclaw") });
      expect(resolvedRoot).not.toBeNull();
      expect(await canonicalPath(resolvedRoot ?? "")).toBe(
        await canonicalPath(path.join(realPkg, "dist", "control-ui")),
      );
    });
  });

  it("resolves package root via symlinked argv1", async () => {
    await withTempDir(async (tmp) => {
      const realPkg = path.join(tmp, "real-pkg");
      const bin = path.join(tmp, "bin");
      await fs.mkdir(realPkg, { recursive: true });
      await fs.mkdir(bin, { recursive: true });
      await fs.writeFile(path.join(realPkg, "package.json"), JSON.stringify({ name: "openclaw" }));
      await fs.writeFile(path.join(realPkg, "openclaw.mjs"), "export {};\n");
      await fs.mkdir(path.join(realPkg, "dist", "control-ui"), { recursive: true });
      await fs.writeFile(path.join(realPkg, "dist", "control-ui", "index.html"), "<html></html>\n");
      const ok = await trySymlink(
        path.join("..", "real-pkg", "openclaw.mjs"),
        path.join(bin, "openclaw"),
      );
      if (!ok) {
        return; // symlinks not supported (Windows CI)
      }

      const packageRoot = await resolveOpenClawPackageRoot({ argv1: path.join(bin, "openclaw") });
      expect(packageRoot).not.toBeNull();
      expect(await canonicalPath(packageRoot ?? "")).toBe(await canonicalPath(realPkg));
    });
  });

  it("resolves dist index path via symlinked argv1 (async)", async () => {
    await withTempDir(async (tmp) => {
      const realPkg = path.join(tmp, "real-pkg");
      const bin = path.join(tmp, "bin");
      await fs.mkdir(realPkg, { recursive: true });
      await fs.mkdir(bin, { recursive: true });
      await fs.writeFile(path.join(realPkg, "package.json"), JSON.stringify({ name: "openclaw" }));
      await fs.writeFile(path.join(realPkg, "openclaw.mjs"), "export {};\n");
      await fs.mkdir(path.join(realPkg, "dist", "control-ui"), { recursive: true });
      await fs.writeFile(path.join(realPkg, "dist", "control-ui", "index.html"), "<html></html>\n");
      const ok = await trySymlink(
        path.join("..", "real-pkg", "openclaw.mjs"),
        path.join(bin, "openclaw"),
      );
      if (!ok) {
        return; // symlinks not supported (Windows CI)
      }

      const indexPath = await resolveControlUiDistIndexPath(path.join(bin, "openclaw"));
      expect(indexPath).not.toBeNull();
      expect(await canonicalPath(indexPath ?? "")).toBe(
        await canonicalPath(path.join(realPkg, "dist", "control-ui", "index.html")),
      );
    });
=======
    // moduleUrl candidate: <moduleDir>/control-ui
    const moduleUrl = pathToFileURL(path.join(pkgRoot, "dist", "bundle.js")).toString();
    expect(resolveControlUiRootSync({ moduleUrl })).toBe(uiDir);
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
  });
>>>>>>> 6a361685a (perf(test): speed up control-ui-assets suite)
});
