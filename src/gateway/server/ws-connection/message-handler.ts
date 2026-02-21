import type { IncomingMessage } from "node:http";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import os from "node:os";
<<<<<<< HEAD
<<<<<<< HEAD

import type { WebSocket } from "ws";
=======
=======
import type { WebSocket } from "ws";
import os from "node:os";
>>>>>>> ed11e93cf (chore(format))
import type { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { GatewayAuthResult, ResolvedGatewayAuth } from "../../auth.js";
import type { GatewayRequestContext, GatewayRequestHandlers } from "../../server-methods/types.js";
import type { GatewayWsClient } from "../ws-types.js";
<<<<<<< HEAD
=======
import type { WebSocket } from "ws";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import os from "node:os";
import type { WebSocket } from "ws";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { WebSocket } from "ws";
import os from "node:os";
import type { createSubsystemLogger } from "../../../logging/subsystem.js";
import type { GatewayAuthResult, ResolvedGatewayAuth } from "../../auth.js";
import type { GatewayRequestContext, GatewayRequestHandlers } from "../../server-methods/types.js";
import type { GatewayWsClient } from "../ws-types.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import os from "node:os";
import type { WebSocket } from "ws";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
=======
import os from "node:os";
import type { WebSocket } from "ws";
>>>>>>> d900d5efb (style: normalize ws message handler import ordering)
import { loadConfig } from "../../../config/config.js";
>>>>>>> 30b6eccae (feat(gateway): add auth rate-limiting & brute-force protection (#15035))
import {
  deriveDeviceIdFromPublicKey,
  normalizeDevicePublicKeyBase64Url,
  verifyDeviceSignature,
} from "../../../infra/device-identity.js";
import {
  approveDevicePairing,
  ensureDeviceToken,
  getPairedDevice,
  requestDevicePairing,
  updatePairedDeviceMetadata,
  verifyDeviceToken,
} from "../../../infra/device-pairing.js";
import { updatePairedNodeMetadata } from "../../../infra/node-pairing.js";
import { recordRemoteNodeInfo, refreshRemoteNodeBins } from "../../../infra/skills-remote.js";
import { loadVoiceWakeConfig } from "../../../infra/voicewake.js";
import { upsertPresence } from "../../../infra/system-presence.js";
import { rawDataToString } from "../../../infra/ws.js";
import type { createSubsystemLogger } from "../../../logging/subsystem.js";
import { roleScopesAllow } from "../../../shared/operator-scope-compat.js";
import { isGatewayCliClient, isWebchatClient } from "../../../utils/message-channel.js";
<<<<<<< HEAD
<<<<<<< HEAD
import type { ResolvedGatewayAuth } from "../../auth.js";
=======
=======
import { resolveRuntimeServiceVersion } from "../../../version.js";
>>>>>>> 07fdceb5f (refactor: centralize presence routing and version precedence coverage (#19609))
import {
  AUTH_RATE_LIMIT_SCOPE_DEVICE_TOKEN,
  AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET,
  type AuthRateLimiter,
} from "../../auth-rate-limit.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 30b6eccae (feat(gateway): add auth rate-limiting & brute-force protection (#15035))
=======
import type { GatewayAuthResult, ResolvedGatewayAuth } from "../../auth.js";
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { GatewayAuthResult, ResolvedGatewayAuth } from "../../auth.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { GatewayAuthResult, ResolvedGatewayAuth } from "../../auth.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
=======
import type { GatewayAuthResult, ResolvedGatewayAuth } from "../../auth.js";
>>>>>>> d900d5efb (style: normalize ws message handler import ordering)
import { authorizeGatewayConnect, isLocalDirectRequest } from "../../auth.js";
<<<<<<< HEAD
import { loadConfig } from "../../../config/config.js";
=======
=======
import {
  authorizeHttpGatewayConnect,
  authorizeWsControlUiGatewayConnect,
  isLocalDirectRequest,
} from "../../auth.js";
>>>>>>> 36a0df423 (refactor(gateway): make ws and http auth surfaces explicit)
import {
  buildCanvasScopedHostUrl,
  CANVAS_CAPABILITY_TTL_MS,
  mintCanvasCapabilityToken,
} from "../../canvas-capability.js";
>>>>>>> c45f3c5b0 (fix(gateway): harden canvas auth with session capabilities)
import { buildDeviceAuthPayload } from "../../device-auth.js";
import { isLoopbackAddress, isTrustedProxyAddress, resolveClientIp } from "../../net.js";
import { resolveHostName } from "../../net.js";
import { resolveNodeCommandAllowlist } from "../../node-command-policy.js";
import {
  type ConnectParams,
  ErrorCodes,
  type ErrorShape,
  errorShape,
  formatValidationErrors,
  PROTOCOL_VERSION,
  validateConnectParams,
  validateRequestFrame,
} from "../../protocol/index.js";
import { GATEWAY_CLIENT_IDS } from "../../protocol/client-info.js";
import { MAX_BUFFERED_BYTES, MAX_PAYLOAD_BYTES, TICK_INTERVAL_MS } from "../../server-constants.js";
import type { GatewayRequestContext, GatewayRequestHandlers } from "../../server-methods/types.js";
import { handleGatewayRequest } from "../../server-methods.js";
import type { GatewayRequestContext, GatewayRequestHandlers } from "../../server-methods/types.js";
import { formatError } from "../../server-utils.js";
import { formatForLog, logWs } from "../../ws-log.js";

import { truncateCloseReason } from "../close-reason.js";
import {
  buildGatewaySnapshot,
  getHealthCache,
  getHealthVersion,
  incrementPresenceVersion,
  refreshGatewayHealthSnapshot,
} from "../health-state.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { GatewayWsClient } from "../ws-types.js";
=======
import {
  formatGatewayAuthFailureMessage,
  resolveHostName,
  type AuthProvidedKind,
} from "./auth-messages.js";
>>>>>>> a79c2de95 (refactor(gateway): extract ws auth message helpers)
=======
=======
import type { GatewayWsClient } from "../ws-types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { GatewayWsClient } from "../ws-types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { GatewayWsClient } from "../ws-types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
=======
import type { GatewayWsClient } from "../ws-types.js";
>>>>>>> d900d5efb (style: normalize ws message handler import ordering)
import { formatGatewayAuthFailureMessage, type AuthProvidedKind } from "./auth-messages.js";
>>>>>>> 1843bcf1d (refactor(gateway): share host header parsing)

type SubsystemLogger = ReturnType<typeof createSubsystemLogger>;

const DEVICE_SIGNATURE_SKEW_MS = 10 * 60 * 1000;

<<<<<<< HEAD
<<<<<<< HEAD
function resolveHostName(hostHeader?: string): string {
  const host = (hostHeader ?? "").trim().toLowerCase();
  if (!host) {
    return "";
  }
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end !== -1) {
      return host.slice(1, end);
    }
  }
  const [name] = host.split(":");
  return name ?? "";
}

type AuthProvidedKind = "token" | "password" | "none";

function formatGatewayAuthFailureMessage(params: {
  authMode: ResolvedGatewayAuth["mode"];
  authProvided: AuthProvidedKind;
  reason?: string;
  client?: { id?: string | null; mode?: string | null };
}): string {
  const { authMode, authProvided, reason, client } = params;
  const isCli = isGatewayCliClient(client);
  const isControlUi = client?.id === GATEWAY_CLIENT_IDS.CONTROL_UI;
  const isWebchat = isWebchatClient(client);
  const uiHint = "open a tokenized dashboard URL or paste token in Control UI settings";
  const tokenHint = isCli
    ? "set gateway.remote.token to match gateway.auth.token"
    : isControlUi || isWebchat
      ? uiHint
      : "provide gateway auth token";
  const passwordHint = isCli
    ? "set gateway.remote.password to match gateway.auth.password"
    : isControlUi || isWebchat
      ? "enter the password in Control UI settings"
      : "provide gateway auth password";
  switch (reason) {
    case "token_missing":
      return `unauthorized: gateway token missing (${tokenHint})`;
    case "token_mismatch":
      return `unauthorized: gateway token mismatch (${tokenHint})`;
    case "token_missing_config":
      return "unauthorized: gateway token not configured on gateway (set gateway.auth.token)";
    case "password_missing":
      return `unauthorized: gateway password missing (${passwordHint})`;
    case "password_mismatch":
      return `unauthorized: gateway password mismatch (${passwordHint})`;
    case "password_missing_config":
      return "unauthorized: gateway password not configured on gateway (set gateway.auth.password)";
    case "tailscale_user_missing":
      return "unauthorized: tailscale identity missing (use Tailscale Serve auth or gateway token/password)";
    case "tailscale_proxy_missing":
      return "unauthorized: tailscale proxy headers missing (use Tailscale Serve or gateway token/password)";
    case "tailscale_whois_failed":
      return "unauthorized: tailscale identity check failed (use Tailscale Serve auth or gateway token/password)";
    case "tailscale_user_mismatch":
      return "unauthorized: tailscale identity mismatch (use Tailscale Serve auth or gateway token/password)";
    case "rate_limited":
      return "unauthorized: too many failed authentication attempts (retry later)";
    case "device_token_mismatch":
      return "unauthorized: device token mismatch (rotate/reissue device token)";
    default:
      break;
  }

  if (authMode === "token" && authProvided === "none") {
    return `unauthorized: gateway token missing (${tokenHint})`;
  }
  if (authMode === "password" && authProvided === "none") {
    return `unauthorized: gateway password missing (${passwordHint})`;
  }
  return "unauthorized";
}

=======
>>>>>>> a79c2de95 (refactor(gateway): extract ws auth message helpers)
=======
type ControlUiAuthPolicy = {
  allowInsecureAuthConfigured: boolean;
  dangerouslyDisableDeviceAuth: boolean;
  allowBypass: boolean;
  device: ConnectParams["device"] | null | undefined;
};

function resolveControlUiAuthPolicy(params: {
  isControlUi: boolean;
  controlUiConfig:
    | {
        allowInsecureAuth?: boolean;
        dangerouslyDisableDeviceAuth?: boolean;
      }
    | undefined;
  deviceRaw: ConnectParams["device"] | null | undefined;
}): ControlUiAuthPolicy {
  const allowInsecureAuthConfigured =
    params.isControlUi && params.controlUiConfig?.allowInsecureAuth === true;
  const dangerouslyDisableDeviceAuth =
    params.isControlUi && params.controlUiConfig?.dangerouslyDisableDeviceAuth === true;
  return {
    allowInsecureAuthConfigured,
    dangerouslyDisableDeviceAuth,
    // `allowInsecureAuth` must not bypass secure-context/device-auth requirements.
    allowBypass: dangerouslyDisableDeviceAuth,
    device: dangerouslyDisableDeviceAuth ? null : params.deviceRaw,
  };
}

function shouldSkipControlUiPairing(policy: ControlUiAuthPolicy, sharedAuthOk: boolean): boolean {
  return policy.allowBypass && sharedAuthOk;
}

>>>>>>> 14b0d2b81 (refactor: harden control-ui auth flow and add insecure-flag audit summary)
export function attachGatewayWsMessageHandler(params: {
  socket: WebSocket;
  upgradeReq: IncomingMessage;
  connId: string;
  remoteAddr?: string;
  forwardedFor?: string;
  realIp?: string;
  requestHost?: string;
  requestOrigin?: string;
  requestUserAgent?: string;
  canvasHostUrl?: string;
  connectNonce: string;
  resolvedAuth: ResolvedGatewayAuth;
  /** Optional rate limiter for auth brute-force protection. */
  rateLimiter?: AuthRateLimiter;
  gatewayMethods: string[];
  events: string[];
  extraHandlers: GatewayRequestHandlers;
  buildRequestContext: () => GatewayRequestContext;
  send: (obj: unknown) => void;
  close: (code?: number, reason?: string) => void;
  isClosed: () => boolean;
  clearHandshakeTimer: () => void;
  getClient: () => GatewayWsClient | null;
  setClient: (next: GatewayWsClient) => void;
  setHandshakeState: (state: "pending" | "connected" | "failed") => void;
  setCloseCause: (cause: string, meta?: Record<string, unknown>) => void;
  setLastFrameMeta: (meta: { type?: string; method?: string; id?: string }) => void;
  logGateway: SubsystemLogger;
  logHealth: SubsystemLogger;
  logWsControl: SubsystemLogger;
}) {
  const {
    socket,
    upgradeReq,
    connId,
    remoteAddr,
    forwardedFor,
    realIp,
    requestHost,
    requestOrigin,
    requestUserAgent,
    canvasHostUrl,
    connectNonce,
    resolvedAuth,
    rateLimiter,
    gatewayMethods,
    events,
    extraHandlers,
    buildRequestContext,
    send,
    close,
    isClosed,
    clearHandshakeTimer,
    getClient,
    setClient,
    setHandshakeState,
    setCloseCause,
    setLastFrameMeta,
    logGateway,
    logHealth,
    logWsControl,
  } = params;

  const configSnapshot = loadConfig();
  const trustedProxies = configSnapshot.gateway?.trustedProxies ?? [];
  const allowRealIpFallback = configSnapshot.gateway?.allowRealIpFallback === true;
  const clientIp = resolveClientIp({
    remoteAddr,
    forwardedFor,
    realIp,
    trustedProxies,
    allowRealIpFallback,
  });

  // If proxy headers are present but the remote address isn't trusted, don't treat
  // the connection as local. This prevents auth bypass when running behind a reverse
  // proxy without proper configuration - the proxy's loopback connection would otherwise
  // cause all external requests to be treated as trusted local clients.
  const hasProxyHeaders = Boolean(forwardedFor || realIp);
  const remoteIsTrustedProxy = isTrustedProxyAddress(remoteAddr, trustedProxies);
  const hasUntrustedProxyHeaders = hasProxyHeaders && !remoteIsTrustedProxy;
  const hostName = resolveHostName(requestHost);
  const hostIsLocal = hostName === "localhost" || hostName === "127.0.0.1" || hostName === "::1";
  const hostIsTailscaleServe = hostName.endsWith(".ts.net");
  const hostIsLocalish = hostIsLocal || hostIsTailscaleServe;
  const isLocalClient = isLocalDirectRequest(upgradeReq, trustedProxies, allowRealIpFallback);
  const reportedClientIp =
    isLocalClient || hasUntrustedProxyHeaders
      ? undefined
      : clientIp && !isLoopbackAddress(clientIp)
        ? clientIp
        : undefined;

  if (hasUntrustedProxyHeaders) {
    logWsControl.warn(
      "Proxy headers detected from untrusted address. " +
        "Connection will not be treated as local. " +
        "Configure gateway.trustedProxies to restore local client detection behind your proxy.",
    );
  }
  if (!hostIsLocalish && isLoopbackAddress(remoteAddr) && !hasProxyHeaders) {
    logWsControl.warn(
      "Loopback connection with non-local Host header. " +
        "Treating it as remote. If you're behind a reverse proxy, " +
        "set gateway.trustedProxies and forward X-Forwarded-For/X-Real-IP.",
    );
  }

  const isWebchatConnect = (p: ConnectParams | null | undefined) => isWebchatClient(p?.client);

  socket.on("message", async (data) => {
    if (isClosed()) {
      return;
    }
    const text = rawDataToString(data);
    try {
      const parsed = JSON.parse(text);
      const frameType =
        parsed && typeof parsed === "object" && "type" in parsed
          ? typeof (parsed as { type?: unknown }).type === "string"
            ? String((parsed as { type?: unknown }).type)
            : undefined
          : undefined;
      const frameMethod =
        parsed && typeof parsed === "object" && "method" in parsed
          ? typeof (parsed as { method?: unknown }).method === "string"
            ? String((parsed as { method?: unknown }).method)
            : undefined
          : undefined;
      const frameId =
        parsed && typeof parsed === "object" && "id" in parsed
          ? typeof (parsed as { id?: unknown }).id === "string"
            ? String((parsed as { id?: unknown }).id)
            : undefined
          : undefined;
      if (frameType || frameMethod || frameId) {
        setLastFrameMeta({ type: frameType, method: frameMethod, id: frameId });
      }

      const client = getClient();
      if (!client) {
        // Handshake must be a normal request:
        // { type:"req", method:"connect", params: ConnectParams }.
        const isRequestFrame = validateRequestFrame(parsed);
        if (
          !isRequestFrame ||
          parsed.method !== "connect" ||
          !validateConnectParams(parsed.params)
        ) {
          const handshakeError = isRequestFrame
            ? parsed.method === "connect"
              ? `invalid connect params: ${formatValidationErrors(validateConnectParams.errors)}`
              : "invalid handshake: first request must be connect"
            : "invalid request frame";
          setHandshakeState("failed");
          setCloseCause("invalid-handshake", {
            frameType,
            frameMethod,
            frameId,
            handshakeError,
          });
          if (isRequestFrame) {
            const req = parsed;
            send({
              type: "res",
              id: req.id,
              ok: false,
              error: errorShape(ErrorCodes.INVALID_REQUEST, handshakeError),
            });
          } else {
            logWsControl.warn(
              `invalid handshake conn=${connId} remote=${remoteAddr ?? "?"} fwd=${forwardedFor ?? "n/a"} origin=${requestOrigin ?? "n/a"} host=${requestHost ?? "n/a"} ua=${requestUserAgent ?? "n/a"}`,
            );
          }
          const closeReason = truncateCloseReason(handshakeError || "invalid handshake");
          if (isRequestFrame) {
            queueMicrotask(() => close(1008, closeReason));
          } else {
            close(1008, closeReason);
          }
          return;
        }

        const frame = parsed;
        const connectParams = frame.params as ConnectParams;
        const clientLabel = connectParams.client.displayName ?? connectParams.client.id;
        const clientMeta = {
          client: connectParams.client.id,
          clientDisplayName: connectParams.client.displayName,
          mode: connectParams.client.mode,
          version: connectParams.client.version,
        };
        const markHandshakeFailure = (cause: string, meta?: Record<string, unknown>) => {
          setHandshakeState("failed");
          setCloseCause(cause, { ...meta, ...clientMeta });
        };
        const sendHandshakeErrorResponse = (
          code: Parameters<typeof errorShape>[0],
          message: string,
          options?: Parameters<typeof errorShape>[2],
        ) => {
          send({
            type: "res",
            id: frame.id,
            ok: false,
            error: errorShape(code, message, options),
          });
        };

        // protocol negotiation
        const { minProtocol, maxProtocol } = connectParams;
        if (maxProtocol < PROTOCOL_VERSION || minProtocol > PROTOCOL_VERSION) {
          markHandshakeFailure("protocol-mismatch", {
            minProtocol,
            maxProtocol,
            expectedProtocol: PROTOCOL_VERSION,
          });
          logWsControl.warn(
            `protocol mismatch conn=${connId} remote=${remoteAddr ?? "?"} client=${clientLabel} ${connectParams.client.mode} v${connectParams.client.version}`,
          );
          sendHandshakeErrorResponse(ErrorCodes.INVALID_REQUEST, "protocol mismatch", {
            details: { expectedProtocol: PROTOCOL_VERSION },
          });
          close(1002, "protocol mismatch");
          return;
        }

        const roleRaw = connectParams.role ?? "operator";
        const role = roleRaw === "operator" || roleRaw === "node" ? roleRaw : null;
        if (!role) {
          markHandshakeFailure("invalid-role", {
            role: roleRaw,
          });
          sendHandshakeErrorResponse(ErrorCodes.INVALID_REQUEST, "invalid role");
          close(1008, "invalid role");
          return;
        }
<<<<<<< HEAD
        const requestedScopes = Array.isArray(connectParams.scopes) ? connectParams.scopes : [];
        const scopes =
          requestedScopes.length > 0
            ? requestedScopes
            : role === "operator"
              ? ["operator.read"]
              : [];
=======
        // Default-deny: scopes must be explicit. Empty/missing scopes means no permissions.
        const scopes = Array.isArray(connectParams.scopes) ? connectParams.scopes : [];
>>>>>>> cfd112952 (fix(gateway): default-deny missing connect scopes)
        connectParams.role = role;
        connectParams.scopes = scopes;

<<<<<<< HEAD
=======
        const isControlUi = connectParams.client.id === GATEWAY_CLIENT_IDS.CONTROL_UI;
        const isWebchat = isWebchatConnect(connectParams);
        if (isControlUi || isWebchat) {
          const originCheck = checkBrowserOrigin({
            requestHost,
            origin: requestOrigin,
            allowedOrigins: configSnapshot.gateway?.controlUi?.allowedOrigins,
          });
          if (!originCheck.ok) {
            const errorMessage =
              "origin not allowed (open the Control UI from the gateway host or allow it in gateway.controlUi.allowedOrigins)";
            markHandshakeFailure("origin-mismatch", {
              origin: requestOrigin ?? "n/a",
              host: requestHost ?? "n/a",
              reason: originCheck.reason,
            });
            sendHandshakeErrorResponse(ErrorCodes.INVALID_REQUEST, errorMessage);
            close(1008, truncateCloseReason(errorMessage));
            return;
          }
        }

>>>>>>> adac9cb67 (refactor: dedupe gateway and scheduler test scaffolding)
        const deviceRaw = connectParams.device;
        let devicePublicKey: string | null = null;
        const hasTokenAuth = Boolean(connectParams.auth?.token);
        const hasPasswordAuth = Boolean(connectParams.auth?.password);
        const hasSharedAuth = hasTokenAuth || hasPasswordAuth;
<<<<<<< HEAD
        const isControlUi = connectParams.client.id === GATEWAY_CLIENT_IDS.CONTROL_UI;
        const allowInsecureControlUi =
          isControlUi && configSnapshot.gateway?.controlUi?.allowInsecureAuth === true;
        const disableControlUiDeviceAuth =
          isControlUi && configSnapshot.gateway?.controlUi?.dangerouslyDisableDeviceAuth === true;
<<<<<<< HEAD
        const allowControlUiBypass = allowInsecureControlUi || disableControlUiDeviceAuth;
=======
        // `allowInsecureAuth` must not bypass secure-context/device-auth requirements.
        const allowControlUiBypass = disableControlUiDeviceAuth;
>>>>>>> 99048dbec (fix(gateway): align insecure-auth toggle messaging)
        const device = disableControlUiDeviceAuth ? null : deviceRaw;

        const hasDeviceTokenCandidate = Boolean(connectParams.auth?.token && device);
        let authResult: GatewayAuthResult = await authorizeGatewayConnect({
          auth: resolvedAuth,
          connectAuth: connectParams.auth,
          req: upgradeReq,
          trustedProxies,
          allowTailscaleHeaderAuth: true,
          rateLimiter: hasDeviceTokenCandidate ? undefined : rateLimiter,
          clientIp,
          rateLimitScope: AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET,
=======
        const controlUiAuthPolicy = resolveControlUiAuthPolicy({
          isControlUi,
          controlUiConfig: configSnapshot.gateway?.controlUi,
          deviceRaw,
>>>>>>> 14b0d2b81 (refactor: harden control-ui auth flow and add insecure-flag audit summary)
        });
        const device = controlUiAuthPolicy.device;

        const resolveAuthState = async () => {
          const hasDeviceTokenCandidate = Boolean(connectParams.auth?.token && device);
          let nextAuthResult: GatewayAuthResult = await authorizeWsControlUiGatewayConnect({
            auth: resolvedAuth,
            connectAuth: connectParams.auth,
            req: upgradeReq,
            trustedProxies,
            allowRealIpFallback,
            rateLimiter: hasDeviceTokenCandidate ? undefined : rateLimiter,
            clientIp,
            rateLimitScope: AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET,
          });

          if (
            hasDeviceTokenCandidate &&
            nextAuthResult.ok &&
            rateLimiter &&
            (nextAuthResult.method === "token" || nextAuthResult.method === "password")
          ) {
            const sharedRateCheck = rateLimiter.check(
              clientIp,
              AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET,
            );
            if (!sharedRateCheck.allowed) {
              nextAuthResult = {
                ok: false,
                reason: "rate_limited",
                rateLimited: true,
                retryAfterMs: sharedRateCheck.retryAfterMs,
              };
            } else {
              rateLimiter.reset(clientIp, AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET);
            }
          }

          const nextAuthMethod =
            nextAuthResult.method ?? (resolvedAuth.mode === "password" ? "password" : "token");
          const sharedAuthResult = hasSharedAuth
            ? await authorizeHttpGatewayConnect({
                auth: { ...resolvedAuth, allowTailscale: false },
                connectAuth: connectParams.auth,
                req: upgradeReq,
                trustedProxies,
                allowRealIpFallback,
                // Shared-auth probe only; rate-limit side effects are handled in
                // the primary auth flow (or deferred for device-token candidates).
                rateLimitScope: AUTH_RATE_LIMIT_SCOPE_SHARED_SECRET,
              })
            : null;
          const nextSharedAuthOk =
            sharedAuthResult?.ok === true &&
            (sharedAuthResult.method === "token" || sharedAuthResult.method === "password");

          return {
            authResult: nextAuthResult,
            authOk: nextAuthResult.ok,
            authMethod: nextAuthMethod,
            sharedAuthOk: nextSharedAuthOk,
          };
        };

        let { authResult, authOk, authMethod, sharedAuthOk } = await resolveAuthState();
        const rejectUnauthorized = (failedAuth: GatewayAuthResult) => {
          markHandshakeFailure("unauthorized", {
            authMode: resolvedAuth.mode,
            authProvided: connectParams.auth?.token
              ? "token"
              : connectParams.auth?.password
                ? "password"
                : "none",
            authReason: failedAuth.reason,
            allowTailscale: resolvedAuth.allowTailscale,
          });
          logWsControl.warn(
            `unauthorized conn=${connId} remote=${remoteAddr ?? "?"} client=${clientLabel} ${connectParams.client.mode} v${connectParams.client.version} reason=${failedAuth.reason ?? "unknown"}`,
          );
          const authProvided: AuthProvidedKind = connectParams.auth?.token
            ? "token"
            : connectParams.auth?.password
              ? "password"
              : "none";
          const authMessage = formatGatewayAuthFailureMessage({
            authMode: resolvedAuth.mode,
            authProvided,
            reason: failedAuth.reason,
            client: connectParams.client,
          });
          sendHandshakeErrorResponse(ErrorCodes.INVALID_REQUEST, authMessage);
          close(1008, truncateCloseReason(authMessage));
        };
<<<<<<< HEAD
        if (!device) {
          const canSkipDevice = sharedAuthOk;

          if (isControlUi && !allowControlUiBypass) {
<<<<<<< HEAD
            const errorMessage = "control ui requires HTTPS or localhost (secure context)";
            markHandshakeFailure("control-ui-insecure-auth");
=======
=======
        const clearUnboundScopes = () => {
          if (scopes.length > 0 && !controlUiAuthPolicy.allowBypass) {
            scopes = [];
            connectParams.scopes = scopes;
          }
        };
        const handleMissingDeviceIdentity = (): boolean => {
          if (device) {
            return true;
          }
          clearUnboundScopes();
          const canSkipDevice = role === "operator" && sharedAuthOk;

          if (isControlUi && !controlUiAuthPolicy.allowBypass) {
>>>>>>> 14b0d2b81 (refactor: harden control-ui auth flow and add insecure-flag audit summary)
            const errorMessage =
              "control ui requires device identity (use HTTPS or localhost secure context)";
            markHandshakeFailure("control-ui-insecure-auth", {
              insecureAuthConfigured: controlUiAuthPolicy.allowInsecureAuthConfigured,
            });
>>>>>>> 99048dbec (fix(gateway): align insecure-auth toggle messaging)
            sendHandshakeErrorResponse(ErrorCodes.INVALID_REQUEST, errorMessage);
            close(1008, errorMessage);
            return false;
          }

          // Allow shared-secret authenticated connections (e.g., control-ui) to skip device identity.
          if (!canSkipDevice) {
            if (!authOk && hasSharedAuth) {
              rejectUnauthorized(authResult);
              return false;
            }
            markHandshakeFailure("device-required");
            sendHandshakeErrorResponse(ErrorCodes.NOT_PAIRED, "device identity required");
            close(1008, "device identity required");
            return false;
          }

          return true;
        };
        if (!handleMissingDeviceIdentity()) {
          return;
        }
        if (device) {
          const derivedId = deriveDeviceIdFromPublicKey(device.publicKey);
          if (!derivedId || derivedId !== device.id) {
            setHandshakeState("failed");
            setCloseCause("device-auth-invalid", {
              reason: "device-id-mismatch",
              client: connectParams.client.id,
              deviceId: device.id,
            });
            send({
              type: "res",
              id: frame.id,
              ok: false,
              error: errorShape(ErrorCodes.INVALID_REQUEST, "device identity mismatch"),
            });
            close(1008, "device identity mismatch");
            return;
          }
          const signedAt = device.signedAt;
          if (
            typeof signedAt !== "number" ||
            Math.abs(Date.now() - signedAt) > DEVICE_SIGNATURE_SKEW_MS
          ) {
            setHandshakeState("failed");
            setCloseCause("device-auth-invalid", {
              reason: "device-signature-stale",
              client: connectParams.client.id,
              deviceId: device.id,
            });
            send({
              type: "res",
              id: frame.id,
              ok: false,
              error: errorShape(ErrorCodes.INVALID_REQUEST, "device signature expired"),
            });
            close(1008, "device signature expired");
            return;
          }
          const nonceRequired = !isLocalClient;
          const providedNonce = typeof device.nonce === "string" ? device.nonce.trim() : "";
          if (nonceRequired && !providedNonce) {
            setHandshakeState("failed");
            setCloseCause("device-auth-invalid", {
              reason: "device-nonce-missing",
              client: connectParams.client.id,
              deviceId: device.id,
            });
            send({
              type: "res",
              id: frame.id,
              ok: false,
              error: errorShape(ErrorCodes.INVALID_REQUEST, "device nonce required"),
            });
            close(1008, "device nonce required");
            return;
          }
          if (providedNonce && providedNonce !== connectNonce) {
            setHandshakeState("failed");
            setCloseCause("device-auth-invalid", {
              reason: "device-nonce-mismatch",
              client: connectParams.client.id,
              deviceId: device.id,
            });
            send({
              type: "res",
              id: frame.id,
              ok: false,
              error: errorShape(ErrorCodes.INVALID_REQUEST, "device nonce mismatch"),
            });
            close(1008, "device nonce mismatch");
            return;
          }
          const payload = buildDeviceAuthPayload({
            deviceId: device.id,
            clientId: connectParams.client.id,
            clientMode: connectParams.client.mode,
            role,
            scopes,
            signedAtMs: signedAt,
            token: connectParams.auth?.token ?? null,
            nonce: providedNonce || undefined,
            version: providedNonce ? "v2" : "v1",
          });
          const rejectDeviceSignatureInvalid = () => {
            setHandshakeState("failed");
            setCloseCause("device-auth-invalid", {
              reason: "device-signature",
              client: connectParams.client.id,
              deviceId: device.id,
            });
            send({
              type: "res",
              id: frame.id,
              ok: false,
              error: errorShape(ErrorCodes.INVALID_REQUEST, "device signature invalid"),
            });
            close(1008, "device signature invalid");
          };
          const signatureOk = verifyDeviceSignature(device.publicKey, payload, device.signature);
          const allowLegacy = !nonceRequired && !providedNonce;
          if (!signatureOk && allowLegacy) {
            const legacyPayload = buildDeviceAuthPayload({
              deviceId: device.id,
              clientId: connectParams.client.id,
              clientMode: connectParams.client.mode,
              role,
              scopes,
              signedAtMs: signedAt,
              token: connectParams.auth?.token ?? null,
              version: "v1",
            });
            if (verifyDeviceSignature(device.publicKey, legacyPayload, device.signature)) {
              // accepted legacy loopback signature
            } else {
              rejectDeviceSignatureInvalid();
              return;
            }
          } else if (!signatureOk) {
            rejectDeviceSignatureInvalid();
            return;
          }
          devicePublicKey = normalizeDevicePublicKeyBase64Url(device.publicKey);
          if (!devicePublicKey) {
            setHandshakeState("failed");
            setCloseCause("device-auth-invalid", {
              reason: "device-public-key",
              client: connectParams.client.id,
              deviceId: device.id,
            });
            send({
              type: "res",
              id: frame.id,
              ok: false,
              error: errorShape(ErrorCodes.INVALID_REQUEST, "device public key invalid"),
            });
            close(1008, "device public key invalid");
            return;
          }
        }

        if (!authOk && connectParams.auth?.token && device) {
          if (rateLimiter) {
            const deviceRateCheck = rateLimiter.check(clientIp, AUTH_RATE_LIMIT_SCOPE_DEVICE_TOKEN);
            if (!deviceRateCheck.allowed) {
              authResult = {
                ok: false,
                reason: "rate_limited",
                rateLimited: true,
                retryAfterMs: deviceRateCheck.retryAfterMs,
              };
            }
          }
          if (!authResult.rateLimited) {
            const tokenCheck = await verifyDeviceToken({
              deviceId: device.id,
              token: connectParams.auth.token,
              role,
              scopes,
            });
            if (tokenCheck.ok) {
              authOk = true;
              authMethod = "device-token";
              rateLimiter?.reset(clientIp, AUTH_RATE_LIMIT_SCOPE_DEVICE_TOKEN);
            } else {
              authResult = { ok: false, reason: "device_token_mismatch" };
              rateLimiter?.recordFailure(clientIp, AUTH_RATE_LIMIT_SCOPE_DEVICE_TOKEN);
            }
          }
        }
        if (!authOk) {
          rejectUnauthorized(authResult);
          return;
        }

        const skipPairing = shouldSkipControlUiPairing(controlUiAuthPolicy, sharedAuthOk);
        if (device && devicePublicKey && !skipPairing) {
          const requirePairing = async (reason: string, _paired?: { deviceId: string }) => {
            const pairing = await requestDevicePairing({
              deviceId: device.id,
              publicKey: devicePublicKey,
              displayName: connectParams.client.displayName,
              platform: connectParams.client.platform,
              clientId: connectParams.client.id,
              clientMode: connectParams.client.mode,
              role,
              scopes,
              remoteIp: reportedClientIp,
              silent: isLocalClient,
            });
            const context = buildRequestContext();
            if (pairing.request.silent === true) {
              const approved = await approveDevicePairing(pairing.request.requestId);
              if (approved) {
                logGateway.info(
                  `device pairing auto-approved device=${approved.device.deviceId} role=${approved.device.role ?? "unknown"}`,
                );
                context.broadcast(
                  "device.pair.resolved",
                  {
                    requestId: pairing.request.requestId,
                    deviceId: approved.device.deviceId,
                    decision: "approved",
                    ts: Date.now(),
                  },
                  { dropIfSlow: true },
                );
              }
            } else if (pairing.created) {
              context.broadcast("device.pair.requested", pairing.request, { dropIfSlow: true });
            }
            if (pairing.request.silent !== true) {
              setHandshakeState("failed");
              setCloseCause("pairing-required", {
                deviceId: device.id,
                requestId: pairing.request.requestId,
                reason,
              });
              send({
                type: "res",
                id: frame.id,
                ok: false,
                error: errorShape(ErrorCodes.NOT_PAIRED, "pairing required", {
                  details: { requestId: pairing.request.requestId },
                }),
              });
              close(1008, "pairing required");
              return false;
            }
            return true;
          };

          const paired = await getPairedDevice(device.id);
          const isPaired = paired?.publicKey === devicePublicKey;
          if (!isPaired) {
            const ok = await requirePairing("not-paired");
            if (!ok) {
              return;
            }
          } else {
<<<<<<< HEAD
            const allowedRoles = new Set(
              Array.isArray(paired.roles) ? paired.roles : paired.role ? [paired.role] : [],
            );
            if (allowedRoles.size === 0) {
              const ok = await requirePairing("role-upgrade", paired);
              if (!ok) {
                return;
              }
            } else if (!allowedRoles.has(role)) {
              const ok = await requirePairing("role-upgrade", paired);
              if (!ok) {
                return;
              }
            }

            const pairedScopes = Array.isArray(paired.scopes) ? paired.scopes : [];
            if (scopes.length > 0) {
              if (pairedScopes.length === 0) {
                const ok = await requirePairing("scope-upgrade", paired);
                if (!ok) {
                  return;
                }
              } else {
                const allowedScopes = new Set(pairedScopes);
                const missingScope = scopes.find((scope) => !allowedScopes.has(scope));
                if (missingScope) {
                  const ok = await requirePairing("scope-upgrade", paired);
=======
            const hasLegacyPairedMetadata =
              paired.roles === undefined && paired.scopes === undefined;
            const pairedRoles = Array.isArray(paired.roles)
              ? paired.roles
              : paired.role
                ? [paired.role]
                : [];
            if (!hasLegacyPairedMetadata) {
              const allowedRoles = new Set(pairedRoles);
              if (allowedRoles.size === 0) {
                logUpgradeAudit("role-upgrade", pairedRoles, paired.scopes);
                const ok = await requirePairing("role-upgrade");
                if (!ok) {
                  return;
                }
              } else if (!allowedRoles.has(role)) {
                logUpgradeAudit("role-upgrade", pairedRoles, paired.scopes);
                const ok = await requirePairing("role-upgrade");
                if (!ok) {
                  return;
                }
              }

              const pairedScopes = Array.isArray(paired.scopes) ? paired.scopes : [];
              if (scopes.length > 0) {
                if (pairedScopes.length === 0) {
                  logUpgradeAudit("scope-upgrade", pairedRoles, pairedScopes);
                  const ok = await requirePairing("scope-upgrade");
>>>>>>> 29ad0736f (fix(gateway): tolerate legacy paired metadata in ws upgrade checks (#21447))
                  if (!ok) {
                    return;
                  }
                } else {
                  const scopesAllowed = roleScopesAllow({
                    role,
                    requestedScopes: scopes,
                    allowedScopes: pairedScopes,
                  });
                  if (!scopesAllowed) {
                    logUpgradeAudit("scope-upgrade", pairedRoles, pairedScopes);
                    const ok = await requirePairing("scope-upgrade");
                    if (!ok) {
                      return;
                    }
                  }
                }
              }
            }

            await updatePairedDeviceMetadata(device.id, {
              displayName: connectParams.client.displayName,
              platform: connectParams.client.platform,
              clientId: connectParams.client.id,
              clientMode: connectParams.client.mode,
              role,
              scopes,
              remoteIp: reportedClientIp,
            });
          }
        }

        const deviceToken = device
          ? await ensureDeviceToken({ deviceId: device.id, role, scopes })
          : null;

        if (role === "node") {
          const cfg = loadConfig();
          const allowlist = resolveNodeCommandAllowlist(cfg, {
            platform: connectParams.client.platform,
            deviceFamily: connectParams.client.deviceFamily,
          });
          const declared = Array.isArray(connectParams.commands) ? connectParams.commands : [];
          const filtered = declared
            .map((cmd) => cmd.trim())
            .filter((cmd) => cmd.length > 0 && allowlist.has(cmd));
          connectParams.commands = filtered;
        }

        const shouldTrackPresence = !isGatewayCliClient(connectParams.client);
        const clientId = connectParams.client.id;
        const instanceId = connectParams.client.instanceId;
        const presenceKey = shouldTrackPresence ? (device?.id ?? instanceId ?? connId) : undefined;

        logWs("in", "connect", {
          connId,
          client: connectParams.client.id,
          clientDisplayName: connectParams.client.displayName,
          version: connectParams.client.version,
          mode: connectParams.client.mode,
          clientId,
          platform: connectParams.client.platform,
          auth: authMethod,
        });

        if (isWebchatConnect(connectParams)) {
          logWsControl.info(
            `webchat connected conn=${connId} remote=${remoteAddr ?? "?"} client=${clientLabel} ${connectParams.client.mode} v${connectParams.client.version}`,
          );
        }

        if (presenceKey) {
          upsertPresence(presenceKey, {
            host: connectParams.client.displayName ?? connectParams.client.id ?? os.hostname(),
            ip: isLocalClient ? undefined : reportedClientIp,
            version: connectParams.client.version,
            platform: connectParams.client.platform,
            deviceFamily: connectParams.client.deviceFamily,
            modelIdentifier: connectParams.client.modelIdentifier,
            mode: connectParams.client.mode,
            deviceId: device?.id,
            roles: [role],
            scopes,
            instanceId: device?.id ?? instanceId,
            reason: "connect",
          });
          incrementPresenceVersion();
        }

        const snapshot = buildGatewaySnapshot();
        const cachedHealth = getHealthCache();
        if (cachedHealth) {
          snapshot.health = cachedHealth;
          snapshot.stateVersion.health = getHealthVersion();
        }
        const canvasCapability =
          role === "node" && canvasHostUrl ? mintCanvasCapabilityToken() : undefined;
        const canvasCapabilityExpiresAtMs = canvasCapability
          ? Date.now() + CANVAS_CAPABILITY_TTL_MS
          : undefined;
        const scopedCanvasHostUrl =
          canvasHostUrl && canvasCapability
            ? (buildCanvasScopedHostUrl(canvasHostUrl, canvasCapability) ?? canvasHostUrl)
            : canvasHostUrl;
        const helloOk = {
          type: "hello-ok",
          protocol: PROTOCOL_VERSION,
          server: {
<<<<<<< HEAD
            version: process.env.CLAWDBOT_VERSION ?? process.env.npm_package_version ?? "dev",
=======
            version: resolveRuntimeServiceVersion(process.env, "dev"),
>>>>>>> 07fdceb5f (refactor: centralize presence routing and version precedence coverage (#19609))
            commit: process.env.GIT_COMMIT,
            host: os.hostname(),
            connId,
          },
          features: { methods: gatewayMethods, events },
          snapshot,
          canvasHostUrl: scopedCanvasHostUrl,
          auth: deviceToken
            ? {
                deviceToken: deviceToken.token,
                role: deviceToken.role,
                scopes: deviceToken.scopes,
                issuedAtMs: deviceToken.rotatedAtMs ?? deviceToken.createdAtMs,
              }
            : undefined,
          policy: {
            maxPayload: MAX_PAYLOAD_BYTES,
            maxBufferedBytes: MAX_BUFFERED_BYTES,
            tickIntervalMs: TICK_INTERVAL_MS,
          },
        };

        clearHandshakeTimer();
        const nextClient: GatewayWsClient = {
          socket,
          connect: connectParams,
          connId,
          presenceKey,
          clientIp: reportedClientIp,
          canvasCapability,
          canvasCapabilityExpiresAtMs,
        };
        setClient(nextClient);
        setHandshakeState("connected");
        if (role === "node") {
          const context = buildRequestContext();
          const nodeSession = context.nodeRegistry.register(nextClient, {
            remoteIp: reportedClientIp,
          });
          const instanceIdRaw = connectParams.client.instanceId;
          const instanceId = typeof instanceIdRaw === "string" ? instanceIdRaw.trim() : "";
          const nodeIdsForPairing = new Set<string>([nodeSession.nodeId]);
          if (instanceId) {
            nodeIdsForPairing.add(instanceId);
          }
          for (const nodeId of nodeIdsForPairing) {
            void updatePairedNodeMetadata(nodeId, {
              lastConnectedAtMs: nodeSession.connectedAtMs,
            }).catch((err) =>
              logGateway.warn(`failed to record last connect for ${nodeId}: ${formatForLog(err)}`),
            );
          }
          recordRemoteNodeInfo({
            nodeId: nodeSession.nodeId,
            displayName: nodeSession.displayName,
            platform: nodeSession.platform,
            deviceFamily: nodeSession.deviceFamily,
            commands: nodeSession.commands,
            remoteIp: nodeSession.remoteIp,
          });
          void refreshRemoteNodeBins({
            nodeId: nodeSession.nodeId,
            platform: nodeSession.platform,
            deviceFamily: nodeSession.deviceFamily,
            commands: nodeSession.commands,
            cfg: loadConfig(),
          }).catch((err) =>
            logGateway.warn(
              `remote bin probe failed for ${nodeSession.nodeId}: ${formatForLog(err)}`,
            ),
          );
          void loadVoiceWakeConfig()
            .then((cfg) => {
              context.nodeRegistry.sendEvent(nodeSession.nodeId, "voicewake.changed", {
                triggers: cfg.triggers,
              });
            })
            .catch((err) =>
              logGateway.warn(
                `voicewake snapshot failed for ${nodeSession.nodeId}: ${formatForLog(err)}`,
              ),
            );
        }

        logWs("out", "hello-ok", {
          connId,
          methods: gatewayMethods.length,
          events: events.length,
          presence: snapshot.presence.length,
          stateVersion: snapshot.stateVersion.presence,
        });

        send({ type: "res", id: frame.id, ok: true, payload: helloOk });
        void refreshGatewayHealthSnapshot({ probe: true }).catch((err) =>
          logHealth.error(`post-connect health refresh failed: ${formatError(err)}`),
        );
        return;
      }

      // After handshake, accept only req frames
      if (!validateRequestFrame(parsed)) {
        send({
          type: "res",
          id: (parsed as { id?: unknown })?.id ?? "invalid",
          ok: false,
          error: errorShape(
            ErrorCodes.INVALID_REQUEST,
            `invalid request frame: ${formatValidationErrors(validateRequestFrame.errors)}`,
          ),
        });
        return;
      }
      const req = parsed;
      logWs("in", "req", { connId, id: req.id, method: req.method });
      const respond = (
        ok: boolean,
        payload?: unknown,
        error?: ErrorShape,
        meta?: Record<string, unknown>,
      ) => {
        send({ type: "res", id: req.id, ok, payload, error });
        logWs("out", "res", {
          connId,
          id: req.id,
          ok,
          method: req.method,
          errorCode: error?.code,
          errorMessage: error?.message,
          ...meta,
        });
      };

      void (async () => {
        await handleGatewayRequest({
          req,
          respond,
          client,
          isWebchatConnect,
          extraHandlers,
          context: buildRequestContext(),
        });
      })().catch((err) => {
        logGateway.error(`request handler failed: ${formatForLog(err)}`);
        respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
      });
    } catch (err) {
      logGateway.error(`parse/handle error: ${String(err)}`);
      logWs("out", "parse-error", { connId, error: formatForLog(err) });
      if (!getClient()) {
        close();
      }
    }
  });
}
