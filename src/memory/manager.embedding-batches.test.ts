import fs from "node:fs/promises";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

=======
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> e324cb5b9 (perf(test): reduce fixture churn in hot suites)
=======
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
>>>>>>> 9860d6fcc (perf(test): reuse managers in embedding batches suite)
=======
import { getEmbedBatchMock, resetEmbeddingMocks } from "./embedding.test-mocks.js";
>>>>>>> a7b655519 (refactor(test): share memory embedding mocks)
import { getMemorySearchManager, type MemoryIndexManager } from "./index.js";
=======
import { describe, expect, it, vi } from "vitest";
import { installEmbeddingManagerFixture } from "./embedding-manager.test-harness.js";
>>>>>>> 71c1d09f2 (refactor(test): share memory embedding fixture)

const fx = installEmbeddingManagerFixture({
  fixturePrefix: "openclaw-mem-",
  largeTokens: 1250,
  smallTokens: 200,
  createCfg: ({ workspaceDir, indexPath, tokens }) => ({
    agents: {
      defaults: {
        workspace: workspaceDir,
        memorySearch: {
          provider: "openai",
          model: "mock-embed",
          store: { path: indexPath, vector: { enabled: false } },
          chunking: { tokens, overlap: 0 },
          sync: { watch: false, onSessionStart: false, onSearch: false },
          query: { minScore: 0, hybrid: { enabled: false } },
        },
      },
      list: [{ id: "main", default: true }],
    },
  }),
});
const { embedBatch } = fx;

