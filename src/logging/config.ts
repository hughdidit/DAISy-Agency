<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import fs from "node:fs";
<<<<<<< HEAD
import json5 from "json5";
import fs from "node:fs";
import type { OpenClawConfig } from "../config/types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import fs from "node:fs";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import json5 from "json5";
import fs from "node:fs";
import type { OpenClawConfig } from "../config/types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import fs from "node:fs";
import json5 from "json5";
import { resolveConfigPath } from "../config/paths.js";
import type { OpenClawConfig } from "../config/types.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

import json5 from "json5";

import { resolveConfigPath } from "../config/paths.js";
import type { OpenClawConfig } from "../config/types.js";

type LoggingConfig = OpenClawConfig["logging"];

export function readLoggingConfig(): LoggingConfig | undefined {
  const configPath = resolveConfigPath();
  try {
    if (!fs.existsSync(configPath)) {
      return undefined;
    }
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = json5.parse(raw);
    const logging = parsed?.logging;
    if (!logging || typeof logging !== "object" || Array.isArray(logging)) {
      return undefined;
    }
    return logging as LoggingConfig;
  } catch {
    return undefined;
  }
}
