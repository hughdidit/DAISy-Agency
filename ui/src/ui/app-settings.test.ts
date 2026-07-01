import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { refreshActiveTab, setTabFromRoute } from "./app-settings.ts";
import { loadAgents } from "./controllers/agents.ts";
import type { Tab } from "./navigation.ts";

type SettingsHost = Parameters<typeof setTabFromRoute>[0] & {
  logsPollInterval: number | null;
  debugPollInterval: number | null;
};

const createHost = (tab: Tab): SettingsHost => ({
  settings: {
    gatewayUrl: "",
    token: "",
    sessionKey: "main",
    lastActiveSessionKey: "main",
    theme: "system",
    chatFocusMode: false,
    chatShowThinking: true,
    splitRatio: 0.6,
    navCollapsed: false,
    navGroupsCollapsed: {},
  },
  theme: "system",
  themeResolved: "dark",
  applySessionKey: "main",
  sessionKey: "main",
  tab,
  connected: false,
  chatHasAutoScrolled: false,
  logsAtBottom: false,
  eventLog: [],
  eventLogBuffer: [],
  basePath: "",
  themeMedia: null,
  themeMediaHandler: null,
  logsPollInterval: null,
  debugPollInterval: null,
});

describe("setTabFromRoute", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts and stops log polling based on the tab", () => {
    const host = createHost("chat");

    setTabFromRoute(host, "logs");
    expect(host.logsPollInterval).not.toBeNull();
    expect(host.debugPollInterval).toBeNull();

    setTabFromRoute(host, "chat");
    expect(host.logsPollInterval).toBeNull();
  });

  it("starts and stops debug polling based on the tab", () => {
    const host = createHost("chat");

    setTabFromRoute(host, "debug");
    expect(host.debugPollInterval).not.toBeNull();
    expect(host.logsPollInterval).toBeNull();

    setTabFromRoute(host, "chat");
    expect(host.debugPollInterval).toBeNull();
  });
});

describe("refreshActiveTab", () => {
  it("loads agent core files and workspace files when the Files panel is active", async () => {
    const agentsListPayload = {
      defaultId: "daisy",
      agents: [{ id: "daisy", name: "DAISy", default: true }],
    };
    let resolveAgentsList: (value: typeof agentsListPayload) => void = () => undefined;
    const request = vi.fn((method: string, params?: unknown) => {
      if (method === "agents.list") {
        return new Promise<typeof agentsListPayload>((resolve) => {
          resolveAgentsList = resolve;
        });
      }
      if (method === "tools.catalog") {
        return { agentId: "daisy", profiles: [], groups: [] };
      }
      if (method === "config.get") {
        return { raw: "{}", config: {}, uiHints: {} };
      }
      if (method === "agent.identity.get") {
        return { agentId: (params as { agentId?: string }).agentId ?? "daisy" };
      }
      if (method === "agents.files.list") {
        return {
          agentId: "daisy",
          workspace: "/workspace/daisy",
          files: [{ name: "AGENTS.md", path: "/workspace/daisy/AGENTS.md", missing: true }],
        };
      }
      if (method === "agents.files.workspace.list") {
        return {
          agentId: "daisy",
          workspace: "/workspace/daisy",
          root: "/workspace/daisy/media/inbound",
          dir: "",
          entries: [],
        };
      }
      return null;
    });
    const host = {
      ...createHost("agents"),
      connected: true,
      client: { request },
      agentsPanel: "files",
      agentsLoading: false,
      agentsLoadPromise: null,
      agentsError: null,
      agentsList: null,
      agentsSelectedId: null,
      toolsCatalogLoading: false,
      toolsCatalogError: null,
      toolsCatalogResult: null,
      configLoading: false,
      configRaw: "",
      configRawOriginal: "",
      configValid: null,
      configIssues: [],
      configSaving: false,
      configApplying: false,
      configSnapshot: null,
      configSchema: null,
      configSchemaVersion: null,
      configSchemaLoading: false,
      configUiHints: {},
      configForm: null,
      configFormOriginal: null,
      configFormDirty: false,
      configFormMode: "form",
      configSearchQuery: "",
      configActiveSection: null,
      configActiveSubsection: null,
      lastError: null,
      agentIdentityLoading: false,
      agentIdentityError: null,
      agentIdentityById: {},
      agentFilesLoading: false,
      agentFilesError: null,
      agentFilesList: null,
      agentFileContents: {},
      agentFileDrafts: {},
      agentFileActive: null,
      agentFileSaving: false,
      agentWorkspaceFilesLoading: false,
      agentWorkspaceFilesError: null,
      agentWorkspaceFilesList: null,
      agentWorkspaceFileDocs: {},
      agentWorkspaceFileDrafts: {},
      agentWorkspaceFileActivePath: null,
      agentWorkspaceFileSaving: false,
    };

    const initialAgentsLoad = loadAgents(host as unknown as Parameters<typeof loadAgents>[0]);
    const refreshPromise = refreshActiveTab(
      host as unknown as Parameters<typeof refreshActiveTab>[0],
    );

    await Promise.resolve();
    resolveAgentsList(agentsListPayload);
    await Promise.all([initialAgentsLoad, refreshPromise]);

    const agentsListRequests = request.mock.calls.filter(([method]) => method === "agents.list");
    expect(agentsListRequests).toHaveLength(1);
    expect(request).toHaveBeenCalledWith("agents.files.list", { agentId: "daisy" });
    expect(request).toHaveBeenCalledWith("agents.files.workspace.list", {
      agentId: "daisy",
      dir: "",
    });
    const agentFilesList = host.agentFilesList as { agentId: string } | null;
    const agentWorkspaceFilesList = host.agentWorkspaceFilesList as { root: string } | null;
    expect(agentFilesList?.agentId).toBe("daisy");
    expect(agentWorkspaceFilesList?.root).toBe("/workspace/daisy/media/inbound");
  });
});
