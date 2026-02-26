import { describe, expect, it } from "vitest";
import { blockedIpv6MulticastLiterals } from "../../shared/net/ip-test-fixtures.js";
import { normalizeFingerprint } from "../tls/fingerprint.js";
import { isPrivateIpAddress } from "./ssrf.js";

const privateIpCases = [
  "198.18.0.1",
  "198.19.255.254",
  "198.51.100.42",
  "203.0.113.10",
  "192.0.0.8",
  "192.0.2.1",
  "192.88.99.1",
  "224.0.0.1",
  "239.255.255.255",
  "240.0.0.1",
  "255.255.255.255",
  "::ffff:127.0.0.1",
  "::ffff:198.18.0.1",
  "64:ff9b::198.51.100.42",
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
  "2002:c612:0001::",
  "::",
  "::1",
  "fe80::1%lo0",
  "fd00::1",
  "fec0::1",
<<<<<<< HEAD
=======
  ...blockedIpv6MulticastLiterals,
  "2001:db8:1234::5efe:127.0.0.1",
  "2001:db8:1234:1:200:5efe:7f00:1",
>>>>>>> 61b3246a7 (fix(ssrf): unify ipv6 special-use blocking)
];

const publicIpCases = [
  "93.184.216.34",
  "198.17.255.255",
  "198.20.0.1",
  "198.51.99.1",
  "198.51.101.1",
  "203.0.112.1",
  "203.0.114.1",
  "223.255.255.255",
  "2606:4700:4700::1111",
  "2001:db8::1",
  "64:ff9b::8.8.8.8",
  "64:ff9b:1::8.8.8.8",
  "2002:0808:0808::",
  "2001:0000:0:0:0:0:f7f7:f7f7",
];

const malformedIpv6Cases = ["::::", "2001:db8::gggg"];

describe("ssrf ip classification", () => {
  it.each(privateIpCases)("classifies %s as private", (address) => {
    expect(isPrivateIpAddress(address)).toBe(true);
  });

  it.each(publicIpCases)("classifies %s as public", (address) => {
    expect(isPrivateIpAddress(address)).toBe(false);
  });

<<<<<<< HEAD
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
=======
  it.each(malformedIpv6Cases)("fails closed for malformed IPv6 %s", (address) => {
    expect(isPrivateIpAddress(address)).toBe(true);
>>>>>>> e8154c12e (refactor(net): table-drive embedded IPv6 decoding and SSRF tests)
  });
});

describe("normalizeFingerprint", () => {
  it("strips sha256 prefixes and separators", () => {
    expect(normalizeFingerprint("sha256:AA:BB:cc")).toBe("aabbcc");
    expect(normalizeFingerprint("SHA-256 11-22-33")).toBe("112233");
    expect(normalizeFingerprint("aa:bb:cc")).toBe("aabbcc");
  });
});
<<<<<<< HEAD
=======

describe("isBlockedHostnameOrIp", () => {
  it("blocks localhost.localdomain and metadata hostname aliases", () => {
    expect(isBlockedHostnameOrIp("localhost.localdomain")).toBe(true);
    expect(isBlockedHostnameOrIp("metadata.google.internal")).toBe(true);
  });

  it("blocks private transition addresses via shared IP classifier", () => {
    expect(isBlockedHostnameOrIp("2001:db8:1234::5efe:127.0.0.1")).toBe(true);
    expect(isBlockedHostnameOrIp("2001:db8::1")).toBe(false);
  });

  it("blocks IPv4 special-use ranges but allows adjacent public ranges", () => {
    expect(isBlockedHostnameOrIp("198.18.0.1")).toBe(true);
    expect(isBlockedHostnameOrIp("198.20.0.1")).toBe(false);
  });

  it("blocks legacy IPv4 literal representations", () => {
    expect(isBlockedHostnameOrIp("0177.0.0.1")).toBe(true);
    expect(isBlockedHostnameOrIp("8.8.2056")).toBe(true);
    expect(isBlockedHostnameOrIp("127.1")).toBe(true);
    expect(isBlockedHostnameOrIp("2130706433")).toBe(true);
  });
});
>>>>>>> 71bd15bb4 (fix(ssrf): block special-use ipv4 ranges)
