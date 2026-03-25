import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveStateDir: vi.fn(() => "/tmp/state"),
  resolveAgentSessionDirs: vi.fn().mockResolvedValue([]),
  cleanStaleLockFiles: vi.fn().mockResolvedValue(undefined),
  startPluginServices: vi.fn(),
  startBrowserControlServerIfEnabled: vi.fn().mockResolvedValue(null),
  startGmailWatcherWithLogs: vi.fn().mockResolvedValue(undefined),
  loadInternalHooks: vi.fn().mockResolvedValue(0),
  clearInternalHooks: vi.fn(),
  createInternalHookEvent: vi.fn(),
  triggerInternalHook: vi.fn(),
  loadModelCatalog: vi.fn(),
  getModelRefStatus: vi.fn(),
  resolveConfiguredModelRef: vi.fn(),
  resolveHooksGmailModel: vi.fn(),
  isTruthyEnvValue: vi.fn(() => false),
  getAcpSessionManager: vi.fn(),
  startGatewayMemoryBackend: vi.fn().mockResolvedValue(undefined),
  shouldWakeFromRestartSentinel: vi.fn(() => false),
  scheduleRestartSentinelWake: vi.fn(),
}));

vi.mock("../config/paths.js", () => ({
  resolveStateDir: mocks.resolveStateDir,
}));

vi.mock("../agents/session-dirs.js", () => ({
  resolveAgentSessionDirs: mocks.resolveAgentSessionDirs,
}));

vi.mock("../agents/session-write-lock.js", () => ({
  cleanStaleLockFiles: mocks.cleanStaleLockFiles,
}));

vi.mock("../plugins/services.js", () => ({
  startPluginServices: mocks.startPluginServices,
}));

vi.mock("./server-browser.js", () => ({
  startBrowserControlServerIfEnabled: mocks.startBrowserControlServerIfEnabled,
}));

vi.mock("../hooks/gmail-watcher-lifecycle.js", () => ({
  startGmailWatcherWithLogs: mocks.startGmailWatcherWithLogs,
}));

vi.mock("../hooks/loader.js", () => ({
  loadInternalHooks: mocks.loadInternalHooks,
}));

vi.mock("../hooks/internal-hooks.js", () => ({
  clearInternalHooks: mocks.clearInternalHooks,
  createInternalHookEvent: mocks.createInternalHookEvent,
  triggerInternalHook: mocks.triggerInternalHook,
}));

vi.mock("../agents/model-catalog.js", () => ({
  loadModelCatalog: mocks.loadModelCatalog,
}));

vi.mock("../agents/model-selection.js", () => ({
  getModelRefStatus: mocks.getModelRefStatus,
  resolveConfiguredModelRef: mocks.resolveConfiguredModelRef,
  resolveHooksGmailModel: mocks.resolveHooksGmailModel,
}));

vi.mock("../infra/env.js", () => ({
  isTruthyEnvValue: mocks.isTruthyEnvValue,
}));

vi.mock("../acp/control-plane/manager.js", () => ({
  getAcpSessionManager: mocks.getAcpSessionManager,
}));

vi.mock("./server-startup-memory.js", () => ({
  startGatewayMemoryBackend: mocks.startGatewayMemoryBackend,
}));

vi.mock("./server-restart-sentinel.js", () => ({
  shouldWakeFromRestartSentinel: mocks.shouldWakeFromRestartSentinel,
  scheduleRestartSentinelWake: mocks.scheduleRestartSentinelWake,
}));

import { startGatewaySidecars } from "./server-startup.js";

describe("startGatewaySidecars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveStateDir.mockReturnValue("/tmp/state");
    mocks.resolveAgentSessionDirs.mockResolvedValue([]);
    mocks.cleanStaleLockFiles.mockResolvedValue(undefined);
    mocks.startPluginServices.mockResolvedValue({ stop: vi.fn() });
    mocks.startBrowserControlServerIfEnabled.mockResolvedValue(null);
    mocks.startGmailWatcherWithLogs.mockResolvedValue(undefined);
    mocks.loadInternalHooks.mockResolvedValue(0);
    mocks.isTruthyEnvValue.mockReturnValue(false);
    mocks.startGatewayMemoryBackend.mockResolvedValue(undefined);
    mocks.shouldWakeFromRestartSentinel.mockReturnValue(false);
  });

  it("fails before launching sidecars when required plugin startup fails", async () => {
    const startChannels = vi.fn().mockResolvedValue(undefined);
    const log = { warn: vi.fn() };
    const logHooks = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const logChannels = { info: vi.fn(), error: vi.fn() };
    const logBrowser = { error: vi.fn() };
    const failure = new Error("plugin startup failed");

    mocks.startPluginServices.mockRejectedValue(failure);

    await expect(
      startGatewaySidecars({
        cfg: { hooks: { internal: { enabled: true } } } as never,
        pluginRegistry: { services: [] } as never,
        defaultWorkspaceDir: "/tmp/workspace",
        deps: {} as never,
        startChannels,
        log,
        logHooks,
        logChannels,
        logBrowser,
      }),
    ).rejects.toThrow("plugin startup failed");

    expect(mocks.startBrowserControlServerIfEnabled).not.toHaveBeenCalled();
    expect(mocks.startGmailWatcherWithLogs).not.toHaveBeenCalled();
    expect(mocks.loadInternalHooks).not.toHaveBeenCalled();
    expect(startChannels).not.toHaveBeenCalled();
    expect(mocks.startGatewayMemoryBackend).not.toHaveBeenCalled();
    expect(mocks.createInternalHookEvent).not.toHaveBeenCalled();
  });
});
