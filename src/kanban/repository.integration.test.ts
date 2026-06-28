import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import net from "node:net";
import { MongoClient } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { KANBAN_DEFAULT_COLLECTIONS } from "./config.js";
import type { ResolvedKanbanConfig } from "./config.js";
import { createKanbanMongoClient, KanbanMongoRepository } from "./repository.js";

type MongoDockerRuntime = {
  containerName: string;
  uri: string;
};

const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const isLinux = process.platform === "linux";
const runsUnderRepoNodeTestRunner = process.env.VITEST_GROUP?.startsWith("unit") === true;

function dockerAvailable(): boolean {
  if (!runsUnderRepoNodeTestRunner || !isLinux) {
    return false;
  }
  try {
    execFileSync("docker", ["version", "--format", "{{.Server.Version}}"], {
      stdio: "ignore",
    });
    return true;
  } catch {
    if (isCI) {
      throw new Error("Docker is required for Kanban MongoDB integration tests in CI");
    }
    return false;
  }
}

const describeWithDocker = dockerAvailable() ? describe : describe.skip;

function docker(args: string[]): string {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findOpenPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("Unable to allocate an open local port"));
        }
      });
    });
  });
}

async function waitForMongo(uri: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1_000 });
    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      return;
    } catch (error) {
      lastError = error;
      await wait(1_000);
    } finally {
      await client.close().catch(() => undefined);
    }
  }
  throw new Error(`Timed out waiting for MongoDB: ${String(lastError)}`);
}

async function waitForPrimary(uri: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  let lastHello: unknown;
  while (Date.now() < deadline) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1_000 });
    try {
      await client.connect();
      const hello = await client.db("admin").command({ hello: 1 });
      lastHello = hello;
      if (hello.isWritablePrimary === true) {
        return;
      }
    } catch (error) {
      lastHello = error;
    } finally {
      await client.close().catch(() => undefined);
    }
    await wait(1_000);
  }
  throw new Error(`Timed out waiting for MongoDB replica-set primary: ${String(lastHello)}`);
}

async function startMongoReplicaSet(): Promise<MongoDockerRuntime> {
  const port = await findOpenPort();
  const containerName = `daisy-kanban-mongo-${randomUUID()}`;
  const directUri = `mongodb://127.0.0.1:${String(port)}/?directConnection=true`;
  const runtime = {
    containerName,
    uri: `mongodb://127.0.0.1:${String(port)}/?replicaSet=rs0`,
  };

  try {
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      containerName,
      "--network",
      "host",
      "mongo:7",
      "--replSet",
      "rs0",
      "--bind_ip_all",
      "--port",
      String(port),
      "--quiet",
    ]);

    await waitForMongo(directUri);

    const client = new MongoClient(directUri, { serverSelectionTimeoutMS: 2_000 });
    await client.connect();
    try {
      await client.db("admin").command({
        replSetInitiate: {
          _id: "rs0",
          members: [{ _id: 0, host: `127.0.0.1:${String(port)}` }],
        },
      });
    } catch (error) {
      const codeName = (error as { codeName?: string }).codeName;
      if (codeName !== "AlreadyInitialized") {
        throw error;
      }
    } finally {
      await client.close();
    }

    await waitForPrimary(runtime.uri);
    return runtime;
  } catch (error) {
    await stopMongo(runtime);
    throw error;
  }
}

async function stopMongo(runtime: MongoDockerRuntime | null): Promise<void> {
  if (!runtime) {
    return;
  }
  try {
    docker(["rm", "-f", runtime.containerName]);
  } catch {
    // Best-effort cleanup. Docker --rm removes the container if it exits first.
  }
}

function buildConfig(runtime: MongoDockerRuntime): ResolvedKanbanConfig {
  return {
    enabled: true,
    uri: runtime.uri,
    redactedUri: runtime.uri,
    database: `daisy_kanban_test_${randomUUID().replaceAll("-", "")}`,
    collections: KANBAN_DEFAULT_COLLECTIONS,
    board: {
      slug: "team-agents",
      title: "Team Agents",
    },
  };
}

