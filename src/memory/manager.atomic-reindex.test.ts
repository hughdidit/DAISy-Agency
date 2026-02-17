import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

=======
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
import { getMemorySearchManager, type MemoryIndexManager } from "./index.js";
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
import { getEmbedBatchMock, resetEmbeddingMocks } from "./embedding.test-mocks.js";
import type { MemoryIndexManager } from "./index.js";
import { getRequiredMemoryIndexManager } from "./test-manager-helpers.js";
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)

let shouldFail = false;

describe("memory manager atomic reindex", () => {
  let fixtureRoot = "";
  let caseId = 0;
  let workspaceDir: string;
  let indexPath: string;
  let manager: MemoryIndexManager | null = null;
  const embedBatch = getEmbedBatchMock();

  beforeAll(async () => {
    fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-mem-atomic-"));
  });

  beforeEach(async () => {
    vi.stubEnv("OPENCLAW_TEST_MEMORY_UNSAFE_REINDEX", "0");
    resetEmbeddingMocks();
    shouldFail = false;
<<<<<<< HEAD
<<<<<<< HEAD
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-mem-"));
=======
=======
    embedBatch.mockImplementation(async (texts: string[]) => {
      if (shouldFail) {
        throw new Error("embedding failure");
      }
      return texts.map((_, index) => [index + 1, 0, 0]);
    });
>>>>>>> 04892ee23 (refactor(core): dedupe shared config and runtime helpers)
    workspaceDir = path.join(fixtureRoot, `case-${caseId++}`);
    await fs.mkdir(workspaceDir, { recursive: true });
>>>>>>> 92f8c0fac (perf(test): speed up suites and reduce fs churn)
    indexPath = path.join(workspaceDir, "index.sqlite");
    await fs.mkdir(path.join(workspaceDir, "memory"));
    await fs.writeFile(path.join(workspaceDir, "MEMORY.md"), "Hello memory.");
  });

  afterEach(async () => {
    if (manager) {
      await manager.close();
      manager = null;
    }
  });

  afterAll(async () => {
    if (!fixtureRoot) {
      return;
    }
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  });

  it("keeps the prior index when a full reindex fails", async () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai",
            model: "mock-embed",
            store: { path: indexPath },
            cache: { enabled: false },
            // Perf: keep test indexes to a single chunk to reduce sqlite work.
            chunking: { tokens: 4000, overlap: 0 },
            sync: { watch: false, onSessionStart: false, onSearch: false },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };

    manager = await getRequiredMemoryIndexManager({ cfg, agentId: "main" });

    await manager.sync({ force: true });
    const beforeStatus = manager.status();
    expect(beforeStatus.chunks).toBeGreaterThan(0);

    shouldFail = true;
    await expect(manager.sync({ force: true })).rejects.toThrow("embedding failure");

    const afterStatus = manager.status();
    expect(afterStatus.chunks).toBeGreaterThan(0);
  });
});
