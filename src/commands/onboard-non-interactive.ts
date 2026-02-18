<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { formatCliCommand } from "../cli/command-format.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "../config/config.js";
=======
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { readConfigFileSnapshot } from "../config/config.js";
=======
import type { OpenClawConfig } from "../config/config.js";
>>>>>>> ed11e93cf (chore(format))
import type { RuntimeEnv } from "../runtime.js";
import type { OnboardOptions } from "./onboard-types.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { formatCliCommand } from "../cli/command-format.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { OpenClawConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { OnboardOptions } from "./onboard-types.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { formatCliCommand } from "../cli/command-format.js";
import type { OpenClawConfig } from "../config/config.js";
import { readConfigFileSnapshot } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { runNonInteractiveOnboardingLocal } from "./onboard-non-interactive/local.js";
import { runNonInteractiveOnboardingRemote } from "./onboard-non-interactive/remote.js";
import type { OnboardOptions } from "./onboard-types.js";

export async function runNonInteractiveOnboarding(
  opts: OnboardOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const snapshot = await readConfigFileSnapshot();
  if (snapshot.exists && !snapshot.valid) {
    runtime.error(
      `Config invalid. Run \`${formatCliCommand("moltbot doctor")}\` to repair it, then re-run onboarding.`,
    );
    runtime.exit(1);
    return;
  }

  const baseConfig: MoltbotConfig = snapshot.valid ? snapshot.config : {};
  const mode = opts.mode ?? "local";
  if (mode !== "local" && mode !== "remote") {
    runtime.error(`Invalid --mode "${String(mode)}" (use local|remote).`);
    runtime.exit(1);
    return;
  }

  if (mode === "remote") {
    await runNonInteractiveOnboardingRemote({ opts, runtime, baseConfig });
    return;
  }

  await runNonInteractiveOnboardingLocal({ opts, runtime, baseConfig });
}
