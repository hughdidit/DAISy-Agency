import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { OpenClawConfig } from "../config/config.js";
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
import { openBoundaryFileSync } from "../infra/boundary-file-read.js";
>>>>>>> e3385a657 (fix(security): harden root file guards and host writes)
import { resolveControlUiRootSync } from "../infra/control-ui-assets.js";
import { isWithinDir } from "../infra/path-safety.js";
>>>>>>> 6ac89757b (Security/Gateway: harden Control UI static path containment (#21203))
import { DEFAULT_ASSISTANT_IDENTITY, resolveAssistantIdentity } from "./assistant-identity.js";
import { authorizeGatewayConnect, isLocalDirectRequest, type ResolvedGatewayAuth } from "./auth.js";
import {
  buildControlUiAvatarUrl,
  CONTROL_UI_AVATAR_PREFIX,
  normalizeControlUiBasePath,
  resolveAssistantAvatarUrl,
} from "./control-ui-shared.js";
import { sendUnauthorized, setSecurityHeaders } from "./http-common.js";
import { getBearerToken } from "./http-utils.js";

const ROOT_PREFIX = "/";

export type ControlUiRequestOptions = {
  basePath?: string;
  config?: OpenClawConfig;
  agentId?: string;
  auth?: ResolvedGatewayAuth;
  trustedProxies?: string[];
};

function resolveControlUiRoot(): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const execDir = (() => {
    try {
      return path.dirname(fs.realpathSync(process.execPath));
    } catch {
      return null;
    }
  })();
  const candidates = [
    // Packaged app: control-ui lives alongside the executable.
    execDir ? path.resolve(execDir, "control-ui") : null,
    // Running from dist: dist/gateway/control-ui.js -> dist/control-ui
    path.resolve(here, "../control-ui"),
    // Running from source: src/gateway/control-ui.ts -> dist/control-ui
    path.resolve(here, "../../dist/control-ui"),
    // Fallback to cwd (dev)
    path.resolve(process.cwd(), "dist", "control-ui"),
  ].filter((dir): dir is string => Boolean(dir));
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  }
  return null;
}

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
    case ".map":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    case ".txt":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

export type ControlUiAvatarResolution =
  | { kind: "none"; reason: string }
  | { kind: "local"; filePath: string }
  | { kind: "remote"; url: string }
  | { kind: "data"; url: string };

type ControlUiAvatarMeta = {
  avatarUrl: string | null;
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  setSecurityHeaders(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.end(JSON.stringify(body));
}

function isValidAgentId(agentId: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(agentId);
}

export async function handleControlUiAvatarRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: {
    basePath?: string;
    resolveAvatar: (agentId: string) => ControlUiAvatarResolution;
    auth?: ResolvedGatewayAuth;
    trustedProxies?: string[];
  },
): Promise<boolean> {
  const urlRaw = req.url;
  if (!urlRaw) return false;
  if (req.method !== "GET" && req.method !== "HEAD") return false;

  const url = new URL(urlRaw, "http://localhost");
  const basePath = normalizeControlUiBasePath(opts.basePath);
  const pathname = url.pathname;
  const pathWithBase = basePath
    ? `${basePath}${CONTROL_UI_AVATAR_PREFIX}/`
    : `${CONTROL_UI_AVATAR_PREFIX}/`;
  if (!pathname.startsWith(pathWithBase)) return false;

  if (opts.auth && !isLocalDirectRequest(req, opts.trustedProxies)) {
    const token = getBearerToken(req) ?? url.searchParams.get("token") ?? undefined;
    const authResult = await authorizeGatewayConnect({
      auth: opts.auth,
      connectAuth: token ? { token, password: token } : null,
      req,
      trustedProxies: opts.trustedProxies,
    });
    if (!authResult.ok) {
      sendUnauthorized(res);
      return true;
    }
  }

  const agentIdParts = pathname.slice(pathWithBase.length).split("/").filter(Boolean);
  const agentId = agentIdParts[0] ?? "";
  if (agentIdParts.length !== 1 || !agentId || !isValidAgentId(agentId)) {
    respondNotFound(res);
    return true;
  }

  if (url.searchParams.get("meta") === "1") {
    const resolved = opts.resolveAvatar(agentId);
    const avatarUrl =
      resolved.kind === "local"
        ? buildControlUiAvatarUrl(basePath, agentId)
        : resolved.kind === "remote" || resolved.kind === "data"
          ? resolved.url
          : null;
    sendJson(res, 200, { avatarUrl } satisfies ControlUiAvatarMeta);
    return true;
  }

  const resolved = opts.resolveAvatar(agentId);
  if (resolved.kind !== "local") {
    respondNotFound(res);
    return true;
  }

  if (req.method === "HEAD") {
    res.statusCode = 200;
    res.setHeader("Content-Type", contentTypeForExt(path.extname(resolved.filePath).toLowerCase()));
    res.setHeader("Cache-Control", "no-cache");
    res.end();
    return true;
  }

  serveFile(res, resolved.filePath);
  return true;
}

