import { beforeEach, describe, expect, it } from "vitest";
import type { OpenClawConfig } from "./types.js";
import {
  applyConfigOverrides,
  getConfigOverrides,
  resetConfigOverrides,
  setConfigOverride,
  unsetConfigOverride,
} from "./runtime-overrides.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { MoltbotConfig } from "./types.js";
=======
import type { OpenClawConfig } from "./types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { OpenClawConfig } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)

describe("runtime overrides", () => {
  beforeEach(() => {
    resetConfigOverrides();
  });

  it("sets and applies nested overrides", () => {
    const cfg = {
      messages: { responsePrefix: "[moltbot]" },
    } as MoltbotConfig;
    setConfigOverride("messages.responsePrefix", "[debug]");
    const next = applyConfigOverrides(cfg);
    expect(next.messages?.responsePrefix).toBe("[debug]");
  });

  it("merges object overrides without clobbering siblings", () => {
    const cfg = {
      channels: { whatsapp: { dmPolicy: "pairing", allowFrom: ["+1"] } },
    } as MoltbotConfig;
    setConfigOverride("channels.whatsapp.dmPolicy", "open");
    const next = applyConfigOverrides(cfg);
    expect(next.channels?.whatsapp?.dmPolicy).toBe("open");
    expect(next.channels?.whatsapp?.allowFrom).toEqual(["+1"]);
  });

  it("unsets overrides and prunes empty branches", () => {
    setConfigOverride("channels.whatsapp.dmPolicy", "open");
    const removed = unsetConfigOverride("channels.whatsapp.dmPolicy");
    expect(removed.ok).toBe(true);
    expect(removed.removed).toBe(true);
    expect(Object.keys(getConfigOverrides()).length).toBe(0);
  });

  it("rejects prototype pollution paths", () => {
    const attempts = ["__proto__.polluted", "constructor.polluted", "prototype.polluted"];
    for (const path of attempts) {
      const result = setConfigOverride(path, true);
      expect(result.ok).toBe(false);
      expect(Object.keys(getConfigOverrides()).length).toBe(0);
    }
  });
});