describe("memory embedding batches", () => {
<<<<<<< HEAD
  let fixtureRoot: string;
  let workspaceDir: string;
  let memoryDir: string;
  let indexPathLarge: string;
  let indexPathSmall: string;
  let managerLarge: MemoryIndexManager | null = null;
  let managerSmall: MemoryIndexManager | null = null;

<<<<<<< HEAD
<<<<<<< HEAD
  beforeAll(async () => {
    fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-mem-"));
  });

  afterAll(async () => {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  });

  beforeEach(async () => {
    embedBatch.mockClear();
    embedQuery.mockClear();
<<<<<<< HEAD
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "moltbot-mem-"));
=======
    workspaceDir = path.join(fixtureRoot, `case-${++caseId}`);
>>>>>>> e324cb5b9 (perf(test): reduce fixture churn in hot suites)
    indexPath = path.join(workspaceDir, "index.sqlite");
    await fs.mkdir(path.join(workspaceDir, "memory"), { recursive: true });
  });

  afterEach(async () => {
    if (manager) {
      await manager.close();
      manager = null;
    }
  });

  it("splits large files across multiple embedding batches", async () => {
    // Keep this small but above the embedding batch byte threshold (8k) so we
    // exercise multi-batch behavior without generating lots of chunks/DB rows.
    const line = "a".repeat(5000);
    const content = [line, line].join("\n");
    await fs.writeFile(path.join(workspaceDir, "memory", "2026-01-03.md"), content);

    const cfg = {
=======
=======
  function resetManagerForTest(manager: MemoryIndexManager | null) {
    if (!manager) {
      throw new Error("manager missing");
    }
    (manager as unknown as { resetIndex: () => void }).resetIndex();
    (manager as unknown as { dirty: boolean }).dirty = true;
  }

>>>>>>> bfbe12d9f (perf(test): reduce memory suite resets)
  function createCfg(params: { indexPath: string; tokens: number }) {
    return {
>>>>>>> 9860d6fcc (perf(test): reuse managers in embedding batches suite)
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai",
            model: "mock-embed",
            store: { path: params.indexPath, vector: { enabled: false } },
            chunking: { tokens: params.tokens, overlap: 0 },
            sync: { watch: false, onSessionStart: false, onSearch: false },
            query: { minScore: 0, hybrid: { enabled: false } },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };
  }

  beforeAll(async () => {
    fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-mem-"));
    workspaceDir = path.join(fixtureRoot, "workspace");
    memoryDir = path.join(workspaceDir, "memory");
    indexPathLarge = path.join(fixtureRoot, "index.large.sqlite");
    indexPathSmall = path.join(fixtureRoot, "index.small.sqlite");
    await fs.mkdir(memoryDir, { recursive: true });

    const large = await getMemorySearchManager({
      cfg: createCfg({ indexPath: indexPathLarge, tokens: 1250 }),
      agentId: "main",
    });
    expect(large.manager).not.toBeNull();
    if (!large.manager) {
      throw new Error("manager missing");
    }
    managerLarge = large.manager;

    const small = await getMemorySearchManager({
      cfg: createCfg({ indexPath: indexPathSmall, tokens: 200 }),
      agentId: "main",
    });
    expect(small.manager).not.toBeNull();
    if (!small.manager) {
      throw new Error("manager missing");
    }
    managerSmall = small.manager;
  });

  afterAll(async () => {
    if (managerLarge) {
      await managerLarge.close();
      managerLarge = null;
    }
    if (managerSmall) {
      await managerSmall.close();
      managerSmall = null;
    }
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  });

  beforeEach(async () => {
    resetEmbeddingMocks();

    await fs.rm(memoryDir, { recursive: true, force: true });
    await fs.mkdir(memoryDir, { recursive: true });
  });

=======
>>>>>>> 71c1d09f2 (refactor(test): share memory embedding fixture)
  it("splits large files across multiple embedding batches", async () => {
    const memoryDir = fx.getMemoryDir();
    const managerLarge = fx.getManagerLarge();
    // Keep this small but above the embedding batch byte threshold (8k) so we
    // exercise multi-batch behavior without generating lots of chunks/DB rows.
    const line = "a".repeat(4200);
    const content = [line, line].join("\n");
    await fs.writeFile(path.join(memoryDir, "2026-01-03.md"), content);
    const updates: Array<{ completed: number; total: number; label?: string }> = [];
    await managerLarge.sync({
      progress: (update) => {
        updates.push(update);
      },
    });

    const status = managerLarge.status();
    const totalTexts = embedBatch.mock.calls.reduce(
      (sum: number, call: unknown[]) => sum + ((call[0] as string[] | undefined)?.length ?? 0),
      0,
    );
    expect(totalTexts).toBe(status.chunks);
    expect(embedBatch.mock.calls.length).toBeGreaterThan(1);
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.some((update) => update.label?.includes("/"))).toBe(true);
    const last = updates[updates.length - 1];
    expect(last?.total).toBeGreaterThan(0);
    expect(last?.completed).toBe(last?.total);
  });

  it("keeps small files in a single embedding batch", async () => {
    const memoryDir = fx.getMemoryDir();
    const managerSmall = fx.getManagerSmall();
    const line = "b".repeat(120);
    const content = Array.from({ length: 4 }, () => line).join("\n");
    await fs.writeFile(path.join(memoryDir, "2026-01-04.md"), content);
    await managerSmall.sync({ reason: "test" });

    expect(embedBatch.mock.calls.length).toBe(1);
  });

  it("retries embeddings on transient rate limit and 5xx errors", async () => {
    const memoryDir = fx.getMemoryDir();
    const managerSmall = fx.getManagerSmall();
    const line = "d".repeat(120);
    const content = Array.from({ length: 4 }, () => line).join("\n");
    await fs.writeFile(path.join(memoryDir, "2026-01-06.md"), content);

    const transientErrors = [
      "openai embeddings failed: 429 rate limit",
      "openai embeddings failed: 502 Bad Gateway (cloudflare)",
    ];
    let calls = 0;
    embedBatch.mockImplementation(async (texts: string[]) => {
      calls += 1;
      const transient = transientErrors[calls - 1];
      if (transient) {
        throw new Error(transient);
      }
      return texts.map(() => [0, 1, 0]);
    });

    const realSetTimeout = setTimeout;
    const setTimeoutSpy = vi.spyOn(global, "setTimeout").mockImplementation(((
      handler: TimerHandler,
      timeout?: number,
      ...args: unknown[]
    ) => {
      const delay = typeof timeout === "number" ? timeout : 0;
      if (delay > 0 && delay <= 2000) {
        return realSetTimeout(handler, 0, ...args);
      }
      return realSetTimeout(handler, delay, ...args);
    }) as typeof setTimeout);
    try {
      await managerSmall.sync({ reason: "test" });
    } finally {
      setTimeoutSpy.mockRestore();
    }

    expect(calls).toBe(3);
  }, 10000);

  it("skips empty chunks so embeddings input stays valid", async () => {
    const memoryDir = fx.getMemoryDir();
    const managerSmall = fx.getManagerSmall();
    await fs.writeFile(path.join(memoryDir, "2026-01-07.md"), "\n\n\n");
    await managerSmall.sync({ reason: "test" });

    const inputs = embedBatch.mock.calls.flatMap((call: unknown[]) => (call[0] as string[]) ?? []);
    expect(inputs).not.toContain("");
  });
});
