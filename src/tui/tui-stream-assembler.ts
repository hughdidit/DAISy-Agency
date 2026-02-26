import {
  composeThinkingAndContent,
  extractContentFromMessage,
  extractThinkingFromMessage,
  resolveFinalAssistantText,
} from "./tui-formatters.js";

type RunStreamState = {
  thinkingText: string;
  contentText: string;
  displayText: string;
};

export class TuiStreamAssembler {
  private runs = new Map<string, RunStreamState>();

  private getOrCreateRun(runId: string): RunStreamState {
    let state = this.runs.get(runId);
    if (!state) {
      state = {
        thinkingText: "",
        contentText: "",
        displayText: "",
      };
      this.runs.set(runId, state);
    }
    return state;
  }

<<<<<<< HEAD
  private updateRunState(state: RunStreamState, message: unknown, showThinking: boolean) {
=======
  private updateRunState(
    state: RunStreamState,
    message: unknown,
    showThinking: boolean,
    opts?: {
      protectBoundaryDrops?: boolean;
      useIncomingNonTextForBoundaryDrops?: boolean;
    },
  ) {
>>>>>>> b01273cfc (fix: narrow finalize boundary-drop guard (#27711) (thanks @scz2011))
    const thinkingText = extractThinkingFromMessage(message);
    const contentText = extractContentFromMessage(message);

    if (thinkingText) {
      state.thinkingText = thinkingText;
    }
    if (contentText) {
<<<<<<< HEAD
      state.contentText = contentText;
=======
      const nextContentBlocks = textBlocks.length > 0 ? textBlocks : [contentText];
      const useIncomingNonTextForBoundaryDrops = opts?.useIncomingNonTextForBoundaryDrops !== false;
      const shouldPreserveBoundaryDroppedText =
        opts?.protectBoundaryDrops === true &&
        (state.sawNonTextContentBlocks ||
          (useIncomingNonTextForBoundaryDrops && sawNonTextContentBlocks)) &&
        isDroppedBoundaryTextBlockSubset({
          streamedTextBlocks: state.contentBlocks,
          finalTextBlocks: nextContentBlocks,
        });

      if (!shouldPreserveBoundaryDroppedText) {
        state.contentText = contentText;
        state.contentBlocks = nextContentBlocks;
      }
    }
    if (sawNonTextContentBlocks) {
      state.sawNonTextContentBlocks = true;
>>>>>>> b01273cfc (fix: narrow finalize boundary-drop guard (#27711) (thanks @scz2011))
    }

    const displayText = composeThinkingAndContent({
      thinkingText: state.thinkingText,
      contentText: state.contentText,
      showThinking,
    });

    state.displayText = displayText;
  }

  ingestDelta(runId: string, message: unknown, showThinking: boolean): string | null {
    const state = this.getOrCreateRun(runId);
    const previousDisplayText = state.displayText;
    this.updateRunState(state, message, showThinking);

    if (!state.displayText || state.displayText === previousDisplayText) return null;

    return state.displayText;
  }

  finalize(runId: string, message: unknown, showThinking: boolean): string {
    const state = this.getOrCreateRun(runId);
<<<<<<< HEAD
    this.updateRunState(state, message, showThinking);
=======
    const streamedDisplayText = state.displayText;
    const streamedTextBlocks = [...state.contentBlocks];
    const streamedSawNonTextContentBlocks = state.sawNonTextContentBlocks;
    this.updateRunState(state, message, showThinking, {
      protectBoundaryDrops: true,
      useIncomingNonTextForBoundaryDrops: false,
    });
>>>>>>> b01273cfc (fix: narrow finalize boundary-drop guard (#27711) (thanks @scz2011))
    const finalComposed = state.displayText;
    const finalText = resolveFinalAssistantText({
      finalText: finalComposed,
      streamedText: state.displayText,
    });

    this.runs.delete(runId);
    return finalText;
  }

  drop(runId: string) {
    this.runs.delete(runId);
  }
}
