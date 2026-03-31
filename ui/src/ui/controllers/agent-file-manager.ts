import { decodeTextFile } from "../../../../src/shared/text-file-codec.js";
import type { GatewayBrowserClient } from "../gateway.ts";
import type {
  AgentWorkspaceFileDocument,
  AgentWorkspaceFileEntry,
  AgentsWorkspaceFilesGetResult,
  AgentsWorkspaceFilesListResult,
  AgentsWorkspaceFilesSetResult,
  SupportedTextFileEncoding,
} from "../types.ts";

export type AgentWorkspaceFileDraft =
  | {
      kind: "text";
      path: string;
      textContent: string;
      encoding: SupportedTextFileEncoding;
      includeBom: boolean;
    }
  | {
      kind: "binary";
      path: string;
      contentBase64: string;
      textError: string;
    };

export type AgentWorkspaceFileManagerState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  agentWorkspaceFilesLoading: boolean;
  agentWorkspaceFilesError: string | null;
  agentWorkspaceFilesList: AgentsWorkspaceFilesListResult | null;
  agentWorkspaceFileDocs: Record<string, AgentWorkspaceFileDocument>;
  agentWorkspaceFileDrafts: Record<string, AgentWorkspaceFileDraft>;
  agentWorkspaceFileActivePath: string | null;
  agentWorkspaceFileSaving: boolean;
};

function normalizeRelativePath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

function joinRelativePath(dir: string, name: string): string {
  const prefix = normalizeRelativePath(dir);
  const child = normalizeRelativePath(name);
  return prefix ? `${prefix}/${child}` : child;
}

function encodeBytesBase64(bytes: Uint8Array): string {
  return btoa(new TextDecoder("latin1").decode(bytes));
}

function decodeBase64Bytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function upsertWorkspaceEntry(
  list: AgentsWorkspaceFilesListResult | null,
  entry: AgentWorkspaceFileEntry,
): AgentsWorkspaceFilesListResult | null {
  if (!list) {
    return list;
  }
  const parentDir = normalizeRelativePath(entry.path.split("/").slice(0, -1).join("/"));
  if (parentDir !== normalizeRelativePath(list.dir)) {
    return list;
  }
  const existingIndex = list.entries.findIndex((item) => item.path === entry.path);
  const entries =
    existingIndex >= 0
      ? list.entries.map((item, index) => (index === existingIndex ? entry : item))
      : [...list.entries, entry];
  return {
    ...list,
    entries: entries.toSorted((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === "directory" ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    }),
  };
}

function removeWorkspaceEntry(
  list: AgentsWorkspaceFilesListResult | null,
  targetPath: string,
): AgentsWorkspaceFilesListResult | null {
  if (!list) {
    return list;
  }
  return {
    ...list,
    entries: list.entries.filter((entry) => entry.path !== targetPath),
  };
}

export function createAgentWorkspaceFileDraft(
  file: AgentWorkspaceFileDocument,
): AgentWorkspaceFileDraft {
  if (file.textEditable) {
    return {
      kind: "text",
      path: file.path,
      textContent: file.textContent ?? "",
      encoding: file.encoding ?? "utf-8",
      includeBom: file.includeBom === true,
    };
  }
  return {
    kind: "binary",
    path: file.path,
    contentBase64: file.contentBase64,
    textError: file.textError ?? "File is not editable as text.",
  };
}

export async function loadAgentWorkspaceFiles(
  state: AgentWorkspaceFileManagerState,
  agentId: string,
  dir = "",
) {
  if (!state.client || !state.connected || state.agentWorkspaceFilesLoading) {
    return;
  }
  state.agentWorkspaceFilesLoading = true;
  state.agentWorkspaceFilesError = null;
  try {
    const res = await state.client.request<AgentsWorkspaceFilesListResult | null>(
      "agents.files.workspace.list",
      {
        agentId,
        dir,
      },
    );
    if (res) {
      state.agentWorkspaceFilesList = res;
    }
  } catch (error) {
    state.agentWorkspaceFilesError = String(error);
  } finally {
    state.agentWorkspaceFilesLoading = false;
  }
}

