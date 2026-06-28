import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import net from "node:net";
import { MongoClient } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../../config/config.js";
import { KANBAN_DEFAULT_COLLECTIONS, type ResolvedKanbanConfig } from "../../kanban/config.js";
import { createKanbanMongoClient, KanbanMongoRepository } from "../../kanban/repository.js";
import type {
  KanbanCardMutationResult,
  KanbanCardsGetResult,
  KanbanCardsListResult,
  KanbanCodexPickNextResult,
} from "../protocol/schema/types.js";
import { listGatewayMethods } from "../server-methods-list.js";
import { createKanbanHandlers, KANBAN_METHOD_NAMES } from "./kanban.js";
import type { GatewayRequestHandlers, RespondFn } from "./types.js";

type MongoDockerRuntime = {
  containerName: string;
  uri: string;
};

type CapturedResponse = {
  ok: boolean;
  payload?: unknown;
  error?: unknown;
  meta?: Record<string, unknown>;
};

const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const isLinux = process.platform === "linux";
const vitestGroup = process.env.VITEST_GROUP ?? "";
const runsUnderRepoNodeTestRunner = vitestGroup.startsWith("unit") || vitestGroup === "gateway";

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
      throw new Error("Docker is required for Kanban gateway integration tests in CI");
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

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
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
  const containerName = `daisy-kanban-gateway-mongo-${randomUUID()}`;
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
    database: `daisy_kanban_gateway_test_${randomUUID().replaceAll("-", "")}`,
    collections: KANBAN_DEFAULT_COLLECTIONS,
    board: {
      slug: "team-agents",
      title: "Team Agents",
    },
  };
}

function envForConfig(config: ResolvedKanbanConfig): Record<string, string> {
  return {
    KANBAN_MONGODB_URI: config.uri,
    KANBAN_MONGODB_DATABASE: config.database,
    KANBAN_BOARD_SLUG: config.board.slug,
    KANBAN_BOARD_TITLE: config.board.title,
  };
}

async function invoke(
  handlers: GatewayRequestHandlers,
  method: string,
  params: Record<string, unknown>,
): Promise<CapturedResponse> {
  const responses: CapturedResponse[] = [];
  const respond: RespondFn = (ok, payload, error, meta) => {
    responses.push({ ok, payload, error, meta });
  };
  const handler = handlers[method];
  if (!handler) {
    throw new Error(`Missing handler for ${method}`);
  }
  await handler({
    req: { id: `${method}-test`, type: "req", method },
    params,
    respond,
    context: {} as never,
    client: null,
    isWebchatConnect: () => false,
  });
  expect(responses, `${method} should respond exactly once`).toHaveLength(1);
  return requireValue(responses.at(0), `Expected response for ${method}`);
}

