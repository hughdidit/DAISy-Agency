import { html, nothing } from "lit";
import type { KanbanActivity, KanbanBoard, KanbanCard, KanbanStatusResult } from "../types.ts";

type KanbanLane = KanbanBoard["lanes"][number];
type KanbanLaneId = KanbanLane["id"];

const FALLBACK_LANES: KanbanLane[] = [
  { id: "todo", title: "To do", position: 0 },
  { id: "in_progress", title: "In progress", position: 1 },
  { id: "review", title: "Review", position: 2 },
  { id: "done", title: "Done", position: 3 },
];

export type KanbanProps = {
  loading: boolean;
  status: KanbanStatusResult | null;
  board: KanbanBoard | null;
  cards: KanbanCard[];
  activity: KanbanActivity[];
  error: string | null;
  onRefresh: () => void | Promise<void>;
};

function sortCards(cards: KanbanCard[]): KanbanCard[] {
  return [...cards].sort((a, b) => {
    const laneOrder = a.lane.localeCompare(b.lane);
    if (laneOrder !== 0) {
      return laneOrder;
    }
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return a.updatedAt.localeCompare(b.updatedAt);
  });
}

function formatIso(value: string | undefined): string {
  if (!value) {
    return "n/a";
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
  const total = card.checklist.length;
  const done = card.checklist.filter((item) => item.checked).length;
  return { done, total };
}

function renderCardBadges(card: KanbanCard) {
  const checklist = countChecklist(card);
  const due = formatShortDate(card.dueDate);
  return html`
    <div class="kanban-card__badges">
      <span class="kanban-badge kanban-badge--priority kanban-badge--${card.priority}">
        ${card.priority}
      </span>
      ${card.readyForCodex ? html`<span class="kanban-badge">Codex ready</span>` : nothing}
      ${due ? html`<span class="kanban-badge">Due ${due}</span>` : nothing}
      ${checklist.total
        ? html`<span class="kanban-badge">${checklist.done}/${checklist.total}</span>`
        : nothing}
      ${card.comments.length ? html`<span class="kanban-badge">${card.comments.length} comments</span>` : nothing}
      ${card.links.length ? html`<span class="kanban-badge">${card.links.length} links</span>` : nothing}
      ${card.attachments.length
        ? html`<span class="kanban-badge">${card.attachments.length} files</span>`
        : nothing}
    </div>
  `;
}

function renderCard(card: KanbanCard) {
  const owner = card.assignee ?? card.inputOwner ?? null;
  return html`
    <article class="kanban-card" data-card-id=${card.id}>
      <div class="kanban-card__title">${card.title}</div>
      ${card.description
        ? html`<div class="kanban-card__description">${card.description}</div>`
        : nothing}
      ${card.labels.length
        ? html`<div class="kanban-card__labels">
            ${card.labels.map((label) => html`<span class="kanban-label">${label}</span>`)}
          </div>`
        : nothing}
      ${renderCardBadges(card)}
      <div class="kanban-card__meta">
        ${owner ? html`<span>${owner}</span>` : html`<span>unassigned</span>`}
        ${card.reviewer ? html`<span>review ${card.reviewer}</span>` : nothing}
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
        ${cards.length
          ? cards.map((card) => renderCard(card))
          : html`<div class="kanban-empty">No cards</div>`}
      </div>
    </section>
  `;
}

function renderActivity(entry: KanbanActivity) {
  return html`
    <div class="kanban-activity">
      <div class="kanban-activity__main">
        <div class="kanban-activity__summary">${entry.summary}</div>
        <div class="kanban-activity__meta">
          <span>${entry.actor.name ?? entry.actor.id}</span>
          <span>${entry.action}</span>
        </div>
      </div>
      <time class="kanban-activity__time" datetime=${entry.createdAt}>${formatIso(entry.createdAt)}</time>
    </div>
  `;
}

export function renderKanban(props: KanbanProps) {
  const lanes = [...(props.board?.lanes ?? FALLBACK_LANES)].sort((a, b) => a.position - b.position);
  const sortedCards = sortCards(props.cards);
  const cardsByLane = new Map<KanbanLaneId, KanbanCard[]>(
    lanes.map((lane) => [lane.id, sortedCards.filter((card) => card.lane === lane.id)]),
  );
  const readyCount = props.cards.filter((card) => card.readyForCodex).length;
  const statusDetail = props.status?.message ?? props.status?.reason ?? null;

  return html`
    <div class="kanban-view">
      <section class="kanban-summary">
        <div class="stat">
          <div class="stat-label">Board</div>
          <div class="stat-value">${props.board?.title ?? props.status?.boardId ?? "Kanban"}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Cards</div>
          <div class="stat-value">${props.cards.length}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Ready for Codex</div>
          <div class="stat-value">${readyCount}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Gateway</div>
          <div class="stat-value ${props.status?.available ? "ok" : "warn"}">
            ${props.status?.available ? "Available" : "Unavailable"}
          </div>
        </div>
        <div class="kanban-summary__actions">
          <button class="btn btn--sm" ?disabled=${props.loading} @click=${() => props.onRefresh()}>
            ${props.loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      ${props.error ? html`<div class="callout danger">${props.error}</div>` : nothing}
      ${statusDetail && !props.status?.available
        ? html`<div class="callout warn">${statusDetail}</div>`
        : nothing}

      <section class="kanban-workspace">
        <div class="kanban-board" aria-label="Kanban board">
          ${lanes.map((lane) => renderLane(lane, cardsByLane.get(lane.id) ?? []))}
        </div>
        <aside class="kanban-activity-rail">
          <div class="card-title">Activity</div>
          <div class="card-sub">${props.activity.length} recent events</div>
          <div class="kanban-activity-list">
            ${props.activity.length
              ? props.activity.map((entry) => renderActivity(entry))
              : html`<div class="kanban-empty">No recent activity</div>`}
          </div>
        </aside>
      </section>
    </div>
  `;
}
