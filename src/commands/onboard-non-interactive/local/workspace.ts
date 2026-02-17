<<<<<<< HEAD
import type { MoltbotConfig } from "../../../config/config.js";
=======
import type { OpenClawConfig } from "../../../config/config.js";
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { resolveUserPath } from "../../../utils.js";
=======
>>>>>>> ed11e93cf (chore(format))
import type { OnboardOptions } from "../../onboard-types.js";
import { resolveUserPath } from "../../../utils.js";

export function resolveNonInteractiveWorkspaceDir(params: {
  opts: OnboardOptions;
  baseConfig: MoltbotConfig;
  defaultWorkspaceDir: string;
}) {
  const raw = (
    params.opts.workspace ??
    params.baseConfig.agents?.defaults?.workspace ??
    params.defaultWorkspaceDir
  ).trim();
  return resolveUserPath(raw);
}