export async function loadAgentWorkspaceFile(
  state: AgentWorkspaceFileManagerState,
  agentId: string,
  relativePath: string,
  opts?: { force?: boolean; preserveDraft?: boolean },
) {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized || !state.client || !state.connected || state.agentWorkspaceFilesLoading) {
    return;
  }
  if (!opts?.force && state.agentWorkspaceFileDocs[normalized]) {
    return;
  }
  state.agentWorkspaceFilesLoading = true;
  state.agentWorkspaceFilesError = null;
  try {
    const res = await state.client.request<AgentsWorkspaceFilesGetResult | null>(
      "agents.files.workspace.get",
      {
        agentId,
        path: normalized,
      },
    );
    if (res?.file) {
      const previousDoc = state.agentWorkspaceFileDocs[normalized];
      const currentDraft = state.agentWorkspaceFileDrafts[normalized];
      state.agentWorkspaceFileDocs = {
        ...state.agentWorkspaceFileDocs,
        [normalized]: res.file,
      };
      state.agentWorkspaceFilesList = upsertWorkspaceEntry(state.agentWorkspaceFilesList, res.file);
      const previousDraftBaseline = previousDoc ? createAgentWorkspaceFileDraft(previousDoc) : null;
      if (
        !opts?.preserveDraft ||
        !currentDraft ||
        JSON.stringify(currentDraft) === JSON.stringify(previousDraftBaseline)
      ) {
        state.agentWorkspaceFileDrafts = {
          ...state.agentWorkspaceFileDrafts,
          [normalized]: createAgentWorkspaceFileDraft(res.file),
        };
      }
    }
  } catch (error) {
    state.agentWorkspaceFilesError = String(error);
  } finally {
    state.agentWorkspaceFilesLoading = false;
  }
}

export async function saveAgentWorkspaceFile(
  state: AgentWorkspaceFileManagerState,
  agentId: string,
  relativePath: string,
) {
  const normalized = normalizeRelativePath(relativePath);
  const draft = state.agentWorkspaceFileDrafts[normalized];
  if (
    !normalized ||
    !draft ||
    !state.client ||
    !state.connected ||
    state.agentWorkspaceFileSaving
  ) {
    return;
  }
  state.agentWorkspaceFileSaving = true;
  state.agentWorkspaceFilesError = null;
  try {
    const params =
      draft.kind === "text"
        ? {
            agentId,
            path: normalized,
            content: draft.textContent,
            encoding: draft.encoding,
            includeBom: draft.includeBom,
          }
        : {
            agentId,
            path: normalized,
            contentBase64: draft.contentBase64,
          };
    const res = await state.client.request<AgentsWorkspaceFilesSetResult | null>(
      "agents.files.workspace.set",
      params,
    );
    if (res?.file) {
      state.agentWorkspaceFileDocs = {
        ...state.agentWorkspaceFileDocs,
        [normalized]: res.file,
      };
      state.agentWorkspaceFileDrafts = {
        ...state.agentWorkspaceFileDrafts,
        [normalized]: createAgentWorkspaceFileDraft(res.file),
      };
      state.agentWorkspaceFilesList = upsertWorkspaceEntry(state.agentWorkspaceFilesList, res.file);
    }
  } catch (error) {
    state.agentWorkspaceFilesError = String(error);
  } finally {
    state.agentWorkspaceFileSaving = false;
  }
}

export async function deleteAgentWorkspacePath(
  state: AgentWorkspaceFileManagerState,
  agentId: string,
  relativePath: string,
) {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized || !state.client || !state.connected) {
    return;
  }
  state.agentWorkspaceFilesError = null;
  try {
    await state.client.request("agents.files.workspace.delete", {
      agentId,
      path: normalized,
    });
    state.agentWorkspaceFilesList = removeWorkspaceEntry(state.agentWorkspaceFilesList, normalized);
    const nextDocs = { ...state.agentWorkspaceFileDocs };
    delete nextDocs[normalized];
    state.agentWorkspaceFileDocs = nextDocs;
    const nextDrafts = { ...state.agentWorkspaceFileDrafts };
    delete nextDrafts[normalized];
    state.agentWorkspaceFileDrafts = nextDrafts;
    if (state.agentWorkspaceFileActivePath === normalized) {
      state.agentWorkspaceFileActivePath = null;
    }
  } catch (error) {
    state.agentWorkspaceFilesError = String(error);
  }
}

