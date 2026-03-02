import { raceWithTimeoutAndAbort } from "./async.js";
import { createFeishuClient, type FeishuClientCredentials } from "./client.js";
import type { FeishuProbeResult } from "./types.js";

<<<<<<< HEAD
export async function probeFeishu(creds?: FeishuClientCredentials): Promise<FeishuProbeResult> {
=======
/** Cache successful probe results to reduce API calls (bot info is static).
 * Gateway health checks call probeFeishu() every minute; without caching this
 * burns ~43,200 calls/month, easily exceeding Feishu's free-tier quota.
 * A 10-min TTL cuts that to ~4,320 calls/month. (#26684) */
const probeCache = new Map<string, { result: FeishuProbeResult; expiresAt: number }>();
const PROBE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PROBE_CACHE_SIZE = 64;
export const FEISHU_PROBE_REQUEST_TIMEOUT_MS = 10_000;

export type ProbeFeishuOptions = {
  timeoutMs?: number;
  abortSignal?: AbortSignal;
};

type FeishuBotInfoResponse = {
  code: number;
  msg?: string;
  bot?: { bot_name?: string; open_id?: string };
  data?: { bot?: { bot_name?: string; open_id?: string } };
};

export async function probeFeishu(
  creds?: FeishuClientCredentials,
  options: ProbeFeishuOptions = {},
): Promise<FeishuProbeResult> {
>>>>>>> f46bd2e0c (refactor(feishu): split monitor startup and transport concerns)
  if (!creds?.appId || !creds?.appSecret) {
    return {
      ok: false,
      error: "missing credentials (appId, appSecret)",
    };
  }
  if (options.abortSignal?.aborted) {
    return {
      ok: false,
      appId: creds.appId,
      error: "probe aborted",
    };
  }

  const timeoutMs = options.timeoutMs ?? FEISHU_PROBE_REQUEST_TIMEOUT_MS;

  try {
    const client = createFeishuClient(creds);
    // Use bot/v3/info API to get bot information
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK generic request method
<<<<<<< HEAD
    const response = await (client as any).request({
      method: "GET",
      url: "/open-apis/bot/v3/info",
      data: {},
    });
=======
    const responseResult = await raceWithTimeoutAndAbort<FeishuBotInfoResponse>(
      (client as any).request({
        method: "GET",
        url: "/open-apis/bot/v3/info",
        data: {},
        timeout: timeoutMs,
      }) as Promise<FeishuBotInfoResponse>,
      {
        timeoutMs,
        abortSignal: options.abortSignal,
      },
    );

    if (responseResult.status === "aborted") {
      return {
        ok: false,
        appId: creds.appId,
        error: "probe aborted",
      };
    }
    if (responseResult.status === "timeout") {
      return {
        ok: false,
        appId: creds.appId,
        error: `probe timed out after ${timeoutMs}ms`,
      };
    }

    const response = responseResult.value;
    if (options.abortSignal?.aborted) {
      return {
        ok: false,
        appId: creds.appId,
        error: "probe aborted",
      };
    }
>>>>>>> f46bd2e0c (refactor(feishu): split monitor startup and transport concerns)

    if (response.code !== 0) {
      return {
        ok: false,
        appId: creds.appId,
        error: `API error: ${response.msg || `code ${response.code}`}`,
      };
    }

    const bot = response.bot || response.data?.bot;
    return {
      ok: true,
      appId: creds.appId,
      botName: bot?.bot_name,
      botOpenId: bot?.open_id,
    };
  } catch (err) {
    return {
      ok: false,
      appId: creds.appId,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
