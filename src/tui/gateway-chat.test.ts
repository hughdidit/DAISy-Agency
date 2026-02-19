import { beforeEach, describe, expect, it, vi } from "vitest";

const loadConfig = vi.fn();
const resolveGatewayPort = vi.fn();

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig,
    resolveGatewayPort,
  };
});

<<<<<<< HEAD
=======
vi.mock("../infra/tailnet.js", () => ({
  pickPrimaryTailnetIPv4,
}));

vi.mock("../gateway/net.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../gateway/net.js")>();
  return {
    ...actual,
    pickPrimaryLanIPv4,
    // Allow all URLs in tests - security validation is tested separately
    isSecureWebSocketUrl: () => true,
  };
});

>>>>>>> 9edec67a1 (fix(security): block plaintext WebSocket connections to non-loopback addresses (#20803))
const { resolveGatewayConnection } = await import("./gateway-chat.js");

describe("resolveGatewayConnection", () => {
  beforeEach(() => {
    loadConfig.mockReset();
    resolveGatewayPort.mockReset();
    resolveGatewayPort.mockReturnValue(18789);
  });

  it("throws when url override is missing explicit credentials", () => {
    loadConfig.mockReturnValue({ gateway: { mode: "local" } });

    expect(() => resolveGatewayConnection({ url: "wss://override.example/ws" })).toThrow(
      "explicit credentials",
    );
  });

  it("uses explicit token when url override is set", () => {
    loadConfig.mockReturnValue({ gateway: { mode: "local" } });

    const result = resolveGatewayConnection({
      url: "wss://override.example/ws",
      token: "explicit-token",
    });

    expect(result).toEqual({
      url: "wss://override.example/ws",
      token: "explicit-token",
      password: undefined,
    });
  });

  it("uses explicit password when url override is set", () => {
    loadConfig.mockReturnValue({ gateway: { mode: "local" } });

    const result = resolveGatewayConnection({
      url: "wss://override.example/ws",
      password: "explicit-password",
    });

    expect(result).toEqual({
      url: "wss://override.example/ws",
      token: undefined,
      password: "explicit-password",
    });
  });
});
