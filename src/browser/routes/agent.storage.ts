import type { BrowserRouteContext } from "../server-context.js";
<<<<<<< HEAD
import { handleRouteError, readBody, requirePwAi, resolveProfileContext } from "./agent.shared.js";
import { jsonError, toBoolean, toNumber, toStringOrEmpty } from "./utils.js";
import type { BrowserRouteRegistrar } from "./types.js";
=======
import {
  readBody,
  resolveTargetIdFromBody,
  resolveTargetIdFromQuery,
  withPlaywrightRouteContext,
} from "./agent.shared.js";
import type { BrowserRouteRegistrar } from "./types.js";
import { jsonError, toBoolean, toNumber, toStringOrEmpty } from "./utils.js";

type StorageKind = "local" | "session";

export function parseStorageKind(raw: string): StorageKind | null {
  if (raw === "local" || raw === "session") {
    return raw;
  }
  return null;
}

export function parseStorageMutationRequest(
  kindParam: unknown,
  body: Record<string, unknown>,
): { kind: StorageKind | null; targetId: string | undefined } {
  return {
    kind: parseStorageKind(toStringOrEmpty(kindParam)),
    targetId: resolveTargetIdFromBody(body),
  };
}
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)

export function registerBrowserAgentStorageRoutes(
  app: BrowserRouteRegistrar,
  ctx: BrowserRouteContext,
) {
  app.get("/cookies", async (req, res) => {
<<<<<<< HEAD
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pw = await requirePwAi(res, "cookies");
      if (!pw) return;
      const result = await pw.cookiesGetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
      });
      res.json({ ok: true, targetId: tab.targetId, ...result });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/cookies/set", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
=======
    const targetId = resolveTargetIdFromQuery(req.query);
    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "cookies",
      run: async ({ cdpUrl, tab, pw }) => {
        const result = await pw.cookiesGetViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
        });
        res.json({ ok: true, targetId: tab.targetId, ...result });
      },
    });
  });

  app.post("/cookies/set", async (req, res) => {
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
    const cookie =
      body.cookie && typeof body.cookie === "object" && !Array.isArray(body.cookie)
        ? (body.cookie as Record<string, unknown>)
        : null;
<<<<<<< HEAD
    if (!cookie) return jsonError(res, 400, "cookie is required");
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "cookies set");
      if (!pw) return;
      await pw.cookiesSetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        cookie: {
          name: toStringOrEmpty(cookie.name),
          value: toStringOrEmpty(cookie.value),
          url: toStringOrEmpty(cookie.url) || undefined,
          domain: toStringOrEmpty(cookie.domain) || undefined,
          path: toStringOrEmpty(cookie.path) || undefined,
          expires: toNumber(cookie.expires) ?? undefined,
          httpOnly: toBoolean(cookie.httpOnly) ?? undefined,
          secure: toBoolean(cookie.secure) ?? undefined,
          sameSite:
            cookie.sameSite === "Lax" || cookie.sameSite === "None" || cookie.sameSite === "Strict"
              ? (cookie.sameSite as "Lax" | "None" | "Strict")
              : undefined,
        },
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/cookies/clear", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "cookies clear");
      if (!pw) return;
      await pw.cookiesClearViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.get("/storage/:kind", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const kind = toStringOrEmpty(req.params.kind);
    if (kind !== "local" && kind !== "session")
      return jsonError(res, 400, "kind must be local|session");
    const targetId = typeof req.query.targetId === "string" ? req.query.targetId.trim() : "";
    const key = typeof req.query.key === "string" ? req.query.key : "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pw = await requirePwAi(res, "storage get");
      if (!pw) return;
      const result = await pw.storageGetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        kind,
        key: key.trim() || undefined,
      });
      res.json({ ok: true, targetId: tab.targetId, ...result });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/storage/:kind/set", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const kind = toStringOrEmpty(req.params.kind);
    if (kind !== "local" && kind !== "session")
      return jsonError(res, 400, "kind must be local|session");
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
=======
    if (!cookie) {
      return jsonError(res, 400, "cookie is required");
    }

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "cookies set",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.cookiesSetViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          cookie: {
            name: toStringOrEmpty(cookie.name),
            value: toStringOrEmpty(cookie.value),
            url: toStringOrEmpty(cookie.url) || undefined,
            domain: toStringOrEmpty(cookie.domain) || undefined,
            path: toStringOrEmpty(cookie.path) || undefined,
            expires: toNumber(cookie.expires) ?? undefined,
            httpOnly: toBoolean(cookie.httpOnly) ?? undefined,
            secure: toBoolean(cookie.secure) ?? undefined,
            sameSite:
              cookie.sameSite === "Lax" ||
              cookie.sameSite === "None" ||
              cookie.sameSite === "Strict"
                ? cookie.sameSite
                : undefined,
          },
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.post("/cookies/clear", async (req, res) => {
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "cookies clear",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.cookiesClearViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.get("/storage/:kind", async (req, res) => {
    const kind = parseStorageKind(toStringOrEmpty(req.params.kind));
    if (!kind) {
      return jsonError(res, 400, "kind must be local|session");
    }
    const targetId = resolveTargetIdFromQuery(req.query);
    const key = toStringOrEmpty(req.query.key);

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "storage get",
      run: async ({ cdpUrl, tab, pw }) => {
        const result = await pw.storageGetViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          kind,
          key: key.trim() || undefined,
        });
        res.json({ ok: true, targetId: tab.targetId, ...result });
      },
    });
  });

  app.post("/storage/:kind/set", async (req, res) => {
    const body = readBody(req);
    const parsed = parseStorageMutationRequest(req.params.kind, body);
    if (!parsed.kind) {
      return jsonError(res, 400, "kind must be local|session");
    }
    const kind = parsed.kind;
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
    const key = toStringOrEmpty(body.key);
    if (!key) return jsonError(res, 400, "key is required");
    const value = typeof body.value === "string" ? body.value : "";
<<<<<<< HEAD
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "storage set");
      if (!pw) return;
      await pw.storageSetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        kind,
        key,
        value,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/storage/:kind/clear", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const kind = toStringOrEmpty(req.params.kind);
    if (kind !== "local" && kind !== "session")
      return jsonError(res, 400, "kind must be local|session");
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "storage clear");
      if (!pw) return;
      await pw.storageClearViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        kind,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