function respondNotFound(res: ServerResponse) {
  setSecurityHeaders(res);
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not Found");
}

function serveFile(res: ServerResponse, filePath: string) {
  setSecurityHeaders(res);
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", contentTypeForExt(ext));
  // Static UI should never be cached aggressively while iterating; allow the
  // browser to revalidate.
  res.setHeader("Cache-Control", "no-cache");
  res.end(fs.readFileSync(filePath));
}

<<<<<<< HEAD
interface ControlUiInjectionOpts {
  basePath: string;
  assistantName?: string;
  assistantAvatar?: string;
}

function injectControlUiConfig(html: string, opts: ControlUiInjectionOpts): string {
  const { basePath, assistantName, assistantAvatar } = opts;
  const script =
    `<script>` +
    `window.__OPENCLAW_CONTROL_UI_BASE_PATH__=${JSON.stringify(basePath)};` +
    `window.__OPENCLAW_ASSISTANT_NAME__=${JSON.stringify(
      assistantName ?? DEFAULT_ASSISTANT_IDENTITY.name,
    )};` +
    `window.__OPENCLAW_ASSISTANT_AVATAR__=${JSON.stringify(
      assistantAvatar ?? DEFAULT_ASSISTANT_IDENTITY.avatar,
    )};` +
    `</script>`;
  // Check if already injected
  if (html.includes("__OPENCLAW_ASSISTANT_NAME__")) return html;
  const headClose = html.indexOf("</head>");
  if (headClose !== -1) {
    return `${html.slice(0, headClose)}${script}${html.slice(headClose)}`;
  }
  return `${script}${html}`;
}

interface ServeIndexHtmlOpts {
  basePath: string;
  config?: OpenClawConfig;
  agentId?: string;
}

function serveIndexHtml(res: ServerResponse, indexPath: string, opts: ServeIndexHtmlOpts) {
  setSecurityHeaders(res);
  const { basePath, config, agentId } = opts;
  const identity = config
    ? resolveAssistantIdentity({ cfg: config, agentId })
    : DEFAULT_ASSISTANT_IDENTITY;
  const resolvedAgentId =
    typeof (identity as { agentId?: string }).agentId === "string"
      ? (identity as { agentId?: string }).agentId
      : agentId;
  const avatarValue =
    resolveAssistantAvatarUrl({
      avatar: identity.avatar,
      agentId: resolvedAgentId,
      basePath,
    }) ?? identity.avatar;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  const raw = fs.readFileSync(indexPath, "utf8");
  res.end(
    injectControlUiConfig(raw, {
      basePath,
      assistantName: identity.name,
      assistantAvatar: avatarValue,
    }),
  );
=======
function serveResolvedFile(res: ServerResponse, filePath: string, body: Buffer) {
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", contentTypeForExt(ext));
  res.setHeader("Cache-Control", "no-cache");
  res.end(body);
}

function serveResolvedIndexHtml(res: ServerResponse, body: string) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.end(body);
}

function isExpectedSafePathError(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  return code === "ENOENT" || code === "ENOTDIR" || code === "ELOOP";
}

function areSameFileIdentity(preOpen: fs.Stats, opened: fs.Stats): boolean {
  return preOpen.dev === opened.dev && preOpen.ino === opened.ino;
}

function resolveSafeControlUiFile(
  root: string,
  filePath: string,
<<<<<<< HEAD
): { path: string; body: Buffer } | null {
  let fd: number | null = null;
  try {
    const rootReal = fs.realpathSync(root);
    const fileReal = fs.realpathSync(filePath);
    if (!isContainedPath(rootReal, fileReal)) {
      return null;
    }

    const preOpenStat = fs.lstatSync(fileReal);
    if (!preOpenStat.isFile()) {
      return null;
    }

    const openFlags =
      fs.constants.O_RDONLY |
      (typeof fs.constants.O_NOFOLLOW === "number" ? fs.constants.O_NOFOLLOW : 0);
    fd = fs.openSync(fileReal, openFlags);
    const openedStat = fs.fstatSync(fd);
    // Compare inode identity so swaps between validation and open are rejected.
    if (!openedStat.isFile() || !areSameFileIdentity(preOpenStat, openedStat)) {
      return null;
    }

    return { path: fileReal, body: fs.readFileSync(fd) };
  } catch (error) {
    if (isExpectedSafePathError(error)) {
      return null;
    }
    throw error;
  } finally {
    if (fd !== null) {
      fs.closeSync(fd);
    }
  }
>>>>>>> 7c500ff62 (fix(security): harden control-ui static path resolution)
=======
): { path: string; fd: number } | null {
  const opened = openBoundaryFileSync({
    absolutePath: filePath,
    rootPath: rootReal,
    rootRealPath: rootReal,
    boundaryLabel: "control ui root",
    skipLexicalRootCheck: true,
  });
  if (!opened.ok) {
    if (opened.reason === "io") {
      throw opened.error;
    }
    return null;
  }
  return { path: opened.path, fd: opened.fd };
>>>>>>> e3385a657 (fix(security): harden root file guards and host writes)
}

