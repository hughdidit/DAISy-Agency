import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

import { getMemorySearchManager, type MemoryIndexManager } from "./index.js";

vi.mock("chokidar", () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(async () => undefined),
    })),
  },
}));

vi.mock("./embeddings.js", () => {
  return {
    createEmbeddingProvider: async () => ({
      requestedProvider: "openai",
      provider: {
        id: "mock",
        model: "mock-embed",
        embedQuery: async () => [0, 0, 0],
        embedBatch: async () => {
          throw new Error("openai embeddings failed: 400 bad request");
        },
      },
    }),
  };
});
=======
import type { MemoryIndexManager } from "./index.js";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { getEmbedBatchMock, resetEmbeddingMocks } from "./embedding.test-mocks.js";
=======
>>>>>>> ed11e93cf (chore(format))
import type { MemoryIndexManager } from "./index.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { OpenClawConfig } from "../config/config.js";
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 7b31e8fc5 (chore: Fix types in tests 36/N.)
import { getEmbedBatchMock, resetEmbeddingMocks } from "./embedding.test-mocks.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { MemoryIndexManager } from "./index.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { getEmbedBatchMock, resetEmbeddingMocks } from "./embedding.test-mocks.js";
import type { MemoryIndexManager } from "./index.js";
import { getRequiredMemoryIndexManager } from "./test-manager-helpers.js";
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)

describe("memory manager sync failures", () => {
  let workspaceDir: string;
  let indexPath: string;
  let manager: MemoryIndexManager | null = null;
  const embedBatch = getEmbedBatchMock();

  beforeEach(async () => {
    vi.useFakeTimers();
<<<<<<< HEAD
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-mem-"));
=======
    resetEmbeddingMocks();
    embedBatch.mockImplementation(async () => {
      throw new Error("openai embeddings failed: 400 bad request");
    });
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-mem-"));
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
    indexPath = path.join(workspaceDir, "index.sqlite");
    await fs.mkdir(path.join(workspaceDir, "memory"));
    await fs.writeFile(path.join(workspaceDir, "MEMORY.md"), "Hello");
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (manager) {
      await manager.close();
      manager = null;
    }
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  it("does not raise unhandledRejection when watch-triggered sync fails", async () => {
    const unhandled: unknown[] = [];
    const handler = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", handler);

    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai",
            model: "mock-embed",
            store: { path: indexPath },
            sync: { watch: true, watchDebounceMs: 1, onSessionStart: false, onSearch: false },
          },
        },
        list: [{ id: "main", default: true }],
      },
    } as OpenClawConfig;

    manager = await getRequiredMemoryIndexManager({ cfg, agentId: "main" });
    const syncSpy = vi.spyOn(manager, "sync");

    // Call the internal scheduler directly; it uses fire-and-forget sync.
    (manager as unknown as { scheduleWatchSync: () => void }).scheduleWatchSync();

    await vi.runOnlyPendingTimersAsync();
    const syncPromise = syncSpy.mock.results[0]?.value as Promise<void> | undefined;
    vi.useRealTimers();
    if (syncPromise) {
      await syncPromise.catch(() => undefined);
    }

    process.off("unhandledRejection", handler);
    expect(unhandled).toHaveLength(0);
  });
});
