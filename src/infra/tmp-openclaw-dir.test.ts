import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { POSIX_OPENCLAW_TMP_DIR, resolvePreferredOpenClawTmpDir } from "./tmp-openclaw-dir.js";

type TmpDirOptions = NonNullable<Parameters<typeof resolvePreferredOpenClawTmpDir>[0]>;

function fallbackTmp(uid = 501) {
  return path.join("/var/fallback", `openclaw-${uid}`);
}

function nodeErrorWithCode(code: string) {
  const err = new Error(code) as Error & { code?: string };
  err.code = code;
  return err;
}

function secureDirStat(uid = 501) {
  return {
    isDirectory: () => true,
    isSymbolicLink: () => false,
    uid,
    mode: 0o40700,
  };
}

function resolveWithMocks(params: {
  lstatSync: NonNullable<TmpDirOptions["lstatSync"]>;
  fallbackLstatSync?: NonNullable<TmpDirOptions["lstatSync"]>;
  accessSync?: NonNullable<TmpDirOptions["accessSync"]>;
  uid?: number;
  tmpdirPath?: string;
}) {
  const uid = params.uid ?? 501;
  const fallbackPath = fallbackTmp(uid);
  const accessSync = params.accessSync ?? vi.fn();
  const wrappedLstatSync = vi.fn((target: string) => {
    if (target === POSIX_OPENCLAW_TMP_DIR) {
      return params.lstatSync(target);
    }
    if (target === fallbackPath) {
      if (params.fallbackLstatSync) {
        return params.fallbackLstatSync(target);
      }
      return secureDirStat(uid);
    }
    return secureDirStat(uid);
  }) as NonNullable<TmpDirOptions["lstatSync"]>;
  const mkdirSync = vi.fn();
  const getuid = vi.fn(() => uid);
  const tmpdir = vi.fn(() => params.tmpdirPath ?? "/var/fallback");
  const resolved = resolvePreferredOpenClawTmpDir({
    accessSync,
    lstatSync: wrappedLstatSync,
    mkdirSync,
    getuid,
    tmpdir,
  });
  return { resolved, accessSync, lstatSync: wrappedLstatSync, mkdirSync, tmpdir };
}

describe("resolvePreferredOpenClawTmpDir", () => {
  it("prefers /tmp/openclaw when it already exists and is writable", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => ({
      isDirectory: () => true,
      isSymbolicLink: () => false,
      uid: 501,
      mode: 0o40700,
    }));
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredOpenClawTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(lstatSync).toHaveBeenCalledTimes(1);
    expect(accessSync).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(POSIX_OPENCLAW_TMP_DIR);
    expect(tmpdir).not.toHaveBeenCalled();
  });

  it("prefers /tmp/openclaw when it does not exist but /tmp is writable", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => {
      const err = new Error("missing") as Error & { code?: string };
      err.code = "ENOENT";
      throw err;
    });
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    // second lstat call (after mkdir) should succeed
    lstatSync.mockImplementationOnce(() => {
      const err = new Error("missing") as Error & { code?: string };
      err.code = "ENOENT";
      throw err;
    });
    lstatSync.mockImplementationOnce(() => ({
      isDirectory: () => true,
      isSymbolicLink: () => false,
      uid: 501,
      mode: 0o40700,
    }));

    const resolved = resolvePreferredOpenClawTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(POSIX_OPENCLAW_TMP_DIR);
    expect(accessSync).toHaveBeenCalledWith("/tmp", expect.any(Number));
    expect(mkdirSync).toHaveBeenCalledWith(POSIX_OPENCLAW_TMP_DIR, expect.any(Object));
    expect(tmpdir).not.toHaveBeenCalled();
  });

  it("falls back to os.tmpdir()/openclaw when /tmp/openclaw is not a directory", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => ({
      isDirectory: () => false,
      isSymbolicLink: () => false,
      uid: 501,
      mode: 0o100644,
    }));
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredOpenClawTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(path.join("/var/fallback", "openclaw-501"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });

  it("falls back to os.tmpdir()/openclaw when /tmp is not writable", () => {
    const accessSync = vi.fn((target: string) => {
      if (target === "/tmp") {
        throw new Error("read-only");
      }
    });
    const lstatSync = vi.fn(() => {
      throw nodeErrorWithCode("ENOENT");
    });
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredOpenClawTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(path.join("/var/fallback", "openclaw-501"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });

  it("falls back when /tmp/openclaw is a symlink", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => ({
      isDirectory: () => true,
      isSymbolicLink: () => true,
      uid: 501,
      mode: 0o120777,
    }));
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredOpenClawTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(path.join("/var/fallback", "openclaw-501"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });

  it("falls back when /tmp/openclaw is not owned by the current user", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => ({
      isDirectory: () => true,
      isSymbolicLink: () => false,
      uid: 0,
      mode: 0o40700,
    }));
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredOpenClawTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(path.join("/var/fallback", "openclaw-501"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });

  it("falls back when /tmp/openclaw is group/other writable", () => {
    const accessSync = vi.fn();
    const lstatSync = vi.fn(() => ({
      isDirectory: () => true,
      isSymbolicLink: () => false,
      uid: 501,
      mode: 0o40777,
    }));
    const mkdirSync = vi.fn();
    const getuid = vi.fn(() => 501);
    const tmpdir = vi.fn(() => "/var/fallback");

    const resolved = resolvePreferredOpenClawTmpDir({
      accessSync,
      lstatSync,
      mkdirSync,
      getuid,
      tmpdir,
    });

    expect(resolved).toBe(path.join("/var/fallback", "openclaw-501"));
    expect(tmpdir).toHaveBeenCalledTimes(1);
  });
});
