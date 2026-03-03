import { describe, expect, it } from "vitest";

import { resolveGatewayListenHosts } from "./net.js";
  pickPrimaryLanIPv4,
  resolveGatewayListenHosts,
} from "./net.js";
>>>>>>> 14fc74200 (fix(security): restrict canvas IP-based auth to private networks (#14661))

describe("resolveGatewayListenHosts", () => {
  it("resolves listen hosts for non-loopback and loopback variants", async () => {
    const cases = [
      {
        name: "non-loopback host passthrough",
        host: "0.0.0.0",
        canBindToHost: async () => {
          throw new Error("should not be called");
        },
        expected: ["0.0.0.0"],
      },
      {
        name: "loopback with IPv6 available",
        host: "127.0.0.1",
        canBindToHost: async () => true,
        expected: ["127.0.0.1", "::1"],
      },
      {
        name: "loopback with IPv6 unavailable",
        host: "127.0.0.1",
        canBindToHost: async () => false,
        expected: ["127.0.0.1"],
      },
    ] as const;

    for (const testCase of cases) {
      const hosts = await resolveGatewayListenHosts(testCase.host, {
        canBindToHost: testCase.canBindToHost,
      });
      expect(hosts, testCase.name).toEqual(testCase.expected);
    }
  });
});

describe("pickPrimaryLanIPv4", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prefers en0, then eth0, then any non-internal IPv4, otherwise undefined", () => {
    const cases = [
      {
        name: "prefers en0",
        interfaces: {
          lo0: [{ address: "127.0.0.1", family: "IPv4", internal: true, netmask: "" }],
          en0: [{ address: "192.168.1.42", family: "IPv4", internal: false, netmask: "" }],
        },
        expected: "192.168.1.42",
      },
      {
        name: "falls back to eth0",
        interfaces: {
          lo: [{ address: "127.0.0.1", family: "IPv4", internal: true, netmask: "" }],
          eth0: [{ address: "10.0.0.5", family: "IPv4", internal: false, netmask: "" }],
        },
        expected: "10.0.0.5",
      },
      {
        name: "falls back to any non-internal interface",
        interfaces: {
          lo: [{ address: "127.0.0.1", family: "IPv4", internal: true, netmask: "" }],
          wlan0: [{ address: "172.16.0.99", family: "IPv4", internal: false, netmask: "" }],
        },
        expected: "172.16.0.99",
      },
      {
        name: "no non-internal interface",
        interfaces: {
          lo: [{ address: "127.0.0.1", family: "IPv4", internal: true, netmask: "" }],
        },
        expected: undefined,
      },
    ] as const;

    for (const testCase of cases) {
      vi.spyOn(os, "networkInterfaces").mockReturnValue(
        testCase.interfaces as unknown as ReturnType<typeof os.networkInterfaces>,
      );
      expect(pickPrimaryLanIPv4(), testCase.name).toBe(testCase.expected);
      vi.restoreAllMocks();
    }
  });
});

describe("isPrivateOrLoopbackAddress", () => {
  it("accepts loopback, private, link-local, and cgnat ranges", () => {
    const accepted = [
      "127.0.0.1",
      "::1",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.254",
      "192.168.0.1",
      "169.254.10.20",
      "100.64.0.1",
      "100.127.255.254",
      "::ffff:100.100.100.100",
      "fc00::1",
      "fd12:3456:789a::1",
      "fe80::1",
      "fe9a::1",
      "febb::1",
    ];
    for (const ip of accepted) {
      expect(isPrivateOrLoopbackAddress(ip)).toBe(true);
    }
  });

  it("rejects public addresses", () => {
    const rejected = ["1.1.1.1", "8.8.8.8", "172.32.0.1", "203.0.113.10", "2001:4860:4860::8888"];
    for (const ip of rejected) {
      expect(isPrivateOrLoopbackAddress(ip)).toBe(false);
    }
  });
});
<<<<<<< HEAD
=======

describe("isSecureWebSocketUrl", () => {
  it("accepts secure websocket/loopback ws URLs and rejects unsafe inputs", () => {
    const cases = [
      { input: "wss://127.0.0.1:18789", expected: true },
      { input: "wss://localhost:18789", expected: true },
      { input: "wss://remote.example.com:18789", expected: true },
      { input: "wss://192.168.1.100:18789", expected: true },
      { input: "ws://127.0.0.1:18789", expected: true },
      { input: "ws://localhost:18789", expected: true },
      { input: "ws://[::1]:18789", expected: true },
      { input: "ws://127.0.0.42:18789", expected: true },
      { input: "ws://remote.example.com:18789", expected: false },
      { input: "ws://192.168.1.100:18789", expected: false },
      { input: "ws://10.0.0.5:18789", expected: false },
      { input: "ws://100.64.0.1:18789", expected: false },
      { input: "not-a-url", expected: false },
      { input: "", expected: false },
      { input: "http://127.0.0.1:18789", expected: false },
      { input: "https://127.0.0.1:18789", expected: false },
    ] as const;

    for (const testCase of cases) {
      expect(isSecureWebSocketUrl(testCase.input), testCase.input).toBe(testCase.expected);
    }
  });
});
>>>>>>> 9edec67a1 (fix(security): block plaintext WebSocket connections to non-loopback addresses (#20803))
