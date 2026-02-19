<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { describe, expect, it, vi } from "vitest";

=======
import { afterEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 5d8eef8b3 (perf(test): remove module reloads in browser and embedding suites)
=======
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
>>>>>>> ec399aadd (perf(test): parallelize unit-isolated)
=======
import { afterEach, describe, expect, it, vi } from "vitest";
>>>>>>> 93ca0ed54 (refactor(channels): dedupe transport and gateway test scaffolds)
import type { BrowserServerState } from "./server-context.js";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { BrowserServerState } from "./server-context.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
=======
import type { BrowserServerState } from "./server-context.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { withFetchPreconnect } from "../test-utils/fetch-mock.js";
>>>>>>> cc359d338 (test: add fetch mock helper and reaction coverage)
import * as cdpModule from "./cdp.js";
import * as pwAiModule from "./pw-ai-module.js";
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
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function makeState(
  profile: "remote" | "clawd",
): BrowserServerState & { profiles: Map<string, { lastTargetId?: string | null }> } {
  return {
    // oxlint-disable-next-line typescript/no-explicit-any
    server: null as any,
    port: 0,
    resolved: {
      enabled: true,
      controlPort: 18791,
      cdpProtocol: profile === "remote" ? "https" : "http",
      cdpHost: profile === "remote" ? "browserless.example" : "127.0.0.1",
      cdpIsLoopback: profile !== "remote",
      remoteCdpTimeoutMs: 1500,
      remoteCdpHandshakeTimeoutMs: 3000,
      evaluateEnabled: false,
      extraArgs: [],
      color: "#FF4500",
      headless: true,
      noSandbox: false,
      attachOnly: false,
      ssrfPolicy: { allowPrivateNetwork: true },
      defaultProfile: profile,
      profiles: {
        remote: {
          cdpUrl: "https://browserless.example/chrome?token=abc",
          cdpPort: 443,
          color: "#00AA00",
        },
        clawd: { cdpPort: 18800, color: "#FF4500" },
      },
    },
    profiles: new Map(),
  };
}

function makeUnexpectedFetchMock() {
  return vi.fn(async () => {
    throw new Error("unexpected fetch");
  });
}

function createRemoteRouteHarness(fetchMock?: ReturnType<typeof vi.fn>) {
  const activeFetchMock = fetchMock ?? makeUnexpectedFetchMock();
  global.fetch = withFetchPreconnect(activeFetchMock);
  const state = makeState("remote");
  const ctx = createBrowserRouteContext({ getState: () => state });
  return { state, remote: ctx.forProfile("remote"), fetchMock: activeFetchMock };
}

describe("browser server-context remote profile tab operations", () => {
  it("uses Playwright tab operations when available", async () => {
    const listPagesViaPlaywright = vi.fn(async () => [
      { targetId: "T1", title: "Tab 1", url: "https://example.com", type: "page" },
    ]);
    const createPageViaPlaywright = vi.fn(async () => ({
      targetId: "T2",
      title: "Tab 2",
      url: "http://127.0.0.1:3000",
      type: "page",
    }));
    const closePageByTargetIdViaPlaywright = vi.fn(async () => {});

    vi.spyOn(pwAiModule, "getPwAiModule").mockResolvedValue({
      listPagesViaPlaywright,
      createPageViaPlaywright,
      closePageByTargetIdViaPlaywright,
    } as unknown as Awaited<ReturnType<typeof pwAiModule.getPwAiModule>>);

    const { state, remote, fetchMock } = createRemoteRouteHarness();

    const tabs = await remote.listTabs();
    expect(tabs.map((t) => t.targetId)).toEqual(["T1"]);

    const opened = await remote.openTab("http://127.0.0.1:3000");
    expect(opened.targetId).toBe("T2");
    expect(state.profiles.get("remote")?.lastTargetId).toBe("T2");

    await remote.closeTab("T1");
    expect(closePageByTargetIdViaPlaywright).toHaveBeenCalledWith({
      cdpUrl: "https://browserless.example/chrome?token=abc",
      targetId: "T1",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers lastTargetId for remote profiles when targetId is omitted", async () => {
    const responses = [
      // ensureTabAvailable() calls listTabs twice
      [
        { targetId: "A", title: "A", url: "https://example.com", type: "page" },
        { targetId: "B", title: "B", url: "https://www.example.com", type: "page" },
      ],
      [
        { targetId: "A", title: "A", url: "https://example.com", type: "page" },
        { targetId: "B", title: "B", url: "https://www.example.com", type: "page" },
      ],
      // second ensureTabAvailable() calls listTabs twice, order flips
      [
        { targetId: "B", title: "B", url: "https://www.example.com", type: "page" },
        { targetId: "A", title: "A", url: "https://example.com", type: "page" },
      ],
      [
        { targetId: "B", title: "B", url: "https://www.example.com", type: "page" },
        { targetId: "A", title: "A", url: "https://example.com", type: "page" },
      ],
    ];

    const listPagesViaPlaywright = vi.fn(async () => {
      const next = responses.shift();
      if (!next) {
        throw new Error("no more responses");
      }
      return next;
    });

    vi.spyOn(pwAiModule, "getPwAiModule").mockResolvedValue({
      listPagesViaPlaywright,
      createPageViaPlaywright: vi.fn(async () => {
        throw new Error("unexpected create");
      }),
      closePageByTargetIdViaPlaywright: vi.fn(async () => {
        throw new Error("unexpected close");
      }),
    } as unknown as Awaited<ReturnType<typeof pwAiModule.getPwAiModule>>);

    const { remote } = createRemoteRouteHarness();

    const first = await remote.ensureTabAvailable();
    expect(first.targetId).toBe("A");
    const second = await remote.ensureTabAvailable();
    expect(second.targetId).toBe("A");
  });

  it("uses Playwright focus for remote profiles when available", async () => {
    const listPagesViaPlaywright = vi.fn(async () => [
      { targetId: "T1", title: "Tab 1", url: "https://example.com", type: "page" },
    ]);
    const focusPageByTargetIdViaPlaywright = vi.fn(async () => {});

    vi.spyOn(pwAiModule, "getPwAiModule").mockResolvedValue({
      listPagesViaPlaywright,
      focusPageByTargetIdViaPlaywright,
    } as unknown as Awaited<ReturnType<typeof pwAiModule.getPwAiModule>>);

    const { state, remote, fetchMock } = createRemoteRouteHarness();

    await remote.focusTab("T1");
    expect(focusPageByTargetIdViaPlaywright).toHaveBeenCalledWith({
      cdpUrl: "https://browserless.example/chrome?token=abc",
      targetId: "T1",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.profiles.get("remote")?.lastTargetId).toBe("T1");
  });

  it("does not swallow Playwright runtime errors for remote profiles", async () => {
    vi.spyOn(pwAiModule, "getPwAiModule").mockResolvedValue({
      listPagesViaPlaywright: vi.fn(async () => {
        throw new Error("boom");
      }),
    } as unknown as Awaited<ReturnType<typeof pwAiModule.getPwAiModule>>);

    const { remote, fetchMock } = createRemoteRouteHarness();

    await expect(remote.listTabs()).rejects.toThrow(/boom/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to /json/list when Playwright is not available", async () => {
    vi.spyOn(pwAiModule, "getPwAiModule").mockResolvedValue(null);

    const fetchMock = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (!u.includes("/json/list")) {
        throw new Error(`unexpected fetch: ${u}`);
      }
      return {
        ok: true,
        json: async () => [
          {
            id: "T1",
            title: "Tab 1",
            url: "https://example.com",
            webSocketDebuggerUrl: "wss://browserless.example/devtools/page/T1",
            type: "page",
          },
        ],
      } as unknown as Response;
    });

    const { remote } = createRemoteRouteHarness(fetchMock);

    const tabs = await remote.listTabs();
    expect(tabs.map((t) => t.targetId)).toEqual(["T1"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("browser server-context tab selection state", () => {
  it("updates lastTargetId when openTab is created via CDP", async () => {
    vi.spyOn(cdpModule, "createTargetViaCdp").mockResolvedValue({ targetId: "CREATED" });

    const fetchMock = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (!u.includes("/json/list")) {
        throw new Error(`unexpected fetch: ${u}`);
      }
      return {
        ok: true,
        json: async () => [
          {
            id: "CREATED",
            title: "New Tab",
            url: "http://127.0.0.1:8080",
            webSocketDebuggerUrl: "ws://127.0.0.1/devtools/page/CREATED",
            type: "page",
          },
        ],
      } as unknown as Response;
    });

    global.fetch = withFetchPreconnect(fetchMock);

<<<<<<< HEAD
    const { createBrowserRouteContext } = await import("./server-context.js");
    const state = makeState("clawd");
=======
    const state = makeState("openclaw");
>>>>>>> 5d8eef8b3 (perf(test): remove module reloads in browser and embedding suites)
    const ctx = createBrowserRouteContext({ getState: () => state });
    const clawd = ctx.forProfile("clawd");

<<<<<<< HEAD
    const opened = await clawd.openTab("https://created.example");
=======
    const opened = await openclaw.openTab("http://127.0.0.1:8080");
>>>>>>> 6195660b1 (fix(browser): unify SSRF guard path for navigation)
    expect(opened.targetId).toBe("CREATED");
    expect(state.profiles.get("clawd")?.lastTargetId).toBe("CREATED");
  });
});
