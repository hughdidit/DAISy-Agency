import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import type { KanbanImportFormat } from "../controllers/kanban.ts";
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
  onRefresh: () => void | Promise<void>;
  onImportFormatChange: (format: KanbanImportFormat) => void;
  onImportContentChange: (content: string) => void;
  onImportFile: (file: File | null) => void | Promise<void>;
  onImportPreview: () => void | Promise<void>;
  onImportRun: () => void | Promise<void>;
};

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

function renderCard(card: KanbanCard) {
  const owner = card.assignee ?? card.inputOwner ?? null;
  const labels = card.labels ?? [];
  return html`
    <article class="kanban-card" data-card-id=${card.id}>
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
    </article>
  `;
}

function renderLane(lane: KanbanLane, cards: KanbanCard[]) {
  return html`
    <section class="kanban-lane" data-lane=${lane.id}>
      <div class="kanban-lane__header">
        <div class="kanban-lane__title">${lane.title}</div>
        <div class="kanban-lane__count">${cards.length}</div>
      </div>
      <div class="kanban-lane__cards">
        ${
          cards.length
            ? cards.map((card) => renderCard(card))
            : html`
                <div class="kanban-empty">${t("kanban.empty.noCards")}</div>
              `
        }
      </div>
    </section>
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
    <section class="kanban-import" aria-label=${t("kanban.import.title")}>
      <div class="kanban-import__header">
        <div>
          <div class="card-title">${t("kanban.import.title")}</div>
          <div class="card-sub">${t("kanban.import.subtitle")}</div>
        </div>
        ${
          props.importFileName
            ? html`<span class="kanban-badge">${props.importFileName}</span>`
            : nothing
        }
      </div>
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
    </section>
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
        <div class="kanban-summary__actions">
          <button class="btn btn--sm" ?disabled=${props.loading} @click=${() => props.onRefresh()}>
            ${props.loading ? t("kanban.actions.refreshing") : t("kanban.actions.refresh")}
          </button>
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
          ${lanes.map((lane) => renderLane(lane, cardsByLane.get(lane.id) ?? []))}
        </div>
        <aside class="kanban-activity-rail">
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
        </aside>
      </section>
    </div>
  `;
}
