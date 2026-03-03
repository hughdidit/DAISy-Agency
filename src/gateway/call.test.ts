import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureEnv } from "../test-utils/env.js";
import {
  loadConfigMock as loadConfig,
  pickPrimaryLanIPv4Mock as pickPrimaryLanIPv4,
  pickPrimaryTailnetIPv4Mock as pickPrimaryTailnetIPv4,
  resolveGatewayPortMock as resolveGatewayPort,
} from "./gateway-connection.test-mocks.js";

let lastClientOptions: {
  url?: string;
  token?: string;
  password?: string;
  onHelloOk?: () => void | Promise<void>;
  onClose?: (code: number, reason: string) => void;
} | null = null;
type StartMode = "hello" | "close" | "silent";
let startMode: StartMode = "hello";
let closeCode = 1006;
let closeReason = "";

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig,
    resolveGatewayPort,
  };
});

vi.mock("../infra/tailnet.js", () => ({
  pickPrimaryTailnetIPv4,
}));

vi.mock("./net.js", () => ({
  pickPrimaryLanIPv4,
}));

vi.mock("./client.js", () => ({
  describeGatewayCloseCode: (code: number) => {
    if (code === 1000) {
      return "normal closure";
    }
    if (code === 1006) {
      return "abnormal closure (no close frame)";
    }
    return undefined;
  },
  GatewayClient: class {
    constructor(opts: {
      url?: string;
      token?: string;
      password?: string;
      onHelloOk?: () => void | Promise<void>;
      onClose?: (code: number, reason: string) => void;
    }) {
      lastClientOptions = opts;
    }
    async request() {
      return { ok: true };
    }
    start() {
      if (startMode === "hello") {
        void lastClientOptions?.onHelloOk?.();
      } else if (startMode === "close") {
        lastClientOptions?.onClose?.(closeCode, closeReason);
      }
    }
    stop() {}
  },
}));

const { buildGatewayConnectionDetails, callGateway } = await import("./call.js");

function resetGatewayCallMocks() {
  loadConfig.mockClear();
  resolveGatewayPort.mockClear();
  pickPrimaryTailnetIPv4.mockClear();
  pickPrimaryLanIPv4.mockClear();
  lastClientOptions = null;
  startMode = "hello";
  closeCode = 1006;
  closeReason = "";
}

function setGatewayNetworkDefaults(port = 18789) {
  resolveGatewayPort.mockReturnValue(port);
  pickPrimaryTailnetIPv4.mockReturnValue(undefined);
}

function setLocalLoopbackGatewayConfig(port = 18789) {
  loadConfig.mockReturnValue({ gateway: { mode: "local", bind: "loopback" } });
  setGatewayNetworkDefaults(port);
}

function makeRemotePasswordGatewayConfig(remotePassword: string, localPassword = "from-config") {
  return {
    gateway: {
      mode: "remote",
      remote: { url: "ws://remote.example:18789", password: remotePassword },
      auth: { password: localPassword },
    },
  };
}

