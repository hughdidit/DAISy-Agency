import { html, nothing } from "lit";
import { ref } from "lit/directives/ref.js";
import { repeat } from "lit/directives/repeat.js";
import type { SessionsListResult } from "../types";
import type { ChatAttachment, ChatQueueItem } from "../ui-types";
import type { ChatItem, MessageGroup } from "../types/chat-types";
import { icons } from "../icons";
import {
  normalizeMessage,
  normalizeRoleForGrouping,
} from "../chat/message-normalizer";
import {
  renderMessageGroup,
  renderReadingIndicatorGroup,
  renderStreamingGroup,
<<<<<<< HEAD
} from "../chat/grouped-render";
import { renderMarkdownSidebar } from "./markdown-sidebar";
import "../components/resizable-divider";
=======
} from "../chat/grouped-render.ts";
import { normalizeMessage, normalizeRoleForGrouping } from "../chat/message-normalizer.ts";
import { icons } from "../icons.ts";
import { detectTextDirection } from "../text-direction.ts";
<<<<<<< HEAD
=======
import type { SessionsListResult } from "../types.ts";
import type { ChatItem, MessageGroup } from "../types/chat-types.ts";
import type { ChatAttachment, ChatQueueItem } from "../ui-types.ts";
>>>>>>> 26ab93f0e (revert(ui): remove recent UI dashboard/theme commits from main)
import { renderMarkdownSidebar } from "./markdown-sidebar.ts";
import "../components/resizable-divider.ts";
>>>>>>> ae7e37774 (feat(ui): add RTL support for Hebrew/Arabic text in webchat (openclaw#11498) thanks @dirbalak)

export type CompactionIndicatorStatus = {
  active: boolean;
  startedAt: number | null;
  completedAt: number | null;
};

export type ChatProps = {
  sessionKey: string;
  onSessionKeyChange: (next: string) => void;
  thinkingLevel: string | null;
  showThinking: boolean;
  loading: boolean;
  sending: boolean;
  canAbort?: boolean;
  compactionStatus?: CompactionIndicatorStatus | null;
  messages: unknown[];
  toolMessages: unknown[];
  stream: string | null;
  streamStartedAt: number | null;
  assistantAvatarUrl?: string | null;
  draft: string;
  queue: ChatQueueItem[];
  connected: boolean;
  canSend: boolean;
  disabledReason: string | null;
  error: string | null;
  sessions: SessionsListResult | null;
  // Focus mode
  focusMode: boolean;
  // Sidebar state
  sidebarOpen?: boolean;
  sidebarContent?: string | null;
  sidebarError?: string | null;
  splitRatio?: number;
  assistantName: string;
  assistantAvatar: string | null;
  // Image attachments
  attachments?: ChatAttachment[];
  onAttachmentsChange?: (attachments: ChatAttachment[]) => void;
  // Event handlers
  onRefresh: () => void;
  onToggleFocusMode: () => void;
  onDraftChange: (next: string) => void;
  onSend: () => void;
  onAbort?: () => void;
  onQueueRemove: (id: string) => void;
  onNewSession: () => void;
  onOpenSidebar?: (content: string) => void;
  onCloseSidebar?: () => void;
  onSplitRatioChange?: (ratio: number) => void;
  onChatScroll?: (event: Event) => void;
};

const COMPACTION_TOAST_DURATION_MS = 5000;
<<<<<<< HEAD
=======
const FALLBACK_TOAST_DURATION_MS = 8000;

// Persistent instances keyed by session
const inputHistories = new Map<string, InputHistory>();
const pinnedMessagesMap = new Map<string, PinnedMessages>();
const deletedMessagesMap = new Map<string, DeletedMessages>();

function getInputHistory(sessionKey: string): InputHistory {
  let h = inputHistories.get(sessionKey);
  if (!h) {
    h = new InputHistory();
    inputHistories.set(sessionKey, h);
  }
  return h;
}

function getPinnedMessages(sessionKey: string): PinnedMessages {
  let p = pinnedMessagesMap.get(sessionKey);
  if (!p) {
    p = new PinnedMessages(sessionKey);
    pinnedMessagesMap.set(sessionKey, p);
  }
  return p;
}

function getDeletedMessages(sessionKey: string): DeletedMessages {
  let d = deletedMessagesMap.get(sessionKey);
  if (!d) {
    d = new DeletedMessages(sessionKey);
    deletedMessagesMap.set(sessionKey, d);
  }
  return d;
}

// Module-level ephemeral UI state (reset on navigation away)
let slashMenuOpen = false;
let slashMenuItems: SlashCommandDef[] = [];
let slashMenuIndex = 0;
let searchOpen = false;
let searchQuery = "";
let pinnedExpanded = false;
let voiceActive = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recognition: any = null;
>>>>>>> 26ab93f0e (revert(ui): remove recent UI dashboard/theme commits from main)

function adjustTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function renderCompactionIndicator(status: CompactionIndicatorStatus | null | undefined) {
  if (!status) return nothing;

  // Show "compacting..." while active
  if (status.active) {
    return html`
      <div class="callout info compaction-indicator compaction-indicator--active">
        ${icons.loader} Compacting context...
      </div>
    `;
  }

  // Show "compaction complete" briefly after completion
  if (status.completedAt) {
    const elapsed = Date.now() - status.completedAt;
    if (elapsed < COMPACTION_TOAST_DURATION_MS) {
      return html`
        <div class="callout success compaction-indicator compaction-indicator--complete">
          ${icons.check} Context compacted
        </div>
      `;
    }
  }

  return nothing;
}

function generateAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function handlePaste(
  e: ClipboardEvent,
  props: ChatProps,
) {
  const items = e.clipboardData?.items;
  if (!items || !props.onAttachmentsChange) return;

  const imageItems: DataTransferItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith("image/")) {
      imageItems.push(item);
    }
  }

  if (imageItems.length === 0) return;

  e.preventDefault();

  for (const item of imageItems) {
    const file = item.getAsFile();
    if (!file) continue;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newAttachment: ChatAttachment = {
        id: generateAttachmentId(),
        dataUrl,
        mimeType: file.type,
      };
      const current = props.attachments ?? [];
      props.onAttachmentsChange?.([...current, newAttachment]);
    };
    reader.readAsDataURL(file);
  }
}

