import { describe, expect, it } from "vitest";
import { normalizeFingerprint } from "../tls/fingerprint.js";
import { isPrivateIpAddress } from "./ssrf.js";

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
];

const publicIpCases = [
  "93.184.216.34",
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