describe("callGateway url resolution", () => {
  beforeEach(() => {
    resetGatewayCallMocks();
  });

  it.each([
    {
      label: "keeps loopback when local bind is auto even if tailnet is present",
      tailnetIp: "100.64.0.1",
    },
    {
      label: "falls back to loopback when local bind is auto without tailnet IP",
      tailnetIp: undefined,
    },
  ])("$label", async ({ tailnetIp }) => {
    loadConfig.mockReturnValue({ gateway: { mode: "local", bind: "auto" } });
    resolveGatewayPort.mockReturnValue(18800);
    pickPrimaryTailnetIPv4.mockReturnValue(tailnetIp);

    await callGateway({ method: "health" });

    expect(lastClientOptions?.url).toBe("ws://127.0.0.1:18800");
  });

<<<<<<< HEAD
  it("uses tailnet IP when local bind is tailnet and tailnet is present", async () => {
    loadConfig.mockReturnValue({ gateway: { mode: "local", bind: "tailnet" } });
    resolveGatewayPort.mockReturnValue(18800);
    pickPrimaryTailnetIPv4.mockReturnValue("100.64.0.1");

    await callGateway({ method: "health" });

    expect(lastClientOptions?.url).toBe("ws://100.64.0.1:18800");
  });

  it("uses LAN IP when bind is lan and LAN IP is available", async () => {
      gateway: { mode: "local", bind: "lan", tls: { enabled: true } },
      tailnetIp: undefined,
      lanIp: "192.168.1.42",
      expectedUrl: "wss://127.0.0.1:18800",
    },
    {
      label: "lan without TLS",
      gateway: { mode: "local", bind: "lan" },
      tailnetIp: undefined,
      lanIp: "192.168.1.42",
      expectedUrl: "ws://127.0.0.1:18800",
    },
    {
      label: "lan without discovered LAN IP",
      gateway: { mode: "local", bind: "lan" },
      tailnetIp: undefined,
      lanIp: undefined,
      expectedUrl: "ws://127.0.0.1:18800",
    },
  ])("uses loopback for $label", async ({ gateway, tailnetIp, lanIp, expectedUrl }) => {
    loadConfig.mockReturnValue({ gateway });
    resolveGatewayPort.mockReturnValue(18800);
    pickPrimaryTailnetIPv4.mockReturnValue(tailnetIp);
    pickPrimaryLanIPv4.mockReturnValue(lanIp);

    await callGateway({ method: "health" });

    expect(lastClientOptions?.url).toBe("wss://127.0.0.1:18800");
  });

  it("uses loopback without TLS when bind is lan", async () => {
>>>>>>> 47f397975 (Gateway: force loopback self-connections for local binds)
    loadConfig.mockReturnValue({ gateway: { mode: "local", bind: "lan" } });
    resolveGatewayPort.mockReturnValue(18800);
    pickPrimaryTailnetIPv4.mockReturnValue(undefined);
    pickPrimaryLanIPv4.mockReturnValue("192.168.1.42");

    await callGateway({ method: "health" });

<<<<<<< HEAD
    expect(lastClientOptions?.url).toBe("ws://192.168.1.42:18800");
  });

  it("falls back to loopback when bind is lan but no LAN IP found", async () => {
    loadConfig.mockReturnValue({ gateway: { mode: "local", bind: "lan" } });
    resolveGatewayPort.mockReturnValue(18800);
    pickPrimaryTailnetIPv4.mockReturnValue(undefined);
    pickPrimaryLanIPv4.mockReturnValue(undefined);

    await callGateway({ method: "health" });

    expect(lastClientOptions?.url).toBe("ws://127.0.0.1:18800");
=======
    expect(lastClientOptions?.url).toBe(expectedUrl);
>>>>>>> ba2790222 (test(gateway): dedupe loopback cases and trim setup resets)
  });

  it("uses url override in remote mode even when remote url is missing", async () => {
    loadConfig.mockReturnValue({
      gateway: { mode: "remote", bind: "loopback", remote: {} },
    });
    resolveGatewayPort.mockReturnValue(18789);
    pickPrimaryTailnetIPv4.mockReturnValue(undefined);

    await callGateway({ method: "health", url: "wss://override.example/ws" });

    expect(lastClientOptions?.url).toBe("wss://override.example/ws");
    expect(lastClientOptions?.token).toBe("explicit-token");
  });

  it.each([
    {
      label: "uses least-privilege scopes by default for non-CLI callers",
      call: () => callGateway({ method: "health" }),
      expectedScopes: ["operator.read"],
    },
    {
      label: "keeps legacy admin scopes for explicit CLI callers",
      call: () => callGatewayCli({ method: "health" }),
      expectedScopes: ["operator.admin", "operator.approvals", "operator.pairing"],
    },
  ])("$label", async ({ call, expectedScopes }) => {
    setLocalLoopbackGatewayConfig();
    await call();
    expect(lastClientOptions?.scopes).toEqual(expectedScopes);
  });

  it("passes explicit scopes through, including empty arrays", async () => {
    setLocalLoopbackGatewayConfig();

    await callGatewayScoped({ method: "health", scopes: ["operator.read"] });
    expect(lastClientOptions?.scopes).toEqual(["operator.read"]);

    await callGatewayScoped({ method: "health", scopes: [] });
    expect(lastClientOptions?.scopes).toEqual([]);
  });
});

