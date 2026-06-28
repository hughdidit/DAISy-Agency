import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import type { KanbanActivity, KanbanBoard, KanbanCard, KanbanStatusResult } from "../types.ts";

type KanbanLane = KanbanBoard["lanes"][number];
type KanbanLaneId = KanbanLane["id"];

export type KanbanProps = {
  loading: boolean;
  status: KanbanStatusResult | null;
  board: KanbanBoard | null;
  cards: KanbanCard[];
  activity: KanbanActivity[];
  error: string | null;
  onRefresh: () => void | Promise<void>;
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
