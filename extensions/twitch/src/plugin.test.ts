<<<<<<< HEAD
import { describe, expect, it } from "vitest";
import type { MoltbotConfig } from "clawdbot/plugin-sdk";
=======
import type { OpenClawConfig } from "openclaw/plugin-sdk";
import { describe, expect, it } from "vitest";
>>>>>>> f06dd8df0 (chore: Enable "experimentalSortImports" in Oxfmt and reformat all imorts.)
import { twitchPlugin } from "./plugin.js";

describe("twitchPlugin.status.buildAccountSnapshot", () => {
  it("uses the resolved account ID for multi-account configs", async () => {
    const secondary = {
      channel: "secondary-channel",
      username: "secondary",
      accessToken: "oauth:secondary-token",
      clientId: "secondary-client",
      enabled: true,
    };

    const cfg = {
      channels: {
        twitch: {
          accounts: {
            default: {
              channel: "default-channel",
              username: "default",
              accessToken: "oauth:default-token",
              clientId: "default-client",
              enabled: true,
            },
            secondary,
          },
        },
      },
    } as MoltbotConfig;

    const snapshot = await twitchPlugin.status?.buildAccountSnapshot?.({
      account: secondary,
      cfg,
    });

    expect(snapshot?.accountId).toBe("secondary");
  });
});