=======

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId: parsed.targetId,
      feature: "storage set",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.storageSetViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          kind,
          key,
          value,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.post("/storage/:kind/clear", async (req, res) => {
    const body = readBody(req);
    const parsed = parseStorageMutationRequest(req.params.kind, body);
    if (!parsed.kind) {
      return jsonError(res, 400, "kind must be local|session");
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
    }
    const kind = parsed.kind;

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId: parsed.targetId,
      feature: "storage clear",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.storageClearViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          kind,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.post("/set/offline", async (req, res) => {
<<<<<<< HEAD
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const offline = toBoolean(body.offline);
    if (offline === undefined) return jsonError(res, 400, "offline is required");
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "offline");
      if (!pw) return;
      await pw.setOfflineViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        offline,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/set/headers", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
=======
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);
    const offline = toBoolean(body.offline);
    if (offline === undefined) {
      return jsonError(res, 400, "offline is required");
    }

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "offline",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.setOfflineViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          offline,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.post("/set/headers", async (req, res) => {
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
    const headers =
      body.headers && typeof body.headers === "object" && !Array.isArray(body.headers)
        ? (body.headers as Record<string, unknown>)
        : null;
<<<<<<< HEAD
    if (!headers) return jsonError(res, 400, "headers is required");
=======
    if (!headers) {
      return jsonError(res, 400, "headers is required");
    }

>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
    const parsed: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === "string") parsed[k] = v;
    }
<<<<<<< HEAD
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "headers");
      if (!pw) return;
      await pw.setExtraHTTPHeadersViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        headers: parsed,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/set/credentials", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const clear = toBoolean(body.clear) ?? false;
    const username = toStringOrEmpty(body.username) || undefined;
    const password = typeof body.password === "string" ? body.password : undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "http credentials");
      if (!pw) return;
      await pw.setHttpCredentialsViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        username,
        password,
        clear,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/set/geolocation", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
