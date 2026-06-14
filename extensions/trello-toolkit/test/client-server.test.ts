import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createTrelloClient, TrelloClientError } from "../src/client.js";

type RecordedRequest = {
  method: string;
  url: string;
  body: string;
};

const servers: Array<{ close: () => Promise<void> }> = [];

async function startServer(
  handler: (req: IncomingMessage, res: ServerResponse, body: string) => void,
) {
  const requests: RecordedRequest[] = [];
  const server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push({ method: req.method ?? "GET", url: req.url ?? "/", body });
      handler(req, res, body);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  const close = () => new Promise<void>((resolve) => server.close(() => resolve()));
  servers.push({ close });
  return { baseUrl: `http://127.0.0.1:${address.port}/1`, requests };
}

afterEach(async () => {
  while (servers.length > 0) {
    await servers.pop()?.close();
  }
});

describe("trello client", () => {
  it("adds credentials internally and normalizes board responses", async () => {
    const server = await startServer((_req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify([{ id: "board-1", name: "Ops", closed: false, url: "https://t/1" }]));
    });
    const client = createTrelloClient({
      apiKey: "secret-key",
      token: "secret-token",
      baseUrl: server.baseUrl,
    });

    await expect(client.listBoards()).resolves.toEqual([
      { id: "board-1", name: "Ops", closed: false, url: "https://t/1" },
    ]);
    expect(server.requests[0]?.url).toContain("key=secret-key");
    expect(server.requests[0]?.url).toContain("token=secret-token");
    expect(decodeURIComponent(server.requests[0]?.url ?? "")).toContain(
      "fields=name,id,closed,url",
    );
  });

  it("maps Trello errors without leaking credentials", async () => {
    const server = await startServer((_req, res) => {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ message: "invalid token secret-token" }));
    });
    const client = createTrelloClient({
      apiKey: "secret-key",
      token: "secret-token",
      baseUrl: server.baseUrl,
    });

    await expect(client.listBoards()).rejects.toMatchObject({
      code: "AUTH_ERROR",
      status: 401,
    });
    await client.listBoards().catch((error: unknown) => {
      expect(error).toBeInstanceOf(TrelloClientError);
      expect(String(error)).not.toContain("secret-token");
      expect(JSON.stringify((error as TrelloClientError).details)).not.toContain("secret-key");
    });
  });

  it("maps non-JSON HTTP failures to status-specific errors", async () => {
    const server = await startServer((_req, res) => {
      res.statusCode = 401;
      res.statusMessage = "Unauthorized";
      res.setHeader("content-type", "text/plain");
      res.end("invalid token secret-token");
    });
    const client = createTrelloClient({
      apiKey: "secret-key",
      token: "secret-token",
      baseUrl: server.baseUrl,
    });

    await client.listBoards().catch((error: unknown) => {
      expect(error).toBeInstanceOf(TrelloClientError);
      expect(error).toMatchObject({ code: "AUTH_ERROR", status: 401 });
      expect(JSON.stringify((error as TrelloClientError).details)).not.toContain("secret-token");
    });
  });

  it("creates, moves, comments, and archives cards through Trello endpoints", async () => {
    const server = await startServer((req, res, body) => {
      res.setHeader("content-type", "application/json");
      if (req.method === "POST" && req.url?.startsWith("/1/cards?")) {
        res.end(JSON.stringify({ id: "card-1", name: "New card", idList: "list-1" }));
        return;
      }
      if (req.method === "PUT" && req.url?.startsWith("/1/cards/card-1?")) {
        const form = new URLSearchParams(body);
        res.end(
          JSON.stringify({
            id: "card-1",
            idList: form.get("idList") ?? "list-2",
            closed: form.get("closed") === "true",
          }),
        );
        return;
      }
      if (req.method === "POST" && req.url?.startsWith("/1/cards/card-1/actions/comments?")) {
        res.end(JSON.stringify({ id: "comment-1", type: "commentCard" }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ message: "not found" }));
    });
    const client = createTrelloClient({
      apiKey: "secret-key",
      token: "secret-token",
      baseUrl: server.baseUrl,
    });

    await expect(
      client.createCard({ listId: "list-1", name: "New card", desc: "Details" }),
    ).resolves.toMatchObject({
      id: "card-1",
      name: "New card",
    });
    await expect(
      client.moveCard({ cardId: "card-1", targetListId: "list-2" }),
    ).resolves.toMatchObject({
      id: "card-1",
      idList: "list-2",
    });
    await expect(client.addComment({ cardId: "card-1", text: "Done" })).resolves.toMatchObject({
      id: "comment-1",
    });
    await expect(client.archiveCard({ cardId: "card-1" })).resolves.toMatchObject({
      id: "card-1",
      closed: true,
    });
  });
});
