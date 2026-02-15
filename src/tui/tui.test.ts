import { describe, expect, it } from "vitest";
<<<<<<< HEAD

import { resolveFinalAssistantText } from "./tui.js";
=======
import { resolveFinalAssistantText, resolveTuiSessionKey } from "./tui.js";
>>>>>>> 56b38d2fb (TUI: honor explicit session key in global scope)

describe("resolveFinalAssistantText", () => {
  it("falls back to streamed text when final text is empty", () => {
    expect(resolveFinalAssistantText({ finalText: "", streamedText: "Hello" })).toBe("Hello");
  });

  it("prefers the final text when present", () => {
    expect(
      resolveFinalAssistantText({
        finalText: "All done",
        streamedText: "partial",
      }),
    ).toBe("All done");
  });
});

describe("resolveTuiSessionKey", () => {
  it("uses global only as the default when scope is global", () => {
    expect(
      resolveTuiSessionKey({
        raw: "",
        sessionScope: "global",
        currentAgentId: "main",
        sessionMainKey: "agent:main:main",
      }),
    ).toBe("global");
    expect(
      resolveTuiSessionKey({
        raw: "test123",
        sessionScope: "global",
        currentAgentId: "main",
        sessionMainKey: "agent:main:main",
      }),
    ).toBe("agent:main:test123");
  });

  it("keeps explicit agent-prefixed keys unchanged", () => {
    expect(
      resolveTuiSessionKey({
        raw: "agent:ops:incident",
        sessionScope: "global",
        currentAgentId: "main",
        sessionMainKey: "agent:main:main",
      }),
    ).toBe("agent:ops:incident");
  });
});
