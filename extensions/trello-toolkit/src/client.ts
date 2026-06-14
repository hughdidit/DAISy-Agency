import type { TrelloBoard, TrelloCard, TrelloList, TrelloResultCode } from "./types.js";

type RequestMethod = "GET" | "POST" | "PUT";

export class TrelloClientError extends Error {
  readonly code: TrelloResultCode;
  readonly status?: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: TrelloResultCode,
    message: string,
    params: { status?: number; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = "TrelloClientError";
    this.code = code;
    this.status = params.status;
    this.details = params.details;
  }
}

function redactSecrets(value: string, secrets: string[]) {
  let result = value;
  for (const secret of secrets) {
    if (secret) {
      result = result.split(secret).join("[REDACTED]");
    }
  }
  return result;
}

function mapStatusToCode(status: number): TrelloResultCode {
  if (status === 401 || status === 403) {
    return "AUTH_ERROR";
  }
  if (status === 429) {
    return "RATE_LIMIT";
  }
  return "TRELLO_ERROR";
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeBoard(value: unknown): TrelloBoard {
  const obj = normalizeRecord(value);
  return {
    id: String(obj.id ?? ""),
    ...(typeof obj.name === "string" ? { name: obj.name } : {}),
    ...(typeof obj.closed === "boolean" ? { closed: obj.closed } : {}),
    ...(typeof obj.url === "string" ? { url: obj.url } : {}),
  };
}

function normalizeList(value: unknown): TrelloList {
  const obj = normalizeRecord(value);
  return {
    id: String(obj.id ?? ""),
    ...(typeof obj.name === "string" ? { name: obj.name } : {}),
    ...(typeof obj.closed === "boolean" ? { closed: obj.closed } : {}),
    ...(typeof obj.idBoard === "string" ? { idBoard: obj.idBoard } : {}),
  };
}

function normalizeCard(value: unknown): TrelloCard {
  const obj = normalizeRecord(value);
  return {
    id: String(obj.id ?? ""),
    ...(typeof obj.name === "string" ? { name: obj.name } : {}),
    ...(typeof obj.desc === "string" ? { desc: obj.desc } : {}),
    ...(typeof obj.closed === "boolean" ? { closed: obj.closed } : {}),
    ...(typeof obj.idBoard === "string" ? { idBoard: obj.idBoard } : {}),
    ...(typeof obj.idList === "string" ? { idList: obj.idList } : {}),
    ...(typeof obj.shortUrl === "string" ? { shortUrl: obj.shortUrl } : {}),
    ...(typeof obj.url === "string" ? { url: obj.url } : {}),
  };
}

async function readLimitedResponseBytes(
  response: Response,
  maxResponseBytes: number,
): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxResponseBytes) {
    throw new TrelloClientError("RESPONSE_TOO_LARGE", "Trello response exceeded size limit", {
      status: response.status,
      details: { maxResponseBytes },
    });
  }
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxResponseBytes) {
      throw new TrelloClientError("RESPONSE_TOO_LARGE", "Trello response exceeded size limit", {
        status: response.status,
        details: { maxResponseBytes },
      });
    }
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maxResponseBytes) {
        await reader.cancel();
        throw new TrelloClientError("RESPONSE_TOO_LARGE", "Trello response exceeded size limit", {
          status: response.status,
          details: { maxResponseBytes },
        });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function createTrelloClient(params: {
  apiKey: string;
  token: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
  fetchImpl?: typeof fetch;
}) {
  const baseUrl = params.baseUrl ?? "https://api.trello.com/1";
  const timeoutMs = params.timeoutMs ?? 15000;
  const maxResponseBytes = params.maxResponseBytes ?? 262144;
  const fetchImpl = params.fetchImpl ?? fetch;
  const secrets = [params.apiKey, params.token];

  async function requestJson<T>(
    method: RequestMethod,
    path: string,
    query: Record<string, string | number | boolean | undefined> | undefined = {},
    body?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = new URL(`${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`);
      url.searchParams.set("key", params.apiKey);
      url.searchParams.set("token", params.token);
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
      const init: RequestInit = { method, signal: controller.signal };
      if (body) {
        init.headers = { "content-type": "application/x-www-form-urlencoded" };
        const form = new URLSearchParams();
        for (const [key, value] of Object.entries(body)) {
          if (value !== undefined) {
            form.set(key, String(value));
          }
        }
        init.body = form;
      }
      const response = await fetchImpl(url, init);
      const bytes = await readLimitedResponseBytes(response, maxResponseBytes);
      const text = Buffer.from(bytes).toString("utf8");
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        if (!response.ok) {
          throw new TrelloClientError(
            mapStatusToCode(response.status),
            response.statusText || `HTTP ${response.status}`,
            {
              status: response.status,
              details: { body: redactSecrets(text.slice(0, 500), secrets) },
            },
          );
        }
        throw new TrelloClientError("NON_JSON_OUTPUT", "Trello returned non-JSON output", {
          status: response.status,
          details: { body: redactSecrets(text.slice(0, 500), secrets) },
        });
      }
      if (!response.ok) {
        const record = normalizeRecord(parsed);
        const message = typeof record.message === "string" ? record.message : response.statusText;
        throw new TrelloClientError(
          mapStatusToCode(response.status),
          redactSecrets(message, secrets),
          {
            status: response.status,
            details: { status: response.status },
          },
        );
      }
      return parsed as T;
    } catch (error) {
      if (error instanceof TrelloClientError) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new TrelloClientError("EXEC_TIMEOUT", "Trello request timed out");
      }
      throw new TrelloClientError("NETWORK_ERROR", "Trello request failed", {
        details: {
          cause: error instanceof Error ? redactSecrets(error.message, secrets) : String(error),
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async listBoards() {
      const boards = await requestJson<unknown[]>("GET", "members/me/boards", {
        fields: "name,id,closed,url",
      });
      return boards.map(normalizeBoard).filter((board) => board.id);
    },
    async listLists(boardId: string) {
      const lists = await requestJson<unknown[]>(
        "GET",
        `boards/${encodeURIComponent(boardId)}/lists`,
        {
          fields: "name,id,closed,idBoard",
        },
      );
      return lists.map(normalizeList).filter((list) => list.id);
    },
    async listCards(listId: string) {
      const cards = await requestJson<unknown[]>(
        "GET",
        `lists/${encodeURIComponent(listId)}/cards`,
        {
          fields: "name,id,desc,closed,idBoard,idList,shortUrl,url",
        },
      );
      return cards.map(normalizeCard).filter((card) => card.id);
    },
    async getList(listId: string) {
      return normalizeList(
        await requestJson("GET", `lists/${encodeURIComponent(listId)}`, {
          fields: "name,id,closed,idBoard",
        }),
      );
    },
    async getCard(cardId: string) {
      return normalizeCard(
        await requestJson("GET", `cards/${encodeURIComponent(cardId)}`, {
          fields: "name,id,desc,closed,idBoard,idList,shortUrl,url",
        }),
      );
    },
    async getMember() {
      return await requestJson("GET", "members/me", { fields: "id,username,fullName" });
    },
    async createCard(input: { listId: string; name: string; desc?: string }) {
      return normalizeCard(
        await requestJson("POST", "cards", undefined, {
          idList: input.listId,
          name: input.name,
          desc: input.desc,
        }),
      );
    },
    async moveCard(input: { cardId: string; targetListId: string }) {
      return normalizeCard(
        await requestJson("PUT", `cards/${encodeURIComponent(input.cardId)}`, undefined, {
          idList: input.targetListId,
        }),
      );
    },
    async addComment(input: { cardId: string; text: string }) {
      return await requestJson(
        "POST",
        `cards/${encodeURIComponent(input.cardId)}/actions/comments`,
        undefined,
        {
          text: input.text,
        },
      );
    },
    async archiveCard(input: { cardId: string }) {
      return normalizeCard(
        await requestJson("PUT", `cards/${encodeURIComponent(input.cardId)}`, undefined, {
          closed: true,
        }),
      );
    },
  };
}

export type TrelloClient = ReturnType<typeof createTrelloClient>;
