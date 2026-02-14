import { beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD

=======
import type { GatewayBindMode } from "../config/types.gateway.js";
>>>>>>> b9d14855d (Fix: Force dashboard command to use localhost URL (#16434))
import { dashboardCommand } from "./dashboard.js";

const mocks = vi.hoisted(() => ({
  readConfigFileSnapshot: vi.fn(),
  resolveGatewayPort: vi.fn(),
  resolveControlUiLinks: vi.fn(),
<<<<<<< HEAD
  detectBrowserOpenSupport: vi.fn(),
  openUrl: vi.fn(),
  formatControlUiSshHint: vi.fn(),
=======
>>>>>>> b9d14855d (Fix: Force dashboard command to use localhost URL (#16434))
  copyToClipboard: vi.fn(),
}));

vi.mock("../config/config.js", () => ({
  readConfigFileSnapshot: mocks.readConfigFileSnapshot,
  resolveGatewayPort: mocks.resolveGatewayPort,
}));

vi.mock("./onboard-helpers.js", () => ({
  resolveControlUiLinks: mocks.resolveControlUiLinks,
<<<<<<< HEAD
  detectBrowserOpenSupport: mocks.detectBrowserOpenSupport,
  openUrl: mocks.openUrl,
  formatControlUiSshHint: mocks.formatControlUiSshHint,
=======
  detectBrowserOpenSupport: vi.fn(),
  openUrl: vi.fn(),
  formatControlUiSshHint: vi.fn(() => "ssh hint"),
>>>>>>> b9d14855d (Fix: Force dashboard command to use localhost URL (#16434))
}));

vi.mock("../infra/clipboard.js", () => ({
  copyToClipboard: mocks.copyToClipboard,
}));

const runtime = {
  log: vi.fn(),
  error: vi.fn(),
  exit: vi.fn(),
};

<<<<<<< HEAD
function resetRuntime() {
  runtime.log.mockClear();
  runtime.error.mockClear();
  runtime.exit.mockClear();
}

function mockSnapshot(token = "abc") {
  mocks.readConfigFileSnapshot.mockResolvedValue({
    path: "/tmp/moltbot.json",
=======
function mockSnapshot(params?: {
  token?: string;
  bind?: GatewayBindMode;
  customBindHost?: string;
}) {
  const token = params?.token ?? "abc123";
  mocks.readConfigFileSnapshot.mockResolvedValue({
    path: "/tmp/openclaw.json",
>>>>>>> b9d14855d (Fix: Force dashboard command to use localhost URL (#16434))
    exists: true,
    raw: "{}",
    parsed: {},
    valid: true,
<<<<<<< HEAD
    config: { gateway: { auth: { token } } },
=======
    config: {
      gateway: {
        auth: { token },
        bind: params?.bind,
        customBindHost: params?.customBindHost,
      },
    },
>>>>>>> b9d14855d (Fix: Force dashboard command to use localhost URL (#16434))
    issues: [],
    legacyIssues: [],
  });
  mocks.resolveGatewayPort.mockReturnValue(18789);
  mocks.resolveControlUiLinks.mockReturnValue({
    httpUrl: "http://127.0.0.1:18789/",
    wsUrl: "ws://127.0.0.1:18789",
  });
<<<<<<< HEAD
}

describe("dashboardCommand", () => {
  beforeEach(() => {
    resetRuntime();
    mocks.readConfigFileSnapshot.mockReset();
    mocks.resolveGatewayPort.mockReset();
    mocks.resolveControlUiLinks.mockReset();
    mocks.detectBrowserOpenSupport.mockReset();
    mocks.openUrl.mockReset();
    mocks.formatControlUiSshHint.mockReset();
    mocks.copyToClipboard.mockReset();
  });

  it("opens and copies the dashboard link by default", async () => {
    mockSnapshot("abc123");
    mocks.copyToClipboard.mockResolvedValue(true);
    mocks.detectBrowserOpenSupport.mockResolvedValue({ ok: true });
    mocks.openUrl.mockResolvedValue(true);

    await dashboardCommand(runtime);
=======
  mocks.copyToClipboard.mockResolvedValue(true);
}

describe("dashboardCommand bind selection", () => {
  beforeEach(() => {
    mocks.readConfigFileSnapshot.mockReset();
    mocks.resolveGatewayPort.mockReset();
    mocks.resolveControlUiLinks.mockReset();
    mocks.copyToClipboard.mockReset();
    runtime.log.mockReset();
    runtime.error.mockReset();
    runtime.exit.mockReset();
  });

  it("maps lan bind to loopback for dashboard URLs", async () => {
    mockSnapshot({ bind: "lan" });

    await dashboardCommand(runtime, { noOpen: true });
>>>>>>> b9d14855d (Fix: Force dashboard command to use localhost URL (#16434))

    expect(mocks.resolveControlUiLinks).toHaveBeenCalledWith({
      port: 18789,
      bind: "loopback",
      customBindHost: undefined,
      basePath: undefined,
    });
<<<<<<< HEAD
    expect(mocks.copyToClipboard).toHaveBeenCalledWith("http://127.0.0.1:18789/");
    expect(mocks.openUrl).toHaveBeenCalledWith("http://127.0.0.1:18789/");
    expect(runtime.log).toHaveBeenCalledWith(
      "Opened in your browser. Keep that tab to control Moltbot.",
    );
  });

  it("prints SSH hint when browser cannot open", async () => {
    mockSnapshot("shhhh");
    mocks.copyToClipboard.mockResolvedValue(false);
    mocks.detectBrowserOpenSupport.mockResolvedValue({
      ok: false,
      reason: "ssh",
    });
    mocks.formatControlUiSshHint.mockReturnValue("ssh hint");

    await dashboardCommand(runtime);

    expect(mocks.openUrl).not.toHaveBeenCalled();
    expect(runtime.log).toHaveBeenCalledWith("ssh hint");
  });

  it("respects --no-open and skips browser attempts", async () => {
    mockSnapshot();
    mocks.copyToClipboard.mockResolvedValue(true);

    await dashboardCommand(runtime, { noOpen: true });

    expect(mocks.detectBrowserOpenSupport).not.toHaveBeenCalled();
    expect(mocks.openUrl).not.toHaveBeenCalled();
    expect(runtime.log).toHaveBeenCalledWith(
      "Browser launch disabled (--no-open). Use the URL above.",
    );
=======
  });

  it("defaults to loopback when bind is unset", async () => {
    mockSnapshot();

    await dashboardCommand(runtime, { noOpen: true });

    expect(mocks.resolveControlUiLinks).toHaveBeenCalledWith({
      port: 18789,
      bind: "loopback",
      customBindHost: undefined,
      basePath: undefined,
    });
  });

  it("preserves custom bind mode", async () => {
    mockSnapshot({ bind: "custom", customBindHost: "10.0.0.5" });

    await dashboardCommand(runtime, { noOpen: true });

    expect(mocks.resolveControlUiLinks).toHaveBeenCalledWith({
      port: 18789,
      bind: "custom",
      customBindHost: "10.0.0.5",
      basePath: undefined,
    });
  });

  it("preserves tailnet bind mode", async () => {
    mockSnapshot({ bind: "tailnet" });

    await dashboardCommand(runtime, { noOpen: true });

    expect(mocks.resolveControlUiLinks).toHaveBeenCalledWith({
      port: 18789,
      bind: "tailnet",
      customBindHost: undefined,
      basePath: undefined,
    });
>>>>>>> b9d14855d (Fix: Force dashboard command to use localhost URL (#16434))
  });
});
