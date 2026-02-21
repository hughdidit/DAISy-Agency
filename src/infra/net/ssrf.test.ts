import { describe, expect, it } from "vitest";
<<<<<<< HEAD
import { isPrivateIpAddress } from "./ssrf.js";
=======
import { normalizeFingerprint } from "../tls/fingerprint.js";
import { isBlockedHostnameOrIp, isPrivateIpAddress } from "./ssrf.js";

const privateIpCases = [
  "::ffff:127.0.0.1",
  "0:0:0:0:0:ffff:7f00:1",
  "0000:0000:0000:0000:0000:ffff:7f00:0001",
  "::127.0.0.1",
  "0:0:0:0:0:0:7f00:1",
  "[0:0:0:0:0:ffff:7f00:1]",
  "::ffff:169.254.169.254",
  "0:0:0:0:0:ffff:a9fe:a9fe",
  "64:ff9b::127.0.0.1",
  "64:ff9b::169.254.169.254",
  "64:ff9b:1::192.168.1.1",
  "64:ff9b:1::10.0.0.1",
  "2002:7f00:0001::",
  "2002:a9fe:a9fe::",
  "2001:0000:0:0:0:0:80ff:fefe",
  "2001:0000:0:0:0:0:3f57:fefe",
  "::",
  "::1",
  "fe80::1%lo0",
  "fd00::1",
  "fec0::1",
  "2001:db8:1234::5efe:127.0.0.1",
  "2001:db8:1234:1:200:5efe:7f00:1",
];

const publicIpCases = [
  "93.184.216.34",
  "2606:4700:4700::1111",
  "2001:db8::1",
  "64:ff9b::8.8.8.8",
  "64:ff9b:1::8.8.8.8",
  "2002:0808:0808::",
  "2001:0000:0:0:0:0:f7f7:f7f7",
  "2001:db8:1234::5efe:8.8.8.8",
  "2001:db8:1234:1:1111:5efe:7f00:1",
];

const malformedIpv6Cases = ["::::", "2001:db8::gggg"];
<<<<<<< HEAD
const malformedIpv4Cases = ["08.0.0.1", "0x7g.0.0.1", "127.0.0.1.", "127..0.1"];
>>>>>>> baa335f25 (fix(security): harden SSRF IPv4 literal parsing)
=======
const unsupportedLegacyIpv4Cases = [
  "0177.0.0.1",
  "0x7f.0.0.1",
  "127.1",
  "2130706433",
  "0x7f000001",
  "017700000001",
  "8.8.2056",
  "0x08080808",
  "08.0.0.1",
  "0x7g.0.0.1",
  "127..0.1",
  "999.1.1.1",
];

const nonIpHostnameCases = ["example.com", "abc.123.example", "1password.com", "0x.example.com"];
>>>>>>> 26c9b37f5 (fix(security): enforce strict IPv4 SSRF literal handling)

