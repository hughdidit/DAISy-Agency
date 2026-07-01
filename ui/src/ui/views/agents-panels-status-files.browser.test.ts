import { render } from "lit";
import { describe, expect, it, vi } from "vitest";
import { renderAgentFiles } from "./agents-panels-status-files.ts";

function createParams(overrides: Partial<Parameters<typeof renderAgentFiles>[0]> = {}) {
  return {
    agentId: "main",
    configForm: null,
    agentFilesList: {
      agentId: "main",
      workspace: "/workspace/main",
      files: [],
    },
    agentFilesLoading: false,
    agentFilesError: null,
    agentFileActive: null,
    agentFileContents: {},
    agentFileDrafts: {},
    agentFileSaving: false,
    agentWorkspaceFilesList: {
      agentId: "main",
      workspace: "/workspace/main",
      root: "/workspace/main/media/inbound",
      dir: "",
      entries: [],
    },
    agentWorkspaceFilesLoading: false,
    agentWorkspaceFilesError: null,
    agentWorkspaceFileActivePath: null,
    agentWorkspaceFileDocs: {},
    agentWorkspaceFileDrafts: {},
    agentWorkspaceFileSaving: false,
    onLoadFiles: () => undefined,
    onSelectFile: () => undefined,
    onFileDraftChange: () => undefined,
    onFileReset: () => undefined,
    onFileSave: () => undefined,
    onLoadWorkspaceFiles: () => undefined,
    onSelectWorkspaceEntry: () => undefined,
    onWorkspaceFileDraftChange: () => undefined,
    onWorkspaceFileReset: () => undefined,
    onWorkspaceFileSave: () => undefined,
    onWorkspaceUpload: vi.fn(),
    onWorkspaceDelete: vi.fn(),
    onWorkspaceCreateDirectory: vi.fn(),
    onWorkspaceMove: vi.fn(),
    onWorkspaceDownload: vi.fn(),
    ...overrides,
  };
}

describe("agents files panel (browser)", () => {
  it("renders the File Manager card when not hidden", async () => {
    const container = document.createElement("div");
    render(renderAgentFiles(createParams()), container);
    await Promise.resolve();

    expect(container.textContent ?? "").toContain("File Manager");
    expect(container.textContent ?? "").toContain("/workspace/main/media/inbound");

    const cards = Array.from(container.querySelectorAll(".agent-files-sections > .card"));
    expect(cards).toHaveLength(2);
    expect(cards[0]?.textContent ?? "").toContain("Core Files");
    expect(cards[1]?.textContent ?? "").toContain("File Manager");
  });

  it("hides the File Manager card when the control-ui toggle is enabled and Drive is active", async () => {
    const container = document.createElement("div");
    render(
      renderAgentFiles(
        createParams({
          configForm: {
            gateway: {
              controlUi: {
                hideAgentFileExchangeWhenGoogleDriveEnabled: true,
              },
            },
            plugins: {
              entries: {
                "gws-toolkit-phase1": {
                  enabled: true,
                  config: {},
                },
              },
            },
          },
        }),
      ),
      container,
    );
    await Promise.resolve();

    expect(container.textContent ?? "").not.toContain("File Manager");
    expect(container.textContent ?? "").toContain("Core Files");
  });

  it("shows a friendly non-fatal editor error for non-text files", async () => {
    const container = document.createElement("div");
    render(
      renderAgentFiles(
        createParams({
          agentWorkspaceFileActivePath: "blob.bin",
          agentWorkspaceFileDocs: {
            "blob.bin": {
              path: "blob.bin",
              name: "blob.bin",
              kind: "file",
              textEditable: false,
              textError: "File is not editable as text.",
              contentBase64: "AP8QEQ==",
            },
          },
          agentWorkspaceFileDrafts: {
            "blob.bin": {
              kind: "binary",
              path: "blob.bin",
              contentBase64: "AP8QEQ==",
              textError: "File is not editable as text.",
            },
          },
        }),
      ),
      container,
    );
    await Promise.resolve();

    expect(container.textContent ?? "").toContain("not editable as text");
  });

  it("keeps unsaved uploaded drafts editable before they exist on the server", async () => {
    const onWorkspaceFileDraftChange = vi.fn();
    const container = document.createElement("div");
    render(
      renderAgentFiles(
        createParams({
          agentWorkspaceFileActivePath: "drafts/new.txt",
          agentWorkspaceFileDrafts: {
            "drafts/new.txt": {
              kind: "text",
              path: "drafts/new.txt",
              textContent: "draft",
              encoding: "utf-8",
              includeBom: false,
            },
          },
          onWorkspaceFileDraftChange,
        }),
      ),
      container,
    );
    await Promise.resolve();

    const textarea = container.querySelector("textarea");
    expect(textarea).toBeTruthy();
    textarea!.value = "draft updated";
    textarea!.dispatchEvent(new Event("input"));

    expect(onWorkspaceFileDraftChange).toHaveBeenCalledWith("drafts/new.txt", "draft updated");
  });
});
