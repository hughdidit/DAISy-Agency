<<<<<<< HEAD
<<<<<<< HEAD
import { describe, expect, it, vi } from "vitest";
<<<<<<< HEAD

=======
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
>>>>>>> ec399aadd (perf(test): parallelize unit-isolated)
=======
import { describe, expect, it, vi } from "vitest";
>>>>>>> 93ca0ed54 (refactor(channels): dedupe transport and gateway test scaffolds)
=======
import { withFetchPreconnect } from "../test-utils/fetch-mock.js";
>>>>>>> cc359d338 (test: add fetch mock helper and reaction coverage)
import type { BrowserServerState } from "./server-context.js";
import "./server-context.chrome-test-harness.js";
import { createBrowserRouteContext } from "./server-context.js";

<<<<<<< HEAD
const chromeUserDataDir = vi.hoisted(() => ({ dir: "/tmp/openclaw" }));

beforeAll(async () => {
  chromeUserDataDir.dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-chrome-user-data-"));
});

afterAll(async () => {
  await fs.rm(chromeUserDataDir.dir, { recursive: true, force: true });
});

vi.mock("./chrome.js", () => ({
  isChromeCdpReady: vi.fn(async () => true),
  isChromeReachable: vi.fn(async () => true),
  launchClawdChrome: vi.fn(async () => {
    throw new Error("unexpected launch");
  }),
<<<<<<< HEAD
  resolveClawdUserDataDir: vi.fn(() => "/tmp/clawd"),
  stopClawdChrome: vi.fn(async () => {}),
=======
  resolveOpenClawUserDataDir: vi.fn(() => chromeUserDataDir.dir),
  stopOpenClawChrome: vi.fn(async () => {}),
>>>>>>> ec399aadd (perf(test): parallelize unit-isolated)
}));

=======
>>>>>>> 93ca0ed54 (refactor(channels): dedupe transport and gateway test scaffolds)
function makeBrowserState(): BrowserServerState {
  return {
    // oxlint-disable-next-line typescript/no-explicit-any
    server: null as any,
    port: 0,
    resolved: {
      enabled: true,
      controlPort: 18791,
      cdpProtocol: "http",
      cdpHost: "127.0.0.1",
      cdpIsLoopback: true,
      evaluateEnabled: false,
      remoteCdpTimeoutMs: 1500,
      remoteCdpHandshakeTimeoutMs: 3000,
      extraArgs: [],
      color: "#FF4500",
      headless: true,
      noSandbox: false,
      attachOnly: false,
      defaultProfile: "chrome",
      profiles: {
        chrome: {
          driver: "extension",
          cdpUrl: "http://127.0.0.1:18792",
          cdpPort: 18792,
          color: "#00AA00",
        },
        openclaw: { cdpPort: 18800, color: "#FF4500" },
      },
    },
    profiles: new Map(),
  };
}

function stubChromeJsonList(responses: unknown[]) {
  const fetchMock = vi.fn();
  const queue = [...responses];

  fetchMock.mockImplementation(async (url: unknown) => {
    const u = String(url);
    if (!u.includes("/json/list")) {
      throw new Error(`unexpected fetch: ${u}`);
    }
    const next = queue.shift();
    if (!next) {
      throw new Error("no more responses");
    }
    return {
      ok: true,
      json: async () => next,
    } as unknown as Response;
  });

  global.fetch = withFetchPreconnect(fetchMock);
  return fetchMock;
}

