import path from "node:path";
import { fetch as realFetch } from "undici";
<<<<<<< HEAD
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let testPort = 0;
let cdpBaseUrl = "";
let reachable = false;
let cfgAttachOnly = false;
let cfgEvaluateEnabled = true;
let createTargetId: string | null = null;
let prevGatewayPort: string | undefined;

const cdpMocks = vi.hoisted(() => ({
  createTargetViaCdp: vi.fn(async () => {
    throw new Error("cdp disabled");
  }),
  snapshotAria: vi.fn(async () => ({
    nodes: [{ ref: "1", role: "link", name: "x", depth: 0 }],
  })),
}));

const pwMocks = vi.hoisted(() => ({
  armDialogViaPlaywright: vi.fn(async () => {}),
  armFileUploadViaPlaywright: vi.fn(async () => {}),
  clickViaPlaywright: vi.fn(async () => {}),
  closePageViaPlaywright: vi.fn(async () => {}),
  closePlaywrightBrowserConnection: vi.fn(async () => {}),
  downloadViaPlaywright: vi.fn(async () => ({
    url: "https://example.com/report.pdf",
    suggestedFilename: "report.pdf",
    path: "/tmp/report.pdf",
  })),
  dragViaPlaywright: vi.fn(async () => {}),
  evaluateViaPlaywright: vi.fn(async () => "ok"),
  fillFormViaPlaywright: vi.fn(async () => {}),
  getConsoleMessagesViaPlaywright: vi.fn(async () => []),
  hoverViaPlaywright: vi.fn(async () => {}),
  scrollIntoViewViaPlaywright: vi.fn(async () => {}),
  navigateViaPlaywright: vi.fn(async () => ({ url: "https://example.com" })),
  pdfViaPlaywright: vi.fn(async () => ({ buffer: Buffer.from("pdf") })),
  pressKeyViaPlaywright: vi.fn(async () => {}),
  responseBodyViaPlaywright: vi.fn(async () => ({
    url: "https://example.com/api/data",
    status: 200,
    headers: { "content-type": "application/json" },
    body: '{"ok":true}',
  })),
  resizeViewportViaPlaywright: vi.fn(async () => {}),
  selectOptionViaPlaywright: vi.fn(async () => {}),
  setInputFilesViaPlaywright: vi.fn(async () => {}),
  snapshotAiViaPlaywright: vi.fn(async () => ({ snapshot: "ok" })),
  takeScreenshotViaPlaywright: vi.fn(async () => ({
    buffer: Buffer.from("png"),
  })),
  typeViaPlaywright: vi.fn(async () => {}),
  waitForDownloadViaPlaywright: vi.fn(async () => ({
    url: "https://example.com/report.pdf",
    suggestedFilename: "report.pdf",
    path: "/tmp/report.pdf",
  })),
  waitForViaPlaywright: vi.fn(async () => {}),
}));

const chromeUserDataDir = vi.hoisted(() => ({ dir: "/tmp/openclaw" }));

beforeAll(async () => {
  chromeUserDataDir.dir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-chrome-user-data-"));
});

afterAll(async () => {
  await fs.rm(chromeUserDataDir.dir, { recursive: true, force: true });
});

function makeProc(pid = 123) {
  const handlers = new Map<string, Array<(...args: unknown[]) => void>>();
  return {
    pid,
    killed: false,
    exitCode: null as number | null,
    on: (event: string, cb: (...args: unknown[]) => void) => {
      handlers.set(event, [...(handlers.get(event) ?? []), cb]);
      return undefined;
    },
    emitExit: () => {
      for (const cb of handlers.get("exit") ?? []) {
        cb(0);
      }
    },
    kill: () => {
      return true;
    },
  };
}

const proc = makeProc();

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig: () => ({
      browser: {
        enabled: true,
        evaluateEnabled: cfgEvaluateEnabled,
        color: "#FF4500",
        attachOnly: cfgAttachOnly,
        headless: true,
        defaultProfile: "openclaw",
        profiles: {
          openclaw: { cdpPort: testPort + 1, color: "#FF4500" },
        },
      },
    }),
    writeConfigFile: vi.fn(async () => {}),
  };
});

const launchCalls = vi.hoisted(() => [] as Array<{ port: number }>);
vi.mock("./chrome.js", () => ({
  isChromeCdpReady: vi.fn(async () => reachable),
  isChromeReachable: vi.fn(async () => reachable),
  launchOpenClawChrome: vi.fn(async (_resolved: unknown, profile: { cdpPort: number }) => {
    launchCalls.push({ port: profile.cdpPort });
    reachable = true;
    return {
      pid: 123,
      exe: { kind: "chrome", path: "/fake/chrome" },
      userDataDir: chromeUserDataDir.dir,
      cdpPort: profile.cdpPort,
      startedAt: Date.now(),
      proc,
    };
  }),
  resolveOpenClawUserDataDir: vi.fn(() => chromeUserDataDir.dir),
  stopOpenClawChrome: vi.fn(async () => {
    reachable = false;
  }),
}));

