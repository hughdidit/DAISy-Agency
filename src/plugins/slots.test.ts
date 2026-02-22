import { describe, expect, it } from "vitest";

import type { MoltbotConfig } from "../config/config.js";
import { applyExclusiveSlotSelection } from "./slots.js";

describe("applyExclusiveSlotSelection", () => {
<<<<<<< HEAD
  it("selects the slot and disables other entries for the same kind", () => {
    const config: MoltbotConfig = {
      plugins: {
        slots: { memory: "memory-core" },
        entries: {
          "memory-core": { enabled: true },
          memory: { enabled: true },
=======
  const createMemoryConfig = (plugins?: OpenClawConfig["plugins"]): OpenClawConfig => ({
    plugins: {
      ...plugins,
      entries: {
        ...plugins?.entries,
        memory: {
          enabled: true,
          ...plugins?.entries?.memory,
>>>>>>> 185fba1d2 (refactor(agents): dedupe plugin hooks and test helpers)
        },
      },
    },
  });

  const runMemorySelection = (config: OpenClawConfig, selectedId = "memory") =>
    applyExclusiveSlotSelection({
      config,
      selectedId,
      selectedKind: "memory",
      registry: {
        plugins: [
          { id: "memory-core", kind: "memory" },
          { id: "memory", kind: "memory" },
        ],
      },
    });

  it("selects the slot and disables other entries for the same kind", () => {
    const config = createMemoryConfig({
      slots: { memory: "memory-core" },
      entries: { "memory-core": { enabled: true } },
    });
    const result = runMemorySelection(config);

    expect(result.changed).toBe(true);
    expect(result.config.plugins?.slots?.memory).toBe("memory");
    expect(result.config.plugins?.entries?.["memory-core"]?.enabled).toBe(false);
    expect(result.warnings).toContain(
      'Exclusive slot "memory" switched from "memory-core" to "memory".',
    );
    expect(result.warnings).toContain('Disabled other "memory" slot plugins: memory-core.');
  });

  it("does nothing when the slot already matches", () => {
<<<<<<< HEAD
    const config: MoltbotConfig = {
      plugins: {
        slots: { memory: "memory" },
        entries: {
          memory: { enabled: true },
        },
      },
    };

=======
    const config = createMemoryConfig({
      slots: { memory: "memory" },
    });
>>>>>>> 185fba1d2 (refactor(agents): dedupe plugin hooks and test helpers)
    const result = applyExclusiveSlotSelection({
      config,
      selectedId: "memory",
      selectedKind: "memory",
      registry: { plugins: [{ id: "memory", kind: "memory" }] },
    });

    expect(result.changed).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.config).toBe(config);
  });

  it("warns when the slot falls back to a default", () => {
<<<<<<< HEAD
    const config: MoltbotConfig = {
      plugins: {
        entries: {
          memory: { enabled: true },
        },
      },
    };

=======
    const config = createMemoryConfig();
>>>>>>> 185fba1d2 (refactor(agents): dedupe plugin hooks and test helpers)
    const result = applyExclusiveSlotSelection({
      config,
      selectedId: "memory",
      selectedKind: "memory",
      registry: { plugins: [{ id: "memory", kind: "memory" }] },
    });

    expect(result.changed).toBe(true);
    expect(result.warnings).toContain(
      'Exclusive slot "memory" switched from "memory-core" to "memory".',
    );
  });

  it("keeps disabled competing plugins disabled without adding disable warnings", () => {
    const config = createMemoryConfig({
      entries: {
        "memory-core": { enabled: false },
      },
    });
    const result = runMemorySelection(config);

    expect(result.changed).toBe(true);
    expect(result.config.plugins?.entries?.["memory-core"]?.enabled).toBe(false);
    expect(result.warnings).toContain(
      'Exclusive slot "memory" switched from "memory-core" to "memory".',
    );
    expect(result.warnings).not.toContain('Disabled other "memory" slot plugins: memory-core.');
  });

  it("skips changes when no exclusive slot applies", () => {
    const config: MoltbotConfig = {};
    const result = applyExclusiveSlotSelection({
      config,
      selectedId: "custom",
    });

    expect(result.changed).toBe(false);
    expect(result.warnings).toHaveLength(0);
    expect(result.config).toBe(config);
  });
});
