import { describe, expect, it } from "vitest";
<<<<<<< HEAD

=======
import { SILENT_REPLY_TOKEN } from "../tokens.js";
>>>>>>> f06dd8df0 (chore: Enable "experimentalSortImports" in Oxfmt and reformat all imorts.)
import { normalizeReplyPayload } from "./normalize-reply.js";

// Keep channelData-only payloads so channel-specific replies survive normalization.
describe("normalizeReplyPayload", () => {
  it("keeps channelData-only replies", () => {
    const payload = {
      channelData: {
        line: {
          flexMessage: { type: "bubble" },
        },
      },
    };

    const normalized = normalizeReplyPayload(payload);

    expect(normalized).not.toBeNull();
    expect(normalized?.text).toBeUndefined();
    expect(normalized?.channelData).toEqual(payload.channelData);
  });
});
