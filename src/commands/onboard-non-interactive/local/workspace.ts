<<<<<<< HEAD
import type { MoltbotConfig } from "../../../config/config.js";
=======
import type { OpenClawConfig } from "../../../config/config.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { resolveUserPath } from "../../../utils.js";
=======
>>>>>>> ed11e93cf (chore(format))
import type { OnboardOptions } from "../../onboard-types.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { resolveUserPath } from "../../../utils.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { OnboardOptions } from "../../onboard-types.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { resolveUserPath } from "../../../utils.js";
import type { OnboardOptions } from "../../onboard-types.js";

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
