import type { PromotionState } from "../models/types.js";

const ALLOWED_TRANSITIONS: Record<PromotionState, PromotionState[]> = {
  draft: ["candidate", "rejected"],
  candidate: ["evaluated", "disqualified", "rejected"],
  evaluated: ["promotion_queued", "disqualified", "rejected"],
  disqualified: [],
  promotion_queued: ["approved", "rejected"],
  approved: ["canonized"],
  rejected: [],
  canonized: [],
};

export function assertPromotionTransition(from: PromotionState, to: PromotionState): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid ELF promotion lifecycle transition: ${from} -> ${to}`);
  }
}

export function assertElfMaySetState(state: PromotionState): void {
  if (state === "approved" || state === "canonized") {
    throw new Error(`ELF may not self-set promotion state: ${state}`);
  }
}
