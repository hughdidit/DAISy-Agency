import fs from "node:fs";
import path from "node:path";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

import dotenv from "dotenv";

=======
import dotenv from "dotenv";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import dotenv from "dotenv";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import dotenv from "dotenv";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { resolveConfigDir } from "../utils.js";

export function loadDotEnv(opts?: { quiet?: boolean }) {
  const quiet = opts?.quiet ?? true;

  // Load from process CWD first (dotenv default).
  dotenv.config({ quiet });

  // Then load global fallback: ~/.clawdbot/.env (or CLAWDBOT_STATE_DIR/.env),
  // without overriding any env vars already present.
  const globalEnvPath = path.join(resolveConfigDir(process.env), ".env");
  if (!fs.existsSync(globalEnvPath)) {
    return;
  }

  dotenv.config({ quiet, path: globalEnvPath, override: false });
}
