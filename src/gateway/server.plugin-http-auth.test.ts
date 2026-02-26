import type { IncomingMessage, ServerResponse } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import type { ResolvedGatewayAuth } from "./auth.js";
import { createGatewayHttpServer } from "./server-http.js";

async function withTempConfig(params: { cfg: unknown; run: () => Promise<void> }): Promise<void> {
  const prevConfigPath = process.env.OPENCLAW_CONFIG_PATH;
  const prevDisableCache = process.env.OPENCLAW_DISABLE_CONFIG_CACHE;

  const dir = await mkdtemp(path.join(os.tmpdir(), "openclaw-plugin-http-auth-test-"));
  const configPath = path.join(dir, "openclaw.json");

  process.env.OPENCLAW_CONFIG_PATH = configPath;
  process.env.OPENCLAW_DISABLE_CONFIG_CACHE = "1";

  try {
    await writeFile(configPath, JSON.stringify(params.cfg, null, 2), "utf-8");
    await params.run();
  } finally {
    if (prevConfigPath === undefined) {
      delete process.env.OPENCLAW_CONFIG_PATH;
    } else {
      process.env.OPENCLAW_CONFIG_PATH = prevConfigPath;
    }
    if (prevDisableCache === undefined) {
      delete process.env.OPENCLAW_DISABLE_CONFIG_CACHE;
    } else {
      process.env.OPENCLAW_DISABLE_CONFIG_CACHE = prevDisableCache;
    }
    await rm(dir, { recursive: true, force: true });
  }
}

function createRequest(params: {
  path: string;
  authorization?: string;
  method?: string;
}): IncomingMessage {
  const headers: Record<string, string> = {
    host: "localhost:18789",
  };
  if (params.authorization) {
    headers.authorization = params.authorization;
  }
  return {
    method: params.method ?? "GET",
    url: params.path,
    headers,
    socket: { remoteAddress: "127.0.0.1" },
  } as IncomingMessage;
}

function createResponse(): {
  res: ServerResponse;
  setHeader: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  getBody: () => string;
} {
  const setHeader = vi.fn();
  let body = "";
  const end = vi.fn((chunk?: unknown) => {
    if (typeof chunk === "string") {
      body = chunk;
      return;
    }
    if (chunk == null) {
      body = "";
      return;
    }
    body = JSON.stringify(chunk);
  });
  const res = {
    headersSent: false,
    statusCode: 200,
    setHeader,
    end,
  } as unknown as ServerResponse;
  return {
    res,
    setHeader,
    end,
    getBody: () => body,
  };
}

async function dispatchRequest(
  server: ReturnType<typeof createGatewayHttpServer>,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  server.emit("request", req, res);
  await new Promise((resolve) => setImmediate(resolve));
}

<<<<<<< HEAD
=======
function createHooksConfig(): HooksConfigResolved {
  return {
    basePath: "/hooks",
    token: "hook-secret",
    maxBodyBytes: 1024,
    mappings: [],
    agentPolicy: {
      defaultAgentId: "main",
      knownAgentIds: new Set(["main"]),
      allowedAgentIds: undefined,
    },
    sessionPolicy: {
      allowRequestSessionKey: false,
      defaultSessionKey: undefined,
      allowedSessionKeyPrefixes: undefined,
    },
  };
}

function canonicalizePluginPath(pathname: string): string {
  let decoded = pathname;
  for (let pass = 0; pass < 3; pass++) {
    let nextDecoded = decoded;
    try {
      nextDecoded = decodeURIComponent(decoded);
    } catch {
      break;
    }
    if (nextDecoded === decoded) {
      break;
    }
    decoded = nextDecoded;
  }
  let resolved = decoded;
  try {
    resolved = new URL(decoded, "http://localhost").pathname;
  } catch {
    resolved = decoded;
  }
  const collapsed = resolved.toLowerCase().replace(/\/{2,}/g, "/");
  if (collapsed.length <= 1) {
    return collapsed;
  }
  return collapsed.replace(/\/+$/, "");
}

type RouteVariant = {
  label: string;
  path: string;
};

const CANONICAL_UNAUTH_VARIANTS: RouteVariant[] = [
  { label: "case-variant", path: "/API/channels/nostr/default/profile" },
  { label: "encoded-slash", path: "/api/channels%2Fnostr%2Fdefault%2Fprofile" },
  { label: "encoded-segment", path: "/api/%63hannels/nostr/default/profile" },
  { label: "dot-traversal-encoded-slash", path: "/api/foo/..%2fchannels/nostr/default/profile" },
  {
    label: "dot-traversal-encoded-dotdot-slash",
    path: "/api/foo/%2e%2e%2fchannels/nostr/default/profile",
  },
  {
    label: "dot-traversal-double-encoded",
    path: "/api/foo/%252e%252e%252fchannels/nostr/default/profile",
  },
  { label: "duplicate-slashes", path: "/api/channels//nostr/default/profile" },
  { label: "trailing-slash", path: "/api/channels/nostr/default/profile/" },
  { label: "malformed-short-percent", path: "/api/channels%2" },
  { label: "malformed-double-slash-short-percent", path: "/api//channels%2" },
];

