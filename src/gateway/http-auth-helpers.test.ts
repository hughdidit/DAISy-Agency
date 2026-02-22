import type { IncomingMessage, ServerResponse } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedGatewayAuth } from "./auth.js";
import { authorizeGatewayBearerRequestOrReply } from "./http-auth-helpers.js";

vi.mock("./auth.js", () => ({
  authorizeHttpGatewayConnect: vi.fn(),
}));

vi.mock("./http-common.js", () => ({
  sendGatewayAuthFailure: vi.fn(),
}));

vi.mock("./http-utils.js", () => ({
  getBearerToken: vi.fn(),
}));

const { authorizeHttpGatewayConnect } = await import("./auth.js");
const { sendGatewayAuthFailure } = await import("./http-common.js");
const { getBearerToken } = await import("./http-utils.js");

describe("authorizeGatewayBearerRequestOrReply", () => {
  const bearerAuth = {
    mode: "token",
    token: "secret",
    password: undefined,
    allowTailscale: true,
  } satisfies ResolvedGatewayAuth;

  const makeAuthorizeParams = () => ({
    req: {} as IncomingMessage,
    res: {} as ServerResponse,
    auth: bearerAuth,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables tailscale header auth for HTTP bearer checks", async () => {
<<<<<<< HEAD
    vi.mocked(getBearerToken).mockReturnValue(null);
    vi.mocked(authorizeGatewayConnect).mockResolvedValue({
=======
    vi.mocked(getBearerToken).mockReturnValue(undefined);
    vi.mocked(authorizeHttpGatewayConnect).mockResolvedValue({
>>>>>>> 36a0df423 (refactor(gateway): make ws and http auth surfaces explicit)
      ok: false,
      reason: "token_missing",
    });

    const ok = await authorizeGatewayBearerRequestOrReply(makeAuthorizeParams());

    expect(ok).toBe(false);
    expect(vi.mocked(authorizeHttpGatewayConnect)).toHaveBeenCalledWith(
      expect.objectContaining({
        connectAuth: null,
      }),
    );
    expect(vi.mocked(sendGatewayAuthFailure)).toHaveBeenCalledTimes(1);
  });

  it("forwards bearer token and returns true on successful auth", async () => {
    vi.mocked(getBearerToken).mockReturnValue("abc");
    vi.mocked(authorizeHttpGatewayConnect).mockResolvedValue({ ok: true, method: "token" });

    const ok = await authorizeGatewayBearerRequestOrReply(makeAuthorizeParams());

    expect(ok).toBe(true);
    expect(vi.mocked(authorizeHttpGatewayConnect)).toHaveBeenCalledWith(
      expect.objectContaining({
        connectAuth: { token: "abc", password: "abc" },
      }),
    );
    expect(vi.mocked(sendGatewayAuthFailure)).not.toHaveBeenCalled();
  });
});
