import { describe, expect, it } from "vitest";
import {
  DEFAULT_SANDBOX_BROWSER_IMAGE,
  DEFAULT_SANDBOX_COMMON_IMAGE,
  DEFAULT_SANDBOX_IMAGE,
} from "./constants.js";
import {
  resolveSandboxRuntimeCapabilitySupport,
  resolveSandboxRuntimeProfile,
  resolveSandboxRuntimeSkillSupport,
} from "./runtime-profile-resolution.js";

function createSandboxConfig() {
  return {
    mode: "all" as const,
    scope: "session" as const,
    profile: "coding-base" as const,
    workspaceAccess: "rw" as const,
    workspaceRoot: "/tmp/sandboxes",
    docker: {
      image: DEFAULT_SANDBOX_IMAGE,
      containerPrefix: "openclaw-sbx-",
      workdir: "/workspace",
      readOnlyRoot: true,
      tmpfs: ["/tmp"],
      network: "none",
      capDrop: ["ALL"],
      env: { LANG: "C.UTF-8" },
    },
    browser: {
      enabled: false,
      image: DEFAULT_SANDBOX_BROWSER_IMAGE,
      containerPrefix: "openclaw-sbx-browser-",
      network: "openclaw-sandbox-browser",
      cdpPort: 9222,
      vncPort: 5900,
      noVncPort: 6080,
      headless: false,
      enableNoVnc: true,
      allowHostControl: false,
      autoStart: true,
      autoStartTimeoutMs: 12000,
    },
    tools: {
      allow: [],
      deny: [],
    },
    prune: {
      idleHours: 24,
      maxAgeDays: 7,
    },
  };
}

describe("runtime profile resolution", () => {
  it("maps the default sandbox image to coding-base official support", () => {
    const resolved = resolveSandboxRuntimeProfile({
      mode: "gateway",
      sandboxConfig: createSandboxConfig(),
    });

    expect(resolved.declaredProfileId).toBe("coding-base");
    expect(resolved.supportStatus).toBe("official");
    expect(resolved.declaredImage).toBe(DEFAULT_SANDBOX_IMAGE);
    expect(resolved.matchedImage).toBe(DEFAULT_SANDBOX_IMAGE);
    expect(resolved.reasonCodes).toEqual([]);
  });

  it("maps the common sandbox image to coding-extended official support", () => {
    const resolved = resolveSandboxRuntimeProfile({
      mode: "gateway",
      sandboxConfig: {
        ...createSandboxConfig(),
        profile: "coding-extended",
        docker: {
          ...createSandboxConfig().docker,
          image: DEFAULT_SANDBOX_COMMON_IMAGE,
        },
      },
    });

    expect(resolved.declaredProfileId).toBe("coding-extended");
    expect(resolved.supportStatus).toBe("official");
    expect(resolved.matchedImage).toBe(DEFAULT_SANDBOX_COMMON_IMAGE);
  });

  it("treats readonly mode as a synthetic ops-readonly runtime", () => {
    const resolved = resolveSandboxRuntimeProfile({
      mode: "readonly-sandbox",
      sandboxConfig: createSandboxConfig(),
    });

    expect(resolved.declaredProfileId).toBe("ops-readonly");
    expect(resolved.supportStatus).toBe("synthetic-readonly");
    expect(resolved.declaredImage).toBeUndefined();
  });

  it("represents custom images explicitly instead of promoting them to official support", () => {
    const resolved = resolveSandboxRuntimeProfile({
      mode: "gateway",
      sandboxConfig: {
        ...createSandboxConfig(),
        docker: {
          ...createSandboxConfig().docker,
          image: "ghcr.io/example/custom-sandbox:latest",
        },
      },
    });

    expect(resolved.supportStatus).toBe("custom-image");
    expect(resolved.customImage).toBe("ghcr.io/example/custom-sandbox:latest");
    expect(resolved.reasonCodes).toContain("custom-runtime-image");
  });

  it("requires the browser profile and enabled browser runtime for browser-only families", () => {
    const codingBaseSupport = resolveSandboxRuntimeCapabilitySupport({
      resolvedProfile: resolveSandboxRuntimeProfile({
        mode: "gateway",
        sandboxConfig: createSandboxConfig(),
      }),
      family: "browser-automation",
    });
    expect(codingBaseSupport.reasonCodes).toContain("unsupported-runtime-family");

    const browserDisabledSupport = resolveSandboxRuntimeCapabilitySupport({
      resolvedProfile: resolveSandboxRuntimeProfile({
        mode: "gateway",
        sandboxConfig: {
          ...createSandboxConfig(),
          profile: "browser-automation",
        },
      }),
      family: "browser-automation",
    });
    expect(
      resolveSandboxRuntimeProfile({
        mode: "gateway",
        sandboxConfig: {
          ...createSandboxConfig(),
          profile: "browser-automation",
        },
      }).supportStatus,
    ).toBe("image-mismatch");
    expect(browserDisabledSupport.reasonCodes).toContain("browser-runtime-disabled");
  });

  it("does not report browser automation as official when the paired docker image is custom", () => {
    const resolved = resolveSandboxRuntimeProfile({
      mode: "gateway",
      sandboxConfig: {
        ...createSandboxConfig(),
        profile: "browser-automation",
        browser: {
          ...createSandboxConfig().browser,
          enabled: true,
        },
        docker: {
          ...createSandboxConfig().docker,
          image: "ghcr.io/example/custom-sandbox:latest",
        },
      },
    });

    expect(resolved.supportStatus).toBe("custom-image");
    expect(resolved.reasonCodes).toContain("custom-runtime-image");
    expect(resolved.customImage).toBe("ghcr.io/example/custom-sandbox:latest");
    expect(resolved.detail).toContain("Configured docker image");
  });

  it("applies the same browser gating to browser skill families", () => {
    const support = resolveSandboxRuntimeSkillSupport({
      resolvedProfile: resolveSandboxRuntimeProfile({
        mode: "gateway",
        sandboxConfig: createSandboxConfig(),
      }),
      family: "browser-web-automation",
    });

    expect(support.reasonCodes).toContain("unsupported-runtime-family");
  });
});
