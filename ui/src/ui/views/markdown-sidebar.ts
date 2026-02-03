import { html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
<<<<<<< HEAD

import { icons } from "../icons";
import { toSanitizedMarkdownHtml } from "../markdown";
=======
import { icons } from "../icons.ts";
import { toSanitizedMarkdownHtml } from "../markdown.ts";
>>>>>>> 6e09c1142 (chore: Switch to `NodeNext` for `module`/`moduleResolution` in `ui`.)

export type MarkdownSidebarProps = {
  content: string | null;
  error: string | null;
  onClose: () => void;
  onViewRawText: () => void;
};

export function renderMarkdownSidebar(props: MarkdownSidebarProps) {
  return html`
    <div class="sidebar-panel">
      <div class="sidebar-header">
        <div class="sidebar-title">Tool Output</div>
        <button @click=${props.onClose} class="btn" title="Close sidebar">
          ${icons.x}
        </button>
      </div>
      <div class="sidebar-content">
        ${
          props.error
            ? html`
              <div class="callout danger">${props.error}</div>
              <button @click=${props.onViewRawText} class="btn" style="margin-top: 12px;">
                View Raw Text
              </button>
            `
            : props.content
              ? html`<div class="sidebar-markdown">${unsafeHTML(toSanitizedMarkdownHtml(props.content))}</div>`
              : html`
                  <div class="muted">No content available</div>
                `
        }
      </div>
    </div>
  `;
}
