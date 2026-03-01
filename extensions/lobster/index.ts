<<<<<<< HEAD
import type { MoltbotPluginApi } from "../../src/plugins/types.js";

=======
import type { OpenClawPluginApi } from "../../src/plugins/types.js";
>>>>>>> f06dd8df0 (chore: Enable "experimentalSortImports" in Oxfmt and reformat all imorts.)
import { createLobsterTool } from "./src/lobster-tool.js";

export default function register(api: MoltbotPluginApi) {
  api.registerTool(
    (ctx) => {
      if (ctx.sandboxed) return null;
      return createLobsterTool(api);
    },
    { optional: true },
  );
}
