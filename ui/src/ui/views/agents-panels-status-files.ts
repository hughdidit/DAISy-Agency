import { html, nothing } from "lit";
import { stageUploadPathForCurrentDirectory } from "../controllers/agent-file-manager.ts";
import { formatRelativeTimestamp } from "../format.ts";
import {
  formatCronPayload,
  formatCronSchedule,
  formatCronState,
  formatNextRun,
} from "../presenter.ts";
import type {
  AgentFileEntry,
  AgentWorkspaceFileDocument,
  AgentWorkspaceFileEntry,
  AgentsFilesListResult,
  AgentsWorkspaceFilesListResult,
  ChannelAccountSnapshot,
  ChannelsStatusSnapshot,
  CronJob,
  CronStatus,
} from "../types.ts";
import { formatBytes, type AgentContext } from "./agents-utils.ts";
import { resolveChannelExtras as resolveChannelExtrasFromConfig } from "./channel-config-extras.ts";

function renderAgentContextCard(context: AgentContext, subtitle: string) {
  return html`
    <section class="card">
      <div class="card-title">Agent Context</div>
      <div class="card-sub">${subtitle}</div>
      <div class="agents-overview-grid" style="margin-top: 16px;">
        <div class="agent-kv">
          <div class="label">Workspace</div>
          <div class="mono">${context.workspace}</div>
        </div>
        <div class="agent-kv">
          <div class="label">Primary Model</div>
          <div class="mono">${context.model}</div>
        </div>
        <div class="agent-kv">
          <div class="label">Identity Name</div>
          <div>${context.identityName}</div>
        </div>
        <div class="agent-kv">
          <div class="label">Identity Emoji</div>
          <div>${context.identityEmoji}</div>
        </div>
        <div class="agent-kv">
          <div class="label">Skills Filter</div>
          <div>${context.skillsLabel}</div>
        </div>
        <div class="agent-kv">
          <div class="label">Default</div>
          <div>${context.isDefault ? "yes" : "no"}</div>
        </div>
      </div>
    </section>
  `;
}

type ChannelSummaryEntry = {
  id: string;
  label: string;
  accounts: ChannelAccountSnapshot[];
};

function resolveChannelLabel(snapshot: ChannelsStatusSnapshot, id: string) {
  const meta = snapshot.channelMeta?.find((entry) => entry.id === id);
  if (meta?.label) {
    return meta.label;
  }
  return snapshot.channelLabels?.[id] ?? id;
}

function resolveChannelEntries(snapshot: ChannelsStatusSnapshot | null): ChannelSummaryEntry[] {
  if (!snapshot) {
    return [];
  }
  const ids = new Set<string>();
  for (const id of snapshot.channelOrder ?? []) {
    ids.add(id);
  }
  for (const entry of snapshot.channelMeta ?? []) {
    ids.add(entry.id);
  }
  for (const id of Object.keys(snapshot.channelAccounts ?? {})) {
    ids.add(id);
  }
  const ordered: string[] = [];
  const seed = snapshot.channelOrder?.length ? snapshot.channelOrder : Array.from(ids);
  for (const id of seed) {
    if (!ids.has(id)) {
      continue;
    }
    ordered.push(id);
    ids.delete(id);
  }
  for (const id of ids) {
    ordered.push(id);
  }
  return ordered.map((id) => ({
    id,
    label: resolveChannelLabel(snapshot, id),
    accounts: snapshot.channelAccounts?.[id] ?? [],
  }));
}

const CHANNEL_EXTRA_FIELDS = ["groupPolicy", "streamMode", "dmPolicy"] as const;

function summarizeChannelAccounts(accounts: ChannelAccountSnapshot[]) {
  let connected = 0;
  let configured = 0;
  let enabled = 0;
  for (const account of accounts) {
    const probeOk =
      account.probe && typeof account.probe === "object" && "ok" in account.probe
        ? Boolean((account.probe as { ok?: unknown }).ok)
        : false;
    const isConnected = account.connected === true || account.running === true || probeOk;
    if (isConnected) {
      connected += 1;
    }
    if (account.configured) {
      configured += 1;
    }
    if (account.enabled) {
      enabled += 1;
    }
  }
  return {
    total: accounts.length,
    connected,
    configured,
    enabled,
  };
}

