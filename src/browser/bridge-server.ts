import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";

import type { ResolvedBrowserConfig } from "./config.js";
<<<<<<< HEAD
=======
import type { BrowserRouteRegistrar } from "./routes/types.js";
import { isLoopbackHost } from "../gateway/net.js";
import { safeEqualSecret } from "../security/secret-equal.js";
import { deleteBridgeAuthForPort, setBridgeAuthForPort } from "./bridge-auth-registry.js";
<<<<<<< HEAD
>>>>>>> 6dd6bce99 (fix(security): enforce sandbox bridge auth)
=======
import { browserMutationGuardMiddleware } from "./csrf.js";
import { isAuthorizedBrowserRequest } from "./http-auth.js";
>>>>>>> b566b09f8 (fix(security): block cross-origin mutations on loopback browser routes)
import { registerBrowserRoutes } from "./routes/index.js";
import type { BrowserRouteRegistrar } from "./routes/types.js";
import {
  type BrowserServerState,
  createBrowserRouteContext,
  type ProfileContext,
} from "./server-context.js";

export type BrowserBridge = {
  server: Server;
  port: number;
  baseUrl: string;
  state: BrowserServerState;
};

type ResolvedNoVncObserver = {
  noVncPort: number;
  password?: string;
};

function buildNoVncBootstrapHtml(params: ResolvedNoVncObserver): string {
  const hash = new URLSearchParams({
    autoconnect: "1",
    resize: "remote",
  });
  if (params.password?.trim()) {
    hash.set("password", params.password);
  }
  const targetUrl = `http://127.0.0.1:${params.noVncPort}/vnc.html#${hash.toString()}`;
  const encodedTarget = JSON.stringify(targetUrl);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
  <title>OpenClaw noVNC Observer</title>
</head>
<body>
  <p>Opening sandbox observer...</p>
  <script>
    const target = ${encodedTarget};
    window.location.replace(target);
  </script>
</body>
</html>`;
}

export async function startBrowserBridgeServer(params: {
  resolved: ResolvedBrowserConfig;
  host?: string;
  port?: number;
  authToken?: string;
  onEnsureAttachTarget?: (profile: ProfileContext["profile"]) => Promise<void>;
<<<<<<< HEAD
=======
  resolveSandboxNoVncToken?: (token: string) => ResolvedNoVncObserver | null;
>>>>>>> 002539c01 (fix(security): harden sandbox novnc observer flow)
}): Promise<BrowserBridge> {
  const host = params.host ?? "127.0.0.1";
  if (!isLoopbackHost(host)) {
    throw new Error(`bridge server must bind to loopback host (got ${host})`);
  }
  const port = params.port ?? 0;

  const app = express();
<<<<<<< HEAD
  app.use(express.json({ limit: "1mb" }));
  app.use(browserMutationGuardMiddleware());
=======
  installBrowserCommonMiddleware(app);

  if (params.resolveSandboxNoVncToken) {
    app.get("/sandbox/novnc", (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Referrer-Policy", "no-referrer");
      const rawToken = typeof req.query?.token === "string" ? req.query.token.trim() : "";
      if (!rawToken) {
        res.status(400).send("Missing token");
        return;
      }
      const resolved = params.resolveSandboxNoVncToken?.(rawToken);
      if (!resolved) {
        res.status(404).send("Invalid or expired token");
        return;
      }
      res.type("html").status(200).send(buildNoVncBootstrapHtml(resolved));
    });
  }
>>>>>>> 002539c01 (fix(security): harden sandbox novnc observer flow)

<<<<<<< HEAD
  const authToken = params.authToken?.trim();
  if (authToken) {
=======
  const authToken = params.authToken?.trim() || undefined;
  const authPassword = params.authPassword?.trim() || undefined;
  if (!authToken && !authPassword) {
    throw new Error("bridge server requires auth (authToken/authPassword missing)");
  }
  if (authToken || authPassword) {
>>>>>>> 6dd6bce99 (fix(security): enforce sandbox bridge auth)
    app.use((req, res, next) => {
      const auth = String(req.headers.authorization ?? "").trim();
      if (auth === `Bearer ${authToken}`) return next();
      res.status(401).send("Unauthorized");
    });
  }

  const state: BrowserServerState = {
    server: null as unknown as Server,
    port,
    resolved: params.resolved,
    profiles: new Map(),
  };

  const ctx = createBrowserRouteContext({
    getState: () => state,
    onEnsureAttachTarget: params.onEnsureAttachTarget,
  });
  registerBrowserRoutes(app as unknown as BrowserRouteRegistrar, ctx);

  const server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(port, host, () => resolve(s));
    s.once("error", reject);
  });

  const address = server.address() as AddressInfo | null;
  const resolvedPort = address?.port ?? port;
  state.server = server;
  state.port = resolvedPort;
  state.resolved.controlPort = resolvedPort;

  setBridgeAuthForPort(resolvedPort, { token: authToken, password: authPassword });

  const baseUrl = `http://${host}:${resolvedPort}`;
  return { server, port: resolvedPort, baseUrl, state };
}

export async function stopBrowserBridgeServer(server: Server): Promise<void> {
  try {
    const address = server.address() as AddressInfo | null;
    if (address?.port) {
      deleteBridgeAuthForPort(address.port);
    }
  } catch {
    // ignore
  }
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}