const CANONICAL_AUTH_VARIANTS: RouteVariant[] = [
  { label: "auth-case-variant", path: "/API/channels/nostr/default/profile" },
  { label: "auth-encoded-segment", path: "/api/%63hannels/nostr/default/profile" },
  { label: "auth-duplicate-trailing-slash", path: "/api/channels//nostr/default/profile/" },
  {
    label: "auth-dot-traversal-encoded-slash",
    path: "/api/foo/..%2fchannels/nostr/default/profile",
  },
  {
    label: "auth-dot-traversal-double-encoded",
    path: "/api/foo/%252e%252e%252fchannels/nostr/default/profile",
  },
];

function buildChannelPathFuzzCorpus(): RouteVariant[] {
  const variants = [
    "/api/channels/nostr/default/profile",
    "/API/channels/nostr/default/profile",
    "/api/foo/..%2fchannels/nostr/default/profile",
    "/api/foo/%2e%2e%2fchannels/nostr/default/profile",
    "/api/foo/%252e%252e%252fchannels/nostr/default/profile",
    "/api/channels//nostr/default/profile/",
    "/api/channels%2Fnostr%2Fdefault%2Fprofile",
    "/api/channels%252Fnostr%252Fdefault%252Fprofile",
    "/api//channels/nostr/default/profile",
    "/api/channels%2",
    "/api/channels%zz",
    "/api//channels%2",
    "/api//channels%zz",
  ];
  return variants.map((path) => ({ label: `fuzz:${path}`, path }));
}

async function expectUnauthorizedVariants(params: {
  server: ReturnType<typeof createGatewayHttpServer>;
  variants: RouteVariant[];
}) {
  for (const variant of params.variants) {
    const response = createResponse();
    await dispatchRequest(params.server, createRequest({ path: variant.path }), response.res);
    expect(response.res.statusCode, variant.label).toBe(401);
    expect(response.getBody(), variant.label).toContain("Unauthorized");
  }
}

async function expectAuthorizedVariants(params: {
  server: ReturnType<typeof createGatewayHttpServer>;
  variants: RouteVariant[];
  authorization: string;
}) {
  for (const variant of params.variants) {
    const response = createResponse();
    await dispatchRequest(
      params.server,
      createRequest({
        path: variant.path,
        authorization: params.authorization,
      }),
      response.res,
    );
    expect(response.res.statusCode, variant.label).toBe(200);
    expect(response.getBody(), variant.label).toContain('"route":"channel-canonicalized"');
  }
}

>>>>>>> 258d615c4 (fix: harden plugin route auth path canonicalization)
describe("gateway plugin HTTP auth boundary", () => {
  test("requires gateway auth for /api/channels/* plugin routes and allows authenticated pass-through", async () => {
    const resolvedAuth: ResolvedGatewayAuth = {
      mode: "token",
      token: "test-token",
      password: undefined,
      allowTailscale: false,
    };

    await withTempConfig({
      cfg: { gateway: { trustedProxies: [] } },
      run: async () => {
        const handlePluginRequest = vi.fn(async (req: IncomingMessage, res: ServerResponse) => {
          const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
          if (pathname === "/api/channels/nostr/default/profile") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: true, route: "channel" }));
            return true;
          }
          if (pathname === "/plugin/public") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: true, route: "public" }));
            return true;
          }
          return false;
        });

        const server = createGatewayHttpServer({
          canvasHost: null,
          clients: new Set(),
          controlUiEnabled: false,
          controlUiBasePath: "/__control__",
          openAiChatCompletionsEnabled: false,
          openResponsesEnabled: false,
          handleHooksRequest: async () => false,
          handlePluginRequest,
          resolvedAuth,
        });

        const unauthenticated = createResponse();
        await dispatchRequest(
          server,
          createRequest({ path: "/api/channels/nostr/default/profile" }),
          unauthenticated.res,
        );
        expect(unauthenticated.res.statusCode).toBe(401);
        expect(unauthenticated.getBody()).toContain("Unauthorized");
        expect(handlePluginRequest).not.toHaveBeenCalled();

        const authenticated = createResponse();
        await dispatchRequest(
          server,
          createRequest({
            path: "/api/channels/nostr/default/profile",
            authorization: "Bearer test-token",
          }),
          authenticated.res,
        );
        expect(authenticated.res.statusCode).toBe(200);
        expect(authenticated.getBody()).toContain('"route":"channel"');

        const unauthenticatedPublic = createResponse();
        await dispatchRequest(
          server,
          createRequest({ path: "/plugin/public" }),
          unauthenticatedPublic.res,
        );
        expect(unauthenticatedPublic.res.statusCode).toBe(200);
        expect(unauthenticatedPublic.getBody()).toContain('"route":"public"');

        expect(handlePluginRequest).toHaveBeenCalledTimes(2);
      },
    });
  });
});
