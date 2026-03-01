<<<<<<< HEAD
import type { MoltbotPluginApi } from "../../src/plugins/types.js";

=======
import type { OpenClawPluginApi } from "../../src/plugins/types.js";
>>>>>>> f06dd8df0 (chore: Enable "experimentalSortImports" in Oxfmt and reformat all imorts.)
import { createLlmTaskTool } from "./src/llm-task-tool.js";

export default function register(api: MoltbotPluginApi) {
  api.registerTool(createLlmTaskTool(api), { optional: true });
}
