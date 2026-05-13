import type { LearningEvent, SourceRef } from "../models/types.js";

export type MonitorResult = {
  learningEvents: LearningEvent[];
  sourceRefs: SourceRef[];
};

export function monitorLearningEvents(events: LearningEvent[], fixturePath: string): MonitorResult {
  return {
    learningEvents: events,
    sourceRefs: [
      { type: "fixture", ref: fixturePath },
      ...events.flatMap((event) => event.sourceRefs),
    ],
  };
}