=======

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "headers",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.setExtraHTTPHeadersViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          headers: parsed,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.post("/set/credentials", async (req, res) => {
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);
    const clear = toBoolean(body.clear) ?? false;
    const username = toStringOrEmpty(body.username) || undefined;
    const password = typeof body.password === "string" ? body.password : undefined;

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "http credentials",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.setHttpCredentialsViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          username,
          password,
          clear,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.post("/set/geolocation", async (req, res) => {
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
    const clear = toBoolean(body.clear) ?? false;
    const latitude = toNumber(body.latitude);
    const longitude = toNumber(body.longitude);
    const accuracy = toNumber(body.accuracy) ?? undefined;
    const origin = toStringOrEmpty(body.origin) || undefined;
<<<<<<< HEAD
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "geolocation");
      if (!pw) return;
      await pw.setGeolocationViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        latitude,
        longitude,
        accuracy,
        origin,
        clear,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/set/media", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
=======

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "geolocation",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.setGeolocationViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          latitude,
          longitude,
          accuracy,
          origin,
          clear,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.post("/set/media", async (req, res) => {
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
    const schemeRaw = toStringOrEmpty(body.colorScheme);
    const colorScheme =
      schemeRaw === "dark" || schemeRaw === "light" || schemeRaw === "no-preference"
        ? (schemeRaw as "dark" | "light" | "no-preference")
        : schemeRaw === "none"
          ? null
          : undefined;
    if (colorScheme === undefined)
      return jsonError(res, 400, "colorScheme must be dark|light|no-preference|none");
<<<<<<< HEAD
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "media emulation");
      if (!pw) return;
      await pw.emulateMediaViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        colorScheme,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/set/timezone", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const timezoneId = toStringOrEmpty(body.timezoneId);
    if (!timezoneId) return jsonError(res, 400, "timezoneId is required");
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "timezone");
      if (!pw) return;
      await pw.setTimezoneViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        timezoneId,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/set/locale", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const locale = toStringOrEmpty(body.locale);
    if (!locale) return jsonError(res, 400, "locale is required");
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "locale");
      if (!pw) return;
      await pw.setLocaleViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        locale,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
  });

  app.post("/set/device", async (req, res) => {
    const profileCtx = resolveProfileContext(req, res, ctx);
    if (!profileCtx) return;
    const body = readBody(req);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const name = toStringOrEmpty(body.name);
    if (!name) return jsonError(res, 400, "name is required");
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pw = await requirePwAi(res, "device emulation");
      if (!pw) return;
      await pw.setDeviceViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        name,
      });
      res.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      handleRouteError(ctx, res, err);
    }
=======
    }

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "media emulation",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.emulateMediaViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          colorScheme,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.post("/set/timezone", async (req, res) => {
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);
    const timezoneId = toStringOrEmpty(body.timezoneId);
    if (!timezoneId) {
      return jsonError(res, 400, "timezoneId is required");
    }

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "timezone",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.setTimezoneViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          timezoneId,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.post("/set/locale", async (req, res) => {
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);
    const locale = toStringOrEmpty(body.locale);
    if (!locale) {
      return jsonError(res, 400, "locale is required");
    }

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "locale",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.setLocaleViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          locale,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
  });

  app.post("/set/device", async (req, res) => {
    const body = readBody(req);
    const targetId = resolveTargetIdFromBody(body);
    const name = toStringOrEmpty(body.name);
    if (!name) {
      return jsonError(res, 400, "name is required");
    }

    await withPlaywrightRouteContext({
      req,
      res,
      ctx,
      targetId,
      feature: "device emulation",
      run: async ({ cdpUrl, tab, pw }) => {
        await pw.setDeviceViaPlaywright({
          cdpUrl,
          targetId: tab.targetId,
          name,
        });
        res.json({ ok: true, targetId: tab.targetId });
      },
    });
>>>>>>> 5d98c2ae7 (refactor(browser): share playwright route context for debug/storage routes)
  });
}
