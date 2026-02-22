# Changelog

<<<<<<< HEAD
Docs: https://docs.molt.bot
=======
Docs: https://docs.openclaw.ai

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
## 2026.1.31
=======
=======
=======
## 2026.2.3
=======
## 2026.2.13 (Unreleased)
=======
=======
## Unreleased
=======
## 2026.2.14 (Unreleased)
>>>>>>> 90117a384 (docs: consolidate 2026.2.14 changelog)
=======
=======
=======
>>>>>>> 01b1e350b (docs: note Control UI XSS fix)
=======
>>>>>>> cbc3de6c9 (docs(changelog): fix conflict marker)
## 2026.2.15 (Unreleased)
=======
## 2026.2.22 (Unreleased)
>>>>>>> bdfb97afa (chore: prep 2026.2.22 unreleased and publish new npm plugins)

### Changes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
=======
=======
=======
- Docs: fix FAQ typos and add documentation spellcheck automation with a custom codespell dictionary/ignore list, including CI coverage. (#22457) Thanks @vincentkoc.
<<<<<<< HEAD
- Security/Unused Dependencies: add dead-code scans to CI via Knip/ts-prune/ts-unused-exports and report unused dependencies/exports in non-blocking checks. (#22468) Thanks @vincentkoc.
- Security/Unused Dependencies: move `@larksuiteoapi/node-sdk` out of root `package.json` and keep it scoped to `extensions/feishu` where it is used. (#22471) Thanks @vincentkoc.
- Security/Unused Dependencies: remove unused root dependency `signal-utils` from core manifest after confirming it was only used by extension-only paths. (#22471) Thanks @vincentkoc.
- Security/Unused Dependencies: remove unused root devDependency `ollama` now that native Ollama support uses local HTTP transport code paths only. (#22471) Thanks @vincentkoc.
- Security/Unused Dependencies: remove unused root devDependencies `@lit/context` and `@lit-labs/signals` flagged as unused by Knip dead-code reports. (#22471) Thanks @vincentkoc.
- Security/Unused Dependencies: remove unused root dependency `lit` that is now scoped to `ui/` package dependencies. (#22471) Thanks @vincentkoc.
- Security/Unused Dependencies: remove unused root dependencies `long` and `rolldown`; keep A2UI bundling functional by falling back to `pnpm dlx rolldown` when the binary is not locally installed. (#22481) Thanks @vincentkoc.
- Security/Unused Dependencies: harden A2UI bundling dependency resolution by resolving `lit`, `@lit/context`, `@lit-labs/signals`, and `signal-utils` from UI workspace or repo-root dependency locations to tolerate Docker layout differences without root-only assumptions. (#22507) Thanks @vincentkoc.
- Security/Unused Dependencies: fix A2UI bundle resolution for removed root `lit` deps by resolving `lit`, `@lit/context`, `@lit-labs/signals`, and `signal-utils` from UI workspace dependencies in `rolldown.config.mjs` during bundling. (#22481) Thanks @vincentkoc.
- Security/Unused Dependencies: simplify `canvas-a2ui` bundling script by removing temporary vendored `node_modules` symlink logic now that `ui` workspace dependencies are explicit. (#22481) Thanks @vincentkoc.
- Security/Unused Dependencies: remove unused `@microsoft/agents-hosting-express` and `@microsoft/agents-hosting-extensions-teams` from `extensions/msteams` because current code only uses `@microsoft/agents-hosting`. Thanks @vincentkoc.
=======
- Dependencies/Unused Dependencies: add dead-code scans to CI via Knip/ts-prune/ts-unused-exports and report unused dependencies/exports in non-blocking checks. (#22468) Thanks @vincentkoc.
- Security/Agents: make owner-ID obfuscation use a dedicated HMAC secret from configuration (`ownerDisplaySecret`) and update hashing behavior so obfuscation is decoupled from gateway token handling for improved control. (#7343) Thanks @vincentkoc.
- Security/Infra: switch gateway lock and tool-call synthetic IDs from SHA-1 to SHA-256 with unchanged truncation length to strengthen hash basis while keeping deterministic behavior and lock key format. (#7343) Thanks @vincentkoc.
- Dependencies/Unused Dependencies: move `@larksuiteoapi/node-sdk` out of root `package.json` and keep it scoped to `extensions/feishu` where it is used. (#22471) Thanks @vincentkoc.
- Dependencies/Unused Dependencies: remove unused root dependency `signal-utils` from core manifest after confirming it was only used by extension-only paths. (#22471) Thanks @vincentkoc.
- Dependencies/Unused Dependencies: remove unused root devDependency `ollama` now that native Ollama support uses local HTTP transport code paths only. (#22471) Thanks @vincentkoc.
- Dependencies/Unused Dependencies: remove unused root devDependencies `@lit/context` and `@lit-labs/signals` flagged as unused by Knip dead-code reports. (#22471) Thanks @vincentkoc.
- Dependencies/Unused Dependencies: remove unused root dependency `lit` that is now scoped to `ui/` package dependencies. (#22471) Thanks @vincentkoc.
- Dependencies/Unused Dependencies: remove unused root dependencies `long` and `rolldown`; keep A2UI bundling functional by falling back to `pnpm dlx rolldown` when the binary is not locally installed. (#22481) Thanks @vincentkoc.
- Dependencies/Unused Dependencies: harden A2UI bundling dependency resolution by resolving `lit`, `@lit/context`, `@lit-labs/signals`, and `signal-utils` from UI workspace or repo-root dependency locations to tolerate Docker layout differences without root-only assumptions. (#22507) Thanks @vincentkoc.
- Dependencies/Unused Dependencies: fix A2UI bundle resolution for removed root `lit` deps by resolving `lit`, `@lit/context`, `@lit-labs/signals`, and `signal-utils` from UI workspace dependencies in `rolldown.config.mjs` during bundling. (#22481) Thanks @vincentkoc.
- Dependencies/Unused Dependencies: simplify `canvas-a2ui` bundling script by removing temporary vendored `node_modules` symlink logic now that `ui` workspace dependencies are explicit. (#22481) Thanks @vincentkoc.
- Dependencies/Unused Dependencies: remove unused `@microsoft/agents-hosting-express` and `@microsoft/agents-hosting-extensions-teams` from `extensions/msteams` because current code only uses `@microsoft/agents-hosting`. Thanks @vincentkoc.
>>>>>>> eccff0b6c (docs: relabel dependency hygiene changelog entries)
- MSTeams: dedupe sent-message cache storage by removing duplicate per-message Set storage and using timestamps Map keys as the single membership source. (#22514) Thanks @TaKO8Ki.
- Dependencies/Unused Dependencies: remove unused plugin-local `openclaw` devDependencies from `extensions/open-prose`, `extensions/lobster`, and `extensions/llm-task` after removing this dependency from build-time requirements. (#22495) Thanks @vincentkoc.
- Agents/Subagents: default subagent spawn depth now uses shared `maxSpawnDepth=2`, enabling depth-1 orchestrator spawning by default while keeping depth policy checks consistent across spawn and prompt paths. (#22223) Thanks @tyler6204.
>>>>>>> 0bee3f337 (MSTeams: dedupe sent-message cache storage (#22514))
- Channels/CLI: add per-account/channel `defaultTo` outbound routing fallback so `openclaw agent --deliver` can send without explicit `--reply-to` when a default target is configured. (#16985) Thanks @KirillShchetinin.
- iOS/Chat: clean chat UI noise by stripping inbound untrusted metadata/timestamp prefixes, formatting tool outputs into concise summaries/errors, compacting the composer while typing, and supporting tap-to-dismiss keyboard in chat view. (#22122) thanks @mbelinky.
- iOS/Watch: bridge mirrored watch prompt notification actions into iOS quick-reply handling, including queued action handoff until app model initialization. (#22123) thanks @mbelinky.
- iOS/Permissions: gate advertised iOS node capabilities/commands by live OS permission state (photos/contacts/calendar/reminders/motion), add Settings permission controls and disclosure, and refresh active gateway registration after permission-driven settings changes. (#22135) thanks @mbelinky.
- iOS/Tests: cover IPv4-mapped IPv6 loopback in manual TLS policy tests for connect validation paths. (#22045) Thanks @mbelinky.
- iOS/Gateway: stabilize background wake and reconnect behavior with background reconnect suppression/lease windows, BGAppRefresh wake fallback, location wake hook throttling, and APNs wake retry+nudge instrumentation. (#21226) thanks @mbelinky.
- Auto-reply/UI: add model fallback lifecycle visibility in verbose logs, /status active-model context with fallback reason, and cohesive WebUI fallback indicators. (#20704) Thanks @joshavant.
<<<<<<< HEAD
=======
- Discord/Streaming: add stream preview mode for live draft replies with partial/block options and configurable chunking. Thanks @thewilloftheshadow. Inspiration @neoagentic-ship-it.
- Discord/Telegram: add configurable lifecycle status reactions for queued/thinking/tool/done/error phases with a shared controller and emoji/timing overrides. Thanks @wolly-tundracube and @thewilloftheshadow.
- Discord/Voice: add voice channel join/leave/status via `/vc`, plus auto-join configuration for realtime voice conversations. Thanks @thewilloftheshadow.
- Docs/Discord: document forum channel thread creation flows and component limits. Thanks @thewilloftheshadow.
>>>>>>> 3e1ed0032 (Docs: add Discord forum thread docs)
=======
=======
=======
=======
=======
- Update/Core: add an optional built-in auto-updater for package installs (`update.auto.*`), default-off, with stable rollout delay+jitter and beta hourly cadence.
- CLI/Update: add `openclaw update --dry-run` to preview channel/tag/target/restart actions without mutating config, installing, syncing plugins, or restarting.
- Config/UI: add tag-aware settings filtering and broaden config labels/help copy so fields are easier to discover and understand in the dashboard config screen.
- iOS/Talk: prefetch TTS segments and suppress expected speech-cancellation errors for smoother talk playback. (#22833) Thanks @ngutman.
- Memory/FTS: add Spanish and Portuguese stop-word filtering for query expansion in FTS-only search mode, improving conversational recall for both languages. Thanks @vincentkoc.
- Memory/FTS: add Japanese-aware query expansion tokenization and stop-word filtering (including mixed-script terms like ASCII + katakana) for FTS-only search mode. Thanks @vincentkoc.
- Memory/FTS: add Korean stop-word filtering and particle-aware keyword extraction (including mixed Korean/English stems) for query expansion in FTS-only search mode. (#18899) Thanks @ruypang.
- Memory/FTS: add Arabic stop-word filtering for query expansion in FTS-only search mode to reduce conversational filler in Arabic memory searches. Thanks @vincentkoc.
- Discord/Allowlist: canonicalize resolved Discord allowlist names to IDs and split resolution flow for clearer fail-closed behavior.
- Channels/Config: unify channel preview streaming config handling with a shared resolver and canonical migration path.
- Gateway/Auth: unify call/probe/status/auth credential-source precedence on shared resolver helpers, with table-driven parity coverage across gateway entrypoints.
- Gateway/Auth: refactor gateway credential resolution and websocket auth handshake paths to use shared typed auth contexts, including explicit `auth.deviceToken` support in connect frames and tests.
>>>>>>> 5858de607 (docs: reorder 2026.2.22 changelog by user impact)
- Skills: remove bundled `food-order` skill from this repo; manage/install it from ClawHub instead.
>>>>>>> 7abae052f (chore(skills): remove bundled food-order skill)
- Docs/Subagents: make thread-bound session guidance channel-first instead of Discord-specific, and list thread-supporting channels explicitly. (#23589) Thanks @osolmaz.
<<<<<<< HEAD
>>>>>>> f39a66de2 (docs: make subagents thread guidance channel-first (#23589) (thanks @osolmaz))
- Channels/Config: unify channel preview streaming config handling with a shared resolver and canonical migration path.
- Discord/Allowlist: canonicalize resolved Discord allowlist names to IDs and split resolution flow for clearer fail-closed behavior.
- iOS/Talk: prefetch TTS segments and suppress expected speech-cancellation errors for smoother talk playback. (#22833) Thanks @ngutman.

### Breaking

- **BREAKING:** unify channel preview-streaming config to `channels.<channel>.streaming` with enum values `off | partial | block | progress`, and move Slack native stream toggle to `channels.slack.nativeStreaming`. Legacy keys (`streamMode`, Slack boolean `streaming`) are still read and migrated by `openclaw doctor --fix`, but canonical saved config/docs now use the unified names.
<<<<<<< HEAD
=======
- **BREAKING:** CLI local onboarding now sets `session.dmScope` to `per-channel-peer` by default for new/implicit DM scope configuration. If you depend on shared DM continuity across senders, explicitly set `session.dmScope` to `main`. (#23468) Thanks @bmendonca3.
- **BREAKING:** tool-failure replies now hide raw error details by default. OpenClaw still sends a failure summary, but detailed error suffixes (for example provider/runtime messages and local path fragments) now require `/verbose on` or `/verbose full`.
>>>>>>> a5e2bd4ea (docs: document verbose-gated tool error details)

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
- Gateway/OpenRouter: preserve stored session provider when model IDs are vendor-prefixed (for example, `anthropic/...`) so follow-up turns do not incorrectly route to direct provider APIs. (#22753) Thanks @dndodson.
=======
=======
=======
=======
=======
- Security/Voice Call: harden media stream WebSocket handling against pre-auth idle-connection DoS by adding strict pre-start timeouts, pending/per-IP connection limits, and total connection caps for streaming endpoints. This ships in the next npm release. Thanks @jiseoung for reporting.
>>>>>>> 1d8968c8a (fix(voice-call): harden media stream pre-start websocket handling)
=======

### Breaking

- **BREAKING:** tool-failure replies now hide raw error details by default. OpenClaw still sends a failure summary, but detailed error suffixes (for example provider/runtime messages and local path fragments) now require `/verbose on` or `/verbose full`.
- **BREAKING:** CLI local onboarding now sets `session.dmScope` to `per-channel-peer` by default for new/implicit DM scope configuration. If you depend on shared DM continuity across senders, explicitly set `session.dmScope` to `main`. (#23468) Thanks @bmendonca3.
- **BREAKING:** unify channel preview-streaming config to `channels.<channel>.streaming` with enum values `off | partial | block | progress`, and move Slack native stream toggle to `channels.slack.nativeStreaming`. Legacy keys (`streamMode`, Slack boolean `streaming`) are still read and migrated by `openclaw doctor --fix`, but canonical saved config/docs now use the unified names.
- **BREAKING:** remove legacy Gateway device-auth signature `v1`. Device-auth clients must now sign `v2` payloads with the per-connection `connect.challenge` nonce and send `device.nonce`; nonce-less connects are rejected.

### Fixes

- Install/Discord Voice: make `@discordjs/opus` an optional dependency so `openclaw` install/update no longer hard-fails when native Opus builds fail, while keeping `opusscript` as the runtime fallback decoder for Discord voice flows. (#23737, #23733, #23703) Thanks @jeadland, @Sheetaa, and @Breakyman.
- Agents/Exec: honor explicit agent context when resolving `tools.exec` defaults for runs with opaque/non-agent session keys, so per-agent `host/security/ask` policies are applied consistently. (#11832)
- Sandbox/Docker: default sandbox container user to the workspace owner `uid:gid` when `agents.*.sandbox.docker.user` is unset, fixing non-root gateway file-tool permissions under capability-dropped containers. (#20979)
- Doctor/Security: add an explicit warning that `approvals.exec.enabled=false` disables forwarding only, while enforcement remains driven by host-local `exec-approvals.json` policy. (#15047)
- Exec/Background: stop applying the default exec timeout to background sessions (`background: true` or explicit `yieldMs`) when no explicit timeout is set, so long-running background jobs are no longer terminated at the default timeout boundary. (#23303)
- Slack/Threading: sessions: keep parent-session forking and thread-history context active beyond first turn by removing first-turn-only gates in session init, thread-history fetch, and reply prompt context injection. (#23843, #23090) Thanks @vincentkoc and @Taskle.
- Slack/Threading: respect `replyToMode` when Slack auto-populates top-level `thread_ts`, and ignore inline `replyToId` directive tags when `replyToMode` is `off` so thread forcing stays disabled unless explicitly configured. (#23839, #23320, #23513) Thanks @vincentkoc and @dorukardahan.
- Slack/Extension: forward `message read` `threadId` to `readMessages` and use delivery-context `threadId` as outbound `thread_ts` fallback so extension replies/reads stay in the correct Slack thread. (#22216, #22485, #23836) Thanks @vincentkoc, @lan17 and @dorukardahan.
- Slack/Upload: resolve bare user IDs (U-prefix) to DM channel IDs via `conversations.open` before calling `files.uploadV2`, which rejects non-channel IDs. `chat.postMessage` tolerates user IDs directly, but `files.uploadV2` → `completeUploadExternal` validates `channel_id` against `^[CGDZ][A-Z0-9]{8,}$`, causing `invalid_arguments` when agents reply with media to DM conversations.
- Webchat/Chat: apply assistant `final` payload messages directly to chat state so sent turns render without waiting for a full history refresh cycle. (#14928) Thanks @BradGroux.
- Webchat/Chat: for out-of-band final events (for example tool-call side runs), append provided final assistant payloads directly instead of forcing a transient history reset. (#11139) Thanks @AkshayNavle.
- Webchat/Performance: reload `chat.history` after final events only when the final payload lacks a renderable assistant message, avoiding expensive full-history refreshes on normal turns. (#20588) Thanks @amzzzzzzz.
- Webchat/Sessions: preserve external session routing metadata when internal `chat.send` turns run under `webchat`, so explicit channel-keyed sessions (for example Telegram) no longer get rewritten to `webchat` and misroute follow-up delivery. (#23258) Thanks @binary64.
- Webchat/Sessions: preserve existing session `label` across `/new` and `/reset` rollovers so reset sessions remain discoverable in session history lists. (#23755) Thanks @ThunderStormer.
- Gateway/Chat UI: strip inline reply/audio directive tags from non-streaming final webchat broadcasts (including `chat.inject`) while preserving empty-string message content when tags are the entire reply. (#23298) Thanks @SidQin-cyber.
- Chat/UI: strip inline reply/audio directive tags (`[[reply_to_current]]`, `[[reply_to:<id>]]`, `[[audio_as_voice]]`) from displayed chat history, live chat event output, and session preview snippets so control tags no longer leak into user-visible surfaces.
- Telegram/Media: send a user-facing Telegram reply when media download fails (non-size errors) instead of silently dropping the message.
- Telegram/Webhook: keep webhook monitors alive until gateway abort signals fire, preventing false channel exits and immediate webhook auto-restart loops.
- Telegram/Polling: retry recoverable setup-time network failures in monitor startup and await runner teardown before retry to avoid overlapping polling sessions.
- Telegram/Polling: clear Telegram webhooks (`deleteWebhook`) before starting long-poll `getUpdates`, including retry handling for transient cleanup failures.
- Telegram/Webhook: add `channels.telegram.webhookPort` config support and pass it through plugin startup wiring to the monitor listener.
- Browser/Extension Relay: refactor the MV3 worker to preserve debugger attachments across relay drops, auto-reconnect with bounded backoff+jitter, persist and rehydrate attached tab state via `chrome.storage.session`, recover from `target_closed` navigation detaches, guard stale socket handlers, enforce per-tab operation locks and per-request timeouts, and add lifecycle keepalive/badge refresh hooks (`alarms`, `webNavigation`). (#15099, #6175, #8468, #9807)
- Browser/Relay: treat extension websocket as connected only when `OPEN`, allow reconnect when a stale `CLOSING/CLOSED` extension socket lingers, and guard stale socket message/close handlers so late events cannot clear active relay state; includes regression coverage for live-duplicate `409` rejection and immediate reconnect-after-close races. (#15099, #18698, #20688)
- Browser/Remote CDP: extend stale-target recovery so `ensureTabAvailable()` now reuses the sole available tab for remote CDP profiles (same behavior as extension profiles) while preserving strict `tab not found` errors when multiple tabs exist; includes remote-profile regression tests. (#15989)
- Gateway/Pairing: treat `operator.admin` as satisfying other `operator.*` scope checks during device-auth verification so local CLI/TUI sessions stop entering pairing-required loops for pairing/approval-scoped commands. (#22062, #22193, #21191) Thanks @Botaccess, @jhartshorn, and @ctbritt.
- Gateway/Pairing: auto-approve loopback `scope-upgrade` pairing requests (including device-token reconnects) so local clients do not disconnect on pairing-required scope elevation. (#23708) Thanks @widingmarcus-cyber.
- Gateway/Scopes: include `operator.read` and `operator.write` in default operator connect scope bundles across CLI, Control UI, and macOS clients so write-scoped announce/sub-agent follow-up calls no longer hit `pairing required` disconnects on loopback gateways. (#22582) thanks @YuzuruS.
- Gateway/Pairing: treat operator.admin pairing tokens as satisfying operator.write requests so legacy devices stop looping through scope-upgrade prompts introduced in 2026.2.19. (#23125, #23006) Thanks @vignesh07.
- Gateway/Restart: fix restart-loop edge cases by keeping `openclaw.mjs -> dist/entry.js` bootstrap detection explicit, reacquiring the gateway lock for in-process restart fallback paths, and tightening restart-loop regression coverage. (#23416) Thanks @jeffwnli.
- Gateway/Lock: use optional gateway-port reachability as a primary stale-lock liveness signal (and wire gateway run-loop lock acquisition to the resolved port), reducing false "already running" lockouts after unclean exits. (#23760) Thanks @Operative-001.
- Delivery/Queue: quarantine queue entries immediately on known permanent delivery errors (for example invalid recipients or missing conversation references) by moving them to `failed/` instead of retrying on every restart. (#23794) Thanks @aldoeliacim.
- Cron/Status: split execution outcome (`lastRunStatus`) from delivery outcome (`lastDeliveryStatus`) in persisted cron state, finished events, and run history so failed/unknown announcement delivery is visible without conflating it with run errors.
- Cron/Delivery: route text-only announce jobs with explicit thread/topic targets through direct outbound delivery so forum/thread destinations do not get dropped by intermediary announce turns. (#23841) Thanks @AndrewArto.
- Cron: honor `cron.maxConcurrentRuns` in the timer loop so due jobs can execute up to the configured parallelism instead of always running serially. (#11595) Thanks @Takhoffman.
- Cron/Run: enforce the same per-job timeout guard for manual `cron.run` executions as timer-driven runs, including abort propagation for isolated agent jobs, so forced runs cannot wedge indefinitely. (#23704) Thanks @tkuehnl.
- Cron/Schedule: for `every` jobs, prefer `lastRunAtMs + everyMs` when still in the future after restarts, then fall back to anchor scheduling for catch-up windows, so NEXT timing matches the last successful cadence. (#22895) Thanks @SidQin-cyber.
- Cron/Service: execute manual `cron.run` jobs outside the cron lock (while still persisting started/finished state atomically) so `cron.list` and `cron.status` remain responsive during long forced runs. (#23628) Thanks @dsgraves.
- Cron/Timer: keep a watchdog recheck timer armed while `onTimer` is actively executing so the scheduler continues polling even if a due-run tick stalls for an extended period. (#23628) Thanks @dsgraves.
- Cron/Isolation: force fresh session IDs for isolated cron runs so `sessionTarget="isolated"` executions never reuse prior run context. (#23470) Thanks @echoVic.
- Plugins/Install: strip `workspace:*` devDependency entries from copied plugin manifests before `npm install --omit=dev`, preventing `EUNSUPPORTEDPROTOCOL` install failures for npm-published channel plugins (including Feishu and MS Teams).
- Feishu/Plugins: restore bundled Feishu SDK availability for global installs and strip `openclaw: workspace:*` from plugin `devDependencies` during plugin-version sync so npm-installed Feishu plugins do not fail dependency install. (#23611, #23645, #23603)
- Config/Channels: auto-enable built-in channels by writing `channels.<id>.enabled=true` (not `plugins.entries.<id>`), and stop adding built-ins to `plugins.allow`, preventing `plugins.entries.telegram: plugin not found` validation failures.
- Config/Channels: when `plugins.allow` is active, auto-enable/enable flows now also allowlist configured built-in channels so `channels.<id>.enabled=true` cannot remain blocked by restrictive plugin allowlists.
- Plugins/Discovery: ignore scanned extension backup/disabled directory patterns (for example `.backup-*`, `.bak`, `.disabled*`) and move updater backup directories under `.openclaw-install-backups`, preventing duplicate plugin-id collisions from archived copies.
- Plugins/CLI: make `openclaw plugins enable` and plugin install/link flows update allowlists via shared plugin-enable policy so enabled plugins are not left disabled by allowlist mismatch. (#23190) Thanks @downwind7clawd-ctrl.
- Security/Voice Call: harden media stream WebSocket handling against pre-auth idle-connection DoS by adding strict pre-start timeouts, pending/per-IP connection limits, and total connection caps for streaming endpoints. This ships in the next npm release. Thanks @jiseoung for reporting.
- Security/Exec: stop trusting `PATH`-derived directories for safe-bin allowlist checks, add explicit `tools.exec.safeBinTrustedDirs`, and pin safe-bin shell execution to resolved absolute executable paths to prevent binary-shadowing approval bypasses. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Elevated: match `tools.elevated.allowFrom` against sender identities only (not recipient `ctx.To`), closing a recipient-token bypass for `/elevated` authorization. This ships in the next npm release. Thanks @jiseoung for reporting.
- Security/Feishu: enforce ID-only allowlist matching for DM/group sender authorization, normalize Feishu ID prefixes during checks, and ignore mutable display names so display-name collisions cannot satisfy allowlist entries. This ships in the next npm release. Thanks @jiseoung for reporting.
- Security/Group policy: harden `channels.*.groups.*.toolsBySender` matching by requiring explicit sender-key types (`id:`, `e164:`, `username:`, `name:`), preventing cross-identifier collisions across mutable/display-name fields while keeping legacy untyped keys on a deprecated ID-only path. This ships in the next npm release. Thanks @jiseoung for reporting.
- Channels/Group policy: fail closed when `groupPolicy: "allowlist"` is set without explicit `groups`, honor account-level `groupPolicy` overrides, and enforce `groupPolicy: "disabled"` as a hard group block. (#22215) Thanks @etereo.
>>>>>>> 5858de607 (docs: reorder 2026.2.22 changelog by user impact)
- Telegram/Discord extensions: propagate trusted `mediaLocalRoots` through extension outbound `sendMedia` options so extension direct-send media paths honor agent-scoped local-media allowlists. (#20029, #21903, #23227)
- Plugins/Media sandbox: propagate trusted `mediaLocalRoots` through plugin action dispatch (including Discord/Telegram action adapters) so plugin send paths enforce the same agent-scoped local-media sandbox roots as core outbound sends. (#20258, #22718)
- Agents/Workspace guard: map sandbox container-workdir file-tool paths (for example `/workspace/...` and `file:///workspace/...`) to host workspace roots before workspace-only validation, preventing false `Path escapes sandbox root` rejections for sandbox file tools. (#9560)
- Gateway/Exec approvals: expire approval requests immediately when no approval-capable gateway clients are connected and no forwarding targets are available, avoiding delayed approvals after restarts/offline approver windows. (#22144)
<<<<<<< HEAD
=======
- Security/Exec approvals: when approving wrapper commands with allow-always in allowlist mode, persist inner executable paths for known dispatch wrappers (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) and fail closed (no persisted entry) when wrapper unwrapping is not safe, preventing wrapper-path approval bypasses. Thanks @tdjackey for reporting.
>>>>>>> fe58839ed (docs(changelog): thank ghsa reporter for exec fix)
- Node/macOS exec host: default headless macOS node `system.run` to local execution and only route through the companion app when `OPENCLAW_NODE_EXEC_HOST=app` is explicitly set, avoiding companion-app filesystem namespace mismatches during exec. (#23547)
<<<<<<< HEAD
- Security/Exec: stop trusting `PATH`-derived directories for safe-bin allowlist checks, add explicit `tools.exec.safeBinTrustedDirs`, and pin safe-bin shell execution to resolved absolute executable paths to prevent binary-shadowing approval bypasses. This ships in the next npm release. Thanks @tdjackey for reporting.
- Slack/Threading: sessions: keep parent-session forking and thread-history context active beyond first turn by removing first-turn-only gates in session init, thread-history fetch, and reply prompt context injection. (#23843, #23090) Thanks @vincentkoc and @Taskle.
- Slack/Threading: respect `replyToMode` when Slack auto-populates top-level `thread_ts`, and ignore inline `replyToId` directive tags when `replyToMode` is `off` so thread forcing stays disabled unless explicitly configured. (#23839, #23320, #23513) Thanks @vincentkoc and @dorukardahan.
>>>>>>> 4adfe8002 (fix(extensions): preserve mediaLocalRoots in telegram/discord sendMedia)
- Slack/Extension: forward `message read` `threadId` to `readMessages` and use delivery-context `threadId` as outbound `thread_ts` fallback so extension replies/reads stay in the correct Slack thread. (#22216, #22485, #23836) Thanks @vincentkoc, @lan17 and @dorukardahan.
<<<<<<< HEAD
=======
- Channels/Group policy: fail closed when `groupPolicy: "allowlist"` is set without explicit `groups`, honor account-level `groupPolicy` overrides, and enforce `groupPolicy: "disabled"` as a hard group block. (#22215) Thanks @etereo.
- Sandbox/Media: map container workspace paths (`/workspace/...` and `file:///workspace/...`) back to the host sandbox root for outbound media validation, preventing false deny errors for sandbox-generated local media. (#23083) Thanks @echo931.
- Sandbox/Docker: apply custom bind mounts after workspace mounts and prioritize bind-source resolution on overlapping paths, so explicit workspace binds are no longer ignored. (#22669) Thanks @tasaankaeris.
- Exec approvals/Forwarding: restore Discord text forwarding when component approvals are not configured, and carry request snapshots through resolve events so resolved notices still forward after cache misses/restarts. (#22988) Thanks @bubmiller.
- Security/Elevated: match `tools.elevated.allowFrom` against sender identities only (not recipient `ctx.To`), closing a recipient-token bypass for `/elevated` authorization. (#11022) Thanks @coygeek.
- Webchat/Sessions: preserve external session routing metadata when internal `chat.send` turns run under `webchat`, so explicit channel-keyed sessions (for example Telegram) no longer get rewritten to `webchat` and misroute follow-up delivery. (#23258) Thanks @binary64.
- Webchat/Sessions: preserve existing session `label` across `/new` and `/reset` rollovers so reset sessions remain discoverable in session history lists. (#23755) Thanks @ThunderStormer.
- Control UI/WebSocket: stop and clear the browser gateway client on UI teardown so remounts cannot leave orphan websocket clients that create duplicate active connections. (#23422) Thanks @floatinggball-design.
<<<<<<< HEAD
>>>>>>> 02dc0c875 (fix(control-ui): stop websocket client on lifecycle teardown (#23422))
=======
- Webchat/Chat: apply assistant `final` payload messages directly to chat state so sent turns render without waiting for a full history refresh cycle. (#14928) Thanks @BradGroux.
<<<<<<< HEAD
>>>>>>> 8264d4521 (fix(webchat): render final assistant payloads without history wait (#14928))
=======
- Webchat/Chat: for out-of-band final events (for example tool-call side runs), append provided final assistant payloads directly instead of forcing a transient history reset. (#11139) Thanks @AkshayNavle.
<<<<<<< HEAD
>>>>>>> f2e998681 (fix(webchat): append out-of-band final payloads in active chat (#11139))
=======
- Webchat/Performance: reload `chat.history` after final events only when the final payload lacks a renderable assistant message, avoiding expensive full-history refreshes on normal turns. (#20588) Thanks @amzzzzzzz.
<<<<<<< HEAD
>>>>>>> dc6afeb4f (perf(webchat): skip unnecessary full history reloads on final events (#20588))
=======
=======
- Sandbox/Media: map container workspace paths (`/workspace/...` and `file:///workspace/...`) back to the host sandbox root for outbound media validation, preventing false deny errors for sandbox-generated local media. (#23083) Thanks @echo931.
- Sandbox/Docker: apply custom bind mounts after workspace mounts and prioritize bind-source resolution on overlapping paths, so explicit workspace binds are no longer ignored. (#22669) Thanks @tasaankaeris.
- Exec approvals/Forwarding: restore Discord text forwarding when component approvals are not configured, and carry request snapshots through resolve events so resolved notices still forward after cache misses/restarts. (#22988) Thanks @bubmiller.
- Control UI/WebSocket: stop and clear the browser gateway client on UI teardown so remounts cannot leave orphan websocket clients that create duplicate active connections. (#23422) Thanks @floatinggball-design.
>>>>>>> 5858de607 (docs: reorder 2026.2.22 changelog by user impact)
- Control UI/WebSocket: send a stable per-tab `instanceId` in websocket connect frames so reconnect cycles keep a consistent client identity for diagnostics and presence tracking. (#23616) Thanks @zq58855371-ui.
>>>>>>> d57405676 (fix(control-ui): send stable websocket instance IDs (#23616))
- Config/Memory: allow `"mistral"` in `agents.defaults.memorySearch.provider` and `agents.defaults.memorySearch.fallback` schema validation. (#14934) Thanks @ThomsenDrake.
<<<<<<< HEAD
>>>>>>> 9f7c1686b (fix(slack extension): preserve thread IDs for read + outbound delivery (#23836))
- Security/Feishu: enforce ID-only allowlist matching for DM/group sender authorization, normalize Feishu ID prefixes during checks, and ignore mutable display names so display-name collisions cannot satisfy allowlist entries. This ships in the next npm release. Thanks @jiseoung for reporting.
<<<<<<< HEAD
>>>>>>> 4ed87a667 (fix(feishu): enforce id-only allowlist matching)
=======
- Feishu/Commands: in group chats, command authorization now falls back to top-level `channels.feishu.allowFrom` when per-group `allowFrom` is not set, so `/command` no longer gets blocked by an unintended empty allowlist. (#23756)
- Feishu/Plugins: restore bundled Feishu SDK availability for global installs and strip `openclaw: workspace:*` from plugin `devDependencies` during plugin-version sync so npm-installed Feishu plugins do not fail dependency install. (#23611, #23645, #23603)
- Dev tooling: prevent `CLAUDE.md` symlink target regressions by excluding CLAUDE symlink sentinels from `oxfmt` and marking them `-text` in `.gitattributes`, so formatter/EOL normalization cannot reintroduce trailing-newline targets. Thanks @vincentkoc.
- Cron: honor `cron.maxConcurrentRuns` in the timer loop so due jobs can execute up to the configured parallelism instead of always running serially. (#11595) Thanks @Takhoffman.
=======
- Feishu/Commands: in group chats, command authorization now falls back to top-level `channels.feishu.allowFrom` when per-group `allowFrom` is not set, so `/command` no longer gets blocked by an unintended empty allowlist. (#23756)
- Dev tooling: prevent `CLAUDE.md` symlink target regressions by excluding CLAUDE symlink sentinels from `oxfmt` and marking them `-text` in `.gitattributes`, so formatter/EOL normalization cannot reintroduce trailing-newline targets. Thanks @vincentkoc.
>>>>>>> 5858de607 (docs: reorder 2026.2.22 changelog by user impact)
- Agents/Compaction: restore embedded compaction safeguard/context-pruning extension loading in production by wiring bundled extension factories into the resource loader instead of runtime file-path resolution. (#22349) Thanks @Glucksberg.
- Feishu/Media: for inbound video messages that include both `file_key` (video) and `image_key` (thumbnail), prefer `file_key` when downloading media so video attachments are saved instead of silently failing on thumbnail keys. (#23633)
>>>>>>> 1bc5ba6e2 (fix(feishu): prefer video file_key for inbound media)
- Hooks/Cron: suppress duplicate main-session events for delivered hook turns and mark `SILENT_REPLY_TOKEN` (`NO_REPLY`) early exits as delivered to prevent hook context pollution. (#20678) Thanks @JonathanWorks.
- Providers/OpenRouter: inject `cache_control` on system prompts for OpenRouter Anthropic models to improve prompt-cache reuse. (#17473) Thanks @rrenamed.
- Installer/Smoke tests: remove legacy `OPENCLAW_USE_GUM` overrides from docker install-smoke runs so tests exercise installer auto TTY detection behavior directly.
- Providers/OpenRouter: allow pass-through OpenRouter and Opencode model IDs in live model filtering so custom routed model IDs are treated as modern refs. (#14312) Thanks @Joly0.
- Providers/OpenRouter: default reasoning to enabled when the selected model advertises `reasoning: true` and no session/directive override is set. (#22513) Thanks @zwffff.
- Providers/OpenRouter: map `/think` levels to `reasoning.effort` in embedded runs while preserving explicit `reasoning.max_tokens` payloads. (#17236) Thanks @robbyczgw-cla.
- Providers/OpenRouter: preserve stored session provider when model IDs are vendor-prefixed (for example, `anthropic/...`) so follow-up turns do not incorrectly route to direct provider APIs. (#22753) Thanks @dndodson.
>>>>>>> cc5cd51b1 (docs(changelog): note installer gum auto-path smoke coverage)
- Providers/OpenRouter: preserve the required `openrouter/` prefix for OpenRouter-native model IDs during model-ref normalization. (#12942) Thanks @omair445.
- Providers/OpenRouter: pass through provider routing parameters from model params.provider to OpenRouter request payloads for provider selection controls. (#17148) Thanks @carrotRakko.
<<<<<<< HEAD
- Telegram/Webhook: keep webhook monitors alive until gateway abort signals fire, preventing false channel exits and immediate webhook auto-restart loops.
- Telegram/Polling: retry recoverable setup-time network failures in monitor startup and await runner teardown before retry to avoid overlapping polling sessions.
- Telegram/Polling: clear Telegram webhooks (`deleteWebhook`) before starting long-poll `getUpdates`, including retry handling for transient cleanup failures.
- Telegram/Webhook: add `channels.telegram.webhookPort` config support and pass it through plugin startup wiring to the monitor listener.
- Telegram/Media: send a user-facing Telegram reply when media download fails (non-size errors) instead of silently dropping the message.
=======
- Providers/OpenRouter: preserve model allowlist entries containing OpenRouter preset paths (for example `openrouter/@preset/...`) by treating `/model ...@profile` auth-profile parsing as a suffix-only override. (#14120) Thanks @NotMainstream.
- Cron/Auth: propagate auth-profile resolution to isolated cron sessions so provider API keys are resolved the same way as main sessions, fixing 401 errors when using providers configured via auth-profiles. (#20689) Thanks @lailoo.
- Cron/Follow-up: pass resolved `agentDir` through isolated cron and queued follow-up embedded runs so auth/profile lookups stay scoped to the correct agent directory. (#22845) Thanks @seilk.
- Agents/Media: route tool-result `MEDIA:` extraction through shared parser validation so malformed prose like `MEDIA:-prefixed ...` is no longer treated as a local file path (prevents Telegram ENOENT tool-error overrides). (#18780) Thanks @HOYALIM.
>>>>>>> 5858de607 (docs: reorder 2026.2.22 changelog by user impact)
- Logging: cap single log-file size with `logging.maxFileBytes` (default 500 MB) and suppress additional writes after cap hit to prevent disk exhaustion from repeated error storms.
- Memory/Remote HTTP: centralize remote memory HTTP calls behind a shared guarded helper (`withRemoteHttpResponse`) so embeddings and batch flows use one request/release path.
- Memory/Embeddings: apply configured remote-base host pinning (`allowedHostnames`) across OpenAI/Voyage/Gemini embedding requests to keep private/self-hosted endpoints working without cross-host drift. (#18198) Thanks @ianpcook.
- Memory/Batch: route OpenAI/Voyage/Gemini batch upload/create/status/download requests through the same guarded HTTP path for consistent SSRF policy enforcement.
<<<<<<< HEAD
<<<<<<< HEAD
=======
- Install/Discord Voice: make `@discordjs/opus` an optional dependency so `openclaw` install/update no longer hard-fails when native Opus builds fail, while keeping `opusscript` as the runtime fallback decoder for Discord voice flows. (#23737, #23733, #23703) Thanks @jeadland, @Sheetaa, and @Breakyman.
- Slack/Upload: resolve bare user IDs (U-prefix) to DM channel IDs via `conversations.open` before calling `files.uploadV2`, which rejects non-channel IDs. `chat.postMessage` tolerates user IDs directly, but `files.uploadV2` → `completeUploadExternal` validates `channel_id` against `^[CGDZ][A-Z0-9]{8,}$`, causing `invalid_arguments` when agents reply with media to DM conversations.
- Browser/Relay: treat extension websocket as connected only when `OPEN`, allow reconnect when a stale `CLOSING/CLOSED` extension socket lingers, and guard stale socket message/close handlers so late events cannot clear active relay state; includes regression coverage for live-duplicate `409` rejection and immediate reconnect-after-close races. (#15099, #18698, #20688)
- Browser/Extension Relay: refactor the MV3 worker to preserve debugger attachments across relay drops, auto-reconnect with bounded backoff+jitter, persist and rehydrate attached tab state via `chrome.storage.session`, recover from `target_closed` navigation detaches, guard stale socket handlers, enforce per-tab operation locks and per-request timeouts, and add lifecycle keepalive/badge refresh hooks (`alarms`, `webNavigation`). (#15099, #6175, #8468, #9807)
- Browser/Remote CDP: extend stale-target recovery so `ensureTabAvailable()` now reuses the sole available tab for remote CDP profiles (same behavior as extension profiles) while preserving strict `tab not found` errors when multiple tabs exist; includes remote-profile regression tests. (#15989)
>>>>>>> fbdae4998 (Changelog: fix unreleased thanks attribution placement)
=======
- Memory/QMD: on Windows, resolve bare `qmd`/`mcporter` command names to npm shim executables (`.cmd`) before spawning, so qmd boot updates and mcporter-backed searches no longer fail with `spawn ... ENOENT` on default npm installs. (#23899) Thanks @arcbuilder-ai.
>>>>>>> 5858de607 (docs: reorder 2026.2.22 changelog by user impact)
- Signal/RPC: guard malformed Signal RPC JSON responses with a clear status-scoped error and add regression coverage for invalid JSON responses. (#22995) Thanks @adhitShet.
- Gateway/Subagents: guard gateway and subagent session-key/message trim paths against undefined inputs to prevent early `Cannot read properties of undefined (reading 'trim')` crashes during subagent spawn and wait flows.
- Agents/Workspace: guard `resolveUserPath` against undefined/null input to prevent `Cannot read properties of undefined (reading 'trim')` crashes when workspace paths are missing in embedded runner flows.
- Auth/Profiles: keep active `cooldownUntil`/`disabledUntil` windows immutable across retries so mid-window failures cannot extend recovery indefinitely; only recompute a backoff window after the previous deadline has expired. This resolves cron/inbound retry loops that could trap gateways until manual `usageStats` cleanup. (#23516, #23536) Thanks @arosstale.
- Channels/Security: fail closed on missing provider group policy config by defaulting runtime group policy to `allowlist` (instead of inheriting `channels.defaults.groupPolicy`) when `channels.<provider>` is absent across message channels, and align runtime + security warnings/docs to the same fallback behavior (Slack, Discord, iMessage, Telegram, WhatsApp, Signal, LINE, Matrix, Mattermost, Google Chat, IRC, Nextcloud Talk, Feishu, and Zalo user flows; plus Discord message/native-command paths). (#23367) Thanks @bmendonca3.
- Gateway/Onboarding: harden remote gateway onboarding defaults and guidance by defaulting discovered direct URLs to `wss://`, rejecting insecure non-loopback `ws://` targets in onboarding validation, and expanding remote-security remediation messaging across gateway client/call/doctor flows. (#23476) Thanks @bmendonca3.
- CLI/Sessions: pass the configured sessions directory when resolving transcript paths in `agentCommand`, so custom `session.store` locations resume sessions reliably. Thanks @davidrudduck.
<<<<<<< HEAD
- Gateway/Chat UI: strip inline reply/audio directive tags from non-streaming final webchat broadcasts (including `chat.inject`) while preserving empty-string message content when tags are the entire reply. (#23298) Thanks @SidQin-cyber.
- Gateway/Restart: fix restart-loop edge cases by keeping `openclaw.mjs -> dist/entry.js` bootstrap detection explicit, reacquiring the gateway lock for in-process restart fallback paths, and tightening restart-loop regression coverage. (#23416) Thanks @jeffwnli.
=======
>>>>>>> 5858de607 (docs: reorder 2026.2.22 changelog by user impact)
- Signal/Monitor: treat user-initiated abort shutdowns as clean exits when auto-started `signal-cli` is terminated, while still surfacing unexpected daemon exits as startup/runtime failures. (#23379) Thanks @frankekn.
- Channels/Dedupe: centralize plugin dedupe primitives in plugin SDK (memory + persistent), move Feishu inbound dedupe to a namespace-scoped persistent store, and reuse shared dedupe cache logic for Zalo webhook replay + Tlon processed-message tracking to reduce duplicate handling during reconnect/replay paths. (#23377) Thanks @SidQin-cyber.
- Channels/Delivery: remove hardcoded WhatsApp delivery fallbacks; require explicit/session channel context or auto-pick the sole configured channel when unambiguous. (#23357) Thanks @lbo728.
- ACP/Gateway: wait for gateway hello before opening ACP requests, and fail fast on pre-hello connect failures to avoid startup hangs and early `gateway not connected` request races. (#23390) Thanks @janckerchen.
>>>>>>> 3254c72d4 (Update CHANGELOG.md)
- Security/Audit: add `openclaw security audit` detection for open group policies that expose runtime/filesystem tools without sandbox/workspace guards (`security.exposure.open_groups_with_runtime_or_fs`).
- Security/Exec env: block request-scoped `HOME` and `ZDOTDIR` overrides in host exec env sanitizers (Node + macOS), preventing shell startup-file execution before allowlist-evaluated command bodies. This ships in the next npm release. Thanks @tdjackey for reporting.
<<<<<<< HEAD
=======
- Security/Exec env: block `SHELLOPTS`/`PS4` in host exec env sanitizers and restrict shell-wrapper (`bash|sh|zsh ... -c/-lc`) request env overrides to a small explicit allowlist (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`) on both node host and macOS companion paths, preventing xtrace prompt command-substitution allowlist bypasses. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Exec approvals: fail closed on shell line continuations (`\\\n`/`\\\r\n`) and treat shell-wrapper execution as approval-required in allowlist mode, preventing `$\\` newline command-substitution bypasses. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Gateway: emit a startup security warning when insecure/dangerous config flags are enabled (including `gateway.controlUi.dangerouslyDisableDeviceAuth=true`) and point operators to `openclaw security audit`.
>>>>>>> 9a6a4131b (docs(changelog): note shell-wrapper line-continuation exec hardening)
- Security/Hooks auth: normalize hook auth rate-limit client IP keys so IPv4 and IPv4-mapped IPv6 addresses share one throttle bucket, preventing dual-form auth-attempt budget bypasses. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
<<<<<<< HEAD
=======
- Security/Exec approvals: treat `env` and shell-dispatch wrappers as transparent during allowlist analysis on node-host and macOS companion paths so policy checks match the effective executable/inline shell payload instead of the wrapper binary, blocking wrapper-smuggled allowlist bypasses. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Exec approvals: require explicit safe-bin profiles for `tools.exec.safeBins` entries in allowlist mode (remove generic safe-bin profile fallback), and add `tools.exec.safeBinProfiles` for safe custom binaries so unprofiled interpreter-style entries cannot be treated as stdin-safe. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Channels: harden Slack external menu token handling by switching to CSPRNG tokens, validating token shape, requiring user identity for external option lookups, and avoiding fabricated timestamp `trigger_id` fallbacks; also switch Tlon Urbit channel IDs to CSPRNG UUIDs, centralize secure ID/token generation via shared infra helpers, and add a guardrail test to block new runtime `Date.now()+Math.random()` token/id patterns.
- Security/Hooks transforms: enforce symlink-safe containment for webhook transform module paths (including `hooks.transformsDir` and `hooks.mappings[].transform.module`) by resolving existing-path ancestors via realpath before import, while preserving in-root symlink support; add regression coverage for both escape and allow cases. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
>>>>>>> 376eb6e99 (docs(changelog): note safe-bin profile hardening)
- Telegram/WSL2: disable `autoSelectFamily` by default on WSL2 and memoize WSL2 detection in Telegram network decision logic to avoid repeated sync `/proc/version` probes on fetch/send paths. (#21916) Thanks @MizukiMachine.
- Telegram/Streaming: preserve archived draft preview mapping after flush and clean superseded reasoning preview bubbles so multi-message preview finals no longer cross-edit or orphan stale messages under send/rotation races. (#23202) Thanks @obviyus.
- Slack/Slash commands: preserve the Bolt app receiver when registering external select options handlers so monitor startup does not crash on runtimes that require bound `app.options` calls. (#23209) Thanks @0xgaia.
- Slack/Telegram slash sessions: await session metadata persistence before dispatch so first-turn native slash runs do not race session-origin metadata updates. (#23065) thanks @hydro13.
- Agents/Ollama: preserve unsafe integer tool-call arguments as exact strings during NDJSON parsing, preventing large numeric IDs from being rounded before tool execution. (#23170) Thanks @BestJoester.
- Cron/Gateway: keep `cron.list` and `cron.status` responsive during startup catch-up by avoiding a long-held cron lock while missed jobs execute. (#23106) Thanks @jayleekr.
- Gateway/Config reload: compare array-valued config paths structurally during diffing so unchanged `memory.qmd.paths` and `memory.qmd.scope.rules` no longer trigger false restart-required reloads. (#23185) Thanks @rex05ai.
- Cron/Scheduling: validate runtime cron expressions before schedule/stagger evaluation so malformed persisted jobs report a clear `invalid cron schedule: expr is required` error instead of crashing with `undefined.trim` failures and auto-disable churn. (#23223) Thanks @asimons81.
- Memory/QMD: migrate legacy unscoped collection bindings (for example `memory-root`) to per-agent scoped names (for example `memory-root-main`) during startup when safe, so QMD-backed `memory_search` no longer fails with `Collection not found` after upgrades. (#23228, #20727) Thanks @JLDynamics and @AaronFaby.
- TUI/Input: enable multiline-paste burst coalescing on macOS Terminal.app and iTerm so pasted blocks no longer submit line-by-line as separate messages. (#18809) Thanks @fwends.
- TUI/Status: request immediate renders after setting `sending`/`waiting` activity states so in-flight runs always show visible progress indicators instead of appearing idle until completion. (#21549) Thanks @13Guinness.
- Agents/Fallbacks: treat JSON payloads with `type: "api_error"` + `"Internal server error"` as transient failover errors so Anthropic 500-style failures trigger model fallback. (#23193) Thanks @jarvis-lane.
- Agents/Transcripts: validate assistant tool-call names (syntax/length + registered tool allowlist) before transcript persistence and during replay sanitization so malformed failover tool names no longer poison sessions with repeated provider HTTP 400 errors. (#23324) Thanks @johnsantry.
- Agents/Compaction: strip stale assistant usage snapshots from pre-compaction turns when replaying history after a compaction summary so context-token estimation no longer reuses pre-compaction totals and immediately re-triggers destructive follow-up compactions. (#19127) Thanks @tedwatson.
- Agents/Diagnostics: include resolved lifecycle error text in `embedded run agent end` warnings so UI/TUI “Connection error” runs expose actionable provider failure reasons in gateway logs. (#23054) Thanks @Raize.
- Plugins/Hooks: run legacy `before_agent_start` once per agent turn and reuse that result across model-resolve and prompt-build compatibility paths, preventing duplicate hook side effects (for example duplicate external API calls). (#23289) Thanks @ksato8710.
- Models/Config: default missing Anthropic provider/model `api` fields to `anthropic-messages` during config validation so custom relay model entries are preserved instead of being dropped by runtime model registry validation. (#23332) Thanks @bigbigmonkey123.
<<<<<<< HEAD
- Gateway/Pairing: treat operator.admin pairing tokens as satisfying operator.write requests so legacy devices stop looping through scope-upgrade prompts introduced in 2026.2.19. (#23125, #23006) Thanks @vignesh07.
- Gateway/Pairing: treat `operator.admin` as satisfying other `operator.*` scope checks during device-auth verification so local CLI/TUI sessions stop entering pairing-required loops for pairing/approval-scoped commands. (#22062, #22193, #21191) Thanks @Botaccess, @jhartshorn, and @ctbritt.
- Gateway/Pairing: preserve existing approved token scopes when processing repair pairings that omit `scopes`, preventing empty-scope token regressions on reconnecting clients. (#21906) Thanks @paki81.
- Plugins/CLI: make `openclaw plugins enable` and plugin install/link flows update allowlists via shared plugin-enable policy so enabled plugins are not left disabled by allowlist mismatch. (#23190) Thanks @downwind7clawd-ctrl.
>>>>>>> cd7faea93 (docs(changelog): note next npm release for hook auth fix)
- Memory/QMD: add optional `memory.qmd.mcporter` search routing so QMD `query/search/vsearch` can run through mcporter keep-alive flows (including multi-collection paths) to reduce cold starts, while keeping searches on agent-scoped QMD state for consistent recall. (#19617) Thanks @nicole-luxe and @vignesh07.
>>>>>>> a37e12eab (docs(changelog): credit nicole-luxe for mcporter QMD work)
- Chat/UI: strip inline reply/audio directive tags (`[[reply_to_current]]`, `[[reply_to:<id>]]`, `[[audio_as_voice]]`) from displayed chat history, live chat event output, and session preview snippets so control tags no longer leak into user-visible surfaces.
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
- Gateway/Pairing: preserve existing approved token scopes when processing repair pairings that omit `scopes`, preventing empty-scope token regressions on reconnecting clients. (#21906) Thanks @paki81.
- Memory/QMD: add optional `memory.qmd.mcporter` search routing so QMD `query/search/vsearch` can run through mcporter keep-alive flows (including multi-collection paths) to reduce cold starts, while keeping searches on agent-scoped QMD state for consistent recall. (#19617) Thanks @nicole-luxe and @vignesh07.
>>>>>>> 5858de607 (docs: reorder 2026.2.22 changelog by user impact)
- Infra/Network: classify undici `TypeError: fetch failed` as transient in unhandled-rejection detection even when nested causes are unclassified, preventing avoidable gateway crash loops on flaky networks. (#14345) Thanks @Unayung.
- Telegram/Retry: classify undici `TypeError: fetch failed` as recoverable in both polling and send retry paths so transient fetch failures no longer fail fast. (#16699) thanks @Glucksberg.
- Docs/Telegram: correct Node 22+ network defaults (`autoSelectFamily`, `dnsResultOrder`) and clarify Telegram setup does not use positional `openclaw channels login telegram`. (#23609) Thanks @ryanbastic.
>>>>>>> e58054b85 (docs(telegram): align Node22 network defaults and setup guidance)
- BlueBubbles/DM history: restore DM backfill context with account-scoped rolling history, bounded backfill retries, and safer history payload limits. (#20302) Thanks @Ryan-Haines.
- BlueBubbles/Webhooks: accept inbound/reaction webhook payloads when BlueBubbles omits `handle` but provides DM `chatGuid`, and harden payload extraction for array/string-wrapped message bodies so valid webhook events no longer get rejected as unparseable. (#23275) Thanks @toph31.
- Security/Config: block prototype-key traversal during config merge patch and legacy migration merge helpers (`__proto__`, `constructor`, `prototype`) to prevent prototype pollution during config mutation flows. (#22968) Thanks @Clawborn.
>>>>>>> 7a6ff4c55 (docs(changelog): credit BlueBubbles DM history fix (#23095))
- Security/Shell env: validate login-shell executable paths for shell-env fallback (`/etc/shells` + trusted prefixes) and block `SHELL` in dangerous env override policy paths so untrusted shell-path injection falls back safely to `/bin/sh`. Thanks @athuljayaram for reporting.
- Security/Config: make parsed chat allowlist checks fail closed when `allowFrom` is empty, restoring expected DM/pairing gating.
- Security/Exec: in non-default setups that manually add `sort` to `tools.exec.safeBins`, block `sort --compress-program` so allowlist-mode safe-bin checks cannot bypass approval. Thanks @tdjackey for reporting.
- Security/macOS app beta: enforce path-only `system.run` allowlist matching (drop basename matches like `echo`), migrate legacy basename entries to last resolved paths when available, and harden shell-chain handling to fail closed on unsafe parse/control syntax (including quoted command substitution/backticks). This is an optional allowlist-mode feature; default installs remain deny-by-default. This ships in the next npm release. Thanks @tdjackey for reporting.
<<<<<<< HEAD
=======
- Security/Agents: auto-generate and persist a dedicated `commands.ownerDisplaySecret` when `commands.ownerDisplay=hash`, remove gateway token fallback from owner-ID prompt hashing across CLI and embedded agent runners, and centralize owner-display secret resolution in one shared helper. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
- Security/SSRF: expand IPv4 fetch guard blocking to include RFC special-use/non-global ranges (including benchmarking, TEST-NET, multicast, and reserved/broadcast blocks), centralize range checks into a single CIDR policy table, and reuse one shared host/IP classifier across literal + DNS checks to reduce classifier drift. This ships in the next npm release. Thanks @princeeismond-dot for reporting.
>>>>>>> ab1840b88 (docs(changelog): credit SSRF report in unreleased notes)
- Security/Archive: block zip symlink escapes during archive extraction.
- Security/Discord: add `openclaw security audit` warnings for name/tag-based Discord allowlist entries (DM allowlists, guild/channel `users`, and pairing-store entries), highlighting slug-collision risk while keeping name-based matching supported, and canonicalize resolved Discord allowlist names to IDs at runtime without rewriting config files. Thanks @tdjackey for reporting.
- Security/Gateway: block node-role connections when device identity metadata is missing.
<<<<<<< HEAD
=======
- Security/Media: enforce inbound media byte limits during download/read across Discord, Telegram, Zalo, Microsoft Teams, and BlueBubbles to prevent oversized payload memory spikes before rejection. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Control UI: block symlink-based out-of-root static file reads by enforcing realpath containment and file-identity checks when serving Control UI assets and SPA fallback `index.html`. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/MSTeams media: enforce allowlist checks for SharePoint reference attachment URLs and redirect targets during Graph-backed media fetches so redirect chains cannot escape configured media host boundaries. This ships in the next npm release. Thanks @tdjackey for reporting.
>>>>>>> dea154cca (docs(changelog): add control-ui symlink hardening entry)
- Chat/Usage/TUI: strip synthetic inbound metadata blocks (including `Conversation info` and trailing `Untrusted context` channel metadata wrappers) from displayed conversation history so internal prompt context no longer leaks into user-visible logs.
- Security/Browser relay: harden extension relay auth token handling for `/extension` and `/cdp` pathways.
- Cron: persist `delivered` state in cron job records so delivery failures remain visible in status and logs. (#19174) Thanks @simonemacario.
- Config/Doctor: only repair the OAuth credentials directory when affected channels are configured, avoiding fresh-install noise.
- Usage/Pricing: correct MiniMax M2.5 pricing defaults to fix inflated cost reporting. (#22755) Thanks @miloudbelarebia.
- Gateway/Daemon: verify gateway health after daemon restart.
- Agents/UI text: stop rewriting normal assistant billing/payment language outside explicit error contexts. (#17834) Thanks @niceysam.

## 2026.2.21

### Changes

- Models/Google: add Gemini 3.1 support (`google/gemini-3.1-pro-preview`).
- Providers/Onboarding: add Volcano Engine (Doubao) and BytePlus providers/models (including coding variants), wire onboarding auth choices for interactive + non-interactive flows, and align docs to `volcengine-api-key`. (#7967) Thanks @funmore123.
>>>>>>> c3af00bdd (docs(changelog): split 2026.2.21 release entries)
- Channels/CLI: add per-account/channel `defaultTo` outbound routing fallback so `openclaw agent --deliver` can send without explicit `--reply-to` when a default target is configured. (#16985) Thanks @KirillShchetinin.
- Channels: allow per-channel model overrides via `channels.modelByChannel` and note them in /status. Thanks @thewilloftheshadow.
- Telegram/Streaming: simplify preview streaming config to `channels.telegram.streaming` (boolean), auto-map legacy `streamMode` values, and remove block-vs-partial preview branching. (#22012) thanks @obviyus.
- Discord/Streaming: add stream preview mode for live draft replies with partial/block options and configurable chunking. Thanks @thewilloftheshadow. Inspiration @neoagentic-ship-it.
- Discord/Telegram: add configurable lifecycle status reactions for queued/thinking/tool/done/error phases with a shared controller and emoji/timing overrides. Thanks @wolly-tundracube and @thewilloftheshadow.
- Discord/Voice: add voice channel join/leave/status via `/vc`, plus auto-join configuration for realtime voice conversations. Thanks @thewilloftheshadow.
- Discord: add configurable ephemeral defaults for slash-command responses. (#16563) Thanks @wei.
- Discord: support updating forum `available_tags` via channel edit actions for forum tag management. (#12070) Thanks @xiaoyaner0201.
- Discord: include channel topics in trusted inbound metadata on new sessions. Thanks @thewilloftheshadow.
- iOS/Chat: clean chat UI noise by stripping inbound untrusted metadata/timestamp prefixes, formatting tool outputs into concise summaries/errors, compacting the composer while typing, and supporting tap-to-dismiss keyboard in chat view. (#22122) thanks @mbelinky.
- iOS/Watch: bridge mirrored watch prompt notification actions into iOS quick-reply handling, including queued action handoff until app model initialization. (#22123) thanks @mbelinky.
- iOS/Gateway: stabilize background wake and reconnect behavior with background reconnect suppression/lease windows, BGAppRefresh wake fallback, location wake hook throttling, and APNs wake retry+nudge instrumentation. (#21226) thanks @mbelinky.
- Auto-reply/UI: add model fallback lifecycle visibility in verbose logs, /status active-model context with fallback reason, and cohesive WebUI fallback indicators. (#20704) Thanks @joshavant.
- MSTeams: dedupe sent-message cache storage by removing duplicate per-message Set storage and using timestamps Map keys as the single membership source. (#22514) Thanks @TaKO8Ki.
- Agents/Subagents: default subagent spawn depth now uses shared `maxSpawnDepth=2`, enabling depth-1 orchestrator spawning by default while keeping depth policy checks consistent across spawn and prompt paths. (#22223) Thanks @tyler6204.
- Security/Agents: make owner-ID obfuscation use a dedicated HMAC secret from configuration (`ownerDisplaySecret`) and update hashing behavior so obfuscation is decoupled from gateway token handling for improved control. (#7343) Thanks @vincentkoc.
- Security/Infra: switch gateway lock and tool-call synthetic IDs from SHA-1 to SHA-256 with unchanged truncation length to strengthen hash basis while keeping deterministic behavior and lock key format. (#7343) Thanks @vincentkoc.
- Dependencies/Tooling: add non-blocking dead-code scans in CI via Knip/ts-prune/ts-unused-exports to surface unused dependencies and exports earlier. (#22468) Thanks @vincentkoc.
- Dependencies/Unused Dependencies: remove or scope unused root and extension deps (`@larksuiteoapi/node-sdk`, `signal-utils`, `ollama`, `lit`, `@lit/context`, `@lit-labs/signals`, `@microsoft/agents-hosting-express`, `@microsoft/agents-hosting-extensions-teams`, and plugin-local `openclaw` devDeps in `extensions/open-prose`, `extensions/lobster`, and `extensions/llm-task`). (#22471, #22495) Thanks @vincentkoc.
- Dependencies/A2UI: harden dependency resolution after root cleanup (resolve `lit`, `@lit/context`, `@lit-labs/signals`, and `signal-utils` from workspace/root) and simplify bundling fallback behavior, including `pnpm dlx rolldown` compatibility. (#22481, #22507) Thanks @vincentkoc.
>>>>>>> 75d4f6d51 (docs: reorder and trim 2026.2.21 changelog entries)

<<<<<<< HEAD
>>>>>>> fe3215092 (test(ios): cover IPv4-mapped IPv6 loopback in manual TLS policy (#22045))
### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
- Gateway/Auth: require `gateway.trustedProxies` to include a loopback proxy address when `auth.mode="trusted-proxy"` and `bind="loopback"`, preventing same-host proxy misconfiguration from silently blocking auth. (#22082, follow-up to #20097) thanks @mbelinky.
- Gateway/Auth: allow trusted-proxy mode with loopback bind for same-host reverse-proxy deployments, while still requiring configured `gateway.trustedProxies`. (#20097) thanks @xinhuagu.
- Gateway/Auth: allow authenticated clients across roles/scopes to call `health` while preserving role and scope enforcement for non-health methods. (#19699) thanks @Nachx639.
- Gateway/Security: remove shared-IP fallback for canvas endpoints and require token or session capability for canvas access. Thanks @thewilloftheshadow.
- Gateway/Hooks: include transform export name in hook-transform cache keys so distinct exports from the same module do not reuse the wrong cached transform function. (#13855) thanks @mcaxtr.
- Gateway/Control UI: return 404 for missing static-asset paths instead of serving SPA fallback HTML, while preserving client-route fallback behavior for extensionless and non-asset dotted paths. (#12060) thanks @mcaxtr.
- Gateway/Pairing: prevent device-token rotate scope escalation by enforcing an approved-scope baseline, preserving approved scopes across metadata updates, and rejecting rotate requests that exceed approved role scope implications. (#20703) thanks @coygeek.
- Gateway/Security: require secure context and paired-device checks for Control UI auth even when `gateway.controlUi.allowInsecureAuth` is set, and align audit messaging with the hardened behavior. (#20684) thanks @coygeek.
- macOS/Build: default release packaging to `BUNDLE_ID=ai.openclaw.mac` in `scripts/package-mac-dist.sh`, so Sparkle feed URL is retained and auto-update no longer fails with an empty appcast feed. (#19750) thanks @loganprit.
- Gateway/Pairing: clear persisted paired-device state when the gateway client closes with `device token mismatch` (`1008`) so reconnect flows can cleanly re-enter pairing. (#22071) Thanks @mbelinky.

- Signal/Outbound: preserve case for Base64 group IDs during outbound target normalization so cross-context routing and policy checks no longer break when group IDs include uppercase characters. (#5578) Thanks @heyhudson.
=======
=======
- ACP/Security: escape control and delimiter characters in ACP `resource_link` title/URI metadata before prompt interpolation to prevent metadata-driven prompt injection through resource links. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
- TTS/Security: make model-driven provider switching opt-in by default (`messages.tts.modelOverrides.allowProvider=false` unless explicitly enabled), while keeping voice/style overrides available, to reduce prompt-injection-driven provider hops and unexpected TTS cost escalation. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
- Security/Agents: keep overflow compaction retry budgeting global across tool-result truncation recovery so successful truncation cannot reset the overflow retry counter and amplify retry/cost cycles. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
- BlueBubbles/Security (optional beta iMessage plugin): require webhook token authentication for all BlueBubbles webhook requests (including loopback/proxied setups), removing passwordless webhook fallback behavior. Thanks @zpbrent.
>>>>>>> 9516ace3c (docs(changelog): note ACP resource-link prompt hardening)
- iOS/Security: force `https://` for non-loopback manual gateway hosts during iOS onboarding to block insecure remote transport URLs. (#21969) Thanks @mbelinky.
- Gateway/Security: remove shared-IP fallback for canvas endpoints and require token or session capability for canvas access. Thanks @thewilloftheshadow.
- Gateway/Security: require secure context and paired-device checks for Control UI auth even when `gateway.controlUi.allowInsecureAuth` is set, and align audit messaging with the hardened behavior. This ships in the next npm release. (#20684) Thanks @coygeek and @Vasco0x4 for reporting.
- Gateway/Security: scope tokenless Tailscale forwarded-header auth to Control UI websocket auth only, so HTTP gateway routes still require token/password even on trusted hosts. This ships in the next npm release. Thanks @zpbrent for reporting.
- Docker/Security: run E2E and install-sh test images as non-root by adding appuser directives. Thanks @thewilloftheshadow.
- Skills/Security: sanitize skill env overrides to block unsafe runtime injection variables and only allow sensitive keys when declared in skill metadata, with warnings for suspicious values. Thanks @thewilloftheshadow.
<<<<<<< HEAD
=======
- Security/Browser: block non-network browser navigation protocols (including `file:`, `data:`, and `javascript:`) while preserving `about:blank`, preventing local file reads via browser tool navigation. This ships in the next npm release. Thanks @q1uf3ng for reporting.
- Security/Exec: block shell startup-file env injection (`BASH_ENV`, `ENV`, `BASH_FUNC_*`, `LD_*`, `DYLD_*`) across config env ingestion, node-host inherited environment sanitization, and macOS exec host runtime to prevent pre-command execution from attacker-controlled environment variables. Thanks @tdjackey.
- Security/Exec (Windows): canonicalize `cmd.exe /c` command text across validation, approval binding, and audit/event rendering to prevent trailing-argument approval mismatches in `system.run`. This ships in the next npm release. Thanks @tdjackey for reporting.
>>>>>>> dff61a10e (docs(changelog): add windows system.run approval mismatch fix note)
- Security/Gateway/Hooks: block `__proto__`, `constructor`, and `prototype` traversal in webhook template path resolution to prevent prototype-chain payload data leakage in `messageTemplate` rendering. (#22213) Thanks @SleuthCo.
- Security/OpenClawKit/UI: prevent injected inbound user context metadata blocks from leaking into chat history in TUI, webchat, and macOS surfaces by stripping all untrusted metadata prefixes at display boundaries. (#22142) Thanks @Mellowambience, @vincentkoc.
- Security/OpenClawKit/UI: strip inbound metadata blocks from user messages in TUI rendering while preserving user-authored content. (#22345) Thanks @kansodata, @vincentkoc.
- Security/OpenClawKit/UI: prevent inbound metadata leaks and reply-tag streaming artifacts in TUI rendering by stripping untrusted metadata prefixes at display boundaries. (#22346) Thanks @akramcodez, @vincentkoc.
- Security/Agents: restrict local MEDIA tool attachments to core tools and the OpenClaw temp root to prevent untrusted MCP tool file exfiltration. Thanks @NucleiAv and @thewilloftheshadow.
- Security/Net: strip sensitive headers (`Authorization`, `Proxy-Authorization`, `Cookie`, `Cookie2`) on cross-origin redirects in `fetchWithSsrFGuard` to prevent credential forwarding across origin boundaries. (#20313) Thanks @afurm.
- Security/Systemd: reject CR/LF in systemd unit environment values and fix argument escaping so generated units cannot be injected with extra directives. Thanks @thewilloftheshadow.
- Security/Tools: add per-wrapper random IDs to untrusted-content markers from `wrapExternalContent`/`wrapWebContent`, preventing marker spoofing from escaping content boundaries. (#19009) Thanks @Whoaa512.
- Shared/Security: reject insecure deep links that use `ws://` non-loopback gateway URLs to prevent plaintext remote websocket configuration. (#21970) Thanks @mbelinky.
- macOS/Security: reject non-loopback `ws://` remote gateway URLs in macOS remote config to block insecure plaintext websocket endpoints. (#21971) Thanks @mbelinky.
- Browser/Security: block upload path symlink escapes so browser upload sources cannot traverse outside the allowed workspace via symlinked paths. (#21972) Thanks @mbelinky.
- Security/Dependencies: bump transitive `hono` usage to `4.11.10` to incorporate timing-safe authentication comparison hardening for `basicAuth`/`bearerAuth` (`GHSA-gq3j-xvxp-8hrf`). Thanks @vincentkoc.
- Security/Gateway: parse `X-Forwarded-For` with trust-preserving semantics when requests come from configured trusted proxies, preventing proxy-chain spoofing from influencing client IP classification and rate-limit identity. Thanks @AnthonyDiSanti and @vincentkoc.
- Security/Sandbox: remove default `--no-sandbox` for the browser container entrypoint, add explicit opt-in via `OPENCLAW_BROWSER_NO_SANDBOX` / `CLAWDBOT_BROWSER_NO_SANDBOX`, and harden the default container security posture (`GHSA-43x4-g22p-3hrq`). Thanks @TerminalsandCoffee and @vincentkoc.
=======
=======
- Security/Agents: cap embedded Pi runner outer retry loop to 24 attempts and return an explicit `retry_limit` error payload when retries never converge, preventing unbounded internal retry cycles (`GHSA-76m6-pj3w-v7mf`).
=======
- Security/Exec: in non-default setups that manually add `sort` to `tools.exec.safeBins`, block `sort --compress-program` so allowlist-mode safe-bin checks cannot bypass approval. Thanks @tdjackey for reporting.
- Doctor/State integrity: only require/create the OAuth credentials directory when WhatsApp or pairing-backed channels are configured, and downgrade fresh-install missing-dir noise to an informational warning.
- Agents/Sanitization: stop rewriting billing-shaped assistant text outside explicit error context so normal replies about billing/credits/payment are preserved across messaging channels. (#17834, fixes #11359)
=======
### Fixes

>>>>>>> c3af00bdd (docs(changelog): split 2026.2.21 release entries)
=======
>>>>>>> f90360372 (docs(changelog): keep 2026.2.22 split from 2026.2.21)
=======
- Agents/Bootstrap: skip malformed bootstrap files with missing/invalid paths instead of crashing agent sessions; hooks using `filePath` (or non-string `path`) are skipped with a warning. (#22693, #22698) Thanks @arosstale.
>>>>>>> 3254c72d4 (Update CHANGELOG.md)
- Security/Agents: cap embedded Pi runner outer retry loop with a higher profile-aware dynamic limit (32-160 attempts) and return an explicit `retry_limit` error payload when retries never converge, preventing unbounded internal retry cycles (`GHSA-76m6-pj3w-v7mf`).
>>>>>>> c730d4dd7 (docs: clarify non-default scope for safeBins sort fix)
- Telegram: detect duplicate bot-token ownership across Telegram accounts at startup/status time, mark secondary accounts as not configured with an explicit fix message, and block duplicate account startup before polling to avoid endless `getUpdates` conflict loops.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 1bd3f01c1 (fix(telegram): guard duplicate bot token accounts)
=======
- Security/macOS app beta: harden `system.run` allowlist handling by evaluating shell chains per segment, treating control/expansion syntax as approval-required misses, and failing closed on unsafe parse cases. Default installs are unaffected unless `tools.exec.host` is explicitly enabled. This ships in the next npm release. Thanks @tdjackey for reporting.
>>>>>>> e371da38a (fix(macos): consolidate exec approval evaluation)
=======
>>>>>>> c3af00bdd (docs(changelog): split 2026.2.21 release entries)
- Agents/Tool images: include source filenames in `agents/tool-images` resize logs so compression events can be traced back to specific files.
- Providers/OAuth: harden Qwen and Chutes refresh handling by validating refresh response expiry values and preserving prior refresh tokens when providers return empty refresh token fields, with regression coverage for empty-token responses.
- Models/Kimi-Coding: add missing implicit provider template for `kimi-coding` with correct `anthropic-messages` API type and base URL, fixing 403 errors when using Kimi for Coding. (#22409)
>>>>>>> 7bd5c5d5a (docs(changelog): reorder unreleased fixes by user impact)
- Auto-reply/Tools: forward `senderIsOwner` through embedded queued/followup runner params so owner-only tools remain available for authorized senders. (#22296) thanks @hcoj.
- Discord: restore model picker back navigation when a provider is missing and document the Discord picker flow. (#21458) Thanks @pejmanjohn and @thewilloftheshadow.
- Memory/QMD: respect per-agent `memorySearch.enabled=false` during gateway QMD startup initialization, split multi-collection QMD searches into per-collection queries (`search`/`vsearch`/`query`) to avoid sparse-term drops, prefer collection-hinted doc resolution to avoid stale-hash collisions, retry boot updates on transient lock/timeout failures, skip `qmd embed` in BM25-only `search` mode (including `memory index --force`), and serialize embed runs globally with failure backoff to prevent CPU storms on multi-agent hosts. (#20581, #21590, #20513, #20001, #21266, #21583, #20346, #19493) Thanks @danielrevivo, @zanderkrause, @sunyan034-cmd, @tilleulenspiegel, @dae-oss, @adamlongcreativellc, @jonathanadams96, and @kiliansitel.
- Memory/Builtin: prevent automatic sync races with manager shutdown by skipping post-close sync starts and waiting for in-flight sync before closing SQLite, so `onSearch`/`onSessionStart` no longer fail with `database is not open` in ephemeral CLI flows. (#20556, #7464) Thanks @FuzzyTG and @henrybottter.
- Providers/Copilot: drop persisted assistant `thinking` blocks for Claude models (while preserving turn structure/tool blocks) so follow-up requests no longer fail on invalid `thinkingSignature` payloads. (#19459) Thanks @jackheuberger.
>>>>>>> 75d4f6d51 (docs: reorder and trim 2026.2.21 changelog entries)
- Providers/Copilot: add `claude-sonnet-4.6` and `claude-sonnet-4.5` to the default GitHub Copilot model catalog and add coverage for model-list/definition helpers. (#20270, fixes #20091) Thanks @Clawborn.
- Auto-reply/WebChat: avoid defaulting inbound runtime channel labels to unrelated providers (for example `whatsapp`) for webchat sessions so channel-specific formatting guidance stays accurate. (#21534) Thanks @lbo728.
- Status: include persisted `cacheRead`/`cacheWrite` in session summaries so compact `/status` output consistently shows cache hit percentages from real session data.
<<<<<<< HEAD
>>>>>>> 0692927cc (Changelog: note canvas auth hardening)
=======
>>>>>>> c3af00bdd (docs(changelog): split 2026.2.21 release entries)
- Heartbeat/Cron: restore interval heartbeat behavior so missing `HEARTBEAT.md` no longer suppresses runs (only effectively empty files skip), preserving prompt-driven and tagged-cron execution paths.
<<<<<<< HEAD
- Gateway/Pairing: tolerate legacy paired devices missing `roles`/`scopes` metadata in websocket upgrade checks and backfill metadata on reconnect. (#21447, fixes #21236) Thanks @joshavant.
<<<<<<< HEAD
>>>>>>> ffa7de046 (chore: add CHANGELOG entry)
=======
- Gateway/Pairing/CLI: align read-scope compatibility in pairing/device-token checks and add local `openclaw devices` fallback recovery for loopback `pairing required` deadlocks, with explicit fallback notice to unblock approval bootstrap flows. (#21616) Thanks @shakkernerd.
>>>>>>> 99db4c790 (Changelog: document pairing bootstrap recovery (#21616))
- Docker: pin base images to SHA256 digests in Docker builds to prevent mutable tag drift. (#7734) Thanks @coygeek.
<<<<<<< HEAD
=======
- Docker/Security: run E2E and install-sh test images as non-root by adding appuser directives. Thanks @thewilloftheshadow.
- Docker: run build steps as the `node` user and use `COPY --chown` to avoid recursive ownership changes, trimming image size and layer churn. Thanks @huntharo.
>>>>>>> 0f1b2ad96 (chore: Reduce app-specific docker image size by ~50% / ~900 MB (AI assisted) (#22019))
=======
- WhatsApp/Cron/Heartbeat: enforce allowlisted routing for implicit scheduled/system delivery by merging pairing-store + configured `allowFrom` recipients, selecting authorized recipients when last-route context points to a non-allowlisted chat, and preventing heartbeat fan-out to recent unauthorized chats.
- Heartbeat/Active hours: constrain active-hours `24` sentinel parsing to `24:00` in time validation so invalid values like `24:30` are rejected early. (#21410) thanks @adhitShet.
- Heartbeat: treat `activeHours` windows with identical `start`/`end` times as zero-width (always outside the window) instead of always-active. (#21408) thanks @adhitShet.
- CLI/Pairing: default `pairing list` and `pairing approve` to the sole available pairing channel when omitted, so TUI-only setups can recover from `pairing required` without guessing channel arguments. (#21527) Thanks @losts1.
- TUI/Pairing: show explicit pairing-required recovery guidance after gateway disconnects that return `pairing required`, including approval steps to unblock quickstart TUI hatching on fresh installs. (#21841) Thanks @nicolinux.
- TUI/Input: suppress duplicate backspace events arriving in the same input burst window so SSH sessions no longer delete two characters per backspace press in the composer. (#19318) Thanks @eheimer.
- TUI/Heartbeat: suppress heartbeat ACK/prompt noise in chat streaming when `showOk` is disabled, while still preserving non-ACK heartbeat alerts in final output. (#20228) Thanks @bhalliburton.
- TUI/History: cap chat-log component growth and prune stale render nodes/references so large default history loads no longer overflow render recursion with `RangeError: Maximum call stack size exceeded`. (#18068) Thanks @JaniJegoroff.
- Memory/QMD: diversify mixed-source search ranking when both session and memory collections are present so session transcript hits no longer crowd out durable memory-file matches in top results. (#19913) Thanks @alextempr.
- Memory/Tools: return explicit `unavailable` warnings/actions from `memory_search` when embedding/provider failures occur (including quota exhaustion), so disabled memory does not look like an empty recall result. (#21894) Thanks @XBS9.
- Session/Startup: require the `/new` and `/reset` greeting path to run Session Startup file-reading instructions before responding, so daily memory startup context is not skipped on fresh-session greetings. (#22338) Thanks @armstrong-pv.
- Auth/Onboarding: align OAuth profile-id config mapping with stored credential IDs for OpenAI Codex and Chutes flows, preventing `provider:default` mismatches when OAuth returns email-scoped credentials. (#12692) thanks @mudrii.
>>>>>>> 75d4f6d51 (docs: reorder and trim 2026.2.21 changelog entries)
- Provider/HTTP: treat HTTP 503 as failover-eligible for LLM provider errors. (#21086) Thanks @Protocol-zero-0.
- Slack: pass `recipient_team_id` / `recipient_user_id` through Slack native streaming calls so `chat.startStream`/`appendStream`/`stopStream` work reliably across DMs and Slack Connect setups, and disable block streaming when native streaming is active. (#20988) Thanks @Dithilli. Earlier recipient-ID groundwork was contributed in #20377 by @AsserAl1012.
<<<<<<< HEAD
=======
- CLI/Config: add canonical `--strict-json` parsing for `config set` and keep `--json` as a legacy alias to reduce help/behavior drift. (#21332) thanks @adhitShet.
- CLI: keep `openclaw -v` as a root-only version alias so subcommand `-v, --verbose` flags (for example ACP/hooks/skills) are no longer intercepted globally. (#21303) thanks @adhitShet.
- Memory: return empty snippets when `memory_get`/QMD read files that have not been created yet, and harden memory indexing/session helpers against ENOENT races so missing Markdown no longer crashes tools. (#20680) Thanks @pahdo.
- Telegram/Streaming: always clean up draft previews even when dispatch throws before fallback handling, preventing orphaned preview messages during failed runs. (#19041) thanks @mudrii.
- Telegram/Streaming: split reasoning and answer draft preview lanes to prevent cross-lane overwrites, and ignore literal `<think>` tags inside inline/fenced code snippets so sample markup is not misrouted as reasoning. (#20774) Thanks @obviyus.
- Telegram/Status reactions: refresh stall timers on repeated phase updates and honor ack-reaction scope when lifecycle reactions are enabled, preventing false stall emojis and unwanted group reactions. Thanks @wolly-tundracube and @thewilloftheshadow.
<<<<<<< HEAD
- Discord/Streaming: apply `replyToMode: first` only to the first Discord chunk so block-streamed replies do not spam mention pings. (#20726) Thanks @thewilloftheshadow.
>>>>>>> 68fd8ed86 (clankers are dumb)

- Discord/Gateway: handle close code 4014 (missing privileged gateway intents) without crashing the gateway. Thanks @thewilloftheshadow.
- Security/Net: strip sensitive headers (`Authorization`, `Proxy-Authorization`, `Cookie`, `Cookie2`) on cross-origin redirects in `fetchWithSsrFGuard` to prevent credential forwarding across origin boundaries. (#20313) Thanks @afurm.
<<<<<<< HEAD
>>>>>>> 6cdcb5904 (chore: update changelog for merged fixes 7734 and 21086 (#21254))
=======
- Security/Systemd: reject CR/LF in systemd unit environment values and fix argument escaping so generated units cannot be injected with extra directives. Thanks @thewilloftheshadow.
- Security/Tools: add per-wrapper random IDs to untrusted-content markers from `wrapExternalContent`/`wrapWebContent`, preventing marker spoofing from escaping content boundaries. (#19009) Thanks @Whoaa512.
- Skills/Security: sanitize skill env overrides to block unsafe runtime injection variables and only allow sensitive keys when declared in skill metadata, with warnings for suspicious values. Thanks @thewilloftheshadow.
- Skills/SonosCLI: add troubleshooting guidance for `sonos discover` failures on macOS direct mode (`sendto: no route to host`) and sandbox network restrictions (`bind: operation not permitted`). (#21316) Thanks @huntharo.
>>>>>>> 02ac5b59d (Skills: add SonosCLI troubleshooting guidance (openclaw#21316) thanks @huntharo)
- Auto-reply/Runner: emit `onAgentRunStart` only after agent lifecycle or tool activity begins (and only once per run), so fallback preflight errors no longer mark runs as started. (#21165) Thanks @shakkernerd.
- Auto-reply/Prompt caching: restore prefix-cache stability by keeping inbound system metadata session-stable and moving per-message IDs (`message_id`, `message_id_full`, `reply_to_id`, `sender_id`) into untrusted conversation context. (#20597) Thanks @anisoptera.
- iOS/Security: force `https://` for non-loopback manual gateway hosts during iOS onboarding to block insecure remote transport URLs. (#21969) Thanks @mbelinky.
- Shared/Security: reject insecure deep links that use `ws://` non-loopback gateway URLs to prevent plaintext remote websocket configuration. (#21970) Thanks @mbelinky.
- macOS/Security: reject non-loopback `ws://` remote gateway URLs in macOS remote config to block insecure plaintext websocket endpoints. (#21971) Thanks @mbelinky.
<<<<<<< HEAD
=======
- Browser/Security: block upload path symlink escapes so browser upload sources cannot traverse outside the allowed workspace via symlinked paths. (#21972) Thanks @mbelinky.
=======
- Telegram/Status reactions: keep lifecycle reactions active when available-reactions lookup fails by falling back to unrestricted variant selection instead of suppressing reaction updates. (#22380) thanks @obviyus.
- Discord/Streaming: apply `replyToMode: first` only to the first Discord chunk so block-streamed replies do not spam mention pings. (#20726) Thanks @thewilloftheshadow for the report.
- Discord/Components: map DM channel targets back to user-scoped component sessions so button/select interactions stay in the main DM session. Thanks @thewilloftheshadow.
- Discord/Allowlist: lazy-load guild lists when resolving Discord user allowlists so ID-only entries resolve even if guild fetch fails. (#20208) Thanks @zhangjunmengyang.
- Discord/Gateway: handle close code 4014 (missing privileged gateway intents) without crashing the gateway. Thanks @thewilloftheshadow.
- Discord: ingest inbound stickers as media so sticker-only messages and forwarded stickers are visible to agents. Thanks @thewilloftheshadow.
- Auto-reply/Runner: emit `onAgentRunStart` only after agent lifecycle or tool activity begins (and only once per run), so fallback preflight errors no longer mark runs as started. (#21165) Thanks @shakkernerd.
- Auto-reply/Tool results: serialize tool-result delivery and keep the delivery chain progressing after individual failures so concurrent tool outputs preserve user-visible ordering. (#21231) thanks @ahdernasr.
- Auto-reply/Prompt caching: restore prefix-cache stability by keeping inbound system metadata session-stable and moving per-message IDs (`message_id`, `message_id_full`, `reply_to_id`, `sender_id`) into untrusted conversation context. (#20597) Thanks @anisoptera.
>>>>>>> 75d4f6d51 (docs: reorder and trim 2026.2.21 changelog entries)
- iOS/Watch: add actionable watch approval/reject controls and quick-reply actions so watch-originated approvals and responses can be sent directly from notification flows. (#21996) Thanks @mbelinky.
<<<<<<< HEAD
>>>>>>> 738b01162 (iOS/watch: add actionable watch approvals and quick replies (#21996))
=======
- iOS/Watch: refresh iOS and watch app icon assets with the lobster icon set to keep phone/watch branding aligned. (#21997) Thanks @mbelinky.
>>>>>>> fd8c6d1f7 (iOS: refresh phone/watch app icons with lobster assets (#21997))
- CLI/Onboarding: fix Anthropic-compatible custom provider verification by normalizing base URLs to avoid duplicate `/v1` paths during setup checks. (#21336) Thanks @17jmumford.
<<<<<<< HEAD
=======
- iOS/Gateway/Tools: prefer uniquely connected node matches when duplicate display names exist, surface actionable `nodes invoke` pairing-required guidance with request IDs, and refresh active iOS gateway registration after location-capability setting changes so capability updates apply immediately. (#22120) thanks @mbelinky.
- Gateway/Auth: require `gateway.trustedProxies` to include a loopback proxy address when `auth.mode="trusted-proxy"` and `bind="loopback"`, preventing same-host proxy misconfiguration from silently blocking auth. (#22082, follow-up to #20097) thanks @mbelinky.
- Gateway/Auth: allow trusted-proxy mode with loopback bind for same-host reverse-proxy deployments, while still requiring configured `gateway.trustedProxies`. (#20097) thanks @xinhuagu.
- Gateway/Auth: allow authenticated clients across roles/scopes to call `health` while preserving role and scope enforcement for non-health methods. (#19699) thanks @Nachx639.
- Gateway/Hooks: include transform export name in hook-transform cache keys so distinct exports from the same module do not reuse the wrong cached transform function. (#13855) thanks @mcaxtr.
- Gateway/Control UI: return 404 for missing static-asset paths instead of serving SPA fallback HTML, while preserving client-route fallback behavior for extensionless and non-asset dotted paths. (#12060) thanks @mcaxtr.
- Gateway/Pairing: prevent device-token rotate scope escalation by enforcing an approved-scope baseline, preserving approved scopes across metadata updates, and rejecting rotate requests that exceed approved role scope implications. (#20703) thanks @coygeek.
- Gateway/Pairing: clear persisted paired-device state when the gateway client closes with `device token mismatch` (`1008`) so reconnect flows can cleanly re-enter pairing. (#22071) Thanks @mbelinky.
- Gateway/Config: allow `gateway.customBindHost` in strict config validation when `gateway.bind="custom"` so valid custom bind-host configurations no longer fail startup. (#20318, fixes #20289) Thanks @MisterGuy420.
- Gateway/Pairing: tolerate legacy paired devices missing `roles`/`scopes` metadata in websocket upgrade checks and backfill metadata on reconnect. (#21447, fixes #21236) Thanks @joshavant.
- Gateway/Pairing/CLI: align read-scope compatibility in pairing/device-token checks and add local `openclaw devices` fallback recovery for loopback `pairing required` deadlocks, with explicit fallback notice to unblock approval bootstrap flows. (#21616) Thanks @shakkernerd.
- Cron: honor `cron.maxConcurrentRuns` in the timer loop so due jobs can execute up to the configured parallelism instead of always running serially. (#11595) Thanks @Takhoffman.
- Agents/Compaction: restore embedded compaction safeguard/context-pruning extension loading in production by wiring bundled extension factories into the resource loader instead of runtime file-path resolution. (#22349) Thanks @Glucksberg.
- Agents/Subagents: restore announce-chain delivery to agent injection, defer nested announce output until descendant follow-up content is ready, and prevent descendant deferrals from consuming announce retry budget so deep chains do not drop final completions. (#22223) Thanks @tyler6204.
- Agents/System Prompt: label allowlisted senders as authorized senders to avoid implying ownership. Thanks @thewilloftheshadow.
- Agents/Tool display: fix exec cwd suffix inference so `pushd ... && popd ... && <command>` does not keep stale `(in <dir>)` context in summaries. (#21925) Thanks @Lukavyi.
- Tools/web_search: handle xAI Responses API payloads that emit top-level `output_text` blocks (without a `message` wrapper) so Grok web_search no longer returns `No response` for those results. (#20508) Thanks @echoVic.
- Agents/Failover: treat non-default override runs as direct fallback-to-configured-primary (skip configured fallback chain), normalize default-model detection for provider casing/whitespace, and add regression coverage for override/auth error paths. (#18820) Thanks @Glucksberg.
- Docker/Build: include `ownerDisplay` in `CommandsSchema` object-level defaults so Docker `pnpm build` no longer fails with `TS2769` during plugin SDK d.ts generation. (#22558) Thanks @obviyus.
- Docker/Browser: install Playwright Chromium into `/home/node/.cache/ms-playwright` and set `node:node` ownership so browser binaries are available to the runtime user in browser-enabled images. (#22585) thanks @obviyus.
- Hooks/Session memory: trigger bundled `session-memory` persistence on both `/new` and `/reset` so reset flows no longer skip markdown transcript capture before archival. (#21382) Thanks @mofesolapaul.
- Dependencies/Agents: bump embedded Pi SDK packages (`@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`) to `0.54.0`. (#21578) Thanks @Takhoffman.
- Config/Agents: expose Pi compaction tuning values `agents.defaults.compaction.reserveTokens` and `agents.defaults.compaction.keepRecentTokens` in config schema/types and apply them in embedded Pi runner settings overrides with floor enforcement via `reserveTokensFloor`. (#21568) Thanks @Takhoffman.
- Docker: pin base images to SHA256 digests in Docker builds to prevent mutable tag drift. (#7734) Thanks @coygeek.
- Docker: run build steps as the `node` user and use `COPY --chown` to avoid recursive ownership changes, trimming image size and layer churn. Thanks @huntharo.
- Config/Memory: restore schema help/label metadata for hybrid `mmr` and `temporalDecay` settings so configuration surfaces show correct names and guidance. (#18786) Thanks @rodrigouroz.
- Skills/SonosCLI: add troubleshooting guidance for `sonos discover` failures on macOS direct mode (`sendto: no route to host`) and sandbox network restrictions (`bind: operation not permitted`). (#21316) Thanks @huntharo.
- macOS/Build: default release packaging to `BUNDLE_ID=ai.openclaw.mac` in `scripts/package-mac-dist.sh`, so Sparkle feed URL is retained and auto-update no longer fails with an empty appcast feed. (#19750) thanks @loganprit.
- Signal/Outbound: preserve case for Base64 group IDs during outbound target normalization so cross-context routing and policy checks no longer break when group IDs include uppercase characters. (#5578) Thanks @heyhudson.
- Anthropic/Agents: preserve required pi-ai default OAuth beta headers when `context1m` injects `anthropic-beta`, preventing 401 auth failures for `sk-ant-oat-*` tokens. (#19789, fixes #19769) Thanks @minupla.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 75d4f6d51 (docs: reorder and trim 2026.2.21 changelog entries)
=======
- Security/Exec: block unquoted heredoc body expansion tokens in shell allowlist analysis, reject unterminated heredocs, and require explicit approval for allowlisted heredoc execution on gateway hosts to prevent heredoc substitution allowlist bypass. This ships in the next npm release. Thanks @torturado for reporting.
- WhatsApp/Security: enforce allowlist JID authorization for reaction actions so authenticated callers cannot target non-allowlisted chats by forging `chatJid` + valid `messageId` pairs. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
- ACP/Security: escape control and delimiter characters in ACP `resource_link` title/URI metadata before prompt interpolation to prevent metadata-driven prompt injection through resource links. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
- TTS/Security: make model-driven provider switching opt-in by default (`messages.tts.modelOverrides.allowProvider=false` unless explicitly enabled), while keeping voice/style overrides available, to reduce prompt-injection-driven provider hops and unexpected TTS cost escalation. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
- Security/Agents: keep overflow compaction retry budgeting global across tool-result truncation recovery so successful truncation cannot reset the overflow retry counter and amplify retry/cost cycles. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
=======
- Security/Exec: block unquoted heredoc body expansion tokens in shell allowlist analysis, reject unterminated heredocs, and require explicit approval for allowlisted heredoc execution on gateway hosts to prevent heredoc substitution allowlist bypass. Thanks @torturado for reporting.
<<<<<<< HEAD
=======
- macOS/Security: evaluate `system.run` allowlists per shell segment in macOS node runtime and companion exec host (including chained shell operators), fail closed on shell/process substitution parsing, and require explicit approval on unsafe parse cases to prevent allowlist bypass via `rawCommand` chaining. Thanks @tdjackey for reporting.
>>>>>>> c3af00bdd (docs(changelog): split 2026.2.21 release entries)
- WhatsApp/Security: enforce allowlist JID authorization for reaction actions so authenticated callers cannot target non-allowlisted chats by forging `chatJid` + valid `messageId` pairs. Thanks @aether-ai-agent for reporting.
- ACP/Security: escape control and delimiter characters in ACP `resource_link` title/URI metadata before prompt interpolation to prevent metadata-driven prompt injection through resource links. Thanks @aether-ai-agent for reporting.
- TTS/Security: make model-driven provider switching opt-in by default (`messages.tts.modelOverrides.allowProvider=false` unless explicitly enabled), while keeping voice/style overrides available, to reduce prompt-injection-driven provider hops and unexpected TTS cost escalation. Thanks @aether-ai-agent for reporting.
- Security/Agents: keep overflow compaction retry budgeting global across tool-result truncation recovery so successful truncation cannot reset the overflow retry counter and amplify retry/cost cycles. Thanks @aether-ai-agent for reporting.
>>>>>>> 5da03e622 (fix(macos): harden exec allowlist shell-chain checks)
- BlueBubbles/Security: require webhook token authentication for all BlueBubbles webhook requests (including loopback/proxied setups), removing passwordless webhook fallback behavior. Thanks @zpbrent.
- iOS/Security: force `https://` for non-loopback manual gateway hosts during iOS onboarding to block insecure remote transport URLs. (#21969) Thanks @mbelinky.
- Gateway/Security: remove shared-IP fallback for canvas endpoints and require token or session capability for canvas access. Thanks @thewilloftheshadow.
- Gateway/Security: require secure context and paired-device checks for Control UI auth even when `gateway.controlUi.allowInsecureAuth` is set, and align audit messaging with the hardened behavior. (#20684) Thanks @coygeek and @Vasco0x4 for reporting.
- Gateway/Security: scope tokenless Tailscale forwarded-header auth to Control UI websocket auth only, so HTTP gateway routes still require token/password even on trusted hosts. Thanks @zpbrent for reporting.
- Docker/Security: run E2E and install-sh test images as non-root by adding appuser directives. Thanks @thewilloftheshadow.
- Skills/Security: sanitize skill env overrides to block unsafe runtime injection variables and only allow sensitive keys when declared in skill metadata, with warnings for suspicious values. Thanks @thewilloftheshadow.
- Security/Commands: block prototype-key injection in runtime `/debug` overrides and require own-property checks for gated command flags (`bash`, `config`, `debug`) so inherited prototype values cannot enable privileged commands. Thanks @tdjackey for reporting.
- Security/Browser: block non-network browser navigation protocols (including `file:`, `data:`, and `javascript:`) while preserving `about:blank`, preventing local file reads via browser tool navigation. Thanks @q1uf3ng for reporting.
- Security/Exec: block shell startup-file env injection (`BASH_ENV`, `ENV`, `BASH_FUNC_*`, `LD_*`, `DYLD_*`) across config env ingestion, node-host inherited environment sanitization, and macOS exec host runtime to prevent pre-command execution from attacker-controlled environment variables. Thanks @tdjackey.
- Security/Exec (Windows): canonicalize `cmd.exe /c` command text across validation, approval binding, and audit/event rendering to prevent trailing-argument approval mismatches in `system.run`. Thanks @tdjackey for reporting.
- Security/Gateway/Hooks: block `__proto__`, `constructor`, and `prototype` traversal in webhook template path resolution to prevent prototype-chain payload data leakage in `messageTemplate` rendering. (#22213) Thanks @SleuthCo.
- Security/OpenClawKit/UI: prevent injected inbound user context metadata blocks from leaking into chat history in TUI, webchat, and macOS surfaces by stripping all untrusted metadata prefixes at display boundaries. (#22142) Thanks @Mellowambience, @vincentkoc.
- Security/OpenClawKit/UI: strip inbound metadata blocks from user messages in TUI rendering while preserving user-authored content. (#22345) Thanks @kansodata, @vincentkoc.
- Security/OpenClawKit/UI: prevent inbound metadata leaks and reply-tag streaming artifacts in TUI rendering by stripping untrusted metadata prefixes at display boundaries. (#22346) Thanks @akramcodez, @vincentkoc.
- Security/Agents: restrict local MEDIA tool attachments to core tools and the OpenClaw temp root to prevent untrusted MCP tool file exfiltration. Thanks @NucleiAv and @thewilloftheshadow.
- Security/Net: strip sensitive headers (`Authorization`, `Proxy-Authorization`, `Cookie`, `Cookie2`) on cross-origin redirects in `fetchWithSsrFGuard` to prevent credential forwarding across origin boundaries. (#20313) Thanks @afurm.
- Security/Systemd: reject CR/LF in systemd unit environment values and fix argument escaping so generated units cannot be injected with extra directives. Thanks @thewilloftheshadow.
- Security/Tools: add per-wrapper random IDs to untrusted-content markers from `wrapExternalContent`/`wrapWebContent`, preventing marker spoofing from escaping content boundaries. (#19009) Thanks @Whoaa512.
- Shared/Security: reject insecure deep links that use `ws://` non-loopback gateway URLs to prevent plaintext remote websocket configuration. (#21970) Thanks @mbelinky.
- macOS/Security: reject non-loopback `ws://` remote gateway URLs in macOS remote config to block insecure plaintext websocket endpoints. (#21971) Thanks @mbelinky.
- Browser/Security: block upload path symlink escapes so browser upload sources cannot traverse outside the allowed workspace via symlinked paths. (#21972) Thanks @mbelinky.
- Security/Dependencies: bump transitive `hono` usage to `4.11.10` to incorporate timing-safe authentication comparison hardening for `basicAuth`/`bearerAuth` (`GHSA-gq3j-xvxp-8hrf`). Thanks @vincentkoc.
- Security/Gateway: parse `X-Forwarded-For` with trust-preserving semantics when requests come from configured trusted proxies, preventing proxy-chain spoofing from influencing client IP classification and rate-limit identity. Thanks @AnthonyDiSanti and @vincentkoc.
<<<<<<< HEAD
- Security/Sandbox: remove default `--no-sandbox` for the browser container entrypoint, add explicit opt-in via `OPENCLAW_BROWSER_NO_SANDBOX` / `CLAWDBOT_BROWSER_NO_SANDBOX`, and add security-audit checks for stale/missing sandbox browser Docker hash labels. This ships in the next npm release. Thanks @TerminalsandCoffee and @vincentkoc.
- Security/Sandbox Browser: require VNC password auth for noVNC observer sessions in the sandbox browser entrypoint, plumb per-container noVNC passwords from runtime, and emit short-lived noVNC observer token URLs while keeping loopback-only host port publishing. This ships in the next npm release. Thanks @TerminalsandCoffee for reporting.
- Security/Sandbox Browser: default browser sandbox containers to a dedicated Docker network (`openclaw-sandbox-browser`), add optional CDP ingress source-range restrictions, auto-create missing dedicated networks, and warn in `openclaw security --audit` when browser sandboxing runs on bridge without source-range limits. This ships in the next npm release. Thanks @TerminalsandCoffee for reporting.
>>>>>>> 7bd5c5d5a (docs(changelog): reorder unreleased fixes by user impact)
=======
- Security/Sandbox: remove default `--no-sandbox` for the browser container entrypoint, add explicit opt-in via `OPENCLAW_BROWSER_NO_SANDBOX` / `CLAWDBOT_BROWSER_NO_SANDBOX`, and add security-audit checks for stale/missing sandbox browser Docker hash labels. Thanks @TerminalsandCoffee and @vincentkoc.
- Security/Sandbox Browser: require VNC password auth for noVNC observer sessions in the sandbox browser entrypoint, plumb per-container noVNC passwords from runtime, and emit short-lived noVNC observer token URLs while keeping loopback-only host port publishing. Thanks @TerminalsandCoffee for reporting.
- Security/Sandbox Browser: default browser sandbox containers to a dedicated Docker network (`openclaw-sandbox-browser`), add optional CDP ingress source-range restrictions, auto-create missing dedicated networks, and warn in `openclaw security --audit` when browser sandboxing runs on bridge without source-range limits. Thanks @TerminalsandCoffee for reporting.
>>>>>>> 5da03e622 (fix(macos): harden exec allowlist shell-chain checks)

## 2026.2.19

### Changes

- iOS/Watch: add an Apple Watch companion MVP with watch inbox UI, watch notification relay handling, and gateway command surfaces for watch status/send flows. (#20054) Thanks @mbelinky.
>>>>>>> 45b54d90a (Changelog: add auto-reply run-start fix (#21165) (thanks @shakkernerd))
- iOS/Gateway: wake disconnected iOS nodes via APNs before `nodes.invoke` and auto-reconnect gateway sessions on silent push wake to reduce invoke failures while the app is backgrounded. (#20332) Thanks @mbelinky.
- Dev tooling: align `oxfmt` local/CI formatting behavior. (#12579) Thanks @vincentkoc.
>>>>>>> 267bb3c81 (changelog: backfill PR release-note entries (#20839))
- iOS/APNs: add push registration and notification-signing configuration for node delivery. (#20308) Thanks @mbelinky.
- Gateway/APNs: add a push-test pipeline for APNs delivery validation in gateway flows. (#20307) Thanks @mbelinky.
>>>>>>> c2d12b7e3 (iOS: add APNs registration and notification signing config (#20308))
- iOS/Watch: add an Apple Watch companion MVP with watch inbox UI, watch notification relay handling, and gateway command surfaces for watch status/send flows. (#20054) Thanks @mbelinky.
- Gateway/CLI: add paired-device hygiene flows with `device.pair.remove`, plus `openclaw devices remove` and guarded `openclaw devices clear --yes [--pending]` commands for removing paired entries and optionally rejecting pending requests. (#20057) Thanks @mbelinky.
- Skills: harden coding-agent skill guidance by removing shell-command examples that interpolate untrusted issue text directly into command strings.

>>>>>>> 797a47c3c (docs: harden coding-agent skill guidance example)
### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
- Sandbox/Security: block dangerous sandbox Docker config (bind mounts, host networking, unconfined seccomp/apparmor) to prevent container escape via config injection. Thanks @aether-ai-agent.
- Control UI: prevent stored XSS via assistant name/avatar by removing inline script injection, serving bootstrap config as JSON, and enforcing `script-src 'self'`. Thanks @Adam55A-code.
- Web UI/Agents: hide `BOOTSTRAP.md` in the Agents Files list after onboarding is completed, avoiding confusing missing-file warnings for completed workspaces. (#17491) Thanks @gumadeiras.
- Telegram: omit `message_thread_id` for DM sends/draft previews and keep forum-topic handling (`id=1` general omitted, non-general kept), preventing DM failures with `400 Bad Request: message thread not found`. (#10942) Thanks @garnetlyx.
- Subagents/Models: preserve `agents.defaults.model.fallbacks` when subagent sessions carry a model override, so subagent runs fail over to configured fallback models instead of retrying only the overridden primary model.
=======
- Subagents: nested sub-agents (sub-sub-agents) with configurable depth. Set `agents.defaults.subagents.maxSpawnDepth: 2` to allow sub-agents to spawn their own children. Includes `maxChildrenPerAgent` limit (default 5), depth-aware tool policy, and proper announce chain routing. (#14447) Thanks @tyler6204.
- Plugins: expose `llm_input` and `llm_output` hook payloads so extensions can observe prompt/input context and model output usage details. (#16724) Thanks @SecondThread.
- Slack/Discord/Telegram: add per-channel ack reaction overrides (account/channel-level) to support platform-specific emoji formats. (#17092) Thanks @zerone0x.
=======
=======
- Cron/Gateway: separate per-job webhook delivery (`delivery.mode = "webhook"`) from announce delivery, enforce valid HTTP(S) webhook URLs, and keep a temporary legacy `notify + cron.webhook` fallback for stored jobs. (#17901) Thanks @advaitpaliwal.
<<<<<<< HEAD
=======
- iOS/Talk: add a `Voice Directive Hint` toggle for Talk Mode prompts so users can disable ElevenLabs voice-switching instructions to save tokens when not needed. (#18250) Thanks @zeulewan.
=======
>>>>>>> 21e5c0ce5 (chore: reorder latest changelog bullets by user impact)
=======
=======
- Skills: refine skill-description routing boundaries with explicit "Use when"/"NOT for" guidance for coding-agent/github/weather, and clarify PTY/browser fallback wording. (#14577) Thanks @DylanWoodAkers.
>>>>>>> cfd384ead (feat(skills): improve descriptions with routing logic (#14577))
- Agents/Subagents: add an accepted response note for `sessions_spawn` explaining polling subagents are disabled for one-off calls. Thanks @tyler6204.
- Agents/Subagents: prefix spawned subagent task messages with context to preserve source information in downstream handling. Thanks @tyler6204.
>>>>>>> 81c5c02e5 (changelog: add @tyler6204 credit for today's entries)
- iOS/Talk: add a `Background Listening` toggle that keeps Talk Mode active while the app is backgrounded (off by default for battery safety). Thanks @zeulewan.
- iOS/Talk: harden barge-in behavior by disabling interrupt-on-speech when output route is built-in speaker/receiver, reducing false interruptions from local TTS bleed-through. Thanks @zeulewan.
- iOS/Talk: add a `Voice Directive Hint` toggle for Talk Mode prompts so users can disable ElevenLabs voice-switching instructions to save tokens when not needed. (#18250) Thanks @zeulewan.
=======
=======
=======
=======
=======
=======
=======
=======
=======
=======
=======
=======
=======
>>>>>>> fbdae4998 (Changelog: fix unreleased thanks attribution placement)
- Agents/Streaming: keep assistant partial streaming active during reasoning streams, handle native `thinking_*` stream events consistently, dedupe mixed reasoning-end signals, and clear stale mutating tool errors after same-target retry success. (#20635) Thanks @obviyus.
- iOS/Chat: use a dedicated iOS chat session key for ChatSheet routing to avoid cross-client session collisions with main-session traffic. (#21139) thanks @mbelinky.
- iOS/Chat: auto-resync chat history after reconnect sequence gaps, clear stale pending runs, and avoid dead-end manual refresh errors after transient disconnects. (#21135) thanks @mbelinky.
- iOS/Screen: move `WKWebView` lifecycle ownership into `ScreenWebView` coordinator and explicit attach/detach flow to reduce gesture/lifecycle crash risk (`__NSArrayM insertObject:atIndex:` paths) during screen tab updates. (#20366) Thanks @ngutman.
- iOS/Onboarding: prevent pairing-status flicker during auto-resume by keeping resumed state transitions stable. (#20310) Thanks @mbelinky.
- iOS/Onboarding: stabilize pairing and reconnect behavior by resetting stale pairing request state on manual retry, disconnecting both operator and node gateways on operator failure, and avoiding duplicate pairing loops from operator transport identity attachment. (#20056) Thanks @mbelinky.
- iOS/Signing: restore local auto-selected signing-team overrides during iOS project generation by wiring `.local-signing.xcconfig` into the active signing config and emitting `OPENCLAW_DEVELOPMENT_TEAM` in local signing setup. (#19993) Thanks @ngutman.
- Telegram: unify message-like inbound handling so `message` and `channel_post` share the same dedupe/access/media pipeline and remain behaviorally consistent. (#20591) Thanks @obviyus.
- Telegram/Agents: gate exec/bash tool-failure warnings behind verbose mode so default Telegram replies stay clean while verbose sessions still surface diagnostics. (#20560) Thanks @obviyus.
- Telegram/Cron/Heartbeat: honor explicit Telegram topic targets in cron and heartbeat delivery (`<chatId>:topic:<threadId>`) so scheduled sends land in the configured topic instead of the last active thread. (#19367) Thanks @Lukavyi.
- Gateway/Daemon: forward `TMPDIR` into installed service environments so macOS LaunchAgent gateway runs can open SQLite temp/journal files reliably instead of failing with `SQLITE_CANTOPEN`. (#20512) Thanks @Clawborn.
- Agents/Billing: include the active model that produced a billing error in user-facing billing messages (for example, `OpenAI (gpt-5.3)`) across payload, failover, and lifecycle error paths, so users can identify exactly which key needs credits. (#20510) Thanks @echoVic.
- Gateway/TUI: honor `agents.defaults.blockStreamingDefault` for `chat.send` by removing the hardcoded block-streaming disable override, so replies can use configured block-mode delivery. (#19693) Thanks @neipor.
- UI/Sessions: accept the canonical main session-key alias in Chat UI flows so main-session routing stays consistent. (#20311) Thanks @mbelinky.
- OpenClawKit/Protocol: preserve JSON boolean literals (`true`/`false`) when bridging through `AnyCodable` so Apple client RPC params no longer re-encode booleans as `1`/`0`. Thanks @mbelinky.
- Commands/Doctor: skip embedding-provider warnings when `memory.backend` is `qmd`, because QMD manages embeddings internally and does not require `memorySearch` providers. (#17263) Thanks @miloudbelarebia.
- Canvas/A2UI: improve bundled-asset resolution and empty-state handling so UI fallbacks render reliably. (#20312) Thanks @mbelinky.
- Commands/Doctor: avoid rewriting invalid configs with new `gateway.auth.token` defaults during repair and only write when real config changes are detected, preventing accidental token duplication and backup churn.
- Gateway/Auth: default unresolved gateway auth to token mode with startup auto-generation/persistence of `gateway.auth.token`, while allowing explicit `gateway.auth.mode: "none"` for intentional open loopback setups. (#20686) thanks @gumadeiras.
- Channels/Matrix: fix mention detection for `formatted_body` Matrix-to links by handling matrix.to mention formats consistently. (#16941) Thanks @zerone0x.
- Heartbeat/Cron: skip interval heartbeats when `HEARTBEAT.md` is missing or empty and no tagged cron events are queued, while preserving cron-event fallback for queued tagged reminders. (#20461) thanks @vikpos.
- Browser/Relay: reuse an already-running extension relay when the relay port is occupied by another OpenClaw process, while still failing on non-relay port collisions to avoid masking unrelated listeners. (#20035) Thanks @mbelinky.
- Scripts: update clawdock helper command support to include `docker-compose.extra.yml` where available. (#17094) Thanks @zerone0x.
- Lobster/Config: remove Lobster executable-path overrides (`lobsterPath`), require PATH-based execution, and add focused Windows wrapper-resolution tests to keep shell-free behavior stable.
- Gateway/WebChat: block `sessions.patch` and `sessions.delete` for WebChat clients so session-store mutations stay restricted to non-WebChat operator flows. Thanks @allsmog for reporting.
- Gateway: clarify launchctl GUI domain bootstrap failure on macOS. (#13795) Thanks @vincentkoc.
- Lobster/CI: fix flaky test Windows cmd shim script resolution. (#20833) Thanks @vincentkoc.
- Browser/Relay: require gateway-token auth on both `/extension` and `/cdp`, and align Chrome extension setup to use a single `gateway.auth.token` input for relay authentication. Thanks @tdjackey for reporting.
- Gateway/Hooks: run BOOT.md startup checks per configured agent scope, including per-agent session-key resolution, startup-hook regression coverage, and non-success boot outcome logging for diagnosability. (#20569) thanks @mcaxtr.
- Protocol/Apple: regenerate Swift gateway models for `push.test` so `pnpm protocol:check` stays green on main. Thanks @mbelinky.
- Sandbox/Registry: serialize container and browser registry writes with shared file locks and atomic replacement to prevent lost updates and delete rollback races from desyncing `sandbox list`, `prune`, and `recreate --all`. Thanks @kexinoh.
- OTEL/diagnostics-otel: complete OpenTelemetry v2 API migration. (#12897) Thanks @vincentkoc.
- Cron/Webhooks: protect cron webhook POST delivery with SSRF-guarded outbound fetch (`fetchWithSsrFGuard`) to block private/metadata destinations before request dispatch. Thanks @Adam55A-code.
>>>>>>> 42d11a3ec (iOS: auto-resync chat after reconnect gaps (#21135))
- Security/Voice Call: harden `voice-call` telephony TTS override merging by blocking unsafe deep-merge keys (`__proto__`, `prototype`, `constructor`) and add regression coverage for top-level and nested prototype-pollution payloads.
<<<<<<< HEAD
- Security/Windows Daemon: escape and quote Scheduled Task environment assignments when generating `gateway.cmd` (`set "KEY=VALUE"`), preventing command injection from config-provided env vars. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Gateway/Canvas: replace shared-IP fallback auth with node-scoped session capability URLs for `/__openclaw__/canvas/*` and `/__openclaw__/a2ui/*`, fail closed when trusted-proxy requests omit forwarded client headers, and add IPv6/proxy-header regression coverage. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
=======
- Security/Windows Daemon: harden Scheduled Task `gateway.cmd` generation by quoting cmd metacharacter arguments, escaping `%`/`!` expansions, and rejecting CR/LF in arguments, descriptions, and environment assignments (`set "KEY=VALUE"`), preventing command injection in Windows daemon startup scripts. Thanks @tdjackey for reporting.
- Security/Gateway/Canvas: replace shared-IP fallback auth with node-scoped session capability URLs for `/__openclaw__/canvas/*` and `/__openclaw__/a2ui/*`, fail closed when trusted-proxy requests omit forwarded client headers, and add IPv6/proxy-header regression coverage. Thanks @aether-ai-agent for reporting.
>>>>>>> 5da03e622 (fix(macos): harden exec allowlist shell-chain checks)
- Security/Net: enforce strict dotted-decimal IPv4 literals in SSRF checks and fail closed on unsupported legacy forms (octal/hex/short/packed, for example `0177.0.0.1`, `127.1`, `2130706433`) before DNS lookup.
- Security/Discord: enforce trusted-sender guild permission checks for moderation actions (`timeout`, `kick`, `ban`) and ignore untrusted `senderUserId` params to prevent privilege escalation in tool-driven flows. Thanks @aether-ai-agent for reporting.
- Security/ACP+Exec: add `openclaw acp --token-file/--password-file` secret-file support (with inline secret flag warnings), redact ACP working-directory prefixes to `~` home-relative paths, constrain exec script preflight file inspection to the effective `workdir` boundary, and add security-audit warnings when `tools.exec.host="sandbox"` is configured while sandbox mode is off.
- Security/Plugins/Hooks: enforce runtime/package path containment with realpath checks so `openclaw.extensions`, `openclaw.hooks`, and hook handler modules cannot escape their trusted roots via traversal or symlinks.
- Security/Discord: centralize trusted sender checks for moderation actions in message-action dispatch, share moderation command parsing across handlers, and clarify permission helpers with explicit any/all semantics.
- Security/ACP: harden ACP bridge session management with duplicate-session refresh, idle-session reaping, oldest-idle soft-cap eviction, and burst rate limiting on session creation to reduce local DoS risk without disrupting normal IDE usage.
- Security/ACP: bound ACP prompt text payloads to 2 MiB before gateway forwarding, account for join separator bytes during pre-concatenation size checks, and avoid stale active-run session state when oversized prompts are rejected. Thanks @aether-ai-agent for reporting.
- Security/Plugins/Hooks: add optional `--pin` for npm plugin/hook installs, persist resolved npm metadata (`name`, `version`, `spec`, integrity, shasum, timestamp), warn/confirm on integrity drift during updates, and extend `openclaw security audit` to flag unpinned specs, missing integrity metadata, and install-record version drift.
- Security/Plugins: harden plugin discovery by blocking unsafe candidates (root escapes, world-writable paths, suspicious ownership), add startup warnings when `plugins.allow` is empty with discoverable non-bundled plugins, and warn on loaded plugins without install/load-path provenance.
- Refactor/Plugins: extract shared plugin path-safety utilities, split discovery safety checks into typed reasoned guards, precompute provenance matchers during plugin load, and switch ownership tests to injected uid inputs.
- Security/Gateway: rate-limit control-plane write RPCs (`config.apply`, `config.patch`, `update.run`) to 3 requests per minute per `deviceId+clientIp`, add restart single-flight coalescing plus a 30-second restart cooldown, and log actor/device/ip with changed-path audit details for config/update-triggered restarts.
- Commands/Doctor: skip embedding-provider warnings when `memory.backend` is `qmd`, because QMD manages embeddings internally and does not require `memorySearch` providers. (#17263) Thanks @miloudbelarebia.
- Security/Webhooks: harden Feishu and Zalo webhook ingress with webhook-mode token preconditions, loopback-default Feishu bind host, JSON content-type enforcement, per-path rate limiting, replay dedupe for Zalo events, constant-time Zalo secret comparison, and anomaly status counters.
>>>>>>> 8288702f5 (docs(changelog): add Windows schtasks injection fix note)
- Security/Plugins: add explicit `plugins.runtime.allowLegacyExec` opt-in to re-enable deprecated `runtime.system.runCommandWithTimeout` for legacy modules while keeping runtime command execution disabled by default. (#20874) Thanks @mbelinky.
- Gateway/WebChat: block `sessions.patch` and `sessions.delete` for WebChat clients so session-store mutations stay restricted to non-WebChat operator flows. Thanks @allsmog for reporting.
- Security/Skills: for the next npm release, reject symlinks during skill packaging to prevent external file inclusion in distributed `.skill` archives. Thanks @aether-ai-agent for reporting.
- Security/Gateway: fail startup when `hooks.token` matches `gateway.auth.token` so hooks and gateway token reuse is rejected at boot. (#20813) Thanks @coygeek.
- Security/Network: block plaintext `ws://` connections to non-loopback hosts and require secure websocket transport elsewhere. (#20803) Thanks @jscaldwell55.
- Security/Config: parse frontmatter YAML using the YAML 1.2 core schema to avoid implicit coercion of `on`/`off`-style values. (#20857) Thanks @davidrudduck.
- Security/Discord: escape backticks in exec-approval embed content to prevent markdown formatting injection via command text. (#20854) Thanks @davidrudduck.
- Security/Agents: replace shell-based `execSync` usage with `execFileSync` in command lookup helpers to eliminate shell argument interpolation risk. (#20655) Thanks @mahanandhi.
- Security/Media: use `crypto.randomBytes()` for temp file names and set owner-only permissions for TTS temp files. (#20654) Thanks @mahanandhi.
- Security/Gateway: set baseline security headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`) on gateway HTTP responses. (#10526) Thanks @abdelsfane.
<<<<<<< HEAD
- Tests/Security: refactor `src/security/audit.test.ts` by extracting shared helpers to reduce duplication in security audit test coverage. (#20087) Thanks @habakan.
- Channels/Matrix: fix mention detection for `formatted_body` Matrix-to links by handling matrix.to mention formats consistently. (#16941) Thanks @zerone0x.
- Scripts: update clawdock helper command support to include `docker-compose.extra.yml` where available. (#17094) Thanks @zerone0x.
- Security/iMessage: harden remote attachment SSH/SCP handling by requiring strict host-key verification, validating `channels.imessage.remoteHost` as `host`/`user@host`, and rejecting unsafe host tokens from config or auto-detection. Thanks @allsmog for reporting.
>>>>>>> 043b2f5e7 (changelog: add unreleased fixes from recent PRs (#20897))
- Security/Feishu: prevent path traversal in Feishu inbound media temp-file writes by replacing key-derived temp filenames with UUID-based names. Thanks @allsmog for reporting.
- Security/Media: harden local media ingestion against TOCTOU/symlink swap attacks by pinning reads to a single file descriptor with symlink rejection and inode/device verification in `saveMediaSource`. Thanks @dorjoos for reporting.
<<<<<<< HEAD
=======
- Security/Lobster (Windows): for the next npm release, remove shell-based fallback when launching Lobster wrappers (`.cmd`/`.bat`) and switch to explicit argv execution with wrapper entrypoint resolution, preventing command injection while preserving Windows wrapper compatibility. Thanks @allsmog for reporting.
- Lobster/Config: remove Lobster executable-path overrides (`lobsterPath`), require PATH-based execution, and add focused Windows wrapper-resolution tests to keep shell-free behavior stable.
>>>>>>> 29118995a (refactor(lobster): remove lobsterPath overrides)
- Agents/Streaming: keep assistant partial streaming active during reasoning streams, handle native `thinking_*` stream events consistently, dedupe mixed reasoning-end signals, and clear stale mutating tool errors after same-target retry success. (#20635) Thanks @obviyus.
- Security/OTEL: sanitize OTLP endpoint URL resolution. (#13791) Thanks @vincentkoc.
- OTEL/diagnostics-otel: complete OpenTelemetry v2 API migration. (#12897) Thanks @vincentkoc.
- Gateway: clarify launchctl GUI domain bootstrap failure on macOS. (#13795) Thanks @vincentkoc.
- Security: patch Dependabot security issues in pnpm lock. (#20832) Thanks @vincentkoc.
- Lobster/CI: fix flaky test Windows cmd shim script resolution. (#20833) Thanks @vincentkoc.
- Security: migrate request dependencies to `@cypress/request`. (#20836) Thanks @vincentkoc.
- Gateway/Auth: default unresolved gateway auth to token mode with startup auto-generation/persistence of `gateway.auth.token`, while allowing explicit `gateway.auth.mode: "none"` for intentional open loopback setups. (#20686) thanks @gumadeiras.
- Browser/Relay: require gateway-token auth on both `/extension` and `/cdp`, and align Chrome extension setup to use a single `gateway.auth.token` input for relay authentication. Thanks @tdjackey for reporting.
- Gateway/Hooks: run BOOT.md startup checks per configured agent scope, including per-agent session-key resolution, startup-hook regression coverage, and non-success boot outcome logging for diagnosability. (#20569) thanks @mcaxtr.
- Telegram: unify message-like inbound handling so `message` and `channel_post` share the same dedupe/access/media pipeline and remain behaviorally consistent. (#20591) Thanks @obviyus.
- Heartbeat/Cron: skip interval heartbeats when `HEARTBEAT.md` is missing or empty and no tagged cron events are queued, while preserving cron-event fallback for queued tagged reminders. (#20461) thanks @vikpos.
- Telegram/Agents: gate exec/bash tool-failure warnings behind verbose mode so default Telegram replies stay clean while verbose sessions still surface diagnostics. (#20560) Thanks @obviyus.
- Gateway/Daemon: forward `TMPDIR` into installed service environments so macOS LaunchAgent gateway runs can open SQLite temp/journal files reliably instead of failing with `SQLITE_CANTOPEN`. (#20512) Thanks @Clawborn.
- Agents/Billing: include the active model that produced a billing error in user-facing billing messages (for example, `OpenAI (gpt-5.3)`) across payload, failover, and lifecycle error paths, so users can identify exactly which key needs credits. (#20510) Thanks @echoVic.
>>>>>>> 65a7fc6de (Changelog: note Feishu traversal hardening)
- iOS/Screen: move `WKWebView` lifecycle ownership into `ScreenWebView` coordinator and explicit attach/detach flow to reduce gesture/lifecycle crash risk (`__NSArrayM insertObject:atIndex:` paths) during screen tab updates. (#20366) Thanks @ngutman.
>>>>>>> dd28a77df (fix(ios): refactor screen webview lifecycle handling (#20366))
- Protocol/Apple: regenerate Swift gateway models for `push.test` so `pnpm protocol:check` stays green on main. Thanks @mbelinky.
- Canvas/A2UI: improve bundled-asset resolution and empty-state handling so UI fallbacks render reliably. (#20312) Thanks @mbelinky.
>>>>>>> 750276fa3 (fix(protocol): regenerate Swift models for push.test (#20325))
- UI/Sessions: accept the canonical main session-key alias in Chat UI flows so main-session routing stays consistent. (#20311) Thanks @mbelinky.
>>>>>>> fe3f0759b (Chat UI: accept canonical main session key alias (#20311))
- iOS/Onboarding: prevent pairing-status flicker during auto-resume by keeping resumed state transitions stable. (#20310) Thanks @mbelinky.
>>>>>>> 6e7f1a6a1 (iOS onboarding: prevent pairing flicker during auto-resume (#20310))
- OpenClawKit/Protocol: preserve JSON boolean literals (`true`/`false`) when bridging through `AnyCodable` so Apple client RPC params no longer re-encode booleans as `1`/`0`. Thanks @mbelinky.
>>>>>>> e9b4d86e3 (fix(protocol): preserve AnyCodable booleans from JSON bridge (#20220))
- iOS/Onboarding: stabilize pairing and reconnect behavior by resetting stale pairing request state on manual retry, disconnecting both operator and node gateways on operator failure, and avoiding duplicate pairing loops from operator transport identity attachment. (#20056) Thanks @mbelinky.
- Browser/Relay: reuse an already-running extension relay when the relay port is occupied by another OpenClaw process, while still failing on non-relay port collisions to avoid masking unrelated listeners. (#20035) Thanks @mbelinky.
- Telegram/Cron/Heartbeat: honor explicit Telegram topic targets in cron and heartbeat delivery (`<chatId>:topic:<threadId>`) so scheduled sends land in the configured topic instead of the last active thread. (#19367) Thanks @Lukavyi.
- iOS/Signing: restore local auto-selected signing-team overrides during iOS project generation by wiring `.local-signing.xcconfig` into the active signing config and emitting `OPENCLAW_DEVELOPMENT_TEAM` in local signing setup. (#19993) Thanks @ngutman.
>>>>>>> fc65f70a9 (iOS: stabilize pairing/reconnect loops (#20056))
- Commands/Doctor: avoid rewriting invalid configs with new `gateway.auth.token` defaults during repair and only write when real config changes are detected, preventing accidental token duplication and backup churn.
- Sandbox/Registry: serialize container and browser registry writes with shared file locks and atomic replacement to prevent lost updates and delete rollback races from desyncing `sandbox list`, `prune`, and `recreate --all`. Thanks @kexinoh.
- Cron/Webhooks: protect cron webhook POST delivery with SSRF-guarded outbound fetch (`fetchWithSsrFGuard`) to block private/metadata destinations before request dispatch. Thanks @Adam55A-code.
- Security/Net: block SSRF bypass via NAT64 (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 (`2002::/16`), and Teredo (`2001:0000::/32`) IPv6 transition addresses, and fail closed on IPv6 parse errors. Thanks @jackhax.
=======
- Security/iMessage: harden remote attachment SSH/SCP handling by requiring strict host-key verification, validating `channels.imessage.remoteHost` as `host`/`user@host`, and rejecting unsafe host tokens from config or auto-detection. Thanks @allsmog for reporting.
- Security/Feishu: prevent path traversal in Feishu inbound media temp-file writes by replacing key-derived temp filenames with UUID-based names. Thanks @allsmog for reporting.
- Security/Feishu: escape mention regex metacharacters in `stripBotMention` so crafted mention metadata cannot trigger regex injection or ReDoS during inbound message parsing. (#20916) Thanks @orlyjamie for the fix and @allsmog for reporting.
- LINE/Security: harden inbound media temp-file naming by using UUID-based temp paths for downloaded media instead of external message IDs. (#20792) Thanks @mbelinky.
- Security/Media: harden local media ingestion against TOCTOU/symlink swap attacks by pinning reads to a single file descriptor with symlink rejection and inode/device verification in `saveMediaSource`. Thanks @dorjoos for reporting.
- Security/Lobster (Windows): for the next npm release, remove shell-based fallback when launching Lobster wrappers (`.cmd`/`.bat`) and switch to explicit argv execution with wrapper entrypoint resolution, preventing command injection while preserving Windows wrapper compatibility. Thanks @allsmog for reporting.
- Security/Exec: require `tools.exec.safeBins` binaries to resolve from trusted bin directories (system defaults plus gateway startup `PATH`) so PATH-hijacked trojan binaries cannot bypass allowlist checks. Thanks @jackhax for reporting.
- Security/Exec: remove file-existence oracle behavior from `tools.exec.safeBins` by using deterministic argv-only stdin-safe validation and blocking file-oriented flags (for example `sort -o`, `jq -f`, `grep -f`) so allow/deny results no longer disclose host file presence. Thanks @nedlir for reporting.
- Security/Browser: route browser URL navigation through one SSRF-guarded validation path for tab-open/CDP-target/Playwright navigation flows and block private/metadata destinations by default (configurable via `browser.ssrfPolicy`). Thanks @dorjoos for reporting.
- Security/Exec: for the next npm release, harden safe-bin stdin-only enforcement by blocking output/recursive flags (`sort -o/--output`, grep recursion) and tightening default safe bins to remove `sort`/`grep`, preventing safe-bin allowlist bypass for file writes/recursive reads. Thanks @nedlir for reporting.
<<<<<<< HEAD
=======
- Security/Exec: block grep safe-bin positional operand bypass by setting grep positional budget to zero, so `-e/--regexp` cannot smuggle bare filename reads (for example `.env`) via ambiguous positionals; safe-bin grep patterns must come from `-e/--regexp`. Thanks @athuljayaram for reporting.
>>>>>>> 5da03e622 (fix(macos): harden exec allowlist shell-chain checks)
- Security/Gateway/Agents: remove implicit admin scopes from agent tool gateway calls by classifying methods to least-privilege operator scopes, and enforce owner-only tooling (`cron`, `gateway`, `whatsapp_login`) through centralized tool-policy wrappers plus tool metadata to prevent non-owner DM privilege escalation. Ships in the next npm release. Thanks @Adam55A-code for reporting.
- Security/Gateway: centralize gateway method-scope authorization and default non-CLI gateway callers to least-privilege method scopes, with explicit CLI scope handling, full core-handler scope classification coverage, and regression guards to prevent scope drift.
- Security/Net: block SSRF bypass via NAT64 (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 (`2002::/16`), and Teredo (`2001:0000::/32`) IPv6 transition addresses, and fail closed on IPv6 parse errors. Thanks @jackhax.
- Security/OTEL: sanitize OTLP endpoint URL resolution. (#13791) Thanks @vincentkoc.
- Security: patch Dependabot security issues in pnpm lock. (#20832) Thanks @vincentkoc.
- Security: migrate request dependencies to `@cypress/request`. (#20836) Thanks @vincentkoc.
>>>>>>> 9f5429e52 (docs: trim refactor-only and duplicate changelog entries)

## 2026.2.17

### Changes

- Agents/Anthropic: add opt-in 1M context beta header support for Opus/Sonnet via model `params.context1m: true` (maps to `anthropic-beta: context-1m-2025-08-07`).
>>>>>>> 35851cdaf (chore(changelog): move cron SSRF fix into 2026.2.18)
- Agents/Models: support Anthropic Sonnet 4.6 (`anthropic/claude-sonnet-4-6`) across aliases/defaults with forward-compat fallback when upstream catalogs still only expose Sonnet 4.5.
- Commands/Subagents: add `/subagents spawn` for deterministic subagent activation from chat commands. (#18218) Thanks @JoshuaLelon.
- Agents/Subagents: add an accepted response note for `sessions_spawn` explaining polling subagents are disabled for one-off calls. Thanks @tyler6204.
- Agents/Subagents: prefix spawned subagent task messages with context to preserve source information in downstream handling. Thanks @tyler6204.
- iOS/Share: add an iOS share extension that forwards shared URL/text/image content directly to gateway `agent.request`, with delivery-route fallback and optional receipt acknowledgements. (#19424) Thanks @mbelinky.
- iOS/Talk: add a `Background Listening` toggle that keeps Talk Mode active while the app is backgrounded (off by default for battery safety). Thanks @zeulewan.
- iOS/Talk: add a `Voice Directive Hint` toggle for Talk Mode prompts so users can disable ElevenLabs voice-switching instructions to save tokens when not needed. (#18250) Thanks @zeulewan.
- iOS/Talk: harden barge-in behavior by disabling interrupt-on-speech when output route is built-in speaker/receiver, reducing false interruptions from local TTS bleed-through. Thanks @zeulewan.
- Slack: add native single-message text streaming with Slack `chat.startStream`/`appendStream`/`stopStream`; keep reply threading aligned with `replyToMode`, default streaming to enabled, and fall back to normal delivery when streaming fails. (#9972) Thanks @natedenh.
- Slack: add configurable streaming modes for draft previews. (#18555) Thanks @Solvely-Colin.
>>>>>>> 345920044 (docs: reorder unreleased changelog by user-impact highlights)
- Telegram/Agents: add inline button `style` support (`primary|success|danger`) across message tool schema, Telegram action parsing, send pipeline, and runtime prompt guidance. (#18241) Thanks @obviyus.
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> ad27716d3 (feat(ios): add Talk voice directive hint toggle (#18250))

### Fixes

<<<<<<< HEAD
- Security/Sessions: create new session transcript JSONL files with user-only (`0o600`) permissions and extend `openclaw security audit --fix` to remediate existing transcript file permissions.
- Infra/Fetch: ensure foreign abort-signal listener cleanup never masks original fetch successes/failures, while still preventing detached-finally unhandled rejection noise in `wrapFetchWithAbortSignal`. Thanks @Jackten.
- Gateway/Config: prevent `config.patch` object-array merges from falling back to full-array replacement when some patch entries lack `id`, so partial `agents.list` updates no longer drop unrelated agents. (#17989) Thanks @stakeswky.
- Agents/Models: probe the primary model when its auth-profile cooldown is near expiry (with per-provider throttling), so runs recover from temporary rate limits without staying on fallback models until restart. (#17478) Thanks @PlayerGhost.
=======
=======
- Telegram: surface user message reactions as system events, with configurable `channels.telegram.reactionNotifications` scope. (#10075) Thanks @Glucksberg.
<<<<<<< HEAD
- Mattermost: add emoji reaction actions plus reaction event notifications, including an explicit boolean `remove` flag to avoid accidental removals. (#18608) Thanks @echo931.
>>>>>>> dd0b78966 (fix(mattermost): surface reactions support)
=======
- iMessage: support `replyToId` on outbound text/media sends and normalize leading `[[reply_to:<id>]]` tags so replies target the intended iMessage. Thanks @tyler6204.
- Tool Display/Web UI: add intent-first tool detail views and exec summaries. (#18592) Thanks @xdLawless2.
>>>>>>> 345920044 (docs: reorder unreleased changelog by user-impact highlights)
- Discord: expose native `/exec` command options (host/security/ask/node) so Discord slash commands get autocomplete and structured inputs. Thanks @thewilloftheshadow.
- Discord: allow reusable interactive components with `components.reusable=true` so buttons, selects, and forms can be used multiple times before expiring. Thanks @thewilloftheshadow.
- Discord: add per-button `allowedUsers` allowlist for interactive components to restrict who can click buttons. Thanks @thewilloftheshadow.
- Cron/Gateway: separate per-job webhook delivery (`delivery.mode = "webhook"`) from announce delivery, enforce valid HTTP(S) webhook URLs, and keep a temporary legacy `notify + cron.webhook` fallback for stored jobs. (#17901) Thanks @advaitpaliwal.
<<<<<<< HEAD
- Discord: add per-button `allowedUsers` allowlist for interactive components to restrict who can click buttons. Thanks @thewilloftheshadow.

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
- Agents/Process: keep staged process-tree termination safe by skipping delayed Windows force-kill when the PID is already gone, and align PTY force-kill wait behavior with actual exit timing to avoid premature "killed" state reporting during grace periods. (#18626)
- Slack: limit forwarded-attachment extraction to explicit shared-message attachments and skip non-Slack forwarded image URLs, preventing non-forward unfurls from polluting inbound agent context. Also adds regression tests for forwarded vs non-forward attachment handling.
=======
=======
=======
=======
=======
=======
- macOS/Update: correct the Sparkle appcast version for 2026.2.15 so updates are offered again. (#18201)
- Gateway/Auth: clear stale device-auth tokens after device token mismatch errors so re-paired clients can re-auth. (#18201)
>>>>>>> 2caf7e761 (docs(changelog): remove revert entries)
- Voice call/Gateway: prevent overlapping closed-loop turn races with per-call turn locking, route transcript dedupe via source-aware fingerprints with strict cache eviction bounds, and harden `voicecall latency` stats for large logs without spread-operator stack overflow. (#19140) Thanks @mbelinky.
- iOS/Onboarding: stop auth Step 3 retry-loop churn by pausing reconnect attempts on unauthorized/missing-token gateway errors and keeping auth/pairing issue state sticky during manual retry. (#19153) Thanks @mbelinky.
<<<<<<< HEAD
>>>>>>> 836e77449 (iOS onboarding: stop auth step-3 retry loop churn (#19153))
=======
- iOS/Chat: route ChatSheet RPCs through the operator session instead of the node session to avoid node-role authorization failures for `chat.history`, `chat.send`, and `sessions.list`. (#19320) Thanks @mbelinky.
>>>>>>> 20a561224 (iOS: use operator session for ChatSheet RPCs (#19320))
- Fix types in all tests. Typecheck the whole repository.
>>>>>>> bcf862f69 (chore: Typecheck tests.)
- Voice-call: auto-end calls when media streams disconnect to prevent stuck active calls. (#18435) Thanks @JayMishra-source.
>>>>>>> bfaa03981 (test(voice-call): cover stream disconnect auto-end)
=======
- Telegram: surface user message reactions as system events, with configurable `channels.telegram.reactionNotifications` scope. (#10075) Thanks @Glucksberg.
- Slack: add configurable streaming modes for draft previews. (#18555) Thanks @Solvely-Colin.
- Slack: add external-select flow for large argument menus. (#18496) Thanks @Solvely-Colin.
- Discord: expose native `/exec` command options (host/security/ask/node) so Discord slash commands get autocomplete and structured inputs. Thanks @thewilloftheshadow.
- Discord: allow reusable interactive components with `components.reusable=true` so buttons, selects, and forms can be used multiple times before expiring. Thanks @thewilloftheshadow.
- Discord: add per-button `allowedUsers` allowlist for interactive components to restrict who can click buttons. Thanks @thewilloftheshadow.
- Mattermost: add emoji reaction actions plus reaction event notifications, including an explicit boolean `remove` flag to avoid accidental removals. (#18608) Thanks @echo931.
- Commands/Subagents: add `/subagents spawn` for deterministic subagent activation from chat commands. (#18218) Thanks @JoshuaLelon.
=======
- Cron/CLI: add deterministic default stagger for recurring top-of-hour cron schedules (including 6-field seconds cron), auto-migrate existing jobs to persisted `schedule.staggerMs`, and add `openclaw cron add/edit --stagger <duration>` plus `--exact` overrides for per-job timing control.
- Cron: log per-run model/provider usage telemetry in cron run logs/webhooks and add a local usage report script for aggregating token usage by job. (#18172) Thanks @HankAndTheCrew.
>>>>>>> 345920044 (docs: reorder unreleased changelog by user-impact highlights)
- Tools/Web: add URL allowlists for `web_search` and `web_fetch`. (#18584) Thanks @smartprogrammer93.
- Browser: add `extraArgs` config for custom Chrome launch arguments. (#18443) Thanks @JayMishra-source.
- Voice Call: pre-cache inbound greeting TTS for faster first playback. (#18447) Thanks @JayMishra-source.
- Skills: compact skill file `<location>` paths in the system prompt by replacing home-directory prefixes with `~`, and add targeted compaction tests for prompt serialization behavior. (#14776) Thanks @bitfish3.
- Skills: refine skill-description routing boundaries with explicit "Use when"/"NOT for" guidance for coding-agent/github/weather, and clarify PTY/browser fallback wording. (#14577) Thanks @DylanWoodAkers.
- Auto-reply/Prompts: include trusted inbound `message_id` in conversation metadata payloads for downstream targeting workflows. Thanks @tyler6204.
- Auto-reply: include `sender_id` in trusted inbound metadata so moderation workflows can target the sender without relying on untrusted text. (#18303) Thanks @crimeacs.
- UI/Sessions: avoid duplicating typed session prefixes in display names (for example `Subagent Subagent ...`). Thanks @tyler6204.
- Agents/Z.AI: enable `tool_stream` by default for real-time tool call streaming, with opt-out via `params.tool_stream: false`. (#18173) Thanks @tianxiao1430-jpg.
- Plugins: add `before_agent_start` model/provider overrides before resolution. (#18568) Thanks @natefikru.
- Mattermost: add emoji reaction actions plus reaction event notifications, including an explicit boolean `remove` flag to avoid accidental removals. (#18608) Thanks @echo931.
- Memory/Search: add FTS fallback plus query expansion for memory search. (#18304) Thanks @irchelper.
- Agents/Models: support per-model `thinkingDefault` overrides in model config. (#18152) Thanks @wu-tian807.
- Agents: enable `llms.txt` discovery in default behavior. (#18158) Thanks @yolo-maxi.
- Extensions/Auth: add OpenAI Codex CLI auth provider integration. (#18009) Thanks @jiteshdhamaniya.
- Feishu: add Bitable create-app/create-field tools for automation workflows. (#17963) Thanks @gaowanqi08141999.
- Docker: add optional `OPENCLAW_INSTALL_BROWSER` build arg to preinstall Chromium + Xvfb in the Docker image, avoiding runtime Playwright installs. (#18449)

### Fixes

- iOS/Onboarding: stop auth Step 3 retry-loop churn by pausing reconnect attempts on unauthorized/missing-token gateway errors and keeping auth/pairing issue state sticky during manual retry. (#19153) Thanks @mbelinky.
- Voice-call: auto-end calls when media streams disconnect to prevent stuck active calls. (#18435) Thanks @JayMishra-source.
- Voice call/Gateway: prevent overlapping closed-loop turn races with per-call turn locking, route transcript dedupe via source-aware fingerprints with strict cache eviction bounds, and harden `voicecall latency` stats for large logs without spread-operator stack overflow. (#19140) Thanks @mbelinky.
- iOS/Chat: route ChatSheet RPCs through the operator session instead of the node session to avoid node-role authorization failures for `chat.history`, `chat.send`, and `sessions.list`. (#19320) Thanks @mbelinky.
- macOS/Update: correct the Sparkle appcast version for 2026.2.15 so updates are offered again. (#18201)
- Gateway/Auth: clear stale device-auth tokens after device token mismatch errors so re-paired clients can re-auth. (#18201)
- Telegram: enable DM voice-note transcription with CLI fallback handling. (#18564) Thanks @thhuang.
- Telegram/Polls: restore Telegram poll action wiring in channel handlers. (#18122) Thanks @akyourowngames.
- WebChat: strip reply/audio directive tags from rendered chat output. (#18093) Thanks @aldoeliacim.
- Discord: honor configured HTTP proxy for app-id and allowlist REST resolution. (#17958) Thanks @k2009.
- BlueBubbles: add fallback path to recover outbound `message_id` from `fromMe` webhooks when platform message IDs are missing. Thanks @tyler6204.
- BlueBubbles: match outbound message-id fallback recovery by chat identifier as well as account context. Thanks @tyler6204.
- BlueBubbles: include sender identifier in untrusted conversation metadata for conversation info payloads. Thanks @tyler6204.
- Security/Exec: fix the OC-09 credential-theft path via environment-variable injection. (#18048) Thanks @aether-ai-agent.
<<<<<<< HEAD
=======
- Security/Config: confine `$include` resolution to the top-level config directory, harden traversal/symlink checks with cross-platform-safe path containment, and add doctor hints for invalid escaped include paths. (#18652) Thanks @aether-ai-agent.
>>>>>>> 42d2a6188 (chore(changelog): move SSRF transition fix to 2026.2.18)
- Providers: improve error messaging for unconfigured local `ollama`/`vllm` providers. (#18183) Thanks @arosstale.
- TTS: surface all provider errors instead of only the last error in aggregated failures. (#17964) Thanks @ikari-pl.
- CLI/Doctor/Configure: skip gateway auth checks for loopback-only setups. (#18407) Thanks @sggolakiya.
- CLI/Doctor: reconcile gateway service-token drift after re-pair flows. (#18525) Thanks @norunners.
- Process/Windows: disable detached spawn in exec runs to prevent empty command output. (#18067) Thanks @arosstale.
- Process: gracefully terminate process trees with SIGTERM before SIGKILL. (#18626) Thanks @sauerdaniel.
- Sessions/Windows: use atomic session-store writes to prevent context loss on Windows. (#18347) Thanks @twcwinston.
- Agents/Image: validate base64 image payloads before provider submission. (#18263) Thanks @sriram369.
- Models CLI: validate catalog entries in `openclaw models set`. (#18129) Thanks @carrotRakko.
- Usage: isolate last-turn totals in token usage reporting to avoid mixed-turn totals. (#18052) Thanks @arosstale.
- Cron: resolve `accountId` from agent bindings in isolated sessions. (#17996) Thanks @simonemacario.
- Gateway/HTTP: preserve unbracketed IPv6 `Host` headers when normalizing requests. (#18061) Thanks @Clawborn.
- Sandbox: fix workspace-directory orphaning during SHA-1 -> SHA-256 slug migration. (#18523) Thanks @yinghaosang.
- Ollama/Qwen: handle Qwen 3 reasoning field format in Ollama responses. (#18631) Thanks @mr-sk.
- OpenAI/Transcripts: always drop orphaned reasoning blocks from transcript repair. (#18632) Thanks @TySabs.
- Fix types in all tests. Typecheck the whole repository.
>>>>>>> 25a9e7ed9 (docs(changelog): add missing 2026.2.16 entries and reorder by user impact)
- Gateway/Channels: wire `gateway.channelHealthCheckMinutes` into strict config validation, treat implicit account status as managed for health checks, and harden channel auto-restart flow (preserve restart-attempt caps across crash loops, propagate enabled/configured runtime flags, and stop pending restart backoff after manual stop). Thanks @steipete.
- UI/Usage: replace lingering undefined `var(--text-muted)` usage with `var(--muted)` in usage date-range and chart styles to keep muted text visible across themes. (#17975) Thanks @jogelin.
- UI/Usage: preserve selected-range totals when timeline data is downsampled by bucket-aggregating timeseries points (instead of dropping intermediate points), so filtered tokens/cost stay accurate. (#17959) Thanks @jogelin.
- UI/Sessions: refresh the sessions table only after successful deletes and preserve delete errors on cancel/failure paths, so deleted sessions disappear automatically without masking delete failures. (#18507)
<<<<<<< HEAD
>>>>>>> 3df8305cb (fix(ui): gate sessions refresh on successful delete)
- Mattermost: harden reaction handling by requiring an explicit boolean `remove` flag and routing reaction websocket events to the reaction handler, preventing string `"true"` values from being treated as removes and avoiding double-processing of reaction events as posts. (#18608) Thanks @echo931.
=======
>>>>>>> dd0b78966 (fix(mattermost): surface reactions support)
- Scripts/UI/Windows: fix `pnpm ui:*` spawn `EINVAL` failures by restoring shell-backed launch for `.cmd`/`.bat` runners, narrowing shell usage to launcher types that require it, and rejecting unsafe forwarded shell metacharacters in UI script args. (#18594)
- Hooks/Session-memory: recover `/new` conversation summaries when session pointers are reset-path or missing `sessionFile`, and consistently prefer the newest `.jsonl.reset.*` transcript candidate for fallback extraction. (#18088)
- Slack: restrict forwarded-attachment ingestion to explicit shared-message attachments and skip non-Slack forwarded `image_url` fetches, preventing non-forward attachment unfurls from polluting inbound agent context while preserving forwarded message handling.
<<<<<<< HEAD
>>>>>>> c219c85df (docs(changelog): record PR 18608 fixups)
- Cron/Heartbeat: canonicalize session-scoped reminder `sessionKey` routing and preserve explicit flat `sessionKey` cron tool inputs, preventing enqueue/wake namespace drift for session-targeted reminders. (#18637) Thanks @vignesh07.
>>>>>>> 3793424f5 (docs(changelog): note process kill-tree hotfix)
=======
- Feishu: detect bot mentions in post messages with embedded docs when `message.mentions` is empty. (#18074) Thanks @popomore.
- Agents/Sessions: align session lock watchdog hold windows with run and compaction timeout budgets (plus grace), preventing valid long-running turns from being force-unlocked mid-run while still recovering hung lock owners. (#18060)
- Cron/Heartbeat: canonicalize session-scoped reminder `sessionKey` routing and preserve explicit flat `sessionKey` cron tool inputs, preventing enqueue/wake namespace drift for session-targeted reminders. (#18637) Thanks @vignesh07.
- Cron/Webhooks: reuse existing session IDs for webhook/cron runs when the session key is stable and still fresh, preserving conversation history. (#18031) Thanks @Operative-001.
<<<<<<< HEAD
>>>>>>> 96fb27648 (docs(changelog): note webhook session reuse fix)
=======
- Cron: prevent spin loops when cron jobs complete within the scheduled second by advancing the next run and enforcing a minimum refire gap. (#18073) Thanks @widingmarcus-cyber.
>>>>>>> 35851cdaf (chore(changelog): move cron SSRF fix into 2026.2.18)
- OpenClawKit/iOS ChatUI: accept canonical session-key completion events for local pending runs and preserve message IDs across history refreshes, preventing stuck "thinking" state and message flicker after gateway replies. (#18165) Thanks @mbelinky.
- iOS/Onboarding: add QR-first onboarding wizard with setup-code deep link support, pairing/auth issue guidance, and device-pair QR generation improvements for Telegram/Web/TUI fallback flows. (#18162) Thanks @mbelinky and @Marvae.
- iOS/Gateway: stabilize connect/discovery state handling, add onboarding reset recovery in Settings, and fix iOS gateway-controller coverage for command-surface and last-connection persistence behavior. (#18164) Thanks @mbelinky.
- iOS/Talk: harden mobile talk config handling by ignoring redacted/env-placeholder API keys, support secure local keychain override, improve accessibility motion/contrast behavior in status UI, and tighten ATS to local-network allowance. (#18163) Thanks @mbelinky.
- iOS/Location: restore the significant location monitor implementation (service hooks + protocol surface + ATS key alignment) after merge drift so iOS builds compile again. (#18260) Thanks @ngutman.
- Telegram: keep DM-topic replies and draft previews in the originating private-chat topic by preserving positive `message_thread_id` values for DM threads. (#18586) Thanks @sebslight.
<<<<<<< HEAD
>>>>>>> 21e5c0ce5 (chore: reorder latest changelog bullets by user impact)
=======
- Telegram: preserve private-chat topic `message_thread_id` on outbound sends (message/sticker/poll), keep thread-not-found retry fallback, and avoid masking `chat not found` routing errors. (#18993) Thanks @obviyus.
- Discord: prevent duplicate media delivery when the model uses the `message send` tool with media, by skipping media extraction from messaging tool results since the tool already sent the message directly. (#18270)
- Discord: route `audioAsVoice` auto-replies through the voice message API so opt-in audio renders as voice messages. (#18041) Thanks @zerone0x.
>>>>>>> 96fb27648 (docs(changelog): note webhook session reuse fix)
- Telegram: keep draft-stream preview replies attached to the user message for `replyToMode: "all"` in groups and DMs, preserving threaded reply context from preview through finalization. (#17880) Thanks @yinghaosang.
- Telegram: prevent streaming final replies from being overwritten by later final/error payloads, and suppress fallback tool-error warnings when a recovered assistant answer already exists after tool calls. (#17883) Thanks @Marvae and @obviyus.
- Telegram: disable block streaming when `channels.telegram.streamMode` is `off`, preventing newline/content-block replies from splitting into multiple messages. (#17679) Thanks @saivarunk.
- Telegram: route non-abort slash commands on the normal chat/topic sequential lane while keeping true abort requests (`/stop`, `stop`) on the control lane, preventing command/reply race conditions from control-lane bypass. (#17899) Thanks @obviyus.
- Telegram: ignore `<media:...>` placeholder lines when extracting `MEDIA:` tool-result paths, preventing false local-file reads and dropped replies. (#18510) Thanks @yinghaosang.
- Auto-reply/TTS: keep tool-result media delivery enabled in group chats and native command sessions (while still suppressing tool summary text) so `NO_REPLY` follow-ups do not drop successful TTS audio. (#17991) Thanks @zerone0x.
<<<<<<< HEAD
- Cron: preserve per-job schedule-error isolation in post-run maintenance recompute so malformed sibling jobs no longer abort persistence of successful runs. (#17852) Thanks @pierreeurope.
=======
- Discord: optimize reaction notification handling to skip unnecessary message fetches in `off`/`all`/`allowlist` modes, streamline reaction routing, and improve reaction emoji formatting. (#18248) Thanks @thewilloftheshadow and @victorGPT.
>>>>>>> 21e5c0ce5 (chore: reorder latest changelog bullets by user impact)
- CLI/Pairing: make `openclaw qr --remote` prefer `gateway.remote.url` over tailscale/public URL resolution and register the `openclaw clawbot qr` legacy alias path. (#18091)
<<<<<<< HEAD
=======
- CLI/QR: restore fail-fast validation for `openclaw qr --remote` when neither `gateway.remote.url` nor tailscale `serve`/`funnel` is configured, preventing unusable remote pairing QR flows. (#18166) Thanks @mbelinky.
<<<<<<< HEAD
<<<<<<< HEAD
- OpenClawKit/iOS ChatUI: accept canonical session-key completion events for local pending runs and preserve message IDs across history refreshes, preventing stuck "thinking" state and message flicker after gateway replies. (#18165) Thanks @mbelinky.
<<<<<<< HEAD
>>>>>>> 6effcdb55 (OpenClawKit: stabilize iOS ChatUI updates after gateway replies (#18165))
=======
- iOS/Talk: harden mobile talk config handling by ignoring redacted/env-placeholder API keys, support secure local keychain override, improve accessibility motion/contrast behavior in status UI, and tighten ATS to local-network allowance. (#18163) Thanks @mbelinky.
<<<<<<< HEAD
>>>>>>> 2e7fac223 (iOS: port talk redaction, accessibility, and ATS hardening (#18163))
=======
- iOS/Gateway: stabilize connect/discovery state handling, add onboarding reset recovery in Settings, and fix iOS gateway-controller coverage for command-surface and last-connection persistence behavior. (#18164) Thanks @mbelinky.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 9a1e16868 (iOS: port gateway connect/discovery stability + onboarding reset (#18164))
=======
- iOS/Onboarding: add QR-first onboarding wizard with setup-code deep link support, pairing/auth issue guidance, and device-pair QR generation improvements for Telegram/Web/TUI fallback flows. (#18162) Thanks @mbelinky.
>>>>>>> 130e59a9c (iOS: port onboarding + QR pairing flow stability (#18162))
=======
- iOS/Onboarding: add QR-first onboarding wizard with setup-code deep link support, pairing/auth issue guidance, and device-pair QR generation improvements for Telegram/Web/TUI fallback flows. (#18162) Thanks @mbelinky and @Marvae.
<<<<<<< HEAD
>>>>>>> f2e12646b (docs(changelog): credit @Marvae for iOS onboarding QR (#18325))
=======
- iOS/Location: restore the significant location monitor implementation (service hooks + protocol surface + ATS key alignment) after merge drift so iOS builds compile again. (#18260) Thanks @ngutman.
>>>>>>> 5a39e13c9 (fix(ios): restore missing location monitor merge files (#18260))
=======
=======
- CLI/Doctor: ensure `openclaw doctor --fix --non-interactive --yes` exits promptly after completion so one-shot automation no longer hangs. (#18502)
- CLI/Doctor: auto-repair `dmPolicy="open"` configs missing wildcard allowlists and write channel-correct repair paths (including `channels.googlechat.dm.allowFrom`) so `openclaw doctor --fix` no longer leaves Google Chat configs invalid after attempted repair. (#18544)
- CLI/Doctor: detect gateway service token drift when the gateway token is only provided via environment variables, keeping service repairs aligned after token rotation.
- CLI/Status: fix `openclaw status --all` token summaries for bot-token-only channels so Mattermost/Zalo no longer show a bot+app warning. (#18527) Thanks @echo931.
- Voice Call: add an optional stale call reaper (`staleCallReaperSeconds`) to end stuck calls when enabled. (#18437)
- Auto-reply/Subagents: propagate group context (`groupId`, `groupChannel`, `space`) when spawning via `/subagents spawn`, matching tool-triggered subagent spawn behavior.
>>>>>>> bfaa03981 (test(voice-call): cover stream disconnect auto-end)
- Agents/Tools/exec: add a preflight guard that detects likely shell env var injection (e.g. `$DM_JSON`, `$TMPDIR`) in Python/Node scripts before execution, preventing recurring cron failures and wasted tokens when models emit mixed shell+language source. (#12836)
- Agents/Tools: make loop detection progress-aware and phased by hard-blocking known `process(action=poll|log)` no-progress loops, warning on generic identical-call repeats, warning + no-progress-blocking ping-pong alternation loops (10/20), coalescing repeated warning spam into threshold buckets (including canonical ping-pong pairs), adding a global circuit breaker at 30 no-progress repeats, and emitting structured diagnostic `tool.loop` warning/error events for loop actions. (#16808) Thanks @akramcodez and @beca-oc.
- Agents/Tools: scope the `message` tool schema to the active channel so Telegram uses `buttons` and Discord uses `components`. (#18215) Thanks @obviyus.
- Agents/Models: probe the primary model when its auth-profile cooldown is near expiry (with per-provider throttling), so runs recover from temporary rate limits without staying on fallback models until restart. (#17478) Thanks @PlayerGhost.
<<<<<<< HEAD
=======
- Agents/Failover: classify provider abort stop-reason errors (`Unhandled stop reason: abort`, `stop reason: abort`, `reason: abort`) as timeout-class failures so configured model fallback chains trigger instead of surfacing raw abort failures. (#18618) Thanks @sauerdaniel.
- Models/CLI: sync auth-profiles credentials into agent `auth.json` before registry availability checks so `openclaw models list --all` reports auth correctly for API-key/token providers, normalize provider-id aliases when bridging credentials, and skip expired token mirrors. (#18610, #18615)
>>>>>>> 2caf7e761 (docs(changelog): remove revert entries)
- Agents/Context: raise default total bootstrap prompt cap from `24000` to `150000` chars (keeping `bootstrapMaxChars` at `20000`), include total-cap visibility in `/context`, and mark truncation from injected-vs-raw sizes so total-cap clipping is reflected accurately.
- Memory/QMD: scope managed collection names per agent and precreate glob-backed collection directories before registration, preventing cross-agent collection clobbering and startup ENOENT failures in fresh workspaces. (#17194) Thanks @jonathanadams96.
- Cron: preserve per-job schedule-error isolation in post-run maintenance recompute so malformed sibling jobs no longer abort persistence of successful runs. (#17852) Thanks @pierreeurope.
- Gateway/Config: prevent `config.patch` object-array merges from falling back to full-array replacement when some patch entries lack `id`, so partial `agents.list` updates no longer drop unrelated agents. (#17989) Thanks @stakeswky.
- Config/Discord: require string IDs in Discord allowlists, keep onboarding inputs string-only, and add doctor repair for numeric entries. (#18220) Thanks @thewilloftheshadow.
- Security/Sessions: create new session transcript JSONL files with user-only (`0o600`) permissions and extend `openclaw security audit --fix` to remediate existing transcript file permissions.
- Sessions/Maintenance: archive transcripts when pruning stale sessions, clean expired media in subdirectories, and purge old deleted transcript archives to prevent disk leaks. (#18538)
- Infra/Fetch: ensure foreign abort-signal listener cleanup never masks original fetch successes/failures, while still preventing detached-finally unhandled rejection noise in `wrapFetchWithAbortSignal`. Thanks @Jackten.
- Heartbeat: allow suppressing tool error warning payloads during heartbeat runs via a new heartbeat config flag. (#18497) Thanks @thewilloftheshadow.
>>>>>>> 21e5c0ce5 (chore: reorder latest changelog bullets by user impact)

## 2026.2.15

### Changes

>>>>>>> fc9fae2c2 (chore(changelog): restore 2026.2.15 and move entries to 2026.2.16)
- Discord: unlock rich interactive agent prompts with Components v2 (buttons, selects, modals, and attachment-backed file blocks) so for native interaction through Discord. Thanks @thewilloftheshadow.
>>>>>>> 3fe22ea2f (chore(release): align .15 changelog ordering and release notes)
- Discord: components v2 UI + embeds passthrough + exec approval UX refinements (CV2 containers, button layout, Discord-forwarding skip). Thanks @thewilloftheshadow.
- Plugins: expose `llm_input` and `llm_output` hook payloads so extensions can observe prompt/input context and model output usage details. (#16724) Thanks @SecondThread.
- Subagents: nested sub-agents (sub-sub-agents) with configurable depth. Set `agents.defaults.subagents.maxSpawnDepth: 2` to allow sub-agents to spawn their own children. Includes `maxChildrenPerAgent` limit (default 5), depth-aware tool policy, and proper announce chain routing. (#14447) Thanks @tyler6204.
- Slack/Discord/Telegram: add per-channel ack reaction overrides (account/channel-level) to support platform-specific emoji formats. (#17092) Thanks @zerone0x.
- Cron/Gateway: add finished-run webhook delivery toggle (`notify`) and dedicated webhook auth token support (`cron.webhookToken`) for outbound cron webhook posts. (#14535) Thanks @advaitpaliwal.
- Channels: deduplicate probe/token resolution base types across core + extensions while preserving per-channel error typing. (#16986) Thanks @iyoda and @thewilloftheshadow.

### Fixes

<<<<<<< HEAD
=======
- Security: replace deprecated SHA-1 sandbox configuration hashing with SHA-256 for deterministic sandbox cache identity and recreation checks. Thanks @kexinoh.
<<<<<<< HEAD
>>>>>>> 3fe22ea2f (chore(release): align .15 changelog ordering and release notes)
=======
>>>>>>> fc9fae2c2 (chore(changelog): restore 2026.2.15 and move entries to 2026.2.16)
- Security/Logging: redact Telegram bot tokens from error messages and uncaught stack traces to prevent accidental secret leakage into logs. Thanks @aether-ai-agent.
- Sandbox/Security: block dangerous sandbox Docker config (bind mounts, host networking, unconfined seccomp/apparmor) to prevent container escape via config injection. Thanks @aether-ai-agent.
- Sandbox: preserve array order in config hashing so order-sensitive Docker/browser settings trigger container recreation correctly. Thanks @kexinoh.
- Gateway/Security: redact sensitive session/path details from `status` responses for non-admin clients; full details remain available to `operator.admin`. (#8590) Thanks @fr33d3m0n.
- Gateway/Control UI: preserve requested operator scopes for Control UI bypass modes (`allowInsecureAuth` / `dangerouslyDisableDeviceAuth`) when device identity is unavailable, preventing false `missing scope` failures on authenticated LAN/HTTP operator sessions. (#17682) Thanks @leafbird.
- LINE/Security: fail closed on webhook startup when channel token or channel secret is missing, and treat LINE accounts as configured only when both are present. (#17587) Thanks @davidahmann.
- Skills/Security: restrict `download` installer `targetDir` to the per-skill tools directory to prevent arbitrary file writes. Thanks @Adam55A-code.
- Web Fetch/Security: cap downloaded response body size before HTML parsing to prevent memory exhaustion from oversized or deeply nested pages. Thanks @xuemian168.
<<<<<<< HEAD
>>>>>>> e1e46dc11 (docs: reorder 2026.2.15 changelog entries by impact)
=======
>>>>>>> fc9fae2c2 (chore(changelog): restore 2026.2.15 and move entries to 2026.2.16)
- Config/Gateway: make sensitive-key whitelist suffix matching case-insensitive while preserving `passwordFile` path exemptions, preventing accidental redaction of non-secret config values like `maxTokens` and IRC password-file paths. (#16042) Thanks @akramcodez.
- Dev tooling: harden git `pre-commit` hook against option injection from malicious filenames (for example `--force`), preventing accidental staging of ignored files. Thanks @mrthankyou.
- Gateway/Agent: reject malformed `agent:`-prefixed session keys (for example, `agent:main`) in `agent` and `agent.identity.get` instead of silently resolving them to the default agent, preventing accidental cross-session routing. (#15707) Thanks @rodrigouroz.
- Gateway/Chat: harden `chat.send` inbound message handling by rejecting null bytes, stripping unsafe control characters, and normalizing Unicode to NFC before dispatch. (#8593) Thanks @fr33d3m0n.
- Gateway/Send: return an actionable error when `send` targets internal-only `webchat`, guiding callers to use `chat.send` or a deliverable channel. (#15703) Thanks @rodrigouroz.
- Gateway/Commands: keep webchat command authorization on the internal `webchat` context instead of inferring another provider from channel allowlists, fixing dropped `/new`/`/status` commands in Control UI when channel allowlists are configured. (#7189) Thanks @karlisbergmanis-lv.
- Control UI: prevent stored XSS via assistant name/avatar by removing inline script injection, serving bootstrap config as JSON, and enforcing `script-src 'self'`. Thanks @Adam55A-code.
- Agents/Security: sanitize workspace paths before embedding into LLM prompts (strip Unicode control/format chars) to prevent instruction injection via malicious directory names. Thanks @aether-ai-agent.
- Agents/Sandbox: clarify system prompt path guidance so sandbox `bash/exec` uses container paths (for example `/workspace`) while file tools keep host-bridge mapping, avoiding first-attempt path misses from host-only absolute paths in sandbox command execution. (#17693) Thanks @app/juniordevbot.
- Agents/Context: apply configured model `contextWindow` overrides after provider discovery so `lookupContextTokens()` honors operator config values (including discovery-failure paths). (#17404) Thanks @michaelbship and @vignesh07.
- Agents/Context: derive `lookupContextTokens()` from auth-available model metadata and keep the smallest discovered context window for duplicate model ids, preventing cross-provider cache collisions from overestimating session context limits. (#17586) Thanks @githabideri and @vignesh07.
- Agents/OpenAI: force `store=true` for direct OpenAI Responses/Codex runs to preserve multi-turn server-side conversation state, while leaving proxy/non-OpenAI endpoints unchanged. (#16803) Thanks @mark9232 and @vignesh07.
- Memory/FTS: make `buildFtsQuery` Unicode-aware so non-ASCII queries (including CJK) produce keyword tokens instead of falling back to vector-only search. (#17672) Thanks @KinGP5471.
- Auto-reply/Compaction: resolve `memory/YYYY-MM-DD.md` placeholders with timezone-aware runtime dates and append a `Current time:` line to memory-flush turns, preventing wrong-year memory filenames without making the system prompt time-variant. (#17603, #17633) Thanks @nicholaspapadam-wq and @vignesh07.
- Agents: return an explicit timeout error reply when an embedded run times out before producing any payloads, preventing silent dropped turns during slow cache-refresh transitions. (#16659) Thanks @liaosvcaf and @vignesh07.
- Group chats: always inject group chat context (name, participants, reply guidance) into the system prompt on every turn, not just the first. Prevents the model from losing awareness of which group it's in and incorrectly using the message tool to send to the same group. (#14447) Thanks @tyler6204.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 01b1e350b (docs: note Control UI XSS fix)
=======
=======
- Browser/Agents: when browser control service is unavailable, return explicit non-retry guidance (instead of "try again") so models do not loop on repeated browser tool calls until timeout. (#17673) Thanks @austenstone.
- Subagents: use child-run-based deterministic announce idempotency keys across direct and queued delivery paths (with legacy queued-item fallback) to prevent duplicate announce retries without collapsing distinct same-millisecond announces. (#17150) Thanks @widingmarcus-cyber.
- Subagents/Models: preserve `agents.defaults.model.fallbacks` when subagent sessions carry a model override, so subagent runs fail over to configured fallback models instead of retrying only the overridden primary model.
<<<<<<< HEAD
>>>>>>> 3fe22ea2f (chore(release): align .15 changelog ordering and release notes)
=======
>>>>>>> fc9fae2c2 (chore(changelog): restore 2026.2.15 and move entries to 2026.2.16)
- Telegram: omit `message_thread_id` for DM sends/draft previews and keep forum-topic handling (`id=1` general omitted, non-general kept), preventing DM failures with `400 Bad Request: message thread not found`. (#10942) Thanks @garnetlyx.
- Telegram: replace inbound `<media:audio>` placeholder with successful preflight voice transcript in message body context, preventing placeholder-only prompt bodies for mention-gated voice messages. (#16789) Thanks @Limitless2023.
- Telegram: retry inbound media `getFile` calls (3 attempts with backoff) and gracefully fall back to placeholder-only processing when retries fail, preventing dropped voice/media messages on transient Telegram network errors. (#16154) Thanks @yinghaosang.
- Telegram: finalize streaming preview replies in place instead of sending a second final message, preventing duplicate Telegram assistant outputs at stream completion. (#17218) Thanks @obviyus.
- Discord: preserve channel session continuity when runtime payloads omit `message.channelId` by falling back to event/raw `channel_id` values for routing/session keys, so same-channel messages keep history across turns/restarts. Also align diagnostics so active Discord runs no longer appear as `sessionKey=unknown`. (#17622) Thanks @shakkernerd.
- Discord: dedupe native skill commands by skill name in multi-agent setups to prevent duplicated slash commands with `_2` suffixes. (#17365) Thanks @seewhyme.
- Discord: ensure role allowlist matching uses raw role IDs for message routing authorization. Thanks @xinhuagu.
<<<<<<< HEAD
- Subagents/Models: preserve `agents.defaults.model.fallbacks` when subagent sessions carry a model override, so subagent runs fail over to configured fallback models instead of retrying only the overridden primary model.
- Agents/Security: sanitize workspace paths before embedding into LLM prompts (strip Unicode control/format chars) to prevent instruction injection via malicious directory names. Thanks @aether-ai-agent.
- Agents/Context: apply configured model `contextWindow` overrides after provider discovery so `lookupContextTokens()` honors operator config values (including discovery-failure paths). (#17404) Thanks @michaelbship and @vignesh07.
- Memory/FTS: make `buildFtsQuery` Unicode-aware so non-ASCII queries (including CJK) produce keyword tokens instead of falling back to vector-only search. (#17672) Thanks @KinGP5471.
- Agents/OpenAI: force `store=true` for direct OpenAI Responses/Codex runs to preserve multi-turn server-side conversation state, while leaving proxy/non-OpenAI endpoints unchanged. (#16803) Thanks @mark9232 and @vignesh07.
- Auto-reply/Compaction: resolve `memory/YYYY-MM-DD.md` placeholders with timezone-aware runtime dates and append a `Current time:` line to memory-flush turns, preventing wrong-year memory filenames without making the system prompt time-variant. (#17603, #17633) Thanks @nicholaspapadam-wq and @vignesh07.
- Agents: return an explicit timeout error reply when an embedded run times out before producing any payloads, preventing silent dropped turns during slow cache-refresh transitions. (#16659) Thanks @liaosvcaf and @vignesh07.
- Browser/Agents: when browser control service is unavailable, return explicit non-retry guidance (instead of "try again") so models do not loop on repeated browser tool calls until timeout. (#17673) Thanks @austenstone.
- Subagents: use child-run-based deterministic announce idempotency keys across direct and queued delivery paths (with legacy queued-item fallback) to prevent duplicate announce retries without collapsing distinct same-millisecond announces. (#17150) Thanks @widingmarcus-cyber.
- Auto-reply/WhatsApp/TUI/Web: when a final assistant message is `NO_REPLY` and a messaging tool send succeeded, mirror the delivered messaging-tool text into session-visible assistant output so TUI/Web no longer show `NO_REPLY` placeholders. (#7010) Thanks @Morrowind-Xie.
- Cron: infer `payload.kind="agentTurn"` for model-only `cron.update` payload patches, so partial agent-turn updates do not fail validation when `kind` is omitted. (#15664) Thanks @rodrigouroz.
- Web UI/Agents: hide `BOOTSTRAP.md` in the Agents Files list after onboarding is completed, avoiding confusing missing-file warnings for completed workspaces. (#17491) Thanks @gumadeiras.
>>>>>>> e1e46dc11 (docs: reorder 2026.2.15 changelog entries by impact)
=======
- Web UI/Agents: hide `BOOTSTRAP.md` in the Agents Files list after onboarding is completed, avoiding confusing missing-file warnings for completed workspaces. (#17491) Thanks @gumadeiras.
- Memory/QMD: scope managed collection names per agent and precreate glob-backed collection directories before registration, preventing cross-agent collection clobbering and startup ENOENT failures in fresh workspaces. (#17194) Thanks @jonathanadams96.
- Gateway/Memory: initialize QMD startup sync for every configured agent (not just the default agent), so `memory.qmd.update.onBoot` is effective across multi-agent setups. (#17663) Thanks @HenryLoenwind.
- Auto-reply/WhatsApp/TUI/Web: when a final assistant message is `NO_REPLY` and a messaging tool send succeeded, mirror the delivered messaging-tool text into session-visible assistant output so TUI/Web no longer show `NO_REPLY` placeholders. (#7010) Thanks @Morrowind-Xie.
- Cron: infer `payload.kind="agentTurn"` for model-only `cron.update` payload patches, so partial agent-turn updates do not fail validation when `kind` is omitted. (#15664) Thanks @rodrigouroz.
<<<<<<< HEAD
>>>>>>> 3fe22ea2f (chore(release): align .15 changelog ordering and release notes)
=======
>>>>>>> fc9fae2c2 (chore(changelog): restore 2026.2.15 and move entries to 2026.2.16)
- TUI: make searchable-select filtering and highlight rendering ANSI-aware so queries ignore hidden escape codes and no longer corrupt ANSI styling sequences during match highlighting. (#4519) Thanks @bee4come.
- TUI/Windows: coalesce rapid single-line submit bursts in Git Bash into one multiline message as a fallback when bracketed paste is unavailable, preventing pasted multiline text from being split into multiple sends. (#4986) Thanks @adamkane.
- TUI: suppress false `(no output)` placeholders for non-local empty final events during concurrent runs, preventing external-channel replies from showing empty assistant bubbles while a local run is still streaming. (#5782) Thanks @LagWizard and @vignesh07.
- TUI: preserve copy-sensitive long tokens (URLs/paths/file-like identifiers) during wrapping and overflow sanitization so wrapped output no longer inserts spaces that corrupt copy/paste values. (#17515, #17466, #17505) Thanks @abe238, @trevorpan, and @JasonCry.
<<<<<<< HEAD
- Auto-reply/WhatsApp/TUI/Web: when a final assistant message is `NO_REPLY` and a messaging tool send succeeded, mirror the delivered messaging-tool text into session-visible assistant output so TUI/Web no longer show `NO_REPLY` placeholders. (#7010) Thanks @Morrowind-Xie.
- Gateway/Chat: harden `chat.send` inbound message handling by rejecting null bytes, stripping unsafe control characters, and normalizing Unicode to NFC before dispatch. (#8593) Thanks @fr33d3m0n.
- Gateway/Security: redact sensitive session/path details from `status` responses for non-admin clients; full details remain available to `operator.admin`. (#8590) Thanks @fr33d3m0n.
- Agents: return an explicit timeout error reply when an embedded run times out before producing any payloads, preventing silent dropped turns during slow cache-refresh transitions. (#16659) Thanks @liaosvcaf and @vignesh07.
- Agents/OpenAI: force `store=true` for direct OpenAI Responses/Codex runs to preserve multi-turn server-side conversation state, while leaving proxy/non-OpenAI endpoints unchanged. (#16803) Thanks @mark9232 and @vignesh07.
- Agents/Security: sanitize workspace paths before embedding into LLM prompts (strip Unicode control/format chars) to prevent instruction injection via malicious directory names. Thanks @aether-ai-agent.
- Agents/Context: apply configured model `contextWindow` overrides after provider discovery so `lookupContextTokens()` honors operator config values (including discovery-failure paths). (#17404) Thanks @michaelbship and @vignesh07.
- CLI/Build: make legacy daemon CLI compatibility shim generation tolerant of minimal tsdown daemon export sets, while preserving restart/register compatibility aliases and surfacing explicit errors for unavailable legacy daemon commands. Thanks @vignesh07.
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> fc9fae2c2 (chore(changelog): restore 2026.2.15 and move entries to 2026.2.16)

>>>>>>> 6d66fefbb (chore (changelog): document TUI ANSI-safe searchable-select fix)
=======
- Telegram: replace inbound `<media:audio>` placeholder with successful preflight voice transcript in message body context, preventing placeholder-only prompt bodies for mention-gated voice messages. (#16789) Thanks @Limitless2023.
- Telegram: retry inbound media `getFile` calls (3 attempts with backoff) and gracefully fall back to placeholder-only processing when retries fail, preventing dropped voice/media messages on transient Telegram network errors. (#16154) Thanks @yinghaosang.
- Telegram: finalize streaming preview replies in place instead of sending a second final message, preventing duplicate Telegram assistant outputs at stream completion. (#17218) Thanks @obviyus.
- Cron: infer `payload.kind="agentTurn"` for model-only `cron.update` payload patches, so partial agent-turn updates do not fail validation when `kind` is omitted. (#15664) Thanks @rodrigouroz.
- Subagents: use child-run-based deterministic announce idempotency keys across direct and queued delivery paths (with legacy queued-item fallback) to prevent duplicate announce retries without collapsing distinct same-millisecond announces. (#17150) Thanks @widingmarcus-cyber.
- Discord: ensure role allowlist matching uses raw role IDs for message routing authorization. Thanks @xinhuagu.
<<<<<<< HEAD
>>>>>>> 01b1e350b (docs: note Control UI XSS fix)
=======
=======
- CLI/Build: make legacy daemon CLI compatibility shim generation tolerant of minimal tsdown daemon export sets, while preserving restart/register compatibility aliases and surfacing explicit errors for unavailable legacy daemon commands. Thanks @vignesh07.
>>>>>>> e1e46dc11 (docs: reorder 2026.2.15 changelog entries by impact)

>>>>>>> cbc3de6c9 (docs(changelog): fix conflict marker)
## 2026.2.14
>>>>>>> 58548c729 (docs(changelog): mark 2026.2.14 released)

<<<<<<< HEAD
=======
### Changes

- Telegram: add poll sending via `openclaw message poll` (duration seconds, silent delivery, anonymity controls). (#16209) Thanks @robbyczgw-cla.
- Slack/Discord: add `dmPolicy` + `allowFrom` config aliases for DM access control; legacy `dm.policy` + `dm.allowFrom` keys remain supported and `openclaw doctor --fix` can migrate them.
- Discord: allow exec approval prompts to target channels or both DM+channel via `channels.discord.execApprovals.target`. (#16051) Thanks @leonnardo.
- Sandbox: add `sandbox.browser.binds` to configure browser-container bind mounts separately from exec containers. (#16230) Thanks @seheepeak.
- Discord: add debug logging for message routing decisions to improve `--debug` tracing. (#16202) Thanks @jayleekr.

>>>>>>> 9abf86f7e (docs(changelog): document Slack/Discord dmPolicy aliases)
### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
=======
- Agents: classify external timeout aborts during compaction the same as internal timeouts, preventing unnecessary auth-profile rotation and preserving compaction-timeout snapshot fallback behavior. (#9855) Thanks @mverrilli.
- Sessions/Agents: harden transcript path resolution for mismatched agent context by preserving explicit store roots and adding safe absolute-path fallback to the correct agent sessions directory. (#16288) Thanks @robbyczgw-cla.
>>>>>>> 64b7f3455 (chore: fix changelog attribution)
=======
=======
=======
- CLI/Installation: fix Docker installation hangs on macOS. (#12972) Thanks @vincentkoc.
- Models: fix antigravity opus 4.6 availability follow-up. (#12845) Thanks @vincentkoc.
- Security/Sessions/Telegram: restrict session tool targeting by default to the current session tree (`tools.sessions.visibility`, default `tree`) with sandbox clamping, and pass configured per-account Telegram webhook secrets in webhook mode when no explicit override is provided. Thanks @aether-ai-agent.
>>>>>>> 267bb3c81 (changelog: backfill PR release-note entries (#20839))
- CLI/Plugins: ensure `openclaw message send` exits after successful delivery across plugin-backed channels so one-shot sends do not hang. (#16491) Thanks @yinghaosang.
- CLI/Plugins: run registered plugin `gateway_stop` hooks before `openclaw message` exits (success and failure paths), so plugin-backed channels can clean up one-shot CLI resources. (#16580) Thanks @gumadeiras.
- WhatsApp: honor per-account `dmPolicy` overrides (account-level settings now take precedence over channel defaults for inbound DMs). (#10082) Thanks @mcaxtr.
>>>>>>> c1feda14f (docs(changelog): reorder 2026.2.14 notes)
- Telegram: when `channels.telegram.commands.native` is `false`, exclude plugin commands from `setMyCommands` menu registration while keeping plugin slash handlers callable. (#15132) Thanks @Glucksberg.
- Cron: deliver text-only output directly when `delivery.to` is set so cron recipients get full output instead of summaries. (#16360) Thanks @thewilloftheshadow.
<<<<<<< HEAD
- CLI/Plugins: ensure `openclaw message send` exits after successful delivery across plugin-backed channels so one-shot sends do not hang. (#16491) Thanks @yinghaosang.
- CLI/Plugins: run registered plugin `gateway_stop` hooks before `openclaw message` exits (success and failure paths), so plugin-backed channels can clean up one-shot CLI resources. (#16580) Thanks @gumadeiras.
- CLI: fix lazy core command registration so top-level maintenance commands (`doctor`, `dashboard`, `reset`, `uninstall`) resolve correctly instead of exposing a non-functional `maintenance` placeholder command.
- CLI/Dashboard: when `gateway.bind=lan`, generate localhost dashboard URLs to satisfy browser secure-context requirements while preserving non-LAN bind behavior. (#16434) Thanks @BinHPdev.
>>>>>>> 90117a384 (docs: consolidate 2026.2.14 changelog)
- BlueBubbles: include sender identity in group chat envelopes and pass clean message text to the agent prompt, aligning with iMessage/Signal formatting. (#16210) Thanks @zerone0x.
<<<<<<< HEAD
=======
- WhatsApp: honor per-account `dmPolicy` overrides (account-level settings now take precedence over channel defaults for inbound DMs). (#10082) Thanks @mcaxtr.
- Media: accept `MEDIA:`-prefixed paths (lenient whitespace) when loading outbound media to prevent `ENOENT` for tool-returned local media paths. (#13107) Thanks @mcaxtr.
<<<<<<< HEAD
- Security/Scripts: validate GitHub logins and avoid shell invocation in `scripts/update-clawtributors.ts` to prevent command injection via malicious commit records. Thanks @scanleale.
- Security/Gateway: harden tool-supplied `gatewayUrl` overrides by restricting them to loopback or the configured `gateway.remote.url`. Thanks @p80n-sec.
- Security/Net: fix SSRF guard bypass via full-form IPv4-mapped IPv6 literals (blocks loopback/private/metadata access). Thanks @yueyueL.
>>>>>>> d02202e76 (docs(changelog): note clawtributors updater injection fix)
- Security/Node Host: enforce `system.run` rawCommand/argv consistency to prevent allowlist/approval bypass. Thanks @christos-eth.
<<<<<<< HEAD
=======
- Security/Exec approvals: prevent safeBins allowlist bypass via shell expansion (host exec allowlist mode only; not enabled by default). Thanks @christos-eth.
- Security/Gateway: block `system.execApprovals.*` via `node.invoke` (use `exec.approvals.node.*` instead). Thanks @christos-eth.
- Security/Exec: harden PATH handling by disabling project-local `node_modules/.bin` bootstrapping by default, disallowing node-host `PATH` overrides, and spawning ACP servers via the current executable by default. Thanks @akhmittra.
>>>>>>> 938b1dd1e (docs(changelog): fix gatewayUrl SSRF entry)
- CLI: fix lazy core command registration so top-level maintenance commands (`doctor`, `dashboard`, `reset`, `uninstall`) resolve correctly instead of exposing a non-functional `maintenance` placeholder command.
>>>>>>> df7464ddf (fix(bluebubbles): include sender identity in group chat envelopes (#16326))
- Security/Agents: scope CLI process cleanup to owned child PIDs to avoid killing unrelated processes on shared hosts. Thanks @aether-ai-agent.
- Security/Agents (macOS): prevent shell injection when writing Claude CLI keychain credentials. (#15924) Thanks @aether-ai-agent.
- Security: fix Chutes manual OAuth login state validation (thanks @aether-ai-agent). (#16058)
- Security/Voice Call (Telnyx): require webhook signature verification when receiving inbound events; configs without `telnyx.publicKey` are now rejected unless `skipSignatureVerification` is enabled. Thanks @p80n-sec.
- Security/Discovery: stop treating Bonjour TXT records as authoritative routing (prefer resolved service endpoints) and prevent discovery from overriding stored TLS pins; autoconnect now requires a previously trusted gateway. Thanks @simecek.
>>>>>>> 29b587e73 (fix(voice-call): fail closed when Telnyx webhook public key missing)
- macOS: hard-limit unkeyed `openclaw://agent` deep links and ignore `deliver` / `to` / `channel` unless a valid unattended key is provided. Thanks @Cillian-Collins.
<<<<<<< HEAD
=======
- Plugins: suppress false duplicate plugin id warnings when the same extension is discovered via multiple paths (config/workspace/global vs bundled), while still warning on genuine duplicates. (#16222) Thanks @shadril238.
- Security/Voice Call: require valid Twilio webhook signatures even when ngrok free tier loopback compatibility mode is enabled. Thanks @p80n-sec.
>>>>>>> ff11d8793 (fix(voice-call): require Twilio signature in ngrok loopback mode)
- Security/Google Chat: deprecate `users/<email>` allowlists (treat `users/...` as immutable user id only); keep raw email allowlists for usability. Thanks @vincentkoc.
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Security/Google Chat: reject ambiguous shared-path webhook routing when multiple webhook targets verify successfully (prevents cross-account policy-context misrouting). Thanks @vincentkoc.
>>>>>>> 61d59a802 (fix(googlechat): reject ambiguous webhook routing)
- Security/Browser: block cross-origin mutating requests to loopback browser control routes (CSRF hardening). Thanks @vincentkoc.
<<<<<<< HEAD
=======
- Security/iMessage: keep DM pairing-store identities out of group allowlist authorization (prevents cross-context command authorization). Thanks @vincentkoc.
- Security/Slack: compute command authorization for DM slash commands even when `dmPolicy=open`, preventing unauthorized users from running privileged commands via DM. Thanks @christos-eth.
>>>>>>> 90d1e9cd7 (docs(changelog): note iMessage group allowlist auth fix)
- Security/Nostr: require loopback source and block cross-origin profile mutation/import attempts. Thanks @vincentkoc.
- Security/Archive: enforce archive extraction entry/size limits to prevent resource exhaustion from high-expansion ZIP/TAR archives. Thanks @vincentkoc.
- Security/Media: reject oversized base64-backed input media before decoding to avoid large allocations. Thanks @vincentkoc.
- Security/Gateway: reject oversized base64 chat attachments before decoding to avoid large allocations. Thanks @vincentkoc.
<<<<<<< HEAD
>>>>>>> b87b16e2b (docs(changelog): note browser CSRF hardening)
=======
- Security/Gateway: stop returning raw resolved config values in `skills.status` requirement checks (prevents operator.read clients from reading secrets). Thanks @simecek.
- Security/Zalo: reject ambiguous shared-path webhook routing when multiple webhook targets match the same secret.
- Security/BlueBubbles: reject ambiguous shared-path webhook routing when multiple webhook targets match the same guid/password.
- Cron/Slack: preserve agent identity (name and icon) when cron jobs deliver outbound messages. (#16242) Thanks @robbyczgw-cla.
<<<<<<< HEAD
=======
- Cron: deliver text-only output directly when `delivery.to` is set so cron recipients get full output instead of summaries. (#16360) Thanks @thewilloftheshadow.
=======
- Cron/Slack: preserve agent identity (name and icon) when cron jobs deliver outbound messages. (#16242) Thanks @robbyczgw-cla.
>>>>>>> 90117a384 (docs: consolidate 2026.2.14 changelog)
=======
- Cron/Slack: preserve agent identity (name and icon) when cron jobs deliver outbound messages. (#16242) Thanks @robbyczgw-cla.
- Media: accept `MEDIA:`-prefixed paths (lenient whitespace) when loading outbound media to prevent `ENOENT` for tool-returned local media paths. (#13107) Thanks @mcaxtr.
- Media understanding: treat binary `application/vnd.*`/zip/octet-stream attachments as non-text (while keeping vendor `+json`/`+xml` text-eligible) so Office/ZIP files are not inlined into prompt body text. (#16513) Thanks @rmramsey32.
- Agents: deliver tool result media (screenshots, images, audio) to channels regardless of verbose level. (#11735) Thanks @strelov1.
<<<<<<< HEAD
=======
- Auto-reply/Block streaming: strip leading whitespace from streamed block replies so messages starting with blank lines no longer deliver visible leading empty lines. (#16422) Thanks @mcinteerj.
- Auto-reply/Queue: keep queued followups and overflow summaries when drain attempts fail, then retry delivery instead of dropping messages on transient errors. (#16771) Thanks @mmhzlrj.
>>>>>>> 568e7c4f6 (chore (changelog): note followup queue retry hardening)
- Agents/Image tool: allow workspace-local image paths by including the active workspace directory in local media allowlists, and trust sandbox-validated paths in image loaders to prevent false "not under an allowed directory" rejections. (#15541)
- Agents/Image tool: propagate the effective workspace root into tool wiring so workspace-local image paths are accepted by default when running without an explicit `workspaceDir`. (#16722)
- BlueBubbles: include sender identity in group chat envelopes and pass clean message text to the agent prompt, aligning with iMessage/Signal formatting. (#16210) Thanks @zerone0x.
- CLI: fix lazy core command registration so top-level maintenance commands (`doctor`, `dashboard`, `reset`, `uninstall`) resolve correctly instead of exposing a non-functional `maintenance` placeholder command.
- CLI/Dashboard: when `gateway.bind=lan`, generate localhost dashboard URLs to satisfy browser secure-context requirements while preserving non-LAN bind behavior. (#16434) Thanks @BinHPdev.
- TUI/Gateway: resolve local gateway target URL from `gateway.bind` mode (tailnet/lan) instead of hardcoded localhost so `openclaw tui` connects when gateway is non-loopback. (#16299) Thanks @cortexuvula.
- TUI: honor explicit `--session <key>` in `openclaw tui` even when `session.scope` is `global`, so named sessions no longer collapse into shared global history. (#16575) Thanks @cinqu.
- TUI: use available terminal width for session name display in searchable select lists. (#16238) Thanks @robbyczgw-cla.
- TUI: preserve in-flight streaming replies when a different run finalizes concurrently (avoid clearing active run or reloading history mid-stream). (#10704) Thanks @axschr73.
- TUI: keep pre-tool streamed text visible when later tool-boundary deltas temporarily omit earlier text blocks. (#6958) Thanks @KrisKind75.
- TUI: sanitize ANSI/control-heavy history text, redact binary-like lines, and split pathological long unbroken tokens before rendering to prevent startup crashes on binary attachment history. (#13007) Thanks @wilkinspoe.
- TUI: harden render-time sanitizer for narrow terminals by chunking moderately long unbroken tokens and adding fast-path sanitization guards to reduce overhead on normal text. (#5355) Thanks @tingxueren.
- TUI: render assistant body text in terminal default foreground (instead of fixed light ANSI color) so contrast remains readable on light themes such as Solarized Light. (#16750) Thanks @paymog.
- TUI/Hooks: pass explicit reset reason (`new` vs `reset`) through `sessions.reset` and emit internal command hooks for gateway-triggered resets so `/new` hook workflows fire in TUI/webchat.
<<<<<<< HEAD
>>>>>>> c1feda14f (docs(changelog): reorder 2026.2.14 notes)
=======
- Gateway/Agent: route bare `/new` and `/reset` through `sessions.reset` before running the fresh-session greeting prompt, so reset commands clear the current session in-place instead of falling through to normal agent runs. (#16732) Thanks @kdotndot and @vignesh07.
>>>>>>> 14b1bcd2e (docs (changelog): note gateway agent reset command routing)
- Cron: prevent `cron list`/`cron status` from silently skipping past-due recurring jobs by using maintenance recompute semantics. (#16156) Thanks @zerone0x.
- Cron: repair missing/corrupt `nextRunAtMs` for the updated job without globally recomputing unrelated due jobs during `cron update`. (#15750)
<<<<<<< HEAD
>>>>>>> 2fa78c17d (Changelog: credit cron delivery fix)
=======
- Cron: skip missed-job replay on startup for jobs interrupted mid-run (stale `runningAtMs` markers), preventing restart loops for self-restarting jobs such as update tasks. (#16694) Thanks @sbmilburn.
<<<<<<< HEAD
>>>>>>> 70cf0e4d4 (chore (changelog): note cron interrupted-start replay fix)
=======
- Heartbeat/Cron: treat cron-tagged queued system events as cron reminders even on interval wakes, so isolated cron announce summaries no longer run under the default heartbeat prompt. (#14947) Thanks @archedark-ada and @vignesh07.
>>>>>>> cb54a532f (chore (changelog): document cron heartbeat prompt hardening)
- Discord: prefer gateway guild id when logging inbound messages so cached-miss guilds do not appear as `guild=dm`. Thanks @thewilloftheshadow.
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 3e6d1e9cf (docs: update changelog)

## 2026.2.14

### Fixes

<<<<<<< HEAD
=======
- Feishu/Security: harden media URL fetching against SSRF and local file disclosure. (#16285) Thanks @mbelinky.
=======
- TUI: use available terminal width for session name display in searchable select lists. (#16238) Thanks @robbyczgw-cla.
- TUI: refactor searchable select list description layout and add regression coverage for ANSI-highlight width bounds.
- TUI/Gateway: resolve local gateway target URL from `gateway.bind` mode (tailnet/lan) instead of hardcoded localhost so `openclaw tui` connects when gateway is non-loopback. (#16299) Thanks @cortexuvula.
- TUI: honor explicit `--session <key>` in `openclaw tui` even when `session.scope` is `global`, so named sessions no longer collapse into shared global history. (#16575) Thanks @cinqu.
- TUI: preserve in-flight streaming replies when a different run finalizes concurrently (avoid clearing active run or reloading history mid-stream). (#10704) Thanks @axschr73.
- TUI: sanitize ANSI/control-heavy history text, redact binary-like lines, and split pathological long unbroken tokens before rendering to prevent startup crashes on binary attachment history. (#13007) Thanks @wilkinspoe.
- TUI: keep pre-tool streamed text visible when later tool-boundary deltas temporarily omit earlier text blocks. (#6958) Thanks @KrisKind75.
- TUI: harden render-time sanitizer for narrow terminals by chunking moderately long unbroken tokens and adding fast-path sanitization guards to reduce overhead on normal text. (#5355) Thanks @tingxueren.
- Sandbox/Tools: make sandbox file tools bind-mount aware (including absolute container paths) and enforce read-only bind semantics for writes. (#16379) Thanks @tasaankaeris.
- Media/Security: allow local media reads from OpenClaw state `workspace/` and `sandboxes/` roots by default so generated workspace media can be delivered without unsafe global path bypasses. (#15541) Thanks @lanceji.
=======
>>>>>>> c1feda14f (docs(changelog): reorder 2026.2.14 notes)
=======
=======
- Discord: ensure role allowlist matching uses raw role IDs for message routing authorization. Thanks @thewilloftheshadow.
>>>>>>> 8678b10ae (Docs: add discord role allowlist changelog entry)
=======
>>>>>>> 99caaef6c (Revert "Docs: add discord role allowlist changelog entry")
- Discord: treat empty per-guild `channels: {}` config maps as no channel allowlist (not deny-all), so `groupPolicy: "open"` guilds without explicit channel entries continue to receive messages. (#16714) Thanks @xqliu.
>>>>>>> c3e87da2d (chore (changelog): note discord empty channels allowlist fix)
- Models/CLI: guard `models status` string trimming paths to prevent crashes from malformed non-string config values. (#16395) Thanks @BinHPdev.
- Gateway/Subagents: preserve queued announce items and summary state on delivery errors, retry failed announce drains, and avoid dropping unsent announcements on timeout/failure. (#16729) Thanks @Clawdette-Workspace.
- Gateway/Config: make `config.patch` merge object arrays by `id` (for example `agents.list`) instead of replacing the whole array, so partial agent updates do not silently delete unrelated agents. (#6766) Thanks @lightclient.
- Webchat/Prompts: stop injecting direct-chat `conversation_label` into inbound untrusted metadata context blocks, preventing internal label noise from leaking into visible chat replies. (#16556) Thanks @nberardi.
- Auto-reply/Prompts: include trusted inbound `message_id`, `chat_id`, `reply_to_id`, and optional `message_id_full` metadata fields so action tools (for example reactions) can target the triggering message without relying on user text. (#17662) Thanks @MaikiMolto.
- Gateway/Sessions: abort active embedded runs and clear queued session work before `sessions.reset`, returning unavailable if the run does not stop in time. (#16576) Thanks @Grynn.
<<<<<<< HEAD
<<<<<<< HEAD
=======
- Agents/Process/Bootstrap: preserve unbounded `process log` offset-only pagination (default tail applies only when both `offset` and `limit` are omitted) and enforce strict `bootstrapTotalMaxChars` budgeting across injected bootstrap content (including markers), skipping additional injection when remaining budget is too small. (#16539) Thanks @CharlieGreenman.
- Agents/Workspace: persist bootstrap onboarding state so partially initialized workspaces recover missing `BOOTSTRAP.md` once, while completed onboarding keeps BOOTSTRAP deleted even if runtime files are later recreated. Thanks @gumadeiras.
>>>>>>> a8c30634a (changelog: add workspace onboarding attribution)
- Sessions/Agents: harden transcript path resolution for mismatched agent context by preserving explicit store roots and adding safe absolute-path fallback to the correct agent sessions directory. (#16288) Thanks @robbyczgw-cla.
- Agents: keep unresolved mutating tool failures visible until the same action retry succeeds, scope mutation-error surfacing to mutating calls (including `session_status` model changes), and dedupe duplicate failure warnings in outbound replies. (#16131) Thanks @Swader.
=======
- Sessions/Agents: harden transcript path resolution for mismatched agent context by preserving explicit store roots and adding safe absolute-path fallback to the correct agent sessions directory. (#16288) Thanks @robbyczgw-cla.
- Agents: add a safety timeout around embedded `session.compact()` to ensure stalled compaction runs settle and release blocked session lanes. (#16331) Thanks @BinHPdev.
- Agents: keep unresolved mutating tool failures visible until the same action retry succeeds, scope mutation-error surfacing to mutating calls (including `session_status` model changes), and dedupe duplicate failure warnings in outbound replies. (#16131) Thanks @Swader.
- Agents/Process/Bootstrap: preserve unbounded `process log` offset-only pagination (default tail applies only when both `offset` and `limit` are omitted) and enforce strict `bootstrapTotalMaxChars` budgeting across injected bootstrap content (including markers), skipping additional injection when remaining budget is too small. (#16539) Thanks @CharlieGreenman.
- Agents/Workspace: persist bootstrap onboarding state so partially initialized workspaces recover missing `BOOTSTRAP.md` once, while completed onboarding keeps BOOTSTRAP deleted even if runtime files are later recreated. Thanks @gumadeiras.
- Agents/Workspace: create `BOOTSTRAP.md` when core workspace files are seeded in partially initialized workspaces, while keeping BOOTSTRAP one-shot after onboarding deletion. (#16457) Thanks @robbyczgw-cla.
>>>>>>> c1feda14f (docs(changelog): reorder 2026.2.14 notes)
- Agents: classify external timeout aborts during compaction the same as internal timeouts, preventing unnecessary auth-profile rotation and preserving compaction-timeout snapshot fallback behavior. (#9855) Thanks @mverrilli.
- Agents: treat empty-stream provider failures (`request ended without sending any chunks`) as timeout-class failover signals, enabling auth-profile rotation/fallback and showing a friendly timeout message instead of raw provider errors. (#10210) Thanks @zenchantlive.
- Agents: treat `read` tool `file_path` arguments as valid in tool-start diagnostics to avoid false “read tool called without path” warnings when alias parameters are used. (#16717) Thanks @Stache73.
- Agents/Transcript: drop malformed tool-call blocks with blank required fields (`id`/`name` or missing `input`/`arguments`) during session transcript repair to prevent persistent tool-call corruption on future turns. (#15485) Thanks @mike-zachariades.
- Tools/Write/Edit: normalize structured text-block arguments for `content`/`oldText`/`newText` before filesystem edits, preventing JSON-like file corruption and false “exact text not found” misses from block-form params. (#16778) Thanks @danielpipernz.
- Ollama/Agents: avoid forcing `<final>` tag enforcement for Ollama models, which could suppress all output as `(no output)`. (#16191) Thanks @Glucksberg.
- Plugins: suppress false duplicate plugin id warnings when the same extension is discovered via multiple paths (config/workspace/global vs bundled), while still warning on genuine duplicates. (#16222) Thanks @shadril238.
- Skills: watch `SKILL.md` only when refreshing skills snapshot to avoid file-descriptor exhaustion in large data trees. (#11325) Thanks @household-bard.
<<<<<<< HEAD
- Scripts/Security: validate GitHub logins and avoid shell invocation in `scripts/update-clawtributors.ts` to prevent command injection via malicious commit records. Thanks @scanleale.
- macOS: hard-limit unkeyed `openclaw://agent` deep links and ignore `deliver` / `to` / `channel` unless a valid unattended key is provided. Thanks @Cillian-Collins.
- Memory/QMD: cap QMD command output buffering to prevent memory exhaustion from pathological `qmd` command output.
- Memory/QMD: parse qmd scope keys once per request to avoid repeated parsing in scope checks.
- Memory/QMD: query QMD index using exact docid matches before falling back to prefix lookup for better recall correctness and index efficiency.
- Memory/QMD: make QMD result JSON parsing resilient to noisy command output by extracting the first JSON array from noisy `stdout`.
<<<<<<< HEAD
=======
- Memory/QMD: treat prefixed `no results found` marker output as an empty result set in qmd JSON parsing. (#11302) Thanks @blazerui.
- Security/Memory-LanceDB: treat recalled memories as untrusted context (escape injected memory text + explicit non-instruction framing), skip likely prompt-injection payloads during auto-capture, and restrict auto-capture to user messages to reduce memory-poisoning risk. (#12524) Thanks @davidschmid24.
- Security/Memory-LanceDB: require explicit `autoCapture: true` opt-in (default is now disabled) to prevent automatic PII capture unless operators intentionally enable it. (#12552) Thanks @fr33d3m0n.
- Memory/Builtin: narrow memory watcher targets to markdown globs and ignore dependency/venv directories to reduce file-descriptor pressure during memory sync startup. (#11721) Thanks @rex05ai.
- Memory/Builtin: keep `memory status` dirty reporting stable across invocations by deriving status-only manager dirty state from persisted index metadata instead of process-start defaults. (#10863) Thanks @BarryYangi.
- Memory/QMD: make `memory status` read-only by skipping QMD boot update/embed side effects for status-only manager checks.
- Memory/QMD: keep original QMD failures when builtin fallback initialization fails (for example missing embedding API keys), instead of replacing them with fallback init errors.
- TUI/Hooks: pass explicit reset reason (`new` vs `reset`) through `sessions.reset` and emit internal command hooks for gateway-triggered resets so `/new` hook workflows fire in TUI/webchat.
>>>>>>> d70cc3954 (Changelog: note memory watcher FD-pressure hardening)
- Memory/QMD: pass result limits to `search`/`vsearch` commands so QMD can cap results earlier.
- Memory/QMD: avoid reading full markdown files when a `from/lines` window is requested in QMD reads.
- Memory/QMD: skip rewriting unchanged session export markdown files during sync to reduce disk churn.
<<<<<<< HEAD
>>>>>>> 90117a384 (docs: consolidate 2026.2.14 changelog)
=======
- Memory/QMD: detect null-byte `ENOTDIR` update failures, rebuild managed collections once, and retry update to self-heal corrupted collection metadata. (#12919) Thanks @jorgejhms.
>>>>>>> 28ff75562 (Changelog: note QMD null-byte collection self-heal)
=======
- Memory/QMD: make `memory status` read-only by skipping QMD boot update/embed side effects for status-only manager checks.
- Memory/QMD: keep original QMD failures when builtin fallback initialization fails (for example missing embedding API keys), instead of replacing them with fallback init errors.
- Memory/Builtin: keep `memory status` dirty reporting stable across invocations by deriving status-only manager dirty state from persisted index metadata instead of process-start defaults. (#10863) Thanks @BarryYangi.
- Memory/QMD: cap QMD command output buffering to prevent memory exhaustion from pathological `qmd` command output.
- Memory/QMD: parse qmd scope keys once per request to avoid repeated parsing in scope checks.
- Memory/QMD: query QMD index using exact docid matches before falling back to prefix lookup for better recall correctness and index efficiency.
- Memory/QMD: pass result limits to `search`/`vsearch` commands so QMD can cap results earlier.
- Memory/QMD: avoid reading full markdown files when a `from/lines` window is requested in QMD reads.
- Memory/QMD: skip rewriting unchanged session export markdown files during sync to reduce disk churn.
- Memory/QMD: make QMD result JSON parsing resilient to noisy command output by extracting the first JSON array from noisy `stdout`.
- Memory/QMD: treat prefixed `no results found` marker output as an empty result set in qmd JSON parsing. (#11302) Thanks @blazerui.
- Memory/QMD: avoid multi-collection `query` ranking corruption by running one `qmd query -c <collection>` per managed collection and merging by best score (also used for `search`/`vsearch` fallback-to-query). (#16740) Thanks @volarian-vai.
- Memory/QMD: rebind managed collections when existing collection metadata drifts (including sessions name-only listings), preventing non-default agents from reusing another agent's `sessions` collection path. (#17194) Thanks @jonathanadams96.
- Memory/QMD: make `openclaw memory index` verify and print the active QMD index file path/size, and fail when QMD leaves a missing or zero-byte index artifact after an update. (#16775) Thanks @Shunamxiao.
- Memory/QMD: detect null-byte `ENOTDIR` update failures, rebuild managed collections once, and retry update to self-heal corrupted collection metadata. (#12919) Thanks @jorgejhms.
- Memory/QMD/Security: add `rawKeyPrefix` support for QMD scope rules and preserve legacy `keyPrefix: "agent:..."` matching, preventing scoped deny bypass when operators match agent-prefixed session keys.
- Memory/Builtin: narrow memory watcher targets to markdown globs and ignore dependency/venv directories to reduce file-descriptor pressure during memory sync startup. (#11721) Thanks @rex05ai.
- Security/Memory-LanceDB: treat recalled memories as untrusted context (escape injected memory text + explicit non-instruction framing), skip likely prompt-injection payloads during auto-capture, and restrict auto-capture to user messages to reduce memory-poisoning risk. (#12524) Thanks @davidschmid24.
- Security/Memory-LanceDB: require explicit `autoCapture: true` opt-in (default is now disabled) to prevent automatic PII capture unless operators intentionally enable it. (#12552) Thanks @fr33d3m0n.
- Diagnostics/Memory: prune stale diagnostic session state entries and cap tracked session states to prevent unbounded in-memory growth on long-running gateways. (#5136) Thanks @coygeek and @vignesh07.
- Gateway/Memory: clean up `agentRunSeq` tracking on run completion/abort and enforce maintenance-time cap pruning to prevent unbounded sequence-map growth over long uptimes. (#6036) Thanks @coygeek and @vignesh07.
- Auto-reply/Memory: bound `ABORT_MEMORY` growth by evicting oldest entries and deleting reset (`false`) flags so abort state tracking cannot grow unbounded over long uptimes. (#6629) Thanks @coygeek and @vignesh07.
- Slack/Memory: bound thread-starter cache growth with TTL + max-size pruning to prevent long-running Slack gateways from accumulating unbounded thread cache state. (#5258) Thanks @coygeek and @vignesh07.
- Outbound/Memory: bound directory cache growth with max-size eviction and proactive TTL pruning to prevent long-running gateways from accumulating unbounded directory entries. (#5140) Thanks @coygeek and @vignesh07.
- Skills/Memory: remove disconnected nodes from remote-skills cache to prevent stale node metadata from accumulating over long uptimes. (#6760) Thanks @coygeek.
- Sandbox/Tools: make sandbox file tools bind-mount aware (including absolute container paths) and enforce read-only bind semantics for writes. (#16379) Thanks @tasaankaeris.
- Sandbox/Prompts: show the sandbox container workdir as the prompt working directory and clarify host-path usage for file tools, preventing host-path `exec` failures in sandbox sessions. (#16790) Thanks @carrotRakko.
- Media/Security: allow local media reads from OpenClaw state `workspace/` and `sandboxes/` roots by default so generated workspace media can be delivered without unsafe global path bypasses. (#15541) Thanks @lanceji.
- Media/Security: harden local media allowlist bypasses by requiring an explicit `readFile` override when callers mark paths as validated, and reject filesystem-root `localRoots` entries. (#16739)
- Discord/Security: harden voice message media loading (SSRF + allowed-local-root checks) so tool-supplied paths/URLs cannot be used to probe internal URLs or read arbitrary local files.
- Security/BlueBubbles: require explicit `mediaLocalRoots` allowlists for local outbound media path reads to prevent local file disclosure. (#16322) Thanks @mbelinky.
- Security/BlueBubbles: reject ambiguous shared-path webhook routing when multiple webhook targets match the same guid/password.
- Security/BlueBubbles: harden BlueBubbles webhook auth behind reverse proxies by only accepting passwordless webhooks for direct localhost loopback requests (forwarded/proxied requests now require a password). Thanks @simecek.
- Feishu/Security: harden media URL fetching against SSRF and local file disclosure. (#16285) Thanks @mbelinky.
- Security/Zalo: reject ambiguous shared-path webhook routing when multiple webhook targets match the same secret.
- Security/Nostr: require loopback source and block cross-origin profile mutation/import attempts. Thanks @vincentkoc.
- Security/Signal: harden signal-cli archive extraction during install to prevent path traversal outside the install root.
- Security/Hooks: restrict hook transform modules to `~/.openclaw/hooks/transforms` (prevents path traversal/escape module loads via config). Config note: `hooks.transformsDir` must now be within that directory. Thanks @akhmittra.
- Security/Hooks: ignore hook package manifest entries that point outside the package directory (prevents out-of-tree handler loads during hook discovery).
- Security/Archive: enforce archive extraction entry/size limits to prevent resource exhaustion from high-expansion ZIP/TAR archives. Thanks @vincentkoc.
- Security/Media: reject oversized base64-backed input media before decoding to avoid large allocations. Thanks @vincentkoc.
- Security/Media: stream and bound URL-backed input media fetches to prevent memory exhaustion from oversized responses. Thanks @vincentkoc.
- Security/Skills: harden archive extraction for download-installed skills to prevent path traversal outside the target directory. Thanks @markmusson.
- Security/Slack: compute command authorization for DM slash commands even when `dmPolicy=open`, preventing unauthorized users from running privileged commands via DM. Thanks @christos-eth.
- Security/Pairing: scope pairing allowlist writes/reads to channel accounts (for example `telegram:yy`), and propagate account-aware pairing approvals so multi-account channels do not share a single per-channel pairing allowFrom store. (#17631) Thanks @crazytan.
- Security/iMessage: keep DM pairing-store identities out of group allowlist authorization (prevents cross-context command authorization). Thanks @vincentkoc.
- Security/Google Chat: deprecate `users/<email>` allowlists (treat `users/...` as immutable user id only); keep raw email allowlists for usability. Thanks @vincentkoc.
- Security/Google Chat: reject ambiguous shared-path webhook routing when multiple webhook targets verify successfully (prevents cross-account policy-context misrouting). Thanks @vincentkoc.
>>>>>>> c1feda14f (docs(changelog): reorder 2026.2.14 notes)
- Telegram/Security: require numeric Telegram sender IDs for allowlist authorization (reject `@username` principals), auto-resolve `@username` to IDs in `openclaw doctor --fix` (when possible), and warn in `openclaw security audit` when legacy configs contain usernames. Thanks @vincentkoc.
- Telegram/Security: reject Telegram webhook startup when `webhookSecret` is missing or empty (prevents unauthenticated webhook request forgery). Thanks @yueyueL.
- Security/Windows: avoid shell invocation when spawning child processes to prevent cmd.exe metacharacter injection via untrusted CLI arguments (e.g. agent prompt text).
- Telegram: set webhook callback timeout handling to `onTimeout: "return"` (10s) so long-running update processing no longer emits webhook 500s and retry storms. (#16763) Thanks @chansearrington.
- Signal: preserve case-sensitive `group:` target IDs during normalization so mixed-case group IDs no longer fail with `Group not found`. (#16748) Thanks @repfigit.
- Security/Agents: scope CLI process cleanup to owned child PIDs to avoid killing unrelated processes on shared hosts. Thanks @aether-ai-agent.
- Security/Agents: enforce workspace-root path bounds for `apply_patch` in non-sandbox mode to block traversal and symlink escape writes. Thanks @p80n-sec.
- Security/Agents (macOS): prevent shell injection when writing Claude CLI keychain credentials. (#15924) Thanks @aether-ai-agent.
- macOS: hard-limit unkeyed `openclaw://agent` deep links and ignore `deliver` / `to` / `channel` unless a valid unattended key is provided. Thanks @Cillian-Collins.
- Scripts/Security: validate GitHub logins and avoid shell invocation in `scripts/update-clawtributors.ts` to prevent command injection via malicious commit records. Thanks @scanleale.
- Security: fix Chutes manual OAuth login state validation by requiring the full redirect URL (reject code-only pastes) (thanks @aether-ai-agent).
- Security/Gateway: harden tool-supplied `gatewayUrl` overrides by restricting them to loopback or the configured `gateway.remote.url`. Thanks @p80n-sec.
- Security/Gateway: block `system.execApprovals.*` via `node.invoke` (use `exec.approvals.node.*` instead). Thanks @christos-eth.
- Security/Gateway: reject oversized base64 chat attachments before decoding to avoid large allocations. Thanks @vincentkoc.
- Security/Gateway: stop returning raw resolved config values in `skills.status` requirement checks (prevents operator.read clients from reading secrets). Thanks @simecek.
- Security/Net: fix SSRF guard bypass via full-form IPv4-mapped IPv6 literals (blocks loopback/private/metadata access). Thanks @yueyueL.
- Security/Browser: harden browser control file upload + download helpers to prevent path traversal / local file disclosure. Thanks @1seal.
<<<<<<< HEAD
>>>>>>> 1bde33c0b (docs(changelog): note browser control path traversal fix)
=======
- Security/Browser: block cross-origin mutating requests to loopback browser control routes (CSRF hardening). Thanks @vincentkoc.
- Security/Node Host: enforce `system.run` rawCommand/argv consistency to prevent allowlist/approval bypass. Thanks @christos-eth.
- Security/Exec approvals: prevent safeBins allowlist bypass via shell expansion (host exec allowlist mode only; not enabled by default). Thanks @christos-eth.
- Security/Exec: harden PATH handling by disabling project-local `node_modules/.bin` bootstrapping by default, disallowing node-host `PATH` overrides, and spawning ACP servers via the current executable by default. Thanks @akhmittra.
- Security/Tlon: harden Urbit URL fetching against SSRF by blocking private/internal hosts by default (opt-in: `channels.tlon.allowPrivateNetwork`). Thanks @p80n-sec.
- Security/Voice Call (Telnyx): require webhook signature verification when receiving inbound events; configs without `telnyx.publicKey` are now rejected unless `skipSignatureVerification` is enabled. Thanks @p80n-sec.
- Security/Voice Call: require valid Twilio webhook signatures even when ngrok free tier loopback compatibility mode is enabled. Thanks @p80n-sec.
- Security/Discovery: stop treating Bonjour TXT records as authoritative routing (prefer resolved service endpoints) and prevent discovery from overriding stored TLS pins; autoconnect now requires a previously trusted gateway. Thanks @simecek.
<<<<<<< HEAD
- Security/Google Chat: deprecate `users/<email>` allowlists (treat `users/...` as immutable user id only); keep raw email allowlists for usability. Thanks @vincentkoc.
- Security/Google Chat: reject ambiguous shared-path webhook routing when multiple webhook targets verify successfully (prevents cross-account policy-context misrouting). Thanks @vincentkoc.
- Security/iMessage: keep DM pairing-store identities out of group allowlist authorization (prevents cross-context command authorization). Thanks @vincentkoc.
- Diagnostics/Memory: prune stale diagnostic session state entries and cap tracked session states to prevent unbounded in-memory growth on long-running gateways. (#5136) Thanks @coygeek and @vignesh07.
- Gateway/Memory: clean up `agentRunSeq` tracking on run completion/abort and enforce maintenance-time cap pruning to prevent unbounded sequence-map growth over long uptimes. (#6036) Thanks @coygeek and @vignesh07.
- Auto-reply/Memory: bound `ABORT_MEMORY` growth by evicting oldest entries and deleting reset (`false`) flags so abort state tracking cannot grow unbounded over long uptimes. (#6629) Thanks @coygeek and @vignesh07.
- Slack/Memory: bound thread-starter cache growth with TTL + max-size pruning to prevent long-running Slack gateways from accumulating unbounded thread cache state. (#5258) Thanks @coygeek and @vignesh07.
- Outbound/Memory: bound directory cache growth with max-size eviction and proactive TTL pruning to prevent long-running gateways from accumulating unbounded directory entries. (#5140) Thanks @coygeek and @vignesh07.
- Skills/Memory: remove disconnected nodes from remote-skills cache to prevent stale node metadata from accumulating over long uptimes. (#6760) Thanks @coygeek.
- Gateway/Subagents: preserve queued announce items and summary state on delivery errors, retry failed announce drains, and avoid dropping unsent announcements on timeout/failure. (#16729) Thanks @Clawdette-Workspace.
- Security/Slack: compute command authorization for DM slash commands even when `dmPolicy=open`, preventing unauthorized users from running privileged commands via DM. Thanks @christos-eth.
- Security/Nostr: require loopback source and block cross-origin profile mutation/import attempts. Thanks @vincentkoc.
- Security/Archive: enforce archive extraction entry/size limits to prevent resource exhaustion from high-expansion ZIP/TAR archives. Thanks @vincentkoc.
- Security/Media: reject oversized base64-backed input media before decoding to avoid large allocations. Thanks @vincentkoc.
- Security/Media: stream and bound URL-backed input media fetches to prevent memory exhaustion from oversized responses. Thanks @vincentkoc.
>>>>>>> 90117a384 (docs: consolidate 2026.2.14 changelog)
- Security/Skills: harden archive extraction for download-installed skills to prevent path traversal outside the target directory. Thanks @markmusson.
- Security/Signal: harden signal-cli archive extraction during install to prevent path traversal outside the install root.
>>>>>>> 28d9dd7a7 (fix(macos): harden openclaw deep links)
- Security/Hooks: restrict hook transform modules to `~/.openclaw/hooks/transforms` (prevents path traversal/escape module loads via config). Config note: `hooks.transformsDir` must now be within that directory. Thanks @akhmittra.
- Security/Hooks: ignore hook package manifest entries that point outside the package directory (prevents out-of-tree handler loads during hook discovery).
<<<<<<< HEAD
<<<<<<< HEAD

>>>>>>> d69b32a07 (docs(changelog): clarify hooks transform dir restriction)
=======
- Ollama/Agents: avoid forcing `<final>` tag enforcement for Ollama models, which could suppress all output as `(no output)`. (#16191) Thanks @Glucksberg.
=======
- Security/Zalo: reject ambiguous shared-path webhook routing when multiple webhook targets match the same secret.
- Security/BlueBubbles: reject ambiguous shared-path webhook routing when multiple webhook targets match the same guid/password.
- Security/BlueBubbles: harden BlueBubbles webhook auth behind reverse proxies by only accepting passwordless webhooks for direct localhost loopback requests (forwarded/proxied requests now require a password). Thanks @simecek.
- Security/BlueBubbles: require explicit `mediaLocalRoots` allowlists for local outbound media path reads to prevent local file disclosure. (#16322) Thanks @mbelinky.
>>>>>>> 90117a384 (docs: consolidate 2026.2.14 changelog)
=======
>>>>>>> c1feda14f (docs(changelog): reorder 2026.2.14 notes)

>>>>>>> e53a221e5 (chore: format changelog)
## 2026.2.13
>>>>>>> e91d957d7 (chore(release): publish 2026.2.13 appcast)

### Changes

<<<<<<< HEAD
- Skills: remove duplicate `local-places` Google Places skill/proxy and keep `goplaces` as the single supported Google Places path.

### Fixes

<<<<<<< HEAD
=======
- Agents/Compaction: centralize exec default resolution in the shared tool factory so per-agent `tools.exec` overrides (host/security/ask/node and related defaults) persist across compaction retries. (#15833) Thanks @napetrov.
- Voice Call: route webhook runtime event handling through shared manager event logic so rejected inbound hangups are idempotent in production, with regression tests for duplicate reject events and provider-call-ID remapping parity. (#15892) Thanks @dcantu96.
- CLI/Completion: route plugin-load logs to stderr and write generated completion scripts directly to stdout to avoid `source <(openclaw completion ...)` corruption. (#15481) Thanks @arosstale.
- Gateway/Agents: stop injecting a phantom `main` agent into gateway agent listings when `agents.list` explicitly excludes it. (#11450) Thanks @arosstale.
- Agents/Heartbeat: stop auto-creating `HEARTBEAT.md` during workspace bootstrap so missing files continue to run heartbeat as documented. (#11766) Thanks @shadril238.
- Telegram: cap bot menu registration to Telegram's 100-command limit with an overflow warning while keeping typed hidden commands available. (#15844) Thanks @battman21.
- CLI: lazily load outbound provider dependencies and remove forced success-path exits so commands terminate naturally without killing intentional long-running foreground actions. (#12906) Thanks @DrCrinkle.
- Auto-reply/Heartbeat: strip sentence-ending `HEARTBEAT_OK` tokens even when followed by up to 4 punctuation characters, while preserving surrounding sentence punctuation. (#15847) Thanks @Spacefish.
- Heartbeat: allow explicit wake (`wake`) and hook wake (`hook:*`) reasons to run even when `HEARTBEAT.md` is effectively empty so queued system events are processed. (#14527) Thanks @arosstale.
- Clawdock: avoid Zsh readonly variable collisions in helper scripts. (#15501) Thanks @nkelner.
- Discord: route autoThread replies to existing threads instead of the root channel. (#8302) Thanks @gavinbmoore, @thewilloftheshadow.
- Discord/Agents: apply channel/group `historyLimit` during embedded-runner history compaction to prevent long-running channel sessions from bypassing truncation and overflowing context windows. (#11224) Thanks @shadril238.
- Mattermost (plugin): retry websocket monitor connections with exponential backoff and abort-aware teardown so transient connect failures no longer permanently stop monitoring. (#14962) Thanks @mcaxtr.
- Telegram: scope skill commands to the resolved agent for default accounts so `setMyCommands` no longer triggers `BOT_COMMANDS_TOO_MUCH` when multiple agents are configured. (#15599)
- Plugins/Hooks: fire `before_tool_call` hook exactly once per tool invocation in embedded runs by removing duplicate dispatch paths while preserving parameter mutation semantics. (#15635) Thanks @lailoo.
- Agents/Image tool: cap image-analysis completion `maxTokens` by model capability (`min(4096, model.maxTokens)`) to avoid over-limit provider failures while still preventing truncation. (#11770) Thanks @detecti1.
- TUI/Streaming: preserve richer streamed assistant text when final payload drops pre-tool-call text blocks, while keeping non-empty final payload authoritative for plain-text updates. (#15452) Thanks @TsekaLuk.
- Inbound/Web UI: preserve literal `\n` sequences when normalizing inbound text so Windows paths like `C:\\Work\\nxxx\\README.md` are not corrupted. (#11547) Thanks @mcaxtr.
- Daemon/Windows: preserve literal backslashes in `gateway.cmd` command parsing so drive and UNC paths are not corrupted in runtime checks and doctor entrypoint comparisons. (#15642) Thanks @arosstale.
- Security/Canvas: serve A2UI assets via the shared safe-open path (`openFileWithinRoot`) to close traversal/TOCTOU gaps, with traversal and symlink regression coverage. (#10525) Thanks @abdelsfane.
- Media: classify `text/*` MIME types as documents in media-kind routing so text attachments are no longer treated as unknown. (#12237) Thanks @arosstale.
- Security/Gateway: breaking default-behavior change - canvas IP-based auth fallback now only accepts machine-scoped addresses (RFC1918, link-local, ULA IPv6, CGNAT); public-source IP matches now require bearer token auth. (#14661) Thanks @sumleo.
- Security/Gateway: sanitize and truncate untrusted WebSocket header values in pre-handshake close logs to reduce log-poisoning risk. Thanks @thewilloftheshadow.
- Security/WhatsApp: enforce `0o600` on `creds.json` and `creds.json.bak` on save/backup/restore paths to reduce credential file exposure. (#10529) Thanks @abdelsfane.
- WhatsApp: preserve outbound document filenames for web-session document sends instead of always sending `"file"`. (#15594) Thanks @TsekaLuk.
- Security/Gateway + ACP: block high-risk tools (`sessions_spawn`, `sessions_send`, `gateway`, `whatsapp_login`) from HTTP `/tools/invoke` by default with `gateway.tools.{allow,deny}` overrides, and harden ACP permission selection to fail closed when tool identity/options are ambiguous while supporting `allow_always`/`reject_always`. (#15390) Thanks @aether-ai-agent.
- Security/Browser: constrain `POST /trace/stop`, `POST /wait/download`, and `POST /download` output paths to OpenClaw temp roots and reject traversal/escape paths.
- Gateway/Tools Invoke: sanitize `/tools/invoke` execution failures while preserving `400` for tool input errors and returning `500` for unexpected runtime failures, with regression coverage and docs updates. (#13185) Thanks @davidrudduck.
- MS Teams: preserve parsed mention entities/text when appending OneDrive fallback file links, and accept broader real-world Teams mention ID formats (`29:...`, `8:orgid:...`) while still rejecting placeholder patterns. (#15436) Thanks @hyojin.
>>>>>>> 9443c638f (voice-call: hang up rejected inbounds, idempotency and logging (#15892))
- Security/Audit: distinguish external webhooks (`hooks.enabled`) from internal hooks (`hooks.internal.enabled`) in attack-surface summaries to avoid false exposure signals when only internal hooks are enabled. (#13474) Thanks @mcaxtr.
- Sandbox: pass configured `sandbox.docker.env` variables to sandbox containers at `docker create` time. (#15138) Thanks @stevebot-alive.
- Onboarding/CLI: restore terminal state without resuming paused `stdin`, so onboarding exits cleanly after choosing Web UI and the installer returns instead of appearing stuck.
<<<<<<< HEAD
=======
- Onboarding/Providers: add vLLM as an onboarding provider with model discovery, auth profile wiring, and non-interactive auth-choice validation. (#12577) Thanks @gejifeng.
- Onboarding/Providers: preserve Hugging Face auth intent in auth-choice remapping (`tokenProvider=huggingface` with `authChoice=apiKey`) and skip env-override prompts when an explicit token is provided. (#13472) Thanks @Josephrp.
- OpenAI Codex/Spark: implement end-to-end `gpt-5.3-codex-spark` support across fallback/thinking/model resolution and `models list` forward-compat visibility. (#14990, #15174) Thanks @L-U-C-K-Y, @loiie45e.
- Agents/Codex: allow `gpt-5.3-codex-spark` in forward-compat fallback, live model filtering, and thinking presets, and fix model-picker recognition for spark. (#14990) Thanks @L-U-C-K-Y.
- OpenAI Codex/Auth: bridge OpenClaw OAuth profiles into `pi` `auth.json` so model discovery and models-list registry resolution can use Codex OAuth credentials. (#15184) Thanks @loiie45e.
- Agents/Transcript policy: sanitize OpenAI/Codex tool-call ids during transcript policy normalization to prevent invalid tool-call identifiers from propagating into session history. (#15279) Thanks @divisonofficer.
- Models/Codex: resolve configured `openai-codex/gpt-5.3-codex-spark` through forward-compat fallback during `models list`, so it is not incorrectly tagged as missing when runtime resolution succeeds. (#15174) Thanks @loiie45e.
>>>>>>> a17f74306 (docs(changelog): note codex spark implementation and merged PR attributions)
- macOS Voice Wake: fix a crash in trigger trimming for CJK/Unicode transcripts by matching and slicing on original-string ranges instead of transformed-string indices. (#11052) Thanks @Flash-LHR.
- Heartbeat: prevent scheduler silent-death races during runner reloads, preserve retry cooldown backoff under wake bursts, and prioritize user/action wake causes over interval/retry reasons when coalescing. (#15108) Thanks @joeykrug.
- Exec/Allowlist: allow multiline heredoc bodies (`<<`, `<<-`) while keeping multiline non-heredoc shell commands blocked, so exec approval parsing permits heredoc input safely without allowing general newline command chaining. (#13811) Thanks @mcaxtr.
- Docs/Mermaid: remove hardcoded Mermaid init theme blocks from four docs diagrams so dark mode inherits readable theme defaults. (#15157) Thanks @heytulsiprasad.
<<<<<<< HEAD
=======
- Outbound/Threading: pass `replyTo` and `threadId` from `message send` tool actions through the core outbound send path to channel adapters, preserving thread/reply routing. (#14948) Thanks @mcaxtr.
- Sessions/Agents: pass `agentId` when resolving existing transcript paths in reply runs so non-default agents and heartbeat/chat handlers no longer fail with `Session file path must be within sessions directory`. (#15141) Thanks @Goldenmonstew.
- Sessions/Agents: pass `agentId` through status and usage transcript-resolution paths (auto-reply, gateway usage APIs, and session cost/log loaders) so non-default agents can resolve absolute session files without path-validation failures. (#15103) Thanks @jalehman.
- Signal/Install: auto-install `signal-cli` via Homebrew on non-x64 Linux architectures, avoiding x86_64 native binary `Exec format error` failures on arm64/arm hosts. (#15443) Thanks @jogvan-k.
- Discord: avoid misrouting numeric guild allowlist entries to `/channels/<guildId>` by prefixing guild-only inputs with `guild:` during resolution. (#12326) Thanks @headswim.
- Config: preserve `${VAR}` env references when writing config files so `openclaw config set/apply/patch` does not persist secrets to disk. Thanks @thewilloftheshadow.
- Process/Exec: avoid shell execution for `.exe` commands on Windows so env overrides work reliably in `runCommandWithTimeout`. Thanks @thewilloftheshadow.
- Web tools/web_fetch: prefer `text/markdown` responses for Cloudflare Markdown for Agents, add `cf-markdown` extraction for markdown bodies, and redact fetched URLs in `x-markdown-tokens` debug logs to avoid leaking raw paths/query params. (#15376) Thanks @Yaxuan42.
- Config: keep legacy audio transcription migration strict by rejecting non-string/unsafe command tokens while still migrating valid custom script executables. (#5042) Thanks @shayan919293.
- Status/Sessions: stop clamping derived `totalTokens` to context-window size, keep prompt-token snapshots wired through session accounting, and surface context usage as unknown when fresh snapshot data is missing to avoid false 100% reports. (#15114) Thanks @echoVic.
- Providers/MiniMax: switch implicit MiniMax API-key provider from `openai-completions` to `anthropic-messages` with the correct Anthropic-compatible base URL, fixing `invalid role: developer (2013)` errors on MiniMax M2.5. (#15275) Thanks @lailoo.
<<<<<<< HEAD
>>>>>>> bbca3b191 (changelog: add missing attribution)
=======
- Web UI: add `img` to DOMPurify allowed tags and `src`/`alt` to allowed attributes so markdown images render in webchat instead of being stripped. (#15437) Thanks @lailoo.
- Ollama/Agents: use resolved model/provider base URLs for native `/api/chat` streaming (including aliased providers), normalize `/v1` endpoints, and forward abort + `maxTokens` stream options for reliable cancellation and token caps. (#11853) Thanks @BrokenFinger98.
>>>>>>> c4d2061a7 (Web UI: allow img tags in DOMPurify so markdown images render in webchat (#15480))
=======
- Discord: send voice messages with waveform previews from local audio files (including silent delivery). (#7253) Thanks @nyanjou.
- Discord: add configurable presence status/activity/type/url (custom status defaults to activity text). (#10855) Thanks @h0tp-ftw.
- Slack/Plugins: add thread-ownership outbound gating via `message_sending` hooks, including @-mention bypass tracking and Slack outbound hook wiring for cancel/modify behavior. (#15775) Thanks @DarlingtonDeveloper.
- Agents: add synthetic catalog support for `hf:zai-org/GLM-5`. (#15867) Thanks @battman21.
- Skills: remove duplicate `local-places` Google Places skill/proxy and keep `goplaces` as the single supported Google Places path.
- Agents: add pre-prompt context diagnostics (`messages`, `systemPromptChars`, `promptChars`, provider/model, session file) before embedded runner prompt calls to improve overflow debugging. (#8930) Thanks @Glucksberg.
- Onboarding/Providers: add first-class Hugging Face Inference provider support (provider wiring, onboarding auth choice/API key flow, and default-model selection), and preserve Hugging Face auth intent in auth-choice remapping (`tokenProvider=huggingface` with `authChoice=apiKey`) while skipping env-override prompts when an explicit token is provided. (#13472) Thanks @Josephrp.

### Fixes

<<<<<<< HEAD
=======
- Gateway/Auth: add trusted-proxy mode hardening follow-ups by keeping `OPENCLAW_GATEWAY_*` env compatibility, auto-normalizing invalid setup combinations in interactive `gateway configure` (trusted-proxy forces `bind=lan` and disables Tailscale serve/funnel), and suppressing shared-secret/rate-limit audit findings that do not apply to trusted-proxy deployments. (#15940) Thanks @nickytonline.
- Security/Audit: warn when `gateway.tools.allow` re-enables default-denied tools over HTTP `POST /tools/invoke`, since this can increase RCE blast radius if the gateway is reachable.
>>>>>>> 9e24eee52 (docs(changelog): note audit warning for gateway tools override)
- Feishu: stop persistent Typing reaction on NO_REPLY/suppressed runs by wiring reply-dispatcher cleanup to remove typing indicators. (#15464) Thanks @arosstale.
- BlueBubbles: gracefully degrade when Private API is disabled by filtering private-only actions, skipping private-only reactions/reply effects, and avoiding private reply markers so non-private flows remain usable. (#16002) Thanks @L-U-C-K-Y.
- Outbound: add a write-ahead delivery queue with crash-recovery retries to prevent lost outbound messages after gateway restarts. (#15636) Thanks @nabbilkhan, @thewilloftheshadow.
- Auto-reply/Threading: auto-inject implicit reply threading so `replyToMode` works without requiring model-emitted `[[reply_to_current]]`, while preserving `replyToMode: "off"` behavior for implicit Slack replies and keeping block-streaming chunk coalescing stable under `replyToMode: "first"`. (#14976) Thanks @Diaspar4u.
- Outbound/Threading: pass `replyTo` and `threadId` from `message send` tool actions through the core outbound send path to channel adapters, preserving thread/reply routing. (#14948) Thanks @mcaxtr.
- Auto-reply/Media: allow image-only inbound messages (no caption) to reach the agent instead of short-circuiting as empty text, and preserve thread context in queued/followup prompt bodies for media-only runs. (#11916) Thanks @arosstale.
- Discord: route autoThread replies to existing threads instead of the root channel. (#8302) Thanks @gavinbmoore, @thewilloftheshadow.
- Web UI: add `img` to DOMPurify allowed tags and `src`/`alt` to allowed attributes so markdown images render in webchat instead of being stripped. (#15437) Thanks @lailoo.
- Telegram/Matrix: treat MP3 and M4A (including `audio/mp4`) as voice-compatible for `asVoice` routing, and keep WAV/AAC falling back to regular audio sends. (#15438) Thanks @azade-c.
- WhatsApp: preserve outbound document filenames for web-session document sends instead of always sending `"file"`. (#15594) Thanks @TsekaLuk.
- Telegram: cap bot menu registration to Telegram's 100-command limit with an overflow warning while keeping typed hidden commands available. (#15844) Thanks @battman21.
- Telegram: scope skill commands to the resolved agent for default accounts so `setMyCommands` no longer triggers `BOT_COMMANDS_TOO_MUCH` when multiple agents are configured. (#15599)
- Discord: avoid misrouting numeric guild allowlist entries to `/channels/<guildId>` by prefixing guild-only inputs with `guild:` during resolution. (#12326) Thanks @headswim.
<<<<<<< HEAD
=======
- Memory/QMD: default `memory.qmd.searchMode` to `search` for faster CPU-only recall and always scope `search`/`vsearch` requests to managed collections (auto-falling back to `query` when required). (#16047) Thanks @togotago.
- Memory/LanceDB: add configurable `captureMaxChars` for auto-capture while keeping the legacy 500-char default. (#16641) Thanks @ciberponk.
>>>>>>> 3f69607d8 (Changelog: configurable LanceDB capture limit)
- MS Teams: preserve parsed mention entities/text when appending OneDrive fallback file links, and accept broader real-world Teams mention ID formats (`29:...`, `8:orgid:...`) while still rejecting placeholder patterns. (#15436) Thanks @hyojin.
- Media: classify `text/*` MIME types as documents in media-kind routing so text attachments are no longer treated as unknown. (#12237) Thanks @arosstale.
- Inbound/Web UI: preserve literal `\n` sequences when normalizing inbound text so Windows paths like `C:\\Work\\nxxx\\README.md` are not corrupted. (#11547) Thanks @mcaxtr.
- TUI/Streaming: preserve richer streamed assistant text when final payload drops pre-tool-call text blocks, while keeping non-empty final payload authoritative for plain-text updates. (#15452) Thanks @TsekaLuk.
- Providers/MiniMax: switch implicit MiniMax API-key provider from `openai-completions` to `anthropic-messages` with the correct Anthropic-compatible base URL, fixing `invalid role: developer (2013)` errors on MiniMax M2.5. (#15275) Thanks @lailoo.
- Ollama/Agents: use resolved model/provider base URLs for native `/api/chat` streaming (including aliased providers), normalize `/v1` endpoints, and forward abort + `maxTokens` stream options for reliable cancellation and token caps. (#11853) Thanks @BrokenFinger98.
- OpenAI Codex/Spark: implement end-to-end `gpt-5.3-codex-spark` support across fallback/thinking/model resolution and `models list` forward-compat visibility. (#14990, #15174) Thanks @L-U-C-K-Y, @loiie45e.
- Agents/Codex: allow `gpt-5.3-codex-spark` in forward-compat fallback, live model filtering, and thinking presets, and fix model-picker recognition for spark. (#14990) Thanks @L-U-C-K-Y.
- Models/Codex: resolve configured `openai-codex/gpt-5.3-codex-spark` through forward-compat fallback during `models list`, so it is not incorrectly tagged as missing when runtime resolution succeeds. (#15174) Thanks @loiie45e.
- OpenAI Codex/Auth: bridge OpenClaw OAuth profiles into `pi` `auth.json` so model discovery and models-list registry resolution can use Codex OAuth credentials. (#15184) Thanks @loiie45e.
- Auth/OpenAI Codex: share OAuth login handling across onboarding and `models auth login --provider openai-codex`, keep onboarding alive when OAuth fails, and surface a direct OAuth help note instead of terminating the wizard. (#15406, follow-up to #14552) Thanks @zhiluo20.
- Onboarding/Providers: add vLLM as an onboarding provider with model discovery, auth profile wiring, and non-interactive auth-choice validation. (#12577) Thanks @gejifeng.
- Onboarding/CLI: restore terminal state without resuming paused `stdin`, so onboarding exits cleanly after choosing Web UI and the installer returns instead of appearing stuck.
- Signal/Install: auto-install `signal-cli` via Homebrew on non-x64 Linux architectures, avoiding x86_64 native binary `Exec format error` failures on arm64/arm hosts. (#15443) Thanks @jogvan-k.
- macOS Voice Wake: fix a crash in trigger trimming for CJK/Unicode transcripts by matching and slicing on original-string ranges instead of transformed-string indices. (#11052) Thanks @Flash-LHR.
- Mattermost (plugin): retry websocket monitor connections with exponential backoff and abort-aware teardown so transient connect failures no longer permanently stop monitoring. (#14962) Thanks @mcaxtr.
- Discord/Agents: apply channel/group `historyLimit` during embedded-runner history compaction to prevent long-running channel sessions from bypassing truncation and overflowing context windows. (#11224) Thanks @shadril238.
- Outbound targets: fail closed for WhatsApp/Twitch/Google Chat fallback paths so invalid or missing targets are dropped instead of rerouted, and align resolver hints with strict target requirements. (#13578) Thanks @mcaxtr.
- Gateway/Restart: clear stale command-queue and heartbeat wake runtime state after SIGUSR1 in-process restarts to prevent zombie gateway behavior where queued work stops draining. (#15195) Thanks @joeykrug.
- Heartbeat: prevent scheduler silent-death races during runner reloads, preserve retry cooldown backoff under wake bursts, and prioritize user/action wake causes over interval/retry reasons when coalescing. (#15108) Thanks @joeykrug.
- Heartbeat: allow explicit wake (`wake`) and hook wake (`hook:*`) reasons to run even when `HEARTBEAT.md` is effectively empty so queued system events are processed. (#14527) Thanks @arosstale.
- Auto-reply/Heartbeat: strip sentence-ending `HEARTBEAT_OK` tokens even when followed by up to 4 punctuation characters, while preserving surrounding sentence punctuation. (#15847) Thanks @Spacefish.
- Agents/Heartbeat: stop auto-creating `HEARTBEAT.md` during workspace bootstrap so missing files continue to run heartbeat as documented. (#11766) Thanks @shadril238.
- Sessions/Agents: pass `agentId` when resolving existing transcript paths in reply runs so non-default agents and heartbeat/chat handlers no longer fail with `Session file path must be within sessions directory`. (#15141) Thanks @Goldenmonstew.
- Sessions/Agents: pass `agentId` through status and usage transcript-resolution paths (auto-reply, gateway usage APIs, and session cost/log loaders) so non-default agents can resolve absolute session files without path-validation failures. (#15103) Thanks @jalehman.
- Sessions: archive previous transcript files on `/new` and `/reset` session resets (including gateway `sessions.reset`) so stale transcripts do not accumulate on disk. (#14869) Thanks @mcaxtr.
- Status/Sessions: stop clamping derived `totalTokens` to context-window size, keep prompt-token snapshots wired through session accounting, and surface context usage as unknown when fresh snapshot data is missing to avoid false 100% reports. (#15114) Thanks @echoVic.
- CLI/Completion: route plugin-load logs to stderr and write generated completion scripts directly to stdout to avoid `source <(openclaw completion ...)` corruption. (#15481) Thanks @arosstale.
- CLI: lazily load outbound provider dependencies and remove forced success-path exits so commands terminate naturally without killing intentional long-running foreground actions. (#12906) Thanks @DrCrinkle.
- Security/Gateway + ACP: block high-risk tools (`sessions_spawn`, `sessions_send`, `gateway`, `whatsapp_login`) from HTTP `/tools/invoke` by default with `gateway.tools.{allow,deny}` overrides, and harden ACP permission selection to fail closed when tool identity/options are ambiguous while supporting `allow_always`/`reject_always`. (#15390) Thanks @aether-ai-agent.
- Security/ACP: prompt for non-read/search permission requests in ACP clients (reduces silent tool approval risk). Thanks @aether-ai-agent.
- Security/Gateway: breaking default-behavior change - canvas IP-based auth fallback now only accepts machine-scoped addresses (RFC1918, link-local, ULA IPv6, CGNAT); public-source IP matches now require bearer token auth. (#14661) Thanks @sumleo.
- Security/Link understanding: block loopback/internal host patterns and private/mapped IPv6 addresses in extracted URL handling to close SSRF bypasses in link CLI flows. (#15604) Thanks @AI-Reviewer-QS.
- Security/Browser: constrain `POST /trace/stop`, `POST /wait/download`, and `POST /download` output paths to OpenClaw temp roots and reject traversal/escape paths.
- Security/Canvas: serve A2UI assets via the shared safe-open path (`openFileWithinRoot`) to close traversal/TOCTOU gaps, with traversal and symlink regression coverage. (#10525) Thanks @abdelsfane.
- Security/WhatsApp: enforce `0o600` on `creds.json` and `creds.json.bak` on save/backup/restore paths to reduce credential file exposure. (#10529) Thanks @abdelsfane.
- Security/Gateway: sanitize and truncate untrusted WebSocket header values in pre-handshake close logs to reduce log-poisoning risk. Thanks @thewilloftheshadow.
- Security/Audit: add misconfiguration checks for sandbox Docker config with sandbox mode off, ineffective `gateway.nodes.denyCommands` entries, global minimal tool-profile overrides by agent profiles, and permissive extension-plugin tool reachability.
- Security/Audit: distinguish external webhooks (`hooks.enabled`) from internal hooks (`hooks.internal.enabled`) in attack-surface summaries to avoid false exposure signals when only internal hooks are enabled. (#13474) Thanks @mcaxtr.
- Security/Onboarding: clarify multi-user DM isolation remediation with explicit `openclaw config set session.dmScope ...` commands in security audit, doctor security, and channel onboarding guidance. (#13129) Thanks @VintLin.
- Agents/Nodes: harden node exec approval decision handling in the `nodes` tool run path by failing closed on unexpected approval decisions, and add regression coverage for approval-required retry/deny/timeout flows. (#4726) Thanks @rmorse.
- Android/Nodes: harden `app.update` by requiring HTTPS and gateway-host URL matching plus SHA-256 verification, stream URL camera downloads to disk with size guards to avoid memory spikes, and stop signing release builds with debug keys. (#13541) Thanks @smartprogrammer93.
- Routing: enforce strict binding-scope matching across peer/guild/team/roles so peer-scoped Discord/Slack bindings no longer match unrelated guild/team contexts or fallback tiers. (#15274) Thanks @lailoo.
- Exec/Allowlist: allow multiline heredoc bodies (`<<`, `<<-`) while keeping multiline non-heredoc shell commands blocked, so exec approval parsing permits heredoc input safely without allowing general newline command chaining. (#13811) Thanks @mcaxtr.
- Config: preserve `${VAR}` env references when writing config files so `openclaw config set/apply/patch` does not persist secrets to disk. Thanks @thewilloftheshadow.
- Config: remove a cross-request env-snapshot race in config writes by carrying read-time env context into write calls per request, preserving `${VAR}` refs safely under concurrent gateway config mutations. (#11560) Thanks @akoscz.
- Config: log overwrite audit entries (path, backup target, and hash transition) whenever an existing config file is replaced, improving traceability for unexpected config clobbers.
- Config: keep legacy audio transcription migration strict by rejecting non-string/unsafe command tokens while still migrating valid custom script executables. (#5042) Thanks @shayan919293.
- Config: accept `$schema` key in config file so JSON Schema editor tooling works without validation errors. (#14998)
- Gateway/Tools Invoke: sanitize `/tools/invoke` execution failures while preserving `400` for tool input errors and returning `500` for unexpected runtime failures, with regression coverage and docs updates. (#13185) Thanks @davidrudduck.
- Gateway/Hooks: preserve `408` for hook request-body timeout responses while keeping bounded auth-failure cache eviction behavior, with timeout-status regression coverage. (#15848) Thanks @AI-Reviewer-QS.
- Plugins/Hooks: fire `before_tool_call` hook exactly once per tool invocation in embedded runs by removing duplicate dispatch paths while preserving parameter mutation semantics. (#15635) Thanks @lailoo.
- Agents/Transcript policy: sanitize OpenAI/Codex tool-call ids during transcript policy normalization to prevent invalid tool-call identifiers from propagating into session history. (#15279) Thanks @divisonofficer.
- Agents/Image tool: cap image-analysis completion `maxTokens` by model capability (`min(4096, model.maxTokens)`) to avoid over-limit provider failures while still preventing truncation. (#11770) Thanks @detecti1.
- Agents/Compaction: centralize exec default resolution in the shared tool factory so per-agent `tools.exec` overrides (host/security/ask/node and related defaults) persist across compaction retries. (#15833) Thanks @napetrov.
- Gateway/Agents: stop injecting a phantom `main` agent into gateway agent listings when `agents.list` explicitly excludes it. (#11450) Thanks @arosstale.
- Process/Exec: avoid shell execution for `.exe` commands on Windows so env overrides work reliably in `runCommandWithTimeout`. Thanks @thewilloftheshadow.
- Daemon/Windows: preserve literal backslashes in `gateway.cmd` command parsing so drive and UNC paths are not corrupted in runtime checks and doctor entrypoint comparisons. (#15642) Thanks @arosstale.
- Sandbox: pass configured `sandbox.docker.env` variables to sandbox containers at `docker create` time. (#15138) Thanks @stevebot-alive.
- Voice Call: route webhook runtime event handling through shared manager event logic so rejected inbound hangups are idempotent in production, with regression tests for duplicate reject events and provider-call-ID remapping parity. (#15892) Thanks @dcantu96.
- Cron: add regression coverage for announce-mode isolated jobs so runs that already report `delivered: true` do not enqueue duplicate main-session relays, including delivery configs where `mode` is omitted and defaults to announce. (#15737) Thanks @brandonwise.
- Cron: honor `deleteAfterRun` in isolated announce delivery by mapping it to subagent announce cleanup mode, so cron run sessions configured for deletion are removed after completion. (#15368) Thanks @arosstale.
- Web tools/web_fetch: prefer `text/markdown` responses for Cloudflare Markdown for Agents, add `cf-markdown` extraction for markdown bodies, and redact fetched URLs in `x-markdown-tokens` debug logs to avoid leaking raw paths/query params. (#15376) Thanks @Yaxuan42.
- Clawdock: avoid Zsh readonly variable collisions in helper scripts. (#15501) Thanks @nkelner.
- Memory: switch default local embedding model to the QAT `embeddinggemma-300m-qat-Q8_0` variant for better quality at the same footprint. (#15429) Thanks @azade-c.
- Docs/Discord: expand quick setup and clarify guild workspace guidance. (#20088) Thanks @pejmanjohn, @thewilloftheshadow.
- Docs/Mermaid: remove hardcoded Mermaid init theme blocks from four docs diagrams so dark mode inherits readable theme defaults. (#15157) Thanks @heytulsiprasad.
>>>>>>> 203b5bdf7 (docs: reorder 2026.2.13 changelog by user interest)

## 2026.2.12
>>>>>>> 8c920b9a1 (fix(docs): remove hardcoded Mermaid init blocks that break dark mode (#15157))

### Changes

<<<<<<< HEAD
- TBD.
=======
- Onboarding: add Moonshot (.cn) auth choice and keep the China base URL when preserving defaults. (#7180) Thanks @waynelwz.
- Onboarding: add xAI (Grok) auth choice and provider defaults. (#9885) Thanks @grp06.
- Docs: clarify tmux send-keys for TUI by splitting text and Enter. (#7737) Thanks @Wangnov.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> efc9d0a49 (docs: note tmux send-keys TUI guidance (#7737) (thanks @Wangnov))
=======
=======
- Docs: mirror the landing page revamp for zh-CN (features, quickstart, docs directory, network model, credits). (#8994) Thanks @joshp123.
<<<<<<< HEAD
>>>>>>> 2b1da4f5d (🤖 docs: note zh-CN landing revamp (#8994) (thanks @joshp123))
=======
- Docs: strengthen secure DM mode guidance for multi-user inboxes with an explicit warning and example. (#9377) Thanks @Shrinija17.
- Docs: document `activeHours` heartbeat field with timezone resolution chain and example. (#9366) Thanks @unisone.
- Messages: add per-channel and per-account responsePrefix overrides across channels. (#9001) Thanks @mudrii.
>>>>>>> 8fdc0a284 (docs: note secure DM guidance update (#9377) (thanks @Shrinija17))
- Cron: add announce delivery mode for isolated jobs (CLI + Control UI) and delivery mode config.
- Cron: default isolated jobs to announce delivery; accept ISO 8601 `schedule.at` in tool inputs.
- Cron: hard-migrate isolated jobs to announce/none delivery; drop legacy post-to-main/payload delivery fields and `atMs` inputs.
- Cron: delete one-shot jobs after success by default; add `--keep-after-run` for CLI.
- Cron: suppress messaging tools during announce delivery so summaries post consistently.
- Cron: avoid duplicate deliveries when isolated runs send messages directly.
>>>>>>> c396877dd (Changelog: move cron entries to 2026.2.3)

### Fixes

<<<<<<< HEAD
=======
- Auto-reply/Docs: normalize `extra-high` (and spaced variants) to `xhigh` for Codex thinking levels, and align Codex 5.3 FAQ examples. (#9976) Thanks @slonce70.
- Compaction: remove orphaned `tool_result` messages during history pruning to prevent session corruption from aborted tool calls. (#9868, fixes #9769, #9724, #9672)
- Telegram: pass `parentPeer` for forum topic binding inheritance so group-level bindings apply to all topics within the group. (#9789, fixes #9545, #9351)
- CLI: pass `--disable-warning=ExperimentalWarning` as a Node CLI option when respawning (avoid disallowed `NODE_OPTIONS` usage; fixes npm pack). (#9691) Thanks @18-RAJAT.
- CLI: resolve bundled Chrome extension assets by walking up to the nearest assets directory; add resolver and clipboard tests. (#8914) Thanks @kelvinCB.
- Tests: stabilize Windows ACL coverage with deterministic os.userInfo mocking. (#9335) Thanks @M00N7682.
- Exec approvals: coerce bare string allowlist entries to objects to prevent allowlist corruption. (#9903, fixes #9790) Thanks @mcaxtr.
- Heartbeat: allow explicit accountId routing for multi-account channels. (#8702) Thanks @lsh411.
- TUI/Gateway: handle non-streaming finals, refresh history for non-local chat runs, and avoid event gap warnings for targeted tool streams. (#8432) Thanks @gumadeiras.
>>>>>>> 7db839544 (Changelog: note #9976 thinking alias + Codex 5.3 docs sync)
- Shell completion: auto-detect and migrate slow dynamic patterns to cached files for faster terminal startup; add completion health checks to doctor/update/onboard.
- Telegram: honor session model overrides in inline model selection. (#8193) Thanks @gildo.
- Web UI: fix agent model selection saves for default/non-default agents and wrap long workspace paths. Thanks @Takhoffman.
- Web UI: resolve header logo path when `gateway.controlUi.basePath` is set. (#7178) Thanks @Yeom-JinHo.
- Web UI: apply button styling to the new-messages indicator.
<<<<<<< HEAD
=======
- Security: keep untrusted channel metadata out of system prompts (Slack/Discord). Thanks @KonstantinMirin.
- Voice call: harden webhook verification with host allowlists/proxy trust and keep ngrok loopback bypass.
- Cron: accept epoch timestamps and 0ms durations in CLI `--at` parsing.
- Cron: reload store data when the store file is recreated or mtime changes.
- Cron: deliver announce runs directly, honor delivery mode, and respect wakeMode for summaries. (#8540) Thanks @tyler6204.
<<<<<<< HEAD
>>>>>>> c396877dd (Changelog: move cron entries to 2026.2.3)
=======
- Telegram: include forward_from_chat metadata in forwarded messages and harden cron delivery target checks. (#8392) Thanks @Glucksberg.
- macOS: fix cron payload summary rendering and ISO 8601 formatter concurrency safety.
>>>>>>> 54ddbc466 (chore: update 2026.2.3 notes)
=======
=======
## 2026.2.6-4

### Added

- Gateway: add `agents.create`, `agents.update`, `agents.delete` RPC methods for web UI agent management. (#11045) Thanks @advaitpaliwal.
<<<<<<< HEAD
=======
- Gateway: add node command allowlists (default-deny unknown node commands; configurable via `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`). (#11755) Thanks @mbelinky.
- Plugins: add `device-pair` (Telegram `/pair` flow) and `phone-control` (iOS/Android node controls). (#11755) Thanks @mbelinky.
- iOS: add alpha iOS node app (Telegram setup-code pairing + Talk/Chat surfaces). (#11756) Thanks @mbelinky.
<<<<<<< HEAD
>>>>>>> 6aedc54bd (iOS: alpha node app + setup-code onboarding (#11756))
=======
- Docs: seed initial ja-JP translations (POC) and make docs-i18n prompts language-pluggable for Japanese. (#11988) Thanks @joshp123.
<<<<<<< HEAD
>>>>>>> 6e3271ebb (Docs: note ja-JP docs POC in changelog (#11988) (thanks @joshp123))
=======
- Paths: add `OPENCLAW_HOME` environment variable for overriding the home directory used by all internal path resolution. (#12091) Thanks @sebslight.
>>>>>>> 41f3e90ea (changelog: split #12091 entry into Added + Fixes)

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Exec approvals: format forwarded command text as inline/fenced monospace for safer approval scanning across channels. (#11937)
- Config: clamp `maxTokens` to `contextWindow` to prevent invalid model configs. (#5516) Thanks @lailoo.
- Docs: fix language switcher ordering and Japanese locale flag in Mintlify nav. (#12023) Thanks @joshp123.
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Docs: clarify Hetzner Docker bootstrap guidance for `--allow-unconfigured` and streamline ownership commands. (#12703) Thanks @vcastellm.
>>>>>>> 9f4466c11 (Simplify ownership commands in hetzner.md (#12703))
- Paths: make internal path resolution respect `HOME`/`USERPROFILE` before `os.homedir()` across config, agents, sessions, pairing, cron, and CLI profiles. (#12091) Thanks @sebslight.
>>>>>>> 41f3e90ea (changelog: split #12091 entry into Added + Fixes)
- Thinking: allow xhigh for `github-copilot/gpt-5.2-codex` and `github-copilot/gpt-5.2`. (#11646) Thanks @seans-openclawbot.
- Discord: support forum/media `thread create` starter messages, wire `message thread create --message`, and harden thread-create routing. (#10062) Thanks @jarvis89757.
>>>>>>> 2f91bf550 (docs: fix changelog PR reference)
- Web UI: make chat refresh smoothly scroll to the latest messages and suppress new-messages badge flash during manual refresh.
- Cron: route text-only isolated agent announces through the shared subagent announce flow; add exponential backoff for repeated errors; preserve future `nextRunAtMs` on restart; include current-boundary schedule matches; prevent stale threadId reuse across targets; and add per-job execution timeout. (#11641) Thanks @tyler6204.
- Subagents: stabilize announce timing, preserve compaction metrics across retries, clamp overflow-prone long timeouts, and cap impossible context usage token totals. (#11551) Thanks @tyler6204.
>>>>>>> bc475f017 (fix(ui): smooth chat refresh scroll and suppress new-messages badge flash)
- Agents: recover from context overflow caused by oversized tool results (pre-emptive capping + fallback truncation). (#11579) Thanks @tyler6204.
=======
## 2026.2.9
=======
=======
## 2026.2.10

### Changes

- Version alignment: bump manifests and package versions to `2026.2.10`; keep `appcast.xml` unchanged until the next macOS release cut.
<<<<<<< HEAD
=======
- CLI: add `openclaw logs --local-time` to display log timestamps in local timezone. (#13818) Thanks @xialonglee.
- Config: avoid redacting `maxTokens`-like fields during config snapshot redaction, preventing round-trip validation failures in `/config`. (#14006) Thanks @constansino.

### Fixes

<<<<<<< HEAD
=======
- Security: fix unauthenticated Nostr profile API remote config tampering. (#13719) Thanks @coygeek.
- Security: remove bundled soul-evil hook. (#14757) Thanks @Imccccc.
- Gateway: raise WS payload/buffer limits so 5,000,000-byte image attachments work reliably. (#14486) Thanks @0xRaini.
- Logging/CLI: use local timezone timestamps for console prefixing, and include `±HH:MM` offsets when using `openclaw logs --local-time` to avoid ambiguity. (#14771) Thanks @0xRaini.
- Gateway: drain active turns before restart to prevent message loss. (#13931) Thanks @0xRaini.
- Gateway: auto-generate auth token during install to prevent launchd restart loops. (#13813) Thanks @cathrynlavery.
- Gateway: prevent `undefined`/missing token in auth config. (#13809) Thanks @asklee-klawd.
- Gateway: handle async `EPIPE` on stdout/stderr during shutdown. (#13414) Thanks @keshav55.
- Gateway/Control UI: resolve missing dashboard assets when `openclaw` is installed globally via symlink-based Node managers (nvm/fnm/n/Homebrew). (#14919) Thanks @aynorica.
>>>>>>> a005881fc (docs(changelog): add Control UI symlink install fix entry)
- Cron: use requested `agentId` for isolated job auth resolution. (#13983) Thanks @0xRaini.
- Cron: prevent cron jobs from skipping execution when `nextRunAtMs` advances. (#14068) Thanks @WalterSumbon.
- Cron: pass `agentId` to `runHeartbeatOnce` for main-session jobs. (#14140) Thanks @ishikawa-pro.
- Cron: re-arm timers when `onTimer` fires while a job is still executing. (#14233) Thanks @tomron87.
- Cron: prevent duplicate fires when multiple jobs trigger simultaneously. (#14256) Thanks @xinhuagu.
- Cron: isolate scheduler errors so one bad job does not break all jobs. (#14385) Thanks @MarvinDontPanic.
- Cron: prevent one-shot `at` jobs from re-firing on restart after skipped/errored runs. (#13878) Thanks @lailoo.
- WhatsApp: convert Markdown bold/strikethrough to WhatsApp formatting. (#14285) Thanks @Raikan10.
- WhatsApp: allow media-only sends and normalize leading blank payloads. (#14408) Thanks @karimnaguib.
- WhatsApp: default MIME type for voice messages when Baileys omits it. (#14444) Thanks @mcaxtr.
<<<<<<< HEAD
=======
- Telegram: handle no-text message in model picker editMessageText. (#14397) Thanks @0xRaini.
- Telegram: surface REACTION_INVALID as non-fatal warning. (#14340) Thanks @0xRaini.
- BlueBubbles: fix webhook auth bypass via loopback proxy trust. (#13787) Thanks @coygeek.
- Slack: change default replyToMode from "off" to "all". (#14364) Thanks @nm-de.
- Slack: detect control commands when channel messages start with bot mention prefixes (for example, `@Bot /new`). (#14142) Thanks @beefiker.
<<<<<<< HEAD
=======
- Signal: enforce E.164 validation for the Signal bot account prompt so mistyped numbers are caught early. (#15063) Thanks @Duartemartins.
- Discord: process DM reactions instead of silently dropping them. (#10418) Thanks @mcaxtr.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 92334b95d (changelog: keep signal entry while restoring removed rows)
- Signal: enforce E.164 validation for the Signal bot account prompt so mistyped numbers are caught early. (#15063) Thanks @Duartemartins.
=======
>>>>>>> 7a8a57b57 (changelog: dedupe signal entry restored by merge conflict fix)
=======
- Discord: treat Administrator as full permissions in channel permission checks. Thanks @thewilloftheshadow.
- Discord: respect replyToMode in threads. (#11062) Thanks @cordx56.
- Heartbeat: filter noise-only system events so scheduled reminder notifications do not fire when cron runs carry only heartbeat markers. (#13317) Thanks @pvtclawn.
>>>>>>> e982489f7 (Changelog: note Discord admin permission fix)
- Signal: render mention placeholders as `@uuid`/`@phone` so mention gating and Clawdbot targeting work. (#2013) Thanks @alexgleason.
- Onboarding/Providers: add Z.AI endpoint-specific auth choices (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`) and expand default Z.AI model wiring. (#13456) Thanks @tomsun28.
- Onboarding/Providers: update MiniMax API default/recommended models from M2.1 to M2.5, add M2.5/M2.5-Lightning model entries, and include `minimax-m2.5` in modern model filtering. (#14865) Thanks @adao-max.
>>>>>>> 033d5b5c1 (Changelog: note discord dm reaction fix)
- Ollama: use configured `models.providers.ollama.baseUrl` for model discovery and normalize `/v1` endpoints to the native Ollama API root. (#14131) Thanks @shtse8.
- Slack: detect control commands when channel messages start with bot mention prefixes (for example, `@Bot /new`). (#14142) Thanks @beefiker.
- Discord tests: use a partial @buape/carbon mock in slash command coverage. (#13262) Thanks @arosstale.
- CLI/Wizard: exit with code 1 when `configure`, `agents add`, or interactive `onboard` wizards are canceled, so `set -e` automation stops correctly. (#14156) Thanks @0xRaini.
<<<<<<< HEAD
>>>>>>> c8d9733e4 (Changelog: add #13262 entry)
=======
- Feishu: pass `Buffer` directly to the Feishu SDK upload APIs instead of `Readable.from(...)` to avoid form-data upload failures. (#10345) Thanks @youngerstyle.
- Feishu: trigger mention-gated group handling only when the bot itself is mentioned (not just any mention). (#11088) Thanks @openperf.
- Feishu: probe status uses the resolved account context for multi-account credential checks. (#11233) Thanks @onevcat.
- Feishu: add streaming card replies via Card Kit API and preserve `renderMode=auto` fallback behavior for plain-text responses. (#10379) Thanks @xzq-xu.
- Feishu DocX: preserve top-level converted block order using `firstLevelBlockIds` when writing/appending documents. (#13994) Thanks @Cynosure159.
- Feishu plugin packaging: remove `workspace:*` `openclaw` dependency from `extensions/feishu` and sync lockfile for install compatibility. (#14423) Thanks @jackcooper2015.
<<<<<<< HEAD
>>>>>>> 2e0313171 (chore: add feishu contributor thanks to changelog (openclaw#14448))
=======
- Telegram: handle no-text message in model picker editMessageText. (#14397) Thanks @0xRaini.
- Slack: change default replyToMode from "off" to "all". (#14364) Thanks @nm-de.
- Tests: update thread ID handling in Slack message collection tests. (#14108) Thanks @swizzmagik.
<<<<<<< HEAD
>>>>>>> 4094cef23 (changelog: add telegram and slack fix entries)
=======
- Telegram: surface REACTION_INVALID as non-fatal warning. (#14340) Thanks @0xRaini.
<<<<<<< HEAD
>>>>>>> 16f249254 (changelog: add telegram reaction warning fix entry)
=======
- BlueBubbles: fix webhook auth bypass via loopback proxy trust. (#13787) Thanks @coygeek.
- Gateway: auto-generate auth token during install to prevent launchd restart loops. (#13813) Thanks @cathrynlavery.
- Media: strip `MEDIA:` lines with local paths instead of leaking as visible text. (#14399) Thanks @0xRaini.
- Gateway: handle async `EPIPE` on stdout/stderr during shutdown. (#13414) Thanks @keshav55.
- Gateway: prevent `undefined`/missing token in auth config. (#13809) Thanks @asklee-klawd.
- Voice Call: pass Twilio stream auth token via `<Parameter>` instead of query string. (#14029) Thanks @mcwigglesmcgee.
- Config/Cron: exclude `maxTokens` from config redaction and honor `deleteAfterRun` on skipped cron jobs. (#13342) Thanks @niceysam.
- Gateway: drain active turns before restart to prevent message loss. (#13931) Thanks @0xRaini.
- Security: fix unauthenticated Nostr profile API remote config tampering. (#13719) Thanks @coygeek.
- Config: ignore `meta` field changes in config file watcher. (#13460) Thanks @brandonwise.
- Daemon: suppress `EPIPE` error when restarting LaunchAgent. (#14343) Thanks @0xRaini.
- Agents: prevent double compaction caused by cache TTL bypassing guard. (#13514) Thanks @taw0002.
- Antigravity: add opus 4.6 forward-compat model and bypass thinking signature sanitization. (#14218) Thanks @jg-noncelogic.
- Agents: prevent file descriptor leaks in child process cleanup. (#13565) Thanks @KyleChen26.
- Agents: use last API call's cache tokens for context display instead of accumulated sum. (#13805) Thanks @akari-musubi.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 6a12d8345 (changelog: add missing fix entries)
=======
=======
- Agents: keep followup-runner session `totalTokens` aligned with post-compaction context by using last-call usage and shared token-accounting logic. (#14979) Thanks @shtse8.
- Hooks/Plugins: wire 9 previously unwired plugin lifecycle hooks into core runtime paths (session, compaction, gateway, and outbound message hooks). (#14882) Thanks @shtse8.
- Hooks/Tools: dispatch `before_tool_call` and `after_tool_call` hooks from both tool execution paths with rebased conflict fixes. (#15012) Thanks @Patrick-Barletta, @Takhoffman.
- Discord: allow channel-edit to archive/lock threads and set auto-archive duration. (#5542) Thanks @stumct.
>>>>>>> a6003d671 (Changelog: add missing entries for #14882 and #15012)
- Discord tests: use a partial @buape/carbon mock in slash command coverage. (#13262) Thanks @arosstale.
- Tests: update thread ID handling in Slack message collection tests. (#14108) Thanks @swizzmagik.
>>>>>>> a363e2ca5 (Changelog: credit Signal account validation)

>>>>>>> 5741b6cb3 (docs: start 2026.2.10 changelog section)
## 2026.2.9

### Added

- Commands: add `commands.allowFrom` config for separate command authorization, allowing operators to restrict slash commands to specific users while keeping chat open to others. (#12430) Thanks @thewilloftheshadow.
<<<<<<< HEAD
=======
- Docker: add ClawDock shell helpers for Docker workflows. (#12817) Thanks @Olshansk.
- Gateway: periodic channel health monitor auto-restarts stuck, crashed, or silently-stopped channels. Configurable via `gateway.channelHealthCheckMinutes` (default: 5, set to 0 to disable). (#7053, #4302)
>>>>>>> 59eac34c2 (changelog: add channel health monitor entry)
- iOS: alpha node app + setup-code onboarding. (#11756) Thanks @mbelinky.
- Channels: comprehensive BlueBubbles and channel cleanup. (#11093) Thanks @tyler6204.
- Plugins: device pairing + phone control plugins (Telegram `/pair`, iOS/Android node controls). (#11755) Thanks @mbelinky.
- Tools: add Grok (xAI) as a `web_search` provider. (#12419) Thanks @tmchow.
- Gateway: add agent management RPC methods for the web UI (`agents.create`, `agents.update`, `agents.delete`). (#11045) Thanks @advaitpaliwal.
- Gateway: stream thinking events to WS clients and broadcast tool events independent of verbose level. (#10568) Thanks @nk1tz.
- Web UI: show a Compaction divider in chat history. (#11341) Thanks @Takhoffman.
- Agents: include runtime shell in agent envelopes. (#1835) Thanks @Takhoffman.
- Agents: auto-select `zai/glm-4.6v` for image understanding when ZAI is primary provider. (#10267) Thanks @liuy.
- Paths: add `OPENCLAW_HOME` for overriding the home directory used by internal path resolution. (#12091) Thanks @sebslight.

### Fixes

- Discord: add exec approval cleanup option to delete DMs after approval/denial/timeout. (#13205) Thanks @thewilloftheshadow.
- Sessions: prune stale entries, cap session store size, rotate large stores, accept duration/size thresholds, default to warn-only maintenance, and prune cron run sessions after retention windows. (#13083) Thanks @skyfallsin, @Glucksberg, @gumadeiras.
- CI: Implement pipeline and workflow order. Thanks @quotentiroler.
- WhatsApp: preserve original filenames for inbound documents. (#12691) Thanks @akramcodez.
- Telegram: harden quote parsing; preserve quote context; avoid QUOTE_TEXT_INVALID; avoid nested reply quote misclassification. (#12156) Thanks @rybnikov.
- Telegram: recover proactive sends when stale topic thread IDs are used by retrying without `message_thread_id`. (#11620)
- Discord: auto-create forum/media thread posts on send, with chunked follow-up replies and media handling for forum sends. (#12380) Thanks @magendary, @thewilloftheshadow.
- Discord: cap gateway reconnect attempts to avoid infinite retry loops. (#12230) Thanks @Yida-Dev.
- Telegram: render markdown spoilers with `<tg-spoiler>` HTML tags. (#11543) Thanks @ezhikkk.
- Telegram: truncate command registration to 100 entries to avoid `BOT_COMMANDS_TOO_MUCH` failures on startup. (#12356) Thanks @arosstale.
- Telegram: match DM `allowFrom` against sender user id (fallback to chat id) and clarify pairing logs. (#12779) Thanks @liuxiaopai-ai.
- Onboarding: QuickStart now auto-installs shell completion (prompt only in Manual).
- Auth: strip embedded line breaks from pasted API keys and tokens before storing/resolving credentials.
- Agents: strip reasoning tags and downgraded tool markers from messaging tool and streaming output to prevent leakage. (#11053, #13453) Thanks @liebertar, @meaadore1221-afk, @gumadeiras.
- Web UI: make chat refresh smoothly scroll to the latest messages and suppress new-messages badge flash during manual refresh.
- Web UI: coerce Form Editor values to schema types before `config.set` and `config.apply`, preventing numeric and boolean fields from being serialized as strings. (#13468) Thanks @mcaxtr.
- Tools/web_search: include provider-specific settings in the web search cache key, and pass `inlineCitations` for Grok. (#12419) Thanks @tmchow.
- Tools/web_search: fix Grok response parsing for xAI Responses API output blocks. (#13049) Thanks @ereid7.
- Tools/web_search: normalize direct Perplexity model IDs while keeping OpenRouter model IDs unchanged. (#12795) Thanks @cdorsey.
- Model failover: treat HTTP 400 errors as failover-eligible, enabling automatic model fallback. (#1879) Thanks @orenyomtov.
- Errors: prevent false positive context overflow detection when conversation mentions "context overflow" topic. (#2078) Thanks @sbking.
- Errors: avoid rewriting/swallowing normal assistant replies that mention error keywords by scoping `sanitizeUserFacingText` rewrites to error-context. (#12988) Thanks @Takhoffman.
- Config: re-hydrate state-dir `.env` during runtime config loads so `${VAR}` substitutions remain resolvable. (#12748) Thanks @rodrigouroz.
- Gateway: no more post-compaction amnesia; injected transcript writes now preserve Pi session `parentId` chain so agents can remember again. (#12283) Thanks @Takhoffman.
- Gateway: fix multi-agent sessions.usage discovery. (#11523) Thanks @Takhoffman.
- Agents: recover from context overflow caused by oversized tool results (pre-emptive capping + fallback truncation). (#11579) Thanks @tyler6204.
- Subagents/compaction: stabilize announce timing and preserve compaction metrics across retries. (#11664) Thanks @tyler6204.
- Cron: share isolated announce flow and harden scheduling/delivery reliability. (#11641) Thanks @tyler6204.
- Cron tool: recover flat params when LLM omits the `job` wrapper for add requests. (#12124) Thanks @tyler6204.
- Gateway/CLI: when `gateway.bind=lan`, use a LAN IP for probe URLs and Control UI links. (#11448) Thanks @AnonO6.
- CLI: make `openclaw plugins list` output scannable by hoisting source roots and shortening bundled/global/workspace plugin paths.
- Hooks: fix bundled hooks broken since 2026.2.2 (tsdown migration). (#9295) Thanks @patrickshao.
- Routing: refresh bindings per message by loading config at route resolution so binding changes apply without restart. (#11372) Thanks @juanpablodlc.
- Exec approvals: render forwarded commands in monospace for safer approval scanning. (#11937) Thanks @sebslight.
- Config: clamp `maxTokens` to `contextWindow` to prevent invalid model configs. (#5516) Thanks @lailoo.
- Thinking: allow xhigh for `github-copilot/gpt-5.2-codex` and `github-copilot/gpt-5.2`. (#11646) Thanks @LatencyTDH.
- Thinking: honor `/think off` for reasoning-capable models. (#9564) Thanks @liuy.
- Discord: support forum/media thread-create starter messages, wire `message thread create --message`, and harden routing. (#10062) Thanks @jarvis89757.
- Paths: structurally resolve `OPENCLAW_HOME`-derived home paths and fix Windows drive-letter handling in tool meta shortening. (#12125) Thanks @mcaxtr.
- Memory: set Voyage embeddings `input_type` for improved retrieval. (#10818) Thanks @mcinteerj.
- Memory: disable async batch embeddings by default for memory indexing (opt-in via `agents.defaults.memorySearch.remote.batch.enabled`). (#13069) Thanks @mcinteerj.
- Memory/QMD: reuse default model cache across agents instead of re-downloading per agent. (#12114) Thanks @tyler6204.
- Memory/QMD: run boot refresh in background by default, add configurable QMD maintenance timeouts, retry QMD after fallback failures, and scope QMD queries to OpenClaw-managed collections. (#9690, #9705, #10042) Thanks @vignesh07.
- Memory/QMD: initialize QMD backend on gateway startup so background update timers restart after process reloads. (#10797) Thanks @vignesh07.
- Config/Memory: auto-migrate legacy top-level `memorySearch` settings into `agents.defaults.memorySearch`. (#11278, #9143) Thanks @vignesh07.
- Media understanding: recognize `.caf` audio attachments for transcription. (#10982) Thanks @succ985.
- State dir: honor `OPENCLAW_STATE_DIR` for default device identity and canvas storage paths. (#4824) Thanks @kossoy.
<<<<<<< HEAD
>>>>>>> 8d80212f9 (docs: credit memorySearch changelog)
=======
- Doctor/State dir: suppress repeated legacy migration warnings only for valid symlink mirrors, while keeping warnings for empty or invalid legacy trees. (#11709) Thanks @gumadeiras.
- Tests: harden flaky hotspots by removing timer sleeps, consolidating onboarding provider-auth coverage, and improving memory test realism. (#11598) Thanks @gumadeiras.
- macOS: honor Nix-managed defaults suite (`ai.openclaw.mac`) for nixMode to prevent onboarding from reappearing after bundle-id churn. (#12205) Thanks @joshp123.
- Matrix: add multi-account support via `channels.matrix.accounts`; use per-account config for dm policy, allowFrom, groups, and other settings; serialize account startup to avoid race condition. (#3165, #3085) Thanks @emonty.
>>>>>>> caf5d2dd7 (feat(matrix): Add multi-account support to Matrix channel)

### Added

- iOS: alpha node app + setup-code onboarding. (#11756) Thanks @mbelinky.
- Channels: comprehensive BlueBubbles and channel cleanup. (#11093) Thanks @tyler6204.
- Plugins: device pairing + phone control plugins (Telegram `/pair`, iOS/Android node controls). (#11755) Thanks @mbelinky.
- Tools: add Grok (xAI) as a `web_search` provider. (#12419) Thanks @tmchow.
- Gateway: add agent management RPC methods for the web UI (`agents.create`, `agents.update`, `agents.delete`). (#11045) Thanks @advaitpaliwal.
- Web UI: show a Compaction divider in chat history. (#11341) Thanks @Takhoffman.
- Agents: include runtime shell in agent envelopes. (#1835) Thanks @Takhoffman.
- Paths: add `OPENCLAW_HOME` for overriding the home directory used by internal path resolution. (#12091) Thanks @sebslight.

### Fixes

- Telegram: harden quote parsing; preserve quote context; avoid QUOTE_TEXT_INVALID; avoid nested reply quote misclassification. (#12156) Thanks @rybnikov.
- Telegram: recover proactive sends when stale topic thread IDs are used by retrying without `message_thread_id`. (#11620)
- Telegram: render markdown spoilers with `<tg-spoiler>` HTML tags. (#11543) Thanks @ezhikkk.
- Telegram: truncate command registration to 100 entries to avoid `BOT_COMMANDS_TOO_MUCH` failures on startup. (#12356) Thanks @arosstale.
- Telegram: match DM `allowFrom` against sender user id (fallback to chat id) and clarify pairing logs. (#12779) Thanks @liuxiaopai-ai.
- Auth: strip embedded line breaks from pasted API keys and tokens before storing/resolving credentials.
- Web UI: make chat refresh smoothly scroll to the latest messages and suppress new-messages badge flash during manual refresh.
- Tools/web_search: include provider-specific settings in the web search cache key, and pass `inlineCitations` for Grok. (#12419) Thanks @tmchow.
- Model failover: treat HTTP 400 errors as failover-eligible, enabling automatic model fallback. (#1879) Thanks @orenyomtov.
- Errors: prevent false positive context overflow detection when conversation mentions "context overflow" topic. (#2078) Thanks @sbking.
- Gateway: no more post-compaction amnesia; injected transcript writes now preserve Pi session `parentId` chain so agents can remember again. (#12283) Thanks @Takhoffman.
- Gateway: fix multi-agent sessions.usage discovery. (#11523) Thanks @Takhoffman.
- Agents: recover from context overflow caused by oversized tool results (pre-emptive capping + fallback truncation). (#11579) Thanks @tyler6204.
- Subagents/compaction: stabilize announce timing and preserve compaction metrics across retries. (#11664) Thanks @tyler6204.
- Cron: share isolated announce flow and harden scheduling/delivery reliability. (#11641) Thanks @tyler6204.
- Cron tool: recover flat params when LLM omits the `job` wrapper for add requests. (#12124) Thanks @tyler6204.
- Gateway/CLI: when `gateway.bind=lan`, use a LAN IP for probe URLs and Control UI links. (#11448) Thanks @AnonO6.
- Hooks: fix bundled hooks broken since 2026.2.2 (tsdown migration). (#9295) Thanks @patrickshao.
- Routing: refresh bindings per message by loading config at route resolution so binding changes apply without restart. (#11372) Thanks @juanpablodlc.
- Exec approvals: render forwarded commands in monospace for safer approval scanning. (#11937) Thanks @sebslight.
- Config: clamp `maxTokens` to `contextWindow` to prevent invalid model configs. (#5516) Thanks @lailoo.
- Thinking: allow xhigh for `github-copilot/gpt-5.2-codex` and `github-copilot/gpt-5.2`. (#11646) Thanks @LatencyTDH.
- Thinking: honor `/think off` for reasoning-capable models. (#9564) Thanks @liuy.
- Discord: support forum/media thread-create starter messages, wire `message thread create --message`, and harden routing. (#10062) Thanks @jarvis89757.
<<<<<<< HEAD
- Telegram: render markdown spoilers with `<tg-spoiler>` HTML tags. (#11543) Thanks @ezhikkk.
- Telegram: recover proactive sends when stale topic thread IDs are used by retrying without `message_thread_id`. (#11620)
- Web UI: make chat refresh smoothly scroll to the latest messages and suppress new-messages badge flash during manual refresh.
>>>>>>> fb8c653f5 (chore(release): 2026.2.9)
- Gateway/CLI: when `gateway.bind=lan`, use a LAN IP for probe URLs and Control UI links. (#11448) Thanks @AnonO6.
=======
>>>>>>> d311152a7 (docs(changelog): reorder 2026.2.9 for end users)
- Paths: structurally resolve `OPENCLAW_HOME`-derived home paths and fix Windows drive-letter handling in tool meta shortening. (#12125) Thanks @mcaxtr.
- Memory: set Voyage embeddings `input_type` for improved retrieval. (#10818) Thanks @mcinteerj.
<<<<<<< HEAD
- Memory/QMD: run boot refresh in background by default, add configurable QMD maintenance timeouts, and retry QMD after fallback failures. (#9690, #9705)
=======
- Memory/QMD: reuse default model cache across agents instead of re-downloading per agent. (#12114) Thanks @tyler6204.
>>>>>>> fb8c653f5 (chore(release): 2026.2.9)
- Media understanding: recognize `.caf` audio attachments for transcription. (#10982) Thanks @succ985.
<<<<<<< HEAD
=======
- State dir: honor `OPENCLAW_STATE_DIR` for default device identity and canvas storage paths. (#4824) Thanks @kossoy.
<<<<<<< HEAD
- Doctor/State dir: suppress repeated legacy migration warnings only for valid symlink mirrors, while keeping warnings for empty or invalid legacy trees. (#11709) Thanks @gumadeiras.
- Tests: harden flaky hotspots by removing timer sleeps, consolidating onboarding provider-auth coverage, and improving memory test realism. (#11598) Thanks @gumadeiras.
- macOS: honor Nix-managed defaults suite (`ai.openclaw.mac`) for nixMode to prevent onboarding from reappearing after bundle-id churn. (#12205) Thanks @joshp123.
>>>>>>> 69aa3df11 (macOS: honor stable Nix defaults suite (#12205))
=======
>>>>>>> fb8c653f5 (chore(release): 2026.2.9)

>>>>>>> a30c4f45c (Update CHANGELOG.md for version 2026.2.6-4: Added RPC methods for agent management, fixed context overflow recovery, improved LAN IP handling, enhanced memory retrieval, and updated media understanding for audio transcription.)
## 2026.2.6

### Changes

<<<<<<< HEAD
=======
- Cron: default `wakeMode` is now `"now"` for new jobs (was `"next-heartbeat"`). (#10776) Thanks @tyler6204.
- Cron: `cron run` defaults to force execution; use `--due` to restrict to due-only. (#10776) Thanks @tyler6204.
>>>>>>> fb8c653f5 (chore(release): 2026.2.9)
- Models: support Anthropic Opus 4.6 and OpenAI Codex gpt-5.3-codex (forward-compat fallbacks). (#9853, #10720, #9995) Thanks @TinyTb, @calvin-hpnet, @tyler6204.
- Providers: add xAI (Grok) support. (#9885) Thanks @grp06.
- Web UI: add token usage dashboard. (#10072) Thanks @Takhoffman.
- Web UI: add RTL auto-direction support for Hebrew/Arabic text in chat composer and rendered messages. (#11498) Thanks @dirbalak.
- Memory: native Voyage AI support. (#7078) Thanks @mcinteerj.
- Sessions: cap sessions_history payloads to reduce context overflow. (#10000) Thanks @gut-puncture.
- CLI: sort commands alphabetically in help output. (#8068) Thanks @deepsoumya617.
- CI: optimize pipeline throughput (macOS consolidation, Windows perf, workflow concurrency). (#10784) Thanks @mcaxtr.
- Agents: bump pi-mono to 0.52.7; add embedded forward-compat fallback for Opus 4.6 model ids.

<<<<<<< HEAD
### Fixes

=======
### Added

- Cron: run history deep-links to session chat from the dashboard. (#10776) Thanks @tyler6204.
- Cron: per-run session keys in run log entries and default labels for cron sessions. (#10776) Thanks @tyler6204.
- Cron: legacy payload field compatibility (`deliver`, `channel`, `to`, `bestEffortDeliver`) in schema. (#10776) Thanks @tyler6204.

### Fixes

- Cron: scheduler reliability (timer drift, restart catch-up, lock contention, stale running markers). (#10776) Thanks @tyler6204.
- Cron: store migration hardening (legacy field migration, parse error handling, explicit delivery mode persistence). (#10776) Thanks @tyler6204.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> a30c4f45c (Update CHANGELOG.md for version 2026.2.6-4: Added RPC methods for agent management, fixed context overflow recovery, improved LAN IP handling, enhanced memory retrieval, and updated media understanding for audio transcription.)
=======
- Memory: set Voyage embeddings `input_type` for improved retrieval. (#10818) Thanks @mcinteerj.
>>>>>>> fb8c653f5 (chore(release): 2026.2.9)
=======
- Memory: set Voyage embeddings `input_type` for improved retrieval. (#10818) Thanks @mcinteerj.
- Memory/QMD: run boot refresh in background by default, add configurable QMD maintenance timeouts, retry QMD after fallback failures, and scope QMD queries to OpenClaw-managed collections. (#9690, #9705, #10042) Thanks @vignesh07.
- Media understanding: recognize `.caf` audio attachments for transcription. (#10982) Thanks @succ985.
>>>>>>> 8d80212f9 (docs: credit memorySearch changelog)
- Telegram: auto-inject DM topic threadId in message tool + subagent announce. (#7235) Thanks @Lukavyi.
- Security: require auth for Gateway canvas host and A2UI assets. (#9518) Thanks @coygeek.
- Cron: fix scheduling and reminder delivery regressions; harden next-run recompute + timer re-arming + legacy schedule fields. (#9733, #9823, #9948, #9932) Thanks @tyler6204, @pycckuu, @j2h4u, @fujiwara-tofu-shop.
- Update: harden Control UI asset handling in update flow. (#10146) Thanks @gumadeiras.
- Security: add skill/plugin code safety scanner; redact credentials from config.get gateway responses. (#9806, #9858) Thanks @abdelsfane.
- Exec approvals: coerce bare string allowlist entries to objects. (#9903) Thanks @mcaxtr.
- Slack: add mention stripPatterns for /new and /reset. (#9971) Thanks @ironbyte-rgb.
- Chrome extension: fix bundled path resolution. (#8914) Thanks @kelvinCB.
- Compaction/errors: allow multiple compaction retries on context overflow; show clear billing errors. (#8928, #8391) Thanks @Glucksberg.

## 2026.2.3

<<<<<<< HEAD
- d84eb464 fix: restore discord owner hint from allowlists (Peter Steinberger).
- 3b40227b fix: remove unused cron import (Peter Steinberger).
- 0621d0e9 fix(cli): resolve bundled chrome extension path (Kelvin Calcano).
- 1008c28f test(cli): use unique temp dir for extension install (Kelvin Calcano).
- 44bbe09b fix(cli): support bundled extension path in dist root (Kelvin Calcano).
- 34e78a70 style(cli): satisfy lint rules in extension path resolver (Kelvin Calcano).
- bdb90ea4 test: register discord plugin in allowlist test (Peter Steinberger).
- 5031b283 chore: bump version to 2026.2.4 (Peter Steinberger).
- a4d1af1b fix: resolve discord owner allowFrom matches (Peter Steinberger).
- 8860d2ed fix(telegram): preserve DM topic threadId in deliveryContext (damaozi).
- c0b267a0 test(telegram): add DM topic threadId deliveryContext test for #8891 (damaozi).
- 460808e0 Update deps. (cpojer).
- 8b845123 chore: Typecheck test helper files. (cpojer).
- 34424ce5 docs(install): rename install overview page (sebslight).
- 203e3804 CLI: sort commands alphabetically in help output (Soumyadeep Ghosh).
- c8f4bca0 docs: fix onboarding rendering issues (Sebastian).
- 54737422 chore: reset appcast to 2026.2.3 (Peter Steinberger).
- eef247b7 fix: auto-inject Telegram forum topic threadId in message tool (Clawdbot).
- 6ac5dd2c test: cover telegram topic threadId auto-injection and subagent origin threading (Clawdbot).
- a13efbe2 fix: pass threadId/to/accountId from parent to subagent gateway call (Clawdbot).
- 1473fb19 update handle (Gustavo Madeira Santana).
- 4fc4c525 🤖 Feishu: expand channel support (Josh Palmer).
- 7c951b01 🤖 Feishu: tighten mention gating (Josh Palmer).
- 6b7d3c30 Revert "feat(skills): add QR code skill (#8817)" (Gustavo Madeira Santana).
- b8004a28 docs: improve DM security guidance with concrete example (Shrinija Kummari).
- 873182ec docs: tighten secure DM example (George Pickett).
- 8577d015 chore: remove tracked .DS_Store files (Gustavo Madeira Santana).
- db31c0cc feat: add xAI Grok provider support (George Pickett).
- 155dfa93 fix(onboard): align xAI default model to grok-4 (George Pickett).
- 6ff209e9 fix(exec-approvals): coerce bare string allowlist entries to objects (#9790) (Marcus Castro).
- 5958e569 Thinking: accept extra-high alias and sync Codex FAQ wording (slonce70).
- 7db83954 Changelog: note #9976 thinking alias + Codex 5.3 docs sync (slonce70).
- 6f4665dd chore: Update deps. (cpojer).
- 2267d58a feat(feishu): replace built-in SDK with community plugin (Yifeng Wang).
- 7e32f1ce fix(feishu): add targeted eslint-disable comments for SDK integration (Yifeng Wang).
- 8ba1387b fix(feishu): fix webhook mode silent exit and receive_id_type default (Yifeng Wang).
- 7e005acd chore: update pnpm-lock.yaml for feishu extension deps (Yifeng Wang).
- 5f6e1c19 feat(feishu): sync with clawdbot-feishu #137 (multi-account support) (Yifeng Wang).
- 0a485924 add PR review workflow templates (Gustavo Madeira Santana).
- 47538bca fix: Gateway canvas host bypasses auth and serves files unauthenticated (Coy Geek).
- ee1ec3fa Add proper `onToolResult` fallback. (cpojer).
- 6c42d346 chore: Add VS Code defaults and extensions so that Oxlint/Oxfmt work automatically. (cpojer).
- 8abce8a8 fix: `onToolResult` fallback is not expected. (cpojer).
- f16e32b7 fix: Do not `process.exit(0)` in the middle of a test. (cpojer).
- 328b69be chore: Fix audit test on Windows. (cpojer).
- ac0c2f26 docs: update clawtributors (add @unisone) (Sebastian).
- 7b2a2212 chore: run lint step after build during preflight check (Gustavo Madeira Santana).
- 72245855 fix: add fallback for Control UI asset resolution in global installs (Gustavo Madeira Santana).
- b40da2cb fix: remove dead restore control-ui step from update runner (Gustavo Madeira Santana).
- 4a59b778 fix: CLI harden update restart imports and fix nested bundle version resolution (Gustavo Madeira Santana).
- 134c03a9 feat: add markdownlint configuration for documentation formatting and linting (Sebastian).
- 1bf9f237 docs: linting (Sebastian).
- c7aec066 docs(markdownlint): enable autofixable rules and normalize links (Sebastian).
- 0a1f4f66 revert(docs): undo markdownlint autofix churn (Sebastian).
<<<<<<< HEAD
>>>>>>> 3b768a285 (docs(changelog): prepare 2026.2.6)
=======
- 3b768a28 docs(changelog): prepare 2026.2.6 (Peter Steinberger).
<<<<<<< HEAD
>>>>>>> ac5944cde (docs(changelog): include merged PRs since v2026.2.3)
=======
- ac5944cd docs(changelog): include merged PRs since v2026.2.3 (Peter Steinberger).
- 677450cd chore(release): bump version to 2026.2.6 (Peter Steinberger).
- d898ad68 fix(telegram): cast fetch for grammY ApiClientOptions (Peter Steinberger).
- 5163833b docs: fix markdownlint fragments + headings (Peter Steinberger).
>>>>>>> 7be921c43 (docs(changelog): refresh 2026.2.6 since v2026.2.3)
=======
### Changes

- Telegram: remove last `@ts-nocheck` from `bot-handlers.ts`, use Grammy types directly, deduplicate `StickerMetadata`. Zero `@ts-nocheck` remaining in `src/telegram/`. (#9206)
- Telegram: remove `@ts-nocheck` from `bot-message.ts`, type deps via `Omit<BuildTelegramMessageContextParams>`, widen `allMedia` to `TelegramMediaRef[]`. (#9180)
- Telegram: remove `@ts-nocheck` from `bot.ts`, fix duplicate `bot.catch` error handler (Grammy overrides), remove dead reaction `message_thread_id` routing, harden sticker cache guard. (#9077)
- Onboarding: add Cloudflare AI Gateway provider setup and docs. (#7914) Thanks @roerohan.
- Onboarding: add Moonshot (.cn) auth choice and keep the China base URL when preserving defaults. (#7180) Thanks @waynelwz.
- Docs: clarify tmux send-keys for TUI by splitting text and Enter. (#7737) Thanks @Wangnov.
- Docs: mirror the landing page revamp for zh-CN (features, quickstart, docs directory, network model, credits). (#8994) Thanks @joshp123.
- Messages: add per-channel and per-account responsePrefix overrides across channels. (#9001) Thanks @mudrii.
- Cron: add announce delivery mode for isolated jobs (CLI + Control UI) and delivery mode config.
- Cron: default isolated jobs to announce delivery; accept ISO 8601 `schedule.at` in tool inputs.
- Cron: hard-migrate isolated jobs to announce/none delivery; drop legacy post-to-main/payload delivery fields and `atMs` inputs.
- Cron: delete one-shot jobs after success by default; add `--keep-after-run` for CLI.
- Cron: suppress messaging tools during announce delivery so summaries post consistently.
- Cron: avoid duplicate deliveries when isolated runs send messages directly.

### Fixes

- Heartbeat: allow explicit accountId routing for multi-account channels. (#8702) Thanks @lsh411.
- TUI/Gateway: handle non-streaming finals, refresh history for non-local chat runs, and avoid event gap warnings for targeted tool streams. (#8432) Thanks @gumadeiras.
- Shell completion: auto-detect and migrate slow dynamic patterns to cached files for faster terminal startup; add completion health checks to doctor/update/onboard.
- Telegram: honor session model overrides in inline model selection. (#8193) Thanks @gildo.
- Web UI: fix agent model selection saves for default/non-default agents and wrap long workspace paths. Thanks @Takhoffman.
- Web UI: resolve header logo path when `gateway.controlUi.basePath` is set. (#7178) Thanks @Yeom-JinHo.
- Web UI: apply button styling to the new-messages indicator.
- Onboarding: infer auth choice from non-interactive API key flags. (#8484) Thanks @f-trycua.
- Security: keep untrusted channel metadata out of system prompts (Slack/Discord). Thanks @KonstantinMirin.
- Security: enforce sandboxed media paths for message tool attachments. (#9182) Thanks @victormier.
- Security: require explicit credentials for gateway URL overrides to prevent credential leakage. (#8113) Thanks @victormier.
- Security: gate `whatsapp_login` tool to owner senders and default-deny non-owner contexts. (#8768) Thanks @victormier.
- Voice call: harden webhook verification with host allowlists/proxy trust and keep ngrok loopback bypass.
- Voice call: add regression coverage for anonymous inbound caller IDs with allowlist policy. (#8104) Thanks @victormier.
- Cron: accept epoch timestamps and 0ms durations in CLI `--at` parsing.
- Cron: reload store data when the store file is recreated or mtime changes.
- Cron: deliver announce runs directly, honor delivery mode, and respect wakeMode for summaries. (#8540) Thanks @tyler6204.
- Telegram: include forward_from_chat metadata in forwarded messages and harden cron delivery target checks. (#8392) Thanks @Glucksberg.
- macOS: fix cron payload summary rendering and ISO 8601 formatter concurrency safety.
<<<<<<< HEAD
>>>>>>> c237a82b4 (docs(changelog): curate 2026.2.6)
=======
- Discord: enforce DM allowlists for agent components (buttons/select menus), honoring pairing store approvals and tag matches. (#11254) Thanks @thedudeabidesai.
>>>>>>> 8d80212f9 (docs: credit memorySearch changelog)

## 2026.2.2-3

### Fixes

- Update: ship legacy daemon-cli shim for pre-tsdown update imports (fixes daemon restart after npm update).

## 2026.2.2-2

### Changes

- Docs: promote BlueBubbles as the recommended iMessage integration; mark imsg channel as legacy. (#8415) Thanks @tyler6204.

### Fixes

- CLI status: resolve build-info from bundled dist output (fixes "unknown" commit in npm builds).

## 2026.2.2-1

### Fixes

- CLI status: fall back to build-info for version detection (fixes "unknown" in beta builds). Thanks @gumadeira.

>>>>>>> b64c1a56a (chore: update changelog for #8193 (thanks @gildo))
## 2026.2.2
<<<<<<< HEAD
=======
=======

### Changes

<<<<<<< HEAD
=======
- Web UI: add Agents dashboard for managing agent files, tools, skills, models, channels, and cron jobs.
<<<<<<< HEAD
<<<<<<< HEAD
- Docs: reorganize navigation into eight tabs and restore `/images` redirect. (#7622) Thanks @ethanpalm.
=======
- Subagents: discourage direct messaging tool use unless a specific external recipient is requested.
- Memory: implement the opt-in QMD backend for workspace memory. (#3160) Thanks @vignesh07.
>>>>>>> c396877dd (Changelog: move cron entries to 2026.2.3)
- Security: add healthcheck skill and bootstrap audit guidance. (#7641) Thanks @Takhoffman.
>>>>>>> f57e70912 (docs: Update information architecture for OpenClaw docs (#7622))
- Docs: seed zh-CN translations. (#6619) Thanks @joshp123.
- Docs: expand zh-Hans navigation and fix zh-CN index asset paths. (#7242) Thanks @joshp123.
- Docs: add zh-CN landing notice + AI-translated image. (#7303) Thanks @joshp123.
<<<<<<< HEAD
=======
- Docs: fix typo - clawdbot is the compatibility shim, not openclaw. (#7415) Thanks @lailoo.
- Config: allow setting a default subagent thinking level via `agents.defaults.subagents.thinking` (and per-agent `agents.list[].subagents.thinking`). (#7372) Thanks @tyler6204.
<<<<<<< HEAD
>>>>>>> 0eae9f456 (Docs: fix compatibility shim note)
=======
- Memory: implement the opt-in QMD backend for workspace memory. (#3160) Thanks @vignesh07.
- Config: allow setting a default subagent thinking level via `agents.defaults.subagents.thinking` (and per-agent `agents.list[].subagents.thinking`). (#7372) Thanks @tyler6204.
- Security: add healthcheck skill and bootstrap audit guidance. (#7641) Thanks @Takhoffman.
- Docs: zh-CN translation polish + pipeline guidance. (#8202, #6995) Thanks @AaronWander, @taiyi747, @Explorer1092, @rendaoyuan.
- Docs: zh-CN translations seed + nav polish + landing notice + typo fix. (#6619, #7242, #7303, #7415) Thanks @joshp123, @lailoo.
>>>>>>> 1c4db9159 (chore: prepare 2026.2.2 release)
=======
- Docs: zh-CN translations seed + polish, pipeline guidance, nav/landing updates, and typo fixes. (#8202, #6995, #6619, #7242, #7303, #7415) Thanks @AaronWander, @taiyi747, @Explorer1092, @rendaoyuan, @joshp123, @lailoo.
- Docs: add zh-CN i18n guardrails to avoid editing generated translations. (#8416) Thanks @joshp123.
>>>>>>> fd8f8843b (Docs: guard zh-CN i18n workflow)

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Security: Matrix allowlists now require full MXIDs; ambiguous name resolution no longer grants access. Thanks @MegaManSec.
<<<<<<< HEAD
>>>>>>> 8f3bfbd1c (fix(matrix): harden allowlists)
- Docs: finish renaming the QMD memory docs to reference the OpenClaw state dir.
- Onboarding: keep TUI flow exclusive (skip completion prompt + background Web UI seed).
- Onboarding: drop completion prompt now handled by install/update.
- TUI: block onboarding output while TUI is active and restore terminal state on exit.
- CLI: cache shell completion scripts in state dir and source cached files in profiles.
- Zsh completion: escape option descriptions to avoid invalid option errors.
- Agents: repair malformed tool calls and session transcripts. (#7473) Thanks @justinhuangcode.
- fix(agents): validate AbortSignal instances before calling AbortSignal.any() (#7277) (thanks @Elarwei001)
>>>>>>> b37626ce6 (docs: finish renaming memory state dir references)
- fix(webchat): respect user scroll position during streaming and refresh (#7226) (thanks @marcomarandiz)
<<<<<<< HEAD
=======
- Telegram: recover from grammY long-poll timed out errors. (#7466) Thanks @macmimi23.
- Media understanding: skip binary media from file text extraction. (#7475) Thanks @AlexZhangji.
>>>>>>> 561a10c49 (fix(telegram): recover from grammY long-poll timeouts (#7466) (thanks @macmimi23))
=======
- Security: enforce access-group gating for Slack slash commands when channel type lookup fails.
<<<<<<< HEAD
- Security: require validated shared-secret auth before skipping device identity on gateway connect.
>>>>>>> 1c4db9159 (chore: prepare 2026.2.2 release)
=======
- Security: require validated shared-secret auth before skipping device identity on gateway connect. Thanks @simecek.
>>>>>>> 576f7072a (docs(changelog): credit @simecek for gateway connect auth fix)
- Security: guard skill installer downloads with SSRF checks (block private/localhost URLs).
<<<<<<< HEAD
=======
- Security/Gateway: require `operator.approvals` for in-chat `/approve` when invoked from gateway clients. Thanks @yueyueL.
- Security: harden Windows exec allowlist; block cmd.exe bypass via single &. Thanks @simecek.
- Discord: route autoThread replies to existing threads instead of the root channel. (#8302) Thanks @gavinbmoore, @thewilloftheshadow.
>>>>>>> 0b20ee272 (docs(changelog): note gateway /approve scope fix)
- Media understanding: apply SSRF guardrails to provider fetches; allow private baseUrl overrides explicitly.
<<<<<<< HEAD
<<<<<<< HEAD
=======
- Tests: stub SSRF DNS pinning in web auto-reply + Gemini video coverage. (#6619) Thanks @joshp123.
- fix(voice-call): harden inbound allowlist; reject anonymous callers; require Telnyx publicKey for allowlist; token-gate Twilio media streams; cap webhook body size (thanks @simecek)
>>>>>>> f8dfd034f (fix(voice-call): harden inbound policy)
=======
- fix(voice-call): harden inbound allowlist; reject anonymous callers; require Telnyx publicKey for allowlist; token-gate Twilio media streams; cap webhook body size (thanks @simecek)
- Onboarding: keep TUI flow exclusive (skip completion prompt + background Web UI seed); completion prompt now handled by install/update.
- CLI/Zsh completion: cache scripts in state dir and escape option descriptions to avoid invalid option errors.
<<<<<<< HEAD
=======
- fix(ui): resolve Control UI asset path correctly.
- fix(ui): refresh agent files after external edits.
<<<<<<< HEAD
>>>>>>> f52ca0a71 (fix(ui): note agent file refresh in changelog)
- Docs: finish renaming the QMD memory docs to reference the OpenClaw state dir.
=======
>>>>>>> 9f5429e52 (docs: trim refactor-only and duplicate changelog entries)
- Tests: stub SSRF DNS pinning in web auto-reply + Gemini video coverage. (#6619) Thanks @joshp123.
>>>>>>> 1c4db9159 (chore: prepare 2026.2.2 release)

>>>>>>> 4023b76ed (docs: add changelog for zh-CN translations (#6619) (thanks @joshp123))
## 2026.2.1

### Changes

- Docs: onboarding/install/i18n/exec-approvals/Control UI/exe.dev/cacheRetention updates + misc nav/typos. (#3050, #3461, #4064, #4675, #4729, #4763, #5003, #5402, #5446, #5474, #5663, #5689, #5694, #5967, #6270, #6300, #6311, #6416, #6487, #6550, #6789)
- Telegram: use shared pairing store. (#6127) Thanks @obviyus.
- Agents: add OpenRouter app attribution headers. Thanks @alexanderatallah.
- Agents: add system prompt safety guardrails. (#5445) Thanks @joshp123.
- Agents: update pi-ai to 0.50.9 and rename cacheControlTtl -> cacheRetention (with back-compat mapping).
- Agents: extend CreateAgentSessionOptions with systemPrompt/skills/contextFiles.
- Agents: add tool policy conformance snapshot (no runtime behavior change). (#6011)
- Auth: update MiniMax OAuth hint + portal auth note copy.
- Discord: inherit thread parent bindings for routing. (#3892) Thanks @aerolalit.
- Gateway: inject timestamps into agent and chat.send messages. (#3705) Thanks @conroywhitney, @CashWilliams.
- Gateway: require TLS 1.3 minimum for TLS listeners. (#5970) Thanks @loganaden.
- Web UI: refine chat layout + extend session active duration.
- CI: add formal conformance + alias consistency checks. (#5723, #5807)
>>>>>>> ed4529e24 (docs: update 2026.2.1 changelog)

### Fixes

<<<<<<< HEAD
- Plugins: validate plugin/hook install paths and reject traversal-like names.
=======
- Security: guard remote media fetches with SSRF protections (block private/localhost, DNS pinning).
- Updates: clean stale global install rename dirs and extend gateway update timeouts to avoid npm ENOTEMPTY failures.
- Security/Plugins/Hooks: validate install paths and reject traversal-like names (prevents path traversal outside the state dir). Thanks @logicx24.
>>>>>>> 9e7aab9ba (docs(changelog): credit logicx24 for plugin install traversal report)
- Telegram: add download timeouts for file fetches. (#6914) Thanks @hclsys.
- Telegram: enforce thread specs for DM vs forum sends. (#6833) Thanks @obviyus.
<<<<<<< HEAD
- Streaming: avoid stuck typing indicator after streamed BlueBubbles replies.
- Streaming: dedupe fence-split handling and cover maxChars fallback for newline chunking.

>>>>>>> f6d98a908 (docs: add changelog entry for plugin install hardening)
=======
>>>>>>> 8b64705e0 (docs: fold 2026.2.2 into 2026.2.1)
## 2026.2.1
>>>>>>> d5f6caba3 (docs: merge 2026.2.2 changelog into 2026.2.1)

### Changes

<<<<<<< HEAD
<<<<<<< HEAD
=======
- Docs: add direct BotFather link and verification reminder in Telegram setup. (#4064) Thanks @shatner.
- Docs: add Mintlify language navigation for zh-Hans. (#6416) Thanks @joshp123.
- Docs: add device pairing section to Control UI docs. (#5003) Thanks @baccula.
- Docs: improve exe.dev setup instructions. (#4675) Thanks @itsjling.
- Docs: add pnpm approve-builds step for global installs. (#5663) Thanks @sfo2001.
- Docs: add zh-CN entrypoint translations. (#6300) Thanks @joshp123.
- Docs: document cacheRetention parameter. (#6270) Thanks @kimitaka.
- Docs: clarify Discord exec approvals UI. (#6550) Thanks @sebslight.
- Docs: navigation polish + cron quick start/formatting + Moonshot markers/typos + URL/anchor fixes.
=======
- Docs: onboarding/install/i18n/exec-approvals/Control UI/exe.dev/cacheRetention updates + misc nav/typos.
>>>>>>> 99346314f (chore: trim docs changelog)
- Telegram: use shared pairing store. (#6127) Thanks @obviyus.
<<<<<<< HEAD
=======
- Agents: add OpenRouter app attribution headers. (#5050) Thanks @alexanderatallah.
- Agents: add system prompt safety guardrails. (#5445) Thanks @joshp123.
- Agents: update pi-ai to 0.50.9 and rename cacheControlTtl -> cacheRetention (with back-compat mapping).
- Discord: inherit thread parent bindings for routing. (#3892) Thanks @aerolalit.
<<<<<<< HEAD
>>>>>>> 238200f65 (chore: update changelog and relay formatting)
=======
- Gateway: require TLS 1.3 minimum for TLS listeners. (#5970) Thanks @loganaden.
>>>>>>> 92112a61d (chore: add TLS 1.3 minimum changelog (#5970) (thanks @loganaden))

>>>>>>> 8ff75eaf1 (Docs: Direct link to BotFather on Telegram (#4064))
### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
- Docs: run oxfmt to fix format checks. (#6513) Thanks @app/clawdinator.
=======
=======
- Plugins: validate plugin/hook install paths and reject traversal-like names.
>>>>>>> 8b64705e0 (docs: fold 2026.2.2 into 2026.2.1)
- Telegram: add download timeouts for file fetches. (#6914) Thanks @hclsys.
- Telegram: enforce thread specs for DM vs forum sends. (#6833) Thanks @obviyus.
- Streaming: avoid stuck typing indicator after streamed BlueBubbles replies.
- Streaming: dedupe fence-split handling and cover maxChars fallback for newline chunking.
<<<<<<< HEAD
>>>>>>> d5f6caba3 (docs: merge 2026.2.2 changelog into 2026.2.1)
=======
>>>>>>> f6d98a908 (docs: add changelog entry for plugin install hardening)
=======
>>>>>>> 8b64705e0 (docs: fold 2026.2.2 into 2026.2.1)
- Auto-reply: avoid referencing workspace files in /new greeting prompt. (#5706) Thanks @bravostation.
=======
- Streaming: flush block streaming on paragraph boundaries for newline chunking. (#7014)
- Streaming: stabilize partial streaming filters.
- Auto-reply: avoid referencing workspace files in /new greeting prompt. (#5706) Thanks @bravostation.
- Tools: align tool execute adapters/signatures (legacy + parameter order + arg normalization).
- Tools: treat "\*" tool allowlist entries as valid to avoid spurious unknown-entry warnings.
- Skills: update session-logs paths from .clawdbot to .openclaw. (#4502)
- Slack: harden media fetch limits and Slack file URL validation. (#6639) Thanks @davidiach.
- Lint: satisfy curly rule after import sorting. (#6310)
- Process: resolve Windows `spawn()` failures for npm-family CLIs by appending `.cmd` when needed. (#5815) Thanks @thejhinvirtuoso.
- Discord: resolve PluralKit proxied senders for allowlists and labels. (#5838) Thanks @thewilloftheshadow.
- Tlon: add timeout to SSE client fetch calls (CWE-400). (#5926)
- Memory search: L2-normalize local embedding vectors to fix semantic search. (#5332)
- Agents: align embedded runner + typings with pi-coding-agent API updates (pi 0.51.0).
- Agents: ensure OpenRouter attribution headers apply in the embedded runner.
- Agents: cap context window resolution for compaction safeguard. (#6187) Thanks @iamEvanYT.
- System prompt: resolve overrides and hint using session_status for current date/time. (#1897, #1928, #2108, #3677)
- Agents: fix Pi prompt template argument syntax. (#6543)
- Subagents: fix announce failover race (always emit lifecycle end; timeout=0 means no-timeout). (#6621)
- Teams: gate media auth retries.
- Telegram: restore draft streaming partials. (#5543) Thanks @obviyus.
- Onboarding: friendlier Windows onboarding message. (#6242) Thanks @shanselman.
- TUI: prevent crash when searching with digits in the model selector.
- Agents: wire before_tool_call plugin hook into tool execution. (#6570, #6660) Thanks @ryancnelson.
- Browser: secure Chrome extension relay CDP sessions.
- Docker: use container port for gateway command instead of host port. (#5110) Thanks @mise42.
- Docker: start gateway CMD by default for container deployments. (#6635) Thanks @kaizen403.
- fix(lobster): block arbitrary exec via lobsterPath/cwd injection (GHSA-4mhr-g7xj-cg8j). (#5335) Thanks @vignesh07.
- Security: sanitize WhatsApp accountId to prevent path traversal. (#4610)
- Security: restrict MEDIA path extraction to prevent LFI. (#4930)
- Security: validate message-tool filePath/path against sandbox root. (#6398)
- Security: block LD*/DYLD* env overrides for host exec. (#4896) Thanks @HassanFleyah.
- Security: harden web tool content wrapping + file parsing safeguards. (#4058) Thanks @VACInc.
- Security: enforce Twitch `allowFrom` allowlist gating (deny non-allowlisted senders). Thanks @MegaManSec.

## 2026.1.31

### Changes

- Docs: onboarding/install/i18n/exec-approvals/Control UI/exe.dev/cacheRetention updates + misc nav/typos. (#3050, #3461, #4064, #4675, #4729, #4763, #5003, #5402, #5446, #5474, #5663, #5689, #5694, #5967, #6270, #6300, #6311, #6416, #6487, #6550, #6789)
- Telegram: use shared pairing store. (#6127) Thanks @obviyus.
- Agents: add OpenRouter app attribution headers. Thanks @alexanderatallah.
- Agents: add system prompt safety guardrails. (#5445) Thanks @joshp123.
- Agents: update pi-ai to 0.50.9 and rename cacheControlTtl -> cacheRetention (with back-compat mapping).
- Agents: extend CreateAgentSessionOptions with systemPrompt/skills/contextFiles.
- Agents: add tool policy conformance snapshot (no runtime behavior change). (#6011)
- Auth: update MiniMax OAuth hint + portal auth note copy.
- Discord: inherit thread parent bindings for routing. (#3892) Thanks @aerolalit.
- Gateway: inject timestamps into agent and chat.send messages. (#3705) Thanks @conroywhitney, @CashWilliams.
- Gateway: require TLS 1.3 minimum for TLS listeners. (#5970) Thanks @loganaden.
- Web UI: refine chat layout + extend session active duration.
- CI: add formal conformance + alias consistency checks. (#5723, #5807)

### Fixes

- Security: guard remote media fetches with SSRF protections (block private/localhost, DNS pinning).
- Updates: clean stale global install rename dirs and extend gateway update timeouts to avoid npm ENOTEMPTY failures.
- Plugins: validate plugin/hook install paths and reject traversal-like names.
- Telegram: add download timeouts for file fetches. (#6914) Thanks @hclsys.
- Telegram: enforce thread specs for DM vs forum sends. (#6833) Thanks @obviyus.
- Streaming: flush block streaming on paragraph boundaries for newline chunking. (#7014)
- Streaming: stabilize partial streaming filters.
- Auto-reply: avoid referencing workspace files in /new greeting prompt. (#5706) Thanks @bravostation.
- Tools: align tool execute adapters/signatures (legacy + parameter order + arg normalization).
- Tools: treat `"*"` tool allowlist entries as valid to avoid spurious unknown-entry warnings.
- Skills: update session-logs paths from .clawdbot to .openclaw. (#4502)
- Slack: harden media fetch limits and Slack file URL validation. (#6639) Thanks @davidiach.
- Lint: satisfy curly rule after import sorting. (#6310)
>>>>>>> ed4529e24 (docs: update 2026.2.1 changelog)
- Process: resolve Windows `spawn()` failures for npm-family CLIs by appending `.cmd` when needed. (#5815) Thanks @thejhinvirtuoso.
>>>>>>> 92803facf (docs: preserve moonshot sync markers)
- Docs: update MiniMax OAuth setup commands; Extensions: use OpenClaw plugin SDK for MiniMax OAuth. (#5402) Thanks @Maosghoul.
=======
- Auto-reply: avoid referencing workspace files in /new greeting prompt. (#5706) Thanks @bravostation.
- Process: resolve Windows `spawn()` failures for npm-family CLIs by appending `.cmd` when needed. (#5815) Thanks @thejhinvirtuoso.
>>>>>>> 99346314f (chore: trim docs changelog)
- Discord: resolve PluralKit proxied senders for allowlists and labels. (#5838) Thanks @thewilloftheshadow.
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 73c405f74 (Docs: note MiniMax OAuth updates (#5402) (thanks @Maosghoul))
=======
=======
=======
- Tlon: add timeout to SSE client fetch calls (CWE-400). (#5926)
- Memory search: L2-normalize local embedding vectors to fix semantic search. (#5332)
- Agents: align embedded runner + typings with pi-coding-agent API updates (pi 0.51.0).
>>>>>>> ed4529e24 (docs: update 2026.2.1 changelog)
- Agents: ensure OpenRouter attribution headers apply in the embedded runner.
<<<<<<< HEAD
>>>>>>> a68e32d95 (chore: update changelog)
=======
- Agents: cap context window resolution for compaction safeguard. (#6187) Thanks @iamEvanYT.
<<<<<<< HEAD
>>>>>>> 1968a4b7d (chore: expand changelog)
- System prompt: hint using session_status for current date/time. (#1897, #1928, #2108)
>>>>>>> 238200f65 (chore: update changelog and relay formatting)
- Telegram: restore draft streaming partials. (#5543) Thanks @obviyus.
- Onboarding: friendlier Windows onboarding message. (#6242) Thanks @shanselman.
- TUI: prevent crash when searching with digits in the model selector.
- Browser: secure Chrome extension relay CDP sessions.
- Docker: use container port for gateway command instead of host port. (#5110) Thanks @mise42.
- fix(lobster): block arbitrary exec via lobsterPath/cwd injection (GHSA-4mhr-g7xj-cg8j). (#5335) Thanks @vignesh07.
<<<<<<< HEAD
=======
- Security: block LD_/DYLD_ env overrides for host exec. (#4896) Thanks @HassanFleyah.
=======
- System prompt: resolve overrides and hint using session_status for current date/time. (#1897, #1928, #2108, #3677)
- Agents: fix Pi prompt template argument syntax. (#6543)
- Subagents: fix announce failover race (always emit lifecycle end; timeout=0 means no-timeout). (#6621)
- Teams: gate media auth retries.
- Telegram: restore draft streaming partials. (#5543) Thanks @obviyus.
- Onboarding: friendlier Windows onboarding message. (#6242) Thanks @shanselman.
- TUI: prevent crash when searching with digits in the model selector.
- Agents: wire before_tool_call plugin hook into tool execution. (#6570, #6660) Thanks @ryancnelson.
- Browser: secure Chrome extension relay CDP sessions.
- Docker: use container port for gateway command instead of host port. (#5110) Thanks @mise42.
- fix(lobster): block arbitrary exec via lobsterPath/cwd injection (GHSA-4mhr-g7xj-cg8j). (#5335) Thanks @vignesh07.
- Security: sanitize WhatsApp accountId to prevent path traversal. (#4610)
- Security: restrict MEDIA path extraction to prevent LFI. (#4930)
- Security: validate message-tool filePath/path against sandbox root. (#6398)
- Security: block LD*/DYLD* env overrides for host exec. (#4896) Thanks @HassanFleyah.
>>>>>>> ed4529e24 (docs: update 2026.2.1 changelog)
- Security: harden web tool content wrapping + file parsing safeguards. (#4058) Thanks @VACInc.
- Security: enforce Twitch `allowFrom` allowlist gating (deny non-allowlisted senders). Thanks @MegaManSec.
>>>>>>> 8c7901c98 (fix(twitch): enforce allowFrom allowlist)

>>>>>>> 1295b6705 (fix(lobster): block arbitrary exec via lobsterPath/cwd (GHSA-4mhr-g7xj-cg8j) (#5335))
## 2026.1.30

### Changes

- CLI: add `completion` command (Zsh/Bash/PowerShell/Fish) and auto-setup during postinstall/onboarding.
- CLI: add per-agent `models status` (`--agent` filter). (#4780) Thanks @jlowin.
- Agents: add Kimi K2.5 to the synthetic model catalog. (#4407) Thanks @manikv12.
- Auth: switch Kimi Coding to built-in provider; normalize OAuth profile email.
- Auth: add MiniMax OAuth plugin + onboarding option. (#4521) Thanks @Maosghoul.
- Agents: update pi SDK/API usage and dependencies.
- Web UI: refresh sessions after chat commands and improve session display names.
- Build: move TypeScript builds to `tsdown` + `tsgo` (faster builds, CI typechecks), update tsconfig target, and clean up lint rules.
- Build: align npm tar override and bin metadata so the `openclaw` CLI entrypoint is preserved in npm publishes.
- Docs: add pi/pi-dev docs and update OpenClaw branding + install links.

### Fixes

- Security: restrict local path extraction in media parser to prevent LFI. (#4880)
- Gateway: prevent token defaults from becoming the literal "undefined". (#4873) Thanks @Hisleren.
- Control UI: fix assets resolution for npm global installs. (#4909) Thanks @YuriNachos.
- macOS: avoid stderr pipe backpressure in gateway discovery. (#3304) Thanks @abhijeet117.
- Telegram: normalize account token lookup for non-normalized IDs. (#5055) Thanks @jasonsschin.
- Telegram: preserve delivery thread fallback and fix threadId handling in delivery context.
- Telegram: fix HTML nesting for overlapping styles/links. (#4578) Thanks @ThanhNguyxn.
- Telegram: accept numeric messageId/chatId in react actions. (#4533) Thanks @Ayush10.
- Telegram: honor per-account proxy dispatcher via undici fetch. (#4456) Thanks @spiceoogway.
- Telegram: scope skill commands to bound agent per bot. (#4360) Thanks @robhparker.
- BlueBubbles: debounce by messageId to preserve attachments in text+image messages. (#4984)
- Routing: prefer requesterOrigin over stale session entries for sub-agent announce delivery. (#4957)
- Extensions: restore embedded extension discovery typings.
- Agents: repair malformed tool calls and session transcripts. (#7323)
- CLI: fix `tui:dev` port resolution.
- LINE: fix status command TypeError. (#4651)
- OAuth: skip expired-token warnings when refresh tokens are still valid. (#4593)
- Build: skip redundant UI install step in Dockerfile. (#4584) Thanks @obviyus.
>>>>>>> 83e64c1ac (docs: start 2026.1.31 changelog)

## 2026.1.29
<<<<<<< HEAD
Status: beta.
=======
Status: stable.
>>>>>>> 23c424899 (docs: reorder 2026.1.29 changelog)

### Highlights
- Rebrand: rename the npm package/CLI to `moltbot`, keep a `moltbot` compatibility shim, move extensions to the `@moltbot/*` scope, and update bot.molt bundle IDs/labels/logging subsystems. Thanks @thewilloftheshadow.
- New channels/plugins: Twitch plugin; Google Chat (beta) with Workspace Add-on events + typing indicator. (#1612, #1635) Thanks @tyler6204, @iHildy.
- Security hardening: gateway auth defaults required, hook token query-param deprecation, Windows ACL audits, mDNS minimal discovery, and SSH target option injection fix. (#4001, #2016, #1957, #1882, #2200)
- WebChat: image paste + image-only sends; keep sub-agent announce replies visible. (#1925, #1977)
- Tooling: per-sender group tool policies + tools.alsoAllow additive allowlist. (#1757, #1762)
- Memory Search: allow extra paths for memory indexing. (#3600) Thanks @kira-ariaki.

### Changes
<<<<<<< HEAD
<<<<<<< HEAD
- Rebrand: rename the npm package/CLI to `moltbot`, add a `moltbot` compatibility shim, and move extensions to the `@moltbot/*` scope.
- Commands: group /help and /commands output with Telegram paging. (#2504) Thanks @hougangdev.
- macOS: limit project-local `node_modules/.bin` PATH preference to debug builds (reduce PATH hijacking risk).
- macOS: finish Moltbot app rename for macOS sources, bundle identifiers, and shared kit paths. (#2844) Thanks @fal3.
- Branding: update launchd labels, mobile bundle IDs, and logging subsystems to bot.molt (legacy com.clawdbot migrations). Thanks @thewilloftheshadow.
- Tools: add per-sender group tool policies and fix precedence. (#1757) Thanks @adam91holt.
- Agents: summarize dropped messages during compaction safeguard pruning. (#2509) Thanks @jogi47.
- Memory Search: allow extra paths for memory indexing (ignores symlinks). (#3600) Thanks @kira-ariaki.
- Skills: add multi-image input support to Nano Banana Pro skill. (#1958) Thanks @tyler6204.
- Agents: honor tools.exec.safeBins in exec allowlist checks. (#2281)
- Matrix: switch plugin SDK to @vector-im/matrix-bot-sdk.
- Docs: tighten Fly private deployment steps. (#2289) Thanks @dguido.
- Docs: add migration guide for moving to a new machine. (#2381)
- Docs: add Northflank one-click deployment guide. (#2167) Thanks @AdeboyeDN.
=======
- Rebrand: rename the npm package/CLI to `openclaw`, add a `openclaw` compatibility shim, and move extensions to the `@openclaw/*` scope.
- Onboarding: strengthen security warning copy for beta + access control expectations.
- Onboarding: add Venice API key to non-interactive flow. (#1893) Thanks @jonisjongithub.
- Config: auto-migrate legacy state/config paths and keep config resolution consistent across legacy filenames.
>>>>>>> 23c424899 (docs: reorder 2026.1.29 changelog)
- Gateway: warn on hook tokens via query params; document header auth preference. (#2200) Thanks @YuriNachos.
- Gateway: add dangerous Control UI device auth bypass flag + audit warnings. (#2248)
=======
- Providers: add Venice AI integration; update Moonshot Kimi references to kimi-k2.5; update MiniMax API endpoint/format. (#2762, #3064)
- Telegram: quote replies, edit-message action, silent sends, sticker support + vision caching, linkPreview toggle, plugin sendPayload support. (#2900, #2394, #2382, #2548, #1700, #1917)
- Discord: configurable privileged gateway intents for presences/members. (#2266) Thanks @kentaro.
- Browser: route browser control via gateway/node; fallback URL matching for relay targets. (#1999)
- macOS: add direct gateway transport; preserve custom SSH usernames for remote control; bump Textual to 0.3.1. (#2033, #2046)
- Routing: add per-account DM session scope + guidance for multi-account setups. (#3095) Thanks @jarvis-sam.
- Hooks: make session-memory message count configurable. (#2681)
- Tools: honor tools.exec.safeBins in exec allowlist checks. (#2281)
- Security: add Control UI device auth bypass flag + audit warnings; warn on hook tokens via query params; add security audit CLI surface. (#2248, #2200)
>>>>>>> 515206012 (docs(changelog): rewrite 2026.1.29 notes)
- Doctor: warn on gateway exposure without auth. (#2016) Thanks @Alex-Alaniz.
<<<<<<< HEAD
- Config: apply config.env before ${VAR} substitution. (#1813)
- Web search: add Brave freshness filter parameter. (#1688) Thanks @JonUleis.
- Control UI: improve chat session dropdown refresh, URL confirmation flow, config-save guardrails, and chat composer sizing. (#3682, #3578, #1707, #2950)
- Commands: group /help and /commands output with Telegram paging. (#2504) Thanks @hougangdev.
- CLI: use Node's compile cache for faster startup; recognize versioned node binaries (e.g., node-22). (#2808, #2490) Thanks @pi0, @David-Marsh-Photo.
- Agents: summarize dropped messages during compaction safeguard pruning. (#2509) Thanks @jogi47.
- Skills: add multi-image input support to Nano Banana Pro skill. (#1958) Thanks @tyler6204.
- Matrix: switch plugin SDK to @vector-im/matrix-bot-sdk.
- Docs: new deployment guides (Northflank, Render, Oracle, Raspberry Pi, GCP, DigitalOcean), Claude Max API Proxy, Vercel AI Gateway, migration guide, formal verification updates, and Fly private hardening. (#2167, #1975, #2333, #1871, #1848, #1870, #1875, #1901, #2381, #2289)
- Onboarding: add Venice API key to non-interactive flow; strengthen security warning copy.

=======
- Web UI: keep sub-agent announce replies visible in WebChat. (#1977) Thanks @andrescardonas7.
- Browser: route browser control via gateway/node; remove standalone browser control command and control URL config.
- Browser: route `browser.request` via node proxies when available; honor proxy timeouts; derive browser ports from `gateway.port`.
- Browser: fall back to URL matching for extension relay target resolution. (#1999) Thanks @jonit-dev.
- Telegram: allow caption param for media sends. (#1888) Thanks @mguellsegarra.
- Telegram: support plugin sendPayload channelData (media/buttons) and validate plugin commands. (#1917) Thanks @JoshuaLelon.
- Telegram: avoid block replies when streaming is disabled. (#1885) Thanks @ivancasco.
- Telegram: add optional silent send flag (disable notifications). (#2382) Thanks @Suksham-sharma.
- Telegram: support editing sent messages via message(action="edit"). (#2394) Thanks @marcelomar21.
- Telegram: support quote replies for message tool and inbound context. (#2900) Thanks @aduk059.
- Telegram: add sticker receive/send with vision caching. (#2629) Thanks @longjos.
- Telegram: send sticker pixels to vision models. (#2650)
- Telegram: keep topic IDs in restart sentinel notifications. (#1807) Thanks @hsrvc.
- Discord: add configurable privileged gateway intents for presences/members. (#2266) Thanks @kentaro.
- Slack: clear ack reaction after streamed replies. (#2044) Thanks @fancyboi999.
- Matrix: switch plugin SDK to @vector-im/matrix-bot-sdk.
- Tlon: format thread reply IDs as @ud. (#1837) Thanks @wca4a.
- Tools: add per-sender group tool policies and fix precedence. (#1757) Thanks @adam91holt.
- Agents: summarize dropped messages during compaction safeguard pruning. (#2509) Thanks @jogi47.
- Agents: expand cron tool description with full schema docs. (#1988) Thanks @tomascupr.
- Agents: honor tools.exec.safeBins in exec allowlist checks. (#2281)
- Memory Search: allow extra paths for memory indexing (ignores symlinks). (#3600) Thanks @kira-ariaki.
- Skills: add multi-image input support to Nano Banana Pro skill. (#1958) Thanks @tyler6204.
- Skills: add missing dependency metadata for GitHub, Notion, Slack, Discord. (#1995) Thanks @jackheuberger.
- Commands: group /help and /commands output with Telegram paging. (#2504) Thanks @hougangdev.
- Routing: add per-account DM session scope and document multi-account isolation. (#3095) Thanks @jarvis-sam.
- Routing: precompile session key regexes. (#1697) Thanks @Ray0907.
- CLI: use Node's module compile cache for faster startup. (#2808) Thanks @pi0.
- Auth: show copyable Google auth URL after ASCII prompt. (#1787) Thanks @robbyczgw-cla.
- TUI: avoid width overflow when rendering selection lists. (#1686) Thanks @mossein.
- macOS: finish OpenClaw app rename for macOS sources, bundle identifiers, and shared kit paths. (#2844) Thanks @fal3.
- Branding: update launchd labels, mobile bundle IDs, and logging subsystems to bot.molt (legacy com.clawdbot migrations). Thanks @thewilloftheshadow.
- macOS: limit project-local `node_modules/.bin` PATH preference to debug builds (reduce PATH hijacking risk).
- macOS: keep custom SSH usernames in remote target. (#2046) Thanks @algal.
- macOS: avoid crash when rendering code blocks by bumping Textual to 0.3.1. (#2033) Thanks @garricn.
- Update: ignore dist/control-ui for dirty checks and restore after ui builds. (#1976) Thanks @Glucksberg.
- Build: bundle A2UI assets during build and stop tracking generated bundles. (#2455) Thanks @0oAstro.
- CI: increase Node heap size for macOS checks. (#1890) Thanks @realZachi.
- Config: apply config.env before ${VAR} substitution. (#1813) Thanks @spanishflu-est1918.
- Gateway: prefer newest session metadata when combining stores. (#1823) Thanks @emanuelst.
- Docs: tighten Fly private deployment steps. (#2289) Thanks @dguido.
- Docs: add migration guide for moving to a new machine. (#2381)
- Docs: add Northflank one-click deployment guide. (#2167) Thanks @AdeboyeDN.
- Docs: add Vercel AI Gateway to providers sidebar. (#1901) Thanks @jerilynzheng.
- Docs: add Render deployment guide. (#1975) Thanks @anurag.
- Docs: add Claude Max API Proxy guide. (#1875) Thanks @atalovesyou.
- Docs: add DigitalOcean deployment guide. (#1870) Thanks @0xJonHoldsCrypto.
- Docs: add Oracle Cloud (OCI) platform guide + cross-links. (#2333) Thanks @hirefrank.
- Docs: add Raspberry Pi install guide. (#1871) Thanks @0xJonHoldsCrypto.
- Docs: add GCP Compute Engine deployment guide. (#1848) Thanks @hougangdev.
- Docs: add LINE channel guide. Thanks @thewilloftheshadow.
- Docs: credit both contributors for Control UI refresh. (#1852) Thanks @EnzeD.
- Docs: keep docs header sticky so navbar stays visible while scrolling. (#2445) Thanks @chenyuan99.
- Docs: update exe.dev install instructions. (#https://github.com/openclaw/openclaw/pull/3047) Thanks @zackerthescar.
>>>>>>> 23c424899 (docs: reorder 2026.1.29 changelog)
### Breaking
- **BREAKING:** Gateway auth mode "none" is removed; gateway now requires token/password (Tailscale Serve identity still allowed).

### Fixes
<<<<<<< HEAD
<<<<<<< HEAD
=======

- Skills: update session-logs paths to use ~/.openclaw. (#4502) Thanks @bonald.
- Telegram: avoid silent empty replies by tracking normalization skips before fallback. (#3796)
>>>>>>> d3e53eaf2 (fix(skill): update session-logs paths from .clawdbot to .openclaw (#4502))
- Mentions: honor mentionPatterns even when explicit mentions are present. (#3303) Thanks @HirokiKobayashi-R.
- Discord: restore username directory lookup in target resolution. (#3131) Thanks @bonald.
- Agents: align MiniMax base URL test expectation with default provider config. (#3131) Thanks @bonald.
- Agents: prevent retries on oversized image errors and surface size limits. (#2871) Thanks @Suksham-sharma.
- Agents: inherit provider baseUrl/api for inline models. (#2740) Thanks @lploc94.
- Memory Search: keep auto provider model defaults and only include remote when configured. (#2576) Thanks @papago2355.
- TTS: read OPENAI_TTS_BASE_URL at runtime instead of module load to honor config.env. (#3341) Thanks @hclsys.
- macOS: auto-scroll to bottom when sending a new message while scrolled up. (#2471) Thanks @kennyklee.
- Web UI: auto-expand the chat compose textarea while typing (with sensible max height). (#2950) Thanks @shivamraut101.
- Web UI: refresh sessions after queued /new or /reset commands once the run completes.
- Gateway: prevent crashes on transient network errors (fetch failures, timeouts, DNS). Added fatal error detection to only exit on truly critical errors. Fixes #2895, #2879, #2873. (#2980) Thanks @elliotsecops.
- Agents: guard channel tool listActions to avoid plugin crashes. (#2859) Thanks @mbelinky.
- Discord: stop resolveDiscordTarget from passing directory params into messaging target parsers. Fixes #3167. Thanks @thewilloftheshadow.
- Discord: avoid resolving bare channel names to user DMs when a username matches. Thanks @thewilloftheshadow.
- Discord: fix directory config type import for target resolution. Thanks @thewilloftheshadow.
- Providers: update MiniMax API endpoint and compatibility mode. (#3064) Thanks @hlbbbbbbb.
- Telegram: treat more network errors as recoverable in polling. (#3013) Thanks @ryancontent.
- Discord: resolve usernames to user IDs for outbound messages. (#2649) Thanks @nonggialiang.
- Providers: update Moonshot Kimi model references to kimi-k2.5. (#2762) Thanks @MarvinCui.
- Gateway: suppress AbortError and transient network errors in unhandled rejections. (#2451) Thanks @Glucksberg.
- TTS: keep /tts status replies on text-only commands and avoid duplicate block-stream audio. (#2451) Thanks @Glucksberg.
- Security: pin npm overrides to keep tar@7.5.4 for install toolchains.
- Security: properly test Windows ACL audit for config includes. (#2403) Thanks @dominicnunez.
- CLI: recognize versioned Node executables when parsing argv. (#2490) Thanks @David-Marsh-Photo.
- CLI: avoid prompting for gateway runtime under the spinner. (#2874)
- BlueBubbles: coalesce inbound URL link preview messages. (#1981) Thanks @tyler6204.
- Cron: allow payloads containing "heartbeat" in event filter. (#2219) Thanks @dwfinkelstein.
- CLI: avoid loading config for global help/version while registering plugin commands. (#2212) Thanks @dial481.
- Agents: include memory.md when bootstrapping memory context. (#2318) Thanks @czekaj.
- Agents: release session locks on process termination and cover more signals. (#2483) Thanks @janeexai.
- Agents: skip cooldowned providers during model failover. (#2143) Thanks @YiWang24.
- Telegram: harden polling + retry behavior for transient network errors and Node 22 transport issues. (#2420) Thanks @techboss.
- Telegram: ignore non-forum group message_thread_id while preserving DM thread sessions. (#2731) Thanks @dylanneve1.
- Telegram: wrap reasoning italics per line to avoid raw underscores. (#2181) Thanks @YuriNachos.
- Telegram: centralize API error logging for delivery and bot calls. (#2492) Thanks @altryne.
- Voice Call: enforce Twilio webhook signature verification for ngrok URLs; disable ngrok free tier bypass by default.
- Security: harden Tailscale Serve auth by validating identity via local tailscaled before trusting headers.
- Media: fix text attachment MIME misclassification with CSV/TSV inference and UTF-16 detection; add XML attribute escaping for file output. (#3628) Thanks @frankekn.
- Build: align memory-core peer dependency with lockfile.
- Security: add mDNS discovery mode with minimal default to reduce information disclosure. (#1882) Thanks @orlyjamie.
- Security: harden URL fetches with DNS pinning to reduce rebinding risk. Thanks Chris Zheng.
- Web UI: improve WebChat image paste previews and allow image-only sends. (#1925) Thanks @smartprogrammer93.
- Security: wrap external hook content by default with a per-hook opt-out. (#1827) Thanks @mertcicekci0.
- Gateway: default auth now fail-closed (token/password required; Tailscale Serve identity remains allowed).
- Gateway: treat loopback + non-local Host connections as remote unless trusted proxy headers are present.
- Onboarding: remove unsupported gateway auth "off" choice from onboarding/configure flows and CLI flags.
=======
- Security: harden SSH tunnel target parsing to prevent option injection/DoS. (#4001) Thanks @YLChen-007.
- Security: prevent PATH injection in exec sandbox; harden file serving; pin DNS in URL fetches; verify Twilio webhooks; fix LINE webhook timing-attack edge case; validate Tailscale Serve identity; flag loopback Control UI with auth disabled as critical. (#1616, #1795)
- Gateway: prevent crashes on transient network errors, suppress AbortError/unhandled rejections, sanitize error responses, clean session locks on exit, and harden reverse proxy handling for unauthenticated proxied connects. (#2980, #2451, #2483, #1795)
- Config: auto-migrate legacy state/config paths; honor state dir overrides.
- Packaging: include missing dist/shared and dist/link-understanding outputs in npm tarball installs.
- Telegram: avoid silent empty replies, improve polling/network recovery, handle video notes, keep DM thread sessions, ignore non-forum message_thread_id, centralize API error logging, include AccountId in native command context. (#3796, #3013, #2905, #2731, #2492, #2942)
- Discord: restore username resolution, resolve outbound usernames to IDs, honor threadId replies, guard forum thread access. (#3131, #2649)
- BlueBubbles: coalesce URL link previews, improve reaction handling, preserve reply-tag GUIDs. (#1981, #1641)
- Voice Call: prevent TTS overlap, validate env-var config, return TwiML for conversation calls. (#1713, #1634)
- Media: fix text attachment MIME classification + XML escaping on Windows. (#3628, #3750)
- Models: inherit provider baseUrl/api for inline models. (#2740) Thanks @lploc94.
- Web UI: auto-scroll on send; fix textarea sizing; improve chat session refresh. (#2471, #2950, #3682)
- CLI/TUI: resume sessions cleanly; guard width overflow; avoid spinner prompt race. (#1921, #1686, #2874)
- Slack: fix file downloads failing on redirects with missing auth header. (#1936)
- iMessage: normalize messaging targets. (#1708)
- Signal: fix reactions and add configurable startup timeout. (#1651, #1677)
- Matrix: decrypt E2EE media with size guard. (#1744)
>>>>>>> 515206012 (docs(changelog): rewrite 2026.1.29 notes)


## 2026.1.24

### Highlights
- Providers: Ollama discovery + docs; Venice guide upgrades + cross-links. (#1606) Thanks @abhaymundhara. https://docs.molt.bot/providers/ollama https://docs.molt.bot/providers/venice
- Channels: LINE plugin (Messaging API) with rich replies + quick replies. (#1630) Thanks @plum-dawg.
- TTS: Edge fallback (keyless) + `/tts` auto modes. (#1668, #1667) Thanks @steipete, @sebslight. https://docs.molt.bot/tts
- Exec approvals: approve in-chat via `/approve` across all channels (including plugins). (#1621) Thanks @czekaj. https://docs.molt.bot/tools/exec-approvals https://docs.molt.bot/tools/slash-commands
- Telegram: DM topics as separate sessions + outbound link preview toggle. (#1597, #1700) Thanks @rohannagpal, @zerone0x. https://docs.molt.bot/channels/telegram

### Changes
- Channels: add LINE plugin (Messaging API) with rich replies, quick replies, and plugin HTTP registry. (#1630) Thanks @plum-dawg.
- TTS: add Edge TTS provider fallback, defaulting to keyless Edge with MP3 retry on format failures. (#1668) Thanks @steipete. https://docs.molt.bot/tts
- TTS: add auto mode enum (off/always/inbound/tagged) with per-session `/tts` override. (#1667) Thanks @sebslight. https://docs.molt.bot/tts
- Telegram: treat DM topics as separate sessions and keep DM history limits stable with thread suffixes. (#1597) Thanks @rohannagpal.
- Telegram: add `channels.telegram.linkPreview` to toggle outbound link previews. (#1700) Thanks @zerone0x. https://docs.molt.bot/channels/telegram
- Web search: add Brave freshness filter parameter for time-scoped results. (#1688) Thanks @JonUleis. https://docs.molt.bot/tools/web
- UI: refresh Control UI dashboard design system (colors, icons, typography). (#1745, #1786) Thanks @EnzeD, @mousberg.
- Exec approvals: forward approval prompts to chat with `/approve` for all channels (including plugins). (#1621) Thanks @czekaj. https://docs.molt.bot/tools/exec-approvals https://docs.molt.bot/tools/slash-commands
- Gateway: expose config.patch in the gateway tool with safe partial updates + restart sentinel. (#1653) Thanks @Glucksberg.
- Diagnostics: add diagnostic flags for targeted debug logs (config + env override). https://docs.molt.bot/diagnostics/flags
- Docs: expand FAQ (migration, scheduling, concurrency, model recommendations, OpenAI subscription auth, Pi sizing, hackable install, docs SSL workaround).
- Docs: add verbose installer troubleshooting guidance.
- Docs: add macOS VM guide with local/hosted options + VPS/nodes guidance. (#1693) Thanks @f-trycua.
- Docs: add Bedrock EC2 instance role setup + IAM steps. (#1625) Thanks @sergical. https://docs.molt.bot/bedrock
- Docs: update Fly.io guide notes.
- Dev: add prek pre-commit hooks + dependabot config for weekly updates. (#1720) Thanks @dguido.

### Fixes
- Web UI: fix config/debug layout overflow, scrolling, and code block sizing. (#1715) Thanks @saipreetham589.
- Web UI: show Stop button during active runs, swap back to New session when idle. (#1664) Thanks @ndbroadbent.
- Web UI: clear stale disconnect banners on reconnect; allow form saves with unsupported schema paths but block missing schema. (#1707) Thanks @Glucksberg.
- Web UI: hide internal `message_id` hints in chat bubbles.
- Gateway: allow Control UI token-only auth to skip device pairing even when device identity is present (`gateway.controlUi.allowInsecureAuth`). (#1679) Thanks @steipete.
- Matrix: decrypt E2EE media attachments with preflight size guard. (#1744) Thanks @araa47.
- BlueBubbles: route phone-number targets to DMs, avoid leaking routing IDs, and auto-create missing DMs (Private API required). (#1751) Thanks @tyler6204. https://docs.molt.bot/channels/bluebubbles
- BlueBubbles: keep part-index GUIDs in reply tags when short IDs are missing.
- iMessage: normalize chat_id/chat_guid/chat_identifier prefixes case-insensitively and keep service-prefixed handles stable. (#1708) Thanks @aaronn.
- Signal: repair reaction sends (group/UUID targets + CLI author flags). (#1651) Thanks @vilkasdev.
- Signal: add configurable signal-cli startup timeout + external daemon mode docs. (#1677) https://docs.molt.bot/channels/signal
- Telegram: set fetch duplex="half" for uploads on Node 22 to avoid sendPhoto failures. (#1684) Thanks @commdata2338.
- Telegram: use wrapped fetch for long-polling on Node to normalize AbortSignal handling. (#1639)
- Telegram: honor per-account proxy for outbound API calls. (#1774) Thanks @radek-paclt.
- Telegram: fall back to text when voice notes are blocked by privacy settings. (#1725) Thanks @foeken.
- Voice Call: return stream TwiML for outbound conversation calls on initial Twilio webhook. (#1634)
- Voice Call: serialize Twilio TTS playback and cancel on barge-in to prevent overlap. (#1713) Thanks @dguido.
- Google Chat: tighten email allowlist matching, typing cleanup, media caps, and onboarding/docs/tests. (#1635) Thanks @iHildy.
- Google Chat: normalize space targets without double `spaces/` prefix.
- Agents: auto-compact on context overflow prompt errors before failing. (#1627) Thanks @rodrigouroz.
- Agents: use the active auth profile for auto-compaction recovery.
- Media understanding: skip image understanding when the primary model already supports vision. (#1747) Thanks @tyler6204.
- Models: default missing custom provider fields so minimal configs are accepted.
- Messaging: keep newline chunking safe for fenced markdown blocks across channels.
- Messaging: treat newline chunking as paragraph-aware (blank-line splits) to keep lists and headings together. (#1726) Thanks @tyler6204.
- TUI: reload history after gateway reconnect to restore session state. (#1663)
- Heartbeat: normalize target identifiers for consistent routing.
- Exec: keep approvals for elevated ask unless full mode. (#1616) Thanks @ivancasco.
- Exec: treat Windows platform labels as Windows for node shell selection. (#1760) Thanks @ymat19.
- Gateway: include inline config env vars in service install environments. (#1735) Thanks @Seredeep.
- Gateway: skip Tailscale DNS probing when tailscale.mode is off. (#1671)
- Gateway: reduce log noise for late invokes + remote node probes; debounce skills refresh. (#1607) Thanks @petter-b.
- Gateway: clarify Control UI/WebChat auth error hints for missing tokens. (#1690)
- Gateway: listen on IPv6 loopback when bound to 127.0.0.1 so localhost webhooks work.
- Gateway: store lock files in the temp directory to avoid stale locks on persistent volumes. (#1676)
- macOS: default direct-transport `ws://` URLs to port 18789; document `gateway.remote.transport`. (#1603) Thanks @ngutman.
- Tests: cap Vitest workers on CI macOS to reduce timeouts. (#1597) Thanks @rohannagpal.
- Tests: avoid fake-timer dependency in embedded runner stream mock to reduce CI flakes. (#1597) Thanks @rohannagpal.
- Tests: increase embedded runner ordering test timeout to reduce CI flakes. (#1597) Thanks @rohannagpal.

## 2026.1.23-1

### Fixes
- Packaging: include dist/tts output in npm tarball (fixes missing dist/tts/tts.js).

## 2026.1.23

### Highlights
- TTS: move Telegram TTS into core + enable model-driven TTS tags by default for expressive audio replies. (#1559) Thanks @Glucksberg. https://docs.molt.bot/tts
- Gateway: add `/tools/invoke` HTTP endpoint for direct tool calls (auth + tool policy enforced). (#1575) Thanks @vignesh07. https://docs.molt.bot/gateway/tools-invoke-http-api
- Heartbeat: per-channel visibility controls (OK/alerts/indicator). (#1452) Thanks @dlauer. https://docs.molt.bot/gateway/heartbeat
- Deploy: add Fly.io deployment support + guide. (#1570) https://docs.molt.bot/platforms/fly
- Channels: add Tlon/Urbit channel plugin (DMs, group mentions, thread replies). (#1544) Thanks @wca4a. https://docs.molt.bot/channels/tlon

### Changes
- Channels: allow per-group tool allow/deny policies across built-in + plugin channels. (#1546) Thanks @adam91holt. https://docs.molt.bot/multi-agent-sandbox-tools
- Agents: add Bedrock auto-discovery defaults + config overrides. (#1553) Thanks @fal3. https://docs.molt.bot/bedrock
- CLI: add `moltbot system` for system events + heartbeat controls; remove standalone `wake`. (commit 71203829d) https://docs.molt.bot/cli/system
- CLI: add live auth probes to `moltbot models status` for per-profile verification. (commit 40181afde) https://docs.molt.bot/cli/models
- CLI: restart the gateway by default after `moltbot update`; add `--no-restart` to skip it. (commit 2c85b1b40)
- Browser: add node-host proxy auto-routing for remote gateways (configurable per gateway/node). (commit c3cb26f7c)
- Plugins: add optional `llm-task` JSON-only tool for workflows. (#1498) Thanks @vignesh07. https://docs.molt.bot/tools/llm-task
- Markdown: add per-channel table conversion (bullets for Signal/WhatsApp, code blocks elsewhere). (#1495) Thanks @odysseus0.
- Agents: keep system prompt time zone-only and move current time to `session_status` for better cache hits. (commit 66eec295b)
- Agents: remove redundant bash tool alias from tool registration/display. (#1571) Thanks @Takhoffman.
- Docs: add cron vs heartbeat decision guide (with Lobster workflow notes). (#1533) Thanks @JustYannicc. https://docs.molt.bot/automation/cron-vs-heartbeat
- Docs: clarify HEARTBEAT.md empty file skips heartbeats, missing file still runs. (#1535) Thanks @JustYannicc. https://docs.molt.bot/gateway/heartbeat

### Fixes
- Sessions: accept non-UUID sessionIds for history/send/status while preserving agent scoping. (#1518)
- Heartbeat: accept plugin channel ids for heartbeat target validation + UI hints.
- Messaging/Sessions: mirror outbound sends into target session keys (threads + dmScope), create session entries on send, and normalize session key casing. (#1520, commit 4b6cdd1d3)
- Sessions: reject array-backed session stores to prevent silent wipes. (#1469)
- Gateway: compare Linux process start time to avoid PID recycling lock loops; keep locks unless stale. (#1572) Thanks @steipete.
- Gateway: accept null optional fields in exec approval requests. (#1511) Thanks @pvoo.
- Exec approvals: persist allowlist entry ids to keep macOS allowlist rows stable. (#1521) Thanks @ngutman.
- Exec: honor tools.exec ask/security defaults for elevated approvals (avoid unwanted prompts). (commit 5662a9cdf)
- Daemon: use platform PATH delimiters when building minimal service paths. (commit a4e57d3ac)
- Linux: include env-configured user bin roots in systemd PATH and align PATH audits. (#1512) Thanks @robbyczgw-cla.
- Tailscale: retry serve/funnel with sudo only for permission errors and keep original failure details. (#1551) Thanks @sweepies.
- Docker: update gateway command in docker-compose and Hetzner guide. (#1514)
- Agents: show tool error fallback when the last assistant turn only invoked tools (prevents silent stops). (commit 8ea8801d0)
- Agents: ignore IDENTITY.md template placeholders when parsing identity. (#1556)
- Agents: drop orphaned OpenAI Responses reasoning blocks on model switches. (#1562) Thanks @roshanasingh4.
- Agents: add CLI log hint to "agent failed before reply" messages. (#1550) Thanks @sweepies.
- Agents: warn and ignore tool allowlists that only reference unknown or unloaded plugin tools. (#1566)
- Agents: treat plugin-only tool allowlists as opt-ins; keep core tools enabled. (#1467)
- Agents: honor enqueue overrides for embedded runs to avoid queue deadlocks in tests. (commit 084002998)
- Slack: honor open groupPolicy for unlisted channels in message + slash gating. (#1563) Thanks @itsjaydesu.
- Discord: limit autoThread mention bypass to bot-owned threads; keep ack reactions mention-gated. (#1511) Thanks @pvoo.
- Discord: retry rate-limited allowlist resolution + command deploy to avoid gateway crashes. (commit f70ac0c7c)
- Mentions: ignore mentionPattern matches when another explicit mention is present in group chats (Slack/Discord/Telegram/WhatsApp). (commit d905ca0e0)
- Telegram: render markdown in media captions. (#1478)
- MS Teams: remove `.default` suffix from Graph scopes and Bot Framework probe scopes. (#1507, #1574) Thanks @Evizero.
- Browser: keep extension relay tabs controllable when the extension reuses a session id after switching tabs. (#1160)
- Voice wake: auto-save wake words on blur/submit across iOS/Android and align limits with macOS. (commit 69f645c66)
- UI: keep the Control UI sidebar visible while scrolling long pages. (#1515) Thanks @pookNast.
- UI: cache Control UI markdown rendering + memoize chat text extraction to reduce Safari typing jank. (commit d57cb2e1a)
- TUI: forward unknown slash commands, include Gateway commands in autocomplete, and render slash replies as system output. (commit 1af227b61, commit 8195497ce, commit 6fba598ea)
- CLI: auth probe output polish (table output, inline errors, reduced noise, and wrap fixes in `moltbot models status`). (commit da3f2b489, commit 00ae21bed, commit 31e59cd58, commit f7dc27f2d, commit 438e782f8, commit 886752217, commit aabe0bed3, commit 81535d512, commit c63144ab1)
- Media: only parse `MEDIA:` tags when they start the line to avoid stripping prose mentions. (#1206)
- Media: preserve PNG alpha when possible; fall back to JPEG when still over size cap. (#1491) Thanks @robbyczgw-cla.
- Skills: gate bird Homebrew install to macOS. (#1569) Thanks @bradleypriest.

## 2026.1.22

### Changes
- Highlight: Compaction safeguard now uses adaptive chunking, progressive fallback, and UI status + retries. (#1466) Thanks @dlauer.
- Providers: add Antigravity usage tracking to status output. (#1490) Thanks @patelhiren.
- Slack: add chat-type reply threading overrides via `replyToModeByChatType`. (#1442) Thanks @stefangalescu.
- BlueBubbles: add `asVoice` support for MP3/CAF voice memos in sendAttachment. (#1477, #1482) Thanks @Nicell.
- Onboarding: add hatch choice (TUI/Web/Later), token explainer, background dashboard seed on macOS, and showcase link.

### Fixes
- BlueBubbles: stop typing indicator on idle/no-reply. (#1439) Thanks @Nicell.
- Message tool: keep path/filePath as-is for send; hydrate buffers only for sendAttachment. (#1444) Thanks @hopyky.
- Auto-reply: only report a model switch when session state is available. (#1465) Thanks @robbyczgw-cla.
- Control UI: resolve local avatar URLs with basePath across injection + identity RPC. (#1457) Thanks @dlauer.
- Agents: sanitize assistant history text to strip tool-call markers. (#1456) Thanks @zerone0x.
- Discord: clarify Message Content Intent onboarding hint. (#1487) Thanks @kyleok.
- Gateway: stop the service before uninstalling and fail if it remains loaded.
- Agents: surface concrete API error details instead of generic AI service errors.
- Exec: fall back to non-PTY when PTY spawn fails (EBADF). (#1484)
- Exec approvals: allow per-segment allowlists for chained shell commands on gateway + node hosts. (#1458) Thanks @czekaj.
- Agents: make OpenAI sessions image-sanitize-only; gate tool-id/repair sanitization by provider.
- Doctor: honor CLAWDBOT_GATEWAY_TOKEN for auth checks and security audit token reuse. (#1448) Thanks @azade-c.
- Agents: make tool summaries more readable and only show optional params when set.
- Agents: honor SOUL.md guidance even when the file is nested or path-qualified. (#1434) Thanks @neooriginal.
- Matrix (plugin): persist m.direct for resolved DMs and harden room fallback. (#1436, #1486) Thanks @sibbl.
- CLI: prefer `~` for home paths in output.
- Mattermost (plugin): enforce pairing/allowlist gating, keep @username targets, and clarify plugin-only docs. (#1428) Thanks @damoahdominic.
- Agents: centralize transcript sanitization in the runner; keep <final> tags and error turns intact.
- Auth: skip auth profiles in cooldown during initial selection and rotation. (#1316) Thanks @odrobnik.
- Agents/TUI: honor user-pinned auth profiles during cooldown and preserve search picker ranking. (#1432) Thanks @tobiasbischoff.
- Docs: fix gog auth services example to include docs scope. (#1454) Thanks @zerone0x.
- Slack: reduce WebClient retries to avoid duplicate sends. (#1481)
- Slack: read thread replies for message reads when threadId is provided (replies-only). (#1450) Thanks @rodrigouroz.
- Discord: honor accountId across message actions and cron deliveries. (#1492) Thanks @svkozak.
- macOS: prefer linked channels in gateway summary to avoid false “not linked” status.
- macOS/tests: fix gateway summary lookup after guard unwrap; prevent browser opens during tests. (ECID-1483)

## 2026.1.21-2

### Fixes
- Control UI: ignore bootstrap identity placeholder text for avatar values and fall back to the default avatar. https://docs.molt.bot/cli/agents https://docs.molt.bot/web/control-ui
- Slack: remove deprecated `filetype` field from `files.uploadV2` to eliminate API warnings. (#1447)

## 2026.1.21

### Changes
- Highlight: Lobster optional plugin tool for typed workflows + approval gates. https://docs.molt.bot/tools/lobster
- Lobster: allow workflow file args via `argsJson` in the plugin tool. https://docs.molt.bot/tools/lobster
- Heartbeat: allow running heartbeats in an explicit session key. (#1256) Thanks @zknicker.
- CLI: default exec approvals to the local host, add gateway/node targeting flags, and show target details in allowlist output.
- CLI: exec approvals mutations render tables instead of raw JSON.
- Exec approvals: support wildcard agent allowlists (`*`) across all agents.
- Exec approvals: allowlist matches resolved binary paths only, add safe stdin-only bins, and tighten allowlist shell parsing.
- Nodes: expose node PATH in status/describe and bootstrap PATH for node-host execution.
- CLI: flatten node service commands under `moltbot node` and remove `service node` docs.
- CLI: move gateway service commands under `moltbot gateway` and add `gateway probe` for reachability.
- Sessions: add per-channel reset overrides via `session.resetByChannel`. (#1353) Thanks @cash-echo-bot.
- Agents: add identity avatar config support and Control UI avatar rendering. (#1329, #1424) Thanks @dlauer.
- UI: show per-session assistant identity in the Control UI. (#1420) Thanks @robbyczgw-cla.
- CLI: add `moltbot update wizard` for interactive channel selection and restart prompts. https://docs.molt.bot/cli/update
- Signal: add typing indicators and DM read receipts via signal-cli.
- MSTeams: add file uploads, adaptive cards, and attachment handling improvements. (#1410) Thanks @Evizero.
- Onboarding: remove the run setup-token auth option (paste setup-token or reuse CLI creds instead).
- Docs: add troubleshooting entry for gateway.mode blocking gateway start. https://docs.molt.bot/gateway/troubleshooting
- Docs: add /model allowlist troubleshooting note. (#1405)
- Docs: add per-message Gmail search example for gog. (#1220) Thanks @mbelinky.

### Breaking
- **BREAKING:** Control UI now rejects insecure HTTP without device identity by default. Use HTTPS (Tailscale Serve) or set `gateway.controlUi.allowInsecureAuth: true` to allow token-only auth. https://docs.molt.bot/web/control-ui#insecure-http
- **BREAKING:** Envelope and system event timestamps now default to host-local time (was UTC) so agents don’t have to constantly convert.

### Fixes
- Nodes/macOS: prompt on allowlist miss for node exec approvals, persist allowlist decisions, and flatten node invoke errors. (#1394) Thanks @ngutman.
- Gateway: keep auto bind loopback-first and add explicit tailnet binding to avoid Tailscale taking over local UI. (#1380)
- Memory: prevent CLI hangs by deferring vector probes, adding sqlite-vec/embedding timeouts, and showing sync progress early.
- Agents: enforce 9-char alphanumeric tool call ids for Mistral providers. (#1372) Thanks @zerone0x.
- Embedded runner: persist injected history images so attachments aren’t reloaded each turn. (#1374) Thanks @Nicell.
- Nodes tool: include agent/node/gateway context in tool failure logs to speed approval debugging.
- macOS: exec approvals now respect wildcard agent allowlists (`*`).
- macOS: allow SSH agent auth when no identity file is set. (#1384) Thanks @ameno-.
- Gateway: prevent multiple gateways from sharing the same config/state at once (singleton lock).
- UI: remove the chat stop button and keep the composer aligned to the bottom edge.
- Typing: start instant typing indicators at run start so DMs and mentions show immediately.
- Configure: restrict the model allowlist picker to OAuth-compatible Anthropic models and preselect Opus 4.5.
- Configure: seed model fallbacks from the allowlist selection when multiple models are chosen.
- Model picker: list the full catalog when no model allowlist is configured.
- Discord: honor wildcard channel configs via shared match helpers. (#1334) Thanks @pvoo.
- BlueBubbles: resolve short message IDs safely and expose full IDs in templates. (#1387) Thanks @tyler6204.
- Infra: preserve fetch helper methods when wrapping abort signals. (#1387)
- macOS: default distribution packaging to universal binaries. (#1396) Thanks @JustYannicc.

## 2026.1.20

### Changes
- Control UI: add copy-as-markdown with error feedback. (#1345) https://docs.molt.bot/web/control-ui
- Control UI: drop the legacy list view. (#1345) https://docs.molt.bot/web/control-ui
- TUI: add syntax highlighting for code blocks. (#1200) https://docs.molt.bot/tui
- TUI: session picker shows derived titles, fuzzy search, relative times, and last message preview. (#1271) https://docs.molt.bot/tui
- TUI: add a searchable model picker for quicker model selection. (#1198) https://docs.molt.bot/tui
- TUI: add input history (up/down) for submitted messages. (#1348) https://docs.molt.bot/tui
- ACP: add `moltbot acp` for IDE integrations. https://docs.molt.bot/cli/acp
- ACP: add `moltbot acp client` interactive harness for debugging. https://docs.molt.bot/cli/acp
- Skills: add download installs with OS-filtered options. https://docs.molt.bot/tools/skills
- Skills: add the local sherpa-onnx-tts skill. https://docs.molt.bot/tools/skills
- Memory: add hybrid BM25 + vector search (FTS5) with weighted merging and fallback. https://docs.molt.bot/concepts/memory
- Memory: add SQLite embedding cache to speed up reindexing and frequent updates. https://docs.molt.bot/concepts/memory
- Memory: add OpenAI batch indexing for embeddings when configured. https://docs.molt.bot/concepts/memory
- Memory: enable OpenAI batch indexing by default for OpenAI embeddings. https://docs.molt.bot/concepts/memory
- Memory: allow parallel OpenAI batch indexing jobs (default concurrency: 2). https://docs.molt.bot/concepts/memory
- Memory: render progress immediately, color batch statuses in verbose logs, and poll OpenAI batch status every 2s by default. https://docs.molt.bot/concepts/memory
- Memory: add `--verbose` logging for memory status + batch indexing details. https://docs.molt.bot/concepts/memory
- Memory: add native Gemini embeddings provider for memory search. (#1151) https://docs.molt.bot/concepts/memory
- Browser: allow config defaults for efficient snapshots in the tool/CLI. (#1336) https://docs.molt.bot/tools/browser
- Nostr: add the Nostr channel plugin with profile management + onboarding defaults. (#1323) https://docs.molt.bot/channels/nostr
- Matrix: migrate to matrix-bot-sdk with E2EE support, location handling, and group allowlist upgrades. (#1298) https://docs.molt.bot/channels/matrix
- Slack: add HTTP webhook mode via Bolt HTTP receiver. (#1143) https://docs.molt.bot/channels/slack
- Telegram: enrich forwarded-message context with normalized origin details + legacy fallback. (#1090) https://docs.molt.bot/channels/telegram
- Discord: fall back to `/skill` when native command limits are exceeded. (#1287)
- Discord: expose `/skill` globally. (#1287)
- Zalouser: add channel dock metadata, config schema, setup wiring, probe, and status issues. (#1219) https://docs.molt.bot/plugins/zalouser
- Plugins: require manifest-embedded config schemas with preflight validation warnings. (#1272) https://docs.molt.bot/plugins/manifest
- Plugins: move channel catalog metadata into plugin manifests. (#1290) https://docs.molt.bot/plugins/manifest
- Plugins: align Nextcloud Talk policy helpers with core patterns. (#1290) https://docs.molt.bot/plugins/manifest
- Plugins/UI: let channel plugin metadata drive UI labels/icons and cron channel options. (#1306) https://docs.molt.bot/web/control-ui
- Agents/UI: add agent avatar support in identity config, IDENTITY.md, and the Control UI. (#1329) https://docs.molt.bot/gateway/configuration
- Plugins: add plugin slots with a dedicated memory slot selector. https://docs.molt.bot/plugins/agent-tools
- Plugins: ship the bundled BlueBubbles channel plugin (disabled by default). https://docs.molt.bot/channels/bluebubbles
- Plugins: migrate bundled messaging extensions to the plugin SDK and resolve plugin-sdk imports in the loader.
- Plugins: migrate the Zalo plugin to the shared plugin SDK runtime. https://docs.molt.bot/channels/zalo
- Plugins: migrate the Zalo Personal plugin to the shared plugin SDK runtime. https://docs.molt.bot/plugins/zalouser
- Plugins: allow optional agent tools with explicit allowlists and add the plugin tool authoring guide. https://docs.molt.bot/plugins/agent-tools
- Plugins: auto-enable bundled channel/provider plugins when configuration is present.
- Plugins: sync plugin sources on channel switches and update npm-installed plugins during `moltbot update`.
- Plugins: share npm plugin update logic between `moltbot update` and `moltbot plugins update`.

- Gateway/API: add `/v1/responses` (OpenResponses) with item-based input + semantic streaming events. (#1229)
- Gateway/API: expand `/v1/responses` to support file/image inputs, tool_choice, usage, and output limits. (#1229)
- Usage: add `/usage cost` summaries and macOS menu cost charts. https://docs.molt.bot/reference/api-usage-costs
- Security: warn when <=300B models run without sandboxing while web tools are enabled. https://docs.molt.bot/cli/security
- Exec: add host/security/ask routing for gateway + node exec. https://docs.molt.bot/tools/exec
- Exec: add `/exec` directive for per-session exec defaults (host/security/ask/node). https://docs.molt.bot/tools/exec
- Exec approvals: migrate approvals to `~/.clawdbot/exec-approvals.json` with per-agent allowlists + skill auto-allow toggle, and add approvals UI + node exec lifecycle events. https://docs.molt.bot/tools/exec-approvals
- Nodes: add headless node host (`moltbot node start`) for `system.run`/`system.which`. https://docs.molt.bot/cli/node
- Nodes: add node daemon service install/status/start/stop/restart. https://docs.molt.bot/cli/node
- Bridge: add `skills.bins` RPC to support node host auto-allow skill bins.
- Sessions: add daily reset policy with per-type overrides and idle windows (default 4am local), preserving legacy idle-only configs. (#1146) https://docs.molt.bot/concepts/session
- Sessions: allow `sessions_spawn` to override thinking level for sub-agent runs. https://docs.molt.bot/tools/subagents
- Channels: unify thread/topic allowlist matching + command/mention gating helpers across core providers. https://docs.molt.bot/concepts/groups
- Models: add Qwen Portal OAuth provider support. (#1120) https://docs.molt.bot/providers/qwen
- Onboarding: add allowlist prompts and username-to-id resolution across core and extension channels. https://docs.molt.bot/start/onboarding
- Docs: clarify allowlist input types and onboarding behavior for messaging channels. https://docs.molt.bot/start/onboarding
- Docs: refresh Android node discovery docs for the Gateway WS service type. https://docs.molt.bot/platforms/android
- Docs: surface Amazon Bedrock in provider lists and clarify Bedrock auth env vars. (#1289) https://docs.molt.bot/bedrock
- Docs: clarify WhatsApp voice notes. https://docs.molt.bot/channels/whatsapp
- Docs: clarify Windows WSL portproxy LAN access notes. https://docs.molt.bot/platforms/windows
- Docs: refresh bird skill install metadata and usage notes. (#1302) https://docs.molt.bot/tools/browser-login
- Agents: add local docs path resolution and include docs/mirror/source/community pointers in the system prompt.
- Agents: clarify node_modules read-only guidance in agent instructions.
- Config: stamp last-touched metadata on write and warn if the config is newer than the running build.
- macOS: hide usage section when usage is unavailable instead of showing provider errors.
- Android: migrate node transport to the Gateway WebSocket protocol with TLS pinning support + gateway discovery naming.
- Android: send structured payloads in node events/invokes and include user-agent metadata in gateway connects.
- Android: remove legacy bridge transport code now that nodes use the gateway protocol.
- Android: bump okhttp + dnsjava to satisfy lint dependency checks.
- Build: update workspace + core/plugin deps.
- Build: use tsgo for dev/watch builds by default (opt out with `CLAWDBOT_TS_COMPILER=tsc`).
- Repo: remove the Peekaboo git submodule now that the SPM release is used.
- macOS: switch PeekabooBridge integration to the tagged Swift Package Manager release.
- macOS: stop syncing Peekaboo in postinstall.
- Swabble: use the tagged Commander Swift package release.

### Breaking
- **BREAKING:** Reject invalid/unknown config entries and refuse to start the gateway for safety. Run `moltbot doctor --fix` to repair, then update plugins (`moltbot plugins update`) if you use any.

### Fixes
- Discovery: shorten Bonjour DNS-SD service type to `_moltbot-gw._tcp` and update discovery clients/docs.
- Diagnostics: export OTLP logs, correct queue depth tracking, and document message-flow telemetry.
- Diagnostics: emit message-flow diagnostics across channels via shared dispatch. (#1244)
- Diagnostics: gate heartbeat/webhook logging. (#1244)
- Gateway: strip inbound envelope headers from chat history messages to keep clients clean.
- Gateway: clarify unauthorized handshake responses with token/password mismatch guidance.
- Gateway: allow mobile node client ids for iOS + Android handshake validation. (#1354)
- Gateway: clarify connect/validation errors for gateway params. (#1347)
- Gateway: preserve restart wake routing + thread replies across restarts. (#1337)
- Gateway: reschedule per-agent heartbeats on config hot reload without restarting the runner.
- Gateway: require authorized restarts for SIGUSR1 (restart/apply/update) so config gating can't be bypassed.
- Cron: auto-deliver isolated agent output to explicit targets without tool calls. (#1285)
- Agents: preserve subagent announce thread/topic routing + queued replies across channels. (#1241)
- Agents: propagate accountId into embedded runs so sub-agent announce routing honors the originating account. (#1058)
- Agents: avoid treating timeout errors with "aborted" messages as user aborts, so model fallback still runs. (#1137)
- Agents: sanitize oversized image payloads before send and surface image-dimension errors.
- Sessions: fall back to session labels when listing display names. (#1124)
- Compaction: include tool failure summaries in safeguard compaction to prevent retry loops. (#1084)
- Config: log invalid config issues once per run and keep invalid-config errors stackless.
- Config: allow Perplexity as a web_search provider in config validation. (#1230)
- Config: allow custom fields under `skills.entries.<name>.config` for skill credentials/config. (#1226)
- Doctor: clarify plugin auto-enable hint text in the startup banner.
- Doctor: canonicalize legacy session keys in session stores to prevent stale metadata. (#1169)
- Docs: make docs:list fail fast with a clear error if the docs directory is missing.
- Plugins: add Nextcloud Talk manifest for plugin config validation. (#1297)
- Plugins: surface plugin load/register/config errors in gateway logs with plugin/source context.
- CLI: preserve cron delivery settings when editing message payloads. (#1322)
- CLI: keep `moltbot logs` output resilient to broken pipes while preserving progress output.
- CLI: avoid duplicating --profile/--dev flags when formatting commands.
- CLI: centralize CLI command registration to keep fast-path routing and program wiring in sync. (#1207)
- CLI: keep banners on routed commands, restore config guarding outside fast-path routing, and tighten fast-path flag parsing while skipping console capture for extra speed. (#1195)
- CLI: skip runner rebuilds when dist is fresh. (#1231)
- CLI: add WSL2/systemd unavailable hints in daemon status/doctor output.
- Status: route native `/status` to the active agent so model selection reflects the correct profile. (#1301)
- Status: show both usage windows with reset hints when usage data is available. (#1101)
- UI: keep config form enums typed, preserve empty strings, protect sensitive defaults, and deepen config search. (#1315)
- UI: preserve ordered list numbering in chat markdown. (#1341)
- UI: allow Control UI to read gatewayUrl from URL params for remote WebSocket targets. (#1342)
- UI: prevent double-scroll in Control UI chat by locking chat layout to the viewport. (#1283)
- UI: enable shell mode for sync Windows spawns to avoid `pnpm ui:build` EINVAL. (#1212)
- TUI: keep thinking blocks ordered before content during streaming and isolate per-run assembly. (#1202)
- TUI: align custom editor initialization with the latest pi-tui API. (#1298)
- TUI: show generic empty-state text for searchable pickers. (#1201)
- TUI: highlight model search matches and stabilize search ordering.
- Configure: hide OpenRouter auto routing model from the model picker. (#1182)
- Memory: show total file counts + scan issues in `moltbot memory status`.
- Memory: fall back to non-batch embeddings after repeated batch failures.
- Memory: apply OpenAI batch defaults even without explicit remote config.
- Memory: index atomically so failed reindex preserves the previous memory database. (#1151)
- Memory: avoid sqlite-vec unique constraint failures when reindexing duplicate chunk ids. (#1151)
- Memory: retry transient 5xx errors (Cloudflare) during embedding indexing.
- Memory: parallelize embedding indexing with rate-limit retries.
- Memory: split overly long lines to keep embeddings under token limits.
- Memory: skip empty chunks to avoid invalid embedding inputs.
- Memory: split embedding batches to avoid OpenAI token limits during indexing.
- Memory: probe sqlite-vec availability in `moltbot memory status`.
- Exec approvals: enforce allowlist when ask is off.
- Exec approvals: prefer raw command for node approvals/events.
- Tools: show exec elevated flag before the command and keep it outside markdown in tool summaries.
- Tools: return a companion-app-required message when node exec is requested with no paired node.
- Tools: return a companion-app-required message when `system.run` is requested without a supporting node.
- Exec: default gateway/node exec security to allowlist when unset (sandbox stays deny).
- Exec: prefer bash when fish is default shell, falling back to sh if bash is missing. (#1297)
- Exec: merge login-shell PATH for host=gateway exec while keeping daemon PATH minimal. (#1304)
- Streaming: emit assistant deltas for OpenAI-compatible SSE chunks. (#1147)
- Discord: make resolve warnings avoid raw JSON payloads on rate limits.
- Discord: process message handlers in parallel across sessions to avoid event queue blocking. (#1295)
- Discord: stop reconnecting the gateway after aborts to prevent duplicate listeners.
- Discord: only emit slow listener warnings after 30s.
- Discord: inherit parent channel allowlists for thread slash commands and reactions. (#1123)
- Telegram: honor pairing allowlists for native slash commands.
- Telegram: preserve hidden text_link URLs by expanding entities in inbound text. (#1118)
- Slack: resolve Bolt import interop for Bun + Node. (#1191)
- Web search: infer Perplexity base URL from API key source (direct vs OpenRouter).
- Web fetch: harden SSRF protection with shared hostname checks and redirect limits. (#1346)
- Browser: register AI snapshot refs for act commands. (#1282)
- Voice call: include request query in Twilio webhook verification when publicUrl is set. (#864)
- Anthropic: default API prompt caching to 1h with configurable TTL override.
- Anthropic: ignore TTL for OAuth.
- Auth profiles: keep auto-pinned preference while allowing rotation on failover. (#1138)
- Auth profiles: user pins stay locked. (#1138)
- Model catalog: avoid caching import failures, log transient discovery errors, and keep partial results. (#1332)
- Tests: stabilize Windows gateway/CLI tests by skipping sidecars, normalizing argv, and extending timeouts.
- Tests: stabilize plugin SDK resolution and embedded agent timeouts.
- Windows: install gateway scheduled task as the current user.
- Windows: show friendly guidance instead of failing on access denied.
- macOS: load menu session previews asynchronously so items populate while the menu is open.
- macOS: use label colors for session preview text so previews render in menu subviews.
- macOS: suppress usage error text in the menubar cost view.
- macOS: Doctor repairs LaunchAgent bootstrap issues for Gateway + Node when listed but not loaded. (#1166)
- macOS: avoid touching launchd in Remote over SSH so quitting the app no longer disables the remote gateway. (#1105)
- macOS: bundle Textual resources in packaged app builds to avoid code block crashes. (#1006)
- Daemon: include HOME in service environments to avoid missing HOME errors. (#1214)

Thanks @AlexMikhalev, @CoreyH, @John-Rood, @KrauseFx, @MaudeBot, @Nachx639, @NicholaiVogel, @RyanLisse, @ThePickle31, @VACInc, @Whoaa512, @YuriNachos, @aaronveklabs, @abdaraxus, @alauppe, @ameno-, @artuskg, @austinm911, @bradleypriest, @cheeeee, @dougvk, @fogboots, @gnarco, @gumadeiras, @jdrhyne, @joelklabo, @longmaba, @mukhtharcm, @odysseus0, @oscargavin, @rhjoh, @sebslight, @sibbl, @sleontenko, @steipete, @suminhthanh, @thewilloftheshadow, @tyler6204, @vignesh07, @visionik, @ysqander, @zerone0x.

## 2026.1.16-2

### Changes
- CLI: stamp build commit into dist metadata so banners show the commit in npm installs.
- CLI: close memory manager after memory commands to avoid hanging processes. (#1127) — thanks @NicholasSpisak.

## 2026.1.16-1

### Highlights
- Hooks: add hooks system with bundled hooks, CLI tooling, and docs. (#1028) — thanks @ThomsenDrake. https://docs.molt.bot/hooks
- Media: add inbound media understanding (image/audio/video) with provider + CLI fallbacks. https://docs.molt.bot/nodes/media-understanding
- Plugins: add Zalo Personal plugin (`@moltbot/zalouser`) and unify channel directory for plugins. (#1032) — thanks @suminhthanh. https://docs.molt.bot/plugins/zalouser
- Models: add Vercel AI Gateway auth choice + onboarding updates. (#1016) — thanks @timolins. https://docs.molt.bot/providers/vercel-ai-gateway
- Sessions: add `session.identityLinks` for cross-platform DM session li  nking. (#1033) — thanks @thewilloftheshadow. https://docs.molt.bot/concepts/session
- Web search: add `country`/`language` parameters (schema + Brave API) and docs. (#1046) — thanks @YuriNachos. https://docs.molt.bot/tools/web

### Breaking
- **BREAKING:** `moltbot message` and message tool now require `target` (dropping `to`/`channelId` for destinations). (#1034) — thanks @tobalsan.
- **BREAKING:** Channel auth now prefers config over env for Discord/Telegram/Matrix (env is fallback only). (#1040) — thanks @thewilloftheshadow.
- **BREAKING:** Drop legacy `chatType: "room"` support; use `chatType: "channel"`.
- **BREAKING:** remove legacy provider-specific target resolution fallbacks; target resolution is centralized with plugin hints + directory lookups.
- **BREAKING:** `moltbot hooks` is now `moltbot webhooks`; hooks live under `moltbot hooks`. https://docs.molt.bot/cli/webhooks
- **BREAKING:** `moltbot plugins install <path>` now copies into `~/.clawdbot/extensions` (use `--link` to keep path-based loading).

### Changes
- Plugins: ship bundled plugins disabled by default and allow overrides by installed versions. (#1066) — thanks @ItzR3NO.
- Plugins: add bundled Antigravity + Gemini CLI OAuth + Copilot Proxy provider plugins. (#1066) — thanks @ItzR3NO.
- Tools: improve `web_fetch` extraction using Readability (with fallback).
- Tools: add Firecrawl fallback for `web_fetch` when configured.
- Tools: send Chrome-like headers by default for `web_fetch` to improve extraction on bot-sensitive sites.
- Tools: Firecrawl fallback now uses bot-circumvention + cache by default; remove basic HTML fallback when extraction fails.
- Tools: default `exec` exit notifications and auto-migrate legacy `tools.bash` to `tools.exec`.
- Tools: add `exec` PTY support for interactive sessions. https://docs.molt.bot/tools/exec
- Tools: add tmux-style `process send-keys` and bracketed paste helpers for PTY sessions.
- Tools: add `process submit` helper to send CR for PTY sessions.
- Tools: respond to PTY cursor position queries to unblock interactive TUIs.
- Tools: include tool outputs in verbose mode and expand verbose tool feedback.
- Skills: update coding-agent guidance to prefer PTY-enabled exec runs and simplify tmux usage.
- TUI: refresh session token counts after runs complete or fail. (#1079) — thanks @d-ploutarchos.
- Status: trim `/status` to current-provider usage only and drop the OAuth/token block.
- Directory: unify `moltbot directory` across channels and plugin channels.
- UI: allow deleting sessions from the Control UI.
- Memory: add sqlite-vec vector acceleration with CLI status details.
- Memory: add experimental session transcript indexing for memory_search (opt-in via memorySearch.experimental.sessionMemory + sources).
- Skills: add user-invocable skill commands and expanded skill command registration.
- Telegram: default reaction level to minimal and enable reaction notifications by default.
- Telegram: allow reply-chain messages to bypass mention gating in groups. (#1038) — thanks @adityashaw2.
- iMessage: add remote attachment support for VM/SSH deployments.
- Messages: refresh live directory cache results when resolving targets.
- Messages: mirror delivered outbound text/media into session transcripts. (#1031) — thanks @TSavo.
- Messages: avoid redundant sender envelopes for iMessage + Signal group chats. (#1080) — thanks @tyler6204.
- Media: normalize Deepgram audio upload bytes for fetch compatibility.
- Cron: isolated cron jobs now start a fresh session id on every run to prevent context buildup.
- Docs: add `/help` hub, Node/npm PATH guide, and expand directory CLI docs.
- Config: support env var substitution in config values. (#1044) — thanks @sebslight.
- Health: add per-agent session summaries and account-level health details, and allow selective probes. (#1047) — thanks @gumadeiras.
- Hooks: add hook pack installs (npm/path/zip/tar) with `moltbot.hooks` manifests and `moltbot hooks install/update`.
- Plugins: add zip installs and `--link` to avoid copying local paths.

### Fixes
- macOS: drain subprocess pipes before waiting to avoid deadlocks. (#1081) — thanks @thesash.
- Verbose: wrap tool summaries/output in markdown only for markdown-capable channels.
- Tools: include provider/session context in elevated exec denial errors.
- Tools: normalize exec tool alias naming in tool error logs.
- Logging: reuse shared ANSI stripping to keep console capture lint-clean.
- Logging: prefix nested agent output with session/run/channel context.
- Telegram: accept tg/group/telegram prefixes + topic targets for inline button validation. (#1072) — thanks @danielz1z.
- Telegram: split long captions into follow-up messages.
- Config: block startup on invalid config, preserve best-effort doctor config, and keep rolling config backups. (#1083) — thanks @mukhtharcm.
- Sub-agents: normalize announce delivery origin + queue bucketing by accountId to keep multi-account routing stable. (#1061, #1058) — thanks @adam91holt.
- Sessions: include deliveryContext in sessions.list and reuse normalized delivery routing for announce/restart fallbacks. (#1058)
- Sessions: propagate deliveryContext into last-route updates to keep account/channel routing stable. (#1058)
- Sessions: preserve overrides on `/new` reset.
- Memory: prevent unhandled rejections when watch/interval sync fails. (#1076) — thanks @roshanasingh4.
- Memory: avoid gateway crash when embeddings return 429/insufficient_quota (disable tool + surface error). (#1004)
- Gateway: honor explicit delivery targets without implicit accountId fallback; preserve lastAccountId for implicit routing.
- Gateway: avoid reusing last-to/accountId when the requested channel differs; sync deliveryContext with last route fields.
- Build: allow `@lydell/node-pty` builds on supported platforms.
- Repo: fix oxlint config filename and move ignore pattern into config. (#1064) — thanks @connorshea.
- Messages: `/stop` now hard-aborts queued followups and sub-agent runs; suppress zero-count stop notes.
- Messages: honor message tool channel when deduping sends.
- Messages: include sender labels for live group messages across channels, matching queued/history formatting. (#1059)
- Sessions: reset `compactionCount` on `/new` and `/reset`, and preserve `sessions.json` file mode (0600).
- Sessions: repair orphaned user turns before embedded prompts.
- Sessions: hard-stop `sessions.delete` cleanup.
- Channels: treat replies to the bot as implicit mentions across supported channels.
- Channels: normalize object-format capabilities in channel capability parsing.
- Security: default-deny slash/control commands unless a channel computed `CommandAuthorized` (fixes accidental “open” behavior), and ensure WhatsApp + Zalo plugin channels gate inline `/…` tokens correctly. https://docs.molt.bot/gateway/security
- Security: redact sensitive text in gateway WS logs.
- Tools: cap pending `exec` process output to avoid unbounded buffers.
- CLI: speed up `moltbot sandbox-explain` by avoiding heavy plugin imports when normalizing channel ids.
- Browser: remote profile tab operations prefer persistent Playwright and avoid silent HTTP fallbacks. (#1057) — thanks @mukhtharcm.
- Browser: remote profile tab ops follow-up: shared Playwright loader, Playwright-based focus, and more coverage (incl. opt-in live Browserless test). (follow-up to #1057) — thanks @mukhtharcm.
- Browser: refresh extension relay tab metadata after navigation so `/json/list` stays current. (#1073) — thanks @roshanasingh4.
- WhatsApp: scope self-chat response prefix; inject pending-only group history and clear after any processed message.
- WhatsApp: include `linked` field in `describeAccount`.
- Agents: drop unsigned Gemini tool calls and avoid JSON Schema `format` keyword collisions.
- Agents: hide the image tool when the primary model already supports images.
- Agents: avoid duplicate sends by replying with `NO_REPLY` after `message` tool sends.
- Auth: inherit/merge sub-agent auth profiles from the main agent.
- Gateway: resolve local auth for security probe and validate gateway token/password file modes. (#1011, #1022) — thanks @ivanrvpereira, @kkarimi.
- Signal/iMessage: bound transport readiness waits to 30s with periodic logging. (#1014) — thanks @Szpadel.
- iMessage: avoid RPC restart loops.
- OpenAI image-gen: handle URL + `b64_json` responses and remove deprecated `response_format` (use URL downloads).
- CLI: auto-update global installs when installed via a package manager.
- Routing: migrate legacy `accountID` bindings to `accountId` and remove legacy fallback lookups. (#1047) — thanks @gumadeiras.
- Discord: truncate skill command descriptions to 100 chars for slash command limits. (#1018) — thanks @evalexpr.
- Security: bump `tar` to 7.5.3.
- Models: align ZAI thinking toggles.
- iMessage/Signal: include sender metadata for non-queued group messages. (#1059)
- Discord: preserve whitespace when chunking long lines so message splits keep spacing intact.
- Skills: fix skills watcher ignored list typing (tsc).

## 2026.1.15

### Highlights
- Plugins: add provider auth registry + `moltbot models auth login` for plugin-driven OAuth/API key flows.
- Browser: improve remote CDP/Browserless support (auth passthrough, `wss` upgrade, timeouts, clearer errors).
- Heartbeat: per-agent configuration + 24h duplicate suppression. (#980) — thanks @voidserf.
- Security: audit warns on weak model tiers; app nodes store auth tokens encrypted (Keychain/SecurePrefs).

### Breaking
- **BREAKING:** iOS minimum version is now 18.0 to support Textual markdown rendering in native chat. (#702)
- **BREAKING:** Microsoft Teams is now a plugin; install `@moltbot/msteams` via `moltbot plugins install @moltbot/msteams`.
- **BREAKING:** Channel auth now prefers config over env for Discord/Telegram/Matrix (env is fallback only). (#1040) — thanks @thewilloftheshadow.

### Changes
- UI/Apps: move channel/config settings to schema-driven forms and rename Connections → Channels. (#1040) — thanks @thewilloftheshadow.
- CLI: set process titles to `moltbot-<command>` for clearer process listings.
- CLI/macOS: sync remote SSH target/identity to config and let `gateway status` auto-infer SSH targets (ssh-config aware).
- Telegram: scope inline buttons with allowlist default + callback gating in DMs/groups.
- Telegram: default reaction notifications to own.
- Tools: improve `web_fetch` extraction using Readability (with fallback).
- Heartbeat: tighten prompt guidance + suppress duplicate alerts for 24h. (#980) — thanks @voidserf.
- Repo: ignore local identity files to avoid accidental commits. (#1001) — thanks @gerardward2007.
- Sessions/Security: add `session.dmScope` for multi-user DM isolation and audit warnings. (#948) — thanks @Alphonse-arianee.
<<<<<<< HEAD
- Plugins: add provider auth registry + `moltbot models auth login` for plugin-driven OAuth/API key flows.
=======
>>>>>>> 9f5429e52 (docs: trim refactor-only and duplicate changelog entries)
- Onboarding: switch channels setup to a single-select loop with per-channel actions and disabled hints in the picker.
- TUI: show provider/model labels for the active session and default model.
- Heartbeat: add per-agent heartbeat configuration and multi-agent docs example.
- UI: show gateway auth guidance + doc link on unauthorized Control UI connections.
- UI: add session deletion action in Control UI sessions list. (#1017) — thanks @Szpadel.
- Security: warn on weak model tiers (Haiku, below GPT-5, below Claude 4.5) in `moltbot security audit`.
- Apps: store node auth tokens encrypted (Keychain/SecurePrefs).
- Daemon: share profile/state-dir resolution across service helpers and honor `CLAWDBOT_STATE_DIR` for Windows task scripts.
- Docs: clarify multi-gateway rescue bot guidance. (#969) — thanks @bjesuiter.
- Agents: add Current Date & Time system prompt section with configurable time format (auto/12/24).
- Tools: normalize Slack/Discord message timestamps with `timestampMs`/`timestampUtc` while keeping raw provider fields.
- macOS: add `system.which` for prompt-free remote skill discovery (with gateway fallback to `system.run`).
- Docs: add Date & Time guide and update prompt/timezone configuration docs.
- Messages: debounce rapid inbound messages across channels with per-connector overrides. (#971) — thanks @juanpablodlc.
- Messages: allow media-only sends (CLI/tool) and show Telegram voice recording status for voice notes. (#957) — thanks @rdev.
- Auth/Status: keep auth profiles sticky per session (rotate on compaction/new), surface provider usage headers in `/status` and `moltbot models status`, and update docs.
- CLI: add `--json` output for `moltbot daemon` lifecycle/install commands.
- Memory: make `node-llama-cpp` an optional dependency (avoid Node 25 install failures) and improve local-embeddings fallback/errors.
- Browser: add `snapshot refs=aria` (Playwright aria-ref ids) for self-resolving refs across `snapshot` → `act`.
- Browser: `profile="chrome"` now defaults to host control and returns clearer “attach a tab” errors.
- Browser: prefer stable Chrome for auto-detect, with Brave/Edge fallbacks and updated docs. (#983) — thanks @cpojer.
- Browser: increase remote CDP reachability timeouts + add `remoteCdpTimeoutMs`/`remoteCdpHandshakeTimeoutMs`.
- Browser: preserve auth/query tokens for remote CDP endpoints and pass Basic auth for CDP HTTP/WS. (#895) — thanks @mukhtharcm.
- Telegram: add bidirectional reaction support with configurable notifications and agent guidance. (#964) — thanks @bohdanpodvirnyi.
- Telegram: allow custom commands in the bot menu (merged with native; conflicts ignored). (#860) — thanks @nachoiacovino.
- Discord: allow allowlisted guilds without channel lists to receive messages when `groupPolicy="allowlist"`. — thanks @thewilloftheshadow.
- Discord: allow emoji/sticker uploads + channel actions in config defaults. (#870) — thanks @JDIVE.

### Fixes
- Messages: make `/stop` clear queued followups and pending session lane work for a hard abort.
- Messages: make `/stop` abort active sub-agent runs spawned from the requester session and report how many were stopped.
- WhatsApp: report linked status consistently in channel status. (#1050) — thanks @YuriNachos.
- Sessions: keep per-session overrides when `/new` resets compaction counters. (#1050) — thanks @YuriNachos.
- Skills: allow OpenAI image-gen helper to handle URL or base64 responses. (#1050) — thanks @YuriNachos.
- WhatsApp: default response prefix only for self-chat, using identity name when set.
- Signal/iMessage: bound transport readiness waits to 30s with periodic logging. (#1014) — thanks @Szpadel.
- iMessage: treat missing `imsg rpc` support as fatal to avoid restart loops.
- Auth: merge main auth profiles into per-agent stores for sub-agents and document inheritance. (#1013) — thanks @marcmarg.
- Agents: avoid JSON Schema `format` collisions in tool params by renaming snapshot format fields. (#1013) — thanks @marcmarg.
- Fix: make `moltbot update` auto-update global installs when installed via a package manager.
- Fix: list model picker entries as provider/model pairs for explicit selection. (#970) — thanks @mcinteerj.
- Fix: align OpenAI image-gen defaults with DALL-E 3 standard quality and document output formats. (#880) — thanks @mkbehr.
- Fix: persist `gateway.mode=local` after selecting Local run mode in `moltbot configure`, even if no other sections are chosen.
- Daemon: fix profile-aware service label resolution (env-driven) and add coverage for launchd/systemd/schtasks. (#969) — thanks @bjesuiter.
- Agents: avoid false positives when logging unsupported Google tool schema keywords.
- Agents: skip Gemini history downgrades for google-antigravity to preserve tool calls. (#894) — thanks @mukhtharcm.
- Status: restore usage summary line for current provider when no OAuth profiles exist.
- Fix: guard model fallback against undefined provider/model values. (#954) — thanks @roshanasingh4.
- Fix: refactor session store updates, add chat.inject, and harden subagent cleanup flow. (#944) — thanks @tyler6204.
- Fix: clean up suspended CLI processes across backends. (#978) — thanks @Nachx639.
- Fix: support MiniMax coding plan usage responses with `model_remains`/`current_interval_*` payloads.
- Fix: honor message tool channel for duplicate suppression (prefer `NO_REPLY` after `message` tool sends). (#1053) — thanks @sashcatanzarite.
- Fix: suppress WhatsApp pairing replies for historical catch-up DMs on initial link. (#904)
- Browser: extension mode recovers when only one tab is attached (stale targetId fallback).
- Browser: fix `tab not found` for extension relay snapshots/actions when Playwright blocks `newCDPSession` (use the single available Page).
- Browser: upgrade `ws` → `wss` when remote CDP uses `https` (fixes Browserless handshake).
- Telegram: skip `message_thread_id=1` for General topic sends while keeping typing indicators. (#848) — thanks @azade-c.
- Fix: sanitize user-facing error text + strip `<final>` tags across reply pipelines. (#975) — thanks @ThomsenDrake.
- Fix: normalize pairing CLI aliases, allow extension channels, and harden Zalo webhook payload parsing. (#991) — thanks @longmaba.
- Fix: allow local Tailscale Serve hostnames without treating tailnet clients as direct. (#885) — thanks @oswalpalash.
- Fix: reset sessions after role-ordering conflicts to recover from consecutive user turns. (#998)

## 2026.1.14-1

### Highlights
- Web search: `web_search`/`web_fetch` tools (Brave API) + first-time setup in onboarding/configure.
- Browser control: Chrome extension relay takeover mode + remote browser control support.
- Plugins: channel plugins (gateway HTTP hooks) + Zalo plugin + onboarding install flow. (#854) — thanks @longmaba.
- Security: expanded `moltbot security audit` (+ `--fix`), detect-secrets CI scan, and a `SECURITY.md` reporting policy.

### Changes
- Docs: clarify per-agent auth stores, sandboxed skill binaries, and elevated semantics.
- Docs: add FAQ entries for missing provider auth after adding agents and Gemini thinking signature errors.
- Agents: add optional auth-profile copy prompt on `agents add` and improve auth error messaging.
- Security: expand `moltbot security audit` checks (model hygiene, config includes, plugin allowlists, exposure matrix) and extend `--fix` to tighten more sensitive state paths.
- Security: add `SECURITY.md` reporting policy.
- Channels: add Matrix plugin (external) with docs + onboarding hooks.
- Plugins: add Zalo channel plugin with gateway HTTP hooks and onboarding install prompt. (#854) — thanks @longmaba.
- Onboarding: add a security checkpoint prompt (docs link + sandboxing hint); require `--accept-risk` for `--non-interactive`.
- Docs: expand gateway security hardening guidance and incident response checklist.
- Docs: document DM history limits for channel DMs. (#883) — thanks @pkrmf.
- Security: add detect-secrets CI scan and baseline guidance. (#227) — thanks @Hyaxia.
- Tools: add `web_search`/`web_fetch` (Brave API), auto-enable `web_fetch` for sandboxed sessions, and remove the `brave-search` skill.
- CLI/Docs: add a web tools configure section for storing Brave API keys and update onboarding tips.
- Browser: add Chrome extension relay takeover mode (toolbar button), plus `moltbot browser extension install/path` and remote browser control (standalone server + token auth).

### Fixes
- Sessions: refactor session store updates to lock + mutate per-entry, add chat.inject, and harden subagent cleanup flow. (#944) — thanks @tyler6204.
- Browser: add tests for snapshot labels/efficient query params and labeled image responses.
- Google: downgrade unsigned thinking blocks before send to avoid missing signature errors.
- Doctor: avoid re-adding WhatsApp config when only legacy ack reactions are set. (#927, fixes #900) — thanks @grp06.
- Agents: scrub tuple `items` schemas for Gemini tool calls. (#926, fixes #746) — thanks @grp06.
- Agents: harden Antigravity Claude history/tool-call sanitization. (#968) — thanks @rdev.
- Agents: stabilize sub-agent announce status from runtime outcomes and normalize Result/Notes. (#835) — thanks @roshanasingh4.
- Embedded runner: suppress raw API error payloads from replies. (#924) — thanks @grp06.
- Auth: normalize Claude Code CLI profile mode to oauth and auto-migrate config. (#855) — thanks @sebslight.
- Daemon: clear persisted launchd disabled state before bootstrap (fixes `daemon install` after uninstall). (#849) — thanks @ndraiman.
- Logging: tolerate `EIO` from console writes to avoid gateway crashes. (#925, fixes #878) — thanks @grp06.
- Sandbox: restore `docker.binds` config validation for custom bind mounts. (#873) — thanks @akonyer.
- Sandbox: preserve configured PATH for `docker exec` so custom tools remain available. (#873) — thanks @akonyer.
- Slack: respect `channels.slack.requireMention` default when resolving channel mention gating. (#850) — thanks @evalexpr.
- Telegram: aggregate split inbound messages into one prompt (reduces “one reply per fragment”).
- Auto-reply: treat trailing `NO_REPLY` tokens as silent replies.
- Config: prevent partial config writes from clobbering unrelated settings (base hash guard + merge patch for connection saves).

## 2026.1.14

### Changes
- Usage: add MiniMax coding plan usage tracking.
- Auth: label Claude Code CLI auth options. (#915) — thanks @SeanZoR.
- Docs: standardize Claude Code CLI naming across docs and prompts. (follow-up to #915)
- Telegram: add message delete action in the message tool. (#903) — thanks @sleontenko.
- Config: add `channels.<provider>.configWrites` gating for channel-initiated config writes; migrate Slack channel IDs.

### Fixes
 - Mac: pass auth token/password to dashboard URL for authenticated access. (#918) — thanks @rahthakor.
 - UI: use application-defined WebSocket close code (browser compatibility). (#918) — thanks @rahthakor.
- TUI: render picker overlays via the overlay stack so /models and /settings display. (#921) — thanks @grizzdank.
- TUI: add a bright spinner + elapsed time in the status line for send/stream/run states.
- TUI: show LLM error messages (rate limits, auth, etc.) instead of `(no output)`.
- Gateway/Dev: ensure `pnpm gateway:dev` always uses the dev profile config + state (`~/.clawdbot-dev`).

#### Agents / Auth / Tools / Sandbox
- Agents: make user time zone and 24-hour time explicit in the system prompt. (#859) — thanks @CashWilliams.
- Agents: strip downgraded tool call text without eating adjacent replies and filter thinking-tag leaks. (#905) — thanks @erikpr1994.
- Agents: cap tool call IDs for OpenAI/OpenRouter to avoid request rejections. (#875) — thanks @j1philli.
- Agents: scrub tuple `items` schemas for Gemini tool calls. (#926, fixes #746) — thanks @grp06.
- Agents: stabilize sub-agent announce status from runtime outcomes and normalize Result/Notes. (#835) — thanks @roshanasingh4.
- Auth: normalize Claude Code CLI profile mode to oauth and auto-migrate config. (#855) — thanks @sebslight.
- Embedded runner: suppress raw API error payloads from replies. (#924) — thanks @grp06.
- Logging: tolerate `EIO` from console writes to avoid gateway crashes. (#925, fixes #878) — thanks @grp06.
- Sandbox: restore `docker.binds` config validation and preserve configured PATH for `docker exec`. (#873) — thanks @akonyer.
- Google: downgrade unsigned thinking blocks before send to avoid missing signature errors.

#### macOS / Apps
- macOS: ensure launchd log directory exists with a test-only override. (#909) — thanks @roshanasingh4.
- macOS: format ConnectionsStore config to satisfy SwiftFormat lint. (#852) — thanks @mneves75.
- macOS: pass auth token/password to dashboard URL for authenticated access. (#918) — thanks @rahthakor.
- macOS: reuse launchd gateway auth and skip wizard when gateway config already exists. (#917)
- macOS: prefer the default bridge tunnel port in remote mode for node bridge connectivity; document macOS remote control + bridge tunnels. (#960, fixes #865) — thanks @kkarimi.
- Apps: use canonical main session keys from gateway defaults across macOS/iOS/Android to avoid creating bare `main` sessions.
- macOS: fix cron preview/testing payload to use `channel` key. (#867) — thanks @wes-davis.
- Telegram: honor `channels.telegram.timeoutSeconds` for grammY API requests. (#863) — thanks @Snaver.
- Telegram: split long captions into media + follow-up text messages. (#907) - thanks @jalehman.
- Telegram: migrate group config when supergroups change chat IDs. (#906) — thanks @sleontenko.
- Messaging: unify markdown formatting + format-first chunking for Slack/Telegram/Signal. (#920) — thanks @TheSethRose.
- Slack: drop Socket Mode events with mismatched `api_app_id`/`team_id`. (#889) — thanks @roshanasingh4.
- Discord: isolate autoThread thread context. (#856) — thanks @davidguttman.
- WhatsApp: fix context isolation using wrong ID (was bot's number, now conversation ID). (#911) — thanks @tristanmanchester.
- WhatsApp: normalize user JIDs with device suffix for allowlist checks in groups. (#838) — thanks @peschee.

## 2026.1.13

### Fixes
- Postinstall: treat already-applied pnpm patches as no-ops to avoid npm/bun install failures.
- Packaging: pin `@mariozechner/pi-ai` to 0.45.7 and refresh patched dependency to match npm resolution.

## 2026.1.12-2

### Fixes
- Packaging: include `dist/memory/**` in the npm tarball (fixes `ERR_MODULE_NOT_FOUND` for `dist/memory/index.js`).
- Agents: persist sub-agent registry across gateway restarts and resume announce flow safely. (#831) — thanks @roshanasingh4.
- Agents: strip invalid Gemini thought signatures from OpenRouter history to avoid 400s. (#841, #845) — thanks @MatthieuBizien.

## 2026.1.12-1

### Fixes
- Packaging: include `dist/channels/**` in the npm tarball (fixes `ERR_MODULE_NOT_FOUND` for `dist/channels/registry.js`).

## 2026.1.12

### Highlights
- **BREAKING:** rename chat “providers” (Slack/Telegram/WhatsApp/…) to **channels** across CLI/RPC/config; legacy config keys auto-migrate on load (and are written back as `channels.*`).
- Memory: add vector search for agent memories (Markdown-only) with SQLite index, chunking, lazy sync + file watch, and per-agent enablement/fallback.
- Plugins: restore full voice-call plugin parity (Telnyx/Twilio, streaming, inbound policies, tools/CLI).
- Models: add Synthetic provider plus Moonshot Kimi K2 0905 + turbo/thinking variants (with docs). (#811) — thanks @siraht; (#818) — thanks @mickahouan.
- Cron: one-shot schedules accept ISO timestamps (UTC) with optional delete-after-run; cron jobs can target a specific agent (CLI + macOS/Control UI).
- Agents: add compaction mode config with optional safeguard summarization and per-agent model fallbacks. (#700) — thanks @thewilloftheshadow; (#583) — thanks @mitschabaude-bot.

### New & Improved
- Memory: add custom OpenAI-compatible embedding endpoints; support OpenAI/local `node-llama-cpp` embeddings with per-agent overrides and provider metadata in tools/CLI. (#819) — thanks @mukhtharcm.
- Memory: new `moltbot memory` CLI plus `memory_search`/`memory_get` tools with snippets + line ranges; index stored under `~/.clawdbot/memory/{agentId}.sqlite` with watch-on-by-default.
- Agents: strengthen memory recall guidance; make workspace bootstrap truncation configurable (default 20k) with warnings; add default sub-agent model config.
- Tools/Sandbox: add tool profiles + group shorthands; support tool-policy groups in `tools.sandbox.tools`; drop legacy `memory` shorthand; allow Docker bind mounts via `docker.binds`. (#790) — thanks @akonyer.
- Tools: add provider/model-specific tool policy overrides (`tools.byProvider`) to trim tool exposure per provider.
- Tools: add browser `scrollintoview` action; allow Claude/Gemini tool param aliases; allow thinking `xhigh` for GPT-5.2/Codex with safe downgrades. (#793) — thanks @hsrvc; (#444) — thanks @grp06.
- Gateway/CLI: add Tailscale binary discovery, custom bind mode, and probe auth retry; add `moltbot dashboard` auto-open flow; default native slash commands to `"auto"` with per-provider overrides. (#740) — thanks @jeffersonwarrior.
- Auth/Onboarding: add Chutes OAuth (PKCE + refresh + onboarding choice); normalize API key inputs; default TUI onboarding to `deliver: false`. (#726) — thanks @FrieSei; (#791) — thanks @roshanasingh4.
- Providers: add `discord.allowBots`; trim legacy MiniMax M2 from default catalogs; route MiniMax vision to the Coding Plan VLM endpoint (also accepts `@/path/to/file.png` inputs). (#802) — thanks @zknicker.
- Gateway: allow Tailscale Serve identity headers to satisfy token auth; rebuild Control UI assets when protocol schema is newer. (#823) — thanks @roshanasingh4; (#786) — thanks @meaningfool.
- Heartbeat: default `ackMaxChars` to 300 so short `HEARTBEAT_OK` replies stay internal.

### Installer
- Install: run `moltbot doctor --non-interactive` after git installs/updates and nudge daemon restarts when detected.

### Fixes
- Doctor: warn on pnpm workspace mismatches, missing Control UI assets, and missing tsx binaries; offer UI rebuilds.
- Tools: apply global tool allow/deny even when agent-specific tool policy is set.
- Models/Providers: treat credential validation failures as auth errors to trigger fallback; normalize `${ENV_VAR}` apiKey values and auto-fill missing provider keys; preserve explicit GitHub Copilot provider config + agent-dir auth profiles. (#822) — thanks @sebslight; (#705) — thanks @TAGOOZ.
- Auth: drop invalid auth profiles from ordering so environment keys can still be used for providers like MiniMax.
- Gemini: normalize Gemini 3 ids to preview variants; strip Gemini CLI tool call/response ids; downgrade missing `thought_signature`; strip Claude `msg_*` thought_signature fields to avoid base64 decode errors. (#795) — thanks @thewilloftheshadow; (#783) — thanks @ananth-vardhan-cn; (#793) — thanks @hsrvc; (#805) — thanks @marcmarg.
- Agents: auto-recover from compaction context overflow by resetting the session and retrying; propagate overflow details from embedded runs so callers can recover.
- MiniMax: strip malformed tool invocation XML; include `MiniMax-VL-01` in implicit provider for image pairing. (#809) — thanks @latitudeki5223.
- Onboarding/Auth: honor `CLAWDBOT_AGENT_DIR` / `PI_CODING_AGENT_DIR` when writing auth profiles (MiniMax). (#829) — thanks @roshanasingh4.
- Anthropic: handle `overloaded_error` with a friendly message and failover classification. (#832) — thanks @danielz1z.
- Anthropic: merge consecutive user turns (preserve newest metadata) before validation to avoid incorrect role errors. (#804) — thanks @ThomsenDrake.
- Messaging: enforce context isolation for message tool sends; keep typing indicators alive during tool execution. (#793) — thanks @hsrvc; (#450, #447) — thanks @thewilloftheshadow.
- Auto-reply: `/status` allowlist behavior, reasoning-tag enforcement on fallback, and system-event enqueueing for elevated/reasoning toggles. (#810) — thanks @mcinteerj.
- System events: include local timestamps when events are injected into prompts. (#245) — thanks @thewilloftheshadow.
- Auto-reply: resolve ambiguous `/model` matches; fix streaming block reply media handling; keep >300 char heartbeat replies instead of dropping.
- Discord/Slack: centralize reply-thread planning; fix autoThread routing + add per-channel autoThread; avoid duplicate listeners; keep reasoning italics intact; allow clearing channel parents via message tool. (#800, #807) — thanks @davidguttman; (#744) — thanks @thewilloftheshadow.
- Telegram: preserve forum topic thread ids, persist polling offsets, respect account bindings in webhook mode, and show typing indicator in General topics. (#727, #739) — thanks @thewilloftheshadow; (#821) — thanks @gumadeiras; (#779) — thanks @azade-c.
- Slack: accept slash commands with or without leading `/` for custom command configs. (#798) — thanks @thewilloftheshadow.
- Cron: persist disabled jobs correctly; accept `jobId` aliases for update/run/remove params. (#205, #252) — thanks @thewilloftheshadow.
- Gateway/CLI: honor `CLAWDBOT_LAUNCHD_LABEL` / `CLAWDBOT_SYSTEMD_UNIT` overrides; `agents.list` respects explicit config; reduce noisy loopback WS logs during tests; run `moltbot doctor --non-interactive` during updates. (#781) — thanks @ronyrus.
- Onboarding/Control UI: refuse invalid configs (run doctor first); quote Windows browser URLs for OAuth; keep chat scroll position unless the user is near the bottom. (#764) — thanks @mukhtharcm; (#794) — thanks @roshanasingh4; (#217) — thanks @thewilloftheshadow.
- Tools/UI: harden tool input schemas for strict providers; drop null-only union variants for Gemini schema cleanup; treat `maxChars: 0` as unlimited; keep TUI last streamed response instead of "(no output)". (#782) — thanks @AbhisekBasu1; (#796) — thanks @gabriel-trigo; (#747) — thanks @thewilloftheshadow.
- Connections UI: polish multi-account account cards. (#816) — thanks @steipete.

### Maintenance
- Dependencies: bump Pi packages to 0.45.3 and refresh patched pi-ai.
- Testing: update Vitest + browser-playwright to 4.0.17.
- Docs: add Amazon Bedrock provider notes and link from models/FAQ.

## 2026.1.11

### Highlights
- Plugins are now first-class: loader + CLI management, plus the new Voice Call plugin.
- Config: modular `$include` support for split config files. (#731) — thanks @pasogott.
- Agents/Pi: reserve compaction headroom so pre-compaction memory writes can run before auto-compaction.
- Agents: automatic pre-compaction memory flush turn to store durable memories before compaction.

### Changes
- CLI/Onboarding: simplify MiniMax auth choice to a single M2.1 option.
- CLI: configure section selection now loops until Continue.
- Docs: explain MiniMax vs MiniMax Lightning (speed vs cost) and restore LM Studio example.
- Docs: add Cerebras GLM 4.6/4.7 config example (OpenAI-compatible endpoint).
- Onboarding/CLI: group model/auth choice by provider and label Z.AI as GLM 4.7.
- Onboarding/Docs: add Moonshot AI (Kimi K2) auth choice + config example.
- CLI/Onboarding: prompt to reuse detected API keys for Moonshot/MiniMax/Z.AI/Gemini/Anthropic/OpenCode.
- Auto-reply: add compact `/model` picker (models + available providers) and show provider endpoints in `/model status`.
- Control UI: add Config tab model presets (MiniMax M2.1, GLM 4.7, Kimi) for one-click setup.
- Plugins: add extension loader (tools/RPC/CLI/services), discovery paths, and config schema + Control UI labels (uiHints).
- Plugins: add `moltbot plugins install` (path/tgz/npm), plus `list|info|enable|disable|doctor` UX.
- Plugins: voice-call plugin now real (Twilio/log), adds start/status RPC/CLI/tool + tests.
- Docs: add plugins doc + cross-links from tools/skills/gateway config.
- Docs: add beginner-friendly plugin quick start + expand Voice Call plugin docs.
- Tests: add Docker plugin loader + tgz-install smoke test.
- Tests: extend Docker plugin E2E to cover installing from local folders (`plugins.load.paths`) and `file:` npm specs.
- Tests: add coverage for pre-compaction memory flush settings.
- Tests: modernize live model smoke selection for current releases and enforce tools/images/thinking-high coverage. (#769) — thanks @steipete.
- Agents/Tools: add `apply_patch` tool for multi-file edits (experimental; gated by tools.exec.applyPatch; OpenAI-only).
- Agents/Tools: rename the bash tool to exec (config alias maintained). (#748) — thanks @myfunc.
- Agents: add pre-compaction memory flush config (`agents.defaults.compaction.*`) with a soft threshold + system prompt.
- Config: add `$include` directive for modular config files. (#731) — thanks @pasogott.
- Build: set pnpm minimum release age to 2880 minutes (2 days). (#718) — thanks @dan-dr.
- macOS: prompt to install the global `moltbot` CLI when missing in local mode; install via `molt.bot/install-cli.sh` (no onboarding) and use external launchd/CLI instead of the embedded gateway runtime.
- Docs: add gog calendar event color IDs from `gog calendar colors`. (#715) — thanks @mjrussell.
- Cron/CLI: add `--model` flag to cron add/edit commands. (#711) — thanks @mjrussell.
- Cron/CLI: trim model overrides on cron edits and document main-session guidance. (#711) — thanks @mjrussell.
- Skills: bundle `skill-creator` to guide creating and packaging skills.
- Providers: add per-DM history limit overrides (`dmHistoryLimit`) with provider-level config. (#728) — thanks @pkrmf.
- Discord: expose channel/category management actions in the message tool. (#730) — thanks @NicholasSpisak.
- Docs: rename README “macOS app” section to “Apps”. (#733) — thanks @AbhisekBasu1.
- Gateway: require `client.id` in WebSocket connect params; use `client.instanceId` for presence de-dupe; update docs/tests.
- macOS: remove the attach-only gateway setting; local mode now always manages launchd while still attaching to an existing gateway if present.

### Installer
- Postinstall: replace `git apply` with builtin JS patcher (works npm/pnpm/bun; no git dependency) plus regression tests.
- Postinstall: skip pnpm patch fallback when the new patcher is active.
- Installer tests: add root+non-root docker smokes, CI workflow to fetch molt.bot scripts and run install sh/cli with onboarding skipped.
- Installer UX: support `CLAWDBOT_NO_ONBOARD=1` for non-interactive installs; fix npm prefix on Linux and auto-install git.
- Installer UX: add `install.sh --help` with flags/env and git install hint.
- Installer UX: add `--install-method git|npm` and auto-detect source checkouts (prompt to update git checkout vs migrate to npm).

### Fixes
- Models/Onboarding: configure MiniMax (minimax.io) via Anthropic-compatible `/anthropic` endpoint by default (keep `minimax-api` as a legacy alias).
- Models: normalize Gemini 3 Pro/Flash IDs to preview names for live model lookups. (#769) — thanks @steipete.
- CLI: fix guardCancel typing for configure prompts. (#769) — thanks @steipete.
- Gateway/WebChat: include handshake validation details in the WebSocket close reason for easier debugging; preserve close codes.
- Gateway/Auth: send invalid connect responses before closing the handshake; stabilize invalid-connect auth test.
- Gateway: tighten gateway listener detection.
- Control UI: hide onboarding chat when configured and guard the mobile chat sidebar overlay.
- Auth: read Codex keychain credentials and make the lookup platform-aware.
- macOS/Release: avoid bundling dist artifacts in relay builds and generate appcasts from zip-only sources.
- Doctor: surface plugin diagnostics in the report.
- Plugins: treat `plugins.load.paths` directory entries as package roots when they contain `package.json` + `moltbot.extensions`; load plugin packages from config dirs; extract archives without system tar.
- Config: expand `~` in `CLAWDBOT_CONFIG_PATH` and common path-like config fields (including `plugins.load.paths`); guard invalid `$include` paths. (#731) — thanks @pasogott.
- Agents: stop pre-creating session transcripts so first user messages persist in JSONL history.
- Agents: skip pre-compaction memory flush when the session workspace is read-only.
- Auto-reply: ignore inline `/status` directives unless the message is directive-only.
- Auto-reply: align `/think` default display with model reasoning defaults. (#751) — thanks @gabriel-trigo.
- Auto-reply: flush block reply buffers on tool boundaries. (#750) — thanks @sebslight.
- Auto-reply: allow sender fallback for command authorization when `SenderId` is empty (WhatsApp self-chat). (#755) — thanks @juanpablodlc.
- Auto-reply: treat whitespace-only sender ids as missing for command authorization (WhatsApp self-chat). (#766) — thanks @steipete.
- Heartbeat: refresh prompt text for updated defaults.
- Agents/Tools: use PowerShell on Windows to capture system utility output. (#748) — thanks @myfunc.
- Docker: tolerate unset optional env vars in docker-setup.sh under strict mode. (#725) — thanks @petradonka.
- CLI/Update: preserve base environment when passing overrides to update subprocesses. (#713) — thanks @danielz1z.
- Agents: treat message tool errors as failures so fallback replies still send; require `to` + `message` for `action=send`. (#717) — thanks @theglove44.
- Agents: preserve reasoning items on tool-only turns.
- Agents/Subagents: wait for completion before announcing, align wait timeout with run timeout, and make announce prompts more emphatic.
- Agents: route subagent transcripts to the target agent sessions directory and add regression coverage. (#708) — thanks @xMikeMickelson.
- Agents/Tools: preserve action enums when flattening tool schemas. (#708) — thanks @xMikeMickelson.
- Gateway/Agents: canonicalize main session aliases for store writes and add regression coverage. (#709) — thanks @xMikeMickelson.
- Agents: reset sessions and retry when auto-compaction overflows instead of crashing the gateway.
- Providers/Telegram: normalize command mentions for consistent parsing. (#729) — thanks @obviyus.
- Providers: skip DM history limit handling for non-DM sessions. (#728) — thanks @pkrmf.
- Sandbox: fix non-main mode incorrectly sandboxing the main DM session and align `/status` runtime reporting with effective sandbox state.
- Sandbox/Gateway: treat `agent:<id>:main` as a main-session alias when `session.mainKey` is customized (backwards compatible).
- Auto-reply: fast-path allowlisted slash commands (inline `/help`/`/commands`/`/status`/`/whoami` stripped before model).

## 2026.1.10

### Highlights
- CLI: `moltbot status` now table-based + shows OS/update/gateway/daemon/agents/sessions; `status --all` adds a full read-only debug report (tables, log tails, Tailscale summary, and scan progress via OSC-9 + spinner).
- CLI Backends: add Codex CLI fallback with resume support (text output) and JSONL parsing for new runs, plus a live CLI resume probe.
- CLI: add `moltbot update` (safe-ish git checkout update) + `--update` shorthand. (#673) — thanks @fm1randa.
- Gateway: add OpenAI-compatible `/v1/chat/completions` HTTP endpoint (auth, SSE streaming, per-agent routing). (#680).

### Changes
- Onboarding/Models: add first-class Z.AI (GLM) auth choice (`zai-api-key`) + `--zai-api-key` flag.
- CLI/Onboarding: add OpenRouter API key auth option in configure/onboard. (#703) — thanks @mteam88.
- Agents: add human-delay pacing between block replies (modes: off/natural/custom, per-agent configurable). (#446) — thanks @tony-freedomology.
- Agents/Browser: add `browser.target` (sandbox/host/custom) with sandbox host-control gating via `agents.defaults.sandbox.browser.allowHostControl`, allowlists for custom control URLs/hosts/ports, and expand browser tool docs (remote control, profiles, internals).
- Onboarding/Models: add catalog-backed default model picker to onboarding + configure. (#611) — thanks @jonasjancarik.
- Agents/OpenCode Zen: update fallback models + defaults, keep legacy alias mappings. (#669) — thanks @magimetal.
- CLI: add `moltbot reset` and `moltbot uninstall` flows (interactive + non-interactive) plus docker cleanup smoke test.
- Providers: move provider wiring to a plugin architecture. (#661).
- Providers: unify group history context wrappers across providers with per-provider/per-account `historyLimit` overrides (fallback to `messages.groupChat.historyLimit`). Set `0` to disable. (#672).
- Gateway/Heartbeat: optionally deliver heartbeat `Reasoning:` output (`agents.defaults.heartbeat.includeReasoning`). (#690)
- Docker: allow optional home volume + extra bind mounts in `docker-setup.sh`. (#679) — thanks @gabriel-trigo.

### Fixes
- Auto-reply: suppress draft/typing streaming for `NO_REPLY` (silent system ops) so it doesn’t leak partial output.
- CLI/Status: expand tables to full terminal width; clarify provider setup vs runtime warnings; richer per-provider detail; token previews in `status` while keeping `status --all` redacted; add troubleshooting link footer; keep log tails pasteable; show gateway auth used when reachable; surface provider runtime errors (Signal/iMessage/Slack); harden `tailscale status --json` parsing; make `status --all` scan progress determinate; and replace the footer with a 3-line “Next steps” recommendation (share/debug/probe).
- CLI/Gateway: clarify that `moltbot gateway status` reports RPC health (connect + RPC) and shows RPC failures separately from connect failures.
- CLI/Update: gate progress spinner on stdout TTY and align clean-check step label. (#701) — thanks @bjesuiter.
- Telegram: add `/whoami` + `/id` commands to reveal sender id for allowlists; allow `@username` and prefixed ids in `allowFrom` prompts (with stability warning).
- Heartbeat: strip markup-wrapped `HEARTBEAT_OK` so acks don’t leak to external providers (e.g., Telegram).
- Control UI: stop auto-writing `telegram.groups["*"]` and warn/confirm before enabling wildcard groups.
- WhatsApp: send ack reactions only for handled messages and ignore legacy `messages.ackReaction` (doctor copies to `whatsapp.ackReaction`). (#629) — thanks @pasogott.
- Sandbox/Skills: mirror skills into sandbox workspaces for read-only mounts so SKILL.md stays accessible.
- Terminal/Table: ANSI-safe wrapping to prevent table clipping/color loss; add regression coverage.
- Docker: allow optional apt packages during image build and document the build arg. (#697) — thanks @gabriel-trigo.
- Gateway/Heartbeat: deliver reasoning even when the main heartbeat reply is `HEARTBEAT_OK`. (#694) — thanks @antons.
- Agents/Pi: inject config `temperature`/`maxTokens` into streaming without replacing the session streamFn; cover with live maxTokens probe. (#732) — thanks @peschee.
- macOS: clear unsigned launchd overrides on signed restarts and warn via doctor when attach-only/disable markers are set. (#695) — thanks @jeffersonwarrior.
- Agents: enforce single-writer session locks and drop orphan tool results to prevent tool-call ID failures (MiniMax/Anthropic-compatible APIs).
- Docs: make `moltbot status` the first diagnostic step, clarify `status --deep` behavior, and document `/whoami` + `/id`.
- Docs/Testing: clarify live tool+image probes and how to list your testable `provider/model` ids.
- Tests/Live: make gateway bash+read probes resilient to provider formatting while still validating real tool calls.
- WhatsApp: detect @lid mentions in groups using authDir reverse mapping + resolve self JID E.164 for mention gating. (#692) — thanks @peschee.
- Gateway/Auth: default to token auth on loopback during onboarding, add doctor token generation flow, and tighten audio transcription config to Whisper-only.
- Providers: dedupe inbound messages across providers to avoid duplicate LLM runs on redeliveries/reconnects. (#689) — thanks @adam91holt.
- Agents: strip `<thought>`/`<antthinking>` tags from hidden reasoning output and cover tag variants in tests. (#688) — thanks @theglove44.
- macOS: save model picker selections as normalized provider/model IDs and keep manual entries aligned. (#683) — thanks @benithors.
- Agents: recognize "usage limit" errors as rate limits for failover. (#687) — thanks @evalexpr.
- CLI: avoid success message when daemon restart is skipped. (#685) — thanks @carlulsoe.
- Commands: disable `/config` + `/debug` by default; gate via `commands.config`/`commands.debug` and hide from native registration/help output.
- Agents/System: clarify that sub-agents remain sandboxed and cannot use elevated host access.
- Gateway: disable the OpenAI-compatible `/v1/chat/completions` endpoint by default; enable via `gateway.http.endpoints.chatCompletions.enabled=true`.
- macOS: stabilize bridge tunnels, guard invoke senders on disconnect, and drain stdout/stderr to avoid deadlocks. (#676) — thanks @ngutman.
- Agents/System: clarify sandboxed runtime in system prompt and surface elevated availability when sandboxed.
- Auto-reply: prefer `RawBody` for command/directive parsing (WhatsApp + Discord) and prevent fallback runs from clobbering concurrent session updates. (#643) — thanks @mcinteerj.
- WhatsApp: fix group reactions by preserving message IDs and sender JIDs in history; normalize participant phone numbers to JIDs in outbound reactions. (#640) — thanks @mcinteerj.
- WhatsApp: expose group participant IDs to the model so reactions can target the right sender.
- Cron: `wakeMode: "now"` waits for heartbeat completion (and retries when the main lane is busy). (#666) — thanks @roshanasingh4.
- Agents/OpenAI: fix Responses tool-only → follow-up turn handling (avoid standalone `reasoning` items that trigger 400 “required following item”) and replay reasoning items in Responses/Codex Responses history for tool-call-only turns.
- Sandbox: add `moltbot sandbox explain` (effective policy inspector + fix-it keys); improve “sandbox jail” tool-policy/elevated errors with actionable config key paths; link to docs.
- Hooks/Gmail: keep Tailscale serve path at `/` while preserving the public path. (#668) — thanks @antons.
- Hooks/Gmail: allow Tailscale target URLs to preserve internal serve paths.
- Auth: update Claude Code keychain credentials in-place during refresh sync; share JSON file helpers; add CLI fallback coverage.
- Auth: throttle external CLI credential syncs (Claude/Codex), reduce Keychain reads, and skip sync when cached credentials are still fresh.
- CLI: respect `CLAWDBOT_STATE_DIR` for node pairing + voice wake settings storage. (#664) — thanks @azade-c.
- Onboarding/Gateway: persist non-interactive gateway token auth in config; add WS wizard + gateway tool-calling regression coverage.
- Gateway/Control UI: make `chat.send` non-blocking, wire Stop to `chat.abort`, and treat `/stop` as an out-of-band abort. (#653)
- Gateway/Control UI: allow `chat.abort` without `runId` (abort active runs), suppress post-abort chat streaming, and prune stuck chat runs. (#653)
- Gateway/Control UI: sniff image attachments for chat.send, drop non-images, and log mismatches. (#670) — thanks @cristip73.
- macOS: force `restart-mac.sh --sign` to require identities and keep bundled Node signed for relay verification. (#580) — thanks @jeffersonwarrior.
- Gateway/Agent: accept image attachments on `agent` (multimodal message) and add live gateway image probe (`CLAWDBOT_LIVE_GATEWAY_IMAGE_PROBE=1`).
- CLI: `moltbot sessions` now includes `elev:*` + `usage:*` flags in the table output.
- CLI/Pairing: accept positional provider for `pairing list|approve` (npm-run compatible); update docs/bot hints.
- Branding: normalize legacy casing/branding to “Moltbot” (CLI, status, docs).
- Auto-reply: fix native `/model` not updating the actual chat session (Telegram/Slack/Discord). (#646)
- Doctor: offer to run `moltbot update` first on git installs (keeps doctor output aligned with latest).
- Doctor: avoid false legacy workspace warning when install dir is `~/moltbot`. (#660)
- iMessage: fix reasoning persistence across DMs; avoid partial/duplicate replies when reasoning is enabled. (#655) — thanks @antons.
- Models/Auth: allow MiniMax API configs without `models.providers.minimax.apiKey` (auth profiles / `MINIMAX_API_KEY`). (#656) — thanks @mneves75.
- Agents: avoid duplicate replies when the message tool sends. (#659) — thanks @mickahouan.
- Agents: harden Cloud Code Assist tool ID sanitization (toolUse/toolCall/toolResult) and scrub extra JSON Schema constraints. (#665) — thanks @sebslight.
- Agents: sanitize tool results + Cloud Code Assist tool IDs at context-build time (prevents mid-run strict-provider request rejects).
- Agents/Tools: resolve workspace-relative Read/Write/Edit paths; align bash default cwd. (#642) — thanks @mukhtharcm.
- Discord: include forwarded message snapshots in agent session context. (#667) — thanks @rubyrunsstuff.
- Telegram: add `telegram.draftChunk` to tune draft streaming chunking for `streamMode: "block"`. (#667) — thanks @rubyrunsstuff.
- Tests/Agents: add regression coverage for workspace tool path resolution and bash cwd defaults.
- iOS/Android: enable stricter concurrency/lint checks; fix Swift 6 strict concurrency issues + Android lint errors (ExifInterface, obsolete SDK check). (#662) — thanks @KristijanJovanovski.
- Auth: read Codex CLI keychain tokens on macOS before falling back to `~/.codex/auth.json`, preventing stale refresh tokens from breaking gateway live tests.
- Security/Exec approvals: reject shell command substitution (`$()` and backticks) inside double quotes to prevent exec allowlist bypass when exec allowlist mode is explicitly enabled (the default configuration does not use this mode). Thanks @simecek.
- iOS/macOS: share `AsyncTimeout`, require explicit `bridgeStableID` on connect, and harden tool display defaults (avoids missing-resource label fallbacks).
- Telegram: serialize media-group processing to avoid missed albums under load.
- Signal: handle `dataMessage.reaction` events (signal-cli SSE) to avoid broken attachment errors. (#637) — thanks @neist.
- Docs: showcase entries for ParentPay, R2 Upload, iOS TestFlight, and Oura Health. (#650) — thanks @henrino3.
- Agents: repair session transcripts by dropping duplicate tool results across the whole history (unblocks Anthropic-compatible APIs after retries).
- Tests/Live: reset the gateway session between model runs to avoid cross-provider transcript incompatibilities (notably OpenAI Responses reasoning replay rules).


## 2026.1.9

### Highlights
- Microsoft Teams provider: polling, attachments, outbound CLI send, per-channel policy.
- Models/Auth expansion: OpenCode Zen + MiniMax API onboarding; token auth profiles + auth order; OAuth health in doctor/status.
- CLI/Gateway UX: message subcommands, gateway discover/status/SSH, /config + /debug, sandbox CLI.
- Provider reliability sweep: WhatsApp contact cards/targets, Telegram audio-as-voice + streaming, Signal reactions, Slack threading, Discord stability.
- Auto-reply + status: block-streaming controls, reasoning handling, usage/cost reporting.
- Control UI/TUI: queued messages, session links, reasoning view, mobile polish, logs UX.

### Breaking
- CLI: `moltbot message` now subcommands (`message send|poll|...`) and requires `--provider` unless only one provider configured.
- Commands/Tools: `/restart` and gateway restart tool disabled by default; enable with `commands.restart=true`.

### New Features and Changes
- Models/Auth: OpenCode Zen onboarding (#623) — thanks @magimetal; MiniMax Anthropic-compatible API + hosted onboarding (#590, #495) — thanks @mneves75, @tobiasbischoff.
- Models/Auth: setup-token + token auth profiles; `moltbot models auth order {get,set,clear}`; per-agent auth candidates in `/model status`; OAuth expiry checks in doctor/status.
- Agent/System: claude-cli runner; `session_status` tool (and sandbox allow); adaptive context pruning default; system prompt messaging guidance + no auto self-update; eligible skills list injection; sub-agent context trimmed.
- Commands: `/commands` list; `/models` alias; `/usage` alias; `/debug` runtime overrides + effective config view; `/config` chat updates + `/config get`; `config --section`.
- CLI/Gateway: unified message tool + message subcommands; gateway discover (local + wide-area DNS-SD) with JSON/timeout; gateway status human-readable + JSON + SSH loopback; wide-area records include gatewayPort/sshPort/cliPath + tailnet DNS fallback.
- CLI UX: logs output modes (pretty/plain/JSONL) + colorized health/daemon output; global `--no-color`; lobster palette in onboarding/config.
- Dev ergonomics: gateway `--dev/--reset` + dev profile auto-config; C-3PO dev templates; dev gateway/TUI helper scripts.
- Sandbox/Workspace: sandbox list/recreate commands; sync skills into sandbox workspace; sandbox browser auto-start.
- Config/Onboarding: inline env vars; OpenAI API key flow to shared `~/.clawdbot/.env`; Opus 4.5 default prompt for Anthropic auth; QuickStart auto-install gateway (Node-only) + provider picker tweaks + skip-systemd flags; TUI bootstrap prompt (`tui --message`); remove Bun runtime choice.
- Providers: Microsoft Teams provider (polling, attachments, outbound sends, requireMention, config reload/DM policy). (#404) — thanks @onutc
- Providers: WhatsApp broadcast groups for multi-agent replies (#547) — thanks @pasogott; inbound media size cap configurable (#505) — thanks @koala73; identity-based message prefixes (#578) — thanks @p6l-richard.
- Providers: Telegram inline keyboard buttons + callback payload routing (#491) — thanks @azade-c; cron topic delivery targets (#474/#478) — thanks @mitschabaude-bot, @nachoiacovino; `[[audio_as_voice]]` tag support (#490) — thanks @jarvis-medmatic.
- Providers: Signal reactions + notifications with allowlist support.
- Status/Usage: /status cost reporting + `/cost` lines; auth profile snippet; provider usage windows.
- Control UI: mobile responsiveness (#558) — thanks @carlulsoe; queued messages + Enter-to-send (#527) — thanks @YuriNachos; session links (#471) — thanks @HazAT; reasoning view; skill install feedback (#445) — thanks @pkrmf; chat layout refresh (#475) — thanks @rahthakor; docs link + new session button; drop explicit `ui:install`.
- TUI: agent picker + agents list RPC; improved status line.
- Doctor/Daemon: audit/repair flows, permissions checks, supervisor config audits; provider status probes + warnings for Discord intents and Telegram privacy; last activity timestamps; gateway restart guidance.
- Docs: Hetzner Docker VPS guide + cross-links (#556/#592) — thanks @Iamadig; Ansible guide (#545) — thanks @pasogott; provider troubleshooting index; hook parameter expansion (#532) — thanks @mcinteerj; model allowlist notes; OAuth deep dive; showcase refresh.
- Apps/Branding: refreshed iOS/Android/macOS icons (#521) — thanks @fishfisher.

### Fixes
- Packaging: include MS Teams send module in npm tarball.
- Sandbox/Browser: auto-start CDP endpoint; proxy CDP out of container for attachOnly; relax Bun fetch typing; align sandbox list output with config images.
- Agents/Runtime: gate heartbeat prompt to default sessions; /stop aborts between tool calls; require explicit system-event session keys; guard small context windows; fix model fallback stringification; sessions_spawn inherits provider; failover on billing/credits; respect auth cooldown ordering; restore Anthropic OAuth tool dispatch + tool-name bypass; avoid OpenAI invalid reasoning replay; harden Gmail hook model defaults.
- Agent history/schema: strip/skip empty assistant/error blocks to prevent session corruption/Claude 400s; scrub unsupported JSON Schema keywords + sanitize tool call IDs for Cloud Code Assist; simplify Gemini-compatible tool/session schemas; require raw for config.apply.
- Auto-reply/Streaming: default audioAsVoice false; preserve audio_as_voice propagation + buffer audio blocks + guard voice notes; block reply ordering (timeout) + forced-block fence-safe; avoid chunk splits inside parentheses + fence-close breaks + invalid UTF-16 truncation; preserve inline directive spacing + allow whitespace in reply tags; filter NO_REPLY prefixes + normalize routed replies; suppress <think> leakage with separate Reasoning; block streaming defaults (off by default, minChars/idle tuning) + coalesced blocks; dedupe followup queue; restore explicit responsePrefix default.
- Status/Commands: provider prefix in /status model display; usage filtering + provider mapping; auth label + usage snapshots (claude-cli fallback + optional claude.ai); show Verbose/Elevated only when enabled; compact usage/cost line + restore emoji-rich status; /status in directive-only + multi-directive handling; mention-bypass elevated handling; surface provider usage errors; wire /usage to /status; restore hidden gateway-daemon alias; fallback /model list when catalog unavailable.
- WhatsApp: vCard/contact cards (prefer FN, include numbers, show all contacts, keep summary counts, better empty summaries); preserve group JIDs + normalize targets; resolve @lid mappings/JIDs (Baileys/auth-dir) + inbound mapping; route queued replies to sender; improve web listener errors + remove provider name from errors; record outbound activity account id; fix web media fetch errors; broadcast group history consistency.
- Telegram: keep streamMode draft-only; long-poll conflict retries + update dedupe; grammY fetch mismatch fixes + restrict native fetch to Bun; suppress getUpdates stack traces; include user id in pairing; audio_as_voice handling fixes.
- Discord/Slack: thread context helpers + forum thread starters; avoid category parent overrides; gateway reconnect logs + HELLO timeout + stop provider after reconnect exhaustion; DM recipient parsing for numeric IDs; remove incorrect limited warning; reply threading + mrkdwn edge cases; remove ack reactions after reply; gateway debug event visibility.
- Signal: reaction handling safety; own-reaction matching (uuid+phone); UUID-only senders accepted; ignore reaction-only messages.
- MS Teams: download image attachments reliably; fix top-level replies; stop on shutdown + honor chunk limits; normalize poll providers/deps; pairing label fixes.
- iMessage: isolate group-ish threads by chat_id.
- Gateway/Daemon/Doctor: atomic config writes; repair gateway service entrypoint + install switches; non-interactive legacy migrations; systemd unit alignment + KillMode=process; node bridge keepalive/pings; Launch at Login persistence; bundle MoltbotKit resources + Swift 6.2 compat dylib; relay version check + remove smoke test; regen Swift GatewayModels + keep agent provider string; cron jobId alias + channel alias migration + main session key normalization; heartbeat Telegram accountId resolution; avoid WhatsApp fallback for internal runs; gateway listener error wording; serveBaseUrl param; honor gateway --dev; fix wide-area discovery updates; align agents.defaults schema; provider account metadata in daemon status; refresh Carbon patch for gateway fixes; restore doctor prompter initialValue handling.
- Control UI/TUI: persist per-session verbose off + hide tool cards; logs tab opens at bottom; relative asset paths + landing cleanup; session labels lookup/persistence; stop pinning main session in recents; start logs at bottom; TUI status bar refresh + timeout handling + hide reasoning label when off.
- Onboarding/Configure: QuickStart single-select provider picker; avoid Codex CLI false-expiry warnings; clarify WhatsApp owner prompt; fix Minimax hosted onboarding (agents.defaults + msteams heartbeat target); remove configure Control UI prompt; honor gateway --dev flag.

### Maintenance
- Dependencies: bump pi-* stack to 0.42.2.
- Dependencies: Pi 0.40.0 bump (#543) — thanks @mcinteerj.
- Build: Docker build cache layer (#605) — thanks @zknicker.

- Auth: enable OAuth token refresh for Claude Code CLI credentials (`anthropic:claude-cli`) with bidirectional sync back to Claude Code storage (file on Linux/Windows, Keychain on macOS). This allows long-running agents to operate autonomously without manual re-authentication (#654 — thanks @radek-paclt).

## 2026.1.8

### Highlights
- Security: DMs locked down by default across providers; pairing-first + allowlist guidance.
- Sandbox: per-agent scope defaults + workspace access controls; tool/session isolation tuned.
- Agent loop: compaction, pruning, streaming, and error handling hardened.
- Providers: Telegram/WhatsApp/Discord/Slack reliability, threading, reactions, media, and retries improved.
- Control UI: logs tab, streaming stability, focus mode, and large-output rendering fixes.
- CLI/Gateway/Doctor: daemon/logs/status, auth migration, and diagnostics significantly expanded.

### Breaking
- **SECURITY (update ASAP):** inbound DMs are now **locked down by default** on Telegram/WhatsApp/Signal/iMessage/Discord/Slack.
  - Previously, if you didn’t configure an allowlist, your bot could be **open to anyone** (especially discoverable Telegram bots).
  - New default: DM pairing (`dmPolicy="pairing"` / `discord.dm.policy="pairing"` / `slack.dm.policy="pairing"`).
  - To keep old “open to everyone” behavior: set `dmPolicy="open"` and include `"*"` in the relevant `allowFrom` (Discord/Slack: `discord.dm.allowFrom` / `slack.dm.allowFrom`).
  - Approve requests via `moltbot pairing list <provider>` + `moltbot pairing approve <provider> <code>`.
- Sandbox: default `agent.sandbox.scope` to `"agent"` (one container/workspace per agent). Use `"session"` for per-session isolation; `"shared"` disables cross-session isolation.
- Timestamps in agent envelopes are now UTC (compact `YYYY-MM-DDTHH:mmZ`); removed `messages.timestampPrefix`. Add `agent.userTimezone` to tell the model the user’s local time (system prompt only).
- Model config schema changes (auth profiles + model lists); doctor auto-migrates and the gateway rewrites legacy configs on startup.
- Commands: gate all slash commands to authorized senders; add `/compact` to manually compact session context.
- Groups: `whatsapp.groups`, `telegram.groups`, and `imessage.groups` now act as allowlists when set. Add `"*"` to keep allow-all behavior.
- Auto-reply: removed `autoReply` from Discord/Slack/Telegram channel configs; use `requireMention` instead (Telegram topics now support `requireMention` overrides).
- CLI: remove `update`, `gateway-daemon`, `gateway {install|uninstall|start|stop|restart|daemon status|wake|send|agent}`, and `telegram` commands; move `login/logout` to `providers login/logout` (top-level aliases hidden); use `daemon` for service control, `send`/`agent`/`wake` for RPC, and `nodes canvas` for canvas ops.

### Fixes
- **CLI/Gateway/Doctor:** daemon runtime selection + improved logs/status/health/errors; auth/password handling for local CLI; richer close/timeout details; auto-migrate legacy config/sessions/state; integrity checks + repair prompts; `--yes`/`--non-interactive`; `--deep` gateway scans; better restart/service hints.
- **Agent loop + compaction:** compaction/pruning tuning, overflow handling, safer bootstrap context, and per-provider threading/confirmations; opt-in tool-result pruning + compact tracking.
- **Sandbox + tools:** per-agent sandbox overrides, workspaceAccess controls, session tool visibility, tool policy overrides, process isolation, and tool schema/timeout/reaction unification.
- **Providers (Telegram/WhatsApp/Discord/Slack/Signal/iMessage):** retry/backoff, threading, reactions, media groups/attachments, mention gating, typing behavior, and error/log stability; long polling + forum topic isolation for Telegram.
- **Gateway/CLI UX:** `moltbot logs`, cron list colors/aliases, docs search, agents list/add/delete flows, status usage snapshots, runtime/auth source display, and `/status`/commands auth unification.
- **Control UI/Web:** logs tab, focus mode polish, config form resilience, streaming stability, tool output caps, windowed chat history, and reconnect/password URL auth.
- **macOS/Android/TUI/Build:** macOS gateway races, QR bundling, JSON5 config safety, Voice Wake hardening; Android EXIF rotation + APK naming/versioning; TUI key handling; tooling/bundling fixes.
- **Packaging/compat:** npm dist folder coverage, Node 25 qrcode-terminal import fixes, Bun/Playwright/WebSocket patches, and Docker Bun install.
- **Docs:** new FAQ/ClawdHub/config examples/showcase entries and clarified auth, sandbox, and systemd docs.

### Maintenance
- Skills additions (Himalaya email, CodexBar, 1Password).
<<<<<<< HEAD
- Dependency refreshes (pi-* stack, Slack SDK, discord-api-types, file-type, zod, Biome, Vite).
- Refactors: centralized group allowlist/mention policy; lint/import cleanup; switch tsx → bun for TS execution.
=======
- Dependency refreshes (pi-\* stack, Slack SDK, discord-api-types, file-type, zod, Biome, Vite).
>>>>>>> 9f5429e52 (docs: trim refactor-only and duplicate changelog entries)

## 2026.1.5

### Highlights
- Models: add image-specific model config (`agent.imageModel` + fallbacks) and scan support.
- Agent tools: new `image` tool routed to the image model (when configured).
- Config: default model shorthands (`opus`, `sonnet`, `gpt`, `gpt-mini`, `gemini`, `gemini-flash`).
- Docs: document built-in model shorthands + precedence (user config wins).
- Bun: optional local install/build workflow without maintaining a Bun lockfile (see `docs/bun.md`).

### Fixes
- Control UI: render Markdown in tool result cards.
- Control UI: prevent overlapping action buttons in Discord guild rules on narrow layouts.
- Android: tapping the foreground service notification brings the app to the front. (#179) — thanks @Syhids
- Cron tool uses `id` for update/remove/run/runs (aligns with gateway params). (#180) — thanks @adamgall
- Control UI: chat view uses page scroll with sticky header/sidebar and fixed composer (no inner scroll frame).
- macOS: treat location permission as always-only to avoid iOS-only enums. (#165) — thanks @Nachx639
- macOS: make generated gateway protocol models `Sendable` for Swift 6 strict concurrency. (#195) — thanks @andranik-sahakyan
- macOS: bundle QR code renderer modules so DMG gateway boot doesn't crash on missing qrcode-terminal vendor files.
- macOS: parse JSON5 config safely to avoid wiping user settings when comments are present.
- WhatsApp: suppress typing indicator during heartbeat background tasks. (#190) — thanks @mcinteerj
- WhatsApp: mark offline history sync messages as read without auto-reply. (#193) — thanks @mcinteerj
- Discord: avoid duplicate replies when a provider emits late streaming `text_end` events (OpenAI/GPT).
- CLI: use tailnet IP for local gateway calls when bind is tailnet/auto (fixes #176).
- Env: load global `$CLAWDBOT_STATE_DIR/.env` (`~/.clawdbot/.env`) as a fallback after CWD `.env`.
- Env: optional login-shell env fallback (opt-in; imports expected keys without overriding existing env).
- Agent tools: OpenAI-compatible tool JSON Schemas (fix `browser`, normalize union schemas).
- Onboarding: when running from source, auto-build missing Control UI assets (`bun run ui:build`).
- Discord/Slack: route reaction + system notifications to the correct session (no main-session bleed).
- Agent tools: honor `agent.tools` allow/deny policy even when sandbox is off.
- Discord: avoid duplicate replies when OpenAI emits repeated `message_end` events.
- Commands: unify /status (inline) and command auth across providers; group bypass for authorized control commands; remove Discord /clawd slash handler.
<<<<<<< HEAD
- CLI: run `moltbot agent` via the Gateway by default; use `--local` to force embedded mode.
=======
- CLI: run `openclaw agent` via the Gateway by default; use `--local` to force embedded mode.
>>>>>>> 4322ca6f4 (chore: oxfmt)
