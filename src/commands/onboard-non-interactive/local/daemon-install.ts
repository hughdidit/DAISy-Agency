<<<<<<< HEAD
import type { MoltbotConfig } from "../../../config/config.js";
import { resolveGatewayService } from "../../../daemon/service.js";
import { isSystemdUserServiceAvailable } from "../../../daemon/systemd.js";
import type { RuntimeEnv } from "../../../runtime.js";
import { DEFAULT_GATEWAY_DAEMON_RUNTIME, isGatewayDaemonRuntime } from "../../daemon-runtime.js";
import { buildGatewayInstallPlan, gatewayInstallErrorHint } from "../../daemon-install-helpers.js";
=======
import type { OpenClawConfig } from "../../../config/config.js";
import { resolveGatewayService } from "../../../daemon/service.js";
import { isSystemdUserServiceAvailable } from "../../../daemon/systemd.js";
import type { RuntimeEnv } from "../../../runtime.js";
import { buildGatewayInstallPlan, gatewayInstallErrorHint } from "../../daemon-install-helpers.js";
import { DEFAULT_GATEWAY_DAEMON_RUNTIME, isGatewayDaemonRuntime } from "../../daemon-runtime.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import type { OnboardOptions } from "../../onboard-types.js";
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { OnboardOptions } from "../../onboard-types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { OnboardOptions } from "../../onboard-types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { ensureSystemdUserLingerNonInteractive } from "../../systemd-linger.js";

export async function installGatewayDaemonNonInteractive(params: {
  nextConfig: MoltbotConfig;
  opts: OnboardOptions;
  runtime: RuntimeEnv;
  port: number;
  gatewayToken?: string;
}) {
  const { opts, runtime, port, gatewayToken } = params;
  if (!opts.installDaemon) {
    return;
  }

  const daemonRuntimeRaw = opts.daemonRuntime ?? DEFAULT_GATEWAY_DAEMON_RUNTIME;
  const systemdAvailable =
    process.platform === "linux" ? await isSystemdUserServiceAvailable() : true;
  if (process.platform === "linux" && !systemdAvailable) {
    runtime.log("Systemd user services are unavailable; skipping service install.");
    return;
  }

  if (!isGatewayDaemonRuntime(daemonRuntimeRaw)) {
    runtime.error("Invalid --daemon-runtime (use node or bun)");
    runtime.exit(1);
    return;
  }

  const service = resolveGatewayService();
  const { programArguments, workingDirectory, environment } = await buildGatewayInstallPlan({
    env: process.env,
    port,
    token: gatewayToken,
    runtime: daemonRuntimeRaw,
    warn: (message) => runtime.log(message),
    config: params.nextConfig,
  });
  try {
    await service.install({
      env: process.env,
      stdout: process.stdout,
      programArguments,
      workingDirectory,
      environment,
    });
  } catch (err) {
    runtime.error(`Gateway service install failed: ${String(err)}`);
    runtime.log(gatewayInstallErrorHint());
    return;
  }
  await ensureSystemdUserLingerNonInteractive({ runtime });
}
