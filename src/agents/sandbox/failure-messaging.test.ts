import { describe, expect, it } from "vitest";
import {
  classifySandboxFailureText,
  formatSandboxFailureMessage,
  sanitizeSandboxFailureCause,
} from "./failure-messaging.js";

describe("sandbox failure messaging", () => {
  it.each([
    {
      failureClass: "runtime-capability" as const,
      expected: "Sandbox runtime capability failure",
    },
    {
      failureClass: "config-error" as const,
      expected: "Sandbox config error",
    },
    {
      failureClass: "policy-block" as const,
      expected: "Sandbox policy block",
    },
    {
      failureClass: "projection-defect" as const,
      expected: "Sandbox projection defect",
    },
    {
      failureClass: "gateway-reachability" as const,
      expected: "Sandbox gateway reachability failure",
    },
    {
      failureClass: "unsupported-host-only" as const,
      expected: "Sandbox unsupported host-only operation",
    },
  ])("formats $failureClass messages deterministically", ({ failureClass, expected }) => {
    const message = formatSandboxFailureMessage({
      failureClass,
      operation: "test operation",
      subject: "test subject",
      detail: "specific detail",
      remediation: "specific fix",
      hint: "openclaw sandbox explain",
    });

    expect(message).toBe(
      `${expected} during test operation (test subject): specific detail. Fix: specific fix. See: openclaw sandbox explain.`,
    );
  });

  it("redacts low-level runtime crash details", () => {
    const raw =
      "runtime/cgo: pthread_create failed: Operation not permitted\n" +
      "SIGABRT: abort\n" +
      "goroutine 1 gp=0xc000002540 m=0 mp=0x56522ed81000 [running]:";

    expect(sanitizeSandboxFailureCause(raw)).toBe("low-level runtime crash details redacted");

    const message = formatSandboxFailureMessage({
      failureClass: "runtime-capability",
      operation: "sandbox startup",
      detail: "Docker CLI could not inspect the sandbox image in the gateway runtime.",
      cause: raw,
    });

    expect(message).toContain("low-level runtime crash details redacted");
    expect(message).not.toContain("pthread_create failed");
    expect(message).not.toContain("goroutine");
  });

  it("does not duplicate punctuation when rendering sanitized causes", () => {
    const message = formatSandboxFailureMessage({
      failureClass: "runtime-capability",
      operation: "sandbox startup",
      detail: "Docker CLI could not inspect the sandbox image in the gateway runtime.",
      cause: "Docker inspect failed.",
    });

    expect(message).toContain("Cause: Docker inspect failed.");
    expect(message).not.toContain("failed..");
  });

  it.each([
    {
      raw: "Failed to inspect sandbox image: runtime/cgo: pthread_create failed: Operation not permitted",
      failureClass: "runtime-capability",
      expected: "Docker CLI could not inspect the sandbox image",
    },
    {
      raw: 'Sandbox mode requires Docker, but the "docker" command was not found in PATH.',
      failureClass: "runtime-capability",
      expected: "Docker CLI is unavailable",
    },
    {
      raw: "Sandbox image not found: ghcr.io/hughdidit/daisy-sandbox:2026.04.26. Build or pull it first.",
      failureClass: "runtime-capability",
      expected: "image ghcr.io/hughdidit/daisy-sandbox:2026.04.26",
    },
    {
      raw: 'Tool "browser" blocked by sandbox tool policy',
      failureClass: "policy-block",
      expected: "Sandbox policy blocked",
    },
    {
      raw: "Host browser control is disabled by sandbox policy.",
      failureClass: "policy-block",
      expected: "Sandbox policy blocked",
    },
    {
      raw: "Readonly projection missing required paths: /workspace/.openclaw-readonly/state/extensions",
      failureClass: "projection-defect",
      expected: "Required projected sandbox material is missing",
    },
    {
      raw: "probe unsupported from readonly sandbox (resolved target is host loopback)",
      failureClass: "gateway-reachability",
      expected: "host-loopback gateway probe is unsupported",
    },
    {
      raw: 'Sandboxed sessions cannot spawn ACP sessions because runtime="acp" runs on the host.',
      failureClass: "unsupported-host-only",
      expected: "depends on host execution",
    },
    {
      raw: "missing-required-env for skill",
      failureClass: "config-error",
      expected: "required sandbox configuration or environment value is missing",
    },
  ])("classifies known sandbox failures: $raw", ({ raw, failureClass, expected }) => {
    const classified = classifySandboxFailureText(raw);

    expect(classified?.failureClass).toBe(failureClass);
    expect(formatSandboxFailureMessage(classified!)).toContain(expected);
  });

  it("sanitizes image-inspect causes after removing the wrapper prefix", () => {
    const classified = classifySandboxFailureText(
      "Failed to inspect sandbox image: Docker inspect timed out.",
    );

    expect(classified?.cause).toBe("Docker inspect timed out.");
    expect(classified?.sanitizedCause).toBe("Docker inspect timed out.");
  });
});
