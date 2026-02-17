<<<<<<< HEAD
<<<<<<< HEAD
import { applyLegacyMigrations } from "./legacy.js";
<<<<<<< HEAD
import type { MoltbotConfig } from "./types.js";
=======
import type { OpenClawConfig } from "./types.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { OpenClawConfig } from "./types.js";
import { applyLegacyMigrations } from "./legacy.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { applyLegacyMigrations } from "./legacy.js";
import type { OpenClawConfig } from "./types.js";
>>>>>>> d0cb8c19b (chore: wtf.)
import { validateConfigObjectWithPlugins } from "./validation.js";

export function migrateLegacyConfig(raw: unknown): {
  config: MoltbotConfig | null;
  changes: string[];
} {
  const { next, changes } = applyLegacyMigrations(raw);
  if (!next) {
    return { config: null, changes: [] };
  }
  const validated = validateConfigObjectWithPlugins(next);
  if (!validated.ok) {
    changes.push("Migration applied, but config still invalid; fix remaining issues manually.");
    return { config: null, changes };
  }
  return { config: validated.config, changes };
}