describe("buildGatewayConnectionDetails", () => {
  beforeEach(() => {
    resetGatewayCallMocks();
  });

  it("uses explicit url overrides and omits bind details", () => {
    setLocalLoopbackGatewayConfig(18800);
    pickPrimaryTailnetIPv4.mockReturnValue("100.64.0.1");

    const details = buildGatewayConnectionDetails({
      url: "wss://example.com/ws",
    });

    expect(details.url).toBe("wss://example.com/ws");
    expect(details.urlSource).toBe("cli --url");
    expect(details.bindDetail).toBeUndefined();
    expect(details.remoteFallbackNote).toBeUndefined();
    expect(details.message).toContain("Gateway target: wss://example.com/ws");
    expect(details.message).toContain("Source: cli --url");
  });

  it("emits a remote fallback note when remote url is missing", () => {
    loadConfig.mockReturnValue({
      gateway: { mode: "remote", bind: "loopback", remote: {} },
    });
    resolveGatewayPort.mockReturnValue(18789);
    pickPrimaryTailnetIPv4.mockReturnValue(undefined);

    const details = buildGatewayConnectionDetails();

    expect(details.url).toBe("ws://127.0.0.1:18789");
    expect(details.urlSource).toBe("missing gateway.remote.url (fallback local)");
    expect(details.bindDetail).toBe("Bind: loopback");
    expect(details.remoteFallbackNote).toContain(
      "gateway.mode=remote but gateway.remote.url is missing",
    );
    expect(details.message).toContain("Gateway target: ws://127.0.0.1:18789");
  });

<<<<<<< HEAD
  it("uses LAN IP and reports lan source when bind is lan", () => {
      gateway: { mode: "local", bind: "lan", tls: { enabled: true } },
      expectedUrl: "wss://127.0.0.1:18800",
    },
    {
      label: "without TLS",
      gateway: { mode: "local", bind: "lan" },
      expectedUrl: "ws://127.0.0.1:18800",
    },
  ])("uses loopback URL for bind=lan $label", ({ gateway, expectedUrl }) => {
    loadConfig.mockReturnValue({ gateway });
    resolveGatewayPort.mockReturnValue(18800);
    pickPrimaryTailnetIPv4.mockReturnValue(undefined);
    pickPrimaryLanIPv4.mockReturnValue("10.0.0.5");

    const details = buildGatewayConnectionDetails();

    expect(details.url).toBe(expectedUrl);
    expect(details.urlSource).toBe("local loopback");
    expect(details.bindDetail).toBe("Bind: lan");
  });

  it("uses loopback URL for bind=lan without TLS", () => {
>>>>>>> 47f397975 (Gateway: force loopback self-connections for local binds)
    loadConfig.mockReturnValue({
      gateway: { mode: "local", bind: "lan" },
    });
    resolveGatewayPort.mockReturnValue(18800);
    pickPrimaryTailnetIPv4.mockReturnValue(undefined);
    pickPrimaryLanIPv4.mockReturnValue("10.0.0.5");

    const details = buildGatewayConnectionDetails();

<<<<<<< HEAD
    expect(details.url).toBe("ws://10.0.0.5:18800");
    expect(details.urlSource).toBe("local lan 10.0.0.5");
    expect(details.bindDetail).toBe("Bind: lan");
  });

=======
>>>>>>> ba2790222 (test(gateway): dedupe loopback cases and trim setup resets)
  it("prefers remote url when configured", () => {
    loadConfig.mockReturnValue({
      gateway: {
        mode: "remote",
        bind: "tailnet",
        remote: { url: "wss://remote.example.com/ws" },
      },
    });
    resolveGatewayPort.mockReturnValue(18800);
    pickPrimaryTailnetIPv4.mockReturnValue("100.64.0.9");

    const details = buildGatewayConnectionDetails();

    expect(details.url).toBe("wss://remote.example.com/ws");
    expect(details.urlSource).toBe("config gateway.remote.url");
    expect(details.bindDetail).toBeUndefined();
    expect(details.remoteFallbackNote).toBeUndefined();
  });

  it("throws for insecure ws:// remote URLs (CWE-319)", () => {
    loadConfig.mockReturnValue({
      gateway: {
        mode: "remote",
        bind: "loopback",
        remote: { url: "ws://remote.example.com:18789" },
      },
    });
    resolveGatewayPort.mockReturnValue(18789);
    pickPrimaryTailnetIPv4.mockReturnValue(undefined);

    let thrown: unknown;
    try {
      buildGatewayConnectionDetails();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain("SECURITY ERROR");
    expect((thrown as Error).message).toContain("plaintext ws://");
    expect((thrown as Error).message).toContain("wss://");
    expect((thrown as Error).message).toContain("Tailscale Serve/Funnel");
    expect((thrown as Error).message).toContain("openclaw doctor --fix");
  });

  it("allows ws:// for loopback addresses in local mode", () => {
    setLocalLoopbackGatewayConfig();

    const details = buildGatewayConnectionDetails();

    expect(details.url).toBe("ws://127.0.0.1:18789");
  });
});

