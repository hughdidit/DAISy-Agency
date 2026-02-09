<<<<<<< HEAD
import type { MoltbotPluginApi } from "../../src/plugins/types.js";

=======
import type {
  AnyAgentTool,
  OpenClawPluginApi,
  OpenClawPluginToolFactory,
} from "../../src/plugins/types.js";
>>>>>>> 40b11db80 (TypeScript: add extensions to tsconfig and fix type errors (#12781))
import { createLobsterTool } from "./src/lobster-tool.js";

export default function register(api: MoltbotPluginApi) {
  api.registerTool(
    ((ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createLobsterTool(api) as AnyAgentTool;
    }) as OpenClawPluginToolFactory,
    { optional: true },
  );
}
