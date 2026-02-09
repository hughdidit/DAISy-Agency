<<<<<<< HEAD
import type { MoltbotPluginApi } from "../../src/plugins/types.js";

import { createLlmTaskTool } from "./src/llm-task-tool.js";

export default function register(api: MoltbotPluginApi) {
  api.registerTool(createLlmTaskTool(api), { optional: true });
=======
import type { AnyAgentTool, OpenClawPluginApi } from "../../src/plugins/types.js";
import { createLlmTaskTool } from "./src/llm-task-tool.js";

export default function register(api: OpenClawPluginApi) {
  api.registerTool(createLlmTaskTool(api) as unknown as AnyAgentTool, { optional: true });
>>>>>>> 40b11db80 (TypeScript: add extensions to tsconfig and fix type errors (#12781))
}
