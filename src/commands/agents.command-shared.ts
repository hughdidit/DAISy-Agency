<<<<<<< HEAD
import { formatCliCommand } from "../cli/command-format.js";
import type { MoltbotConfig } from "../config/config.js";
import { readConfigFileSnapshot } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
=======
import type { OpenClawConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import { requireValidConfigSnapshot } from "./config-validation.js";
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)

export function createQuietRuntime(runtime: RuntimeEnv): RuntimeEnv {
  return { ...runtime, log: () => {} };
}

<<<<<<< HEAD
export async function requireValidConfig(runtime: RuntimeEnv): Promise<MoltbotConfig | null> {
  const snapshot = await readConfigFileSnapshot();
  if (snapshot.exists && !snapshot.valid) {
    const issues =
      snapshot.issues.length > 0
        ? snapshot.issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n")
        : "Unknown validation issue.";
    runtime.error(`Config invalid:\n${issues}`);
    runtime.error(`Fix the config or run ${formatCliCommand("moltbot doctor")}.`);
    runtime.exit(1);
    return null;
  }
  return snapshot.config;
=======
export async function requireValidConfig(runtime: RuntimeEnv): Promise<OpenClawConfig | null> {
  return await requireValidConfigSnapshot(runtime);
>>>>>>> f717a1303 (refactor(agent): dedupe harness and command workflows)
}
