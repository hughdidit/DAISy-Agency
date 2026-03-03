import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { POSIX_OPENCLAW_TMP_DIR, resolvePreferredOpenClawTmpDir } from "./tmp-openclaw-dir.js";

type TmpDirOptions = NonNullable<Parameters<typeof resolvePreferredOpenClawTmpDir>[0]>;

function fallbackTmp(uid = 501) {
  return path.join("/var/fallback", `openclaw-${uid}`);
}

function resolveWithMocks(params: {
  lstatSync: NonNullable<TmpDirOptions["lstatSync"]>;
  accessSync?: NonNullable<TmpDirOptions["accessSync"]>;
  uid?: number;
  tmpdirPath?: string;
}) {
  const accessSync = params.accessSync ?? vi.fn();
  const mkdirSync = vi.fn();
  const getuid = vi.fn(() => params.uid ?? 501);
  const tmpdir = vi.fn(() => params.tmpdirPath ?? "/var/fallback");
  const resolved = resolvePreferredOpenClawTmpDir({
    accessSync,
    lstatSync: params.lstatSync,
    mkdirSync,
    getuid,
    tmpdir,
  });
  return { resolved, accessSync, lstatSync: params.lstatSync, mkdirSync, tmpdir };
}

describe("resolvePreferredOpenClawTmpDir", () => {
  it("prefers /tmp/openclaw when it already exists and is writable", () => {
<<<<<<< HEAD
    const accessSync = vi.fn();
    const statSync = vi.fn(() => ({ isDirectory: () => true }));
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredOpenClawTmpDir({ accessSync, statSync, tmpdir });
      isDirectory: () => true,
      isSymbolicLink: () => false,
      uid: 501,
      mode: 0o40700,
    }));
    const { resolved, accessSync, tmpdir } = resolveWithMocks({ lstatSync });
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)

    expect(statSync).toHaveBeenCalledTimes(1);
    expect(accessSync).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(POSIX_OPENCLAW_TMP_DIR);
    expect(tmpdir).not.toHaveBeenCalled();
  });

  it("prefers /tmp/openclaw when it does not exist but /tmp is writable", () => {
<<<<<<< HEAD
    const accessSync = vi.fn();
    const statSync = vi.fn(() => {
=======
    const lstatSyncMock = vi.fn<NonNullable<TmpDirOptions["lstatSync"]>>(() => {
>>>>>>> 49bd9f75f (chore: Fix types in tests 33/N.)
      const err = new Error("missing") as Error & { code?: string };
      err.code = "ENOENT";
      throw err;
    });
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredOpenClawTmpDir({ accessSync, statSync, tmpdir });
=======
    const { resolved, accessSync, mkdirSync, tmpdir } = resolveWithMocks({
      lstatSync: lstatSyncMock,
    });
>>>>>>> 49bd9f75f (chore: Fix types in tests 33/N.)

    expect(resolved).toBe(POSIX_OPENCLAW_TMP_DIR);
    expect(accessSync).toHaveBeenCalledWith("/tmp", expect.any(Number));
    expect(tmpdir).not.toHaveBeenCalled();
  });

  it("falls back to os.tmpdir()/openclaw when /tmp/openclaw is not a directory", () => {
    const accessSync = vi.fn();
    const statSync = vi.fn(() => ({ isDirectory: () => false }));
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredOpenClawTmpDir({ accessSync, statSync, tmpdir });

    expect(resolved).toBe(path.join("/var/fallback", "openclaw"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });

  it("falls back to os.tmpdir()/openclaw when /tmp is not writable", () => {
    const accessSync = vi.fn((target: string) => {
      if (target === "/tmp") {
        throw new Error("read-only");
      }
    });
    const statSync = vi.fn(() => {
      const err = new Error("missing") as Error & { code?: string };
      err.code = "ENOENT";
      throw err;
    });
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredOpenClawTmpDir({ accessSync, statSync, tmpdir });

    expect(resolved).toBe(path.join("/var/fallback", "openclaw"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });
});