export function renderAgentChannels(params: {
  context: AgentContext;
  configForm: Record<string, unknown> | null;
  snapshot: ChannelsStatusSnapshot | null;
  loading: boolean;
  error: string | null;
  lastSuccess: number | null;
  onRefresh: () => void;
}) {
  const entries = resolveChannelEntries(params.snapshot);
  const lastSuccessLabel = params.lastSuccess
    ? formatRelativeTimestamp(params.lastSuccess)
    : "never";
  return html`
    <section class="grid grid-cols-2">
      ${renderAgentContextCard(params.context, "Workspace, identity, and model configuration.")}
      <section class="card">
        <div class="row" style="justify-content: space-between;">
          <div>
            <div class="card-title">Channels</div>
            <div class="card-sub">Gateway-wide channel status snapshot.</div>
          </div>
          <button class="btn btn--sm" ?disabled=${params.loading} @click=${params.onRefresh}>
            ${params.loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div class="muted" style="margin-top: 8px;">
          Last refresh: ${lastSuccessLabel}
        </div>
        ${
          params.error
            ? html`<div class="callout danger" style="margin-top: 12px;">${params.error}</div>`
            : nothing
        }
        ${
          !params.snapshot
            ? html`
                <div class="callout info" style="margin-top: 12px">Load channels to see live status.</div>
              `
            : nothing
        }
        ${
          entries.length === 0
            ? html`
                <div class="muted" style="margin-top: 16px">No channels found.</div>
              `
            : html`
                <div class="list" style="margin-top: 16px;">
                  ${entries.map((entry) => {
                    const summary = summarizeChannelAccounts(entry.accounts);
                    const status = summary.total
                      ? `${summary.connected}/${summary.total} connected`
                      : "no accounts";
                    const config = summary.configured
                      ? `${summary.configured} configured`
                      : "not configured";
                    const enabled = summary.total ? `${summary.enabled} enabled` : "disabled";
                    const extras = resolveChannelExtrasFromConfig({
                      configForm: params.configForm,
                      channelId: entry.id,
                      fields: CHANNEL_EXTRA_FIELDS,
                    });
                    return html`
                      <div class="list-item">
                        <div class="list-main">
                          <div class="list-title">${entry.label}</div>
                          <div class="list-sub mono">${entry.id}</div>
                        </div>
                        <div class="list-meta">
                          <div>${status}</div>
                          <div>${config}</div>
                          <div>${enabled}</div>
                          ${
                            extras.length > 0
                              ? extras.map(
                                  (extra) => html`<div>${extra.label}: ${extra.value}</div>`,
                                )
                              : nothing
                          }
                        </div>
                      </div>
                    `;
                  })}
                </div>
              `
        }
      </section>
    </section>
  `;
}