describe("callGateway error details", () => {
  beforeEach(() => {
    resetGatewayCallMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes connection details when the gateway closes", async () => {
    startMode = "close";
    closeCode = 1006;
    closeReason = "";
    setLocalLoopbackGatewayConfig();

    let err: Error | null = null;
    try {
      await callGateway({ method: "health" });
    } catch (caught) {
      err = caught as Error;
    }

    expect(err?.message).toContain("gateway closed (1006");
    expect(err?.message).toContain("Gateway target: ws://127.0.0.1:18789");
    expect(err?.message).toContain("Source: local loopback");
    expect(err?.message).toContain("Bind: loopback");
  });

  it("includes connection details on timeout", async () => {
    startMode = "silent";
    setLocalLoopbackGatewayConfig();

    vi.useFakeTimers();
    let errMessage = "";
    const promise = callGateway({ method: "health", timeoutMs: 5 }).catch((caught) => {
      errMessage = caught instanceof Error ? caught.message : String(caught);
    });

    await vi.advanceTimersByTimeAsync(5);
    await promise;

    expect(errMessage).toContain("gateway timeout after 5ms");
    expect(errMessage).toContain("Gateway target: ws://127.0.0.1:18789");
    expect(errMessage).toContain("Source: local loopback");
    expect(errMessage).toContain("Bind: loopback");
  });

  it("does not overflow very large timeout values", async () => {
    startMode = "silent";
    setLocalLoopbackGatewayConfig();

    vi.useFakeTimers();
    let errMessage = "";
    const promise = callGateway({ method: "health", timeoutMs: 2_592_010_000 }).catch((caught) => {
      errMessage = caught instanceof Error ? caught.message : String(caught);
    });

    await vi.advanceTimersByTimeAsync(1);
    expect(errMessage).toBe("");

    lastClientOptions?.onClose?.(1006, "");
    await promise;

    expect(errMessage).toContain("gateway closed (1006");
  });

  it("fails fast when remote mode is missing remote url", async () => {
    loadConfig.mockReturnValue({
      gateway: { mode: "remote", bind: "loopback", remote: {} },
    });
    await expect(
      callGateway({
        method: "health",
        timeoutMs: 10,
      }),
    ).rejects.toThrow("gateway remote mode misconfigured");
  });
});

describe("callGateway url override auth requirements", () => {
  let envSnapshot: ReturnType<typeof captureEnv>;

  beforeEach(() => {
    envSnapshot = captureEnv(["OPENCLAW_GATEWAY_TOKEN", "OPENCLAW_GATEWAY_PASSWORD"]);
    resetGatewayCallMocks();
    setGatewayNetworkDefaults(18789);
  });

  afterEach(() => {
    envSnapshot.restore();
  });

  it("throws when url override is set without explicit credentials", async () => {
    process.env.OPENCLAW_GATEWAY_TOKEN = "env-token";
    process.env.OPENCLAW_GATEWAY_PASSWORD = "env-password";
    loadConfig.mockReturnValue({
      gateway: {
        mode: "local",
        auth: { token: "local-token", password: "local-password" },
      },
    });

    await expect(
      callGateway({ method: "health", url: "wss://override.example/ws" }),
    ).rejects.toThrow("explicit credentials");
  });
});

