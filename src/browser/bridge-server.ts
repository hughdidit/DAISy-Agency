import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";

import type { ResolvedBrowserConfig } from "./config.js";
<<<<<<< HEAD
=======
import type { BrowserRouteRegistrar } from "./routes/types.js";
<<<<<<< HEAD
import { safeEqualSecret } from "../security/secret-equal.js";
>>>>>>> 4711a943e (fix(browser): authenticate sandbox browser bridge server)
=======
import { isLoopbackHost } from "../gateway/net.js";
import { deleteBridgeAuthForPort, setBridgeAuthForPort } from "./bridge-auth-registry.js";
import { isAuthorizedBrowserRequest } from "./http-auth.js";
>>>>>>> af50b914a (refactor(browser): centralize http auth)
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

export async function startBrowserBridgeServer(params: {
  resolved: ResolvedBrowserConfig;
  host?: string;
  port?: number;
  authToken?: string;
  authPassword?: string;
  onEnsureAttachTarget?: (profile: ProfileContext["profile"]) => Promise<void>;
}): Promise<BrowserBridge> {
  const host = params.host ?? "127.0.0.1";
  const port = params.port ?? 0;

  const app = express();
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
