import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { ResolvedBrowserConfig } from "./config.js";
import type { BrowserRouteRegistrar } from "./routes/types.js";
<<<<<<< HEAD
import { safeEqualSecret } from "../security/secret-equal.js";
=======
import { isLoopbackHost } from "../gateway/net.js";
import { deleteBridgeAuthForPort, setBridgeAuthForPort } from "./bridge-auth-registry.js";
<<<<<<< HEAD
import { isAuthorizedBrowserRequest } from "./http-auth.js";
>>>>>>> af50b914a (refactor(browser): centralize http auth)
=======
>>>>>>> 28014de97 (refactor(browser): share common server middleware)
=======
import { isLoopbackHost } from "../gateway/net.js";
import { deleteBridgeAuthForPort, setBridgeAuthForPort } from "./bridge-auth-registry.js";
import type { ResolvedBrowserConfig } from "./config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { ResolvedBrowserConfig } from "./config.js";
import type { BrowserRouteRegistrar } from "./routes/types.js";
import { isLoopbackHost } from "../gateway/net.js";
import { deleteBridgeAuthForPort, setBridgeAuthForPort } from "./bridge-auth-registry.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { isLoopbackHost } from "../gateway/net.js";
import { deleteBridgeAuthForPort, setBridgeAuthForPort } from "./bridge-auth-registry.js";
import type { ResolvedBrowserConfig } from "./config.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { ResolvedBrowserConfig } from "./config.js";
import type { BrowserRouteRegistrar } from "./routes/types.js";
import { isLoopbackHost } from "../gateway/net.js";
import { deleteBridgeAuthForPort, setBridgeAuthForPort } from "./bridge-auth-registry.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { isLoopbackHost } from "../gateway/net.js";
import { deleteBridgeAuthForPort, setBridgeAuthForPort } from "./bridge-auth-registry.js";
import type { ResolvedBrowserConfig } from "./config.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { registerBrowserRoutes } from "./routes/index.js";
import type { BrowserRouteRegistrar } from "./routes/types.js";
import {
  type BrowserServerState,
  createBrowserRouteContext,
  type ProfileContext,
} from "./server-context.js";
import {
  installBrowserAuthMiddleware,
  installBrowserCommonMiddleware,
} from "./server-middleware.js";

export type BrowserBridge = {
  server: Server;
  port: number;
  baseUrl: string;
  state: BrowserServerState;
};

export async function startBrowserBridgeServer(params: {
  resolved: ResolvedBrowserConfig;
  host?: string;
  port?: number;
  authToken?: string;
  authPassword?: string;
  onEnsureAttachTarget?: (profile: ProfileContext["profile"]) => Promise<void>;
  resolveSandboxNoVncToken?: (token: string) => string | null;
}): Promise<BrowserBridge> {
  const host = params.host ?? "127.0.0.1";
  const port = params.port ?? 0;

  const app = express();
<<<<<<< HEAD
  app.use(express.json({ limit: "1mb" }));

  const authToken = params.authToken?.trim() || undefined;
  const authPassword = params.authPassword?.trim() || undefined;
  if (authToken || authPassword) {
    app.use((req, res, next) => {
      if (isAuthorizedBrowserRequest(req, { token: authToken, password: authPassword })) {
        return next();
      }
      res.status(401).send("Unauthorized");
    });
  }
=======
  installBrowserCommonMiddleware(app);

  if (params.resolveSandboxNoVncToken) {
    app.get("/sandbox/novnc", (req, res) => {
      const rawToken = typeof req.query?.token === "string" ? req.query.token.trim() : "";
      if (!rawToken) {
        res.status(400).send("Missing token");
        return;
      }
      const redirectUrl = params.resolveSandboxNoVncToken?.(rawToken);
      if (!redirectUrl) {
        res.status(404).send("Invalid or expired token");
        return;
      }
      res.setHeader("Cache-Control", "no-store");
      res.redirect(302, redirectUrl);
    });
  }

  const authToken = params.authToken?.trim() || undefined;
  const authPassword = params.authPassword?.trim() || undefined;
  if (!authToken && !authPassword) {
    throw new Error("bridge server requires auth (authToken/authPassword missing)");
  }
  installBrowserAuthMiddleware(app, { token: authToken, password: authPassword });
>>>>>>> 28014de97 (refactor(browser): share common server middleware)

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

  const baseUrl = `http://${host}:${resolvedPort}`;
  return { server, port: resolvedPort, baseUrl, state };
}

export async function stopBrowserBridgeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}