function renderAttachmentPreview(props: ChatProps) {
  const attachments = props.attachments ?? [];
  if (attachments.length === 0) return nothing;

  return html`
    <div class="chat-attachments">
      ${attachments.map(
        (att) => html`
          <div class="chat-attachment">
            <img
              src=${att.dataUrl}
              alt="Attachment preview"
              class="chat-attachment__img"
            />
            <button
              class="chat-attachment__remove"
              type="button"
              aria-label="Remove attachment"
              @click=${() => {
                const next = (props.attachments ?? []).filter(
                  (a) => a.id !== att.id,
                );
                props.onAttachmentsChange?.(next);
              }}
            >
              ${icons.x}
            </button>
          </div>
        `,
      )}
    </div>
  `;
}

<<<<<<< HEAD
=======
function updateSlashMenu(value: string, requestUpdate: () => void): void {
  const match = value.match(/^\/(\S*)$/);
  if (match) {
    const items = getSlashCommandCompletions(match[1]);
    slashMenuItems = items;
    slashMenuOpen = items.length > 0;
    slashMenuIndex = 0;
  } else {
    slashMenuOpen = false;
    slashMenuItems = [];
  }
  requestUpdate();
}

function selectSlashCommand(
  cmd: SlashCommandDef,
  props: ChatProps,
  requestUpdate: () => void,
): void {
  const text = `/${cmd.name} `;
  props.onDraftChange(text);
  slashMenuOpen = false;
  slashMenuItems = [];
  requestUpdate();
}

function tokenEstimate(draft: string): string | null {
  if (draft.length < 100) {
    return null;
  }
  return `~${Math.ceil(draft.length / 4)} tokens`;
}