describe("ssrf ip classification", () => {
<<<<<<< HEAD
  it("treats IPv4-mapped and IPv4-compatible IPv6 loopback as private", () => {
    expect(isPrivateIpAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("0:0:0:0:0:ffff:7f00:1")).toBe(true);
    expect(isPrivateIpAddress("0000:0000:0000:0000:0000:ffff:7f00:0001")).toBe(true);
    expect(isPrivateIpAddress("::127.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("0:0:0:0:0:0:7f00:1")).toBe(true);
    expect(isPrivateIpAddress("[0:0:0:0:0:ffff:7f00:1]")).toBe(true);
  });

  it("treats IPv4-mapped metadata/link-local as private", () => {
    expect(isPrivateIpAddress("::ffff:169.254.169.254")).toBe(true);
    expect(isPrivateIpAddress("0:0:0:0:0:ffff:a9fe:a9fe")).toBe(true);
  });

<<<<<<< HEAD
  it("treats private IPv4 embedded in NAT64 prefixes as private", () => {
    expect(isPrivateIpAddress("64:ff9b::127.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("64:ff9b::169.254.169.254")).toBe(true);
    expect(isPrivateIpAddress("64:ff9b:1::192.168.1.1")).toBe(true);
    expect(isPrivateIpAddress("64:ff9b:1::10.0.0.1")).toBe(true);
  });

  it("treats private IPv4 embedded in 6to4 and Teredo prefixes as private", () => {
    expect(isPrivateIpAddress("2002:7f00:0001::")).toBe(true);
    expect(isPrivateIpAddress("2002:a9fe:a9fe::")).toBe(true);
    expect(isPrivateIpAddress("2001:0000:0:0:0:0:80ff:fefe")).toBe(true);
    expect(isPrivateIpAddress("2001:0000:0:0:0:0:3f57:fefe")).toBe(true);
  });

  it("treats common IPv6 private/internal ranges as private", () => {
    expect(isPrivateIpAddress("::")).toBe(true);
    expect(isPrivateIpAddress("::1")).toBe(true);
    expect(isPrivateIpAddress("fe80::1%lo0")).toBe(true);
    expect(isPrivateIpAddress("fd00::1")).toBe(true);
    expect(isPrivateIpAddress("fec0::1")).toBe(true);
  });

  it("does not classify public IPs as private", () => {
    expect(isPrivateIpAddress("93.184.216.34")).toBe(false);
    expect(isPrivateIpAddress("2606:4700:4700::1111")).toBe(false);
    expect(isPrivateIpAddress("2001:db8::1")).toBe(false);
    expect(isPrivateIpAddress("64:ff9b::8.8.8.8")).toBe(false);
    expect(isPrivateIpAddress("64:ff9b:1::8.8.8.8")).toBe(false);
    expect(isPrivateIpAddress("2002:0808:0808::")).toBe(false);
    expect(isPrivateIpAddress("2001:0000:0:0:0:0:f7f7:f7f7")).toBe(false);
  });

  it("fails closed for malformed IPv6 input", () => {
    expect(isPrivateIpAddress("::::")).toBe(true);
    expect(isPrivateIpAddress("2001:db8::gggg")).toBe(true);
=======
  it.each(malformedIpv6Cases)("fails closed for malformed IPv6 %s", (address) => {
    expect(isPrivateIpAddress(address)).toBe(true);
  });

  it.each(unsupportedLegacyIpv4Cases)(
    "fails closed for unsupported legacy IPv4 literal %s",
    (address) => {
=======
  it("classifies blocked ip literals as private", () => {
    const blockedCases = [...privateIpCases, ...malformedIpv6Cases, ...unsupportedLegacyIpv4Cases];
    for (const address of blockedCases) {
>>>>>>> cc2ff6894 (test: optimize gateway infra memory and security coverage)
      expect(isPrivateIpAddress(address)).toBe(true);
    }
  });

  it("classifies public ip literals as non-private", () => {
    for (const address of publicIpCases) {
      expect(isPrivateIpAddress(address)).toBe(false);
    }
  });

  it("does not treat hostnames as ip literals", () => {
    for (const hostname of nonIpHostnameCases) {
      expect(isPrivateIpAddress(hostname)).toBe(false);
    }
  });
});

describe("normalizeFingerprint", () => {
  it("strips sha256 prefixes and separators", () => {
    expect(normalizeFingerprint("sha256:AA:BB:cc")).toBe("aabbcc");
    expect(normalizeFingerprint("SHA-256 11-22-33")).toBe("112233");
    expect(normalizeFingerprint("aa:bb:cc")).toBe("aabbcc");
  });
});

describe("isBlockedHostnameOrIp", () => {
  it("blocks localhost.localdomain and metadata hostname aliases", () => {
    expect(isBlockedHostnameOrIp("localhost.localdomain")).toBe(true);
    expect(isBlockedHostnameOrIp("metadata.google.internal")).toBe(true);
  });

  it("blocks private transition addresses via shared IP classifier", () => {
    expect(isBlockedHostnameOrIp("2001:db8:1234::5efe:127.0.0.1")).toBe(true);
    expect(isBlockedHostnameOrIp("2001:db8::1")).toBe(false);
>>>>>>> baa335f25 (fix(security): harden SSRF IPv4 literal parsing)
  });

  it("blocks legacy IPv4 literal representations", () => {
    expect(isBlockedHostnameOrIp("0177.0.0.1")).toBe(true);
    expect(isBlockedHostnameOrIp("8.8.2056")).toBe(true);
    expect(isBlockedHostnameOrIp("127.1")).toBe(true);
    expect(isBlockedHostnameOrIp("2130706433")).toBe(true);
  });
});
