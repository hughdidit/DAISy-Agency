import { describe, expect, it, vi } from "vitest";
import { createPluginRegistry } from "./registry.js";

describe("createPluginRegistry", () => {
  it("registers plugin gateway events without colliding duplicates", () => {
    const { registry, createApi } = createPluginRegistry({
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
      runtime: {} as never,
    });

    const record = {
      id: "cron-guard",
      name: "Cron Guard",
      source: "/tmp/extensions/cron-guard/index.ts",
      origin: "workspace" as const,
      enabled: true,
      status: "loaded" as const,
      toolNames: [],
      hookNames: [],
      channelIds: [],
      providerIds: [],
      gatewayMethods: [],
      gatewayEvents: [],
      cliCommands: [],
      services: [],
      commands: [],
      httpRoutes: 0,
      hookCount: 0,
      configSchema: false,
    };
    registry.plugins.push(record);

    const api = createApi(record, {
      config: {},
    });

    api.registerGatewayEvent("cron.guard.requested");
    api.registerGatewayEvent("cron.guard.requested");
    api.registerGatewayEvent("cron.guard.applied");

    expect(registry.gatewayEvents).toEqual(["cron.guard.requested", "cron.guard.applied"]);
    expect(registry.plugins[0]?.gatewayEvents).toEqual([
      "cron.guard.requested",
      "cron.guard.applied",
    ]);
  });
});
