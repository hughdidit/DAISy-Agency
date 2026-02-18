import type { loadConfig } from "../config/config.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { loadMoltbotPlugins } from "../plugins/loader.js";
=======
import { loadOpenClawPlugins } from "../plugins/loader.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
import type { GatewayRequestHandler } from "./server-methods/types.js";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { loadOpenClawPlugins } from "../plugins/loader.js";
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type { GatewayRequestHandler } from "./server-methods/types.js";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { loadOpenClawPlugins } from "../plugins/loader.js";
import type { GatewayRequestHandler } from "./server-methods/types.js";

export function loadGatewayPlugins(params: {
  cfg: ReturnType<typeof loadConfig>;
  workspaceDir: string;
  log: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
    debug: (msg: string) => void;
  };
  coreGatewayHandlers: Record<string, GatewayRequestHandler>;
  baseMethods: string[];
}) {
  const pluginRegistry = loadMoltbotPlugins({
    config: params.cfg,
    workspaceDir: params.workspaceDir,
    logger: {
      info: (msg) => params.log.info(msg),
      warn: (msg) => params.log.warn(msg),
      error: (msg) => params.log.error(msg),
      debug: (msg) => params.log.debug(msg),
    },
    coreGatewayHandlers: params.coreGatewayHandlers,
  });
  const pluginMethods = Object.keys(pluginRegistry.gatewayHandlers);
  const gatewayMethods = Array.from(new Set([...params.baseMethods, ...pluginMethods]));
  if (pluginRegistry.diagnostics.length > 0) {
    for (const diag of pluginRegistry.diagnostics) {
      const details = [
        diag.pluginId ? `plugin=${diag.pluginId}` : null,
        diag.source ? `source=${diag.source}` : null,
      ]
        .filter((entry): entry is string => Boolean(entry))
        .join(", ");
      const message = details
        ? `[plugins] ${diag.message} (${details})`
        : `[plugins] ${diag.message}`;
      if (diag.level === "error") {
        params.log.error(message);
      } else {
        params.log.info(message);
      }
    }
  }
  return { pluginRegistry, gatewayMethods };
}