vi.mock("./cdp.js", () => ({
  createTargetViaCdp: cdpMocks.createTargetViaCdp,
  normalizeCdpWsUrl: vi.fn((wsUrl: string) => wsUrl),
  snapshotAria: cdpMocks.snapshotAria,
  getHeadersWithAuth: vi.fn(() => ({})),
  appendCdpPath: vi.fn((cdpUrl: string, path: string) => {
    const base = cdpUrl.replace(/\/$/, "");
    const suffix = path.startsWith("/") ? path : `/${path}`;
    return `${base}${suffix}`;
  }),
}));

vi.mock("./pw-ai.js", () => pwMocks);

vi.mock("../media/store.js", () => ({
  ensureMediaDir: vi.fn(async () => {}),
  saveMediaBuffer: vi.fn(async () => ({ path: "/tmp/fake.png" })),
}));

vi.mock("./screenshot.js", () => ({
  DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES: 128,
  DEFAULT_BROWSER_SCREENSHOT_MAX_SIDE: 64,
  normalizeBrowserScreenshot: vi.fn(async (buf: Buffer) => ({
    buffer: buf,
    contentType: "image/png",
  })),
}));

const { startBrowserControlServerFromConfig, stopBrowserControlServer } =
  await import("./server.js");

async function getFreePort(): Promise<number> {
  while (true) {
    const port = await new Promise<number>((resolve, reject) => {
      const s = createServer();
      s.once("error", reject);
      s.listen(0, "127.0.0.1", () => {
        const assigned = (s.address() as AddressInfo).port;
        s.close((err) => (err ? reject(err) : resolve(assigned)));
      });
    });
    if (port < 65535) {
      return port;
    }
  }
}

function makeResponse(
  body: unknown,
  init?: { ok?: boolean; status?: number; text?: string },
): Response {
  const ok = init?.ok ?? true;
  const status = init?.status ?? 200;
  const text = init?.text ?? "";
  return {
    ok,
    status,
    json: async () => body,
    text: async () => text,
  } as unknown as Response;
}
=======
import { describe, expect, it } from "vitest";
import { DEFAULT_UPLOAD_DIR } from "./paths.js";
import {
  installAgentContractHooks,
  postJson,
  startServerAndBase,
} from "./server.agent-contract.test-harness.js";
import {
  getBrowserControlServerTestState,
  getPwMocks,
  setBrowserControlServerEvaluateEnabled,
} from "./server.control-server.test-harness.js";

const state = getBrowserControlServerTestState();
const pwMocks = getPwMocks();
>>>>>>> 186ecd216 (refactor(test): reuse browser control server harness)

