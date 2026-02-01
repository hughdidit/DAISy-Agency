import { describe, expect, it, vi } from "vitest";
<<<<<<< HEAD

import type { MoltbotConfig } from "../../config/config.js";
=======
import type { OpenClawConfig } from "../../config/config.js";
>>>>>>> f06dd8df0 (chore: Enable "experimentalSortImports" in Oxfmt and reformat all imorts.)
import { createSlackActions } from "./slack.actions.js";

const handleSlackAction = vi.fn(async () => ({ details: { ok: true } }));

vi.mock("../../agents/tools/slack-actions.js", () => ({
  handleSlackAction: (...args: unknown[]) => handleSlackAction(...args),
}));

describe("slack actions adapter", () => {
  it("forwards threadId for read", async () => {
    const cfg = { channels: { slack: { botToken: "tok" } } } as MoltbotConfig;
    const actions = createSlackActions("slack");

    await actions.handleAction?.({
      channel: "slack",
      action: "read",
      cfg,
      params: {
        channelId: "C1",
        threadId: "171234.567",
      },
    });

    const [params] = handleSlackAction.mock.calls[0] ?? [];
    expect(params).toMatchObject({
      action: "readMessages",
      channelId: "C1",
      threadId: "171234.567",
    });
  });
});