describe("Kanban gateway read handlers", () => {
  it("reports unavailable status without a configured MongoDB URI", async () => {
    const handlers = createKanbanHandlers({
      loadConfig: () => ({}) as OpenClawConfig,
      env: {},
    });

    const response = await invoke(handlers, "kanban.status", {});

    expect(response.ok).toBe(true);
    expect(response.payload).toMatchObject({
      ok: false,
      available: false,
      enabled: true,
      reason: "missing-uri",
    });
  });

  it("exposes only the implemented Kanban methods through gateway discovery", () => {
    const methods = listGatewayMethods();
    expect(methods).toEqual(expect.arrayContaining(KANBAN_METHOD_NAMES));
    expect(methods.filter((method) => method.startsWith("kanban.")).toSorted()).toEqual(
      [...KANBAN_METHOD_NAMES].toSorted(),
    );
  });

  it("rejects blank write text before opening storage", async () => {
    const handlers = createKanbanHandlers({
      loadConfig: () => ({}) as OpenClawConfig,
      env: {},
    });

    await expect(invoke(handlers, "kanban.cards.create", { title: "   " })).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Kanban card title must not be blank" },
    });
    await expect(
      invoke(handlers, "kanban.cards.update", {
        cardId: "card-1",
        expectedVersion: 1,
        updates: { title: "   " },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Kanban card title must not be blank" },
    });
    await expect(
      invoke(handlers, "kanban.cards.comment", { cardId: "card-1", body: "   " }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Kanban comment body must not be blank" },
    });
    await expect(
      invoke(handlers, "kanban.codex.handoff", {
        cardId: "card-1",
        expectedVersion: 1,
        summary: "   ",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Kanban handoff summary must not be blank" },
    });
    await expect(
      invoke(handlers, "kanban.codex.complete", {
        cardId: "card-1",
        expectedVersion: 1,
        summary: "   ",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Kanban completion summary must not be blank" },
    });
  });
});

describeWithDocker("Kanban gateway read handlers with MongoDB", () => {
  let runtime: MongoDockerRuntime | null = null;
  let client: MongoClient | null = null;
  let repository: KanbanMongoRepository | null = null;
  let config: ResolvedKanbanConfig | undefined;
  let handlers: GatewayRequestHandlers | undefined;

  beforeAll(async () => {
    runtime = await startMongoReplicaSet();
    config = buildConfig(runtime);
    client = await createKanbanMongoClient(config);
    repository = new KanbanMongoRepository(client, config);
    handlers = createKanbanHandlers({
      loadConfig: () => ({}) as OpenClawConfig,
      env: envForConfig(config),
    });
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

  it("returns status, board, card list, card details, and activity from real storage", async () => {
    const testConfig = requireValue(config, "Kanban gateway config was not initialized");
    const testRepository = requireValue(
      repository,
      "Kanban gateway repository was not initialized",
    );
    const testHandlers = requireValue(handlers, "Kanban gateway handlers were not initialized");

    const status = await invoke(testHandlers, "kanban.status", {});
    expect(status.ok).toBe(true);
    expect(status.payload).toMatchObject({
      ok: true,
      available: true,
      enabled: true,
      boardId: "team-agents",
    });

    const boardResponse = await invoke(testHandlers, "kanban.board.get", {});
    expect(boardResponse.ok).toBe(false);
    expect(boardResponse.error).toMatchObject({
      code: "UNAVAILABLE",
      message: "Kanban board is not initialized.",
    });

    await testRepository.bootstrapDefaultBoard({
      actor: { type: "system" as const, id: "kanban-gateway-test" },
      correlationId: "kanban-gateway-bootstrap",
    });

    const initializedBoardResponse = await invoke(testHandlers, "kanban.board.get", {});
    expect(initializedBoardResponse.ok).toBe(true);
    expect(initializedBoardResponse.payload).toMatchObject({
      board: {
        id: "team-agents",
        title: "Team Agents",
        lanes: [
          { id: "todo", title: "To Do", position: 0 },
          { id: "in_progress", title: "In Progress", position: 1 },
          { id: "review", title: "Review", position: 2 },
          { id: "done", title: "Done", position: 3 },
        ],
      },
    });

    const audit = {
      actor: { type: "api" as const, id: "kanban-gateway-test" },
      correlationId: "kanban-gateway-test",
      occurredAt: new Date("2026-02-03T04:05:06.000Z"),
    };
    await testRepository.createCard(
      {
        id: "gateway-card-1",
        boardId: testConfig.board.slug,
        title: "Gateway card",
        description: "Read handler coverage",
        assignee: "codex",
        priority: "high",
        readyForCodex: true,
      },
      audit,
    );
    await testRepository.createCard(
      {
        id: "gateway-card-2",
        boardId: testConfig.board.slug,
        title: "Other assignee card",
        assignee: "human",
        readyForCodex: true,
      },
      audit,
    );

    const listResponse = await invoke(testHandlers, "kanban.cards.list", {
      assignee: "codex",
      readyForCodex: true,
    });
    expect(listResponse.ok).toBe(true);
    const listedCards = (listResponse.payload as KanbanCardsListResult).cards;
    expect(listedCards.map((card) => card.id)).toEqual(["gateway-card-1"]);
    expect(listedCards[0]).toMatchObject({
      title: "Gateway card",
      priority: "high",
      assignee: "codex",
      readyForCodex: true,
    });

    const getResponse = await invoke(testHandlers, "kanban.cards.get", {
      cardId: "gateway-card-1",
    });
    expect(getResponse.ok).toBe(true);
    expect((getResponse.payload as KanbanCardsGetResult).card).toMatchObject({
      id: "gateway-card-1",
      description: "Read handler coverage",
      lane: "todo",
      version: 1,
    });

    const activityResponse = await invoke(testHandlers, "kanban.activity.list", {
      cardId: "gateway-card-1",
    });
    expect(activityResponse.ok).toBe(true);
    expect(activityResponse.payload).toMatchObject({
      activity: [
        {
          cardId: "gateway-card-1",
          action: "card_create",
          summary: "Created Gateway card",
          correlationId: "kanban-gateway-test",
        },
      ],
    });
    const [activityCursor] = (
      activityResponse.payload as {
        activity: Array<{ id: string; createdAt: string }>;
      }
    ).activity;
    const cursor = requireValue(activityCursor, "Expected activity cursor");
    const nextActivityPage = await invoke(testHandlers, "kanban.activity.list", {
      cardId: "gateway-card-1",
      before: cursor.createdAt,
      beforeId: cursor.id,
    });
    expect(nextActivityPage).toMatchObject({
      ok: true,
      payload: { activity: [] },
    });
  }, 240_000);

  it("creates, updates, comments, moves, archives, and completes Codex cards through handlers", async () => {
    const testRepository = requireValue(
      repository,
      "Kanban gateway repository was not initialized",
    );
    const testHandlers = requireValue(handlers, "Kanban gateway handlers were not initialized");

    await testRepository.bootstrapDefaultBoard({
      actor: { type: "system" as const, id: "kanban-gateway-write-test" },
      correlationId: "kanban-gateway-write-bootstrap",
    });

    const createResponse = await invoke(testHandlers, "kanban.cards.create", {
      title: "Write handler card",
      description: "Initial body",
      priority: "urgent",
      readyForCodex: true,
      labels: ["gateway"],
      links: ["https://example.invalid/card"],
      watchers: ["codex"],
      customFields: { source: "integration" },
    });
    expect(createResponse.ok).toBe(true);
    const created = createResponse.payload as KanbanCardMutationResult;
    expect(created.activity).toMatchObject({
      action: "card_create",
      summary: "Created Write handler card",
      actor: { type: "api", id: "kanban-gateway" },
      correlationId: "kanban.cards.create-test",
    });
    expect(created.card).toMatchObject({
      title: "Write handler card",
      lane: "todo",
      priority: "urgent",
      readyForCodex: true,
      version: 1,
    });

    const updateResponse = await invoke(testHandlers, "kanban.cards.update", {
      cardId: created.card.id,
      expectedVersion: created.card.version,
      updates: {
        title: "Updated write handler card",
        description: null,
        priority: "high",
        readyForCodex: true,
      },
    });
    expect(updateResponse.ok).toBe(true);
    const updated = updateResponse.payload as KanbanCardMutationResult;
    expect(updated.activity.action).toBe("card_update");
    expect(updated.card).toMatchObject({
      title: "Updated write handler card",
      priority: "high",
      version: 2,
    });
    expect(updated.card.description).toBeUndefined();

    const commentResponse = await invoke(testHandlers, "kanban.cards.comment", {
      cardId: updated.card.id,
      body: "Ready for movement",
    });
    expect(commentResponse.ok).toBe(true);
    const commented = commentResponse.payload as KanbanCardMutationResult;
    expect(commented.activity).toMatchObject({
      action: "card_comment",
      summary: "Commented on Updated write handler card",
    });
    expect(commented.card.comments).toHaveLength(1);
    expect(commented.card.version).toBe(3);

    const moveResponse = await invoke(testHandlers, "kanban.cards.move", {
      cardId: commented.card.id,
      expectedVersion: commented.card.version,
      lane: "review",
      position: 42,
    });
    expect(moveResponse.ok).toBe(true);
    const moved = moveResponse.payload as KanbanCardMutationResult;
    expect(moved.activity).toMatchObject({
      action: "card_move",
      data: { lane: "review", position: 42 },
    });
    expect(moved.card).toMatchObject({
      lane: "review",
      position: 42,
      version: 4,
    });

    const archiveCreateResponse = await invoke(testHandlers, "kanban.cards.create", {
      title: "Archive handler card",
    });
    const archiveCreated = archiveCreateResponse.payload as KanbanCardMutationResult;
    const archiveResponse = await invoke(testHandlers, "kanban.cards.archive", {
      cardId: archiveCreated.card.id,
      expectedVersion: archiveCreated.card.version,
    });
    expect(archiveResponse.ok).toBe(true);
    const archived = archiveResponse.payload as KanbanCardMutationResult;
    expect(archived.activity.action).toBe("card_archive");
    expect(archived.card.archivedAt).toEqual(expect.any(String));

    const codexCreateResponse = await invoke(testHandlers, "kanban.cards.create", {
      title: "Codex pickup card",
      priority: "urgent",
      readyForCodex: true,
    });
    const codexCreated = codexCreateResponse.payload as KanbanCardMutationResult;
    const pickResponse = await invoke(testHandlers, "kanban.codex.pickNext", {
      agentId: "codex-agent",
      agentName: "Codex Agent",
    });
    expect(pickResponse.ok).toBe(true);
    const picked = pickResponse.payload as KanbanCodexPickNextResult;
    expect(picked.card).toMatchObject({
      id: codexCreated.card.id,
      lane: "in_progress",
      assignee: "codex-agent",
      readyForCodex: false,
      version: 2,
    });
    expect(picked.activity).toMatchObject({
      action: "card_pickup",
      actor: { type: "agent", id: "codex-agent", name: "Codex Agent" },
    });

    const handoffResponse = await invoke(testHandlers, "kanban.codex.handoff", {
      cardId: requireValue(picked.card, "Expected picked card").id,
      expectedVersion: requireValue(picked.card, "Expected picked card").version,
      summary: "Needs human review",
      reviewer: "ops-reviewer",
    });
    expect(handoffResponse.ok).toBe(true);
    const handedOff = handoffResponse.payload as KanbanCardMutationResult;
    expect(handedOff.activity).toMatchObject({
      action: "card_handoff",
      summary: "Needs human review",
    });
    expect(handedOff.card).toMatchObject({
      lane: "review",
      reviewer: "ops-reviewer",
      version: 3,
    });

    const completeResponse = await invoke(testHandlers, "kanban.codex.complete", {
      cardId: handedOff.card.id,
      expectedVersion: handedOff.card.version,
      summary: "Completed by Codex",
    });
    expect(completeResponse.ok).toBe(true);
    const completed = completeResponse.payload as KanbanCardMutationResult;
    expect(completed.activity).toMatchObject({
      action: "card_complete",
      summary: "Completed by Codex",
    });
    expect(completed.card).toMatchObject({
      lane: "done",
      readyForCodex: false,
      version: 4,
    });
  }, 240_000);
});
