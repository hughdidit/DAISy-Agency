import { describe, expect, it } from "vitest";
import {
  stageAgentWorkspaceUpload,
  type AgentWorkspaceFileManagerState,
} from "./agent-file-manager.ts";

function createState(): AgentWorkspaceFileManagerState {
  return {
    client: null,
    connected: true,
    agentWorkspaceFilesLoading: false,
    agentWorkspaceFilesError: null,
    agentWorkspaceFilesList: null,
    agentWorkspaceFileDocs: {},
    agentWorkspaceFileDrafts: {},
    agentWorkspaceFileActivePath: null,
    agentWorkspaceFileSaving: false,
  };
}

describe("agent workspace file uploads (browser)", () => {
  it("stages UTF-8 uploads into editable drafts", async () => {
    const state = createState();
    const file = new File(["hello 😀"], "hello.txt", { type: "text/plain" });

    await stageAgentWorkspaceUpload(state, "docs/hello.txt", file);

    expect(state.agentWorkspaceFileActivePath).toBe("docs/hello.txt");
    expect(state.agentWorkspaceFileDrafts["docs/hello.txt"]).toEqual(
      expect.objectContaining({
        kind: "text",
        textContent: "hello 😀",
        encoding: "utf-8",
      }),
    );
    expect(state.agentWorkspaceFilesError).toBeNull();
  });

  it("stages UTF-16LE uploads with emoji and preserves encoding metadata", async () => {
    const state = createState();
    const bytes = new Uint8Array(Buffer.from("\ufeffwave 😀", "utf16le"));
    const file = new File([bytes], "wave.txt", { type: "text/plain" });

    await stageAgentWorkspaceUpload(state, "wave.txt", file);

    expect(state.agentWorkspaceFileDrafts["wave.txt"]).toEqual(
      expect.objectContaining({
        kind: "text",
        textContent: "wave 😀",
        encoding: "utf-16le",
        includeBom: true,
      }),
    );
  });

  it("stages binary uploads without crashing and marks them non-editable", async () => {
    const state = createState();
    const file = new File([new Uint8Array([0x00, 0xff, 0x10, 0x11])], "blob.bin", {
      type: "application/octet-stream",
    });

    await stageAgentWorkspaceUpload(state, "blob.bin", file);

    expect(state.agentWorkspaceFileDrafts["blob.bin"]).toEqual(
      expect.objectContaining({
        kind: "binary",
        path: "blob.bin",
        textError: expect.stringContaining("text"),
      }),
    );
    expect(state.agentWorkspaceFilesError).toBeNull();
  });
});
