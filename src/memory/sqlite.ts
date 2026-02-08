import { createRequire } from "node:module";
<<<<<<< HEAD

import { installProcessWarningFilter } from "../infra/warnings.js";
=======
import { installProcessWarningFilter } from "../infra/warning-filter.js";
>>>>>>> a1123dd9b (Centralize date/time formatting utilities (#11831))

const require = createRequire(import.meta.url);

export function requireNodeSqlite(): typeof import("node:sqlite") {
  installProcessWarningFilter();
  return require("node:sqlite") as typeof import("node:sqlite");
}