describe("callGateway password resolution", () => {
  const originalEnvPassword = process.env.OPENCLAW_GATEWAY_PASSWORD;

  beforeEach(() => {
    envSnapshot = captureEnv(["OPENCLAW_GATEWAY_PASSWORD"]);
    loadConfig.mockReset();
    resolveGatewayPort.mockReset();
    pickPrimaryTailnetIPv4.mockReset();
    pickPrimaryLanIPv4.mockReset();
    lastClientOptions = null;
    startMode = "hello";
    closeCode = 1006;
    closeReason = "";
    delete process.env.OPENCLAW_GATEWAY_PASSWORD;
    resolveGatewayPort.mockReturnValue(18789);
    pickPrimaryTailnetIPv4.mockReturnValue(undefined);
  });

  afterEach(() => {
    if (originalEnvPassword == null) {
      delete process.env.OPENCLAW_GATEWAY_PASSWORD;
    } else {
      process.env.OPENCLAW_GATEWAY_PASSWORD = originalEnvPassword;
    }
  });

  it("uses local config password when env is unset", async () => {
    loadConfig.mockReturnValue({
      gateway: {
        mode: "local",
        bind: "loopback",
        auth: { password: "secret" },
      },
    });

    await callGateway({ method: "health" });

    expect(lastClientOptions?.password).toBe("secret");
  });

  it("prefers env password over local config password", async () => {
    process.env.OPENCLAW_GATEWAY_PASSWORD = "from-env";
    loadConfig.mockReturnValue({
      gateway: {
        mode: "local",
        bind: "loopback",
        auth: { password: "from-config" },
      },
    });

    await callGateway({ method: "health" });

    expect(lastClientOptions?.password).toBe("from-env");
  });

  it("uses remote password in remote mode when env is unset", async () => {
    loadConfig.mockReturnValue(makeRemotePasswordGatewayConfig("remote-secret"));

    await callGateway({ method: "health" });

    expect(lastClientOptions?.password).toBe("remote-secret");
  });

  it("prefers env password over remote password in remote mode", async () => {
    process.env.OPENCLAW_GATEWAY_PASSWORD = "from-env";
    loadConfig.mockReturnValue({
      gateway: {
        mode: "remote",
        remote: { url: "ws://remote.example:18789", password: "remote-secret" },
        auth: { password: "from-config" },
      },
    });

    await callGateway({ method: "health" });

    expect(lastClientOptions?.password).toBe("from-env");
  });
});

describe("callGateway token resolution", () => {
  const originalEnvToken = process.env.OPENCLAW_GATEWAY_TOKEN;

  beforeEach(() => {
    envSnapshot = captureEnv(["OPENCLAW_GATEWAY_TOKEN"]);
    loadConfig.mockReset();
    resolveGatewayPort.mockReset();
    pickPrimaryTailnetIPv4.mockReset();
    pickPrimaryLanIPv4.mockReset();
    lastClientOptions = null;
    startMode = "hello";
    closeCode = 1006;
    closeReason = "";
    delete process.env.OPENCLAW_GATEWAY_TOKEN;
    resolveGatewayPort.mockReturnValue(18789);
    pickPrimaryTailnetIPv4.mockReturnValue(undefined);
    delete process.env.OPENCLAW_GATEWAY_TOKEN;
    setGatewayNetworkDefaults(18789);
>>>>>>> 87ca2a24b (test(gateway): dedupe call gateway test setup)
  });

  afterEach(() => {
    if (originalEnvToken == null) {
      delete process.env.OPENCLAW_GATEWAY_TOKEN;
    } else {
      process.env.OPENCLAW_GATEWAY_TOKEN = originalEnvToken;
    }
  });

  it("uses remote token when remote mode uses url override", async () => {
    process.env.OPENCLAW_GATEWAY_TOKEN = "env-token";
    loadConfig.mockReturnValue({
      gateway: {
        mode: "remote",
        remote: { token: "remote-token" },
        auth: { token: "local-token" },
      },
    });

    await callGateway({ method: "health", url: "wss://override.example/ws" });

    expect(lastClientOptions?.token).toBe("remote-token");
  });
});