describeWithDocker("KanbanMongoRepository MongoDB integration", () => {
  let runtime: MongoDockerRuntime | null = null;
  let client: MongoClient | null = null;
  let repository: KanbanMongoRepository | null = null;
  let config: ResolvedKanbanConfig | undefined;

  beforeAll(async () => {
    runtime = await startMongoReplicaSet();
    config = buildConfig(runtime);
    client = await createKanbanMongoClient(config);
    repository = new KanbanMongoRepository(client, config);
  }, 240_000);

  afterAll(async () => {
    try {
      if (client && config) {
        await client
          .db(config.database)
          .dropDatabase()
          .catch(() => undefined);
      }
      await repository?.close();
    } finally {
      await stopMongo(runtime);
    }
  }, 120_000);

  it("persists cards, audit activity, optimistic versions, archive state, and cursor pages", async () => {
    const testConfig = requireValue(config, "Kanban integration config was not initialized");
    if (!client || !repository) {
      throw new Error("Kanban integration repository was not initialized");
    }

    await repository.ensureIndexes();
    const indexes = await client
      .db(testConfig.database)
      .collection(testConfig.collections.cards)
      .indexes();
    expect(indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining([
        "kanban_cards_board_lane_position",
        "kanban_cards_codex_pickup",
        "kanban_cards_import_source_card_unique",
      ]),
    );

    const audit = {
      actor: { type: "system" as const, id: "kanban-integration" },
      correlationId: "kanban-integration",
      occurredAt: new Date("2026-01-02T03:04:05.000Z"),
    };

    const board = await repository.bootstrapDefaultBoard(audit);
    expect(board).toMatchObject({ id: "team-agents", title: "Team Agents" });

    const created = await repository.createCard(
      {
        id: "integration-card-1",
        boardId: board.id,
        title: "Repository integration card",
        description: "Needs persistence coverage",
        assignee: "agent-old",
        priority: "urgent",
        readyForCodex: true,
      },
      audit,
    );
    expect(created.card).toMatchObject({
      id: "integration-card-1",
      lane: "todo",
      priority: "urgent",
      version: 1,
      readyForCodex: true,
    });
    expect(created.activity).toMatchObject({
      action: "card_create",
      cardId: "integration-card-1",
      createdAt: created.card.createdAt,
    });

    const picked = await repository.pickNextCodexCard(
      { boardId: board.id },
      {
        actor: { type: "agent" as const, id: "codex", name: "Codex" },
        correlationId: "kanban-pickup",
      },
    );
    expect(picked?.card).toMatchObject({
      id: "integration-card-1",
      assignee: "codex",
      lane: "in_progress",
      readyForCodex: false,
      version: 2,
    });
    expect(picked?.activity.action).toBe("card_pickup");

    await expect(
      repository.updateCard(
        {
          boardId: board.id,
          cardId: "integration-card-1",
          expectedVersion: 1,
          updates: { title: "Stale overwrite" },
        },
        audit,
      ),
    ).resolves.toBeNull();

    const updated = await repository.updateCard(
      {
        boardId: board.id,
        cardId: "integration-card-1",
        expectedVersion: 2,
        updates: {
          description: null,
          assignee: null,
          reviewer: "human-reviewer",
        },
      },
      audit,
    );
    expect(updated?.card).toMatchObject({
      id: "integration-card-1",
      reviewer: "human-reviewer",
      version: 3,
    });
    expect(updated?.card.description).toBeUndefined();
    expect(updated?.card.assignee).toBeUndefined();

    const moved = await repository.moveCard(
      {
        boardId: board.id,
        cardId: "integration-card-1",
        expectedVersion: 3,
        lane: "review",
        position: 10,
      },
      audit,
    );
    expect(moved?.card).toMatchObject({ lane: "review", position: 10, version: 4 });

    const archived = await repository.archiveCard(
      {
        boardId: board.id,
        cardId: "integration-card-1",
        expectedVersion: 4,
      },
      audit,
    );
    expect(archived?.card.version).toBe(5);
    expect(archived?.card.archivedAt).toBeInstanceOf(Date);
    await expect(repository.getCard(board.id, "integration-card-1")).resolves.toBeNull();

    const archivedCards = await repository.listCards({
      boardId: board.id,
      includeArchived: true,
      limit: 10,
    });
    expect(archivedCards.map((card) => card.id)).toContain("integration-card-1");

    const pageCardInputs = [1, 2, 3].map((position) => ({
      id: `page-card-${String(position)}`,
      boardId: board.id,
      title: `Page card ${String(position)}`,
      position,
    }));
    for (const input of pageCardInputs) {
      await repository.createCard(input, audit);
    }
    const firstPage = await repository.listCards({ boardId: board.id, lane: "todo", limit: 2 });
    expect(firstPage.map((card) => card.id)).toEqual(["page-card-1", "page-card-2"]);
    const cursorCard = requireValue(firstPage.at(1), "Expected cursor card for second page");
    const secondPage = await repository.listCards({
      boardId: board.id,
      lane: "todo",
      limit: 2,
      after: {
        lane: cursorCard.lane,
        position: cursorCard.position,
        createdAt: cursorCard.createdAt,
        cardId: cursorCard.id,
      },
    });
    expect(secondPage.map((card) => card.id)).toEqual(["page-card-3"]);

    const activity = await repository.listActivity({
      boardId: board.id,
      cardId: "integration-card-1",
      limit: 20,
    });
    expect(activity.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        "card_create",
        "card_pickup",
        "card_update",
        "card_move",
        "card_archive",
      ]),
    );
  }, 240_000);
});