function isSafeRelativePath(relPath: string) {
  if (!relPath) return false;
  const normalized = path.posix.normalize(relPath);
<<<<<<< HEAD
  if (normalized.startsWith("../") || normalized === "..") return false;
  if (normalized.includes("\0")) return false;
=======
  if (path.posix.isAbsolute(normalized) || path.win32.isAbsolute(normalized)) {
    return false;
  }
  if (normalized.startsWith("../") || normalized === "..") {
    return false;
  }
  if (normalized.includes("\0")) {
    return false;
  }
>>>>>>> 6ac89757b (Security/Gateway: harden Control UI static path containment (#21203))
  return true;
}

export async function handleControlUiHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts?: ControlUiRequestOptions,
): Promise<boolean> {
  const urlRaw = req.url;
  if (!urlRaw) return false;
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Method Not Allowed");
    return true;
  }

  const url = new URL(urlRaw, "http://localhost");
  const basePath = normalizeControlUiBasePath(opts?.basePath);
  const pathname = url.pathname;

  if (!basePath) {
    if (pathname === "/ui" || pathname.startsWith("/ui/")) {
      respondNotFound(res);
      return true;
    }
  }

  if (basePath) {
    if (pathname === basePath) {
      res.statusCode = 302;
      res.setHeader("Location", `${basePath}/${url.search}`);
      res.end();
      return true;
    }
    if (!pathname.startsWith(`${basePath}/`)) return false;
  }

  if (opts?.auth && !isLocalDirectRequest(req, opts.trustedProxies)) {
    const token = getBearerToken(req) ?? url.searchParams.get("token") ?? undefined;
    const authResult = await authorizeGatewayConnect({
      auth: opts.auth,
      connectAuth: token ? { token, password: token } : null,
      req,
      trustedProxies: opts.trustedProxies,
    });
    if (!authResult.ok) {
      sendUnauthorized(res);
      return true;
    }
  }

  const root = resolveControlUiRoot();
  if (!root) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(
      "Control UI assets not found. Build them with `pnpm ui:build` (auto-installs UI deps), or run `pnpm ui:dev` during development.",
    );
    return true;
  }

  const uiPath =
    basePath && pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname;
  const rel = (() => {
    if (uiPath === ROOT_PREFIX) return "";
    const assetsIndex = uiPath.indexOf("/assets/");
    if (assetsIndex >= 0) return uiPath.slice(assetsIndex + 1);
    return uiPath.slice(1);
  })();
  const requested = rel && !rel.endsWith("/") ? rel : `${rel}index.html`;
  const fileRel = requested || "index.html";
  if (!isSafeRelativePath(fileRel)) {
    respondNotFound(res);
    return true;
  }

  const filePath = path.resolve(root, fileRel);
  if (!isWithinDir(root, filePath)) {
    respondNotFound(res);
    return true;
  }

<<<<<<< HEAD
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    if (path.basename(filePath) === "index.html") {
      serveIndexHtml(res, filePath, {
        basePath,
        config: opts?.config,
        agentId: opts?.agentId,
      });
=======
  const safeFile = resolveSafeControlUiFile(root, filePath);
  if (safeFile) {
    if (path.basename(safeFile.path) === "index.html") {
      serveResolvedIndexHtml(res, safeFile.body.toString("utf8"));
>>>>>>> 7c500ff62 (fix(security): harden control-ui static path resolution)
      return true;
    }
    serveResolvedFile(res, safeFile.path, safeFile.body);
    return true;
  }

  // SPA fallback (client-side router): serve index.html for unknown paths.
  const indexPath = path.join(root, "index.html");
<<<<<<< HEAD
  if (fs.existsSync(indexPath)) {
    serveIndexHtml(res, indexPath, {
      basePath,
      config: opts?.config,
      agentId: opts?.agentId,
    });
=======
  const safeIndex = resolveSafeControlUiFile(root, indexPath);
  if (safeIndex) {
    serveResolvedIndexHtml(res, safeIndex.body.toString("utf8"));
>>>>>>> 7c500ff62 (fix(security): harden control-ui static path resolution)
    return true;
  }

  respondNotFound(res);
  return true;
}
