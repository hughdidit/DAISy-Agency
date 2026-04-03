import { describe, expect, it } from "vitest";
import {
  __testing,
  buildCronGuardButtonCustomId,
  buildCronGuardModalCustomId,
  parseCronGuardButtonData,
  parseCronGuardModalData,
} from "./discord-approvals.js";

describe("cron-guard discord approvals", () => {
  it("encodes and decodes request ids for button actions", () => {
    const customId = buildCronGuardButtonCustomId("req=1;safe", "approve");
    expect(customId).toBe("cronguard:id=req%3D1%3Bsafe;action=approve");

    const parsed = parseCronGuardButtonData({
      id: "req%3D1%3Bsafe",
      action: "approve",
    });
    expect(parsed).toEqual({
      requestId: "req=1;safe",
      action: "approve",
    });
  });

  it("encodes and decodes request ids for modify modals", () => {
    const customId = buildCronGuardModalCustomId("req=1;safe");
    expect(customId).toBe("cronguardmodal:id=req%3D1%3Bsafe");

    const parsed = parseCronGuardModalData({
      id: "req%3D1%3Bsafe",
    });
    expect(parsed).toEqual({
      requestId: "req=1;safe",
    });
  });

  it("extracts discord approver ids from channel-scoped principals", () => {
    expect(
      __testing.resolveCronGuardApproverDiscordIds([
        "discord:123",
        "123",
        "slack:999",
        "discord:123",
      ]),
    ).toEqual(["123"]);
  });
});