export async function mkdirAgentWorkspacePath(
  state: AgentWorkspaceFileManagerState,
  agentId: string,
  relativePath: string,
) {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized || !state.client || !state.connected) {
    return;
  }
  state.agentWorkspaceFilesError = null;
  try {
    const res = await state.client.request<{
      ok: true;
      entry: AgentWorkspaceFileEntry;
    } | null>("agents.files.workspace.mkdir", {
      agentId,
      path: normalized,
    });
    if (res?.entry) {
      state.agentWorkspaceFilesList = upsertWorkspaceEntry(
        state.agentWorkspaceFilesList,
        res.entry,
      );
    }
  } catch (error) {
    state.agentWorkspaceFilesError = String(error);
  }
}

export async function moveAgentWorkspacePath(
  state: AgentWorkspaceFileManagerState,
  agentId: string,
  fromRelativePath: string,
  toRelativePath: string,
) {
  const fromPath = normalizeRelativePath(fromRelativePath);
  const toPath = normalizeRelativePath(toRelativePath);
  if (!fromPath || !toPath || !state.client || !state.connected) {
    return;
  }
  state.agentWorkspaceFilesError = null;
  try {
    const res = await state.client.request<{
      ok: true;
      entry: AgentWorkspaceFileEntry;
    } | null>("agents.files.workspace.move", {
      agentId,
      fromPath,
      toPath,
    });
    if (res?.entry) {
      state.agentWorkspaceFilesList = removeWorkspaceEntry(state.agentWorkspaceFilesList, fromPath);
      state.agentWorkspaceFilesList = upsertWorkspaceEntry(
        state.agentWorkspaceFilesList,
        res.entry,
      );
      if (state.agentWorkspaceFileDocs[fromPath]) {
        const nextDocs = { ...state.agentWorkspaceFileDocs };
        const source = nextDocs[fromPath];
        delete nextDocs[fromPath];
        nextDocs[toPath] = {
          ...source,
          path: toPath,
          name: res.entry.name,
        };
        state.agentWorkspaceFileDocs = nextDocs;
      }
      if (state.agentWorkspaceFileDrafts[fromPath]) {
        const nextDrafts = { ...state.agentWorkspaceFileDrafts };
        const source = nextDrafts[fromPath];
        delete nextDrafts[fromPath];
        nextDrafts[toPath] = { ...source, path: toPath };
        state.agentWorkspaceFileDrafts = nextDrafts;
      }
      if (state.agentWorkspaceFileActivePath === fromPath) {
        state.agentWorkspaceFileActivePath = toPath;
      }
    }
  } catch (error) {
    state.agentWorkspaceFilesError = String(error);
  }
}

export async function stageAgentWorkspaceUpload(
  state: AgentWorkspaceFileManagerState,
  targetPath: string,
  file: File,
) {
  const normalized = normalizeRelativePath(targetPath || file.name);
  if (!normalized) {
    return;
  }
  state.agentWorkspaceFilesError = null;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentBase64 = encodeBytesBase64(bytes);
    const decoded = decodeTextFile(bytes);
    state.agentWorkspaceFileActivePath = normalized;
    state.agentWorkspaceFileDrafts = {
      ...state.agentWorkspaceFileDrafts,
      [normalized]: decoded.textEditable
        ? {
            kind: "text",
            path: normalized,
            textContent: decoded.textContent,
            encoding: decoded.encoding,
            includeBom: decoded.includeBom,
          }
        : {
            kind: "binary",
            path: normalized,
            contentBase64,
            textError: decoded.textError,
          },
    };
    state.agentWorkspaceFilesList = upsertWorkspaceEntry(state.agentWorkspaceFilesList, {
      path: normalized,
      name: normalized.split("/").at(-1) ?? normalized,
      kind: "file",
      size: bytes.byteLength,
    });
  } catch (error) {
    state.agentWorkspaceFilesError = String(error);
  }
}

export async function downloadAgentWorkspaceFile(
  state: AgentWorkspaceFileManagerState,
  agentId: string,
  relativePath: string,
) {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) {
    return;
  }
  if (!state.agentWorkspaceFileDocs[normalized]) {
    await loadAgentWorkspaceFile(state, agentId, normalized, { force: true, preserveDraft: true });
  }
  const file = state.agentWorkspaceFileDocs[normalized];
  if (!file) {
    return;
  }
  const bytes = decodeBase64Bytes(file.contentBase64);
  const blobBytes = new Uint8Array(bytes.byteLength);
  blobBytes.set(bytes);
  const blob = new Blob([blobBytes.buffer]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function stageUploadPathForCurrentDirectory(currentDir: string, fileName: string): string {
  return joinRelativePath(currentDir, fileName);
}
