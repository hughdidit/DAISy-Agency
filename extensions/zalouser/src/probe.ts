<<<<<<< HEAD
=======
import type { BaseProbeResult } from "openclaw/plugin-sdk";
import type { ZcaUserInfo } from "./types.js";
>>>>>>> c6b3736fe (fix: dedupe probe/token base types (#16986) (thanks @iyoda))
import { runZca, parseJsonOutput } from "./zca.js";
import type { ZcaUserInfo } from "./types.js";

export type ZalouserProbeResult = BaseProbeResult<string> & {
  user?: ZcaUserInfo;
};

export async function probeZalouser(
  profile: string,
  timeoutMs?: number,
): Promise<ZalouserProbeResult> {
  const result = await runZca(["me", "info", "-j"], {
    profile,
    timeout: timeoutMs,
  });

  if (!result.ok) {
    return { ok: false, error: result.stderr || "Failed to probe" };
  }

  const user = parseJsonOutput<ZcaUserInfo>(result.stdout);
  if (!user) {
    return { ok: false, error: "Failed to parse user info" };
  }
  return { ok: true, user };
}