describe("browser control server", () => {
  installAgentContractHooks();

  const slowTimeoutMs = process.platform === "win32" ? 40_000 : 20_000;

  it(
    "agent contract: form + layout act commands",
    async () => {
      const base = await startServerAndBase();

      const select = await postJson<{ ok: boolean }>(`${base}/act`, {
        kind: "select",
        ref: "5",
        values: ["a", "b"],
      });
      expect(select.ok).toBe(true);
      expect(pwMocks.selectOptionViaPlaywright).toHaveBeenCalledWith({
        cdpUrl: state.cdpBaseUrl,
        targetId: "abcd1234",
        ref: "5",
        values: ["a", "b"],
      });

      const fill = await postJson<{ ok: boolean }>(`${base}/act`, {
        kind: "fill",
        fields: [{ ref: "6", type: "textbox", value: "hello" }],
      });
      expect(fill.ok).toBe(true);
      expect(pwMocks.fillFormViaPlaywright).toHaveBeenCalledWith({
        cdpUrl: state.cdpBaseUrl,
        targetId: "abcd1234",
        fields: [{ ref: "6", type: "textbox", value: "hello" }],
      });

      const fillWithoutType = await postJson<{ ok: boolean }>(`${base}/act`, {
        kind: "fill",
        fields: [{ ref: "7", value: "world" }],
      });
      expect(fillWithoutType.ok).toBe(true);
      expect(pwMocks.fillFormViaPlaywright).toHaveBeenCalledWith({
        cdpUrl: state.cdpBaseUrl,
        targetId: "abcd1234",
        fields: [{ ref: "7", type: "text", value: "world" }],
      });

      const resize = await postJson<{ ok: boolean }>(`${base}/act`, {
        kind: "resize",
        width: 800,
        height: 600,
      });
      expect(resize.ok).toBe(true);
      expect(pwMocks.resizeViewportViaPlaywright).toHaveBeenCalledWith({
        cdpUrl: state.cdpBaseUrl,
        targetId: "abcd1234",
        width: 800,
        height: 600,
      });

      const wait = await postJson<{ ok: boolean }>(`${base}/act`, {
        kind: "wait",
        timeMs: 5,
      });
      expect(wait.ok).toBe(true);
      expect(pwMocks.waitForViaPlaywright).toHaveBeenCalledWith({
        cdpUrl: state.cdpBaseUrl,
        targetId: "abcd1234",
        timeMs: 5,
        text: undefined,
        textGone: undefined,
      });

      const evalRes = await postJson<{ ok: boolean; result?: string }>(`${base}/act`, {
        kind: "evaluate",
        fn: "() => 1",
      });
      expect(evalRes.ok).toBe(true);
      expect(evalRes.result).toBe("ok");
<<<<<<< HEAD
      expect(pwMocks.evaluateViaPlaywright).toHaveBeenCalledWith({
        cdpUrl: cdpBaseUrl,
        targetId: "abcd1234",
        fn: "() => 1",
        ref: undefined,
      });
=======
      expect(pwMocks.evaluateViaPlaywright).toHaveBeenCalledWith(
        expect.objectContaining({
          cdpUrl: state.cdpBaseUrl,
          targetId: "abcd1234",
          fn: "() => 1",
          ref: undefined,
          signal: expect.any(AbortSignal),
        }),
      );
>>>>>>> 186ecd216 (refactor(test): reuse browser control server harness)
    },
    slowTimeoutMs,
  );

  it(
    "blocks act:evaluate when browser.evaluateEnabled=false",
    async () => {
      setBrowserControlServerEvaluateEnabled(false);
      const base = await startServerAndBase();

      const waitRes = await postJson<{ error?: string }>(`${base}/act`, {
        kind: "wait",
        fn: "() => window.ready === true",
      });
      expect(waitRes.error).toContain("browser.evaluateEnabled=false");
      expect(pwMocks.waitForViaPlaywright).not.toHaveBeenCalled();

      const res = await postJson<{ error?: string }>(`${base}/act`, {
        kind: "evaluate",
        fn: "() => 1",
      });

      expect(res.error).toContain("browser.evaluateEnabled=false");
      expect(pwMocks.evaluateViaPlaywright).not.toHaveBeenCalled();
    },
    slowTimeoutMs,
  );

  it("agent contract: hooks + response + downloads + screenshot", async () => {
    const base = await startServerAndBase();

    const upload = await postJson(`${base}/hooks/file-chooser`, {
      paths: ["/tmp/a.txt"],
      timeoutMs: 1234,
    });
    expect(upload).toMatchObject({ ok: true });
    expect(pwMocks.armFileUploadViaPlaywright).toHaveBeenCalledWith({
      cdpUrl: state.cdpBaseUrl,
      targetId: "abcd1234",
<<<<<<< HEAD
      paths: ["/tmp/a.txt"],
=======
      // The server resolves paths (which adds a drive letter on Windows for `\\tmp\\...` style roots).
      paths: [path.resolve(DEFAULT_UPLOAD_DIR, "a.txt")],
>>>>>>> 1a7e180e6 (refactor(media): normalize inbound MediaType/MediaTypes defaults (#16233))
      timeoutMs: 1234,
    });

    const uploadWithRef = await postJson(`${base}/hooks/file-chooser`, {
      paths: ["/tmp/b.txt"],
      ref: "e12",
    });
    expect(uploadWithRef).toMatchObject({ ok: true });

    const uploadWithInputRef = await postJson(`${base}/hooks/file-chooser`, {
      paths: ["/tmp/c.txt"],
      inputRef: "e99",
    });
    expect(uploadWithInputRef).toMatchObject({ ok: true });

    const uploadWithElement = await postJson(`${base}/hooks/file-chooser`, {
      paths: ["/tmp/d.txt"],
      element: "input[type=file]",
    });
    expect(uploadWithElement).toMatchObject({ ok: true });

    const dialog = await postJson(`${base}/hooks/dialog`, {
      accept: true,
      timeoutMs: 5678,
    });
    expect(dialog).toMatchObject({ ok: true });

    const waitDownload = await postJson(`${base}/wait/download`, {
      path: "/tmp/report.pdf",
      timeoutMs: 1111,
    });
    expect(waitDownload).toMatchObject({ ok: true });

    const download = await postJson(`${base}/download`, {
      ref: "e12",
      path: "/tmp/report.pdf",
    });
    expect(download).toMatchObject({ ok: true });

    const responseBody = await postJson(`${base}/response/body`, {
      url: "**/api/data",
      timeoutMs: 2222,
      maxChars: 10,
    });
    expect(responseBody).toMatchObject({ ok: true });

    const consoleRes = (await realFetch(`${base}/console?level=error`).then((r) => r.json())) as {
      ok: boolean;
      messages?: unknown[];
    };
    expect(consoleRes.ok).toBe(true);
    expect(Array.isArray(consoleRes.messages)).toBe(true);

    const pdf = await postJson<{ ok: boolean; path?: string }>(`${base}/pdf`, {});
    expect(pdf.ok).toBe(true);
    expect(typeof pdf.path).toBe("string");

    const shot = await postJson<{ ok: boolean; path?: string }>(`${base}/screenshot`, {
      element: "body",
      type: "jpeg",
    });
    expect(shot.ok).toBe(true);
    expect(typeof shot.path).toBe("string");
  });

  it("agent contract: stop endpoint", async () => {
    const base = await startServerAndBase();

    const stopped = (await realFetch(`${base}/stop`, {
      method: "POST",
    }).then((r) => r.json())) as { ok: boolean; stopped?: boolean };
    expect(stopped.ok).toBe(true);
    expect(stopped.stopped).toBe(true);
  });
<<<<<<< HEAD
=======

  it("trace stop rejects traversal path outside trace dir", async () => {
    const base = await startServerAndBase();
    const res = await postJson<{ error?: string }>(`${base}/trace/stop`, {
      path: "../../pwned.zip",
    });
    expect(res.error).toContain("Invalid path");
    expect(pwMocks.traceStopViaPlaywright).not.toHaveBeenCalled();
  });

  it("trace stop accepts in-root relative output path", async () => {
    const base = await startServerAndBase();
    const res = await postJson<{ ok?: boolean; path?: string }>(`${base}/trace/stop`, {
      path: "safe-trace.zip",
    });
    expect(res.ok).toBe(true);
    expect(res.path).toContain("safe-trace.zip");
    expect(pwMocks.traceStopViaPlaywright).toHaveBeenCalledWith(
      expect.objectContaining({
        cdpUrl: state.cdpBaseUrl,
        targetId: "abcd1234",
        path: expect.stringContaining("safe-trace.zip"),
      }),
    );
  });

  it("wait/download rejects traversal path outside downloads dir", async () => {
    const base = await startServerAndBase();
    const waitRes = await postJson<{ error?: string }>(`${base}/wait/download`, {
      path: "../../pwned.pdf",
    });
    expect(waitRes.error).toContain("Invalid path");
    expect(pwMocks.waitForDownloadViaPlaywright).not.toHaveBeenCalled();
  });

  it("download rejects traversal path outside downloads dir", async () => {
    const base = await startServerAndBase();
    const downloadRes = await postJson<{ error?: string }>(`${base}/download`, {
      ref: "e12",
      path: "../../pwned.pdf",
    });
    expect(downloadRes.error).toContain("Invalid path");
    expect(pwMocks.downloadViaPlaywright).not.toHaveBeenCalled();
  });

  it("wait/download accepts in-root relative output path", async () => {
    const base = await startServerAndBase();
    const res = await postJson<{ ok?: boolean; download?: { path?: string } }>(
      `${base}/wait/download`,
      {
        path: "safe-wait.pdf",
      },
    );
    expect(res.ok).toBe(true);
    expect(pwMocks.waitForDownloadViaPlaywright).toHaveBeenCalledWith(
      expect.objectContaining({
        cdpUrl: state.cdpBaseUrl,
        targetId: "abcd1234",
        path: expect.stringContaining("safe-wait.pdf"),
      }),
    );
  });

  it("download accepts in-root relative output path", async () => {
    const base = await startServerAndBase();
    const res = await postJson<{ ok?: boolean; download?: { path?: string } }>(`${base}/download`, {
      ref: "e12",
      path: "safe-download.pdf",
    });
    expect(res.ok).toBe(true);
    expect(pwMocks.downloadViaPlaywright).toHaveBeenCalledWith(
      expect.objectContaining({
        cdpUrl: state.cdpBaseUrl,
        targetId: "abcd1234",
        ref: "e12",
        path: expect.stringContaining("safe-download.pdf"),
      }),
    );
  });
>>>>>>> 186ecd216 (refactor(test): reuse browser control server harness)
});
