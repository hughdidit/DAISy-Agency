import { html, nothing } from "lit";
import { ref } from "lit/directives/ref.js";
import { t } from "../../i18n/index.ts";
import type { KanbanCardDraft, KanbanImportFormat } from "../controllers/kanban.ts";
import type {
  KanbanActivity,
  KanbanBoard,
  KanbanCard,
  KanbanImportTrelloPreviewResult,
  KanbanImportTrelloRunResult,
  KanbanStatusResult,
} from "../types.ts";

type KanbanLane = KanbanBoard["lanes"][number];
type KanbanLaneId = KanbanLane["id"];

export type KanbanProps = {
  loading: boolean;
  status: KanbanStatusResult | null;
  board: KanbanBoard | null;
  cards: KanbanCard[];
  activity: KanbanActivity[];
  error: string | null;
  importFormat: KanbanImportFormat;
  importContent: string;
  importFileName: string | null;
  importPreview: KanbanImportTrelloPreviewResult | null;
  importResult: KanbanImportTrelloRunResult | null;
  importBusy: boolean;
  importError: string | null;
  selectedCardId: string | null;
  selectedCard: KanbanCard | null;
  cardDraft: KanbanCardDraft | null;
  cardCommentDraft: string;
  cardBusy: boolean;
  cardError: string | null;
  showRefresh?: boolean;
  onRefresh: () => void | Promise<void>;
  onImportFormatChange: (format: KanbanImportFormat) => void;
  onImportContentChange: (content: string) => void;
  onImportFile: (file: File | null) => void | Promise<void>;
  onImportPreview: () => void | Promise<void>;
  onImportRun: () => void | Promise<void>;
  onCardSelect: (cardId: string) => void | Promise<void>;
  onCardClose: () => void;
  onCardDraftChange: <K extends keyof KanbanCardDraft>(field: K, value: KanbanCardDraft[K]) => void;
  onCardCommentChange: (value: string) => void;
  onCardSave: () => void | Promise<void>;
  onCardComment: () => void | Promise<void>;
  onCardDropMove?: (cardId: string, lane: KanbanCard["lane"]) => void | Promise<void>;
  onCardArchive: () => void | Promise<void>;
};

const KANBAN_PRIORITIES: Array<KanbanCard["priority"]> = ["urgent", "high", "normal", "low"];
const KANBAN_CARD_DRAG_MIME = "application/x-daisy-kanban-card";
let draggedKanbanCardId: string | null = null;

const DETAIL_FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

let detailPreviousFocus: HTMLElement | null = null;
let detailFocusedCardId: string | null = null;

function focusDetailModal(element: Element | undefined, cardId: string) {
  if (!(element instanceof HTMLElement) || detailFocusedCardId === cardId) {
    return;
  }
  const active = typeof document === "undefined" ? null : document.activeElement;
  detailPreviousFocus = active instanceof HTMLElement && !element.contains(active) ? active : null;
  detailFocusedCardId = cardId;
  queueMicrotask(() => {
    if (!element.isConnected) {
      return;
    }
    (element.querySelector<HTMLElement>("[data-kanban-detail-close]") ?? element).focus();
  });
}

function closeDetailModal(onClose: () => void) {
  const restoreFocus = detailPreviousFocus;
  detailPreviousFocus = null;
  detailFocusedCardId = null;
  onClose();
  queueMicrotask(() => {
    if (restoreFocus?.isConnected) {
      restoreFocus.focus();
    }
  });
}

