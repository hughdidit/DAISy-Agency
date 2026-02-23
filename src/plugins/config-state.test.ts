import { describe, expect, it } from "vitest";
<<<<<<< HEAD

import { normalizePluginsConfig } from "./config-state.js";
=======
import { normalizePluginsConfig, resolveEffectiveEnableState } from "./config-state.js";
>>>>>>> 87603b5c4 (fix: sync built-in channel enablement across config paths)

describe("normalizePluginsConfig", () => {
  it("uses default memory slot when not specified", () => {
    const result = normalizePluginsConfig({});
    expect(result.slots.memory).toBe("memory-core");
  });

  it("respects explicit memory slot value", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "custom-memory" },
    });
    expect(result.slots.memory).toBe("custom-memory");
  });

  it("disables memory slot when set to 'none'", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "none" },
    });
    expect(result.slots.memory).toBeNull();
  });

  it("disables memory slot when set to 'None' (case insensitive)", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "None" },
    });
    expect(result.slots.memory).toBeNull();
  });

  it("trims whitespace from memory slot value", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "  custom-memory  " },
    });
    expect(result.slots.memory).toBe("custom-memory");
  });

  it("uses default when memory slot is empty string", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "" },
    });
    expect(result.slots.memory).toBe("memory-core");
  });

  it("uses default when memory slot is whitespace only", () => {
    const result = normalizePluginsConfig({
      slots: { memory: "   " },
    });
    expect(result.slots.memory).toBe("memory-core");
  });
});

describe("resolveEffectiveEnableState", () => {
  it("enables bundled channels when channels.<id>.enabled=true", () => {
    const normalized = normalizePluginsConfig({
      enabled: true,
    });
    const state = resolveEffectiveEnableState({
      id: "telegram",
      origin: "bundled",
      config: normalized,
      rootConfig: {
        channels: {
          telegram: {
            enabled: true,
          },
        },
      },
    });
    expect(state).toEqual({ enabled: true });
  });

  it("keeps explicit plugin-level disable authoritative", () => {
    const normalized = normalizePluginsConfig({
      enabled: true,
      entries: {
        telegram: {
          enabled: false,
        },
      },
    });
    const state = resolveEffectiveEnableState({
      id: "telegram",
      origin: "bundled",
      config: normalized,
      rootConfig: {
        channels: {
          telegram: {
            enabled: true,
          },
        },
      },
    });
    expect(state).toEqual({ enabled: false, reason: "disabled in config" });
  });
});
