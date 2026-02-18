<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
import type { GatewayServiceRuntime } from "../daemon/service-runtime.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { GatewayServiceRuntime } from "../daemon/service-runtime.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { formatCliCommand } from "../cli/command-format.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import {
  resolveGatewayLaunchAgentLabel,
  resolveGatewaySystemdServiceName,
  resolveGatewayWindowsTaskName,
} from "../daemon/constants.js";
import { resolveGatewayLogPaths } from "../daemon/launchd.js";
import { formatRuntimeStatus } from "../daemon/runtime-format.js";
import {
  isSystemdUnavailableDetail,
  renderSystemdUnavailableHints,
} from "../daemon/systemd-hints.js";
import { formatCliCommand } from "../cli/command-format.js";
import { isWSLEnv } from "../infra/wsl.js";
import type { GatewayServiceRuntime } from "../daemon/service-runtime.js";
import { getResolvedLoggerSettings } from "../logging.js";

type RuntimeHintOptions = {
  platform?: NodeJS.Platform;
  env?: Record<string, string | undefined>;
};

export function formatGatewayRuntimeSummary(
  runtime: GatewayServiceRuntime | undefined,
): string | null {
  return formatRuntimeStatus(runtime);
}

export function buildGatewayRuntimeHints(
  runtime: GatewayServiceRuntime | undefined,
  options: RuntimeHintOptions = {},
): string[] {
  const hints: string[] = [];
  if (!runtime) {
    return hints;
  }
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const fileLog = (() => {
    try {
      return getResolvedLoggerSettings().file;
    } catch {
      return null;
    }
  })();
  if (platform === "linux" && isSystemdUnavailableDetail(runtime.detail)) {
    hints.push(...renderSystemdUnavailableHints({ wsl: isWSLEnv() }));
    if (fileLog) {
      hints.push(`File logs: ${fileLog}`);
    }
    return hints;
  }
  if (runtime.cachedLabel && platform === "darwin") {
    const label = resolveGatewayLaunchAgentLabel(env.CLAWDBOT_PROFILE);
    hints.push(
      `LaunchAgent label cached but plist missing. Clear with: launchctl bootout gui/$UID/${label}`,
    );
    hints.push(`Then reinstall: ${formatCliCommand("moltbot gateway install", env)}`);
  }
  if (runtime.missingUnit) {
<<<<<<< HEAD
    hints.push(`Service not installed. Run: ${formatCliCommand("moltbot gateway install", env)}`);
    if (fileLog) hints.push(`File logs: ${fileLog}`);
=======
    hints.push(`Service not installed. Run: ${formatCliCommand("openclaw gateway install", env)}`);
    if (fileLog) {
      hints.push(`File logs: ${fileLog}`);
    }
>>>>>>> 5ceff756e (chore: Enable "curly" rule to avoid single-statement if confusion/errors.)
    return hints;
  }
  if (runtime.status === "stopped") {
    hints.push("Service is loaded but not running (likely exited immediately).");
    if (fileLog) {
      hints.push(`File logs: ${fileLog}`);
    }
    if (platform === "darwin") {
      const logs = resolveGatewayLogPaths(env);
      hints.push(`Launchd stdout (if installed): ${logs.stdoutPath}`);
      hints.push(`Launchd stderr (if installed): ${logs.stderrPath}`);
    } else if (platform === "linux") {
      const unit = resolveGatewaySystemdServiceName(env.CLAWDBOT_PROFILE);
      hints.push(`Logs: journalctl --user -u ${unit}.service -n 200 --no-pager`);
    } else if (platform === "win32") {
      const task = resolveGatewayWindowsTaskName(env.CLAWDBOT_PROFILE);
      hints.push(`Logs: schtasks /Query /TN "${task}" /V /FO LIST`);
    }
  }
  return hints;
}
