<<<<<<< HEAD
import { describe, expect, it } from "vitest";

import { resolveGatewayListenHosts } from "./net.js";
=======
import os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPrivateOrLoopbackAddress,
<<<<<<< HEAD
=======
  isSecureWebSocketUrl,
  isTrustedProxyAddress,
>>>>>>> 9edec67a1 (fix(security): block plaintext WebSocket connections to non-loopback addresses (#20803))
  pickPrimaryLanIPv4,
  resolveGatewayListenHosts,
} from "./net.js";
>>>>>>> 14fc74200 (fix(security): restrict canvas IP-based auth to private networks (#14661))

describe("resolveGatewayListenHosts", () => {
  it("returns the input host when not loopback", async () => {
    const hosts = await resolveGatewayListenHosts("0.0.0.0", {
      canBindToHost: async () => {
        throw new Error("should not be called");
      },
    });
    expect(hosts).toEqual(["0.0.0.0"]);
  });

  it("adds ::1 when IPv6 loopback is available", async () => {
    const hosts = await resolveGatewayListenHosts("127.0.0.1", {
      canBindToHost: async () => true,
    });
    expect(hosts).toEqual(["127.0.0.1", "::1"]);
  });

  it("keeps only IPv4 loopback when IPv6 is unavailable", async () => {
    const hosts = await resolveGatewayListenHosts("127.0.0.1", {
      canBindToHost: async () => false,
    });
    expect(hosts).toEqual(["127.0.0.1"]);
  });
});
<<<<<<< HEAD
=======

describe("pickPrimaryLanIPv4", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns en0 IPv4 address when available", () => {
    vi.spyOn(os, "networkInterfaces").mockReturnValue({
      lo0: [
        { address: "127.0.0.1", family: "IPv4", internal: true, netmask: "" },
      ] as unknown as os.NetworkInterfaceInfo[],
      en0: [
        { address: "192.168.1.42", family: "IPv4", internal: false, netmask: "" },
      ] as unknown as os.NetworkInterfaceInfo[],
    });
    expect(pickPrimaryLanIPv4()).toBe("192.168.1.42");
  });

  it("returns eth0 IPv4 address when en0 is absent", () => {
    vi.spyOn(os, "networkInterfaces").mockReturnValue({
      lo: [
        { address: "127.0.0.1", family: "IPv4", internal: true, netmask: "" },
      ] as unknown as os.NetworkInterfaceInfo[],
      eth0: [
        { address: "10.0.0.5", family: "IPv4", internal: false, netmask: "" },
      ] as unknown as os.NetworkInterfaceInfo[],
    });
    expect(pickPrimaryLanIPv4()).toBe("10.0.0.5");
  });

  it("falls back to any non-internal IPv4 interface", () => {
    vi.spyOn(os, "networkInterfaces").mockReturnValue({
      lo: [
        { address: "127.0.0.1", family: "IPv4", internal: true, netmask: "" },
      ] as unknown as os.NetworkInterfaceInfo[],
      wlan0: [
        { address: "172.16.0.99", family: "IPv4", internal: false, netmask: "" },
      ] as unknown as os.NetworkInterfaceInfo[],
    });
    expect(pickPrimaryLanIPv4()).toBe("172.16.0.99");
  });

  it("returns undefined when only internal interfaces exist", () => {
    vi.spyOn(os, "networkInterfaces").mockReturnValue({
      lo: [
        { address: "127.0.0.1", family: "IPv4", internal: true, netmask: "" },
      ] as unknown as os.NetworkInterfaceInfo[],
    });
    expect(pickPrimaryLanIPv4()).toBeUndefined();
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
>>>>>>> 14fc74200 (fix(security): restrict canvas IP-based auth to private networks (#14661))
=======

describe("isSecureWebSocketUrl", () => {
  describe("wss:// (TLS) URLs", () => {
    it("returns true for wss:// regardless of host", () => {
      expect(isSecureWebSocketUrl("wss://127.0.0.1:18789")).toBe(true);
      expect(isSecureWebSocketUrl("wss://localhost:18789")).toBe(true);
      expect(isSecureWebSocketUrl("wss://remote.example.com:18789")).toBe(true);
      expect(isSecureWebSocketUrl("wss://192.168.1.100:18789")).toBe(true);
    });
  });

  describe("ws:// (plaintext) URLs", () => {
    it("returns true for ws:// to loopback addresses", () => {
      expect(isSecureWebSocketUrl("ws://127.0.0.1:18789")).toBe(true);
      expect(isSecureWebSocketUrl("ws://localhost:18789")).toBe(true);
      expect(isSecureWebSocketUrl("ws://[::1]:18789")).toBe(true);
      expect(isSecureWebSocketUrl("ws://127.0.0.42:18789")).toBe(true);
    });

    it("returns false for ws:// to non-loopback addresses (CWE-319)", () => {
      expect(isSecureWebSocketUrl("ws://remote.example.com:18789")).toBe(false);
      expect(isSecureWebSocketUrl("ws://192.168.1.100:18789")).toBe(false);
      expect(isSecureWebSocketUrl("ws://10.0.0.5:18789")).toBe(false);
      expect(isSecureWebSocketUrl("ws://100.64.0.1:18789")).toBe(false);
    });
  });

  describe("invalid URLs", () => {
    it("returns false for invalid URLs", () => {
      expect(isSecureWebSocketUrl("not-a-url")).toBe(false);
      expect(isSecureWebSocketUrl("")).toBe(false);
    });

    it("returns false for non-WebSocket protocols", () => {
      expect(isSecureWebSocketUrl("http://127.0.0.1:18789")).toBe(false);
      expect(isSecureWebSocketUrl("https://127.0.0.1:18789")).toBe(false);
    });
  });
});
>>>>>>> 9edec67a1 (fix(security): block plaintext WebSocket connections to non-loopback addresses (#20803))
