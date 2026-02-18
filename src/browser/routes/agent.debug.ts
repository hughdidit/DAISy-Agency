import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { BrowserRouteContext } from "../server-context.js";
<<<<<<< HEAD
import { handleRouteError, readBody, requirePwAi, resolveProfileContext } from "./agent.shared.js";
=======
import {
  readBody,
  resolveTargetIdFromBody,
  resolveTargetIdFromQuery,
  withPlaywrightRouteContext,
} from "./agent.shared.js";
import { DEFAULT_TRACE_DIR, resolvePathWithinRoot } from "./path-output.js";
import type { BrowserRouteRegistrar } from "./types.js";
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
import { toBoolean, toStringOrEmpty } from "./utils.js";
import type { BrowserRouteRegistrar } from "./types.js";

export function registerBrowserAgentDebugRoutes(
  app: BrowserRouteRegistrar,
  ctx: BrowserRouteContext,
) {
  app.get("/console", async (req, res) => {
<<<<<<< HEAD
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const level = typeof req.query.level === "string" ? req.query.level : "";

    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pw = await requirePwAi(res, "console messages");
      if (!pw) return;
      const messages = await pw.getConsoleMessagesViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        level: level.trim() || undefined,
      });
      res.json({ ok: true, messages, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.get("/errors", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const clear = toBoolean(req.query.clear) ?? false;

    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pw = await requirePwAi(res, "page errors");
      if (!pw) return;
      const result = await pw.getPageErrorsViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        clear,
      });
      res.json({ ok: true, targetId: tab.targetId, ...result });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.get("/requests", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const filter = typeof req.query.filter === "string" ? req.query.filter : "";
    const clear = toBoolean(req.query.clear) ?? false;

    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pw = await requirePwAi(res, "network requests");
      if (!pw) return;
      const result = await pw.getNetworkRequestsViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        filter: filter.trim() || undefined,
        clear,
      });
      res.json({ ok: true, targetId: tab.targetId, ...result });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/trace/start", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
=======
    const targetId = resolveTargetIdFromQuery(req.query);
    const level = typeof req.query.level === "string" ? req.query.level : "";

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "console messages",
      run: async ({ cdpUrl, tab, pw }) => {
        const messages = await pw.getConsoleMessagesViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          level: level.trim() || undefined,
        });
        res.json({ ok: true, messages, targetId: tab.targetId });
      },
    });
  });

  app.get("/errors", async (req, res) => {
    const targetId = resolveTargetIdFromQuery(req.query);
    const clear = toBoolean(req.query.clear) ?? false;

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "page errors",
      run: async ({ cdpUrl, tab, pw }) => {
        const result = await pw.getPageErrorsViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          clear,
        });
        res.json({ ok: true, targetId: tab.targetId, ...result });
      },
    });
  });

  app.get("/requests", async (req, res) => {
    const targetId = resolveTargetIdFromQuery(req.query);
    const filter = typeof req.query.filter === "string" ? req.query.filter : "";
    const clear = toBoolean(req.query.clear) ?? false;

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "network requests",
      run: async ({ cdpUrl, tab, pw }) => {
        const result = await pw.getNetworkRequestsViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          filter: filter.trim() || undefined,
          clear,
        });
        res.json({ ok: true, targetId: tab.targetId, ...result });
      },
    });
  });

  app.post("/trace/start", async (req, res) => {
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);
    const screenshots = toBoolean(body.screenshots) ?? undefined;
    const snapshots = toBoolean(body.snapshots) ?? undefined;
    const sources = toBoolean(body.sources) ?? undefined;
<<<<<<< HEAD
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "trace start");
      if (!pw) return;
      await pw.traceStartViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        screenshots,
        snapshots,
        sources,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/trace/stop", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
=======

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "trace start",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.traceStartViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          screenshots,
          snapshots,
          sources,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.post("/trace/stop", async (req, res) => {
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);
    const out = toStringOrEmpty(body.path) || "";
<<<<<<< HEAD
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "trace stop");
      if (!pw) return;
      const id = crypto.randomUUID();
<<<<<<< HEAD
      const dir = "/tmp/moltbot";
=======
      const dir = path.join(os.tmpdir(), "openclaw");
>>>>>>> afbce7357 (fix: use os.tmpdir fallback paths for temp files (#14985))
      await fs.mkdir(dir, { recursive: true });
      const tracePath = out.trim() || path.join(dir, `browser-trace-${id}.zip`);
      await pw.traceStopViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        path: tracePath,
      });
      res.json({
        ok: true,
        targetId: tab.targetId,
        path: path.resolve(tracePath),
      });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
=======

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "trace stop",
      run: async ({ cdpUrl, tab, pw }) => {
        const id = crypto.randomUUID();
        const dir = DEFAULT_TRACE_DIR;
        await fs.mkdir(dir, { recursive: true });
        const tracePathResult = resolvePathWithinRoot({
          rootDir: dir,
          requestedPath: out,
          scopeLabel: "trace directory",
          defaultFileName: `browser-trace-${id}.zip`,
        });
        if (!tracePathResult.ok) {
          res.status(400).json({ error: tracePathResult.error });
          return;
        }
        const tracePath = tracePathResult.path;
        await pw.traceStopViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          path: tracePath,
        });
        res.json({
          ok: true,
          targetId: tab.targetId,
          path: path.resolve(tracePath),
        });
      },
    });
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
  });
}
