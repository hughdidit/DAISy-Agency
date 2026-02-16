<<<<<<< HEAD
=======
import type { GuardedFetchResult } from "../../infra/net/fetch-guard.js";
import type { LookupFn, SsrFPolicy } from "../../infra/net/ssrf.js";
import { fetchWithSsrFGuard } from "../../infra/net/fetch-guard.js";
export { fetchWithTimeout } from "../../utils/fetch-timeout.js";

>>>>>>> a26670a2f (refactor: consolidate fetchWithTimeout into shared utility)
const MAX_ERROR_CHARS = 300;

export function normalizeBaseUrl(baseUrl: string | undefined, fallback: string): string {
  const raw = baseUrl?.trim() || fallback;
  return raw.replace(/\/+$/, "");
}

<<<<<<< HEAD
export async function fetchWithTimeout(
=======
export async function fetchWithTimeoutGuarded(
>>>>>>> a26670a2f (refactor: consolidate fetchWithTimeout into shared utility)
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetchFn: typeof fetch,
<<<<<<< HEAD
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
=======
  options?: {
    ssrfPolicy?: SsrFPolicy;
    lookupFn?: LookupFn;
    pinDns?: boolean;
  },
): Promise<GuardedFetchResult> {
  return await fetchWithSsrFGuard({
    url,
    fetchImpl: fetchFn,
    init,
    timeoutMs,
    policy: options?.ssrfPolicy,
    lookupFn: options?.lookupFn,
    pinDns: options?.pinDns,
  });
>>>>>>> a26670a2f (refactor: consolidate fetchWithTimeout into shared utility)
}

export async function readErrorResponse(res: Response): Promise<string | undefined> {
  try {
    const text = await res.text();
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (!collapsed) {
      return undefined;
    }
    if (collapsed.length <= MAX_ERROR_CHARS) {
      return collapsed;
    }
    return `${collapsed.slice(0, MAX_ERROR_CHARS)}…`;
  } catch {
    return undefined;
  }
}

export async function assertOkOrThrowHttpError(res: Response, label: string): Promise<void> {
  if (res.ok) {
    return;
  }
  const detail = await readErrorResponse(res);
  const suffix = detail ? `: ${detail}` : "";
  throw new Error(`${label} (HTTP ${res.status})${suffix}`);
}