function startVoice(props: ChatProps, requestUpdate: () => void): void {
  const SR =
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition ??
    (window as unknown as Record<string, unknown>).SpeechRecognition;
  if (!SR) {
    return;
  }
  const rec = new (SR as new () => Record<string, unknown>)();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = "en-US";
  rec.onresult = (event: Record<string, unknown>) => {
    let transcript = "";
    const results = (
      event as { results: { length: number; [i: number]: { 0: { transcript: string } } } }
    ).results;
    for (let i = 0; i < results.length; i++) {
      transcript += results[i][0].transcript;
    }
    props.onDraftChange(transcript);
  };
  (rec as unknown as EventTarget).addEventListener("end", () => {
    voiceActive = false;
    recognition = null;
    requestUpdate();
  });
  (rec as unknown as EventTarget).addEventListener("error", () => {
    voiceActive = false;
    recognition = null;
    requestUpdate();
  });
  (rec as { start: () => void }).start();
  recognition = rec;
  voiceActive = true;
  requestUpdate();
}

function stopVoice(requestUpdate: () => void): void {
  if (recognition && typeof recognition.stop === "function") {
    recognition.stop();
  }
  recognition = null;
  voiceActive = false;
  requestUpdate();
}

function exportMarkdown(props: ChatProps): void {
  const history = Array.isArray(props.messages) ? props.messages : [];
  if (history.length === 0) {
    return;
  }
  const lines: string[] = [`# Chat with ${props.assistantName}`, ""];
  for (const msg of history) {
    const m = msg as Record<string, unknown>;
    const role = m.role === "user" ? "You" : m.role === "assistant" ? props.assistantName : "Tool";
    const content = typeof m.content === "string" ? m.content : "";
    const ts = typeof m.timestamp === "number" ? new Date(m.timestamp).toISOString() : "";
    lines.push(`## ${role}${ts ? ` (${ts})` : ""}`, "", content, "");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-${props.assistantName}-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderWelcomeState(props: ChatProps): TemplateResult {
  const name = props.assistantName || "Assistant";
  const avatar = props.assistantAvatar ?? props.assistantAvatarUrl;
  const initials = name.slice(0, 2).toUpperCase();

  return html`
    <div class="agent-chat__welcome" style="--agent-color: var(--accent)">
      <div class="agent-chat__welcome-glow"></div>
      ${
        avatar
          ? html`<img src=${avatar} alt=${name} style="width:56px; height:56px; border-radius:50%; object-fit:cover;" />`
          : html`<div class="agent-chat__avatar">${initials}</div>`
      }
      <h2>${name}</h2>
      <div class="agent-chat__badges">
        <span class="agent-chat__badge">${icons.spark} Ready to chat</span>
      </div>
      <p class="agent-chat__hint">
        Type a message below &middot; <kbd>/</kbd> for commands
      </p>
    </div>
  `;
}

function renderSearchBar(requestUpdate: () => void): TemplateResult | typeof nothing {
  if (!searchOpen) {
    return nothing;
  }
  return html`
    <div class="agent-chat__search-bar">
      ${icons.search}
      <input
        type="text"
        placeholder="Search messages..."
        .value=${searchQuery}
        @input=${(e: Event) => {
          searchQuery = (e.target as HTMLInputElement).value;
          requestUpdate();
        }}
      />
      <button class="btn-ghost" @click=${() => {
        searchOpen = false;
        searchQuery = "";
        requestUpdate();
      }}>
        ${icons.x}
      </button>
    </div>
  `;
}

function renderPinnedSection(
  props: ChatProps,
  pinned: PinnedMessages,
  requestUpdate: () => void,
): TemplateResult | typeof nothing {
  const messages = Array.isArray(props.messages) ? props.messages : [];
  const entries: Array<{ index: number; text: string; role: string }> = [];
  for (const idx of pinned.indices) {
    const msg = messages[idx] as Record<string, unknown> | undefined;
    if (!msg) {
      continue;
    }
    const text = typeof msg.content === "string" ? msg.content : "";
    const role = typeof msg.role === "string" ? msg.role : "unknown";
    entries.push({ index: idx, text, role });
  }
  if (entries.length === 0) {
    return nothing;
  }
  return html`
    <div class="agent-chat__pinned">
      <button class="agent-chat__pinned-toggle" @click=${() => {
        pinnedExpanded = !pinnedExpanded;
        requestUpdate();
      }}>
        ${icons.bookmark}
        ${entries.length} pinned
        ${pinnedExpanded ? icons.chevronDown : icons.chevronRight}
      </button>
      ${
        pinnedExpanded
          ? html`
            <div class="agent-chat__pinned-list">
              ${entries.map(
                ({ index, text, role }) => html`
                <div class="agent-chat__pinned-item">
                  <span class="agent-chat__pinned-role">${role === "user" ? "You" : "Assistant"}</span>
                  <span class="agent-chat__pinned-text">${text.slice(0, 100)}${text.length > 100 ? "..." : ""}</span>
                  <button class="btn-ghost" @click=${() => {
                    pinned.unpin(index);
                    requestUpdate();
                  }} title="Unpin">
                    ${icons.x}
                  </button>
                </div>
              `,
              )}
            </div>
          `
          : nothing
      }
    </div>
  `;
}

function renderSlashMenu(
  requestUpdate: () => void,
  props: ChatProps,
): TemplateResult | typeof nothing {
  if (!slashMenuOpen || slashMenuItems.length === 0) {
    return nothing;
  }

  const grouped = new Map<
    SlashCommandCategory,
    Array<{ cmd: SlashCommandDef; globalIdx: number }>
  >();
  for (let i = 0; i < slashMenuItems.length; i++) {
    const cmd = slashMenuItems[i];
    const cat = cmd.category ?? "session";
    let list = grouped.get(cat);
    if (!list) {
      list = [];
      grouped.set(cat, list);
    }
    list.push({ cmd, globalIdx: i });
  }

  const sections: TemplateResult[] = [];
  for (const [cat, entries] of grouped) {
    sections.push(html`
      <div class="slash-menu-group">
        <div class="slash-menu-group__label">${CATEGORY_LABELS[cat]}</div>
        ${entries.map(
          ({ cmd, globalIdx }) => html`
            <div
              class="slash-menu-item ${globalIdx === slashMenuIndex ? "slash-menu-item--active" : ""}"
              @click=${() => selectSlashCommand(cmd, props, requestUpdate)}
              @mouseenter=${() => {
                slashMenuIndex = globalIdx;
                requestUpdate();
              }}
            >
              ${cmd.icon ? html`<span class="slash-menu-icon">${icons[cmd.icon]}</span>` : nothing}
              <span class="slash-menu-name">/${cmd.name}</span>
              ${cmd.args ? html`<span class="slash-menu-args">${cmd.args}</span>` : nothing}
              <span class="slash-menu-desc">${cmd.description}</span>
            </div>
          `,
        )}
      </div>
    `);
  }

  return html`<div class="slash-menu">${sections}</div>`;
}

>>>>>>> 26ab93f0e (revert(ui): remove recent UI dashboard/theme commits from main)
export function renderChat(props: ChatProps) {
  const canCompose = props.connected;
  const isBusy = props.sending || props.stream !== null;
  const canAbort = Boolean(props.canAbort && props.onAbort);
  const activeSession = props.sessions?.sessions?.find(
    (row) => row.key === props.sessionKey,
  );
  const reasoningLevel = activeSession?.reasoningLevel ?? "off";
  const showReasoning = props.showThinking && reasoningLevel !== "off";
  const assistantIdentity = {
    name: props.assistantName,
    avatar: props.assistantAvatar ?? props.assistantAvatarUrl ?? null,
  };

<<<<<<< HEAD
  const hasAttachments = (props.attachments?.length ?? 0) > 0;
  const composePlaceholder = props.connected
=======
  const hasVoice =
    typeof (window as unknown as Record<string, unknown>).webkitSpeechRecognition !== "undefined" ||
    typeof (window as unknown as Record<string, unknown>).SpeechRecognition !== "undefined";

  const placeholder = props.connected
>>>>>>> 26ab93f0e (revert(ui): remove recent UI dashboard/theme commits from main)
    ? hasAttachments
      ? "Add a message or paste more images..."
      : "Message (↩ to send, Shift+↩ for line breaks, paste images)"
    : "Connect to the gateway to start chatting…";

  const splitRatio = props.splitRatio ?? 0.6;
  const sidebarOpen = Boolean(props.sidebarOpen && props.onCloseSidebar);
  const thread = html`
    <div
      class="chat-thread"
      role="log"
      aria-live="polite"
      @scroll=${props.onChatScroll}
    >
<<<<<<< HEAD
      ${props.loading ? html`<div class="muted">Loading chat…</div>` : nothing}
      ${repeat(buildChatItems(props), (item) => item.key, (item) => {
        if (item.kind === "reading-indicator") {
          return renderReadingIndicatorGroup(assistantIdentity);
        }

        if (item.kind === "stream") {
          return renderStreamingGroup(
            item.text,
            item.startedAt,
            props.onOpenSidebar,
            assistantIdentity,
          );
        }

        if (item.kind === "group") {
          return renderMessageGroup(item, {
            onOpenSidebar: props.onOpenSidebar,
            showReasoning,
            assistantName: props.assistantName,
            assistantAvatar: assistantIdentity.avatar,
          });
        }

        return nothing;
      })}
    </div>
  `;

=======
      ${
        props.loading
          ? html`
              <div class="muted">Loading chat...</div>
            `
          : nothing
      }
      ${isEmpty && !searchOpen ? renderWelcomeState(props) : nothing}
      ${
        isEmpty && searchOpen
          ? html`
              <div class="agent-chat__empty">No matching messages</div>
            `
          : nothing
      }
      ${repeat(
        chatItems,
        (item) => item.key,
        (item) => {
          if (item.kind === "divider") {
            return html`
              <div class="chat-divider" role="separator" data-ts=${String(item.timestamp)}>
                <span class="chat-divider__line"></span>
                <span class="chat-divider__label">${item.label}</span>
                <span class="chat-divider__line"></span>
              </div>
            `;
          }
          if (item.kind === "reading-indicator") {
            return renderReadingIndicatorGroup(assistantIdentity);
          }
          if (item.kind === "stream") {
            return renderStreamingGroup(
              item.text,
              item.startedAt,
              props.onOpenSidebar,
              assistantIdentity,
            );
          }
          if (item.kind === "group") {
            if (deleted.has(item.key)) {
              return nothing;
            }
            return renderMessageGroup(item, {
              onOpenSidebar: props.onOpenSidebar,
              showReasoning,
              assistantName: props.assistantName,
              assistantAvatar: assistantIdentity.avatar,
              onDelete: () => {
                deleted.delete(item.key);
                requestUpdate();
              },
            });
          }
          return nothing;
        },
      )}
    </div>
  `;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Slash menu navigation
    if (slashMenuOpen && slashMenuItems.length > 0) {
      const len = slashMenuItems.length;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          slashMenuIndex = (slashMenuIndex + 1) % len;
          requestUpdate();
          return;
        case "ArrowUp":
          e.preventDefault();
          slashMenuIndex = (slashMenuIndex - 1 + len) % len;
          requestUpdate();
          return;
        case "Enter":
        case "Tab":
          e.preventDefault();
          selectSlashCommand(slashMenuItems[slashMenuIndex], props, requestUpdate);
          return;
        case "Escape":
          e.preventDefault();
          slashMenuOpen = false;
          requestUpdate();
          return;
      }
    }

    // Input history (only when input is empty)
    if (!props.draft.trim()) {
      if (e.key === "ArrowUp") {
        const prev = inputHistory.up();
        if (prev !== null) {
          e.preventDefault();
          props.onDraftChange(prev);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        const next = inputHistory.down();
        e.preventDefault();
        props.onDraftChange(next ?? "");
        return;
      }
    }

    // Cmd+F for search
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "f") {
      e.preventDefault();
      searchOpen = !searchOpen;
      if (!searchOpen) {
        searchQuery = "";
      }
      requestUpdate();
      return;
    }

    // Send on Enter (without shift)
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.isComposing || e.keyCode === 229) {
        return;
      }
      if (!props.connected) {
        return;
      }
      e.preventDefault();
      if (canCompose) {
        if (props.draft.trim()) {
          inputHistory.push(props.draft);
        }
        props.onSend();
      }
    }
  };

  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    adjustTextareaHeight(target);
    props.onDraftChange(target.value);
    updateSlashMenu(target.value, requestUpdate);
    inputHistory.reset();
  };

>>>>>>> 26ab93f0e (revert(ui): remove recent UI dashboard/theme commits from main)
  return html`
    <section class="card chat">
      ${props.disabledReason
        ? html`<div class="callout">${props.disabledReason}</div>`
        : nothing}

      ${props.error
        ? html`<div class="callout danger">${props.error}</div>`
        : nothing}

      ${renderCompactionIndicator(props.compactionStatus)}

      ${props.focusMode
        ? html`
            <button
              class="chat-focus-exit"
              type="button"
              @click=${props.onToggleFocusMode}
              aria-label="Exit focus mode"
              title="Exit focus mode"
            >
              ${icons.x}
            </button>
          `
        : nothing}

<<<<<<< HEAD
      <div
        class="chat-split-container ${sidebarOpen ? "chat-split-container--open" : ""}"
      >
=======
      ${renderSearchBar(requestUpdate)}
      ${renderPinnedSection(props, pinned, requestUpdate)}

      ${renderAgentBar(props)}

      <div class="chat-split-container ${sidebarOpen ? "chat-split-container--open" : ""}">
>>>>>>> 26ab93f0e (revert(ui): remove recent UI dashboard/theme commits from main)
        <div
          class="chat-main"
          style="flex: ${sidebarOpen ? `0 0 ${splitRatio * 100}%` : "1 1 100%"}"
        >
          ${thread}
        </div>

        ${sidebarOpen
          ? html`
              <resizable-divider
                .splitRatio=${splitRatio}
                @resize=${(e: CustomEvent) =>
                  props.onSplitRatioChange?.(e.detail.splitRatio)}
              ></resizable-divider>
              <div class="chat-sidebar">
                ${renderMarkdownSidebar({
                  content: props.sidebarContent ?? null,
                  error: props.sidebarError ?? null,
                  onClose: props.onCloseSidebar!,
                  onViewRawText: () => {
                    if (!props.sidebarContent || !props.onOpenSidebar) return;
                    props.onOpenSidebar(`\`\`\`\n${props.sidebarContent}\n\`\`\``);
                  },
                })}
              </div>
            `
          : nothing}
      </div>

      ${props.queue.length
        ? html`
            <div class="chat-queue" role="status" aria-live="polite">
              <div class="chat-queue__title">Queued (${props.queue.length})</div>
              <div class="chat-queue__list">
                ${props.queue.map(
                  (item) => html`
                    <div class="chat-queue__item">
                      <div class="chat-queue__text">
                        ${item.text ||
                        (item.attachments?.length
                          ? `Image (${item.attachments.length})`
                          : "")}
                      </div>
                      <button
                        class="btn chat-queue__remove"
                        type="button"
                        aria-label="Remove queued message"
                        @click=${() => props.onQueueRemove(item.id)}
                      >
                        ${icons.x}
                      </button>
                    </div>
                  `,
                )}
              </div>
            </div>
          `
<<<<<<< HEAD
        : nothing}
=======
          : nothing
      }

      ${
        props.showNewMessages
          ? html`
            <button
              class="btn chat-new-messages"
              type="button"
              @click=${props.onScrollToBottom}
            >
              New messages ${icons.arrowDown}
            </button>
          `
          : nothing
      }
>>>>>>> 9f16de253 (style: update chat new-messages button)

      <div class="chat-compose">
        ${renderAttachmentPreview(props)}
        <div class="chat-compose__row">
          <label class="field chat-compose__field">
            <span>Message</span>
            <textarea
              ${ref((el) => el && adjustTextareaHeight(el as HTMLTextAreaElement))}
              .value=${props.draft}
              dir=${detectTextDirection(props.draft)}
              ?disabled=${!props.connected}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key !== "Enter") return;
                if (e.isComposing || e.keyCode === 229) return;
                if (e.shiftKey) return; // Allow Shift+Enter for line breaks
                if (!props.connected) return;
                e.preventDefault();
                if (canCompose) props.onSend();
              }}
              @input=${(e: Event) => {
                const target = e.target as HTMLTextAreaElement;
                adjustTextareaHeight(target);
                props.onDraftChange(target.value);
              }}
              @paste=${(e: ClipboardEvent) => handlePaste(e, props)}
              placeholder=${composePlaceholder}
            ></textarea>
          </label>
          <div class="chat-compose__actions">
            <button
              class="btn"
              ?disabled=${!props.connected || (!canAbort && props.sending)}
              @click=${canAbort ? props.onAbort : props.onNewSession}
            >
              ${canAbort ? "Stop" : "New session"}
            </button>
<<<<<<< HEAD
            <button
              class="btn primary"
              ?disabled=${!props.connected}
              @click=${props.onSend}
            >
              ${isBusy ? "Queue" : "Send"}<kbd class="btn-kbd">↵</kbd>
            </button>
=======

            ${
              hasVoice
                ? html`
                  <button
                    class="agent-chat__input-btn ${voiceActive ? "agent-chat__input-btn--active" : ""}"
                    @click=${() => {
                      if (voiceActive) {
                        stopVoice(requestUpdate);
                      } else {
                        startVoice(props, requestUpdate);
                      }
                    }}
                    title="Voice input"
                  >
                    ${voiceActive ? icons.micOff : icons.mic}
                  </button>
                `
                : nothing
            }

            ${tokens ? html`<span class="agent-chat__token-count">${tokens}</span>` : nothing}
          </div>

          <div class="agent-chat__toolbar-right">
            <button class="btn-ghost" @click=${() => {
              searchOpen = !searchOpen;
              if (!searchOpen) {
                searchQuery = "";
              }
              requestUpdate();
            }} title="Search (Cmd+F)">
              ${icons.search}
            </button>
            <button class="btn-ghost" @click=${() => exportMarkdown(props)} title="Export" ?disabled=${props.messages.length === 0}>
              ${icons.download}
            </button>
            ${
              props.messages.length > 0
                ? html`
                  <span class="agent-chat__input-divider"></span>
                  <button class="btn-ghost" @click=${() => props.onSend()} title="Compact" ?disabled=${!props.connected || props.sending}>
                    ${icons.refresh}
                  </button>
                  <button class="btn-ghost" @click=${props.onNewSession} title="New chat" ?disabled=${!props.connected || props.sending}>
                    ${icons.plus}
                  </button>
                  <button class="btn-ghost btn-ghost--danger" @click=${props.onClearHistory} title="Clear history" ?disabled=${!props.connected || props.sending}>
                    ${icons.trash}
                  </button>
                `
                : nothing
            }

            ${
              canAbort && isBusy
                ? html`
                  <button class="chat-send-btn chat-send-btn--stop" @click=${props.onAbort} title="Stop">
                    ${icons.stop}
                  </button>
                `
                : html`
                  <button
                    class="chat-send-btn"
                    @click=${() => {
                      if (props.draft.trim()) {
                        inputHistory.push(props.draft);
                      }
                      props.onSend();
                    }}
                    ?disabled=${!props.connected || props.sending}
                    title=${isBusy ? "Queue" : "Send"}
                  >
                    ${icons.send}
                  </button>
                `
            }
>>>>>>> 26ab93f0e (revert(ui): remove recent UI dashboard/theme commits from main)
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAgentBar(props: ChatProps) {
  const agents = props.agentsList?.agents ?? [];
  if (agents.length <= 1 && !props.sessions?.sessions?.length) {
    return nothing;
  }

  // Filter sessions for current agent
  const agentSessions = (props.sessions?.sessions ?? []).filter((s) => {
    const key = s.key ?? "";
    return (
      key.includes(`:${props.currentAgentId}:`) || key.startsWith(`agent:${props.currentAgentId}:`)
    );
  });

  return html`
    <div class="chat-agent-bar">
      <div class="chat-agent-bar__left">
        ${
          agents.length > 1
            ? html`
            <select
              class="chat-agent-select"
              .value=${props.currentAgentId}
              @change=${(e: Event) => props.onAgentChange((e.target as HTMLSelectElement).value)}
            >
              ${agents.map(
                (a) => html`
                <option value=${a.id} ?selected=${a.id === props.currentAgentId}>
                  ${a.identity?.name || a.name || a.id}
                </option>
              `,
              )}
            </select>
          `
            : html`<span class="chat-agent-bar__name">${agents[0]?.identity?.name || agents[0]?.name || props.currentAgentId}</span>`
        }
        ${
          agentSessions.length > 0
            ? html`
            <details class="chat-sessions-panel">
              <summary class="chat-sessions-summary">
                ${icons.fileText}
                <span>Sessions (${agentSessions.length})</span>
              </summary>
              <div class="chat-sessions-list">
                ${agentSessions.map(
                  (s) => html`
                  <button
                    class="chat-session-item ${s.key === props.sessionKey ? "chat-session-item--active" : ""}"
                    @click=${() => props.onSessionSelect?.(s.key)}
                  >
                    <span class="chat-session-item__name">${s.displayName || s.label || s.key}</span>
                    <span class="chat-session-item__meta muted">${s.model ?? ""}</span>
                  </button>
                `,
                )}
              </div>
            </details>
          `
            : nothing
        }
      </div>
      <div class="chat-agent-bar__right">
        ${
          props.onNavigateToAgent
            ? html`
            <button class="btn-ghost btn-ghost--sm" @click=${() => props.onNavigateToAgent?.()} title="Agent settings">
              ${icons.settings}
            </button>
          `
            : nothing
        }
      </div>
    </div>
  `;
}

const CHAT_HISTORY_RENDER_LIMIT = 200;

function groupMessages(items: ChatItem[]): Array<ChatItem | MessageGroup> {
  const result: Array<ChatItem | MessageGroup> = [];
  let currentGroup: MessageGroup | null = null;

  for (const item of items) {
    if (item.kind !== "message") {
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push(item);
      continue;
    }

    const normalized = normalizeMessage(item.message);
    const role = normalizeRoleForGrouping(normalized.role);
    const timestamp = normalized.timestamp || Date.now();

    if (!currentGroup || currentGroup.role !== role) {
      if (currentGroup) result.push(currentGroup);
      currentGroup = {
        kind: "group",
        key: `group:${role}:${item.key}`,
        role,
        messages: [{ message: item.message, key: item.key }],
        timestamp,
        isStreaming: false,
      };
    } else {
      currentGroup.messages.push({ message: item.message, key: item.key });
    }
  }

  if (currentGroup) result.push(currentGroup);
  return result;
}

function buildChatItems(props: ChatProps): Array<ChatItem | MessageGroup> {
  const items: ChatItem[] = [];
  const history = Array.isArray(props.messages) ? props.messages : [];
  const tools = Array.isArray(props.toolMessages) ? props.toolMessages : [];
  const historyStart = Math.max(0, history.length - CHAT_HISTORY_RENDER_LIMIT);
  if (historyStart > 0) {
    items.push({
      kind: "message",
      key: "chat:history:notice",
      message: {
        role: "system",
        content: `Showing last ${CHAT_HISTORY_RENDER_LIMIT} messages (${historyStart} hidden).`,
        timestamp: Date.now(),
      },
    });
  }
  for (let i = historyStart; i < history.length; i++) {
    const msg = history[i];
    const normalized = normalizeMessage(msg);

    if (!props.showThinking && normalized.role.toLowerCase() === "toolresult") {
      continue;
    }

    items.push({
      kind: "message",
      key: messageKey(msg, i),
      message: msg,
    });
  }
  if (props.showThinking) {
    for (let i = 0; i < tools.length; i++) {
      items.push({
        kind: "message",
        key: messageKey(tools[i], i + history.length),
        message: tools[i],
      });
    }
  }

  if (props.stream !== null) {
    const key = `stream:${props.sessionKey}:${props.streamStartedAt ?? "live"}`;
    if (props.stream.trim().length > 0) {
      items.push({
        kind: "stream",
        key,
        text: props.stream,
        startedAt: props.streamStartedAt ?? Date.now(),
      });
    } else {
      items.push({ kind: "reading-indicator", key });
    }
  }

  return groupMessages(items);
}

function messageKey(message: unknown, index: number): string {
  const m = message as Record<string, unknown>;
  const toolCallId = typeof m.toolCallId === "string" ? m.toolCallId : "";
  if (toolCallId) return `tool:${toolCallId}`;
  const id = typeof m.id === "string" ? m.id : "";
  if (id) return `msg:${id}`;
  const messageId = typeof m.messageId === "string" ? m.messageId : "";
  if (messageId) return `msg:${messageId}`;
  const timestamp = typeof m.timestamp === "number" ? m.timestamp : null;
  const role = typeof m.role === "string" ? m.role : "unknown";
  if (timestamp != null) return `msg:${role}:${timestamp}:${index}`;
  return `msg:${role}:${index}`;
}
