<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import fs from "node:fs/promises";
<<<<<<< HEAD
<<<<<<< HEAD
import type { AddressInfo } from "node:net";
=======
=======
import type { AddressInfo } from "node:net";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { AddressInfo } from "node:net";
import fs from "node:fs/promises";
>>>>>>> ed11e93cf (chore(format))
=======
import fs from "node:fs/promises";
import type { AddressInfo } from "node:net";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { AddressInfo } from "node:net";
import fs from "node:fs/promises";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import fs from "node:fs/promises";
import type { AddressInfo } from "node:net";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import os from "node:os";
>>>>>>> 7e065d90f (perf(test): keep single media server and fast cleanup)
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let MEDIA_DIR = "";
const cleanOldMedia = vi.fn().mockResolvedValue(undefined);

vi.mock("./store.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./store.js")>();
  return {
    ...actual,
    getMediaDir: () => MEDIA_DIR,
    cleanOldMedia,
  };
});

const { startMediaServer } = await import("./server.js");
const { MEDIA_MAX_BYTES } = await import("./store.js");

async function waitForFileRemoval(filePath: string, maxTicks = 1000) {
  for (let tick = 0; tick < maxTicks; tick += 1) {
    try {
      await fs.stat(filePath);
    } catch {
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error(`timed out waiting for ${filePath} removal`);
}

describe("media server", () => {
  let server: Awaited<ReturnType<typeof startMediaServer>>;
  let port = 0;

  beforeAll(async () => {
    MEDIA_DIR = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-media-test-"));
    server = await startMediaServer(0, 1_000);
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise((r) => server.close(r));
    await fs.rm(MEDIA_DIR, { recursive: true, force: true });
    MEDIA_DIR = "";
  });

  it("serves media and cleans up after send", async () => {
    const file = path.join(MEDIA_DIR, "file1");
    await fs.writeFile(file, "hello");
<<<<<<< HEAD
    const server = await startMediaServer(0, 5_000);
    const port = (server.address() as AddressInfo).port;
    const res = await fetch(`http://localhost:${port}/media/file1`);
=======
    const res = await fetch(`http://127.0.0.1:${port}/media/file1`);
>>>>>>> 7e065d90f (perf(test): keep single media server and fast cleanup)
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hello");
    await waitForFileRemoval(file);
  });

  it("expires old media", async () => {
    const file = path.join(MEDIA_DIR, "old");
    await fs.writeFile(file, "stale");
    const past = Date.now() - 10_000;
    await fs.utimes(file, past / 1000, past / 1000);
<<<<<<< HEAD
    const server = await startMediaServer(0, 1_000);
    const port = (server.address() as AddressInfo).port;
    const res = await fetch(`http://localhost:${port}/media/old`);
=======
    const res = await fetch(`http://127.0.0.1:${port}/media/old`);
>>>>>>> 7e065d90f (perf(test): keep single media server and fast cleanup)
    expect(res.status).toBe(410);
    await expect(fs.stat(file)).rejects.toThrow();
  });

<<<<<<< HEAD
  it("blocks path traversal attempts", async () => {
    // URL-encoded "../" to bypass client-side path normalization
    const res = await fetch(`http://localhost:${port}/media/%2e%2e%2fpackage.json`);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("invalid path");
  });

  it("blocks symlink escaping outside media dir", async () => {
    const target = path.join(process.cwd(), "package.json"); // outside MEDIA_DIR
    const link = path.join(MEDIA_DIR, "link-out");
    await fs.symlink(target, link);

<<<<<<< HEAD
    const server = await startMediaServer(0, 5_000);
    const port = (server.address() as AddressInfo).port;
    const res = await fetch(`http://localhost:${port}/media/link-out`);
=======
    const res = await fetch(`http://127.0.0.1:${port}/media/link-out`);
>>>>>>> 7e065d90f (perf(test): keep single media server and fast cleanup)
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("invalid path");
  });

  it("rejects invalid media ids", async () => {
    const file = path.join(MEDIA_DIR, "file2");
    await fs.writeFile(file, "hello");
<<<<<<< HEAD
    const server = await startMediaServer(0, 5_000);
    const port = (server.address() as AddressInfo).port;
    const res = await fetch(`http://localhost:${port}/media/invalid%20id`);
=======
    const res = await fetch(`http://127.0.0.1:${port}/media/invalid%20id`);
>>>>>>> 7e065d90f (perf(test): keep single media server and fast cleanup)
=======
  it.each([
    {
      testName: "blocks path traversal attempts",
      mediaPath: "%2e%2e%2fpackage.json",
    },
    {
      testName: "rejects invalid media ids",
      mediaPath: "invalid%20id",
      setup: async () => {
        const file = path.join(MEDIA_DIR, "file2");
        await fs.writeFile(file, "hello");
      },
    },
    {
      testName: "blocks symlink escaping outside media dir",
      mediaPath: "link-out",
      setup: async () => {
        const target = path.join(process.cwd(), "package.json"); // outside MEDIA_DIR
        const link = path.join(MEDIA_DIR, "link-out");
        await fs.symlink(target, link);
      },
    },
  ] as const)("$testName", async (testCase) => {
    await testCase.setup?.();
    const res = await fetch(`http://127.0.0.1:${port}/media/${testCase.mediaPath}`);
>>>>>>> 20849df70 (test: merge media invalid-path scenarios)
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("invalid path");
  });

  it("rejects oversized media files", async () => {
    const file = path.join(MEDIA_DIR, "big");
    await fs.writeFile(file, "");
    await fs.truncate(file, MEDIA_MAX_BYTES + 1);
<<<<<<< HEAD
    const server = await startMediaServer(0, 5_000);
    const port = (server.address() as AddressInfo).port;
    const res = await fetch(`http://localhost:${port}/media/big`);
=======
    const res = await fetch(`http://127.0.0.1:${port}/media/big`);
>>>>>>> 7e065d90f (perf(test): keep single media server and fast cleanup)
    expect(res.status).toBe(413);
    expect(await res.text()).toBe("too large");
  });
});