function handleDetailModalKeydown(event: KeyboardEvent, closeDetail: () => void) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeDetail();
    return;
  }
  if (event.key !== "Tab") {
    return;
  }
  const modal = event.currentTarget as HTMLElement;
  const focusable = [...modal.querySelectorAll<HTMLElement>(DETAIL_FOCUSABLE_SELECTOR)].filter(
    (element) => element.getAttribute("aria-hidden") !== "true",
  );
  if (focusable.length === 0) {
    event.preventDefault();
    modal.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  const active = typeof document === "undefined" ? null : document.activeElement;
  if (event.shiftKey && (active === first || !modal.contains(active))) {
    event.preventDefault();
    last?.focus();
    return;
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function fallbackLanes(): KanbanLane[] {
  return [
    { id: "todo", title: t("kanban.lanes.todo"), position: 0 },
    { id: "in_progress", title: t("kanban.lanes.inProgress"), position: 1 },
    { id: "review", title: t("kanban.lanes.review"), position: 2 },
    { id: "done", title: t("kanban.lanes.done"), position: 3 },
  ];
}

function sortCards(cards: KanbanCard[]): KanbanCard[] {
  return cards.toSorted((a, b) => {
    const laneOrder = (a.lane ?? "").localeCompare(b.lane ?? "");
    if (laneOrder !== 0) {
      return laneOrder;
    }
    const aPosition = a.position ?? Number.MAX_SAFE_INTEGER;
    const bPosition = b.position ?? Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) {
      return aPosition - bPosition;
    }
    return (a.updatedAt ?? "").localeCompare(b.updatedAt ?? "");
  });
}

function formatIso(value: string | undefined): string {
  if (!value) {
    return t("common.na");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatShortDate(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function countChecklist(card: KanbanCard): { done: number; total: number } {
  const checklist = card.checklist ?? [];
  const total = checklist.length;
  const done = checklist.filter((item) => item.checked).length;
  return { done, total };
}

function isKanbanImportFormat(value: string): value is KanbanImportFormat {
  return value === "json" || value === "csv";
}

function isKanbanLaneId(value: string, lanes: KanbanLane[]): value is KanbanCard["lane"] {
  return lanes.some((lane) => lane.id === value);
}

function isKanbanPriority(value: string): value is KanbanCard["priority"] {
  return KANBAN_PRIORITIES.includes(value as KanbanCard["priority"]);
}

function renderCardBadges(card: KanbanCard) {
  const checklist = countChecklist(card);
  const due = formatShortDate(card.dueDate);
  const comments = card.comments ?? [];
  const links = card.links ?? [];
  const attachments = card.attachments ?? [];
  const priority = card.priority ?? "normal";
  return html`
    <div class="kanban-card__badges">
      <span class="kanban-badge kanban-badge--priority kanban-badge--${priority}">
        ${priority}
      </span>
      ${
        card.readyForCodex
          ? html`
              <span class="kanban-badge">${t("kanban.badges.codexReady")}</span>
            `
          : nothing
      }
      ${due ? html`<span class="kanban-badge">${t("kanban.badges.due", { date: due })}</span>` : nothing}
      ${
        checklist.total
          ? html`<span class="kanban-badge">${checklist.done}/${checklist.total}</span>`
          : nothing
      }
      ${
        comments.length
          ? html`<span class="kanban-badge">${t("kanban.badges.comments", { count: String(comments.length) })}</span>`
          : nothing
      }
      ${
        links.length
          ? html`<span class="kanban-badge">${t("kanban.badges.links", { count: String(links.length) })}</span>`
          : nothing
      }
      ${
        attachments.length
          ? html`<span class="kanban-badge">${t("kanban.badges.files", { count: String(attachments.length) })}</span>`
          : nothing
      }
    </div>
  `;
}

function setKanbanCardDragData(event: DragEvent, card: KanbanCard) {
  draggedKanbanCardId = card.id;
  if (!event.dataTransfer) {
    return;
  }
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(KANBAN_CARD_DRAG_MIME, card.id);
  event.dataTransfer.setData("text/plain", card.id);
}

function clearKanbanCardDragData() {
  draggedKanbanCardId = null;
}

function getKanbanCardDragId(event: DragEvent): string {
  if (!event.dataTransfer) {
    return "";
  }
  return event.dataTransfer.getData(KANBAN_CARD_DRAG_MIME).trim();
}

function hasKanbanCardDragData(event: DragEvent): boolean {
  const types = event.dataTransfer?.types;
  if (!types) {
    return false;
  }
  const dragTypes = new Set(Array.from(types));
  return dragTypes.has(KANBAN_CARD_DRAG_MIME);
}

function handleLaneDragOver(event: DragEvent, props: KanbanProps) {
  if (!props.onCardDropMove || !findDraggedKanbanCard(event, props)) {
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function handleLaneDrop(event: DragEvent, lane: KanbanLane, props: KanbanProps) {
  if (!props.onCardDropMove) {
    return;
  }
  const card = findDraggedKanbanCard(event, props);
  if (!card) {
    return;
  }
  event.preventDefault();
  clearKanbanCardDragData();
  if (card.lane === lane.id) {
    return;
  }
  void props.onCardDropMove(card.id, lane.id);
}

function findDraggedKanbanCard(event: DragEvent, props: KanbanProps): KanbanCard | null {
  if (!hasKanbanCardDragData(event) && !draggedKanbanCardId) {
    return null;
  }
  const cardId = draggedKanbanCardId ?? getKanbanCardDragId(event);
  return props.cards.find((candidate) => candidate.id === cardId) ?? null;
}

function renderCard(card: KanbanCard, props: KanbanProps) {
  const owner = card.assignee ?? card.inputOwner ?? null;
  const labels = card.labels ?? [];
  const selected = card.id === props.selectedCardId;
  return html`
    <button
      type="button"
      class="kanban-card ${selected ? "active" : ""}"
      data-card-id=${card.id}
      aria-pressed=${selected ? "true" : "false"}
      draggable=${props.onCardDropMove ? "true" : "false"}
      @click=${() => void props.onCardSelect(card.id)}
      @dragstart=${(event: DragEvent) => setKanbanCardDragData(event, card)}
      @dragend=${clearKanbanCardDragData}
    >
      <div class="kanban-card__title">${card.title}</div>
      ${
        card.description
          ? html`<div class="kanban-card__description">${card.description}</div>`
          : nothing
      }
      ${
        labels.length
          ? html`<div class="kanban-card__labels">
            ${labels.map((label) => html`<span class="kanban-label">${label}</span>`)}
          </div>`
          : nothing
      }
      ${renderCardBadges(card)}
      <div class="kanban-card__meta">
        ${
          owner
            ? html`<span>${owner}</span>`
            : html`
                <span>${t("kanban.card.unassigned")}</span>
              `
        }
        ${card.reviewer ? html`<span>${t("kanban.card.reviewer", { reviewer: card.reviewer })}</span>` : nothing}
        <span>v${card.version}</span>
      </div>
    </button>
  `;
}

function renderLane(lane: KanbanLane, cards: KanbanCard[], props: KanbanProps) {
  return html`
    <section class="kanban-lane" data-lane=${lane.id}>
      <div class="kanban-lane__header">
        <div class="kanban-lane__title">${lane.title}</div>
        <div class="kanban-lane__count">${cards.length}</div>
      </div>
      <div
        class="kanban-lane__cards"
        @dragover=${(event: DragEvent) => handleLaneDragOver(event, props)}
        @drop=${(event: DragEvent) => handleLaneDrop(event, lane, props)}
      >
        ${
          cards.length
            ? cards.map((card) => renderCard(card, props))
            : html`
                <div class="kanban-empty">${t("kanban.empty.noCards")}</div>
              `
        }
      </div>
    </section>
  `;
}

function renderDetailTextList(title: string, values: string[]) {
  if (!values.length) {
    return nothing;
  }
  return html`
    <section class="kanban-detail__section">
      <div class="kanban-detail__section-title">${title}</div>
      <div class="kanban-detail__list">
        ${values.map((value) => html`<div class="kanban-detail__list-item">${value}</div>`)}
      </div>
    </section>
  `;
}

function renderDetailReadonly(card: KanbanCard) {
  const comments = card.comments ?? [];
  const attachments = card.attachments ?? [];
  return html`
    <div class="kanban-detail__readonly">
      ${renderDetailTextList(t("kanban.detail.links"), card.links ?? [])}
      ${
        attachments.length
          ? html`
              <section class="kanban-detail__section">
                <div class="kanban-detail__section-title">${t("kanban.detail.attachments")}</div>
                <div class="kanban-detail__list">
                  ${attachments.map(
                    (attachment) => html`
                      <div class="kanban-detail__list-item">
                        <span>${attachment.fileName}</span>
                        <span class="muted">${attachment.sizeBytes} bytes</span>
                      </div>
                    `,
                  )}
                </div>
              </section>
            `
          : nothing
      }
      ${
        comments.length
          ? html`
              <section class="kanban-detail__section">
                <div class="kanban-detail__section-title">${t("kanban.detail.comments")}</div>
                <div class="kanban-detail__list">
                  ${comments.map(
                    (comment) => html`
                      <div class="kanban-comment">
                        <div class="kanban-comment__body">${comment.body}</div>
                        <div class="kanban-comment__meta">
                          <span>${comment.actor.name ?? comment.actor.id}</span>
                          <time datetime=${comment.createdAt}>${formatIso(comment.createdAt)}</time>
                        </div>
                      </div>
                    `,
                  )}
                </div>
              </section>
            `
          : nothing
      }
    </div>
  `;
}

function renderCardDetail(props: KanbanProps, lanes: KanbanLane[]) {
  const card = props.selectedCard;
  const draft = props.cardDraft;
  if (!card || !draft) {
    return nothing;
  }
  const disabled = props.cardBusy;
  const selectedLane = isKanbanLaneId(draft.lane, lanes) ? draft.lane : card.lane;
  const closeDetail = () => closeDetailModal(props.onCardClose);
  return html`
    <div
      class="kanban-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kanban-detail-title"
      tabindex="-1"
      ${ref((element) => focusDetailModal(element, card.id))}
      @keydown=${(event: KeyboardEvent) => handleDetailModalKeydown(event, closeDetail)}
      @click=${(event: Event) => {
        if (event.target === event.currentTarget) {
          closeDetail();
        }
      }}
    >
      <section class="kanban-detail" aria-label=${t("kanban.detail.title")}>
        <div class="kanban-detail__header">
          <div>
            <div id="kanban-detail-title" class="card-title">${t("kanban.detail.title")}</div>
            <div class="card-sub">${card.id} - v${card.version}</div>
          </div>
          <button class="btn btn--sm" data-kanban-detail-close @click=${closeDetail}>
            ${t("kanban.detail.close")}
          </button>
        </div>

        ${props.cardError ? html`<div class="callout danger">${props.cardError}</div>` : nothing}

        <div class="kanban-detail__form">
          <label class="field full">
            <span>${t("kanban.detail.fields.title")}</span>
            <input
              .value=${draft.title}
              ?disabled=${disabled}
              @input=${(event: Event) =>
                props.onCardDraftChange("title", (event.currentTarget as HTMLInputElement).value)}
            />
          </label>
          <label class="field full">
            <span>${t("kanban.detail.fields.description")}</span>
            <textarea
              class="kanban-detail__textarea"
              .value=${draft.description}
              ?disabled=${disabled}
              @input=${(event: Event) =>
                props.onCardDraftChange(
                  "description",
                  (event.currentTarget as HTMLTextAreaElement).value,
                )}
            ></textarea>
          </label>
          <label class="field">
            <span>${t("kanban.detail.fields.lane")}</span>
            <select
              .value=${selectedLane}
              ?disabled=${disabled}
              @change=${(event: Event) => {
                const lane = (event.currentTarget as HTMLSelectElement).value;
                if (isKanbanLaneId(lane, lanes)) {
                  props.onCardDraftChange("lane", lane);
                }
              }}
            >
              ${lanes.map(
                (lane) => html`
                  <option value=${lane.id} ?selected=${lane.id === selectedLane}>
                    ${lane.title}
                  </option>
                `,
              )}
            </select>
          </label>
          <label class="field">
            <span>${t("kanban.detail.fields.priority")}</span>
            <select
              .value=${draft.priority}
              ?disabled=${disabled}
              @change=${(event: Event) => {
                const priority = (event.currentTarget as HTMLSelectElement).value;
                if (isKanbanPriority(priority)) {
                  props.onCardDraftChange("priority", priority);
                }
              }}
            >
              ${KANBAN_PRIORITIES.map(
                (priority) => html`<option value=${priority}>${priority}</option>`,
              )}
            </select>
          </label>
          <label class="field">
            <span>${t("kanban.detail.fields.assignee")}</span>
            <input
              .value=${draft.assignee}
              ?disabled=${disabled}
              @input=${(event: Event) =>
                props.onCardDraftChange(
                  "assignee",
                  (event.currentTarget as HTMLInputElement).value,
                )}
            />
          </label>
          <label class="field">
            <span>${t("kanban.detail.fields.reviewer")}</span>
            <input
              .value=${draft.reviewer}
              ?disabled=${disabled}
              @input=${(event: Event) =>
                props.onCardDraftChange(
                  "reviewer",
                  (event.currentTarget as HTMLInputElement).value,
                )}
            />
          </label>
          <label class="field">
            <span>${t("kanban.detail.fields.inputOwner")}</span>
            <input
              .value=${draft.inputOwner}
              ?disabled=${disabled}
              @input=${(event: Event) =>
                props.onCardDraftChange(
                  "inputOwner",
                  (event.currentTarget as HTMLInputElement).value,
                )}
            />
          </label>
          <label class="field">
            <span>${t("kanban.detail.fields.dueDate")}</span>
            <input
              type="date"
              .value=${draft.dueDate}
              ?disabled=${disabled}
              @input=${(event: Event) =>
                props.onCardDraftChange("dueDate", (event.currentTarget as HTMLInputElement).value)}
            />
          </label>
          <label class="field checkbox kanban-detail__checkbox">
            <input
              type="checkbox"
              .checked=${draft.readyForCodex}
              ?disabled=${disabled}
              @change=${(event: Event) =>
                props.onCardDraftChange(
                  "readyForCodex",
                  (event.currentTarget as HTMLInputElement).checked,
                )}
            />
            <span>${t("kanban.detail.fields.readyForCodex")}</span>
          </label>
          <label class="field full">
            <span>${t("kanban.detail.fields.labels")}</span>
            <textarea
              class="kanban-detail__textarea kanban-detail__textarea--short"
              .value=${draft.labelsText}
              ?disabled=${disabled}
              @input=${(event: Event) =>
                props.onCardDraftChange(
                  "labelsText",
                  (event.currentTarget as HTMLTextAreaElement).value,
                )}
            ></textarea>
          </label>
          <label class="field full">
            <span>${t("kanban.detail.fields.checklist")}</span>
            <textarea
              class="kanban-detail__textarea"
              .value=${draft.checklistText}
              ?disabled=${disabled}
              @input=${(event: Event) =>
                props.onCardDraftChange(
                  "checklistText",
                  (event.currentTarget as HTMLTextAreaElement).value,
                )}
            ></textarea>
          </label>
          <label class="field full">
            <span>${t("kanban.detail.fields.links")}</span>
            <textarea
              class="kanban-detail__textarea kanban-detail__textarea--short"
              .value=${draft.linksText}
              ?disabled=${disabled}
              @input=${(event: Event) =>
                props.onCardDraftChange(
                  "linksText",
                  (event.currentTarget as HTMLTextAreaElement).value,
                )}
            ></textarea>
          </label>
          <label class="field full">
            <span>${t("kanban.detail.fields.watchers")}</span>
            <textarea
              class="kanban-detail__textarea kanban-detail__textarea--short"
              .value=${draft.watchersText}
              ?disabled=${disabled}
              @input=${(event: Event) =>
                props.onCardDraftChange(
                  "watchersText",
                  (event.currentTarget as HTMLTextAreaElement).value,
                )}
            ></textarea>
          </label>
          <label class="field full">
            <span>${t("kanban.detail.fields.customFields")}</span>
            <textarea
              class="kanban-detail__textarea"
              .value=${draft.customFieldsText}
              ?disabled=${disabled}
              @input=${(event: Event) =>
                props.onCardDraftChange(
                  "customFieldsText",
                  (event.currentTarget as HTMLTextAreaElement).value,
                )}
            ></textarea>
          </label>
        </div>

        <div class="kanban-detail__actions">
          <button
            class="btn btn--sm primary"
            ?disabled=${disabled}
            @click=${() => void props.onCardSave()}
          >
            ${disabled ? t("kanban.detail.saving") : t("kanban.detail.save")}
          </button>
          <button
            class="btn btn--sm danger"
            ?disabled=${disabled}
            @click=${() => void props.onCardArchive()}
          >
            ${t("kanban.detail.archive")}
          </button>
        </div>

        <label class="field full">
          <span>${t("kanban.detail.comment")}</span>
          <textarea
            class="kanban-detail__textarea kanban-detail__textarea--short"
            .value=${props.cardCommentDraft}
            ?disabled=${disabled}
            @input=${(event: Event) =>
              props.onCardCommentChange((event.currentTarget as HTMLTextAreaElement).value)}
          ></textarea>
        </label>
        <button
          class="btn btn--sm"
          ?disabled=${disabled || !props.cardCommentDraft.trim()}
          @click=${() => void props.onCardComment()}
        >
          ${t("kanban.detail.addComment")}
        </button>

        ${renderDetailReadonly(card)}
      </section>
    </div>
  `;
}

function renderActivity(entry: KanbanActivity) {
  const actor = entry.actor?.name ?? entry.actor?.id ?? t("kanban.activity.unknownActor");
  const createdAt = entry.createdAt ?? "";
  return html`
    <div class="kanban-activity">
      <div class="kanban-activity__main">
        <div class="kanban-activity__summary">${entry.summary}</div>
        <div class="kanban-activity__meta">
          <span>${actor}</span>
          <span>${entry.action}</span>
        </div>
      </div>
      <time class="kanban-activity__time" datetime=${createdAt}>${formatIso(createdAt)}</time>
    </div>
  `;
}

function renderActivityRail(props: KanbanProps) {
  return html`
    <section class="kanban-activity-rail" aria-label=${t("kanban.activity.title")}>
      <div class="card-title">${t("kanban.activity.title")}</div>
      <div class="card-sub">${t("kanban.activity.recentEvents", { count: String(props.activity.length) })}</div>
      <div class="kanban-activity-list">
        ${
          props.activity.length
            ? props.activity.map((entry) => renderActivity(entry))
            : html`
                <div class="kanban-empty">${t("kanban.empty.noRecentActivity")}</div>
              `
        }
      </div>
    </section>
  `;
}

function renderImportPreview(props: KanbanProps) {
  const preview = props.importPreview;
  if (!preview) {
    return nothing;
  }
  const visibleCards = preview.cards.slice(0, 5);
  return html`
    <div class="kanban-import__result" data-import-preview>
      <div class="kanban-import__result-header">
        <div>
          <div class="kanban-import__result-title">${t("kanban.import.previewTitle")}</div>
          <div class="kanban-import__result-meta">
            ${t("kanban.import.previewMeta", {
              count: String(preview.cards.length),
              warnings: String(preview.warnings.length),
            })}
          </div>
        </div>
        <span class="kanban-badge mono">${preview.importId}</span>
      </div>
      ${
        preview.warnings.length
          ? html`
              <div class="kanban-import__warnings">
                ${preview.warnings.map((warning) => html`<div>${warning}</div>`)}
              </div>
            `
          : nothing
      }
      <div class="kanban-import__cards">
        ${visibleCards.map(
          (card) => html`
            <div class="kanban-import__card">
              <div class="kanban-import__card-main">
                <div class="kanban-import__card-title">${card.title}</div>
                <div class="kanban-import__card-meta">
                  <span>${card.lane}</span>
                  <span>${card.priority}</span>
                  <span>${t("kanban.import.cardCounts", {
                    checklist: String(card.checklistCount),
                    comments: String(card.commentCount),
                    attachments: String(card.attachmentCount),
                  })}</span>
                </div>
              </div>
              ${
                card.labels.length
                  ? html`
                      <div class="kanban-import__labels">
                        ${card.labels.map((label) => html`<span class="kanban-label">${label}</span>`)}
                      </div>
                    `
                  : nothing
              }
            </div>
          `,
        )}
      </div>
    </div>
  `;
}

function renderImportResult(result: KanbanImportTrelloRunResult | null) {
  if (!result) {
    return nothing;
  }
  return html`
    <div class="kanban-import__result" data-import-result>
      <div class="kanban-import__result-title">${t("kanban.import.resultTitle")}</div>
      <div class="kanban-import__counts">
        <span>${t("kanban.import.created", { count: String(result.created) })}</span>
        <span>${t("kanban.import.updated", { count: String(result.updated) })}</span>
        <span>${t("kanban.import.skipped", { count: String(result.skipped) })}</span>
      </div>
      <div class="kanban-import__result-meta">${result.activity.summary}</div>
    </div>
  `;
}

function renderImportPanel(props: KanbanProps) {
  const available = Boolean(props.status?.enabled && props.status?.available);
  const disabled = props.loading || props.importBusy || !available;
  const hasContent = props.importContent.trim().length > 0;
  return html`
    <details class="kanban-import">
      <summary class="kanban-import__header">
        <div>
          <div class="card-title">${t("kanban.import.title")}</div>
          <div class="card-sub">${t("kanban.import.subtitle")}</div>
        </div>
        ${
          props.importFileName
            ? html`<span class="kanban-badge">${props.importFileName}</span>`
            : nothing
        }
        <span class="kanban-import__toggle" aria-hidden="true"></span>
      </summary>
      <div class="kanban-import__body">
        <div class="kanban-import__controls">
          <label class="field">
            <span>${t("kanban.import.format")}</span>
            <select
              .value=${props.importFormat}
              ?disabled=${disabled}
              @change=${(event: Event) => {
                const format = (event.currentTarget as HTMLSelectElement).value;
                if (isKanbanImportFormat(format)) {
                  props.onImportFormatChange(format);
                }
              }}
            >
              <option value="json">${t("kanban.import.json")}</option>
              <option value="csv">${t("kanban.import.csv")}</option>
            </select>
          </label>
          <label class="field">
            <span>${t("kanban.import.file")}</span>
            <input
              type="file"
              accept=".json,.csv,application/json,text/csv"
              ?disabled=${disabled}
              @change=${(event: Event) => {
                const input = event.currentTarget as HTMLInputElement;
                void props.onImportFile(input.files?.item(0) ?? null);
              }}
            />
          </label>
        </div>
        <label class="field kanban-import__content">
          <span>${t("kanban.import.content")}</span>
          <textarea
            class="kanban-import__textarea"
            .value=${props.importContent}
            placeholder=${t("kanban.import.contentPlaceholder")}
            ?disabled=${disabled}
            @input=${(event: Event) =>
              props.onImportContentChange((event.currentTarget as HTMLTextAreaElement).value)}
          ></textarea>
        </label>
        <div class="kanban-import__actions">
          <button
            class="btn btn--sm"
            ?disabled=${disabled || !hasContent}
            @click=${() => void props.onImportPreview()}
          >
            ${props.importBusy ? t("kanban.import.working") : t("kanban.import.preview")}
          </button>
          <button
            class="btn btn--sm primary"
            ?disabled=${disabled || !props.importPreview || Boolean(props.importResult)}
            @click=${() => void props.onImportRun()}
          >
            ${props.importBusy ? t("kanban.import.working") : t("kanban.import.run")}
          </button>
        </div>
        ${props.importError ? html`<div class="callout danger">${props.importError}</div>` : nothing}
        ${renderImportPreview(props)}
        ${renderImportResult(props.importResult)}
      </div>
    </details>
  `;
}

function gatewayStatus(status: KanbanStatusResult | null): { className: string; label: string } {
  if (!status) {
    return { className: "warn", label: t("kanban.gateway.unknown") };
  }
  if (!status.enabled) {
    return { className: "warn", label: t("kanban.gateway.disabled") };
  }
  if (status.available) {
    return { className: "ok", label: t("kanban.gateway.available") };
  }
  return { className: "warn", label: t("kanban.gateway.unavailable") };
}

export function renderKanban(props: KanbanProps) {
  const lanes = (props.board?.lanes ?? fallbackLanes()).toSorted((a, b) => {
    return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER);
  });
  const sortedCards = sortCards(props.cards);
  const cardsByLane = new Map<KanbanLaneId, KanbanCard[]>(
    lanes.map((lane) => [lane.id, sortedCards.filter((card) => card.lane === lane.id)]),
  );
  const readyCount = props.cards.filter((card) => card.readyForCodex).length;
  const statusDetail = props.status?.message ?? props.status?.reason ?? null;
  const gateway = gatewayStatus(props.status);

  return html`
    <div class="kanban-view">
      ${
        props.showRefresh === false
          ? nothing
          : html`
              <div class="kanban-topbar">
                <button
                  class="btn btn--sm"
                  ?disabled=${props.loading}
                  @click=${() => props.onRefresh()}
                >
                  ${props.loading ? t("kanban.actions.refreshing") : t("kanban.actions.refresh")}
                </button>
              </div>
            `
      }
      <section class="kanban-summary">
        <div class="stat">
          <div class="stat-label">${t("kanban.summary.board")}</div>
          <div class="stat-value">${props.board?.title ?? props.status?.boardId ?? t("tabs.kanban")}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("kanban.summary.cards")}</div>
          <div class="stat-value">${props.cards.length}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("kanban.summary.readyForCodex")}</div>
          <div class="stat-value">${readyCount}</div>
        </div>
        <div class="stat">
          <div class="stat-label">${t("kanban.summary.gateway")}</div>
          <div class="stat-value ${gateway.className}">${gateway.label}</div>
        </div>
      </section>

      ${renderImportPanel(props)}

      ${props.error ? html`<div class="callout danger">${props.error}</div>` : nothing}
      ${
        statusDetail && (!props.status?.enabled || !props.status?.available)
          ? html`<div class="callout warn">${statusDetail}</div>`
          : nothing
      }

      <section class="kanban-workspace">
        <div class="kanban-board" aria-label=${t("kanban.board.ariaLabel")}>
          ${lanes.map((lane) => renderLane(lane, cardsByLane.get(lane.id) ?? [], props))}
          ${renderActivityRail(props)}
        </div>
      </section>
      ${renderCardDetail(props, lanes)}
    </div>
  `;
}
