import { describe, expect, it, vi } from "vitest";
import { GatewayBrowserClient } from "../gateway.ts";
import {
  createAgentWorkspaceFileDraft,
  deleteAgentWorkspacePath,
  loadAgentWorkspaceFile,
  loadAgentWorkspaceFiles,
  mkdirAgentWorkspacePath,
  moveAgentWorkspacePath,
  saveAgentWorkspaceFile,
  type AgentWorkspaceFileManagerState,
} from "./agent-file-manager.ts";

function createState(): {
  state: AgentWorkspaceFileManagerState;
  request: ReturnType<typeof vi.fn>;
} {
  const request = vi.fn();
  const client = new GatewayBrowserClient({ url: "ws://example.test" });
  client.request = request;
  const state: AgentWorkspaceFileManagerState = {
    client,
    connected: true,
    agentWorkspaceFilesLoading: false,
    agentWorkspaceFilesError: null,
    agentWorkspaceFilesList: null,
    agentWorkspaceFileDocs: {},
    agentWorkspaceFileDrafts: {},
    agentWorkspaceFileActivePath: null,
    agentWorkspaceFileSaving: false,
  };
  return { state, request };
}

describe("agent workspace file manager controller", () => {
  it("loads directory listings", async () => {
    const { state, request } = createState();
    request.mockResolvedValue({
      agentId: "main",
      workspace: "/workspace/main",
      root: "/workspace/main/media/inbound",
      dir: "docs",
      entries: [{ path: "docs/readme.txt", name: "readme.txt", kind: "file" }],
    });

    await loadAgentWorkspaceFiles(state, "main", "docs");

    expect(request).toHaveBeenCalledWith("agents.files.workspace.list", {
      agentId: "main",
      dir: "docs",
    });
    expect(state.agentWorkspaceFilesList?.dir).toBe("docs");
    expect(state.agentWorkspaceFilesError).toBeNull();
  });

  it("captures request errors without throwing", async () => {
    const { state, request } = createState();
    request.mockRejectedValue(new Error("gateway unavailable"));

    await loadAgentWorkspaceFiles(state, "main");

    expect(state.agentWorkspaceFilesError).toContain("gateway unavailable");
    expect(state.agentWorkspaceFilesLoading).toBe(false);
  });

  it("loads file documents and seeds drafts", async () => {
    const { state, request } = createState();
    request.mockResolvedValue({
      agentId: "main",
      workspace: "/workspace/main",
      root: "/workspace/main/media/inbound",
      file: {
        path: "notes.txt",
        name: "notes.txt",
        kind: "file",
        textEditable: true,
        textContent: "hello",
        contentBase64: "aGVsbG8=",
        encoding: "utf-8",
        includeBom: false,
      },
    });

    await loadAgentWorkspaceFile(state, "main", "notes.txt");

    const doc = state.agentWorkspaceFileDocs["notes.txt"];
    expect(doc?.textContent).toBe("hello");
    expect(doc).toBeTruthy();
    if (!doc) {
      throw new Error("expected notes.txt doc");
    }
    expect(state.agentWorkspaceFileDrafts["notes.txt"]).toEqual(createAgentWorkspaceFileDraft(doc));
  });

  it("saves text drafts through the workspace RPC", async () => {
    const { state, request } = createState();
    state.agentWorkspaceFileDrafts["notes.txt"] = {
      kind: "text",
      path: "notes.txt",
      textContent: "updated",
      encoding: "utf-16le",
      includeBom: true,
    };
    request.mockResolvedValue({
      ok: true,
      agentId: "main",
      workspace: "/workspace/main",
      root: "/workspace/main/media/inbound",
      file: {
        path: "notes.txt",
        name: "notes.txt",
        kind: "file",
        textEditable: true,
        textContent: "updated",
        contentBase64: "dQBwAGQAYQB0AGUAZAA=",
        encoding: "utf-16le",
        includeBom: true,
      },
    });

    await saveAgentWorkspaceFile(state, "main", "notes.txt");

    expect(request).toHaveBeenCalledWith("agents.files.workspace.set", {
      agentId: "main",
      path: "notes.txt",
      content: "updated",
      encoding: "utf-16le",
      includeBom: true,
    });
    expect(state.agentWorkspaceFileDocs["notes.txt"]?.textContent).toBe("updated");
  });

  it("deletes, creates directories, and moves paths through dedicated RPCs", async () => {
    const { state, request } = createState();
    state.agentWorkspaceFilesList = {
      agentId: "main",
      workspace: "/workspace/main",
      root: "/workspace/main/media/inbound",
      dir: "",
      entries: [
        { path: "draft.txt", name: "draft.txt", kind: "file" },
        { path: "docs", name: "docs", kind: "directory" },
      ],
    };
    request
      .mockResolvedValueOnce({ ok: true, deletedPath: "draft.txt" })
      .mockResolvedValueOnce({
        ok: true,
        entry: { path: "newdir", name: "newdir", kind: "directory" },
      })
      .mockResolvedValueOnce({
        ok: true,
        fromPath: "draft.txt",
        toPath: "docs/final.txt",
        entry: { path: "docs/final.txt", name: "final.txt", kind: "file" },
      });

    await deleteAgentWorkspacePath(state, "main", "draft.txt");
    await mkdirAgentWorkspacePath(state, "main", "newdir");
    await moveAgentWorkspacePath(state, "main", "draft.txt", "docs/final.txt");

    expect(request).toHaveBeenNthCalledWith(1, "agents.files.workspace.delete", {
      agentId: "main",
      path: "draft.txt",
    });
    expect(request).toHaveBeenNthCalledWith(2, "agents.files.workspace.mkdir", {
      agentId: "main",
      path: "newdir",
    });
    expect(request).toHaveBeenNthCalledWith(3, "agents.files.workspace.move", {
      agentId: "main",
      fromPath: "draft.txt",
      toPath: "docs/final.txt",
    });
  });
});