export function renderAgentCron(params: {
  context: AgentContext;
  agentId: string;
  jobs: CronJob[];
  status: CronStatus | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const jobs = params.jobs.filter((job) => job.agentId === params.agentId);
  return html`
    <section class="grid grid-cols-2">
      ${renderAgentContextCard(params.context, "Workspace and scheduling targets.")}
      <section class="card">
        <div class="row" style="justify-content: space-between;">
          <div>
            <div class="card-title">Scheduler</div>
            <div class="card-sub">Gateway cron status.</div>
          </div>
          <button class="btn btn--sm" ?disabled=${params.loading} @click=${params.onRefresh}>
            ${params.loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div class="stat-grid" style="margin-top: 16px;">
          <div class="stat">
            <div class="stat-label">Enabled</div>
            <div class="stat-value">
              ${params.status ? (params.status.enabled ? "Yes" : "No") : "n/a"}
            </div>
          </div>
          <div class="stat">
            <div class="stat-label">Jobs</div>
            <div class="stat-value">${params.status?.jobs ?? "n/a"}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Next wake</div>
            <div class="stat-value">${formatNextRun(params.status?.nextWakeAtMs ?? null)}</div>
          </div>
        </div>
        ${
          params.error
            ? html`<div class="callout danger" style="margin-top: 12px;">${params.error}</div>`
            : nothing
        }
      </section>
    </section>
    <section class="card">
      <div class="card-title">Agent Cron Jobs</div>
      <div class="card-sub">Scheduled jobs targeting this agent.</div>
      ${
        jobs.length === 0
          ? html`
              <div class="muted" style="margin-top: 16px">No jobs assigned.</div>
            `
          : html`
              <div class="list" style="margin-top: 16px;">
                ${jobs.map(
                  (job) => html`
                    <div class="list-item">
                      <div class="list-main">
                        <div class="list-title">${job.name}</div>
                        ${
                          job.description
                            ? html`<div class="list-sub">${job.description}</div>`
                            : nothing
                        }
                        <div class="chip-row" style="margin-top: 6px;">
                          <span class="chip">${formatCronSchedule(job)}</span>
                          <span class="chip ${job.enabled ? "chip-ok" : "chip-warn"}">
                            ${job.enabled ? "enabled" : "disabled"}
                          </span>
                          <span class="chip">${job.sessionTarget}</span>
                        </div>
                      </div>
                      <div class="list-meta">
                        <div class="mono">${formatCronState(job)}</div>
                        <div class="muted">${formatCronPayload(job)}</div>
                      </div>
                    </div>
                  `,
                )}
              </div>
            `
      }
    </section>
  `;
}

export function renderAgentFiles(params: {
  agentId: string;
  configForm: Record<string, unknown> | null;
  agentFilesList: AgentsFilesListResult | null;
  agentFilesLoading: boolean;
  agentFilesError: string | null;
  agentFileActive: string | null;
  agentFileContents: Record<string, string>;
  agentFileDrafts: Record<string, string>;
  agentFileSaving: boolean;
  agentWorkspaceFilesList: AgentsWorkspaceFilesListResult | null;
  agentWorkspaceFilesLoading: boolean;
  agentWorkspaceFilesError: string | null;
  agentWorkspaceFileActivePath: string | null;
  agentWorkspaceFileDocs: Record<string, AgentWorkspaceFileDocument>;
  agentWorkspaceFileDrafts: Record<
    string,
    import("../controllers/agent-file-manager.ts").AgentWorkspaceFileDraft
  >;
  agentWorkspaceFileSaving: boolean;
  onLoadFiles: (agentId: string) => void;
  onSelectFile: (name: string) => void;
  onFileDraftChange: (name: string, content: string) => void;
  onFileReset: (name: string) => void;
  onFileSave: (name: string) => void;
  onLoadWorkspaceFiles: (agentId: string, dir?: string) => void;
  onSelectWorkspaceEntry: (entry: AgentWorkspaceFileEntry) => void;
  onWorkspaceFileDraftChange: (path: string, content: string) => void;
  onWorkspaceFileReset: (path: string) => void;
  onWorkspaceFileSave: (path: string) => void;
  onWorkspaceUpload: (path: string, file: File) => void;
  onWorkspaceDelete: (path: string) => void;
  onWorkspaceCreateDirectory: (path: string) => void;
  onWorkspaceMove: (fromPath: string, toPath: string) => void;
  onWorkspaceDownload: (path: string) => void;
}) {
  const list = params.agentFilesList?.agentId === params.agentId ? params.agentFilesList : null;
  const files = list?.files ?? [];
  const active = params.agentFileActive ?? null;
  const activeEntry = active ? (files.find((file) => file.name === active) ?? null) : null;
  const baseContent = active ? (params.agentFileContents[active] ?? "") : "";
  const draft = active ? (params.agentFileDrafts[active] ?? baseContent) : "";
  const isDirty = active ? draft !== baseContent : false;
  const workspaceList =
    params.agentWorkspaceFilesList?.agentId === params.agentId
      ? params.agentWorkspaceFilesList
      : null;
  const hideWorkspaceManager = shouldHideWorkspaceManager(params.configForm);

  return html`
    <section class="grid grid-cols-2">
      <section class="card">
        <div class="row" style="justify-content: space-between;">
          <div>
            <div class="card-title">Core Files</div>
            <div class="card-sub">Bootstrap persona, identity, and tool guidance.</div>
          </div>
          <button
            class="btn btn--sm"
            ?disabled=${params.agentFilesLoading}
            @click=${() => params.onLoadFiles(params.agentId)}
          >
            ${params.agentFilesLoading ? "Loading…" : "Refresh"}
          </button>
        </div>
        ${
          list
            ? html`
                <div class="muted mono" style="margin-top: 8px;">
                  Workspace: ${list.workspace}
                </div>
              `
            : nothing
        }
        ${
          params.agentFilesError
            ? html`
                <div class="callout danger" style="margin-top: 12px;">
                  ${params.agentFilesError}
                </div>
              `
            : nothing
        }
        ${
          !list
            ? html`
                <div class="callout info" style="margin-top: 12px">
                  Load the agent workspace files to edit core instructions.
                </div>
              `
            : html`
                <div class="agent-files-grid" style="margin-top: 16px;">
                  <div class="agent-files-list">
                    ${
                      files.length === 0
                        ? html`
                            <div class="muted">No files found.</div>
                          `
                        : files.map((file) =>
                            renderAgentFileRow(file, active, () => params.onSelectFile(file.name)),
                          )
                    }
                  </div>
                  <div class="agent-files-editor">
                    ${
                      !activeEntry
                        ? html`
                            <div class="muted">Select a file to edit.</div>
                          `
                        : html`
                            <div class="agent-file-header">
                              <div>
                                <div class="agent-file-title mono">${activeEntry.name}</div>
                                <div class="agent-file-sub mono">${activeEntry.path}</div>
                              </div>
                              <div class="agent-file-actions">
                                <button
                                  class="btn btn--sm"
                                  ?disabled=${!isDirty}
                                  @click=${() => params.onFileReset(activeEntry.name)}
                                >
                                  Reset
                                </button>
                                <button
                                  class="btn btn--sm primary"
                                  ?disabled=${params.agentFileSaving || !isDirty}
                                  @click=${() => params.onFileSave(activeEntry.name)}
                                >
                                  ${params.agentFileSaving ? "Saving…" : "Save"}
                                </button>
                              </div>
                            </div>
                            ${
                              activeEntry.missing
                                ? html`
                                    <div class="callout info" style="margin-top: 10px">
                                      This file is missing. Saving will create it in the agent workspace.
                                    </div>
                                  `
                                : nothing
                            }
                            <label class="field" style="margin-top: 12px;">
                              <span>Content</span>
                              <textarea
                                .value=${draft}
                                @input=${(e: Event) =>
                                  params.onFileDraftChange(
                                    activeEntry.name,
                                    (e.target as HTMLTextAreaElement).value,
                                  )}
                              ></textarea>
                            </label>
                          `
                    }
                  </div>
                </div>
              `
        }
      </section>
      ${hideWorkspaceManager ? nothing : renderWorkspaceManagerCard(params, workspaceList)}
    </section>
  `;
}

function renderAgentFileRow(file: AgentFileEntry, active: string | null, onSelect: () => void) {
  const status = file.missing
    ? "Missing"
    : `${formatBytes(file.size)} · ${formatRelativeTimestamp(file.updatedAtMs ?? null)}`;
  return html`
    <button
      type="button"
      class="agent-file-row ${active === file.name ? "active" : ""}"
      @click=${onSelect}
    >
      <div>
        <div class="agent-file-name mono">${file.name}</div>
        <div class="agent-file-meta">${status}</div>
      </div>
      ${
        file.missing
          ? html`
              <span class="agent-pill warn">missing</span>
            `
          : nothing
      }
    </button>
  `;
}

function renderWorkspaceManagerCard(
  params: Parameters<typeof renderAgentFiles>[0],
  list: AgentsWorkspaceFilesListResult | null,
) {
  const currentDir = list?.dir ?? "";
  const entries = list?.entries ?? [];
  const activePath = params.agentWorkspaceFileActivePath;
  const activeDoc = activePath ? (params.agentWorkspaceFileDocs[activePath] ?? null) : null;
  const activeDraft = activePath ? (params.agentWorkspaceFileDrafts[activePath] ?? null) : null;
  const activeName = activePath?.split("/").at(-1) ?? "";
  const activeText =
    activeDraft && activeDraft.kind === "text"
      ? activeDraft.textContent
      : activeDoc?.textEditable
        ? (activeDoc.textContent ?? "")
        : "";
  const savedText = activeDoc?.textEditable ? (activeDoc.textContent ?? "") : "";
  const isDirty =
    activeDraft?.kind === "text"
      ? !activeDoc?.textEditable ||
        activeDraft.textContent !== savedText ||
        activeDraft.encoding !== (activeDoc.encoding ?? "utf-8") ||
        activeDraft.includeBom !== (activeDoc.includeBom === true)
      : Boolean(activeDraft && !activeDoc);
  const parentDir = currentDir.split("/").slice(0, -1).join("/");

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between; gap: 8px; flex-wrap: wrap;">
        <div>
          <div class="card-title">File Manager</div>
          <div class="card-sub">Agent workspace sandbox exchange area at media/inbound.</div>
        </div>
        <div class="row" style="gap: 8px; flex-wrap: wrap;">
          <label class="btn btn--sm" style="cursor: pointer;">
            Upload
            <input
              type="file"
              hidden
              @change=${(event: Event) => {
                const input = event.target as HTMLInputElement;
                const [file] = Array.from(input.files ?? []);
                if (!file) {
                  return;
                }
                params.onWorkspaceUpload(
                  stageUploadPathForCurrentDirectory(currentDir, file.name),
                  file,
                );
                input.value = "";
              }}
            />
          </label>
          <button
            class="btn btn--sm"
            @click=${() => {
              const name = window.prompt("New folder name", "");
              if (!name) {
                return;
              }
              params.onWorkspaceCreateDirectory(
                stageUploadPathForCurrentDirectory(currentDir, name),
              );
            }}
          >
            New Folder
          </button>
          <button
            class="btn btn--sm"
            ?disabled=${params.agentWorkspaceFilesLoading}
            @click=${() => params.onLoadWorkspaceFiles(params.agentId, currentDir)}
          >
            ${params.agentWorkspaceFilesLoading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>
      ${
        list
          ? html`
              <div class="muted mono" style="margin-top: 8px;">${list.root}</div>
              <div class="row" style="margin-top: 10px; gap: 8px; flex-wrap: wrap;">
                <button
                  class="btn btn--sm"
                  ?disabled=${!currentDir}
                  @click=${() => params.onLoadWorkspaceFiles(params.agentId, parentDir)}
                >
                  Up
                </button>
                <span class="chip mono">${currentDir || "."}</span>
              </div>
            `
          : nothing
      }
      ${
        params.agentWorkspaceFilesError
          ? html`
              <div class="callout danger" style="margin-top: 12px;">
                ${params.agentWorkspaceFilesError}
              </div>
            `
          : nothing
      }
      ${
        !list
          ? html`
              <div class="callout info" style="margin-top: 12px">
                Load the agent File Manager to browse sandbox workspace files.
              </div>
            `
          : html`
              <div class="agent-files-grid" style="margin-top: 16px;">
                <div class="agent-files-list">
                  ${
                    currentDir
                      ? html`
                          <button
                            type="button"
                            class="agent-file-row"
                            @click=${() => params.onLoadWorkspaceFiles(params.agentId, parentDir)}
                          >
                            <div>
                              <div class="agent-file-name mono">..</div>
                              <div class="agent-file-meta">Parent directory</div>
                            </div>
                          </button>
                        `
                      : nothing
                  }
                  ${
                    entries.length === 0
                      ? html`
                          <div class="muted">No files found.</div>
                        `
                      : entries.map((entry) =>
                          renderWorkspaceEntryRow(entry, activePath, () =>
                            params.onSelectWorkspaceEntry(entry),
                          ),
                        )
                  }
                </div>
                <div class="agent-files-editor">
                  ${
                    !activePath
                      ? html`
                          <div class="muted">Select a file to inspect or edit.</div>
                        `
                      : html`
                          <div class="agent-file-header">
                            <div>
                              <div class="agent-file-title mono">
                                ${activeDoc?.name ?? activeName}
                              </div>
                              <div class="agent-file-sub mono">
                                ${activeDoc?.path ?? activePath}
                              </div>
                            </div>
                            <div class="agent-file-actions">
                              <button
                                class="btn btn--sm"
                                ?disabled=${!activeDoc}
                                @click=${() => {
                                  const currentPath = activeDoc?.path ?? activePath;
                                  const nextPath = window.prompt("Rename or move to", currentPath);
                                  if (!nextPath || nextPath === currentPath) {
                                    return;
                                  }
                                  params.onWorkspaceMove(currentPath, nextPath);
                                }}
                              >
                                Move
                              </button>
                              <button
                                class="btn btn--sm"
                                ?disabled=${!activeDoc}
                                @click=${() => {
                                  if (!activeDoc || !window.confirm(`Delete ${activeDoc.path}?`)) {
                                    return;
                                  }
                                  params.onWorkspaceDelete(activeDoc.path);
                                }}
                              >
                                Delete
                              </button>
                              <button
                                class="btn btn--sm"
                                ?disabled=${!activeDoc || isDirty}
                                @click=${() =>
                                  activeDoc
                                    ? params.onWorkspaceDownload(activeDoc.path)
                                    : undefined}
                              >
                                Download
                              </button>
                              ${
                                activeDraft
                                  ? html`
                                      <button
                                        class="btn btn--sm"
                                        ?disabled=${!isDirty || !activeDoc}
                                        @click=${() =>
                                          activeDoc
                                            ? params.onWorkspaceFileReset(activeDoc.path)
                                            : undefined}
                                      >
                                        Reset
                                      </button>
                                      <button
                                        class="btn btn--sm primary"
                                        ?disabled=${params.agentWorkspaceFileSaving || !isDirty}
                                        @click=${() =>
                                          params.onWorkspaceFileSave(activeDoc?.path ?? activePath)}
                                      >
                                        ${params.agentWorkspaceFileSaving ? "Saving…" : "Save"}
                                      </button>
                                    `
                                  : nothing
                              }
                            </div>
                          </div>
                          <div class="muted" style="margin-top: 10px;">
                            ${
                              activeDoc?.kind === "file" && typeof activeDoc.size === "number"
                                ? formatBytes(activeDoc.size)
                                : ""
                            }
                          </div>
                          ${
                            activeDraft?.kind === "binary" || (activeDoc && !activeDoc.textEditable)
                              ? html`
                                  <div class="callout info" style="margin-top: 12px;">
                                    ${
                                      activeDraft?.kind === "binary"
                                        ? activeDraft.textError
                                        : (activeDoc?.textError ?? "File is not editable as text.")
                                    }
                                  </div>
                                `
                              : html`
                                  <label class="field" style="margin-top: 12px;">
                                    <span>Content</span>
                                    <textarea
                                      .value=${activeText}
                                      @input=${(e: Event) =>
                                        params.onWorkspaceFileDraftChange(
                                          activeDoc?.path ?? activePath,
                                          (e.target as HTMLTextAreaElement).value,
                                        )}
                                    ></textarea>
                                  </label>
                                  <div class="muted mono" style="margin-top: 8px;">
                                    Encoding:
                                    ${
                                      activeDraft?.kind === "text"
                                        ? activeDraft.encoding
                                        : (activeDoc?.encoding ?? "utf-8")
                                    }
                                    ${
                                      activeDraft?.kind === "text" && activeDraft.includeBom
                                        ? " · BOM"
                                        : ""
                                    }
                                  </div>
                                `
                          }
                        `
                  }
                </div>
              </div>
            `
      }
    </section>
  `;
}

function renderWorkspaceEntryRow(
  entry: AgentWorkspaceFileEntry,
  activePath: string | null,
  onSelect: () => void,
) {
  const status =
    entry.kind === "directory"
      ? "Directory"
      : `${formatBytes(entry.size)} · ${formatRelativeTimestamp(entry.updatedAtMs ?? null)}`;
  return html`
    <button
      type="button"
      class="agent-file-row ${activePath === entry.path ? "active" : ""}"
      @click=${onSelect}
    >
      <div>
        <div class="agent-file-name mono">
          ${entry.kind === "directory" ? `${entry.name}/` : entry.name}
        </div>
        <div class="agent-file-meta">${status}</div>
      </div>
    </button>
  `;
}

function shouldHideWorkspaceManager(configForm: Record<string, unknown> | null): boolean {
  if (!configForm || typeof configForm !== "object") {
    return false;
  }
  const root = configForm as Record<string, unknown>;
  const gateway = asRecord(root.gateway);
  const controlUi = asRecord(gateway?.controlUi);
  if (controlUi?.hideAgentFileExchangeWhenGoogleDriveEnabled !== true) {
    return false;
  }
  const plugins = asRecord(root.plugins);
  const entries = asRecord(plugins?.entries);
  const toolkit = asRecord(entries?.["gws-toolkit-phase1"]);
  if (toolkit?.enabled !== true) {
    return false;
  }
  const pluginConfig = asRecord(toolkit.config);
  const enabledServices = Array.isArray(pluginConfig?.enabledServices)
    ? pluginConfig.enabledServices.filter((value): value is string => typeof value === "string")
    : ["drive"];
  return enabledServices.some((service) => service.trim().toLowerCase() === "drive");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}
