<<<<<<< HEAD
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
<<<<<<< HEAD

import { afterEach, describe, expect, it } from "vitest";

=======
import { afterAll, describe, expect, it } from "vitest";
>>>>>>> 2086cdfb9 (perf(test): reduce hot-suite import and setup overhead)
=======
import { beforeEach, describe, expect, it, vi } from "vitest";
>>>>>>> bfb5a4408 (test: speed up plugin optional tools suite)
import { resolvePluginTools } from "./tools.js";

type MockRegistryToolEntry = {
  pluginId: string;
  optional: boolean;
  source: string;
  factory: (ctx: unknown) => unknown;
};

const loadOpenClawPluginsMock = vi.fn();

<<<<<<< HEAD
<<<<<<< HEAD
function makeTempDir() {
  const dir = path.join(os.tmpdir(), `moltbot-plugin-tools-${randomUUID()}`);
=======
function makeFixtureDir(id: string) {
  const dir = path.join(fixtureRoot, id);
>>>>>>> 2086cdfb9 (perf(test): reduce hot-suite import and setup overhead)
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writePlugin(params: { id: string; body: string }): TempPlugin {
  const dir = makeFixtureDir(params.id);
  const file = path.join(dir, `${params.id}.js`);
  fs.writeFileSync(file, params.body, "utf-8");
  fs.writeFileSync(
    path.join(dir, "moltbot.plugin.json"),
    JSON.stringify(
      {
        id: params.id,
        configSchema: EMPTY_PLUGIN_SCHEMA,
      },
      null,
      2,
    ),
    "utf-8",
  );
  return { dir, file, id: params.id };
}

const pluginBody = `
export default { register(api) {
  api.registerTool(
    {
      name: "optional_tool",
      description: "optional tool",
      parameters: { type: "object", properties: {} },
      async execute() {
        return { content: [{ type: "text", text: "ok" }] };
      },
    },
    { optional: true },
  );
} }
`;

const optionalDemoPlugin = writePlugin({ id: "optional-demo", body: pluginBody });
const coreNameCollisionPlugin = writePlugin({ id: "message", body: pluginBody });
const multiToolPlugin = writePlugin({
  id: "multi",
  body: `
export default { register(api) {
  api.registerTool({
    name: "message",
    description: "conflict",
    parameters: { type: "object", properties: {} },
    async execute() {
      return { content: [{ type: "text", text: "nope" }] };
    },
  });
  api.registerTool({
    name: "other_tool",
    description: "ok",
=======
vi.mock("./loader.js", () => ({
  loadOpenClawPlugins: (params: unknown) => loadOpenClawPluginsMock(params),
}));

function makeTool(name: string) {
  return {
    name,
    description: `${name} tool`,
>>>>>>> bfb5a4408 (test: speed up plugin optional tools suite)
    parameters: { type: "object", properties: {} },
    async execute() {
      return { content: [{ type: "text", text: "ok" }] };
    },
  };
}

function createContext() {
  return {
    config: {
      plugins: {
        enabled: true,
        allow: ["optional-demo", "message", "multi"],
        load: { paths: ["/tmp/plugin.js"] },
      },
    },
    workspaceDir: "/tmp",
  };
}

function setRegistry(entries: MockRegistryToolEntry[]) {
  const registry = {
    tools: entries,
    diagnostics: [] as Array<{
      level: string;
      pluginId: string;
      source: string;
      message: string;
    }>,
  };
  loadOpenClawPluginsMock.mockReturnValue(registry);
  return registry;
}

describe("resolvePluginTools optional tools", () => {
  beforeEach(() => {
    loadOpenClawPluginsMock.mockReset();
  });

  it("skips optional tools without explicit allowlist", () => {
    setRegistry([
      {
        pluginId: "optional-demo",
        optional: true,
        source: "/tmp/optional-demo.js",
        factory: () => makeTool("optional_tool"),
      },
    ]);

    const tools = resolvePluginTools({
      context: createContext() as never,
    });

    expect(tools).toHaveLength(0);
  });

  it("allows optional tools by tool name", () => {
    setRegistry([
      {
        pluginId: "optional-demo",
        optional: true,
        source: "/tmp/optional-demo.js",
        factory: () => makeTool("optional_tool"),
      },
    ]);

    const tools = resolvePluginTools({
      context: createContext() as never,
      toolAllowlist: ["optional_tool"],
    });

    expect(tools.map((tool) => tool.name)).toEqual(["optional_tool"]);
  });

  it("allows optional tools via plugin-scoped allowlist entries", () => {
    setRegistry([
      {
        pluginId: "optional-demo",
        optional: true,
        source: "/tmp/optional-demo.js",
        factory: () => makeTool("optional_tool"),
      },
    ]);

    const toolsByPlugin = resolvePluginTools({
      context: createContext() as never,
      toolAllowlist: ["optional-demo"],
    });
    const toolsByGroup = resolvePluginTools({
      context: createContext() as never,
      toolAllowlist: ["group:plugins"],
    });

    expect(toolsByPlugin.map((tool) => tool.name)).toEqual(["optional_tool"]);
    expect(toolsByGroup.map((tool) => tool.name)).toEqual(["optional_tool"]);
  });

  it("rejects plugin id collisions with core tool names", () => {
    const registry = setRegistry([
      {
        pluginId: "message",
        optional: false,
        source: "/tmp/message.js",
        factory: () => makeTool("optional_tool"),
      },
    ]);

    const tools = resolvePluginTools({
      context: createContext() as never,
      existingToolNames: new Set(["message"]),
    });

    expect(tools).toHaveLength(0);
    expect(registry.diagnostics).toHaveLength(1);
    expect(registry.diagnostics[0]?.message).toContain("plugin id conflicts with core tool name");
  });

  it("skips conflicting tool names but keeps other tools", () => {
    const registry = setRegistry([
      {
        pluginId: "multi",
        optional: false,
        source: "/tmp/multi.js",
        factory: () => [makeTool("message"), makeTool("other_tool")],
      },
    ]);

    const tools = resolvePluginTools({
      context: createContext() as never,
      existingToolNames: new Set(["message"]),
    });

    expect(tools.map((tool) => tool.name)).toEqual(["other_tool"]);
    expect(registry.diagnostics).toHaveLength(1);
    expect(registry.diagnostics[0]?.message).toContain("plugin tool name conflict");
  });
});