describe("browser server-context ensureTabAvailable", () => {
  it("sticks to the last selected target when targetId is omitted", async () => {
    // 1st call (snapshot): stable ordering A then B (twice)
    // 2nd call (act): reversed ordering B then A (twice)
    const responses = [
      [
        { id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" },
        { id: "B", type: "page", url: "https://b.example", webSocketDebuggerUrl: "ws://x/b" },
      ],
      [
        { id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" },
        { id: "B", type: "page", url: "https://b.example", webSocketDebuggerUrl: "ws://x/b" },
      ],
      [
        { id: "B", type: "page", url: "https://b.example", webSocketDebuggerUrl: "ws://x/b" },
        { id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" },
      ],
      [
        { id: "B", type: "page", url: "https://b.example", webSocketDebuggerUrl: "ws://x/b" },
        { id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" },
      ],
    ];
<<<<<<< HEAD

    fetchMock.mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (!u.includes("/json/list")) {
        throw new Error(`unexpected fetch: ${u}`);
      }
      const next = responses.shift();
      if (!next) {
        throw new Error("no more responses");
      }
      return {
        ok: true,
        json: async () => next,
      } as unknown as Response;
    });

    global.fetch = fetchMock;

    const state: BrowserServerState = {
      // unused in these tests
      // oxlint-disable-next-line typescript/no-explicit-any
      server: null as any,
      port: 0,
      resolved: {
        enabled: true,
        controlPort: 18791,
        cdpProtocol: "http",
        cdpHost: "127.0.0.1",
        cdpIsLoopback: true,
        color: "#FF4500",
        headless: true,
        noSandbox: false,
        attachOnly: false,
        defaultProfile: "chrome",
        profiles: {
          chrome: {
            driver: "extension",
            cdpUrl: "http://127.0.0.1:18792",
            cdpPort: 18792,
            color: "#00AA00",
          },
          clawd: { cdpPort: 18800, color: "#FF4500" },
        },
      },
      profiles: new Map(),
    };
=======
    stubChromeJsonList(responses);
    const state = makeBrowserState();
>>>>>>> aeb953bdf (refactor(test): reuse chrome json list stubs)

    const ctx = createBrowserRouteContext({
      getState: () => state,
    });

    const chrome = ctx.forProfile("chrome");
    const first = await chrome.ensureTabAvailable();
    expect(first.targetId).toBe("A");
    const second = await chrome.ensureTabAvailable();
    expect(second.targetId).toBe("A");
  });

  it("falls back to the only attached tab when an invalid targetId is provided (extension)", async () => {
    const responses = [
      [{ id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" }],
      [{ id: "A", type: "page", url: "https://a.example", webSocketDebuggerUrl: "ws://x/a" }],
    ];
<<<<<<< HEAD

    fetchMock.mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (!u.includes("/json/list")) {
        throw new Error(`unexpected fetch: ${u}`);
      }
      const next = responses.shift();
      if (!next) {
        throw new Error("no more responses");
      }
      return { ok: true, json: async () => next } as unknown as Response;
    });

    global.fetch = fetchMock;

    const state: BrowserServerState = {
      // oxlint-disable-next-line typescript/no-explicit-any
      server: null as any,
      port: 0,
      resolved: {
        enabled: true,
        controlPort: 18791,
        cdpProtocol: "http",
        cdpHost: "127.0.0.1",
        cdpIsLoopback: true,
        color: "#FF4500",
        headless: true,
        noSandbox: false,
        attachOnly: false,
        defaultProfile: "chrome",
        profiles: {
          chrome: {
            driver: "extension",
            cdpUrl: "http://127.0.0.1:18792",
            cdpPort: 18792,
            color: "#00AA00",
          },
          clawd: { cdpPort: 18800, color: "#FF4500" },
        },
      },
      profiles: new Map(),
    };
=======
    stubChromeJsonList(responses);
    const state = makeBrowserState();
>>>>>>> aeb953bdf (refactor(test): reuse chrome json list stubs)

    const ctx = createBrowserRouteContext({ getState: () => state });
    const chrome = ctx.forProfile("chrome");
    const chosen = await chrome.ensureTabAvailable("NOT_A_TAB");
    expect(chosen.targetId).toBe("A");
  });

  it("returns a descriptive message when no extension tabs are attached", async () => {
    const responses = [[]];
<<<<<<< HEAD
    fetchMock.mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (!u.includes("/json/list")) {
        throw new Error(`unexpected fetch: ${u}`);
      }
      const next = responses.shift();
      if (!next) {
        throw new Error("no more responses");
      }
      return { ok: true, json: async () => next } as unknown as Response;
    });

    global.fetch = fetchMock;

    const state: BrowserServerState = {
      // oxlint-disable-next-line typescript/no-explicit-any
      server: null as any,
      port: 0,
      resolved: {
        enabled: true,
        controlPort: 18791,
        cdpProtocol: "http",
        cdpHost: "127.0.0.1",
        cdpIsLoopback: true,
        color: "#FF4500",
        headless: true,
        noSandbox: false,
        attachOnly: false,
        defaultProfile: "chrome",
        profiles: {
          chrome: {
            driver: "extension",
            cdpUrl: "http://127.0.0.1:18792",
            cdpPort: 18792,
            color: "#00AA00",
          },
          clawd: { cdpPort: 18800, color: "#FF4500" },
        },
      },
      profiles: new Map(),
    };
=======
    stubChromeJsonList(responses);
    const state = makeBrowserState();
>>>>>>> aeb953bdf (refactor(test): reuse chrome json list stubs)

    const ctx = createBrowserRouteContext({ getState: () => state });
    const chrome = ctx.forProfile("chrome");
    await expect(chrome.ensureTabAvailable()).rejects.toThrow(/no attached Chrome tabs/i);
  });
});
