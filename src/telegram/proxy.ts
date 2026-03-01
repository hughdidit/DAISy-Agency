// @ts-nocheck
import { ProxyAgent } from "undici";
import { wrapFetchWithAbortSignal } from "../infra/fetch.js";

export function makeProxyFetch(proxyUrl: string): typeof fetch {
  const agent = new ProxyAgent(proxyUrl);
<<<<<<< HEAD
  return wrapFetchWithAbortSignal((input: RequestInfo | URL, init?: RequestInit) => {
    const base = init ? { ...init } : {};
    return fetch(input, { ...base, dispatcher: agent });
  });
=======
  // undici's fetch is runtime-compatible with global fetch but the types diverge
  // on stream/body internals. Single cast at the boundary keeps the rest type-safe.
  const fetcher = ((input: RequestInfo | URL, init?: RequestInit) =>
    undiciFetch(input as string | URL, {
      ...(init as Record<string, unknown>),
      dispatcher: agent,
    }) as unknown as Promise<Response>) as typeof fetch;
  return wrapFetchWithAbortSignal(fetcher);
>>>>>>> 19ecdce27 (fix: align proxy fetch typing)
}
