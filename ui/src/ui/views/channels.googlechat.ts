import { html, nothing } from "lit";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD

import { formatAgo } from "../format";
import type { GoogleChatStatus } from "../types";
import { renderChannelConfigSection } from "./channels.config";
import type { ChannelsProps } from "./channels.types";
=======
import type { GoogleChatStatus } from "../types.ts";
import type { ChannelsProps } from "./channels.types.ts";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
import { formatRelativeTimestamp } from "../format.ts";
import type { GoogleChatStatus } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
<<<<<<< HEAD
>>>>>>> 6e09c1142 (chore: Switch to `NodeNext` for `module`/`moduleResolution` in `ui`.)
=======
import type { ChannelsProps } from "./channels.types.ts";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { GoogleChatStatus } from "../types.ts";
import type { ChannelsProps } from "./channels.types.ts";
=======
>>>>>>> d0cb8c19b (chore: wtf.)
import { formatRelativeTimestamp } from "../format.ts";
import type { GoogleChatStatus } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
<<<<<<< HEAD
>>>>>>> ed11e93cf (chore(format))
=======
import type { ChannelsProps } from "./channels.types.ts";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { GoogleChatStatus } from "../types.ts";
import type { ChannelsProps } from "./channels.types.ts";
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { formatRelativeTimestamp } from "../format.ts";
import type { GoogleChatStatus } from "../types.ts";
import { renderChannelConfigSection } from "./channels.config.ts";
<<<<<<< HEAD
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { ChannelsProps } from "./channels.types.ts";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)

export function renderGoogleChatCard(params: {
  props: ChannelsProps;
  googleChat?: GoogleChatStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, googleChat, accountCountLabel } = params;

  return html`
    <div class="card">
      <div class="card-title">Google Chat</div>
      <div class="card-sub">Chat API webhook status and channel configuration.</div>
      ${accountCountLabel}

      <div class="status-list" style="margin-top: 16px;">
        <div>
          <span class="label">Configured</span>
          <span>${googleChat ? (googleChat.configured ? "Yes" : "No") : "n/a"}</span>
        </div>
        <div>
          <span class="label">Running</span>
          <span>${googleChat ? (googleChat.running ? "Yes" : "No") : "n/a"}</span>
        </div>
        <div>
          <span class="label">Credential</span>
          <span>${googleChat?.credentialSource ?? "n/a"}</span>
        </div>
        <div>
          <span class="label">Audience</span>
          <span>
            ${
              googleChat?.audienceType
                ? `${googleChat.audienceType}${googleChat.audience ? ` · ${googleChat.audience}` : ""}`
                : "n/a"
            }
          </span>
        </div>
        <div>
          <span class="label">Last start</span>
          <span>${googleChat?.lastStartAt ? formatRelativeTimestamp(googleChat.lastStartAt) : "n/a"}</span>
        </div>
        <div>
          <span class="label">Last probe</span>
          <span>${googleChat?.lastProbeAt ? formatRelativeTimestamp(googleChat.lastProbeAt) : "n/a"}</span>
        </div>
      </div>

      ${
        googleChat?.lastError
          ? html`<div class="callout danger" style="margin-top: 12px;">
            ${googleChat.lastError}
          </div>`
          : nothing
      }

      ${
        googleChat?.probe
          ? html`<div class="callout" style="margin-top: 12px;">
            Probe ${googleChat.probe.ok ? "ok" : "failed"} ·
            ${googleChat.probe.status ?? ""} ${googleChat.probe.error ?? ""}
          </div>`
          : nothing
      }

      ${renderChannelConfigSection({ channelId: "googlechat", props })}

      <div class="row" style="margin-top: 12px;">
        <button class="btn" @click=${() => props.onRefresh(true)}>
          Probe
        </button>
      </div>
    </div>
  `;
}
