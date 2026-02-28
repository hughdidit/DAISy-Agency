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
=======
=======
=======
## 2026.2.6-4
=======
## 2026.2.10
=======
## 2026.2.13 (Unreleased)
=======
## Unreleased
=======
## Unreleased
=======
## 2026.2.25 (Unreleased)
=======
## 2026.2.26 (Unreleased)

<<<<<<< HEAD
=======
### Changes

- Agents/Routing CLI: add `openclaw agents bindings`, `openclaw agents bind`, and `openclaw agents unbind` for account-scoped route management, including channel-only to account-scoped binding upgrades, role-aware binding identity handling, plugin-resolved binding account IDs, and optional account-binding prompts in `openclaw channels add`. (#27195) thanks @gumadeiras.
- Android/Nodes: add `notifications.list` support on Android nodes and expose `nodes notifications_list` in agent tooling for listing active device notifications. (#27344) thanks @obviyus.
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
- Onboarding/Plugins: let channel plugins own interactive onboarding flows with optional `configureInteractive` and `configureWhenConfigured` hooks while preserving the generic fallback path. (#27191) thanks @gumadeiras.
- Secrets/External management: add external secrets runtime activation, migration/apply safety hardening, and dedicated docs for strict `secrets apply` target-path rules and ref-only auth-profile behavior. (#26155) Thanks @joshavant.
>>>>>>> 47fc6a080 (fix: stabilize secrets land + docs note (#26155) (thanks @joshavant))
=======
- Android/Nodes: add Android `device` capability plus `device.status` and `device.info` node commands, including runtime handler wiring and protocol/registry coverage for device status/info payloads. (#27664) Thanks @obviyus.
=======
- Android/Nodes: add `camera.list`, `device.permissions`, `device.health`, and `notifications.actions` (`open`/`dismiss`/`reply`) on Android nodes, plus first-class node-tool actions for the new device/notification commands. (#28260) Thanks @obviyus.
- Android/Nodes parity: add `system.notify`, `photos.latest`, `contacts.search`/`contacts.add`, `calendar.events`/`calendar.add`, and `motion.activity`/`motion.pedometer`, with motion sensor-aware command gating and improved activity sampling reliability. (#29398) Thanks @obviyus.
- Android/Gateway capability refresh: add live Android capability integration coverage and node canvas capability refresh wiring, plus runtime hardening for A2UI readiness retries, scoped canvas URL normalization, debug diagnostics JSON, and JavaScript MIME delivery. (#28388) Thanks @obviyus.
<<<<<<< HEAD
>>>>>>> 256021b8d (fix: update changelog for android capability refresh land (#28388) (thanks @obviyus))
=======
- Feishu/Doc permissions: support optional owner permission grant fields on `feishu_doc` create and report permission metadata only when the grant call succeeds, with regression coverage for success/failure/omitted-owner paths. (#28295) Thanks @zhoulongchao77.
- Feishu/Docx tables + uploads: add `feishu_doc` actions for Docx table creation/cell writing (`create_table`, `write_table_cells`, `create_table_with_values`) and image/file uploads (`upload_image`, `upload_file`) with stricter create/upload error handling for missing `document_id` and placeholder cleanup failures. (#20304) Thanks @xuhao1.
- Feishu/Reactions: add inbound `im.message.reaction.created_v1` handling, route verified reactions through synthetic inbound turns, and harden verification with timeout + fail-closed filtering so non-bot or unverified reactions are dropped. (#16716) Thanks @schumilin.
- Memory/LanceDB: support custom OpenAI `baseUrl` and embedding dimensions for LanceDB memory. (#17874) Thanks @rish2jain and @vincentkoc.

### Fixes

- Feishu/Reply media attachments: send Feishu reply `mediaUrl`/`mediaUrls` payloads as attachments alongside text/streamed replies in the reply dispatcher, including legacy fallback when `mediaUrls` is empty. (#28959)
- Feishu/Reaction notifications: add `channels.feishu.reactionNotifications` (`off | own | all`, default `own`) so operators can disable reaction ingress or allow all verified reaction events (not only bot-authored message reactions). (#28529)
- Feishu/Outbound session routing: stop assuming bare `oc_` identifiers are always group chats, honor explicit `dm:`/`group:` prefixes for `oc_` chat IDs, and default ambiguous bare `oc_` targets to direct routing to avoid DM session misclassification. (#10407) Thanks @Bermudarat.
- Feishu/Group session routing: add configurable group session scopes (`group`, `group_sender`, `group_topic`, `group_topic_sender`) with legacy `topicSessionMode=enabled` compatibility so Feishu group conversations can isolate sessions by sender/topic as configured. (#17798)
- Feishu/Reply-in-thread routing: add `replyInThread` config (`disabled|enabled`) for group replies, propagate `reply_in_thread` across text/card/media/streaming sends, and align topic-scoped session routing so newly created reply threads stay on the same session root. (#27325)
- Feishu/Typing backoff: re-throw Feishu typing add/remove rate-limit and quota errors (`429`, `99991400`, `99991403`) and detect SDK non-throwing backoff responses so the typing keepalive circuit breaker can stop retries instead of looping indefinitely. (#28494)
- Feishu/Probe status caching: cache successful `probeFeishu()` bot-info results for 10 minutes (bounded cache with per-account keying) to reduce repeated status/onboarding probe API calls, while bypassing cache for failures and exceptions. (#28907) Thanks @Glucksberg.
- Feishu/Opus media send type: send `.opus` attachments with `msg_type: "audio"` (instead of `"media"`) so Feishu voice messages deliver correctly while `.mp4` remains `msg_type: "media"` and documents remain `msg_type: "file"`. (#28269) Thanks @Glucksberg.
- Feishu/Mobile video media type: treat inbound `message_type: "media"` as video-equivalent for media key extraction, placeholder inference, and media download resolution so mobile-app video sends ingest correctly. (#25502) Thanks @4ier.
- Feishu/Inbound rich-text parsing: preserve `share_chat` payload summaries when available and add explicit parsing for rich-text `code`/`code_block`/`pre` tags so forwarded and code-heavy messages keep useful context in agent input. (#28591) Thanks @kevinWangSheng.
- Feishu/Local media sends: propagate `mediaLocalRoots` through Feishu outbound media sending into `loadWebMedia` so local path attachments work with post-CVE local-root enforcement. (#27884) Thanks @joelnishanth.
- Feishu/Group sender allowlist fallback: add global `channels.feishu.groupSenderAllowFrom` sender authorization for group chats, with per-group `groups.<id>.allowFrom` precedence and regression coverage for allow/block/precedence behavior. (#29174) Thanks @1MoreBuild.
- Feishu/Docx append/write ordering: insert converted Docx blocks sequentially (single-block creates) so Feishu append/write preserves markdown block order instead of returning shuffled sections in asynchronous batch inserts. (#26172, #26022) Thanks @echoVic.
- Feishu/Inbound media regression coverage: add explicit tests for message resource type mapping (`image` stays `image`, non-image maps to `file`) to prevent reintroducing unsupported Feishu `type=audio` fetches. (#16311, #8746) Thanks @Yaxuan42.
- Security/Feishu webhook ingress: bound unauthenticated webhook rate-limit state with stale-window pruning and a hard key cap to prevent unbounded pre-auth memory growth from rotating source keys. (#26050) Thanks @bmendonca3.
- Security/Compaction audit: remove the post-compaction audit injection message. (#28507) Thanks @fuller-stack-dev and @vincentkoc.
- Telegram/Reply media context: include replied media files in inbound context when replying to media, defer reply-media downloads to debounce flush, gate reply-media fetch behind DM authorization, and preserve replied media when non-vision sticker fallback runs (including cached-sticker paths). (#28488) Thanks @obviyus.
- Telegram/Outbound chunking: route oversize splitting through the shared outbound pipeline (including subagents), retry Telegram sends when escaped HTML exceeds limits, and preserve boundary whitespace when retry re-splitting rendered chunks so plain-text/transcript fidelity is retained. (#29342, #27317; follow-up to #27461) Thanks @obviyus.
- Gateway/WS: close repeated post-handshake `unauthorized role:*` request floods per connection and sample duplicate rejection logs, preventing a single misbehaving client from degrading gateway responsiveness. (#20168) Thanks @acy103, @vibecodooor, and @vincentkoc.
- Gateway/macOS supervised restart: actively `launchctl kickstart -k` during intentional supervised restarts to bypass LaunchAgent `ThrottleInterval` delays, and fall back to in-process restart when kickstart fails. Landed from contributor PR #29078 by @cathrynlavery. Thanks @cathrynlavery.
- Gateway/Auth: improve device-auth v2 migration diagnostics so operators get clearer guidance when legacy clients connect. (#28305) Thanks @vincentkoc.
- CLI/Install: add an npm-link fallback to fix CLI startup `Permission denied` failures (`exit 127`) on affected installs. (#17151) Thanks @sskyu and @vincentkoc.
- Onboarding/Custom providers: improve verification reliability for slower local endpoints (for example Ollama) during setup. (#27380) Thanks @Sid-Qin.
- Ollama/Autodiscovery: harden autodiscovery and warning behavior. (#29201) Thanks @marcodelpin and @vincentkoc.
- Ollama/Context window: unify context window handling across discovery, merge, and OpenAI-compatible transport paths. (#29205) Thanks @Sid-Qin, @jimmielightner, and @vincentkoc.
- Agents/Ollama: demote empty-discovery logging from `warn` to `debug` to reduce noisy warnings in normal edge-case discovery flows. (#26379) Thanks @byungsker.
- Install/npm: fix npm global install deprecation warnings. (#28318) Thanks @vincentkoc.
- Browser/Open & navigate: accept `url` as an alias parameter for `open` and `navigate`. (#29260) Thanks @vincentkoc.
- Codex/Usage window: label weekly usage window as `Week` instead of `Day`. (#26267) Thanks @Sid-Qin.
- Slack/Native commands: register Slack native status as `/agentstatus` (Slack-reserved `/status`) so manifest slash command registration stays valid while text `/status` still works. Landed from contributor PR #29032 by @maloqab. Thanks @maloqab.
- Android/Nodes reliability: reject `facing=both` when `deviceId` is set to avoid mislabeled duplicate captures, allow notification `open`/`reply` on non-clearable entries while still gating dismiss, trigger listener rebind before notification actions, and scale invoke-result ack timeout to invoke budget for large clip payloads. (#28260) Thanks @obviyus.
- Android/Camera clip: remove `camera.clip` HTTP-upload fallback to base64 so clip transport is deterministic and fail-loud, and reject non-positive `maxWidth` values so invalid inputs fall back to the safe resize default. (#28229) Thanks @obviyus.
- Android/Gateway canvas capability refresh: send `node.canvas.capability.refresh` with object `params` (`{}`) from Android node runtime so gateway object-schema validation accepts refresh retries and A2UI host recovery works after scoped capability expiry. (#28413) Thanks @obviyus.
- Daemon/macOS TLS certs: default LaunchAgent service env `NODE_EXTRA_CA_CERTS` to `/etc/ssl/cert.pem` (while preserving explicit overrides) so HTTPS clients no longer fail with local-issuer errors under launchd. (#27915) Thanks @Lukavyi.
- Update/Global npm: fallback to `--omit=optional` when global `npm update` fails so optional dependency install failures no longer abort update flows. (#24896) Thanks @xinhuagu and @vincentkoc.
- Plugins/NPM spec install: fix npm-spec plugin installs when `npm pack` output is empty by detecting newly created `.tgz` archives in the pack directory. (#21039) Thanks @graysurf and @vincentkoc.
- Plugins/Install: clear stale install errors when an npm package is not found so follow-up install attempts report current state correctly. (#25073) Thanks @dalefrieswthat.
- OpenAI Responses/Compaction: rewrite and unify the OpenAI Responses store patches to treat empty `baseUrl` as non-direct, honor `compat.supportsStore=false`, and auto-inject server-side compaction `context_management` for compatible direct OpenAI models (with per-model opt-out/threshold overrides). Landed from contributor PRs #16930 (@OiPunk), #22441 (@EdwardWu7), and #25088 (@MoerAI). Thanks @OiPunk, @EdwardWu7, and @MoerAI.

<<<<<<< HEAD
=======
## Unreleased

### Fixes

- Android/Onboarding + voice reliability: request per-toggle onboarding permissions, update pairing guidance to `openclaw devices list/approve`, restore assistant speech playback in mic capture flow, cancel superseded in-flight speech (mute + per-reply token rotation), and keep `talk.config` loads retryable after transient failures. (#29796) Thanks @obviyus.
- FS/Sandbox workspace boundaries: add a dedicated `outside-workspace` safe-open error code for root-escape checks, and propagate specific outside-workspace messages across edit/browser/media consumers instead of generic not-found/invalid-path fallbacks. (#29715) Thanks @YuzuruS.
- Config/Doctor group allowlist diagnostics: align `groupPolicy: "allowlist"` warnings with per-channel runtime semantics by excluding Google Chat sender-list checks and by warning when no-fallback channels (for example iMessage) omit `groupAllowFrom`, with regression coverage. (#28477) Thanks @tonydehnke.
- Onboarding/Custom providers: use Azure OpenAI-specific verification auth/payload shape (`api-key`, deployment-path chat completions payload) when probing Azure endpoints so valid Azure custom-provider setup no longer fails preflight. (#29421) Thanks @kunalk16.

>>>>>>> 89e158fc9 (fix: harden azure custom-provider verification coverage (#29421) (thanks @kunalk16))
## 2026.2.26

### Changes

- Highlight: External Secrets Management introduces a full `openclaw secrets` workflow (`audit`, `configure`, `apply`, `reload`) with runtime snapshot activation, strict `secrets apply` target-path validation, safer migration scrubbing, ref-only auth-profile support, and dedicated docs. (#26155) Thanks @joshavant.
- ACP/Thread-bound agents: make ACP agents first-class runtimes for thread sessions with `acp` spawn/send dispatch integration, acpx backend bridging, lifecycle controls, startup reconciliation, runtime cleanup, and coalesced thread replies. (#23580) thanks @osolmaz.
- Agents/Routing CLI: add `openclaw agents bindings`, `openclaw agents bind`, and `openclaw agents unbind` for account-scoped route management, including channel-only to account-scoped binding upgrades, role-aware binding identity handling, plugin-resolved binding account IDs, and optional account-binding prompts in `openclaw channels add`. (#27195) thanks @gumadeiras.
- Codex/WebSocket transport: make `openai-codex` WebSocket-first by default (`transport: "auto"` with SSE fallback), keep explicit per-model/runtime transport overrides, and add regression coverage + docs for transport selection.
- Onboarding/Plugins: let channel plugins own interactive onboarding flows with optional `configureInteractive` and `configureWhenConfigured` hooks while preserving the generic fallback path. (#27191) thanks @gumadeiras.
- Auth/Onboarding: add an explicit account-risk warning and confirmation gate before starting Gemini CLI OAuth, and document the caution in provider docs and the Gemini CLI auth plugin README. (#16683) Thanks @vincentkoc.
- Android/Nodes: add Android `device` capability plus `device.status` and `device.info` node commands, including runtime handler wiring and protocol/registry coverage for device status/info payloads. (#27664) Thanks @obviyus.
- Android/Nodes: add `notifications.list` support on Android nodes and expose `nodes notifications_list` in agent tooling for listing active device notifications. (#27344) thanks @obviyus.
>>>>>>> 8beb048a8 (test(feishu): add regression for audio download resource type=file (openclaw#16311) thanks @Yaxuan42)
- Docs/Contributing: add Nimrod Gutman to the maintainer roster in `CONTRIBUTING.md`. (#27840) Thanks @ngutman.
>>>>>>> 3f20c4330 (fix: add nimrod gutman maintainer profile (#27840) (thanks @ngutman))

>>>>>>> da6a96ed3 (fix: update changelog for notifications list land (#27344) (thanks @obviyus))
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
=======
=======
=======
- Cron/Hooks isolated routing: preserve canonical `agent:*` session keys in isolated runs so already-qualified keys are not double-prefixed (for example `agent:main:main` no longer becomes `agent:main:agent:main:main`). Landed from contributor PR #27333 by @MaheshBhushan. (#27289, #27282)
- iOS/Talk mode: stop injecting the voice directive hint into iOS Talk prompts and remove the Voice Directive Hint setting, reducing model bias toward tool-style TTS directives and keeping relay responses text-first by default. (#27543) thanks @ngutman.
=======
=======
=======
=======
=======
=======
- Telegram/DM allowlist runtime inheritance: enforce `dmPolicy: "allowlist"` `allowFrom` requirements using effective account-plus-parent config across account-capable channels (Telegram, Discord, Slack, Signal, iMessage, IRC, BlueBubbles, WhatsApp), and align `openclaw doctor` checks to the same inheritance logic so DM traffic is not silently dropped after upgrades. (#27936) Thanks @widingmarcus-cyber.
>>>>>>> 45d868685 (fix: enforce dm allowFrom inheritance across account channels (#27936) (thanks @widingmarcus-cyber))
- Delivery queue/recovery backoff: prevent retry starvation by persisting `lastAttemptAt` on failed sends and deferring recovery retries until each entry's `lastAttemptAt + backoff` window is eligible, while continuing to recover ready entries behind deferred ones. Landed from contributor PR #27710 by @Jimmy-xuzimo. Thanks @Jimmy-xuzimo.
- Google Chat/Lifecycle: keep Google Chat `startAccount` pending until abort in webhook mode so startup is no longer interpreted as immediate exit, preventing auto-restart loops and webhook-target churn. (#27384) thanks @junsuwhy.
- Temp dirs/Linux umask: force `0700` permissions after temp-dir creation and self-heal existing writable temp dirs before trust checks so `umask 0002` installs no longer crash-loop on startup. Landed from contributor PR #27860 by @stakeswky. (#27853) Thanks @stakeswky.
- Microsoft Teams/File uploads: acknowledge `fileConsent/invoke` immediately (`invokeResponse` before upload + file card send) so Teams no longer shows false "Something went wrong" timeout banners while upload completion continues asynchronously; includes updated async regression coverage. Landed from contributor PR #27641 by @scz2011.
- Queue/Drain/Cron reliability: harden lane draining with guaranteed `draining` flag reset on synchronous pump failures, reject new queue enqueues during gateway restart drain windows (instead of silently killing accepted tasks), add `/stop` queued-backlog cutoff metadata with stale-message skipping (while avoiding cross-session native-stop cutoff bleed), and raise isolated cron `agentTurn` outer safety timeout to avoid false 10-minute timeout races against longer agent session timeouts. (#27407, #27332, #27427)
- Typing/Main reply pipeline: always mark dispatch idle in `agent-runner` finalization so typing cleanup runs even when dispatcher `onIdle` does not fire, preventing stuck typing indicators after run completion. (#27250) Thanks @Sid-Qin.
- Typing/TTL safety net: add max-duration guardrails to shared typing callbacks so stuck lifecycle edges auto-stop typing indicators even when explicit idle/cleanup signals are missed. (#27428) Thanks @Crpdim.
- Typing/Cross-channel leakage: unify run-scoped typing suppression for cross-channel/internal-webchat routes, preserve current inbound origin as embedded run message channel context, harden shared typing keepalive with consecutive-failure circuit breaker edge-case handling, and enforce dispatcher completion/idle waits in extension dispatcher callsites (Feishu, Matrix, Mattermost, MSTeams) so typing indicators always clean up on success/error paths. Related: #27647, #27493, #27598. Supersedes/replaces draft PRs: #27640, #27593, #27540.
- Telegram/sendChatAction 401 handling: add bounded exponential backoff + temporary local typing suppression after repeated unauthorized failures to stop unbounded `sendChatAction` retry loops that can trigger Telegram abuse enforcement and bot deletion. (#27415) Thanks @widingmarcus-cyber.
- Telegram/Webhook startup: clarify webhook config guidance, allow `channels.telegram.webhookPort: 0` for ephemeral listener binding, and log both the local listener URL and Telegram-advertised webhook URL with the bound port. (#25732) thanks @huntharo.
- Config/Doctor allowlist safety: reject `dmPolicy: "allowlist"` configs with empty `allowFrom`, add Telegram account-level inheritance-aware validation, and teach `openclaw doctor --fix` to restore missing `allowFrom` entries from pairing-store files when present, preventing silent DM drops after upgrades. (#27936) Thanks @widingmarcus-cyber.
- Browser/Chrome extension handshake: bind relay WS message handling before `onopen` and add non-blocking `connect.challenge` response handling for gateway-style handshake frames, avoiding stuck `…` badge states when challenge frames arrive immediately on connect. Landed from contributor PR #22571 by @pandego. (#22553)
- Browser/Extension relay init: dedupe concurrent same-port relay startup with shared in-flight initialization promises so callers await one startup lifecycle and receive consistent success/failure results. Landed from contributor PR #21277 by @HOYALIM. (Related #20688)
- Browser/Fill relay + CLI parity: accept `act.fill` fields without explicit `type` by defaulting missing/empty `type` to `text` in both browser relay route parsing and `openclaw browser fill` CLI field parsing, so relay calls no longer fail when the model omits field type metadata. Landed from contributor PR #27662 by @Uface11. (#27296) Thanks @Uface11.
- Feishu/Permission error dispatch: merge sender-name permission notices into the main inbound dispatch so one user message produces one agent turn/reply (instead of a duplicate permission-notice turn), with regression coverage. (#27381) thanks @byungsker.
>>>>>>> cceefe833 (fix: harden delivery recovery backoff eligibility and tests (#27710) (thanks @Jimmy-xuzimo))
- Agents/Canvas default node resolution: when multiple connected canvas-capable nodes exist and no single `mac-*` candidate is selected, default to the first connected candidate instead of failing with `node required` for implicit-node canvas tool calls. Landed from contributor PR #27444 by @carbaj03. Thanks @carbaj03.
>>>>>>> da9f24dd2 (fix: add nodes default-node regression test (#27444) (thanks @carbaj03))
- TUI/stream assembly: preserve streamed text across real tool-boundary drops without keeping stale streamed text when non-text blocks appear only in the final payload. Landed from contributor PR #27711 by @scz2011. (#27674)
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> b01273cfc (fix: narrow finalize boundary-drop guard (#27711) (thanks @scz2011))
=======
- Hooks/Internal `message:sent`: forward `sessionKey` on outbound sends from agent delivery, cron isolated delivery, gateway receipt acks, heartbeat sends, session-maintenance warnings, and restart-sentinel recovery so internal `message:sent` hooks consistently dispatch with session context. Landed from contributor PR #27584 by @qualiobra. Thanks @qualiobra.
>>>>>>> 4cb405399 (fix: complete sessionKey forwarding for message:sent hook (#27584) (thanks @qualiobra))
=======
- Hooks/Internal `message:sent`: forward `sessionKey` on outbound sends from agent delivery, cron isolated delivery, gateway receipt acks, heartbeat sends, session-maintenance warnings, and restart-sentinel recovery so internal `message:sent` hooks consistently dispatch with session context, including `openclaw agent --deliver` runs resumed via `--session-id` (without explicit `--session-key`). Landed from contributor PR #27584 by @qualiobra. Thanks @qualiobra.
>>>>>>> 7ef6623bf (fix: forward resolved session key in agent delivery (follow-up #27584 by @qualiobra))
- Models/MiniMax auth header defaults: set `authHeader: true` for both onboarding-generated MiniMax API providers and implicit built-in MiniMax (`minimax`, `minimax-portal`) provider templates so first requests no longer fail with MiniMax `401 authentication_error` due to missing `Authorization` header. Landed from contributor PRs #27622 by @riccoyuanft and #27631 by @kevinWangSheng. (#27600, #15303)
>>>>>>> 60bb47535 (fix: set authHeader: true by default for MiniMax API provider (#27622))
- Pi image-token usage: stop re-injecting history image blocks each turn, process image references from the current prompt only, and prune already-answered user-image blocks in stored history to prevent runaway token growth. (#27602)
- BlueBubbles/SSRF: auto-allowlist the configured `serverUrl` hostname for attachment fetches so localhost/private-IP BlueBubbles setups are no longer false-blocked by default SSRF checks. Landed from contributor PR #27648 by @lailoo. (#27599) Thanks @taylorhou for reporting.
<<<<<<< HEAD
=======
- Agents/Compaction + onboarding safety: prevent destructive double-compaction by stripping stale assistant usage around compaction boundaries, skipping post-compaction custom metadata writes in the same attempt, and cancelling safeguard compaction when there are no real conversation messages to summarize; harden workspace/bootstrap detection for memory-backed workspaces; and change `openclaw onboard --reset` default scope to `config+creds+sessions` (workspace deletion now requires `--reset-scope full`). (#26458, #27314) Thanks @jaden-clovervnd, @Sid-Qin, and @widingmarcus-cyber for fix direction in #26502, #26529, and #27492.
- NO_REPLY suppression: suppress `NO_REPLY` before Slack API send and in sub-agent announce completion flow so sentinel text no longer leaks into user channels. Landed from contributor PRs #27529 (by @Sid-Qin) and #27535 (rewritten minimal landing by maintainers). (#27387, #27531)
- Matrix/Group sender identity: preserve sender labels in Matrix group inbound prompt text (`BodyForAgent`) for both channel and threaded messages, and align group envelopes with shared inbound sender-prefix formatting so first-person requests resolve against the current sender. (#27401) thanks @koushikxd.
- Auto-reply/Streaming: suppress only exact `NO_REPLY` final replies while still filtering streaming partial sentinel fragments (`NO_`, `NO_RE`, `HEARTBEAT_...`) so substantive replies ending with `NO_REPLY` are delivered and partial silent tokens do not leak during streaming. (#19576) Thanks @aldoeliacim.
- Auto-reply/Inbound metadata: add a readable `timestamp` field to conversation info and ignore invalid/out-of-range timestamp values so prompt assembly never crashes on malformed timestamp inputs. (#17017) thanks @liuy.
- Typing/Run completion race: prevent post-run keepalive ticks from re-triggering typing callbacks by guarding `triggerTyping()` with `runComplete`, with regression coverage for no-restart behavior during run-complete/dispatch-idle boundaries. (#27413) Thanks @widingmarcus-cyber.
- Typing/Dispatch idle: force typing cleanup when `markDispatchIdle` never arrives after run completion, avoiding leaked typing keepalive loops in cron/announce edges. Landed from contributor PR #27541 by @Sid-Qin. (#27493)
- Telegram/Inline buttons: allow callback-query button handling in groups (including `/models` follow-up buttons) when group policy authorizes the sender, by removing the redundant callback allowlist gate that blocked open-policy groups. (#27343) Thanks @GodsBoy.
- Telegram/Streaming preview: when finalizing without an existing preview message, prime pending preview text with final answer before stop-flush so users do not briefly see stale 1-2 word fragments (for example `no` before `no problem`). (#27449) Thanks @emanuelst for the original fix direction in #19673.
- Browser/Extension relay CORS: handle `/json*` `OPTIONS` preflight before auth checks, allow Chrome extension origins, and return extension-origin CORS headers on relay HTTP responses so extension token validation no longer fails cross-origin. Landed from contributor PR #23962 by @miloudbelarebia. (#23842)
- Browser/Extension relay auth: allow `?token=` query-param auth on relay `/json*` endpoints (consistent with relay WebSocket auth) so curl/devtools-style `/json/version` and `/json/list` probes work without requiring custom headers. Landed from contributor PR #26015 by @Sid-Qin. (#25928)
- Browser/Extension relay shutdown: flush pending extension-request timers/rejections during relay `stop()` before socket/server teardown so in-flight extension waits do not survive shutdown windows. Landed from contributor PR #24142 by @kevinWangSheng.
- Browser/Extension relay reconnect resilience: keep CDP clients alive across brief MV3 extension disconnect windows, wait briefly for extension reconnect before failing in-flight CDP commands, and only tear down relay target/client state after reconnect grace expires. Landed from contributor PR #27617 by @davidemanuelDEV.
- Browser/Route decode hardening: guard malformed percent-encoding in relay target action routes and browser route-param decoding so crafted `%` paths return `400` instead of crashing/unhandled URI decode failures. Landed from contributor PR #11880 by @Yida-Dev.
- Feishu/Inbound message metadata: include inbound `message_id` in `BodyForAgent` on a dedicated metadata line so agents can reliably correlate and act on media/message operations that require message IDs, with regression coverage. (#27253) thanks @xss925175263.
- Feishu/Doc tools: route `feishu_doc` and `feishu_app_scopes` through the active agent account context (with explicit `accountId` override support) so multi-account agents no longer default to the first configured app, with regression coverage for context routing and explicit override behavior. (#27338) thanks @AaronL725.
- LINE/Inline directives auth: gate directive parsing (`/model`, `/think`, `/verbose`, `/reasoning`, `/queue`) on resolved authorization (`command.isAuthorizedSender`) so `commands.allowFrom`-authorized LINE senders are not silently stripped when raw `CommandAuthorized` is unset. Landed from contributor PR #27248 by @kevinWangSheng. (#27240)
- Onboarding/Gateway: seed default Control UI `allowedOrigins` for non-loopback binds during onboarding (`localhost`/`127.0.0.1` plus custom bind host) so fresh non-loopback setups do not fail startup due to missing origin policy. (#26157) thanks @stakeswky.
- Docker/GCP onboarding: reduce first-build OOM risk by capping Node heap during `pnpm install`, reuse existing gateway token during `docker-setup.sh` reruns so `.env` stays aligned with config, auto-bootstrap Control UI allowed origins for non-loopback Docker binds, and add GCP docs guidance for tokenized dashboard links + pairing recovery commands. (#26253) Thanks @pandego.
- CLI/Gateway `--force` in non-root Docker: recover from `lsof` permission failures (`EACCES`/`EPERM`) by falling back to `fuser` kill + probe-based port checks, so `openclaw gateway --force` works for default container `node` user flows. (#27941)
- Gateway/Bind visibility: emit a startup warning when binding to non-loopback addresses so operators get explicit exposure guidance in runtime logs. (#25397) thanks @let5sne.
- Sessions cleanup/Doctor: add `openclaw sessions cleanup --fix-missing` to prune store entries whose transcript files are missing, including doctor guidance and CLI coverage. Landed from contributor PR #27508 by @Sid-Qin. (#27422)
- Doctor/State integrity: ignore metadata-only slash routing sessions when checking recent missing transcripts so `openclaw doctor` no longer reports false-positive transcript-missing warnings for `*:slash:*` keys. (#27375) thanks @gumadeiras.
- CLI/Gateway status: force local `gateway status` probe host to `127.0.0.1` for `bind=lan` so co-located probes do not trip non-loopback plaintext WebSocket checks. (#26997) thanks @chikko80.
- CLI/Gateway auth: align `gateway run --auth` parsing/help text with supported gateway auth modes by accepting `none` and `trusted-proxy` (in addition to `token`/`password`) for CLI overrides. (#27469) thanks @s1korrrr.
- CLI/Daemon status TLS probe: use `wss://` and forward local TLS certificate fingerprint for TLS-enabled gateway daemon probes so `openclaw daemon status` works with `gateway.bind=lan` + `gateway.tls.enabled=true`. (#24234) thanks @liuy.
- Podman/Default bind: change `run-openclaw-podman.sh` default gateway bind from `lan` to `loopback` and document explicit LAN opt-in with Control UI origin configuration. (#27491) thanks @robbyczgw-cla.
- Daemon/macOS launchd: forward proxy env vars into supervised service environments, keep LaunchAgent `KeepAlive=true` semantics, and harden restart sequencing to `print -> bootout -> wait old pid exit -> bootstrap -> kickstart`. (#27276) thanks @frankekn.
- Daemon/macOS TLS certs: default LaunchAgent service env `NODE_EXTRA_CA_CERTS` to `/etc/ssl/cert.pem` (while preserving explicit overrides) so HTTPS clients no longer fail with local-issuer errors under launchd. (#27915) Thanks @Lukavyi.
- Gateway/macOS restart-loop hardening: detect OpenClaw-managed supervisor markers during SIGUSR1 restart handoff, clean stale gateway PIDs before `/restart` launchctl/systemctl triggers, and set LaunchAgent `ThrottleInterval=60` to bound launchd retry storms during lock-release races. Landed from contributor PRs #27655 (@taw0002), #27448 (@Sid-Qin), and #27650 (@kevinWangSheng). (#27605, #27590, #26904, #26736)
- Models/MiniMax auth header defaults: set `authHeader: true` for both onboarding-generated MiniMax API providers and implicit built-in MiniMax (`minimax`, `minimax-portal`) provider templates so first requests no longer fail with MiniMax `401 authentication_error` due to missing `Authorization` header. Landed from contributor PRs #27622 by @riccoyuanft and #27631 by @kevinWangSheng. (#27600, #15303)
- Models/Google Antigravity IDs: normalize bare `gemini-3-pro`, `gemini-3.1-pro`, and `gemini-3-1-pro` model IDs to the default `-low` thinking tier so provider requests no longer fail with 404 when the tier suffix is omitted. (#24145) Thanks @byungsker.
- Auth/Auth profiles: normalize `auth-profiles.json` alias fields (`mode -> type`, `apiKey -> key`) before credential validation so entries copied from `openclaw.json` auth examples are no longer silently dropped. (#26950) thanks @byungsker.
- Models/Google Gemini: treat `google` (Gemini API key auth profile) as a reasoning-tag provider to prevent `<think>` leakage, and add forward-compat model fallback for `google-gemini-cli` `gemini-3.1-pro*` / `gemini-3.1-flash*` IDs to avoid false unknown-model errors. (#26551, #26524) Thanks @byungsker.
- Models/Profile suffix parsing: centralize trailing `@profile` parsing and only treat `@` as a profile separator when it appears after the final `/`, preserving model IDs like `openai/@cf/...` and `openrouter/@preset/...` across `/model` directive parsing and allowlist model resolution, with regression coverage.
- Models/OpenAI Codex config schema parity: accept `openai-codex-responses` in the config model API schema and TypeScript `ModelApi` union, with regression coverage for config validation. Landed from contributor PR #27501 by @AytuncYildizli. Thanks @AytuncYildizli.
- Agents/Models config: preserve agent-level provider `apiKey` and `baseUrl` during merge-mode `models.json` updates when agent values are present. (#27293) thanks @Sid-Qin.
- Azure OpenAI Responses: force `store=true` for `azure-openai-responses` direct responses API calls to avoid multi-turn 400 failures. Landed from contributor PR #27499 by @polarbear-Yang. (#27497)
- Security/Node exec approvals: require structured `commandArgv` approvals for `host=node`, enforce versioned `systemRunBindingV1` matching for argv/cwd/session/agent/env context with fail-closed behavior on missing/mismatched bindings, and add `GIT_EXTERNAL_DIFF` to blocked host env keys. This ships in the next npm release (`2026.2.26`). Thanks @tdjackey for reporting.
- Security/Plugin channel HTTP auth: normalize protected `/api/channels` path checks against canonicalized request paths (case + percent-decoding + slash normalization), resolve encoded dot-segment traversal variants, and fail closed on malformed `%`-encoded channel prefixes so alternate-path variants cannot bypass gateway auth. This ships in the next npm release (`2026.2.26`). Thanks @zpbrent for reporting.
>>>>>>> 9d52dcf1f (fix: stabilize launchd CA env tests (#27915) (thanks @Lukavyi))
- Security/Gateway node pairing: pin paired-device `platform`/`deviceFamily` metadata across reconnects and bind those fields into device-auth signatures, so reconnect metadata spoofing cannot expand node command allowlists without explicit repair pairing. This ships in the next npm release (`2026.2.26`). Thanks @76embiid21 for reporting.
- Security/Sandbox path alias guard: reject broken symlink targets by resolving through existing ancestors and failing closed on out-of-root targets, preventing workspace-only `apply_patch` writes from escaping sandbox/workspace boundaries via dangling symlinks. This ships in the next npm release (`2026.2.26`). Thanks @tdjackey for reporting.
- Security/Workspace FS boundary aliases: harden canonical boundary resolution for non-existent-leaf symlink aliases while preserving valid in-root aliases, preventing first-write workspace escapes via out-of-root symlink targets. This ships in the next npm release (`2026.2.26`). Thanks @tdjackey for reporting.
- Security/Config includes: harden `$include` file loading with verified-open reads, reject hardlinked include aliases, and enforce include file-size guardrails so config include resolution remains bounded to trusted in-root files. This ships in the next npm release (`2026.2.26`). Thanks @zpbrent for reporting.
- Security/Node exec approvals: bind `system.run` approvals to canonicalized env overrides (`envHash`/`envKeys`) and fail closed on env-binding mismatches/missing bindings, while adding `GIT_EXTERNAL_DIFF` to blocked host env keys. This ships in the next npm release (`2026.2.26`). Thanks @tdjackey for reporting.
- Microsoft Teams/File uploads: acknowledge `fileConsent/invoke` immediately (`invokeResponse` before upload + file card send) so Teams no longer shows false "Something went wrong" timeout banners while upload completion continues asynchronously; includes updated async regression coverage. Landed from contributor PR #27641 by @scz2011.
- Security/Plugin channel HTTP auth: normalize protected `/api/channels` path checks against canonicalized request paths (case + percent-decoding + slash normalization), resolve encoded dot-segment traversal variants, and fail closed on malformed `%`-encoded channel prefixes so alternate-path variants cannot bypass gateway auth. This ships in the next npm release (`2026.2.26`). Thanks @zpbrent for reporting.
- Security/Exec approvals forwarding: prefer turn-source channel/account/thread metadata when resolving approval delivery targets so stale session routes do not misroute approval prompts.
>>>>>>> 2e97d0dd9 (fix: finalize teams file-consent timeout landing (#27641) (thanks @scz2011))
- Queue/Drain/Cron reliability: harden lane draining with guaranteed `draining` flag reset on synchronous pump failures, reject new queue enqueues during gateway restart drain windows (instead of silently killing accepted tasks), add `/stop` queued-backlog cutoff metadata with stale-message skipping (while avoiding cross-session native-stop cutoff bleed), and raise isolated cron `agentTurn` outer safety timeout to avoid false 10-minute timeout races against longer agent session timeouts. (#27407, #27332, #27427)
- Typing/Dispatch idle: force typing cleanup when `markDispatchIdle` never arrives after run completion, avoiding leaked typing keepalive loops in cron/announce edges. Landed from contributor PR #27541 by @Sid-Qin. (#27493)
- Telegram native commands: degrade command registration on `BOT_COMMANDS_TOO_MUCH` by retrying with fewer commands instead of crash-looping startup sync. Landed from contributor PR #27512 by @Sid-Qin. (#27456)
<<<<<<< HEAD
- Config/Plugins entries: treat unknown `plugins.entries.*` ids as startup warnings (ignored stale keys) instead of hard validation failures that can crash-loop gateway boot. Landed from contributor PR #27506 by @Sid-Qin. (#27455)
- Sessions cleanup/Doctor: add `openclaw sessions cleanup --fix-missing` to prune store entries whose transcript files are missing, including doctor guidance and CLI coverage. Landed from contributor PR #27508 by @Sid-Qin. (#27422)
- Azure OpenAI Responses: force `store=true` for `azure-openai-responses` direct responses API calls to avoid multi-turn 400 failures. Landed from contributor PR #27499 by @polarbear-Yang. (#27497)
=======
- Web tools/Proxy: route `web_search` provider HTTP calls (Brave, Perplexity, xAI, Gemini, Kimi), redirect resolution, and `web_fetch` through a shared proxy-aware SSRF guard path so gateway installs behind `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY` no longer fail with transport `fetch failed` errors. (#27430) thanks @kevinWangSheng.
- Android/Node invoke: remove native gateway WebSocket `Origin` header to avoid false origin rejections, unify invoke command registry/policy/error parsing paths, and keep command availability checks centralized to reduce dispatcher/advertisement drift. (#27257) Thanks @obviyus.
- Android/Camera clip: remove `camera.clip` HTTP-upload fallback to base64 so clip transport is deterministic and fail-loud, and reject non-positive `maxWidth` values so invalid inputs fall back to the safe resize default. (#28229) Thanks @obviyus.
<<<<<<< HEAD
>>>>>>> de885d260 (fix: update changelog for android camera clip (#28229) (thanks @obviyus))
=======
- Android/Nodes reliability: reject `facing=both` when `deviceId` is set to avoid mislabeled duplicate captures, allow notification `open`/`reply` on non-clearable entries while still gating dismiss, trigger listener rebind before notification actions, and scale invoke-result ack timeout to invoke budget for large clip payloads. (#28260) Thanks @obviyus.
- Android/Gateway canvas capability refresh: send `node.canvas.capability.refresh` with object `params` (`{}`) from Android node runtime so gateway object-schema validation accepts refresh retries and A2UI host recovery works after scoped capability expiry. (#28413) Thanks @obviyus.
>>>>>>> 0fb7add7d (fix: document canvas capability refresh params fix (#28413) (thanks @obviyus))
- Gateway shared-auth scopes: preserve requested operator scopes for shared-token clients when device identity is unavailable, instead of clearing scopes during auth handling. Landed from contributor PR #27498 by @kevinWangSheng. (#27494)
- NO_REPLY suppression: suppress `NO_REPLY` before Slack API send and in sub-agent announce completion flow so sentinel text no longer leaks into user channels. Landed from contributor PRs #27529 (by @Sid-Qin) and #27535 (rewritten minimal landing by maintainers). (#27387, #27531)
<<<<<<< HEAD
- Security/Plugin channel HTTP auth: normalize protected `/api/channels` path checks against canonicalized request paths (case + percent-decoding + slash normalization), and fail closed on malformed `%`-encoded channel prefixes so alternate-path variants cannot bypass gateway auth.
- Security/Exec approvals forwarding: prefer turn-source channel/account/thread metadata when resolving approval delivery targets so stale session routes do not misroute approval prompts.
- Security/Sandbox path alias guard: reject broken symlink targets by resolving through existing ancestors and failing closed on out-of-root targets, preventing workspace-only `apply_patch` writes from escaping sandbox/workspace boundaries via dangling symlinks. This ships in the next npm release (`2026.2.26`). Thanks @tdjackey for reporting.
- Security/Gateway node pairing: pin paired-device `platform`/`deviceFamily` metadata across reconnects and bind those fields into device-auth signatures, so reconnect metadata spoofing cannot expand node command allowlists without explicit repair pairing. This ships in the next npm release (`2026.2.26`). Thanks @76embiid21 for reporting.
=======
- Auto-reply/Streaming: suppress only exact `NO_REPLY` final replies while still filtering streaming partial sentinel fragments (`NO_`, `NO_RE`, `HEARTBEAT_...`) so substantive replies ending with `NO_REPLY` are delivered and partial silent tokens do not leak during streaming. (#19576) Thanks @aldoeliacim.
- Typing/Main reply pipeline: always mark dispatch idle in `agent-runner` finalization so typing cleanup runs even when dispatcher `onIdle` does not fire, preventing stuck typing indicators after run completion. (#27250) Thanks @Sid-Qin.
- Typing/Run completion race: prevent post-run keepalive ticks from re-triggering typing callbacks by guarding `triggerTyping()` with `runComplete`, with regression coverage for no-restart behavior during run-complete/dispatch-idle boundaries. (#27413) Thanks @widingmarcus-cyber.
- Typing/Dispatch idle: force typing cleanup when `markDispatchIdle` never arrives after run completion, avoiding leaked typing keepalive loops in cron/announce edges. Landed from contributor PR #27541 by @Sid-Qin. (#27493)
- Typing/TTL safety net: add max-duration guardrails to shared typing callbacks so stuck lifecycle edges auto-stop typing indicators even when explicit idle/cleanup signals are missed. (#27428) Thanks @Crpdim.
- Typing/Cross-channel leakage: unify run-scoped typing suppression for cross-channel/internal-webchat routes, preserve current inbound origin as embedded run message channel context, harden shared typing keepalive with consecutive-failure circuit breaker edge-case handling, and enforce dispatcher completion/idle waits in extension dispatcher callsites (Feishu, Matrix, Mattermost, MSTeams) so typing indicators always clean up on success/error paths. Related: #27647, #27493, #27598. Supersedes/replaces draft PRs: #27640, #27593, #27540.
>>>>>>> 37a138c55 (fix: harden typing lifecycle and cross-channel suppression)
- Onboarding/Gateway: seed default Control UI `allowedOrigins` for non-loopback binds during onboarding (`localhost`/`127.0.0.1` plus custom bind host) so fresh non-loopback setups do not fail startup due to missing origin policy. (#26157) thanks @stakeswky.
<<<<<<< HEAD
=======
- Docker/GCP onboarding: reduce first-build OOM risk by capping Node heap during `pnpm install`, reuse existing gateway token during `docker-setup.sh` reruns so `.env` stays aligned with config, auto-bootstrap Control UI allowed origins for non-loopback Docker binds, and add GCP docs guidance for tokenized dashboard links + pairing recovery commands. (#26253) Thanks @pandego.
- Config/Plugins entries: treat unknown `plugins.entries.*` ids as startup warnings (ignored stale keys) instead of hard validation failures that can crash-loop gateway boot. Landed from contributor PR #27506 by @Sid-Qin. (#27455)
- Auth/Auth profiles: normalize `auth-profiles.json` alias fields (`mode -> type`, `apiKey -> key`) before credential validation so entries copied from `openclaw.json` auth examples are no longer silently dropped. (#26950) thanks @byungsker.
- Models/Profile suffix parsing: centralize trailing `@profile` parsing and only treat `@` as a profile separator when it appears after the final `/`, preserving model IDs like `openai/@cf/...` and `openrouter/@preset/...` across `/model` directive parsing and allowlist model resolution, with regression coverage.
- Models/OpenAI Codex config schema parity: accept `openai-codex-responses` in the config model API schema and TypeScript `ModelApi` union, with regression coverage for config validation. Landed from contributor PR #27501 by @AytuncYildizli. Thanks @AytuncYildizli.
- Agents/Models config: preserve agent-level provider `apiKey` and `baseUrl` during merge-mode `models.json` updates when agent values are present. (#27293) thanks @Sid-Qin.
- Cron/Hooks isolated routing: preserve canonical `agent:*` session keys in isolated runs so already-qualified keys are not double-prefixed (for example `agent:main:main` no longer becomes `agent:main:agent:main:main`). Landed from contributor PR #27333 by @MaheshBhushan. (#27289, #27282)
- Pairing/Multi-account isolation: keep non-default account pairing allowlists and pending requests strictly account-scoped, while default account continues to use channel-scoped pairing allowlist storage. Thanks @gumadeiras.
- Channels/Multi-account config: when adding a non-default channel account to a single-account top-level channel setup, move existing account-scoped top-level single-account values into `channels.<channel>.accounts.default` before writing the new account so the original account keeps working without duplicated account values at channel root; `openclaw doctor --fix` now repairs previously mixed channel account shapes the same way. (#27334) thanks @gumadeiras.
- Sessions cleanup/Doctor: add `openclaw sessions cleanup --fix-missing` to prune store entries whose transcript files are missing, including doctor guidance and CLI coverage. Landed from contributor PR #27508 by @Sid-Qin. (#27422)
- Doctor/State integrity: ignore metadata-only slash routing sessions when checking recent missing transcripts so `openclaw doctor` no longer reports false-positive transcript-missing warnings for `*:slash:*` keys. (#27375) thanks @gumadeiras.
- Telegram/sendChatAction 401 handling: add bounded exponential backoff + temporary local typing suppression after repeated unauthorized failures to stop unbounded `sendChatAction` retry loops that can trigger Telegram abuse enforcement and bot deletion. (#27415) Thanks @widingmarcus-cyber.
- Telegram native commands: degrade command registration on `BOT_COMMANDS_TOO_MUCH` by retrying with fewer commands instead of crash-looping startup sync. Landed from contributor PR #27512 by @Sid-Qin. (#27456)
- Telegram/Inline buttons: allow callback-query button handling in groups (including `/models` follow-up buttons) when group policy authorizes the sender, by removing the redundant callback allowlist gate that blocked open-policy groups. (#27343) Thanks @GodsBoy.
- Telegram/Streaming preview: when finalizing without an existing preview message, prime pending preview text with final answer before stop-flush so users do not briefly see stale 1-2 word fragments (for example `no` before `no problem`). (#27449) Thanks @emanuelst for the original fix direction in #19673.
- Telegram/Webhook startup: clarify webhook config guidance, allow `channels.telegram.webhookPort: 0` for ephemeral listener binding, and log both the local listener URL and Telegram-advertised webhook URL with the bound port. (#25732) thanks @huntharo.
- Browser/Extension relay CORS: handle `/json*` `OPTIONS` preflight before auth checks, allow Chrome extension origins, and return extension-origin CORS headers on relay HTTP responses so extension token validation no longer fails cross-origin. Landed from contributor PR #23962 by @miloudbelarebia. (#23842)
- Browser/Extension relay auth: allow `?token=` query-param auth on relay `/json*` endpoints (consistent with relay WebSocket auth) so curl/devtools-style `/json/version` and `/json/list` probes work without requiring custom headers. Landed from contributor PR #26015 by @Sid-Qin. (#25928)
- Browser/Chrome extension handshake: bind relay WS message handling before `onopen` and add non-blocking `connect.challenge` response handling for gateway-style handshake frames, avoiding stuck `…` badge states when challenge frames arrive immediately on connect. Landed from contributor PR #22571 by @pandego. (#22553)
- Browser/Extension relay init: dedupe concurrent same-port relay startup with shared in-flight initialization promises so callers await one startup lifecycle and receive consistent success/failure results. Landed from contributor PR #21277 by @HOYALIM. (Related #20688)
- Browser/Extension relay shutdown: flush pending extension-request timers/rejections during relay `stop()` before socket/server teardown so in-flight extension waits do not survive shutdown windows. Landed from contributor PR #24142 by @kevinWangSheng.
- Browser/Extension relay reconnect resilience: keep CDP clients alive across brief MV3 extension disconnect windows, wait briefly for extension reconnect before failing in-flight CDP commands, and only tear down relay target/client state after reconnect grace expires. Landed from contributor PR #27617 by @davidemanuelDEV.
- Browser/Fill relay + CLI parity: accept `act.fill` fields without explicit `type` by defaulting missing/empty `type` to `text` in both browser relay route parsing and `openclaw browser fill` CLI field parsing, so relay calls no longer fail when the model omits field type metadata. Landed from contributor PR #27662 by @Uface11. (#27296) Thanks @Uface11.
- Browser/Route decode hardening: guard malformed percent-encoding in relay target action routes and browser route-param decoding so crafted `%` paths return `400` instead of crashing/unhandled URI decode failures. Landed from contributor PR #11880 by @Yida-Dev.
- Feishu/Permission error dispatch: merge sender-name permission notices into the main inbound dispatch so one user message produces one agent turn/reply (instead of a duplicate permission-notice turn), with regression coverage. (#27381) thanks @byungsker.
- Feishu/Inbound message metadata: include inbound `message_id` in `BodyForAgent` on a dedicated metadata line so agents can reliably correlate and act on media/message operations that require message IDs, with regression coverage. (#27253) thanks @xss925175263.
- Feishu/Doc tools: route `feishu_doc` and `feishu_app_scopes` through the active agent account context (with explicit `accountId` override support) so multi-account agents no longer default to the first configured app, with regression coverage for context routing and explicit override behavior. (#27338) thanks @AaronL725.
- LINE/Inline directives auth: gate directive parsing (`/model`, `/think`, `/verbose`, `/reasoning`, `/queue`) on resolved authorization (`command.isAuthorizedSender`) so `commands.allowFrom`-authorized LINE senders are not silently stripped when raw `CommandAuthorized` is unset. Landed from contributor PR #27248 by @kevinWangSheng. (#27240)
- Web tools/Proxy: route `web_search` provider HTTP calls (Brave, Perplexity, xAI, Gemini, Kimi), redirect resolution, and `web_fetch` through a shared proxy-aware SSRF guard path so gateway installs behind `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY` no longer fail with transport `fetch failed` errors. (#27430) thanks @kevinWangSheng.
>>>>>>> ac03803d1 (fix: align codex model api schema/type coverage (#27501) (thanks @AytuncYildizli))
- CLI/Gateway status: force local `gateway status` probe host to `127.0.0.1` for `bind=lan` so co-located probes do not trip non-loopback plaintext WebSocket checks. (#26997) thanks @chikko80.
- CLI/Gateway auth: align `gateway run --auth` parsing/help text with supported gateway auth modes by accepting `none` and `trusted-proxy` (in addition to `token`/`password`) for CLI overrides. (#27469) thanks @s1korrrr.
- CLI/Daemon status TLS probe: use `wss://` and forward local TLS certificate fingerprint for TLS-enabled gateway daemon probes so `openclaw daemon status` works with `gateway.bind=lan` + `gateway.tls.enabled=true`. (#24234) thanks @liuy.
- Gateway/Bind visibility: emit a startup warning when binding to non-loopback addresses so operators get explicit exposure guidance in runtime logs. (#25397) thanks @let5sne.
- Podman/Default bind: change `run-openclaw-podman.sh` default gateway bind from `lan` to `loopback` and document explicit LAN opt-in with Control UI origin configuration. (#27491) thanks @robbyczgw-cla.
>>>>>>> 85b075d0c (fix: record ios talk voice directive hint removal (#27543) (thanks @ngutman))
- Auto-reply/Streaming: suppress only exact `NO_REPLY` final replies while still filtering streaming partial sentinel fragments (`NO_`, `NO_RE`, `HEARTBEAT_...`) so substantive replies ending with `NO_REPLY` are delivered and partial silent tokens do not leak during streaming. (#19576) Thanks @aldoeliacim.
- Doctor/State integrity: ignore metadata-only slash routing sessions when checking recent missing transcripts so `openclaw doctor` no longer reports false-positive transcript-missing warnings for `*:slash:*` keys. (#27375) thanks @gumadeiras.
>>>>>>> 97fa44dc8 (fix: changelog for NO_REPLY streaming fix (#19576) (thanks @aldoeliacim))
- Channels/Multi-account config: when adding a non-default channel account to a single-account top-level channel setup, move existing account-scoped top-level single-account values into `channels.<channel>.accounts.default` before writing the new account so the original account keeps working without duplicated account values at channel root; `openclaw doctor --fix` now repairs previously mixed channel account shapes the same way. (#27334) thanks @gumadeiras.
- Feishu/Doc tools: route `feishu_doc` and `feishu_app_scopes` through the active agent account context (with explicit `accountId` override support) so multi-account agents no longer default to the first configured app, with regression coverage for context routing and explicit override behavior. (#27338) thanks @AaronL725.
- Feishu/Inbound message metadata: include inbound `message_id` in `BodyForAgent` on a dedicated metadata line so agents can reliably correlate and act on media/message operations that require message IDs, with regression coverage. (#27253) thanks @xss925175263.
- Feishu/Permission error dispatch: merge sender-name permission notices into the main inbound dispatch so one user message produces one agent turn/reply (instead of a duplicate permission-notice turn), with regression coverage. (#27381) thanks @byungsker.
- Telegram/Inline buttons: allow callback-query button handling in groups (including `/models` follow-up buttons) when group policy authorizes the sender, by removing the redundant callback allowlist gate that blocked open-policy groups. (#27343) Thanks @GodsBoy.
<<<<<<< HEAD
=======
- Telegram/Streaming preview: when finalizing without an existing preview message, prime pending preview text with final answer before stop-flush so users do not briefly see stale 1-2 word fragments (for example `no` before `no problem`). (#27449) Thanks @emanuelst for the original fix direction in #19673.
- Telegram/sendChatAction 401 handling: add bounded exponential backoff + temporary local typing suppression after repeated unauthorized failures to stop unbounded `sendChatAction` retry loops that can trigger Telegram abuse enforcement and bot deletion. (#27415) Thanks @widingmarcus-cyber.
- Telegram/Webhook startup: clarify webhook config guidance, allow `channels.telegram.webhookPort: 0` for ephemeral listener binding, and log both the local listener URL and Telegram-advertised webhook URL with the bound port. (#25732) thanks @huntharo.
- Typing/TTL safety net: add max-duration guardrails to shared typing callbacks so stuck lifecycle edges auto-stop typing indicators even when explicit idle/cleanup signals are missed. (#27428) Thanks @Crpdim.
- Typing/Main reply pipeline: always mark dispatch idle in `agent-runner` finalization so typing cleanup runs even when dispatcher `onIdle` does not fire, preventing stuck typing indicators after run completion. (#27250) Thanks @Sid-Qin.
- Typing/Run completion race: prevent post-run keepalive ticks from re-triggering typing callbacks by guarding `triggerTyping()` with `runComplete`, with regression coverage for no-restart behavior during run-complete/dispatch-idle boundaries. (#27413) Thanks @widingmarcus-cyber.
>>>>>>> 22b0f3635 (fix: add changelog entry for telegram webhook updates (#25732) (thanks @huntharo))
- Daemon/macOS launchd: forward proxy env vars into supervised service environments, keep LaunchAgent `KeepAlive=true` semantics, and harden restart sequencing to `print -> bootout -> wait old pid exit -> bootstrap -> kickstart`. (#27276) thanks @frankekn.
<<<<<<< HEAD
>>>>>>> 0e3ed2895 (fix: changelog for telegram group inline callbacks (#27343) (thanks @GodsBoy))
=======
- Web tools/Proxy: route `web_search` provider HTTP calls (Brave, Perplexity, xAI, Gemini, Kimi), redirect resolution, and `web_fetch` through a shared proxy-aware SSRF guard path so gateway installs behind `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY` no longer fail with transport `fetch failed` errors. (#27430) thanks @kevinWangSheng.
>>>>>>> 46003e85b (fix: unify web tool proxy path (#27430) (thanks @kevinWangSheng))
- Android/Node invoke: remove native gateway WebSocket `Origin` header to avoid false origin rejections, unify invoke command registry/policy/error parsing paths, and keep command availability checks centralized to reduce dispatcher/advertisement drift. (#27257) Thanks @obviyus.
- CI/Windows: shard the Windows `checks-windows` test lane into two matrix jobs and honor explicit shard index overrides in `scripts/test-parallel.mjs` to reduce CI critical-path wall time. (#27234) Thanks @joshavant.
<<<<<<< HEAD
=======
- Agents/Models config: preserve agent-level provider `apiKey` and `baseUrl` during merge-mode `models.json` updates when agent values are present. (#27293) thanks @Sid-Qin.
- Docker/GCP onboarding: reduce first-build OOM risk by capping Node heap during `pnpm install`, reuse existing gateway token during `docker-setup.sh` reruns so `.env` stays aligned with config, auto-bootstrap Control UI allowed origins for non-loopback Docker binds, and add GCP docs guidance for tokenized dashboard links + pairing recovery commands. (#26253) Thanks @pandego.
- Pairing/Multi-account isolation: keep non-default account pairing allowlists and pending requests strictly account-scoped, while default account continues to use channel-scoped pairing allowlist storage. Thanks @gumadeiras.
- Security/Config includes: harden `$include` file loading with verified-open reads, reject hardlinked include aliases, and enforce include file-size guardrails so config include resolution remains bounded to trusted in-root files. This ships in the next npm release (`2026.2.26`). Thanks @zpbrent for reporting.
- Security/Workspace FS boundary aliases: harden canonical boundary resolution for non-existent-leaf symlink aliases while preserving valid in-root aliases, preventing first-write workspace escapes via out-of-root symlink targets. This ships in the next npm release (`2026.2.26`). Thanks @tdjackey for reporting.
>>>>>>> 1aef45bc0 (fix: harden boundary-path canonical alias handling)

## 2026.2.25
>>>>>>> c5d040bbe (fix: update changelog for android invoke distill (#27257) (thanks @obviyus))

### Changes

<<<<<<< HEAD
=======
- Dependencies: update workspace dependency pins and lockfile (Bedrock SDK `3.998.0`, `@mariozechner/pi-*` `0.55.1`, TypeScript native preview `7.0.0-dev.20260225.1`) while keeping `@buape/carbon` pinned.
- Android/Startup perf: defer foreground-service startup, move WebView debugging init out of critical startup, and add startup macrobenchmark + low-noise perf CLI scripts for deterministic cold-start tracking. (#26659) Thanks @obviyus.
>>>>>>> 958cafc54 (fix: add changelog note for android startup perf (#26659) (thanks @obviyus))
- Android/Chat: improve streaming delivery handling and markdown rendering quality in the native Android chat UI, including better GitHub-flavored markdown behavior. (#26079) Thanks @obviyus.
- UI/Chat compose: add mobile stacked layout for compose action buttons on small screens to improve send/session controls usability. (#11167) Thanks @junyiz.
- Branding/Docs + Apple surfaces: replace remaining `bot.molt` launchd label, bundle-id, logging subsystem, and command examples with `ai.openclaw` across docs, iOS app surfaces, helper scripts, and CLI test fixtures.

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
=======
- Docker/GCP onboarding: reduce first-build OOM risk by capping Node heap during `pnpm install`, reuse existing gateway token during `docker-setup.sh` reruns so `.env` stays aligned with config, auto-bootstrap Control UI allowed origins for non-loopback Docker binds, and add GCP docs guidance for tokenized dashboard links + pairing recovery commands. (#26253) Thanks @pandego.
>>>>>>> 35976da7a (fix: harden Docker/GCP onboarding flow (#26253) (thanks @pandego))
- Agents/Subagents delivery: refactor subagent completion announce dispatch into an explicit queue/direct/fallback state machine, recover outbound channel-plugin resolution in cold/stale plugin-registry states across announce/message/gateway send paths, finalize cleanup bookkeeping when announce flow rejects, and treat Telegram sends without `message_id` as delivery failures (instead of false-success `"unknown"` IDs). (#26867, #25961, #26803, #25069, #26741) Thanks @SmithLabsLLC and @docaohieu2808.
- LINE/Lifecycle: keep LINE `startAccount` pending until abort so webhook startup is no longer misread as immediate channel exit, preventing restart-loop storms on LINE provider boot. (#26528) Thanks @Sid-Qin.
- Security/SSRF guard: classify IPv6 multicast literals (`ff00::/8`) as blocked/private-internal targets in shared SSRF IP checks, preventing multicast literals from bypassing URL-host preflight and DNS answer validation. This ships in the next npm release (`2026.2.25`). Thanks @zpbrent for reporting.
>>>>>>> baf656bc6 (fix: block IPv6 multicast SSRF bypass)
- Slack/Session threads: prevent oversized parent-session inheritance from silently bricking new thread sessions, surface embedded context-overflow empty-result failures to users, and add configurable `session.parentForkMaxTokens` (default `100000`, `0` disables). (#26912) Thanks @markshields-tl.
- Security/Signal: enforce DM/group authorization before reaction-only notification enqueue so unauthorized senders can no longer inject Signal reaction system events under `dmPolicy`/`groupPolicy`; reaction notifications now require channel access checks first. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Discord + Slack reactions: enforce DM policy/allowlist authorization before reaction-event system enqueue in direct messages; Discord reaction handling now also honors DM/group-DM enablement and guild `groupPolicy` channel gating to keep reaction ingress aligned with normal message preflight. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Telegram reactions: enforce `dmPolicy`/`allowFrom` and group allowlist authorization on `message_reaction` events before enqueueing reaction system events, preventing unauthorized reaction-triggered input in DMs and groups; ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
>>>>>>> e56b0cf1a (fix: enforce telegram reaction authorization)
- Security/macOS beta onboarding: remove Anthropic OAuth sign-in and the legacy `oauth.json` onboarding path that exposed the PKCE verifier via OAuth `state`; this impacted the macOS beta onboarding path only. Anthropic subscription auth is now setup-token-only and will ship in the next npm release (`2026.2.25`). Thanks @zdi-disclosures for reporting.
- Security/Nextcloud Talk: drop replayed signed webhook events with persistent per-account replay dedupe across restarts, and reject unexpected webhook backend origins when account base URL is configured. Thanks @aristorechina for reporting.
- Security/Gateway: harden `agents.files` path handling to block out-of-workspace symlink targets for `agents.files.get`/`agents.files.set`, keep in-workspace symlink targets supported, and add gateway regression coverage for both blocked escapes and allowed in-workspace symlinks. Thanks @tdjackey for reporting.
- Gateway/Message media roots: thread `agentId` through gateway `send` RPC and prefer explicit `agentId` over session/default resolution so non-default agent workspace media sends no longer fail with `LocalMediaAccessError`; added regression coverage for agent precedence and blank-agent fallback. (#23249) Thanks @Sid-Qin.
- Cron/Model overrides: when isolated `payload.model` is no longer allowlisted, fall back to default model selection instead of failing the job, while still returning explicit errors for invalid model strings. (#26717) Thanks @Youyou972.
>>>>>>> 15cfba707 (fix: cron model fallback to agent defaults when payload.model fails (#26717))
- Security/Nextcloud Talk: reject unsigned webhook traffic before full body reads, reducing unauthenticated request-body exposure, with auth-order regression coverage. (#26118) Thanks @bmendonca3.
- Security/Nextcloud Talk: stop treating DM pairing-store entries as group allowlist senders, so group authorization remains bounded to configured group allowlists. (#26116) Thanks @bmendonca3.
- Security/IRC: keep pairing-store approvals DM-only and out of IRC group allowlist authorization, with policy regression tests for allowlist resolution. (#26112) Thanks @bmendonca3.
- Security/Microsoft Teams: isolate group allowlist and command authorization from DM pairing-store entries to prevent cross-context authorization bleed. (#26111) Thanks @bmendonca3.
- Security/LINE: cap unsigned webhook body reads before auth/signature handling to bound unauthenticated body processing. (#26095) Thanks @bmendonca3.
- Agents/Model fallback: keep explicit text + image fallback chains reachable even when `agents.defaults.models` allowlists are present, prefer explicit run `agentId` over session-key parsing for followup fallback override resolution (with session-key fallback), treat agent-level fallback overrides as configured in embedded runner preflight, and classify `model_cooldown` / `cooling down` errors as `rate_limit` so failover continues. (#11972, #24137, #17231)
- Followups/Routing: when explicit origin routing fails, allow same-channel fallback dispatch (while still blocking cross-channel fallback) so followup replies do not get dropped on transient origin-adapter failures. (#26109) Thanks @Sid-Qin.
- Agents/Model fallback: continue fallback traversal on unrecognized errors when candidates remain, while still throwing the original unknown error on the last candidate. (#26106) Thanks @Sid-Qin.
- Telegram/Markdown spoilers: keep valid `||spoiler||` pairs while leaving unmatched trailing `||` delimiters as literal text, avoiding false all-or-nothing spoiler suppression. (#26105) Thanks @Sid-Qin.
- Hooks/Inbound metadata: include `guildId` and `channelName` in `message_received` metadata for both plugin and internal hook paths. (#26115) Thanks @davidrudduck.
- Discord/Component auth: evaluate guild component interactions with command-gating authorizers so unauthorized users no longer get `CommandAuthorized: true` on modal/button events. (#26119) Thanks @bmendonca3.
<<<<<<< HEAD
=======
- Discord/Typing indicator: prevent stuck typing indicators by sealing channel typing keepalive callbacks after idle/cleanup and ensuring Discord dispatch always marks typing idle even if preview-stream cleanup fails. (#26295) Thanks @ngutman.
- Channels/Typing indicator: guard typing keepalive start callbacks after idle/cleanup close so post-close ticks cannot re-trigger stale typing indicators. (#26325) Thanks @win4r.
- Followups/Typing indicator: ensure followup turns mark dispatch idle on every exit path (including `NO_REPLY`, empty payloads, and agent errors) so typing keepalive cleanup always runs and channel typing indicators do not get stuck after queued/silent followups. (#26881) Thanks @codexGW.
- Telegram/Preview cleanup: keep finalized text previews when a later assistant message is media-only (for example mixed text plus voice turns) by skipping finalized preview archival at assistant-message boundaries, preventing cleanup from deleting already-visible final text messages. (#27042)
- Slack/Allowlist channels: match channel IDs case-insensitively during channel allowlist resolution so lowercase config keys (for example `c0abc12345`) correctly match Slack runtime IDs (`C0ABC12345`) under `groupPolicy: "allowlist"`, preventing silent channel-event drops. (#26878) Thanks @lbo728.
- Voice-call/TTS tools: hide the `tts` tool when the message provider is `voice`, preventing voice-call runs from selecting self-playback TTS and falling into silent no-output loops. (#27025)
<<<<<<< HEAD
=======
- Agents/Tools: normalize non-standard plugin tool results that omit `content` so embedded runs no longer crash with `Cannot read properties of undefined (reading 'filter')` after tool completion (including `tesseramemo_query`). (#27007)
- Cron/Model overrides: when isolated `payload.model` is no longer allowlisted, fall back to default model selection instead of failing the job, while still returning explicit errors for invalid model strings. (#26717) Thanks @Youyou972.
- Agents/Model fallback: keep explicit text + image fallback chains reachable even when `agents.defaults.models` allowlists are present, prefer explicit run `agentId` over session-key parsing for followup fallback override resolution (with session-key fallback), treat agent-level fallback overrides as configured in embedded runner preflight, and classify `model_cooldown` / `cooling down` errors as `rate_limit` so failover continues. (#11972, #24137, #17231)
- Agents/Model fallback: keep same-provider fallback chains active when session model differs from configured primary, infer cooldown reason from provider profile state (instead of `disabledReason` only), keep no-profile fallback providers eligible (env/models.json paths), and only relax same-provider cooldown fallback attempts for `rate_limit`. (#23816) thanks @ramezgaberiel.
- Agents/Model fallback: continue fallback traversal on unrecognized errors when candidates remain, while still throwing the original unknown error on the last candidate. (#26106) Thanks @Sid-Qin.
- Models/Auth probes: map permanent auth failover reasons (`auth_permanent`, for example revoked keys) into probe auth status instead of `unknown`, so `openclaw models status --probe` reports actionable auth failures. (#25754) thanks @rrenamed.
- Hooks/Inbound metadata: include `guildId` and `channelName` in `message_received` metadata for both plugin and internal hook paths. (#26115) Thanks @davidrudduck.
- Discord/Component auth: evaluate guild component interactions with command-gating authorizers so unauthorized users no longer get `CommandAuthorized: true` on modal/button events. (#26119) Thanks @bmendonca3.
- Security/Gateway auth: require pairing for operator device-identity sessions authenticated with shared token auth so unpaired devices cannot self-assign operator scopes. Thanks @tdjackey for reporting.
- Security/Gateway WebSocket auth: enforce origin checks for direct browser WebSocket clients beyond Control UI/Webchat, apply password-auth failure throttling to browser-origin loopback attempts (including localhost), and block silent auto-pairing for non-Control-UI browser clients to prevent cross-origin brute-force and session takeover chains. This ships in the next npm release (`2026.2.25`). Thanks @luz-oasis for reporting.
- Security/Gateway trusted proxy: require `operator` role for the Control UI trusted-proxy pairing bypass so unpaired `node` sessions can no longer connect via `client.id=control-ui` and invoke node event methods. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/macOS beta onboarding: remove Anthropic OAuth sign-in and the legacy `oauth.json` onboarding path that exposed the PKCE verifier via OAuth `state`; this impacted the macOS beta onboarding path only. Anthropic subscription auth is now setup-token-only and will ship in the next npm release (`2026.2.25`). Thanks @zdi-disclosures for reporting.
- Security/Microsoft Teams file consent: bind `fileConsent/invoke` upload acceptance/decline to the originating conversation before consuming pending uploads, preventing cross-conversation pending-file upload or cancellation via leaked `uploadId` values; includes regression coverage for match/mismatch invoke handling. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Gateway: harden `agents.files` path handling to block out-of-workspace symlink targets for `agents.files.get`/`agents.files.set`, keep in-workspace symlink targets supported, and add gateway regression coverage for both blocked escapes and allowed in-workspace symlinks. Thanks @tdjackey for reporting.
- Security/Workspace FS: reject hardlinked workspace file aliases in `tools.fs.workspaceOnly` and `tools.exec.applyPatch.workspaceOnly` boundary checks (including sandbox mount-root guards) to prevent out-of-workspace read/write via in-workspace hardlink paths. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Browser temp paths: harden trace/download output-path handling against symlink-root and symlink-parent escapes with realpath-based write-path checks plus secure fallback tmp-dir validation that fails closed on unsafe fallback links. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Browser uploads: revalidate upload paths at use-time in Playwright file-chooser and direct-input flows so missing/rebound paths are rejected before `setFiles`, with regression coverage for strict missing-path handling.
- Security/Exec approvals: bind `system.run` approval matching to exact argv identity and preserve argv whitespace in rendered command text, preventing trailing-space executable path swaps from reusing a mismatched approval. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Exec approvals: harden approval-bound `system.run` execution on node hosts by rejecting symlink `cwd` paths and canonicalizing path-like executable argv before spawn, blocking mutable-cwd symlink retarget chains between approval and execution. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Signal: enforce DM/group authorization before reaction-only notification enqueue so unauthorized senders can no longer inject Signal reaction system events under `dmPolicy`/`groupPolicy`; reaction notifications now require channel access checks first. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Discord reactions: enforce DM policy/allowlist authorization before reaction-event system enqueue in direct messages; Discord reaction handling now also honors DM/group-DM enablement and guild `groupPolicy` channel gating to keep reaction ingress aligned with normal message preflight. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Slack reactions + pins: gate `reaction_*` and `pin_*` system-event enqueue through shared sender authorization so DM `dmPolicy`/`allowFrom` and channel `users` allowlists are enforced consistently for non-message ingress, with regression coverage for denied/allowed sender paths. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Telegram reactions: enforce `dmPolicy`/`allowFrom` and group allowlist authorization on `message_reaction` events before enqueueing reaction system events, preventing unauthorized reaction-triggered input in DMs and groups; ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Telegram group allowlist: fail closed for group sender authorization by removing DM pairing-store fallback from group allowlist evaluation; group sender access now requires explicit `groupAllowFrom` or per-group/per-topic `allowFrom`. (#25988) Thanks @bmendonca3.
- Security/Slack interactions: enforce channel/DM authorization and modal actor binding (`private_metadata.userId`) before enqueueing `block_action`/`view_submission`/`view_closed` system events, with regression coverage for unauthorized senders and missing/mismatched actor metadata. This ships in the next npm release (`2026.2.25`). Thanks @tdjackey for reporting.
- Security/Nextcloud Talk: drop replayed signed webhook events with persistent per-account replay dedupe across restarts, and reject unexpected webhook backend origins when account base URL is configured. Thanks @aristorechina for reporting.
- Security/Nextcloud Talk: reject unsigned webhook traffic before full body reads, reducing unauthenticated request-body exposure, with auth-order regression coverage. (#26118) Thanks @bmendonca3.
- Security/Nextcloud Talk: stop treating DM pairing-store entries as group allowlist senders, so group authorization remains bounded to configured group allowlists. (#26116) Thanks @bmendonca3.
- Security/LINE: cap unsigned webhook body reads before auth/signature handling to bound unauthenticated body processing. (#26095) Thanks @bmendonca3.
- Security/IRC: keep pairing-store approvals DM-only and out of IRC group allowlist authorization, with policy regression tests for allowlist resolution. (#26112) Thanks @bmendonca3.
- Security/Microsoft Teams: isolate group allowlist and command authorization from DM pairing-store entries to prevent cross-context authorization bleed. (#26111) Thanks @bmendonca3.
- Security/SSRF guard: classify IPv6 multicast literals (`ff00::/8`) as blocked/private-internal targets in shared SSRF IP checks, preventing multicast literals from bypassing URL-host preflight and DNS answer validation. This ships in the next npm release (`2026.2.25`). Thanks @zpbrent for reporting.
>>>>>>> 3b0298562 (fix: document telegram group allowlist hardening (#25988) (thanks @bmendonca3))
- Tests/Low-memory stability: disable Vitest `vmForks` by default on low-memory local hosts (`<64 GiB`), keep low-profile extension lane parallelism at 4 workers, and align cron isolated-agent tests with `setSessionRuntimeModel` usage to avoid deterministic suite failures. (#26324) Thanks @ngutman.
>>>>>>> 8f8e2b13b (fix: disable tts tool for voice provider)
- Slack/Inbound media fallback: deliver file-only messages even when Slack media downloads fail by adding a filename placeholder fallback, capping fallback names to the shared media-file limit, and normalizing empty filenames to `file` so attachment-only messages are not silently dropped. (#25181) Thanks @justinhuangcode.

## 2026.2.24

### Changes

- Auto-reply/Abort shortcuts: expand standalone stop phrases (`stop openclaw`, `stop action`, `stop run`, `stop agent`, `please stop`, and related variants), accept trailing punctuation (for example `STOP OPENCLAW!!!`), add multilingual stop keywords (including ES/FR/ZH/HI/AR/JP/DE/PT/RU forms), and treat exact `do not do that` as a stop trigger while preserving strict standalone matching. (#25103) Thanks @steipete and @vincentkoc.
- Android/App UX: ship a native four-step onboarding flow, move post-onboarding into a five-tab shell (Connect, Chat, Voice, Screen, Settings), add a full Connect setup/manual mode screen, and refresh Android chat/settings surfaces for the new navigation model.
- Talk/Gateway config: add provider-agnostic Talk configuration with legacy compatibility, and expose gateway Talk ElevenLabs config metadata for setup/status surfaces.
- Security/Audit: add `security.trust_model.multi_user_heuristic` to flag likely shared-user ingress and clarify the personal-assistant trust model, with hardening guidance for intentional multi-user setups (`sandbox.mode="all"`, workspace-scoped FS, reduced tool surface, no personal/private identities on shared runtimes).
- Dependencies: refresh key runtime and tooling packages across the workspace (Bedrock SDK, pi runtime stack, OpenAI, Google auth, and oxlint/oxfmt), while intentionally keeping `@buape/carbon` pinned.
>>>>>>> b247cd6d6 (fix: harden Slack file-only fallback placeholder (#25181) (thanks @justinhuangcode))

<<<<<<< HEAD
## 2026.2.22 (Unreleased)
>>>>>>> 042947b94 (fix: add mistral to MemorySearchSchema provider/fallback unions (#14934))
=======
### Breaking

- **BREAKING:** non-loopback Control UI now requires explicit `gateway.controlUi.allowedOrigins` (full origins). Startup fails closed when missing unless `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` is set to use Host-header origin fallback mode.

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
=======
=======
=======
=======
=======
- Security/Native images: enforce `tools.fs.workspaceOnly` for native prompt image auto-load (including history refs), preventing out-of-workspace sandbox mounts from being implicitly ingested as vision input.
<<<<<<< HEAD
>>>>>>> 370d11554 (fix: enforce workspaceOnly for native prompt image autoload)
=======
=======
=======
=======
=======
=======
- iMessage/Reasoning safety: harden iMessage echo suppression with outbound `messageId` matching (plus scoped text fallback), and enforce reasoning-payload suppression on routed outbound delivery paths to prevent hidden thinking text from being sent as user-visible channel messages. (#25897, #1649, #25757) Thanks @rmarr and @Iranb.
>>>>>>> 2a11c09a8 (fix: harden iMessage echo dedupe and reasoning suppression (#25897))
- Windows/Media safety checks: align async local-file identity validation with sync-safe-open behavior by treating win32 `dev=0` stats as unknown-device fallbacks (while keeping strict dev checks when both sides are non-zero), fixing false `Local media path is not safe to read` drops for local attachments/TTS/images. (#25708, #21989, #25699, #25878) Thanks @kevinWangSheng.
- macOS/WebChat panel: fix rounded-corner clipping by using panel-specific visual-effect blending and matching corner masking on both effect and hosting layers. (#22458) Thanks @apethree and @agisilaos.
- macOS/IME input: when marked text is active, treat Return as IME candidate confirmation first in both the voice overlay composer and shared chat composer to prevent accidental sends while composing CJK text. (#25178) Thanks @bottotl.
- macOS/Voice wake routing: default forwarded voice-wake transcripts to the `webchat` channel (instead of ambiguous `last` routing) so local voice prompts stay pinned to the control chat surface unless explicitly overridden. (#25440) Thanks @chilu18.
- macOS/Gateway launch: prefer an available `openclaw` binary before pnpm/node runtime fallback when resolving local gateway commands, so local startup no longer fails on hosts with broken runtime discovery. (#25512) Thanks @chilu18.
- macOS/Voice input: guard all audio-input startup paths against missing default microphones (Voice Wake, Talk Mode, Push-to-Talk, mic-level monitor, tester) to avoid launch/runtime crashes on mic-less Macs and fail gracefully until input becomes available. (#25817) Thanks @sfo2001.
>>>>>>> 943b8f171 (fix: align windows safe-open file identity checks)
- Gateway/Security: enforce gateway auth for the exact `/api/channels` plugin root path (plus `/api/channels/` descendants), with regression coverage for query/trailing-slash variants and near-miss paths that must remain plugin-owned. (#25753) Thanks @bmendonca3.
- Security/Exec: sanitize inherited host execution environment before merge, canonicalize inherited PATH handling, and strip dangerous keys (`LD_*`, `DYLD_*`, `SSLKEYLOGFILE`, and related injection vectors) from non-sandboxed exec runs. (#25755) Thanks @bmendonca3.
- Security/Hooks: normalize hook session-key classification with trim/lowercase plus Unicode NFKC folding (for example full-width `ＨＯＯＫ：...`) so external-content wrapping cannot be bypassed by mixed-case or lookalike prefixes. (#25750) Thanks @bmendonca3.
- Security/Voice Call: add Telnyx webhook replay detection and canonicalize replay-key signature encoding (Base64/Base64URL equivalent forms dedupe together), so duplicate signed webhook deliveries no longer re-trigger side effects. (#25832) Thanks @bmendonca3.
<<<<<<< HEAD
=======
- Providers/OpenRouter/Auth profiles: bypass auth-profile cooldown/disable windows for OpenRouter, so provider failures no longer put OpenRouter profiles into local cooldown and stale legacy cooldown markers are ignored in fallback and status selection paths. (#25892) Thanks @alexanderatallah for raising this and @vincentkoc for the fix.
- Providers/Google reasoning: sanitize invalid negative `thinkingBudget` payloads for Gemini 3.1 requests by dropping `-1` budgets and mapping configured reasoning effort to `thinkingLevel`, preventing malformed reasoning payloads on `google-generative-ai`. (#25900)
>>>>>>> b35d00aaf (fix: sanitize Gemini 3.1 Google reasoning payloads)
- WhatsApp/Web reconnect: treat close status `440` as non-retryable (including string-form status values), stop reconnect loops immediately, and emit operator guidance to relink after resolving session conflicts. (#25858) Thanks @markmusson.
- WhatsApp/Reasoning safety: suppress outbound payloads marked as reasoning and hard-drop text payloads that begin with `Reasoning:` before WhatsApp delivery, preventing hidden thinking blocks from leaking to end users through final-message paths. (#25804, #25214, #24328)
- Onboarding/Telegram: keep core-channel onboarding available when plugin registry population is missing by falling back to built-in adapters and continuing wizard setup with actionable recovery guidance. (#25803) Thanks @Suko.
- Models/Bedrock auth: normalize additional Bedrock provider aliases (`bedrock`, `aws-bedrock`, `aws_bedrock`, `amazon bedrock`) to canonical `amazon-bedrock`, ensuring auth-mode resolution consistently selects AWS SDK fallback. (#25756) Thanks @fwhite13.
- Automation/Subagent/Cron reliability: honor `ANNOUNCE_SKIP` in `sessions_spawn` completion/direct announce flows (no user-visible token leaks), add transient direct-announce retries for channel unavailability (for example WhatsApp listener reconnect windows), and include `cron` in the `coding` tool profile so `/tools/invoke` can execute cron actions when explicitly allowed by gateway policy. (#25800, #25656, #25842, #25813, #25822, #25821) Thanks @astra-fer, @aaajiao, @dwight11232-coder, @kevinWangSheng, @widingmarcus-cyber, and @stakeswky.
- Discord/Proxy + reactions + model picker: thread channel proxy fetch into inbound media/sticker downloads, use proxy-aware gateway metadata fetch for WSL/corporate proxy setups, wire `messages.statusReactions.{emojis,timing}` into Discord reaction lifecycle control, and compact model-picker `custom_id` keys to stay under Discord's 100-char limit while keeping backward-compatible parsing. (#25232, #25507, #25564, #25695) Thanks @openperf, @chilu18, @Yipsh, @lbo728, and @s1korrrr.
- Discord/Block streaming: restore block-streamed reply delivery by suppressing only reasoning payloads (instead of all `block` payloads), fixing missing Discord replies in `channels.discord.streaming=block` mode. (#25839, #25836, #25792) Thanks @pewallin.
- Matrix/Read receipts: send read receipts as soon as Matrix messages arrive (before handler pipeline work), so clients no longer show long-lived unread/sent states while replies are processing. (#25841, #25840) Thanks @joshjhall.
- Sandbox/FS bridge: build canonical-path shell scripts with newline separators (not `; ` joins) to avoid POSIX `sh` `do;` syntax errors that broke sandbox file/image read-write operations. (#25737, #25824, #25868) Thanks @DennisGoldfinger and @peteragility.
<<<<<<< HEAD
>>>>>>> 97e56cb73 (fix(discord): land proxy/media/reaction/model-picker regressions)
=======
- Sandbox/FS bridge tests: add regression coverage for dash-leading basenames to confirm sandbox file reads resolve to absolute container paths (and avoid shell-option misdiagnosis for dashed filenames). (#25891) Thanks @albertlieyingadrian.
<<<<<<< HEAD
>>>>>>> c7ae4ed04 (fix: harden sandbox fs dash-path regression coverage (#25891) (thanks @albertlieyingadrian))
=======
- Sandbox/Config: preserve `dangerouslyAllowReservedContainerTargets` and `dangerouslyAllowExternalBindSources` during sandbox docker config resolution so explicit bind-mount break-glass overrides reach runtime validation. (#25410) Thanks @skyer-jian.
>>>>>>> e28803503 (fix: add sandbox bind-override regression coverage (#25410) (thanks @skyer-jian))
- Routing/Session isolation: harden followup routing so explicit cross-channel origin replies never fall back to the active dispatcher on route failure, preserve queued overflow summary routing metadata (`channel`/`to`/`thread`) across followup drain, and prefer originating channel context over internal provider tags for embedded followup runs. This prevents webchat/control-ui context from hijacking Discord-targeted replies in shared sessions. (#25864) Thanks @Gamedesigner.
- Security/Routing: fail closed for shared-session cross-channel replies by binding outbound target resolution to the current turn’s source channel metadata (instead of stale session route fallbacks), and wire those turn-source fields through gateway + command delivery planners with regression coverage. (#24571) Thanks @brandonwise.
- Messaging tool dedupe: treat originating channel metadata as authoritative for same-target `message.send` suppression in proactive runs (heartbeat/cron/exec-event), including synthetic-provider contexts, so `delivery-mirror` transcript entries no longer cause duplicate Telegram sends. (#25835) Thanks @jadeathena84-arch.
- Cron/Heartbeat delivery: stop inheriting cached session `lastThreadId` for heartbeat-mode target resolution unless a thread/topic is explicitly requested, so announce-mode cron and heartbeat deliveries stay on top-level destinations instead of leaking into active conversation threads. (#25730) Thanks @markshields-tl.
<<<<<<< HEAD
>>>>>>> ccbeb332e (fix: harden routing/session isolation for followups and heartbeat)
- Security/Sandbox media: restrict sandbox media tmp-path allowances to OpenClaw-managed tmp roots instead of broad host `os.tmpdir()` trust, and add outbound/channel guardrails (tmp-path lint + media-root smoke tests) to prevent regressions in local media attachment reads.
=======
- Heartbeat defaults/prompts: switch the implicit heartbeat delivery target from `last` to `none` (opt-in for external delivery), and use internal-only cron/exec heartbeat prompt wording when delivery is disabled so background checks do not nudge user-facing relay behavior. (#25871, #24638, #25851)
- Auto-reply/Heartbeat queueing: drop heartbeat runs when a session already has an active run instead of enqueueing a stale followup, preventing duplicate heartbeat response branches after queue drain. (#25610, #25606) Thanks @mcaxtr.
- Channels/Typing keepalive: refresh channel typing callbacks on a keepalive interval during long replies and clear keepalive timers on idle/cleanup across core + extension dispatcher callsites so typing indicators do not expire mid-inference. (#25886, #25882) Thanks @stakeswky.
- Security/Sandbox media: restrict sandbox media tmp-path allowances to OpenClaw-managed tmp roots instead of broad host `os.tmpdir()` trust, and add outbound/channel guardrails (tmp-path lint + media-root smoke tests) to prevent regressions in local media attachment reads. Thanks @tdjackey for reporting.
- Security/Sandbox media: reject hard-linked OpenClaw tmp media aliases (including symlink-to-hardlink chains) during sandbox media path resolution to prevent out-of-sandbox inode alias reads. (#25820) Thanks @bmendonca3.
>>>>>>> 6fa7226a6 (fix: add changelog thanks for #25820 (thanks @bmendonca3))
- Config/Plugins: treat stale removed `google-antigravity-auth` plugin references as compatibility warnings (not hard validation errors) across `plugins.entries`, `plugins.allow`, `plugins.deny`, and `plugins.slots.memory`, so startup no longer fails after antigravity removal. (#25538, #25862) Thanks @chilu18.
- Security/Message actions: enforce local media root checks for `sendAttachment` and `setGroupIcon` when `sandboxRoot` is unset, preventing attachment hydration from reading arbitrary host files via local absolute paths. This ships in the next npm release. Thanks @GCXWLP for reporting.
- Security/Workspace FS: normalize `@`-prefixed paths before workspace-boundary checks (including workspace-only read/write/edit and sandbox mount path guards), preventing absolute-path escape attempts from bypassing guard validation. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Native images: enforce `tools.fs.workspaceOnly` for native prompt image auto-load (including history refs), preventing out-of-workspace sandbox mounts from being implicitly ingested as vision input. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Exec approvals: bind `system.run` command display/approval text to full argv when shell-wrapper inline payloads carry positional argv values, and reject payload-only `rawCommand` mismatches for those wrapper-carrier forms, preventing hidden command execution under misleading approval text. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Exec: limit default safe-bin trusted directories to immutable system paths (`/bin`, `/usr/bin`) and require explicit opt-in (`tools.exec.safeBinTrustedDirs`) for package-manager/user bin paths (for example Homebrew), preventing writable-dir binary shadowing from auto-satisfying safe-bin allowlist checks. This ships in the next npm release. Thanks @tdjackey for reporting.
>>>>>>> 270ab03e3 (fix: enforce local media root checks for attachment hydration)
- Telegram/Media fetch: prioritize IPv4 before IPv6 in SSRF pinned DNS address ordering so media downloads still work on hosts with broken IPv6 routing. (#24295, #23975) Thanks @Glucksberg.
<<<<<<< HEAD
>>>>>>> 3f07d725b (fix: changelog credit for Telegram IPv4 fallback fix (#24295) (thanks @Glucksberg))
=======
- Telegram/Replies: when markdown formatting renders to empty HTML (for example syntax-only chunks in threaded replies), retry delivery with plain text, and fail loud when both formatted and plain payloads are empty to avoid false delivered states. (#25096, #25091) Thanks @Glucksberg.
>>>>>>> f154926cc (fix: land telegram empty-html fallback hardening (#25096) (thanks @Glucksberg))
- Sessions/Tool-result guard: avoid generating synthetic `toolResult` entries for assistant turns that ended with `stopReason: "aborted"` or `"error"`, preventing orphaned tool-use IDs from triggering downstream API validation errors. (#25429) Thanks @mikaeldiakhate-cell.
>>>>>>> 6da03eabe (fix: add changelog and clean regression comment for tool-result guard (#25429) (thanks @mikaeldiakhate-cell))
- Usage accounting: parse Moonshot/Kimi `cached_tokens` fields (including `prompt_tokens_details.cached_tokens`) into normalized cache-read usage metrics. (#25436) Thanks @Elarwei001.
>>>>>>> 760671e31 (fix: add changelog for kimi cache usage parsing (#25436) (thanks @Elarwei001))
- Doctor/Sandbox: when sandbox mode is enabled but Docker is unavailable, surface a clear actionable warning (including failure impact and remediation) instead of a mild “skip checks” note. (#25438) Thanks @mcaxtr.
>>>>>>> b511a38fc (fix: add changelog for doctor sandbox docker warning (#25438) (thanks @mcaxtr))
- Config/Meta: accept numeric `meta.lastTouchedAt` timestamps and coerce them to ISO strings, preserving compatibility with agent edits that write `Date.now()` values. (#25491) Thanks @mcaxtr.
>>>>>>> d2c031de8 (fix: add changelog for meta timestamp coercion (#25491) (thanks @mcaxtr))
- Auto-reply/Reset hooks: guarantee native `/new` and `/reset` flows emit command/reset hooks even on early-return command paths, with dedupe protection to avoid double hook emission. (#25459) Thanks @chilu18.
>>>>>>> 0365125c2 (fix: add changelog for reset hook fallback coverage (#25459) (thanks @chilu18))
- Hooks/Slug generator: resolve session slug model from the agent’s effective model (including defaults/fallback resolution) instead of raw agent-primary config only. (#25485) Thanks @SudeepMalipeddi.
>>>>>>> bbdf895d4 (fix: add changelog for slug generator model resolution (#25485) (thanks @SudeepMalipeddi))
- Slack/DM routing: treat `D*` channel IDs as direct messages even when Slack sends an incorrect `channel_type`, preventing DM traffic from being misclassified as channel/group chats. (#25479) Thanks @mcaxtr.
>>>>>>> 5e6fe9c16 (fix: add changelog for slack dm channel-type guard (#25479) (thanks @mcaxtr))
- Models/Providers: preserve explicit user `reasoning` overrides when merging provider model config with built-in catalog metadata, so `reasoning: false` is no longer overwritten by catalog defaults. (#25314) Thanks @lbo728.
>>>>>>> 39631639b (fix: add changelog + typed omission test note (#25314) (thanks @lbo728))
- Exec approvals: treat bare allowlist `*` as a true wildcard for parsed executables, including unresolved PATH lookups, so global opt-in allowlists work as configured. (#25250) Thanks @widingmarcus-cyber.
>>>>>>> 07f653ffc (fix: polish bare wildcard allowlist handling (#25250) (thanks @widingmarcus-cyber))
- Gateway/Auth: allow trusted-proxy authenticated Control UI websocket sessions to skip device pairing when device identity is absent, preventing false `pairing required` failures behind trusted reverse proxies. (#25428) Thanks @SidQin-cyber.
>>>>>>> e9216cb7d (fix: add changelog for trusted-proxy pairing bypass (#25428) (thanks @SidQin-cyber))
- Agents/Tool dispatch: await block-reply flush before tool execution starts so buffered block replies preserve message ordering around tool calls. (#25427) Thanks @SidQin-cyber.
>>>>>>> d84659f22 (fix: add changelog for block-reply flush await (#25427) (thanks @SidQin-cyber))
- macOS/Menu bar: stop reusing the injector delegate for the "Usage cost (30 days)" submenu to prevent recursive submenu injection loops when opening cost history. (#25341) Thanks @yingchunbai.
<<<<<<< HEAD
- Control UI/Chat images: harden image-open clicks against reverse tabnabbing by using opener isolation (`noopener,noreferrer` plus `window.opener = null`). (#18685) Thanks @Mariana-Codebase.
- Security/iOS deep links: require local confirmation (or trusted key) before forwarding `openclaw://agent` requests from iOS to gateway `agent.request`, and strip unkeyed delivery-routing fields to reduce exfiltration risk. This ships in the next npm release. Thanks @GCXWLP for reporting.
- Security/Export session HTML: escape raw HTML markdown tokens in the exported session viewer, harden tree/header metadata rendering against HTML injection, and sanitize image data-URL MIME types in export output to prevent stored XSS when opening exported HTML files. This ships in the next npm release. Thanks @allsmog for reporting.
- Security/Session export: harden exported HTML image rendering against data-URL attribute injection by validating image MIME/base64 fields, rejecting malformed base64 input in media ingestion paths, and dropping invalid tool-image payloads.
- Security/Image tool: enforce `tools.fs.workspaceOnly` for sandboxed `image` path resolution so mounted out-of-workspace paths are blocked before media bytes are loaded/sent to vision providers. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Sandbox: enforce `tools.exec.applyPatch.workspaceOnly` and `tools.fs.workspaceOnly` for `apply_patch` in sandbox-mounted paths so writes/deletes cannot escape the workspace boundary via mounts like `/agent` unless explicitly opted out (`tools.exec.applyPatch.workspaceOnly=false`). This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Commands: enforce sender-only matching for `commands.allowFrom` by blocking conversation-shaped `From` identities (`channel:`, `group:`, `thread:`, `@g.us`) while preserving direct-message fallback when sender fields are missing. Ships in the next npm release. Thanks @jiseoung.
- Security/Config writes: block reserved prototype keys in account-id normalization and route account config resolution through own-key lookups, hardening `/allowlist` and account-scoped config paths against prototype-chain pollution.
- Security/Channels: unify dangerous name-matching policy checks (`dangerouslyAllowNameMatching`) across core and extension channels, share mutable-allowlist detectors between `openclaw doctor` and `openclaw security audit`, and scan all configured accounts (not only the default account) in channel security audit findings.
- Security/Exec approvals: bind `host=node` approvals to explicit `nodeId`, reject cross-node replay of approved `system.run` requests, and include the target node in approval prompts. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Exec approvals: restore two-phase approval registration + wait-decision handling for gateway/node exec paths, requiring approval IDs to be registered before returning `approval-pending` and honoring server-assigned approval IDs during wait resolution to prevent orphaned `/approve` flows and immediate-return races (`ask:on-miss`). This ships in the next npm release. Thanks @vitalyis for reporting.
- Security/Exec approvals: enforce canonical wrapper execution plans across allowlist analysis and runtime execution (node host + gateway host), fail closed on semantic `env` wrapper usage, and reject unknown short safe-bin flags to prevent `env -S/--split-string` interpretation-mismatch bypasses. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Exec approvals: recognize `busybox`/`toybox` shell applets in wrapper analysis and allow-always persistence, persist inner executables instead of multiplexer wrapper binaries, and fail closed when multiplexer unwrapping is unsafe to prevent allow-always bypasses. This ships in the next npm release. Thanks @jiseoung for reporting.
- Security/Exec approvals: for non-default setups that enable `autoAllowSkills`, require pathless invocations plus trusted resolved-path matches so `./<skill-bin>`/absolute-path basename collisions cannot satisfy skill auto-allow checks under allowlist mode. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Exec: harden `safeBins` long-option validation by rejecting unknown/ambiguous GNU long-option abbreviations and denying sort filesystem-dependent flags (`--random-source`, `--temporary-directory`, `-T`), closing safe-bin denylist bypasses. This ships in the next npm release. Thanks @tdjackey and @jiseoung for reporting.
- Security/Shell env fallback: remove trusted-prefix shell-path fallback and only trust login shells explicitly registered in `/etc/shells`, defaulting to `/bin/sh` when `SHELL` is not registered. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Voice Call: harden Twilio webhook replay handling by preserving provider event IDs through normalization, adding bounded replay dedupe, and enforcing per-call turn-token matching for call-state transitions. This ships in the next npm release. Thanks @jiseoung for reporting.
- Telegram/Media SSRF: keep RFC2544 benchmark range (`198.18.0.0/15`) blocked by default, add an explicit SSRF-policy opt-in for Telegram media downloads, and keep other channels/URL fetch paths blocked. (#24982) Thanks @stakeswky.
- WhatsApp/Auto-reply: send only final payloads to WhatsApp, suppress tool/block payload leakage (reasoning/thinking), and force block streaming off for WhatsApp dispatch so final-only delivery cannot cause silent turns. (#24962) Thanks @SidQin-cyber.
- Channels/Reasoning: suppress reasoning/thinking payload segments in the shared channel dispatch path so non-Telegram channels (including WhatsApp and Web) no longer emit internal reasoning blocks as user-visible replies. (#24991) Thanks @stakeswky.
- Discord/Reasoning: suppress reasoning/thinking-only payload blocks from Discord delivery output. (#24969)
- WhatsApp/DM routing: only update main-session last-route state when DM traffic is bound to the main session, preserving isolated `dmScope` routing. (#24949) Thanks @kevinWangSheng.
- WhatsApp/Access control: honor `selfChatMode` in inbound access-control checks. (#24738)
- WhatsApp/Logging: redact outbound recipient identifiers in WhatsApp outbound + heartbeat logs and remove message/poll preview text from those log lines. (#24980) Thanks @coygeek.
- Discord/Threading: recover missing thread parent IDs by refetching thread metadata before resolving parent channel context. (#24897) Thanks @z-x-yang.
- Web UI/i18n: load and hydrate saved locale translations during startup so non-English sessions apply immediately without manual toggling. (#24795) Thanks @chilu18.
- Gateway/Browser control: load `src/browser/server.js` during browser-control startup so the control listener starts reliably when browser control is enabled. (#23974) Thanks @ieaves.
- Browser/Chrome relay: harden debugger detach handling during full-page navigation with bounded auto-reattach retries and better cancellation behavior for user/devtools detaches. (#19766) Thanks @nishantkabra77.
- Browser/Chrome extension options: validate relay `/json/version` payload shape and content type (not just HTTP status) to detect wrong-port gateway checks, and clarify relay port derivation for custom gateway ports (`gateway + 3`). (#22252) Thanks @krizpoon.
- Status/Pairing recovery: show explicit pairing-approval command hints (including requestId when safe) when gateway probe failures report pairing-required closures. (#24771) Thanks @markmusson.
>>>>>>> 7c99a733a (fix: harden macOS usage cost submenu recursion guard (#25341) (thanks @yingchunbai))
- Onboarding/Custom providers: raise verification probe token budgets for OpenAI and Anthropic compatibility checks to avoid false negatives on strict provider defaults. (#24743) Thanks @Glucksberg.
>>>>>>> a388fbb6c (fix: harden custom-provider verification probes (#24743) (thanks @Glucksberg))
- WhatsApp/DM routing: only update main-session last-route state when DM traffic is bound to the main session, preserving isolated `dmScope` routing. (#24949) Thanks @kevinWangSheng.
>>>>>>> ebde897bb (fix: add dmScope route guard regression tests (#24949) (thanks @kevinWangSheng))
- Providers/OpenRouter: when thinking is explicitly off, avoid injecting `reasoning.effort` so reasoning-required models can use provider defaults instead of failing request validation. (#24863) Thanks @DevSecTim.
>>>>>>> de0e01259 (fix: expand openrouter thinking-off regression coverage (#24863) (thanks @DevSecTim))
- Status/Pairing recovery: show explicit pairing-approval command hints (including requestId when safe) when gateway probe failures report pairing-required closures. (#24771) Thanks @markmusson.
>>>>>>> 69a541c3f (fix: sanitize pairing recovery requestId hints (#24771) (thanks @markmusson))
- Discord/Threading: recover missing thread parent IDs by refetching thread metadata before resolving parent channel context. (#24897) Thanks @z-x-yang.
>>>>>>> a216f2dab (fix: extend discord thread parent fallback coverage (#24897) (thanks @z-x-yang))
- Web UI/i18n: load and hydrate saved locale translations during startup so non-English sessions apply immediately without manual toggling. (#24795) Thanks @chilu18.
>>>>>>> fd24b3544 (fix: cover startup locale hydration path (#24795) (thanks @chilu18))
- Plugins/Config schema: support legacy plugin schemas without `toJSONSchema()` by falling back to permissive object schema generation. (#24933) Thanks @pandego.
>>>>>>> 7a42558a3 (fix: harden legacy plugin schema compatibility tests (#24933) (thanks @pandego))
- Cron/Isolated sessions: use full prompt mode for isolated cron runs so skills/extensions are available during cron execution. (#24944)
- Discord/Reasoning: suppress reasoning/thinking-only payload blocks from Discord delivery output. (#24969)
- Sessions/Reasoning: persist `reasoningLevel: "off"` explicitly instead of deleting it so session overrides survive patch/update flows. (#24406, #24559)
- Plugins/Config: use plugin manifest `id` (instead of npm package name) for config entry keys so plugin settings stay bound correctly. (#24796)
- Synology Chat/Webhooks: deregister stale webhook routes before re-registering on channel restart to prevent duplicate route handling. (#24971)
- Gateway/Prompt builder: safely extract text from mixed content arrays when assembling prompts to avoid malformed prompt payloads. (#24946)
- WhatsApp/Access control: honor `selfChatMode` in inbound access-control checks. (#24738)
- Slack/Restart sentinel: map `threadId` to `replyToId` for restart sentinel notifications. (#24885)
- Gateway/Slug generation: respect agent-level model config in slug generation flows. (#24776)
- Agents/Workspace paths: strip null bytes and guard undefined `.trim()` calls for workspace-path handling to avoid `ENOTDIR`/`TypeError` crashes. (#24876, #24875)
- Auth/OAuth: classify missing OAuth scopes as auth failures for clearer remediation and retry behavior. (#24761)
- Doctor/UX: suppress the redundant "Run doctor --fix" hint when already in fix mode with no changes. (#24666)
- Doctor/Nix: skip false-positive permission warnings for Nix store symlinks in state-integrity checks. (#24901)
- Update/Systemd: back up an existing systemd unit before overwriting it during update flows. (#24350, #24937)
- Install/Global detection: resolve symlinks when detecting pnpm/bun global install paths. (#24744)
- Infra/Windows TOCTOU: handle Windows `dev=0` edge cases in same-file identity checks. (#24939)
- Exec/Bash tools: clamp poll sleep duration to non-negative values in process polling loops. (#24889)
- Subagents/Announce queue: add exponential backoff when queue-drain delivery fails to reduce retry storms. (#24783)
- Config/Kilo Gateway: Kilo provider flow now surfaces an updated list of models. (#24921) thanks @gumadeiras.
- Agents/Tool warnings: suppress `sessions_send` relay errors from chat-facing warning payloads to avoid leaking transient inter-session transport failures. (#24740) Thanks @Glucksberg.
>>>>>>> dd145f134 (fix: suppress sessions_send warning leakage coverage (#24740) (thanks @Glucksberg))
- WhatsApp/Logging: redact outbound recipient identifiers in WhatsApp outbound + heartbeat logs and remove message/poll preview text from those log lines. (#24980) Thanks @coygeek.
- WhatsApp/Auto-reply: send only final payloads to WhatsApp, suppress tool/block payload leakage (reasoning/thinking), and force block streaming off for WhatsApp dispatch so final-only delivery cannot cause silent turns. (#24962) Thanks @SidQin-cyber.
<<<<<<< HEAD
>>>>>>> b5881d9ef (fix: avoid WhatsApp silent turns with final-only delivery (#24962) (thanks @SidQin-cyber))
=======
- Channels/Reasoning: suppress reasoning/thinking payload segments in the shared channel dispatch path so non-Telegram channels (including WhatsApp and Web) no longer emit internal reasoning blocks as user-visible replies. (#24991) Thanks @stakeswky.
>>>>>>> d427d09b5 (fix: align reasoning payload typing for #24991 (thanks @stakeswky))
- Telegram/Media SSRF: keep RFC2544 benchmark range (`198.18.0.0/15`) blocked by default, add an explicit SSRF-policy opt-in for Telegram media downloads, and keep other channels/URL fetch paths blocked. (#24982) Thanks @stakeswky.
>>>>>>> 3af9d1f8e (fix: scope Telegram RFC2544 SSRF exception to policy opt-in (#24982) (thanks @stakeswky))
- Security/Shell env fallback: remove trusted-prefix shell-path fallback and only trust login shells explicitly registered in `/etc/shells`, defaulting to `/bin/sh` when `SHELL` is not registered. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Exec approvals: bind `host=node` approvals to explicit `nodeId`, reject cross-node replay of approved `system.run` requests, and include the target node in approval prompts. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Exec approvals: restore two-phase approval registration + wait-decision handling for gateway/node exec paths, requiring approval IDs to be registered before returning `approval-pending` and honoring server-assigned approval IDs during wait resolution to prevent orphaned `/approve` flows and immediate-return races (`ask:on-miss`). This ships in the next npm release. Thanks @vitalyis for reporting.
- Security/Voice Call: harden Twilio webhook replay handling by preserving provider event IDs through normalization, adding bounded replay dedupe, and enforcing per-call turn-token matching for call-state transitions. This ships in the next npm release. Thanks @jiseoung for reporting.
- Security/Export session HTML: escape raw HTML markdown tokens in the exported session viewer, harden tree/header metadata rendering against HTML injection, and sanitize image data-URL MIME types in export output to prevent stored XSS when opening exported HTML files. This ships in the next npm release. Thanks @allsmog for reporting.
- Security/iOS deep links: require local confirmation (or trusted key) before forwarding `openclaw://agent` requests from iOS to gateway `agent.request`, and strip unkeyed delivery-routing fields to reduce exfiltration risk. This ships in the next npm release. Thanks @GCXWLP for reporting.
- Security/Exec approvals: for non-default setups that enable `autoAllowSkills`, require pathless invocations plus trusted resolved-path matches so `./<skill-bin>`/absolute-path basename collisions cannot satisfy skill auto-allow checks under allowlist mode. This ships in the next npm release. Thanks @tdjackey for reporting.
>>>>>>> 7b2b86c60 (fix(exec): add approval race changelog and regressions)
- Security/Commands: enforce sender-only matching for `commands.allowFrom` by blocking conversation-shaped `From` identities (`channel:`, `group:`, `thread:`, `@g.us`) while preserving direct-message fallback when sender fields are missing. Ships in the next npm release. Thanks @jiseoung.
- Config/Kilo Gateway: Kilo provider flow now surfaces an updated list of models. (#24921) thanks @gumadeiras.
- Security/Sandbox: enforce `tools.exec.applyPatch.workspaceOnly` and `tools.fs.workspaceOnly` for `apply_patch` in sandbox-mounted paths so writes/deletes cannot escape the workspace boundary via mounts like `/agent` unless explicitly opted out (`tools.exec.applyPatch.workspaceOnly=false`). This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Config writes: block reserved prototype keys in account-id normalization and route account config resolution through own-key lookups, hardening `/allowlist` and account-scoped config paths against prototype-chain pollution.
- Security/Exec: harden `safeBins` long-option validation by rejecting unknown/ambiguous GNU long-option abbreviations and denying sort filesystem-dependent flags (`--random-source`, `--temporary-directory`, `-T`), closing safe-bin denylist bypasses. Thanks @jiseoung.
- Security/Channels: unify dangerous name-matching policy checks (`dangerouslyAllowNameMatching`) across core and extension channels, share mutable-allowlist detectors between `openclaw doctor` and `openclaw security audit`, and scan all configured accounts (not only the default account) in channel security audit findings.
- Security/Exec approvals: enforce canonical wrapper execution plans across allowlist analysis and runtime execution (node host + gateway host), fail closed on semantic `env` wrapper usage, and reject unknown short safe-bin flags to prevent `env -S/--split-string` interpretation-mismatch bypasses. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Exec approvals: recognize `busybox`/`toybox` shell applets in wrapper analysis and allow-always persistence, persist inner executables instead of multiplexer wrapper binaries, and fail closed when multiplexer unwrapping is unsafe to prevent allow-always bypasses. This ships in the next npm release. Thanks @jiseoung for reporting.
- Security/Image tool: enforce `tools.fs.workspaceOnly` for sandboxed `image` path resolution so mounted out-of-workspace paths are blocked before media bytes are loaded/sent to vision providers. This ships in the next npm release. Thanks @tdjackey for reporting.

## 2026.2.23 (Unreleased)
>>>>>>> 6634030be (fix: enforce apply_patch workspaceOnly in sandbox mounts)

<<<<<<< HEAD
=======
### Changes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
- Sandbox: add `sandbox.browser.binds` to configure browser-container bind mounts separately from exec containers. (#16230) Thanks @seheepeak.
- Discord: add debug logging for message routing decisions to improve `--debug` tracing. (#16202) Thanks @jayleekr.
<<<<<<< HEAD
=======
- Discord: allow exec approval prompts to target channels or both DM+channel via `channels.discord.execApprovals.target`. (#16051) Thanks @leonnardo.
- Telegram: add poll sending via `openclaw message poll` (duration seconds, silent delivery, anonymity controls). (#16209) Thanks @robbyczgw-cla.
>>>>>>> 5ba72bd9b (fix: add discord exec approval channel targeting (#16051) (thanks @leonnardo))
=======
=======
=======
=======
=======
=======
### Breaking

### Fixes

<<<<<<< HEAD
=======
- Tests/Vitest: tier local parallel worker defaults by host memory, keep gateway serial by default on non-high-memory hosts, and document a low-profile fallback command for memory-constrained land/gate runs to prevent local OOMs. (#24719) Thanks @ngutman.
- Agents/Context pruning: extend `cache-ttl` eligibility to Moonshot/Kimi and ZAI/GLM providers (including OpenRouter model refs), so `contextPruning.mode: "cache-ttl"` is no longer silently skipped for those sessions. (#24497) Thanks @lailoo.
- Tools/web_search: add `provider: "kimi"` (Moonshot) support with key/config schema wiring and a corrected two-step `$web_search` tool flow that echoes tool results before final synthesis, including citation extraction from search results. (#16616, #18822) Thanks @adshine.
- Media understanding/Video: add a native Moonshot video provider and include Moonshot in auto video key detection, plus refactor video execution to honor `entry/config/provider` baseUrl+header precedence (matching audio behavior). (#12063) Thanks @xiaoyaner0201.
- Doctor/Memory: query gateway-side default-agent memory embedding readiness during `openclaw doctor` (instead of inferring from generic gateway health), and warn when the gateway memory probe is unavailable or not ready while keeping `openclaw configure` remediation guidance. (#22327) thanks @therk.
- Sessions/Store: canonicalize inbound mixed-case session keys for metadata and route updates, and migrate legacy case-variant entries to a single lowercase key to prevent duplicate sessions and missing TUI/WebUI history. (#9561) Thanks @hillghost86.
- Telegram/Reactions: soft-fail reaction action errors (policy/token/emoji/API), accept snake_case `message_id`, and fallback to inbound message-id context when explicit `messageId` is omitted so DM reactions stay stable without regeneration loops. (#20236, #21001) Thanks @PeterShanxin and @vincentkoc.
- Telegram/Polling: scope persisted polling offsets to bot identity and reuse a single awaited runner-stop path on abort/retry, preventing cross-token offset bleed and overlapping pollers during restart/error recovery. (#10850, #11347) Thanks @talhaorak, @anooprdawar, and @vincentkoc.
- Agents/Reasoning: when model-default thinking is active (for example `thinking=low`), keep auto-reasoning disabled unless explicitly enabled, preventing `Reasoning:` thinking-block leakage in channel replies. (#24335, #24290) thanks @Kay-051.
- Agents/Reasoning: avoid classifying provider reasoning-required errors as context overflows so these failures no longer trigger compaction-style overflow recovery. (#24593) Thanks @vincentkoc.
- Agents/Models: codify `agents.defaults.model` / `agents.defaults.imageModel` config-boundary input as `string | {primary,fallbacks}`, split explicit vs effective model resolution, and fix `models status --agent` source attribution so defaults-inherited agents are labeled as `defaults` while runtime selection still honors defaults fallback. (#24210) thanks @bianbiandashen.
>>>>>>> 8b3eee71e (fix: tier local vitest worker defaults by host memory (#24719) (thanks @ngutman))
- Agents/Compaction: pass `agentDir` into manual `/compact` command runs so compaction auth/profile resolution stays scoped to the active agent. (#24133) thanks @Glucksberg.
- Security/Skills: escape user-controlled prompt, filename, and output-path values in `openai-image-gen` HTML gallery generation to prevent stored XSS in generated `index.html` output. (#12538) Thanks @CornBrother0x.
- Security/Skills: harden `skill-creator` packaging by skipping symlink entries and rejecting files whose resolved paths escape the selected skill root. (#24260, #16959) Thanks @CornBrother0x and @vincentkoc.
- Security/OTEL: redact sensitive values (API keys, tokens, credential fields) from diagnostics-otel log bodies, log attributes, and error/reason span fields before OTLP export. (#12542) Thanks @brandonwise.
- Providers/OpenRouter: remove conflicting top-level `reasoning_effort` when injecting nested `reasoning.effort`, preventing OpenRouter 400 payload-validation failures for reasoning models. (#24120) thanks @tenequm.
- Skills/Python: add CI + pre-commit linting (`ruff`) and pytest discovery coverage for Python scripts/tests under `skills/`, including package test execution from repo root. Thanks @vincentkoc.
- Sessions/Store: canonicalize inbound mixed-case session keys for metadata and route updates, and migrate legacy case-variant entries to a single lowercase key to prevent duplicate sessions and missing TUI/WebUI history. (#9561) Thanks @hillghost86.
- Security/CI: add pre-commit security hook coverage for private-key detection and production dependency auditing, and enforce those checks in CI alongside baseline secret scanning. Thanks @vincentkoc.
- Skills/Python: harden skill script packaging and validation edge cases (self-including `.skill` outputs, CRLF frontmatter parsing, strict `--days` validation, and safer image file loading), with expanded Python regression coverage. Thanks @vincentkoc.
<<<<<<< HEAD
=======
- Config/Write: apply `unsetPaths` with immutable path-copy updates so config writes never mutate caller-provided objects, and harden `openclaw config get/set/unset` path traversal by rejecting prototype-key segments and inherited-property traversal. (#24134) thanks @frankekn.
- Agents/Overflow: detect additional provider context-overflow error shapes (including `input length` + `max_tokens` exceed-context variants) so failures route through compaction/recovery paths instead of leaking raw provider errors to users. (#9951) Thanks @echoVic and @Glucksberg.
- Agents/Compaction: cancel safeguard compaction when summary generation cannot run (missing model/API key or summarization failure), preserving history instead of truncating to fallback `"Summary unavailable"` text. (#10711) Thanks @DukeDeSouth and @vincentkoc.
- Agents/Failover: treat HTTP 502/503/504 errors as failover-eligible transient timeouts so fallback chains can switch providers/models during upstream outages instead of retrying the same failing target. (#20999) Thanks @taw0002 and @vincentkoc.
>>>>>>> 69692d0d3 (fix: detect additional context overflow error patterns to prevent leak to user (#20539))
=======
- Control UI/Chat images: centralize safe external URL opening for image clicks (allowlist `http/https/blob` + opt-in `data:image/*`) and enforce opener isolation (`noopener,noreferrer` + `window.opener = null`) to prevent tabnabbing/unsafe schemes. (#25444) Thanks @shakkernerd.
- CLI/Doctor: correct stale recovery hints to use valid commands (`openclaw gateway status --deep` and `openclaw configure --section model`). (#24485) Thanks @chilu18.
- Security/Sandbox: canonicalize bind-mount source paths via existing-ancestor realpath so symlink-parent + non-existent-leaf paths cannot bypass allowed-source-roots or blocked-path checks. Thanks @tdjackey.
- Doctor/Plugins: auto-enable now resolves third-party channel plugins by manifest plugin id (not channel id), preventing invalid `plugins.entries.<channelId>` writes when ids differ. (#25275) Thanks @zerone0x.
>>>>>>> 3b4dac764 (fix: doctor plugin-id mapping for channel auto-enable (#25275) (thanks @zerone0x))

## 2026.2.23

### Changes

- Control UI/Agents: make the Tools panel data-driven from runtime `tools.catalog`, add per-tool provenance labels (`core` / `plugin:<id>` + optional marker), and keep a static fallback list when the runtime catalog is unavailable.
- Control UI/Cron: add full web cron edit parity (including clone and richer validation/help text), plus all-jobs run history with pagination/search/sort/multi-filter controls and improved cron page layout for cleaner scheduling and failure triage workflows.
- Provider/Mistral: add support for the Mistral provider, including memory embeddings and voice support. (#23845) Thanks @vincentkoc.
- Update/Core: add an optional built-in auto-updater for package installs (`update.auto.*`), default-off, with stable rollout delay+jitter and beta hourly cadence.
- CLI/Update: add `openclaw update --dry-run` to preview channel/tag/target/restart actions without mutating config, installing, syncing plugins, or restarting.
- Config/UI: add tag-aware settings filtering and broaden config labels/help copy so fields are easier to discover and understand in the dashboard config screen.
- Channels/Synology Chat: add a native Synology Chat channel plugin with webhook ingress, direct-message routing, outbound send/media support, per-account config, and DM policy controls. (#23012)
- iOS/Talk: prefetch TTS segments and suppress expected speech-cancellation errors for smoother talk playback. (#22833) Thanks @ngutman.
- Memory/FTS: add Spanish and Portuguese stop-word filtering for query expansion in FTS-only search mode, improving conversational recall for both languages. Thanks @vincentkoc.
- Memory/FTS: add Japanese-aware query expansion tokenization and stop-word filtering (including mixed-script terms like ASCII + katakana) for FTS-only search mode. Thanks @vincentkoc.
- Memory/FTS: add Korean stop-word filtering and particle-aware keyword extraction (including mixed Korean/English stems) for query expansion in FTS-only search mode. (#18899) Thanks @ruypang.
- Memory/FTS: add Arabic stop-word filtering for query expansion in FTS-only search mode to reduce conversational filler in Arabic memory searches. Thanks @vincentkoc.
- Discord/Allowlist: canonicalize resolved Discord allowlist names to IDs and split resolution flow for clearer fail-closed behavior.
>>>>>>> 36400df08 (fix: pass agentDir to /compact command for agent-specific auth (#24133))
- Channels/Config: unify channel preview streaming config handling with a shared resolver and canonical migration path.
- Discord/Allowlist: canonicalize resolved Discord allowlist names to IDs and split resolution flow for clearer fail-closed behavior.
- Memory/FTS: add Korean stop-word filtering and particle-aware keyword extraction (including mixed Korean/English stems) for query expansion in FTS-only search mode. (#18899) Thanks @ruypang.
- iOS/Talk: prefetch TTS segments and suppress expected speech-cancellation errors for smoother talk playback. (#22833) Thanks @ngutman.

### Breaking

- **BREAKING:** remove legacy Gateway device-auth signature `v1`. Device-auth clients must now sign `v2` payloads with the per-connection `connect.challenge` nonce and send `device.nonce`; nonce-less connects are rejected.
- **BREAKING:** unify channel preview-streaming config to `channels.<channel>.streaming` with enum values `off | partial | block | progress`, and move Slack native stream toggle to `channels.slack.nativeStreaming`. Legacy keys (`streamMode`, Slack boolean `streaming`) are still read and migrated by `openclaw doctor --fix`, but canonical saved config/docs now use the unified names.
- **BREAKING:** CLI local onboarding now sets `session.dmScope` to `per-channel-peer` by default for new/implicit DM scope configuration. If you depend on shared DM continuity across senders, explicitly set `session.dmScope` to `main`. (#23468) Thanks @bmendonca3.

>>>>>>> 65dccbdb4 (fix: document onboarding dmScope default as breaking change (#23468) (thanks @bmendonca3))
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
=======
=======
=======
=======
=======
=======
=======
=======
=======
- Agents/Subagents: default subagent spawn depth now uses shared `maxSpawnDepth=2`, enabling depth-1 orchestrator spawning by default while keeping depth policy checks consistent across spawn and prompt paths. (#22223) Thanks @tyler6204.
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
- Config/Memory: allow `"mistral"` in `agents.defaults.memorySearch.provider` and `agents.defaults.memorySearch.fallback` schema validation. (#14934) Thanks @ThomsenDrake.
>>>>>>> 042947b94 (fix: add mistral to MemorySearchSchema provider/fallback unions (#14934))
- Security/Feishu: enforce ID-only allowlist matching for DM/group sender authorization, normalize Feishu ID prefixes during checks, and ignore mutable display names so display-name collisions cannot satisfy allowlist entries. This ships in the next npm release. Thanks @jiseoung for reporting.
- Feishu/Commands: in group chats, command authorization now falls back to top-level `channels.feishu.allowFrom` when per-group `allowFrom` is not set, so `/command` no longer gets blocked by an unintended empty allowlist. (#23756)
- Feishu/Plugins: restore bundled Feishu SDK availability for global installs and strip `openclaw: workspace:*` from plugin `devDependencies` during plugin-version sync so npm-installed Feishu plugins do not fail dependency install. (#23611, #23645, #23603)
- Dev tooling: prevent `CLAUDE.md` symlink target regressions by excluding CLAUDE symlink sentinels from `oxfmt` and marking them `-text` in `.gitattributes`, so formatter/EOL normalization cannot reintroduce trailing-newline targets. Thanks @vincentkoc.
- Cron: honor `cron.maxConcurrentRuns` in the timer loop so due jobs can execute up to the configured parallelism instead of always running serially. (#11595) Thanks @Takhoffman.
- Agents/Compaction: restore embedded compaction safeguard/context-pruning extension loading in production by wiring bundled extension factories into the resource loader instead of runtime file-path resolution. (#22349) Thanks @Glucksberg.
- Hooks/Cron: suppress duplicate main-session events for delivered hook turns and mark `SILENT_REPLY_TOKEN` (`NO_REPLY`) early exits as delivered to prevent hook context pollution. (#20678) Thanks @JonathanWorks.
- Providers/OpenRouter: inject `cache_control` on system prompts for OpenRouter Anthropic models to improve prompt-cache reuse. (#17473) Thanks @rrenamed.
- Installer/Smoke tests: remove legacy `OPENCLAW_USE_GUM` overrides from docker install-smoke runs so tests exercise installer auto TTY detection behavior directly.
- Providers/OpenRouter: allow pass-through OpenRouter and Opencode model IDs in live model filtering so custom routed model IDs are treated as modern refs. (#14312) Thanks @Joly0.
- Providers/OpenRouter: default reasoning to enabled when the selected model advertises `reasoning: true` and no session/directive override is set. (#22513) Thanks @zwffff.
- Providers/OpenRouter: map `/think` levels to `reasoning.effort` in embedded runs while preserving explicit `reasoning.max_tokens` payloads. (#17236) Thanks @robbyczgw-cla.
- Providers/OpenRouter: preserve stored session provider when model IDs are vendor-prefixed (for example, `anthropic/...`) so follow-up turns do not incorrectly route to direct provider APIs. (#22753) Thanks @dndodson.
- Providers/OpenRouter: preserve the required `openrouter/` prefix for OpenRouter-native model IDs during model-ref normalization. (#12942) Thanks @omair445.
- Providers/OpenRouter: pass through provider routing parameters from model params.provider to OpenRouter request payloads for provider selection controls. (#17148) Thanks @carrotRakko.
- Providers/OpenRouter: preserve model allowlist entries containing OpenRouter preset paths (for example `openrouter/@preset/...`) by treating `/model ...@profile` auth-profile parsing as a suffix-only override. (#14120) Thanks @NotMainstream.
- Cron/Auth: propagate auth-profile resolution to isolated cron sessions so provider API keys are resolved the same way as main sessions, fixing 401 errors when using providers configured via auth-profiles. (#20689) Thanks @lailoo.
- Telegram/Webhook: keep webhook monitors alive until gateway abort signals fire, preventing false channel exits and immediate webhook auto-restart loops.
- Telegram/Polling: retry recoverable setup-time network failures in monitor startup and await runner teardown before retry to avoid overlapping polling sessions.
- Telegram/Polling: clear Telegram webhooks (`deleteWebhook`) before starting long-poll `getUpdates`, including retry handling for transient cleanup failures.
- Telegram/Webhook: add `channels.telegram.webhookPort` config support and pass it through plugin startup wiring to the monitor listener.
- Telegram/Media: send a user-facing Telegram reply when media download fails (non-size errors) instead of silently dropping the message.
- Logging: cap single log-file size with `logging.maxFileBytes` (default 500 MB) and suppress additional writes after cap hit to prevent disk exhaustion from repeated error storms.
- Memory/Remote HTTP: centralize remote memory HTTP calls behind a shared guarded helper (`withRemoteHttpResponse`) so embeddings and batch flows use one request/release path.
- Memory/Embeddings: apply configured remote-base host pinning (`allowedHostnames`) across OpenAI/Voyage/Gemini embedding requests to keep private/self-hosted endpoints working without cross-host drift. (#18198) Thanks @ianpcook.
- Memory/Batch: route OpenAI/Voyage/Gemini batch upload/create/status/download requests through the same guarded HTTP path for consistent SSRF policy enforcement.
- Install/Discord Voice: make `@discordjs/opus` an optional dependency so `openclaw` install/update no longer hard-fails when native Opus builds fail, while keeping `opusscript` as the runtime fallback decoder for Discord voice flows. (#23737, #23733, #23703)
- Slack/Upload: resolve bare user IDs (U-prefix) to DM channel IDs via `conversations.open` before calling `files.uploadV2`, which rejects non-channel IDs. `chat.postMessage` tolerates user IDs directly, but `files.uploadV2` → `completeUploadExternal` validates `channel_id` against `^[CGDZ][A-Z0-9]{8,}$`, causing `invalid_arguments` when agents reply with media to DM conversations.
- Browser/Relay: treat extension websocket as connected only when `OPEN`, allow reconnect when a stale `CLOSING/CLOSED` extension socket lingers, and guard stale socket message/close handlers so late events cannot clear active relay state; includes regression coverage for live-duplicate `409` rejection and immediate reconnect-after-close races. (#15099, #18698, #20688)
- Browser/Extension Relay: refactor the MV3 worker to preserve debugger attachments across relay drops, auto-reconnect with bounded backoff+jitter, persist and rehydrate attached tab state via `chrome.storage.session`, recover from `target_closed` navigation detaches, guard stale socket handlers, enforce per-tab operation locks and per-request timeouts, and add lifecycle keepalive/badge refresh hooks (`alarms`, `webNavigation`). (#15099, #6175, #8468, #9807)
- Browser/Remote CDP: extend stale-target recovery so `ensureTabAvailable()` now reuses the sole available tab for remote CDP profiles (same behavior as extension profiles) while preserving strict `tab not found` errors when multiple tabs exist; includes remote-profile regression tests. (#15989)
>>>>>>> 35a7f6e7f (Dev tooling: prevent CLAUDE symlink newline regressions)
- Signal/RPC: guard malformed Signal RPC JSON responses with a clear status-scoped error and add regression coverage for invalid JSON responses. (#22995) Thanks @adhitShet.
>>>>>>> 184844e50 (fix: add signal rpc malformed-json regression test (#22995) (thanks @adhitShet))
- Gateway/Subagents: guard gateway and subagent session-key/message trim paths against undefined inputs to prevent early `Cannot read properties of undefined (reading 'trim')` crashes during subagent spawn and wait flows.
- Agents/Workspace: guard `resolveUserPath` against undefined/null input to prevent `Cannot read properties of undefined (reading 'trim')` crashes when workspace paths are missing in embedded runner flows.
>>>>>>> 1152b2586 (fix(gateway): guard trim crashes in subagent flow)
- Auth/Profiles: keep active `cooldownUntil`/`disabledUntil` windows immutable across retries so mid-window failures cannot extend recovery indefinitely; only recompute a backoff window after the previous deadline has expired. This resolves cron/inbound retry loops that could trap gateways until manual `usageStats` cleanup. (#23516, #23536) Thanks @arosstale.
>>>>>>> 7c3c406a3 (fix: keep auth-profile cooldown windows immutable in-window (#23536) (thanks @arosstale))
- Channels/Security: fail closed on missing provider group policy config by defaulting runtime group policy to `allowlist` (instead of inheriting `channels.defaults.groupPolicy`) when `channels.<provider>` is absent across message channels, and align runtime + security warnings/docs to the same fallback behavior (Slack, Discord, iMessage, Telegram, WhatsApp, Signal, LINE, Matrix, Mattermost, Google Chat, IRC, Nextcloud Talk, Feishu, and Zalo user flows; plus Discord message/native-command paths). (#23367) Thanks @bmendonca3.
- Gateway/Onboarding: harden remote gateway onboarding defaults and guidance by defaulting discovered direct URLs to `wss://`, rejecting insecure non-loopback `ws://` targets in onboarding validation, and expanding remote-security remediation messaging across gateway client/call/doctor flows. (#23476) Thanks @bmendonca3.
- CLI/Sessions: pass the configured sessions directory when resolving transcript paths in `agentCommand`, so custom `session.store` locations resume sessions reliably. Thanks @davidrudduck.
>>>>>>> 777817392 (fix: fail closed missing provider group policy across message channels (#23367) (thanks @bmendonca3))
- Gateway/Chat UI: strip inline reply/audio directive tags from non-streaming final webchat broadcasts (including `chat.inject`) while preserving empty-string message content when tags are the entire reply. (#23298) Thanks @SidQin-cyber.
>>>>>>> 5c57a45a5 (fix: add non-streaming directive-tag regression tests (#23298) (thanks @SidQin-cyber))
- Gateway/Restart: fix restart-loop edge cases by keeping `openclaw.mjs -> dist/entry.js` bootstrap detection explicit, reacquiring the gateway lock for in-process restart fallback paths, and tightening restart-loop regression coverage. (#23416) Thanks @jeffwnli.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> dd07c06d0 (fix: tighten gateway restart loop handling (#23416) (thanks @jeffwnli))
=======
=======
- Signal/Monitor: treat user-initiated abort shutdowns as clean exits when auto-started `signal-cli` is terminated, while still surfacing unexpected daemon exits as startup/runtime failures. (#23379) Thanks @frankekn.
<<<<<<< HEAD
>>>>>>> 602a1ebd5 (fix: handle intentional signal daemon shutdown on abort (#23379) (thanks @frankekn))
- Channels/Dedupe: centralize plugin dedupe primitives in plugin SDK (memory + persistent), move Feishu inbound dedupe to a namespace-scoped persistent store, and reuse shared dedupe cache logic for Zalo webhook replay + Tlon processed-message tracking to reduce duplicate handling during reconnect/replay paths.
=======
- Channels/Dedupe: centralize plugin dedupe primitives in plugin SDK (memory + persistent), move Feishu inbound dedupe to a namespace-scoped persistent store, and reuse shared dedupe cache logic for Zalo webhook replay + Tlon processed-message tracking to reduce duplicate handling during reconnect/replay paths. (#23377) Thanks @SidQin-cyber.
<<<<<<< HEAD
>>>>>>> bf56196de (fix: tighten feishu dedupe boundary (#23377) (thanks @SidQin-cyber))
=======
- Channels/Delivery: remove hardcoded WhatsApp delivery fallbacks; require explicit/session channel context or auto-pick the sole configured channel when unambiguous. (#23357) Thanks @lbo728.
>>>>>>> 1cd3b3090 (fix: stop hardcoded channel fallback and auto-pick sole configured channel (#23357) (thanks @lbo728))
- ACP/Gateway: wait for gateway hello before opening ACP requests, and fail fast on pre-hello connect failures to avoid startup hangs and early `gateway not connected` request races. (#23390) Thanks @janckerchen.
>>>>>>> 9f0b6a8c9 (fix: harden ACP gateway startup sequencing (#23390) (thanks @janckerchen))
- Security/Audit: add `openclaw security audit` detection for open group policies that expose runtime/filesystem tools without sandbox/workspace guards (`security.exposure.open_groups_with_runtime_or_fs`).
- Security/Exec env: block request-scoped `HOME` and `ZDOTDIR` overrides in host exec env sanitizers (Node + macOS), preventing shell startup-file execution before allowlist-evaluated command bodies. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/Hooks auth: normalize hook auth rate-limit client IP keys so IPv4 and IPv4-mapped IPv6 addresses share one throttle bucket, preventing dual-form auth-attempt budget bypasses. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
- Security/Exec approvals: treat `env` and shell-dispatch wrappers as transparent during allowlist analysis on node-host and macOS companion paths so policy checks match the effective executable/inline shell payload instead of the wrapper binary, blocking wrapper-smuggled allowlist bypasses. This ships in the next npm release. Thanks @tdjackey for reporting.
- Telegram/WSL2: disable `autoSelectFamily` by default on WSL2 and memoize WSL2 detection in Telegram network decision logic to avoid repeated sync `/proc/version` probes on fetch/send paths. (#21916) Thanks @MizukiMachine.
>>>>>>> 2b63592be (fix: harden exec allowlist wrapper resolution)
- Telegram/Streaming: preserve archived draft preview mapping after flush and clean superseded reasoning preview bubbles so multi-message preview finals no longer cross-edit or orphan stale messages under send/rotation races. (#23202) Thanks @obviyus.
- Slack/Slash commands: preserve the Bolt app receiver when registering external select options handlers so monitor startup does not crash on runtimes that require bound `app.options` calls. (#23209) Thanks @0xgaia.
- Agents/Ollama: preserve unsafe integer tool-call arguments as exact strings during NDJSON parsing, preventing large numeric IDs from being rounded before tool execution. (#23170) Thanks @BestJoester.
- Cron/Gateway: keep `cron.list` and `cron.status` responsive during startup catch-up by avoiding a long-held cron lock while missed jobs execute. (#23106) Thanks @jayleekr.
- Gateway/Config reload: compare array-valued config paths structurally during diffing so unchanged `memory.qmd.paths` and `memory.qmd.scope.rules` no longer trigger false restart-required reloads. (#23185) Thanks @rex05ai.
- Gateway/Config reload: retry short-lived missing config snapshots during reload before skipping, preventing atomic-write unlink windows from triggering restart loops. (#23343) Thanks @lbo728.
- Cron/Scheduling: validate runtime cron expressions before schedule/stagger evaluation so malformed persisted jobs report a clear `invalid cron schedule: expr is required` error instead of crashing with `undefined.trim` failures and auto-disable churn. (#23223) Thanks @asimons81.
- Memory/QMD: migrate legacy unscoped collection bindings (for example `memory-root`) to per-agent scoped names (for example `memory-root-main`) during startup when safe, so QMD-backed `memory_search` no longer fails with `Collection not found` after upgrades. (#23228, #20727) Thanks @JLDynamics and @AaronFaby.
- TUI/Input: enable multiline-paste burst coalescing on macOS Terminal.app and iTerm so pasted blocks no longer submit line-by-line as separate messages. (#18809) Thanks @fwends.
- TUI/Status: request immediate renders after setting `sending`/`waiting` activity states so in-flight runs always show visible progress indicators instead of appearing idle until completion. (#21549) Thanks @13Guinness.
- Agents/Fallbacks: treat JSON payloads with `type: "api_error"` + `"Internal server error"` as transient failover errors so Anthropic 500-style failures trigger model fallback. (#23193) Thanks @jarvis-lane.
<<<<<<< HEAD
=======
- Agents/Google: sanitize non-base64 `thought_signature`/`thoughtSignature` values from assistant replay transcripts for native Google Gemini requests while preserving valid signatures and tool-call order. (#23457) Thanks @echoVic.
- Agents/Transcripts: validate assistant tool-call names (syntax/length + registered tool allowlist) before transcript persistence and during replay sanitization so malformed failover tool names no longer poison sessions with repeated provider HTTP 400 errors. (#23324) Thanks @johnsantry.
- Agents/Mistral: sanitize tool-call IDs in the embedded agent loop and generate strict provider-safe pending tool-call IDs, preventing Mistral strict9 `HTTP 400` failures on tool continuations. (#23698) Thanks @echoVic.
- Agents/Compaction: strip stale assistant usage snapshots from pre-compaction turns when replaying history after a compaction summary so context-token estimation no longer reuses pre-compaction totals and immediately re-triggers destructive follow-up compactions. (#19127) Thanks @tedwatson.
- Agents/Replies: emit a default completion acknowledgement (`✅ Done.`) when runs execute tools successfully but return no final assistant text, preventing silent no-reply turns after tool-only completions. (#22834) Thanks @Oldshue.
- Agents/Subagents: honor `tools.subagents.tools.alsoAllow` and explicit subagent `allow` entries when resolving built-in subagent deny defaults, so explicitly granted tools (for example `sessions_send`) are no longer blocked unless re-denied in `tools.subagents.tools.deny`. (#23359) Thanks @goren-beehero.
>>>>>>> 401106b96 (fix: harden flaky tests and cover native google thought signatures (#23457) (thanks @echoVic))
- Agents/Diagnostics: include resolved lifecycle error text in `embedded run agent end` warnings so UI/TUI “Connection error” runs expose actionable provider failure reasons in gateway logs. (#23054) Thanks @Raize.
<<<<<<< HEAD
>>>>>>> 63b4c500d (fix: prevent Telegram preview stream cross-edit race (#23202))
=======
- Agents/Auth profiles: skip auth-profile cooldown writes for timeout failures in embedded runner rotation so model/network timeouts do not poison same-provider fallback model selection while still allowing in-turn account rotation. (#22622) Thanks @vageeshkumar.
- Agents/Failover: treat HTTP 502/503/504 errors as failover-eligible transient timeouts so fallback chains can switch providers/models during upstream outages instead of retrying the same failing target. (#20999) Thanks @taw0002 and @vincentkoc.
- Plugins/Hooks: run legacy `before_agent_start` once per agent turn and reuse that result across model-resolve and prompt-build compatibility paths, preventing duplicate hook side effects (for example duplicate external API calls). (#23289) Thanks @ksato8710.
- Models/Config: default missing Anthropic provider/model `api` fields to `anthropic-messages` during config validation so custom relay model entries are preserved instead of being dropped by runtime model registry validation. (#23332) Thanks @bigbigmonkey123.
>>>>>>> 3e2849c57 (fix: align timeout cooldown behavior docs/tests (#22622) (thanks @vageeshkumar))
- Gateway/Pairing: treat operator.admin pairing tokens as satisfying operator.write requests so legacy devices stop looping through scope-upgrade prompts introduced in 2026.2.19. (#23125, #23006) Thanks @vignesh07.
<<<<<<< HEAD
=======
- Gateway/Pairing: treat `operator.admin` as satisfying other `operator.*` scope checks during device-auth verification so local CLI/TUI sessions stop entering pairing-required loops for pairing/approval-scoped commands. (#22062, #22193, #21191) Thanks @Botaccess, @jhartshorn, and @ctbritt.
- Gateway/Pairing: preserve existing approved token scopes when processing repair pairings that omit `scopes`, preventing empty-scope token regressions on reconnecting clients. (#21906) Thanks @paki81.
- Gateway/Scopes: include `operator.read` and `operator.write` in default operator connect scope bundles across CLI, Control UI, and macOS clients so write-scoped announce/sub-agent follow-up calls no longer hit `pairing required` disconnects on loopback gateways. (#22582) thanks @YuzuruS.
- Plugins/CLI: make `openclaw plugins enable` and plugin install/link flows update allowlists via shared plugin-enable policy so enabled plugins are not left disabled by allowlist mismatch. (#23190) Thanks @downwind7clawd-ctrl.
>>>>>>> 6f7e5f92c (fix: add operator.read and operator.write to default CLI scopes (#22582))
- Memory/QMD: add optional `memory.qmd.mcporter` search routing so QMD `query/search/vsearch` can run through mcporter keep-alive flows (including multi-collection paths) to reduce cold starts, while keeping searches on agent-scoped QMD state for consistent recall. (#19617) Thanks @nicole-luxe and @vignesh07.
>>>>>>> 5b4409d5d (fix: pairing admin satisfies write (#23125) (thanks @vignesh07))
- Chat/UI: strip inline reply/audio directive tags (`[[reply_to_current]]`, `[[reply_to:<id>]]`, `[[audio_as_voice]]`) from displayed chat history, live chat event output, and session preview snippets so control tags no longer leak into user-visible surfaces.
<<<<<<< HEAD
=======
- Telegram/Retry: classify undici `TypeError: fetch failed` as recoverable in both polling and send retry paths so transient fetch failures no longer fail fast. (#16699) thanks @Glucksberg.
- BlueBubbles/DM history: restore DM backfill context with account-scoped rolling history, bounded backfill retries, and safer history payload limits. (#20302) Thanks @Ryan-Haines.
- BlueBubbles/Private API cache: treat unknown (`null`) private-API cache status as disabled for send/attachment/reply flows to avoid stale-cache 500s, and log a warning when reply/effect features are requested while capability is unknown. (#23459) Thanks @echoVic.
- BlueBubbles/Webhooks: accept inbound/reaction webhook payloads when BlueBubbles omits `handle` but provides DM `chatGuid`, and harden payload extraction for array/string-wrapped message bodies so valid webhook events no longer get rejected as unparseable. (#23275) Thanks @toph31.
- Security/Audit: add `openclaw security audit` finding `gateway.nodes.allow_commands_dangerous` for risky `gateway.nodes.allowCommands` overrides, with severity upgraded to critical on remote gateway exposure.
- Gateway/Control plane: reduce cross-client write limiter contention by adding `connId` fallback keying when device ID and client IP are both unavailable.
>>>>>>> 37f12eb7e (fix: align BlueBubbles private-api null fallback + warning (#23459) (thanks @echoVic))
- Security/Config: block prototype-key traversal during config merge patch and legacy migration merge helpers (`__proto__`, `constructor`, `prototype`) to prevent prototype pollution during config mutation flows. (#22968) Thanks @Clawborn.
- Security/Shell env: validate login-shell executable paths for shell-env fallback (`/etc/shells` + trusted prefixes) and block `SHELL` in dangerous env override policy paths so untrusted shell-path injection falls back safely to `/bin/sh`. Thanks @athuljayaram for reporting.
- Security/Config: make parsed chat allowlist checks fail closed when `allowFrom` is empty, restoring expected DM/pairing gating.
- Security/Exec: in non-default setups that manually add `sort` to `tools.exec.safeBins`, block `sort --compress-program` so allowlist-mode safe-bin checks cannot bypass approval. Thanks @tdjackey for reporting.
<<<<<<< HEAD
=======
- Security/Exec approvals: when users choose `allow-always` for shell-wrapper commands (for example `/bin/zsh -lc ...`), persist allowlist patterns for the inner executable(s) instead of the wrapper shell binary, preventing accidental broad shell allowlisting in moderate mode. (#23276) Thanks @xrom2863.
- Security/Exec: fail closed when `tools.exec.host=sandbox` is configured/requested but sandbox runtime is unavailable, and default implicit exec host routing to `gateway` when no sandbox runtime exists. (#23398) Thanks @bmendonca3.
>>>>>>> 1b327da6e (fix: harden exec sandbox fallback semantics (#23398) (thanks @bmendonca3))
- Security/macOS app beta: enforce path-only `system.run` allowlist matching (drop basename matches like `echo`), migrate legacy basename entries to last resolved paths when available, and harden shell-chain handling to fail closed on unsafe parse/control syntax (including quoted command substitution/backticks). This is an optional allowlist-mode feature; default installs remain deny-by-default. This ships in the next npm release. Thanks @tdjackey for reporting.
<<<<<<< HEAD
=======
- Security/Agents: auto-generate and persist a dedicated `commands.ownerDisplaySecret` when `commands.ownerDisplay=hash`, remove gateway token fallback from owner-ID prompt hashing across CLI and embedded agent runners, and centralize owner-display secret resolution in one shared helper. This ships in the next npm release. Thanks @aether-ai-agent for reporting.
- Security/SSRF: expand IPv4 fetch guard blocking to include RFC special-use/non-global ranges (including benchmarking, TEST-NET, multicast, and reserved/broadcast blocks), and centralize range checks into a single CIDR policy table to reduce classifier drift.
>>>>>>> c99e7696e (fix: decouple owner display secret from gateway auth token)
- Security/Archive: block zip symlink escapes during archive extraction.
- Security/Media sandbox: keep tmp media allowance for absolute tmp paths only and enforce symlink-escape checks before sandbox-validated reads, preventing tmp symlink exfiltration and relative `../` sandbox escapes when sandboxes live under tmp. (#17892) Thanks @dashed.
- Security/Discord: add `openclaw security audit` warnings for name/tag-based Discord allowlist entries (DM allowlists, guild/channel `users`, and pairing-store entries), highlighting slug-collision risk while keeping name-based matching supported, and canonicalize resolved Discord allowlist names to IDs at runtime without rewriting config files. Thanks @tdjackey for reporting.
- Security/Gateway: block node-role connections when device identity metadata is missing.
- Security/Media: enforce inbound media byte limits during download/read across Discord, Telegram, Zalo, Microsoft Teams, and BlueBubbles to prevent oversized payload memory spikes before rejection. This ships in the next npm release. Thanks @tdjackey for reporting.
<<<<<<< HEAD
=======
- Security/Control UI: block symlink-based out-of-root static file reads by enforcing realpath containment and file-identity checks when serving Control UI assets and SPA fallback `index.html`. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/MSTeams media: enforce allowlist checks for SharePoint reference attachment URLs and redirect targets during Graph-backed media fetches so redirect chains cannot escape configured media host boundaries. This ships in the next npm release. Thanks @tdjackey for reporting.
- Security/macOS discovery: fail closed for unresolved discovery endpoints by clearing stale remote selection values, use resolved service host only for SSH target derivation, and keep remote URL config aligned with resolved endpoint availability. (#21618) Thanks @bmendonca3.
>>>>>>> bfe016fa2 (fix: clear stale remote discovery endpoints (#21618) (thanks @bmendonca3))
- Chat/Usage/TUI: strip synthetic inbound metadata blocks (including `Conversation info` and trailing `Untrusted context` channel metadata wrappers) from displayed conversation history so internal prompt context no longer leaks into user-visible logs.
- CI/Tests: fix TypeScript case-table typing and lint assertion regressions so `pnpm check` passes again after Synology Chat landing. (#23012) Thanks @druide67.
- Security/Browser relay: harden extension relay auth token handling for `/extension` and `/cdp` pathways.
- Cron: persist `delivered` state in cron job records so delivery failures remain visible in status and logs. (#19174) Thanks @simonemacario.
- Config/Doctor: only repair the OAuth credentials directory when affected channels are configured, avoiding fresh-install noise.
- Config/Channels: whitelist `channels.modelByChannel` in config validation and exclude it from plugin auto-enable channel detection so model overrides no longer trigger `unknown channel id` validation errors or bogus `modelByChannel` plugin enables. (#23412) Thanks @ProspectOre.
- Config/Bindings: allow optional `bindings[].comment` in strict config validation so annotated binding entries no longer fail load. (#23458) Thanks @echoVic.
- Usage/Pricing: correct MiniMax M2.5 pricing defaults to fix inflated cost reporting. (#22755) Thanks @miloudbelarebia.
- Gateway/Daemon: verify gateway health after daemon restart.
- Agents/UI text: stop rewriting normal assistant billing/payment language outside explicit error contexts. (#17834) Thanks @niceysam.

## 2026.2.21

### Changes

- Models/Google: add Gemini 3.1 support (`google/gemini-3.1-pro-preview`).
>>>>>>> 73d93dee6 (fix: enforce inbound media max-bytes during remote fetch)
- Providers/Onboarding: add Volcano Engine (Doubao) and BytePlus providers/models (including coding variants), wire onboarding auth choices for interactive + non-interactive flows, and align docs to `volcengine-api-key`. (#7967) Thanks @funmore123.
>>>>>>> 581868365 (fix: finish volcengine/byteplus landing polish (#7967) (thanks @funmore123))
- Channels/CLI: add per-account/channel `defaultTo` outbound routing fallback so `openclaw agent --deliver` can send without explicit `--reply-to` when a default target is configured. (#16985) Thanks @KirillShchetinin.
- iOS/Chat: clean chat UI noise by stripping inbound untrusted metadata/timestamp prefixes, formatting tool outputs into concise summaries/errors, compacting the composer while typing, and supporting tap-to-dismiss keyboard in chat view. (#22122) thanks @mbelinky.
- iOS/Watch: bridge mirrored watch prompt notification actions into iOS quick-reply handling, including queued action handoff until app model initialization. (#22123) thanks @mbelinky.
- iOS/Tests: cover IPv4-mapped IPv6 loopback in manual TLS policy tests for connect validation paths. (#22045) Thanks @mbelinky.
- iOS/Gateway: stabilize background wake and reconnect behavior with background reconnect suppression/lease windows, BGAppRefresh wake fallback, location wake hook throttling, and APNs wake retry+nudge instrumentation. (#21226) thanks @mbelinky.
- Auto-reply/UI: add model fallback lifecycle visibility in verbose logs, /status active-model context with fallback reason, and cohesive WebUI fallback indicators. (#20704) Thanks @joshavant.
- Discord/Streaming: add stream preview mode for live draft replies with partial/block options and configurable chunking. Thanks @thewilloftheshadow. Inspiration @neoagentic-ship-it.
- Discord: add configurable ephemeral defaults for slash-command responses. (#16563) Thanks @wei.
- Discord/Telegram: add configurable lifecycle status reactions for queued/thinking/tool/done/error phases with a shared controller and emoji/timing overrides. Thanks @wolly-tundracube and @thewilloftheshadow.
- Discord/Voice: add voice channel join/leave/status via `/vc`, plus auto-join configuration for realtime voice conversations. Thanks @thewilloftheshadow.
- Docs/Discord: document forum channel thread creation flows and component limits. Thanks @thewilloftheshadow.

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Docker/Build: include `ownerDisplay` in `CommandsSchema` object-level defaults so Docker `pnpm build` no longer fails with `TS2769` during plugin SDK d.ts generation. (#22558) Thanks @obviyus.
- Security/Gateway/Hooks: block `__proto__`, `constructor`, and `prototype` traversal in webhook template path resolution to prevent prototype-chain payload data leakage in `messageTemplate` rendering. (#22213) Thanks @SleuthCo.
- Cron: honor `cron.maxConcurrentRuns` in the timer loop so due jobs can execute up to the configured parallelism instead of always running serially. (#11595) Thanks @Takhoffman.
>>>>>>> e1cb73cde (fix: unblock Docker build by aligning commands schema default (#22558))
- Agents/Compaction: restore embedded compaction safeguard/context-pruning extension loading in production by wiring bundled extension factories into the resource loader instead of runtime file-path resolution. (#22349) Thanks @Glucksberg.
=======
=======
- Security/Exec: block `sort --compress-program` in `tools.exec.safeBins` policy so allowlist-mode safe-bin checks cannot be used to bypass approval and spawn external programs. Thanks @tdjackey for reporting.
>>>>>>> 57fbbaebc (fix: block safeBins sort --compress-program bypass)
=======
- Chat/Usage/TUI: strip synthetic inbound metadata blocks (including `Conversation info` and trailing `Untrusted context` channel metadata wrappers) from displayed conversation history so internal prompt context no longer leaks into user-visible logs.
- Security/Exec: in non-default setups that manually add `sort` to `tools.exec.safeBins`, block `sort --compress-program` so allowlist-mode safe-bin checks cannot bypass approval. Thanks @tdjackey for reporting.
>>>>>>> 9fc6c8b71 (fix: hide synthetic untrusted metadata in chat history)
- Doctor/State integrity: only require/create the OAuth credentials directory when WhatsApp or pairing-backed channels are configured, and downgrade fresh-install missing-dir noise to an informational warning.
- Agents/Sanitization: stop rewriting billing-shaped assistant text outside explicit error context so normal replies about billing/credits/payment are preserved across messaging channels. (#17834, fixes #11359)
=======
- Gateway/OpenRouter: preserve stored session provider when model IDs are vendor-prefixed (for example, `anthropic/...`) so follow-up turns do not incorrectly route to direct provider APIs. (#22753) Thanks @dndodson.
- Agents/Bootstrap: skip malformed bootstrap files with missing/invalid paths instead of crashing agent sessions; hooks using `filePath` (or non-string `path`) are skipped with a warning. (#22693, #22698) Thanks @arosstale.
>>>>>>> 4cad67438 (fix: preserve stored provider in resolveSessionModelRef for vendor-prefixed models (#22753))
- Security/Agents: cap embedded Pi runner outer retry loop with a higher profile-aware dynamic limit (32-160 attempts) and return an explicit `retry_limit` error payload when retries never converge, preventing unbounded internal retry cycles (`GHSA-76m6-pj3w-v7mf`).
- Telegram: detect duplicate bot-token ownership across Telegram accounts at startup/status time, mark secondary accounts as not configured with an explicit fix message, and block duplicate account startup before polling to avoid endless `getUpdates` conflict loops.
- Agents/Tool images: include source filenames in `agents/tool-images` resize logs so compression events can be traced back to specific files.
- Providers/OAuth: harden Qwen and Chutes refresh handling by validating refresh response expiry values and preserving prior refresh tokens when providers return empty refresh token fields, with regression coverage for empty-token responses.
- Models/Kimi-Coding: add missing implicit provider template for `kimi-coding` with correct `anthropic-messages` API type and base URL, fixing 403 errors when using Kimi for Coding. (#22409)
>>>>>>> 35a57bc94 (fix: gate doctor oauth-dir repair by channel config)
- Auto-reply/Tools: forward `senderIsOwner` through embedded queued/followup runner params so owner-only tools remain available for authorized senders. (#22296) thanks @hcoj.
>>>>>>> 1410d15c5 (fix: compaction safeguard extension not loading in production builds (openclaw#22349) thanks @Glucksberg)
- Agents/Subagents: restore announce-chain delivery to agent injection, defer nested announce output until descendant follow-up content is ready, and prevent descendant deferrals from consuming announce retry budget so deep chains do not drop final completions. (#22223) Thanks @tyler6204.
- Gateway/Auth: require `gateway.trustedProxies` to include a loopback proxy address when `auth.mode="trusted-proxy"` and `bind="loopback"`, preventing same-host proxy misconfiguration from silently blocking auth. (#22082, follow-up to #20097) thanks @mbelinky.
<<<<<<< HEAD
=======
- Security/OpenClawKit/UI: prevent injected inbound user context metadata blocks from leaking into chat history in TUI, webchat, and macOS surfaces by stripping all untrusted metadata prefixes at display boundaries. (#22142) Thanks @Mellowambience, @vincentkoc.
- Security/OpenClawKit/UI: strip inbound metadata blocks from user messages in TUI rendering while preserving user-authored content. (#22345) Thanks @kansodata, @vincentkoc.
- Security/OpenClawKit/UI: prevent inbound metadata leaks and reply-tag streaming artifacts in TUI rendering by stripping untrusted metadata prefixes at display boundaries. (#22346) Thanks @akramcodez, @vincentkoc.
>>>>>>> d94d21f9b (test: isolate local media regression fixtures to allowed roots (#22369))
- Agents/System Prompt: label allowlisted senders as authorized senders to avoid implying ownership. Thanks @thewilloftheshadow.
- Gateway/Auth: allow trusted-proxy mode with loopback bind for same-host reverse-proxy deployments, while still requiring configured `gateway.trustedProxies`. (#20097) thanks @xinhuagu.
- Gateway/Auth: allow authenticated clients across roles/scopes to call `health` while preserving role and scope enforcement for non-health methods. (#19699) thanks @Nachx639.
- Gateway/Security: remove shared-IP fallback for canvas endpoints and require token or session capability for canvas access. Thanks @thewilloftheshadow.
- Gateway/Hooks: include transform export name in hook-transform cache keys so distinct exports from the same module do not reuse the wrong cached transform function. (#13855) thanks @mcaxtr.
- Gateway/Control UI: return 404 for missing static-asset paths instead of serving SPA fallback HTML, while preserving client-route fallback behavior for extensionless and non-asset dotted paths. (#12060) thanks @mcaxtr.
>>>>>>> fe57bea08 (Subagents: restore announce chain + fix nested retry/drop regressions (#22223))
- Gateway/Pairing: prevent device-token rotate scope escalation by enforcing an approved-scope baseline, preserving approved scopes across metadata updates, and rejecting rotate requests that exceed approved role scope implications. (#20703) thanks @coygeek.
>>>>>>> 914a7c535 (fix: Device Token Scope Escalation via Rotate Endpoint (#20703))
- Gateway/Security: require secure context and paired-device checks for Control UI auth even when `gateway.controlUi.allowInsecureAuth` is set, and align audit messaging with the hardened behavior. (#20684) thanks @coygeek.
- macOS/Build: default release packaging to `BUNDLE_ID=ai.openclaw.mac` in `scripts/package-mac-dist.sh`, so Sparkle feed URL is retained and auto-update no longer fails with an empty appcast feed. (#19750) thanks @loganprit.
<<<<<<< HEAD

=======
- Gateway/Pairing: clear persisted paired-device state when the gateway client closes with `device token mismatch` (`1008`) so reconnect flows can cleanly re-enter pairing. (#22071) Thanks @mbelinky.
>>>>>>> b7644d61a (fix: restore Discord model picker UX (#21458) (thanks @pejmanjohn))
- Signal/Outbound: preserve case for Base64 group IDs during outbound target normalization so cross-context routing and policy checks no longer break when group IDs include uppercase characters. (#5578) Thanks @heyhudson.
<<<<<<< HEAD
>>>>>>> 40a292619 (fix: Control UI Insecure Auth Bypass Allows Token-Only Auth Over HTTP (#20684))
=======
- Providers/Copilot: drop persisted assistant `thinking` blocks for Claude models (while preserving turn structure/tool blocks) so follow-up requests no longer fail on invalid `thinkingSignature` payloads. (#19459) Thanks @jackheuberger.
>>>>>>> feccac672 (fix: sanitize thinking blocks for GitHub Copilot Claude models (openclaw#19459) thanks @jackheuberger)
- Providers/Copilot: add `claude-sonnet-4.6` and `claude-sonnet-4.5` to the default GitHub Copilot model catalog and add coverage for model-list/definition helpers. (#20270, fixes #20091) Thanks @Clawborn.
- Dependencies/Agents: bump embedded Pi SDK packages (`@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`) to `0.54.0`. (#21578) Thanks @Takhoffman.
- Gateway/Config: allow `gateway.customBindHost` in strict config validation when `gateway.bind="custom"` so valid custom bind-host configurations no longer fail startup. (#20318, fixes #20289) Thanks @MisterGuy420.
- Config/Agents: expose Pi compaction tuning values `agents.defaults.compaction.reserveTokens` and `agents.defaults.compaction.keepRecentTokens` in config schema/types and apply them in embedded Pi runner settings overrides with floor enforcement via `reserveTokensFloor`. (#21568) Thanks @Takhoffman.
>>>>>>> dece0fa14 (fix: add customBindHost to gateway config validation (openclaw#20318) thanks @MisterGuy420)
- Auto-reply/WebChat: avoid defaulting inbound runtime channel labels to unrelated providers (for example `whatsapp`) for webchat sessions so channel-specific formatting guidance stays accurate. (#21534) Thanks @lbo728.
<<<<<<< HEAD
>>>>>>> db8ffb13f (fix: prevent whatsapp fallback for webchat sessions (#21534) (thanks @lbo728))
=======
- Status: include persisted `cacheRead`/`cacheWrite` in session summaries so compact `/status` output consistently shows cache hit percentages from real session data.
- Models/MiniMax: correct default M2.5 API pricing for input/output/cache token costs in onboarding and provider config defaults, fixing inflated usage cost reporting. (#21792)
>>>>>>> efdec3925 (fix: correct MiniMax M2.5 pricing (was ~50x too high) (openclaw#22755) thanks @miloudbelarebia)
- Heartbeat/Cron: restore interval heartbeat behavior so missing `HEARTBEAT.md` no longer suppresses runs (only effectively empty files skip), preserving prompt-driven and tagged-cron execution paths.
- WhatsApp/Cron/Heartbeat: enforce allowlisted routing for implicit scheduled/system delivery by merging pairing-store + configured `allowFrom` recipients, selecting authorized recipients when last-route context points to a non-allowlisted chat, and preventing heartbeat fan-out to recent unauthorized chats.
- Heartbeat/Active hours: constrain active-hours `24` sentinel parsing to `24:00` in time validation so invalid values like `24:30` are rejected early. (#21410) thanks @adhitShet.
- Heartbeat: treat `activeHours` windows with identical `start`/`end` times as zero-width (always outside the window) instead of always-active. (#21408) thanks @adhitShet.
- Discord: restore model picker back navigation when a provider is missing and document the Discord picker flow. (#21458) Thanks @pejmanjohn and @thewilloftheshadow.
- Gateway/Pairing: tolerate legacy paired devices missing `roles`/`scopes` metadata in websocket upgrade checks and backfill metadata on reconnect. (#21447, fixes #21236) Thanks @joshavant.
- Docker: pin base images to SHA256 digests in Docker builds to prevent mutable tag drift. (#7734) Thanks @coygeek.
- Provider/HTTP: treat HTTP 503 as failover-eligible for LLM provider errors. (#21086) Thanks @Protocol-zero-0.
- Slack: pass `recipient_team_id` / `recipient_user_id` through Slack native streaming calls so `chat.startStream`/`appendStream`/`stopStream` work reliably across DMs and Slack Connect setups, and disable block streaming when native streaming is active. (#20988) Thanks @Dithilli. Earlier recipient-ID groundwork was contributed in #20377 by @AsserAl1012.
- CLI/Config: add canonical `--strict-json` parsing for `config set` and keep `--json` as a legacy alias to reduce help/behavior drift. (#21332) thanks @adhitShet.
- CLI: keep `openclaw -v` as a root-only version alias so subcommand `-v, --verbose` flags (for example ACP/hooks/skills) are no longer intercepted globally. (#21303) thanks @adhitShet.
- Config/Memory: restore schema help/label metadata for hybrid `mmr` and `temporalDecay` settings so configuration surfaces show correct names and guidance. (#18786) Thanks @rodrigouroz.
- Memory: return empty snippets when `memory_get`/QMD read files that have not been created yet, and harden memory indexing/session helpers against ENOENT races so missing Markdown no longer crashes tools. (#20680) Thanks @pahdo.
- Tools/web_search: handle xAI Responses API payloads that emit top-level `output_text` blocks (without a `message` wrapper) so Grok web_search no longer returns `No response` for those results. (#20508) Thanks @echoVic.
<<<<<<< HEAD
=======
- Telegram/Streaming: always clean up draft previews even when dispatch throws before fallback handling, preventing orphaned preview messages during failed runs. (#19041) thanks @mudrii.
- Telegram/Streaming: split reasoning and answer draft preview lanes to prevent cross-lane overwrites, and ignore literal `<think>` tags inside inline/fenced code snippets so sample markup is not misrouted as reasoning. (#20774) Thanks @obviyus.
<<<<<<< HEAD
>>>>>>> ab256b8ec (fix: split telegram reasoning and answer draft streams (#20774))
=======
- Telegram/Status reactions: refresh stall timers on repeated phase updates and honor ack-reaction scope when lifecycle reactions are enabled, preventing false stall emojis and unwanted group reactions. Thanks @wolly-tundracube and @thewilloftheshadow.
- Telegram/Status reactions: keep lifecycle reactions active when available-reactions lookup fails by falling back to unrestricted variant selection instead of suppressing reaction updates. (#22380) thanks @obviyus.
- Discord/Events: await `DiscordMessageListener` message handlers so regular `MESSAGE_CREATE` traffic is processed through queue ordering/timeout flow instead of fire-and-forget drops. (#22396) Thanks @sIlENtbuffER.
- Discord/Streaming: apply `replyToMode: first` only to the first Discord chunk so block-streamed replies do not spam mention pings. (#20726) Thanks @thewilloftheshadow for the report.
- Discord/Components: map DM channel targets back to user-scoped component sessions so button/select interactions stay in the main DM session. Thanks @thewilloftheshadow.
- Discord/Allowlist: lazy-load guild lists when resolving Discord user allowlists so ID-only entries resolve even if guild fetch fails. (#20208) Thanks @zhangjunmengyang.
>>>>>>> 866b33e0d (fix: lazy-load Discord allowlist guilds (#20208) (thanks @zhangjunmengyang))

- Discord/Gateway: handle close code 4014 (missing privileged gateway intents) without crashing the gateway. Thanks @thewilloftheshadow.
>>>>>>> 21448508a (fix: Grok web_search extracts output_text blocks at top level (openclaw#20508) thanks @echoVic)
- Security/Net: strip sensitive headers (`Authorization`, `Proxy-Authorization`, `Cookie`, `Cookie2`) on cross-origin redirects in `fetchWithSsrFGuard` to prevent credential forwarding across origin boundaries. (#20313) Thanks @afurm.
- Auto-reply/Runner: emit `onAgentRunStart` only after agent lifecycle or tool activity begins (and only once per run), so fallback preflight errors no longer mark runs as started. (#21165) Thanks @shakkernerd.
- Auto-reply/Tool results: serialize tool-result delivery and keep the delivery chain progressing after individual failures so concurrent tool outputs preserve user-visible ordering. (#21231) thanks @ahdernasr.
- Auto-reply/Prompt caching: restore prefix-cache stability by keeping inbound system metadata session-stable and moving per-message IDs (`message_id`, `message_id_full`, `reply_to_id`, `sender_id`) into untrusted conversation context. (#20597) Thanks @anisoptera.
<<<<<<< HEAD
=======
- iOS/Watch: add actionable watch approval/reject controls and quick-reply actions so watch-originated approvals and responses can be sent directly from notification flows. (#21996) Thanks @mbelinky.
- iOS/Watch: refresh iOS and watch app icon assets with the lobster icon set to keep phone/watch branding aligned. (#21997) Thanks @mbelinky.
- CLI/Onboarding: fix Anthropic-compatible custom provider verification by normalizing base URLs to avoid duplicate `/v1` paths during setup checks. (#21336) Thanks @17jmumford.
- iOS/Gateway/Tools: prefer uniquely connected node matches when duplicate display names exist, surface actionable `nodes invoke` pairing-required guidance with request IDs, and refresh active iOS gateway registration after location-capability setting changes so capability updates apply immediately. (#22120) thanks @mbelinky.
- iOS/Talk: prefetch incremental ElevenLabs TTS audio for upcoming segments during playback to reduce inter-sentence pauses, keep prefetch cancellation aligned with interrupt/reset flows, and treat expected speech-recognition task cancellation as non-error lifecycle behavior. (#22833) Thanks @ngutman.
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
- Cron/Isolated delivery: persist `lastDelivered` in cron job state and run logs for isolated-session runs so delivery failures are visible even when execution status is `ok`. (#19154) Thanks @simonemacario.
- Agents/Compaction: restore embedded compaction safeguard/context-pruning extension loading in production by wiring bundled extension factories into the resource loader instead of runtime file-path resolution. (#22349) Thanks @Glucksberg.
- Agents/Subagents: restore announce-chain delivery to agent injection, defer nested announce output until descendant follow-up content is ready, and prevent descendant deferrals from consuming announce retry budget so deep chains do not drop final completions. (#22223) Thanks @tyler6204.
- Agents/System Prompt: label allowlisted senders as authorized senders to avoid implying ownership. Thanks @thewilloftheshadow.
- Agents/Tool display: fix exec cwd suffix inference so `pushd ... && popd ... && <command>` does not keep stale `(in <dir>)` context in summaries. (#21925) Thanks @Lukavyi.
- Agents/Google: flatten residual nested `anyOf`/`oneOf` unions in Gemini tool-schema cleanup so Cloud Code Assist no longer rejects unsupported union keywords that survive earlier simplification. (#22825) Thanks @Oceanswave.
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
- Security/Exec: block unquoted heredoc body expansion tokens in shell allowlist analysis, reject unterminated heredocs, and require explicit approval for allowlisted heredoc execution on gateway hosts to prevent heredoc substitution allowlist bypass. Thanks @torturado for reporting.
- macOS/Security: evaluate `system.run` allowlists per shell segment in macOS node runtime and companion exec host (including chained shell operators), fail closed on shell/process substitution parsing, and require explicit approval on unsafe parse cases to prevent allowlist bypass via `rawCommand` chaining. Thanks @tdjackey for reporting.
- Security/Archive: block ZIP extraction through pre-existing destination symlinks by validating destination path segments and using no-follow file opens for writes, preventing symlink-pivot writes outside the extraction root. This ships in the next npm release. Thanks @tdjackey for reporting.
- WhatsApp/Security: enforce allowlist JID authorization for reaction actions so authenticated callers cannot target non-allowlisted chats by forging `chatJid` + valid `messageId` pairs. Thanks @aether-ai-agent for reporting.
- ACP/Security: escape control and delimiter characters in ACP `resource_link` title/URI metadata before prompt interpolation to prevent metadata-driven prompt injection through resource links. Thanks @aether-ai-agent for reporting.
- TTS/Security: make model-driven provider switching opt-in by default (`messages.tts.modelOverrides.allowProvider=false` unless explicitly enabled), while keeping voice/style overrides available, to reduce prompt-injection-driven provider hops and unexpected TTS cost escalation. Thanks @aether-ai-agent for reporting.
- Security/Agents: keep overflow compaction retry budgeting global across tool-result truncation recovery so successful truncation cannot reset the overflow retry counter and amplify retry/cost cycles. Thanks @aether-ai-agent for reporting.
- BlueBubbles/Security: require webhook token authentication for all BlueBubbles webhook requests (including loopback/proxied setups), removing passwordless webhook fallback behavior. Thanks @zpbrent.
- iOS/Security: force `https://` for non-loopback manual gateway hosts during iOS onboarding to block insecure remote transport URLs. (#21969) Thanks @mbelinky.
- Gateway/Security: remove shared-IP fallback for canvas endpoints and require token or session capability for canvas access. Thanks @thewilloftheshadow.
- Gateway/Security: require secure context and paired-device checks for Control UI auth even when `gateway.controlUi.allowInsecureAuth` is set, and align audit messaging with the hardened behavior. (#20684) Thanks @coygeek and @Vasco0x4 for reporting.
- Gateway/Security: scope tokenless Tailscale forwarded-header auth to Control UI websocket auth only, so HTTP gateway routes still require token/password even on trusted hosts. Thanks @zpbrent for reporting.
- Gateway/Security: require device identity for `role: node` websocket connections even when shared-token auth succeeds, preventing unpaired device-less clients from invoking `node.event`. Thanks @tdjackey for reporting.
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
- Security/Sandbox: remove default `--no-sandbox` for the browser container entrypoint, add explicit opt-in via `OPENCLAW_BROWSER_NO_SANDBOX` / `CLAWDBOT_BROWSER_NO_SANDBOX`, and add security-audit checks for stale/missing sandbox browser Docker hash labels. Thanks @TerminalsandCoffee and @vincentkoc.
- Security/Sandbox Browser: require VNC password auth for noVNC observer sessions in the sandbox browser entrypoint, plumb per-container noVNC passwords from runtime, and emit short-lived noVNC observer token URLs while keeping loopback-only host port publishing. Thanks @TerminalsandCoffee for reporting.
- Security/Sandbox Browser: default browser sandbox containers to a dedicated Docker network (`openclaw-sandbox-browser`), add optional CDP ingress source-range restrictions, auto-create missing dedicated networks, and warn in `openclaw security --audit` when browser sandboxing runs on bridge without source-range limits. Thanks @TerminalsandCoffee for reporting.
>>>>>>> 3ed71d6f7 (fix: update changelog for ios talk tts prefetch (#22833) (thanks @ngutman))

## 2026.2.19

### Changes

- iOS/Watch: add an Apple Watch companion MVP with watch inbox UI, watch notification relay handling, and gateway command surfaces for watch status/send flows. (#20054) Thanks @mbelinky.
- iOS/Gateway: wake disconnected iOS nodes via APNs before `nodes.invoke` and auto-reconnect gateway sessions on silent push wake to reduce invoke failures while the app is backgrounded. (#20332) Thanks @mbelinky.
- Gateway/CLI: add paired-device hygiene flows with `device.pair.remove`, plus `openclaw devices remove` and guarded `openclaw devices clear --yes [--pending]` commands for removing paired entries and optionally rejecting pending requests. (#20057) Thanks @mbelinky.
- iOS/APNs: add push registration and notification-signing configuration for node delivery. (#20308) Thanks @mbelinky.
- Gateway/APNs: add a push-test pipeline for APNs delivery validation in gateway flows. (#20307) Thanks @mbelinky.
- Security/Audit: add `gateway.http.no_auth` findings when `gateway.auth.mode="none"` leaves Gateway HTTP APIs reachable, with loopback warning and remote-exposure critical severity, plus regression coverage and docs updates.
- Skills: harden coding-agent skill guidance by removing shell-command examples that interpolate untrusted issue text directly into command strings.
- Dev tooling: align `oxfmt` local/CI formatting behavior. (#12579) Thanks @vincentkoc.

### Fixes

- Dev tooling: prevent `CLAUDE.md` symlink target regressions by excluding CLAUDE symlink sentinels from `oxfmt` and marking them `-text` in `.gitattributes`, so formatter/EOL normalization cannot reintroduce trailing-newline targets.
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
>>>>>>> 85fee30e6 (fix: changelog for cross-origin redirect header stripping (#20313) (thanks @afurm))
- Security/Voice Call: harden `voice-call` telephony TTS override merging by blocking unsafe deep-merge keys (`__proto__`, `prototype`, `constructor`) and add regression coverage for top-level and nested prototype-pollution payloads.
>>>>>>> 10379e7dc (fix: harden voice-call tts deep merge)
- Security/Net: enforce strict dotted-decimal IPv4 literals in SSRF checks and fail closed on unsupported legacy forms (octal/hex/short/packed, for example `0177.0.0.1`, `127.1`, `2130706433`) before DNS lookup.
- Security/Discord: enforce trusted-sender guild permission checks for moderation actions (`timeout`, `kick`, `ban`) and ignore untrusted `senderUserId` params to prevent privilege escalation in tool-driven flows. Thanks @aether-ai-agent for reporting.
- Security/ACP+Exec: add `openclaw acp --token-file/--password-file` secret-file support (with inline secret flag warnings), redact ACP working-directory prefixes to `~` home-relative paths, constrain exec script preflight file inspection to the effective `workdir` boundary, and add security-audit warnings when `tools.exec.host="sandbox"` is configured while sandbox mode is off.
- Security/ACP: harden ACP bridge session management with duplicate-session refresh, idle-session reaping, oldest-idle soft-cap eviction, and burst rate limiting on session creation to reduce local DoS risk without disrupting normal IDE usage.
- Security/Plugins/Hooks: add optional `--pin` for npm plugin/hook installs, persist resolved npm metadata (`name`, `version`, `spec`, integrity, shasum, timestamp), warn/confirm on integrity drift during updates, and extend `openclaw security audit` to flag unpinned specs, missing integrity metadata, and install-record version drift.
- Security/Plugins: harden plugin discovery by blocking unsafe candidates (root escapes, world-writable paths, suspicious ownership), add startup warnings when `plugins.allow` is empty with discoverable non-bundled plugins, and warn on loaded plugins without install/load-path provenance.
- Refactor/Plugins: extract shared plugin path-safety utilities, split discovery safety checks into typed reasoned guards, precompute provenance matchers during plugin load, and switch ownership tests to injected uid inputs.
>>>>>>> b40821b06 (fix: harden ACP secret handling and exec preflight boundaries)
- Security/Gateway: rate-limit control-plane write RPCs (`config.apply`, `config.patch`, `update.run`) to 3 requests per minute per `deviceId+clientIp`, add restart single-flight coalescing plus a 30-second restart cooldown, and log actor/device/ip with changed-path audit details for config/update-triggered restarts.
- Commands/Doctor: skip embedding-provider warnings when `memory.backend` is `qmd`, because QMD manages embeddings internally and does not require `memorySearch` providers. (#17263) Thanks @miloudbelarebia.
- Security/Webhooks: harden Feishu and Zalo webhook ingress with webhook-mode token preconditions, loopback-default Feishu bind host, JSON content-type enforcement, per-path rate limiting, replay dedupe for Zalo events, constant-time Zalo secret comparison, and anomaly status counters.
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
- Tests/Security: refactor `src/security/audit.test.ts` by extracting shared helpers to reduce duplication in security audit test coverage. (#20087) Thanks @habakan.
- Channels/Matrix: fix mention detection for `formatted_body` Matrix-to links by handling matrix.to mention formats consistently. (#16941) Thanks @zerone0x.
- Scripts: update clawdock helper command support to include `docker-compose.extra.yml` where available. (#17094) Thanks @zerone0x.
- Security/iMessage: harden remote attachment SSH/SCP handling by requiring strict host-key verification, validating `channels.imessage.remoteHost` as `host`/`user@host`, and rejecting unsafe host tokens from config or auto-detection. Thanks @allsmog for reporting.
- Security/Feishu: prevent path traversal in Feishu inbound media temp-file writes by replacing key-derived temp filenames with UUID-based names. Thanks @allsmog for reporting.
- Security/Feishu: escape mention regex metacharacters in `stripBotMention` so crafted mention metadata cannot trigger regex injection or ReDoS during inbound message parsing. (#20916) Thanks @orlyjamie for the fix and @allsmog for reporting.
- LINE/Security: harden inbound media temp-file naming by using UUID-based temp paths for downloaded media instead of external message IDs. (#20792) Thanks @mbelinky.
- Security/Refactor: centralize hardened temp-file path generation for Feishu and LINE media downloads via shared `buildRandomTempFilePath` helper to reduce drift risk. (#20810) Thanks @mbelinky.
- Security/Media: harden local media ingestion against TOCTOU/symlink swap attacks by pinning reads to a single file descriptor with symlink rejection and inode/device verification in `saveMediaSource`. Thanks @dorjoos for reporting.
- Security/Lobster (Windows): for the next npm release, remove shell-based fallback when launching Lobster wrappers (`.cmd`/`.bat`) and switch to explicit argv execution with wrapper entrypoint resolution, preventing command injection while preserving Windows wrapper compatibility. Thanks @tdjackey for reporting.
>>>>>>> ff74d89e8 (fix: harden gateway control-plane restart protections)
- Agents/Streaming: keep assistant partial streaming active during reasoning streams, handle native `thinking_*` stream events consistently, dedupe mixed reasoning-end signals, and clear stale mutating tool errors after same-target retry success. (#20635) Thanks @obviyus.
- Gateway/Auth: default unresolved gateway auth to token mode with startup auto-generation/persistence of `gateway.auth.token`, while allowing explicit `gateway.auth.mode: "none"` for intentional open loopback setups. (#20686) thanks @gumadeiras.
- Browser/Relay: require gateway-token auth on both `/extension` and `/cdp`, and align Chrome extension setup to use a single `gateway.auth.token` input for relay authentication. Thanks @tdjackey for reporting.
>>>>>>> d3dab089d (fix: preserve reasoning stream partial contract (#20635) (thanks @obviyus))
- Gateway/Hooks: run BOOT.md startup checks per configured agent scope, including per-agent session-key resolution, startup-hook regression coverage, and non-success boot outcome logging for diagnosability. (#20569) thanks @mcaxtr.
- Telegram: unify message-like inbound handling so `message` and `channel_post` share the same dedupe/access/media pipeline and remain behaviorally consistent. (#20591) Thanks @obviyus.
<<<<<<< HEAD
>>>>>>> 48e6b4fca (fix: run BOOT.md for each configured agent at startup (#20569))
=======
- Heartbeat/Cron: skip interval heartbeats when `HEARTBEAT.md` is missing or empty and no tagged cron events are queued, while preserving cron-event fallback for queued tagged reminders. (#20461) thanks @vikpos.
>>>>>>> f855d0be4 (fix: skip heartbeat when HEARTBEAT.md does not exist (#20461))
- Telegram/Agents: gate exec/bash tool-failure warnings behind verbose mode so default Telegram replies stay clean while verbose sessions still surface diagnostics. (#20560) Thanks @obviyus.
>>>>>>> 6b05916c1 (fix: gate Telegram exec tool warnings behind verbose mode (#20560))
- Gateway/Daemon: forward `TMPDIR` into installed service environments so macOS LaunchAgent gateway runs can open SQLite temp/journal files reliably instead of failing with `SQLITE_CANTOPEN`. (#20512) Thanks @Clawborn.
- Agents/Billing: include the active model that produced a billing error in user-facing billing messages (for example, `OpenAI (gpt-5.3)`) across payload, failover, and lifecycle error paths, so users can identify exactly which key needs credits. (#20510) Thanks @echoVic.
>>>>>>> 3d4ef5604 (fix: include provider and model name in billing error message (#20510))
- iOS/Screen: move `WKWebView` lifecycle ownership into `ScreenWebView` coordinator and explicit attach/detach flow to reduce gesture/lifecycle crash risk (`__NSArrayM insertObject:atIndex:` paths) during screen tab updates. (#20366) Thanks @ngutman.
- Gateway/TUI: honor `agents.defaults.blockStreamingDefault` for `chat.send` by removing the hardcoded block-streaming disable override, so replies can use configured block-mode delivery. (#19693) Thanks @neipor.
- Protocol/Apple: regenerate Swift gateway models for `push.test` so `pnpm protocol:check` stays green on main. Thanks @mbelinky.
- Canvas/A2UI: improve bundled-asset resolution and empty-state handling so UI fallbacks render reliably. (#20312) Thanks @mbelinky.
- UI/Sessions: accept the canonical main session-key alias in Chat UI flows so main-session routing stays consistent. (#20311) Thanks @mbelinky.
- iOS/Onboarding: prevent pairing-status flicker during auto-resume by keeping resumed state transitions stable. (#20310) Thanks @mbelinky.
- OpenClawKit/Protocol: preserve JSON boolean literals (`true`/`false`) when bridging through `AnyCodable` so Apple client RPC params no longer re-encode booleans as `1`/`0`. Thanks @mbelinky.
- iOS/Onboarding: stabilize pairing and reconnect behavior by resetting stale pairing request state on manual retry, disconnecting both operator and node gateways on operator failure, and avoiding duplicate pairing loops from operator transport identity attachment. (#20056) Thanks @mbelinky.
- Browser/Relay: reuse an already-running extension relay when the relay port is occupied by another OpenClaw process, while still failing on non-relay port collisions to avoid masking unrelated listeners. (#20035) Thanks @mbelinky.
- Telegram/Cron/Heartbeat: honor explicit Telegram topic targets in cron and heartbeat delivery (`<chatId>:topic:<threadId>`) so scheduled sends land in the configured topic instead of the last active thread. (#19367) Thanks @Lukavyi.
- iOS/Signing: restore local auto-selected signing-team overrides during iOS project generation by wiring `.local-signing.xcconfig` into the active signing config and emitting `OPENCLAW_DEVELOPMENT_TEAM` in local signing setup. (#19993) Thanks @ngutman.
>>>>>>> b62bd290c (fix: remove hardcoded disableBlockStreaming to honor agent config for TUI (#19693))
- Commands/Doctor: avoid rewriting invalid configs with new `gateway.auth.token` defaults during repair and only write when real config changes are detected, preventing accidental token duplication and backup churn.
- Sandbox/Registry: serialize container and browser registry writes with shared file locks and atomic replacement to prevent lost updates and delete rollback races from desyncing `sandbox list`, `prune`, and `recreate --all`. Thanks @kexinoh.
<<<<<<< HEAD
=======
- Security/Exec: require `tools.exec.safeBins` binaries to resolve from trusted bin directories (system defaults plus gateway startup `PATH`) so PATH-hijacked trojan binaries cannot bypass allowlist checks. Thanks @jackhax for reporting.
- Security/Exec: remove file-existence oracle behavior from `tools.exec.safeBins` by using deterministic argv-only stdin-safe validation and blocking file-oriented flags (for example `sort -o`, `jq -f`, `grep -f`) so allow/deny results no longer disclose host file presence. This ships in the next npm release. Thanks @nedlir for reporting.
- Security/Browser: route browser URL navigation through one SSRF-guarded validation path for tab-open/CDP-target/Playwright navigation flows and block private/metadata destinations by default (configurable via `browser.ssrfPolicy`). This ships in the next npm release. Thanks @dorjoos for reporting.
- Security/Exec: for the next npm release, harden safe-bin stdin-only enforcement by blocking output/recursive flags (`sort -o/--output`, grep recursion) and tightening default safe bins to remove `sort`/`grep`, preventing safe-bin allowlist bypass for file writes/recursive reads. Thanks @nedlir for reporting.
- Cron/Webhooks: protect cron webhook POST delivery with SSRF-guarded outbound fetch (`fetchWithSsrFGuard`) to block private/metadata destinations before request dispatch. Thanks @Adam55A-code.
- Security/Gateway/Agents: remove implicit admin scopes from agent tool gateway calls by classifying methods to least-privilege operator scopes, and restrict `cron`/`gateway` tools to owner senders (with explicit runtime owner checks) to prevent non-owner DM privilege escalation. Ships in the next npm release. Thanks @Adam55A-code for reporting.
- Security/Net: block SSRF bypass via NAT64 (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 (`2002::/16`), and Teredo (`2001:0000::/32`) IPv6 transition addresses, and fail closed on IPv6 parse errors. Thanks @jackhax.
>>>>>>> a40c10d3e (fix: harden agent gateway authorization scopes)

## 2026.2.17

### Changes

- Agents/Anthropic: add opt-in 1M context beta header support for Opus/Sonnet via model `params.context1m: true` (maps to `anthropic-beta: context-1m-2025-08-07`).
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
- Telegram/Agents: add inline button `style` support (`primary|success|danger`) across message tool schema, Telegram action parsing, send pipeline, and runtime prompt guidance. (#18241) Thanks @obviyus.
- Telegram: surface user message reactions as system events, with configurable `channels.telegram.reactionNotifications` scope. (#10075) Thanks @Glucksberg.
- iMessage: support `replyToId` on outbound text/media sends and normalize leading `[[reply_to:<id>]]` tags so replies target the intended iMessage. Thanks @tyler6204.
- Tool Display/Web UI: add intent-first tool detail views and exec summaries. (#18592) Thanks @xdLawless2.
- Discord: expose native `/exec` command options (host/security/ask/node) so Discord slash commands get autocomplete and structured inputs. Thanks @thewilloftheshadow.
- Discord: allow reusable interactive components with `components.reusable=true` so buttons, selects, and forms can be used multiple times before expiring. Thanks @thewilloftheshadow.
- Discord: add per-button `allowedUsers` allowlist for interactive components to restrict who can click buttons. Thanks @thewilloftheshadow.
- Cron/Gateway: separate per-job webhook delivery (`delivery.mode = "webhook"`) from announce delivery, enforce valid HTTP(S) webhook URLs, and keep a temporary legacy `notify + cron.webhook` fallback for stored jobs. (#17901) Thanks @advaitpaliwal.
- Cron/CLI: add deterministic default stagger for recurring top-of-hour cron schedules (including 6-field seconds cron), auto-migrate existing jobs to persisted `schedule.staggerMs`, and add `openclaw cron add/edit --stagger <duration>` plus `--exact` overrides for per-job timing control.
- Cron: log per-run model/provider usage telemetry in cron run logs/webhooks and add a local usage report script for aggregating token usage by job. (#18172) Thanks @HankAndTheCrew.
- Tools/Web: add URL allowlists for `web_search` and `web_fetch`. (#18584) Thanks @smartprogrammer93.
- Browser: add `extraArgs` config for custom Chrome launch arguments. (#18443) Thanks @JayMishra-source.
- Voice Call: pre-cache inbound greeting TTS for faster first playback. (#18447) Thanks @JayMishra-source.
>>>>>>> cc29be8c9 (fix: serialize sandbox registry writes)
- Skills: compact skill file `<location>` paths in the system prompt by replacing home-directory prefixes with `~`, and add targeted compaction tests for prompt serialization behavior. (#14776) Thanks @bitfish3.
- Skills: refine skill-description routing boundaries with explicit "Use when"/"NOT for" guidance for coding-agent/github/weather, and clarify PTY/browser fallback wording. (#14577) Thanks @DylanWoodAkers.
- Agents/Subagents: add an accepted response note for `sessions_spawn` explaining polling subagents are disabled for one-off calls. Thanks @tyler6204.
- Agents/Subagents: prefix spawned subagent task messages with context to preserve source information in downstream handling. Thanks @tyler6204.
- iMessage: support `replyToId` on outbound text/media sends and normalize leading `[[reply_to:<id>]]` tags so replies target the intended iMessage. Thanks @tyler6204.
- UI/Sessions: avoid duplicating typed session prefixes in display names (for example `Subagent Subagent ...`). Thanks @tyler6204.
- Auto-reply/Prompts: include trusted inbound `message_id` in conversation metadata payloads for downstream targeting workflows. Thanks @tyler6204.
>>>>>>> 76949001e (fix: compact skill paths in prompt (#14776) (thanks @bitfish3))
- iOS/Talk: add a `Background Listening` toggle that keeps Talk Mode active while the app is backgrounded (off by default for battery safety). Thanks @zeulewan.
- iOS/Talk: harden barge-in behavior by disabling interrupt-on-speech when output route is built-in speaker/receiver, reducing false interruptions from local TTS bleed-through. Thanks @zeulewan.
- iOS/Talk: add a `Voice Directive Hint` toggle for Talk Mode prompts so users can disable ElevenLabs voice-switching instructions to save tokens when not needed. (#18250) Thanks @zeulewan.
- Telegram/Agents: add inline button `style` support (`primary|success|danger`) across message tool schema, Telegram action parsing, send pipeline, and runtime prompt guidance. (#18241) Thanks @obviyus.
<<<<<<< HEAD
=======
- Telegram: surface user message reactions as system events, with configurable `channels.telegram.reactionNotifications` scope. (#10075) Thanks @Glucksberg.
- Slack: add configurable streaming modes for draft previews. (#18555) Thanks @Solvely-Colin.
- Slack: add native single-message text streaming with Slack `chat.startStream`/`appendStream`/`stopStream`; keep reply threading aligned with `replyToMode`, default streaming to enabled, and fall back to normal delivery when streaming fails. (#9972) Thanks @natedenh.
- Slack: add external-select flow for large argument menus. (#18496) Thanks @Solvely-Colin.
>>>>>>> 1d23934c0 (fix: follow-up slack streaming routing/tests (#9972) (thanks @natedenh))
- Discord: expose native `/exec` command options (host/security/ask/node) so Discord slash commands get autocomplete and structured inputs. Thanks @thewilloftheshadow.
- Discord: allow reusable interactive components with `components.reusable=true` so buttons, selects, and forms can be used multiple times before expiring. Thanks @thewilloftheshadow.
- Cron/Gateway: separate per-job webhook delivery (`delivery.mode = "webhook"`) from announce delivery, enforce valid HTTP(S) webhook URLs, and keep a temporary legacy `notify + cron.webhook` fallback for stored jobs. (#17901) Thanks @advaitpaliwal.
- Discord: add per-button `allowedUsers` allowlist for interactive components to restrict who can click buttons. Thanks @thewilloftheshadow.

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
- Agents: revert accidental per-model thinkingDefault override merge. (#19195) Thanks @sebslight.
- Sessions: revert accidental session transcript permission hardening from PR #18288. (#19224) Thanks @sebslight.
=======
=======
- Agents/Antigravity: preserve unsigned Claude thinking blocks as plain text instead of dropping them during transcript sanitization, preventing reasoning context loss while avoiding `thinking.signature` request rejections.
>>>>>>> 86f207adb (fix: clean tool schemas and thinking blocks for google-antigravity (openclaw#19732) thanks @Oceanswave)
- Agents/Google: clean tool JSON Schemas for `google-antigravity` the same as `google-gemini-cli` before Cloud Code Assist requests, preventing Claude tool calls from failing with `patternProperties` 400 errors. (#19860)
- Tests/Telegram: add regression coverage for command-menu sync that asserts all `setMyCommands` entries are Telegram-safe and hyphen-normalized across native/custom/plugin command sources. (#19703) Thanks @obviyus.
- Agents/Image: collapse resize diagnostics to one line per image and include visible pixel/byte size details in the log message for faster triage.
- Auth/Cooldowns: clear all usage stats fields (`disabledUntil`, `disabledReason`, `failureCounts`) in `clearAuthProfileCooldown` so manual cooldown resets fully recover billing-disabled profiles without requiring direct file edits. (#19211) Thanks @nabbilkhan.
- Agents/Subagents: preemptively guard accumulated tool-result context before model calls by truncating oversized outputs and compacting oldest tool-result messages to avoid context-window overflow crashes. Thanks @tyler6204.
- Agents/Subagents/CLI: fail `sessions_spawn` when subagent model patching is rejected, allow subagent model patch defaults from `subagents.model`, and keep `sessions list`/`status` model reporting aligned to runtime model resolution. (#18660) Thanks @robbyczgw-cla.
- Agents/Subagents: add explicit subagent guidance to recover from `[compacted: tool output removed to free context]` / `[truncated: output exceeded context limit]` markers by re-reading with smaller chunks instead of full-file `cat`. Thanks @tyler6204.
- Agents/Tools: make `read` auto-page across chunks (when no explicit `limit` is provided) and scale its per-call output budget from model `contextWindow`, so larger contexts can read more before context guards kick in. Thanks @tyler6204.
- Agents/Tools: strip duplicated `read` truncation payloads from tool-result `details` and make pre-call context guarding account for heavy tool-result metadata, so repeated `read` calls no longer bypass compaction and overflow model context windows. Thanks @tyler6204.
- Reply threading: keep reply context sticky across streamed/split chunks and preserve `replyToId` on all chunk sends across shared and channel-specific delivery paths (including iMessage, BlueBubbles, Telegram, Discord, and Matrix), so follow-up bubbles stay attached to the same referenced message. Thanks @tyler6204.
- Gateway/Agent: defer transient lifecycle `error` snapshots with a short grace window so `agent.wait` does not resolve early during retry/failover. Thanks @tyler6204.
- Gateway/Presence: centralize presence snapshot broadcasts and unify runtime version precedence (`OPENCLAW_VERSION` > `OPENCLAW_SERVICE_VERSION` > `npm_package_version`) so self-presence and websocket `hello-ok` report consistent versions.
- Hooks/Automation: bridge outbound/inbound message lifecycle into internal hook events (`message:received`, `message:sent`) with session-key correlation guards, while keeping per-payload success/error reporting accurate for chunked and best-effort deliveries. (PR #9387)
- Media understanding: honor `agents.defaults.imageModel` during auto-discovery so implicit image analysis uses configured primary/fallback image models. (PR #7607)
- iOS/Onboarding: stop auth Step 3 retry-loop churn by pausing reconnect attempts on unauthorized/missing-token gateway errors and keeping auth/pairing issue state sticky during manual retry. (#19153) Thanks @mbelinky.
- Voice-call: auto-end calls when media streams disconnect to prevent stuck active calls. (#18435) Thanks @JayMishra-source.
- Voice call/Gateway: prevent overlapping closed-loop turn races with per-call turn locking, route transcript dedupe via source-aware fingerprints with strict cache eviction bounds, and harden `voicecall latency` stats for large logs without spread-operator stack overflow. (#19140) Thanks @mbelinky.
- iOS/Chat: route ChatSheet RPCs through the operator session instead of the node session to avoid node-role authorization failures for `chat.history`, `chat.send`, and `sessions.list`. (#19320) Thanks @mbelinky.
>>>>>>> 59e58bf81 (fix: strip unsupported JSON Schema keywords for Claude via Cloud Code Assist (openclaw#20124) thanks @ephraimm)
- macOS/Update: correct the Sparkle appcast version for 2026.2.15 so updates are offered again. (#18201)
- Gateway/Auth: clear stale device-auth tokens after device token mismatch errors so re-paired clients can re-auth. (#18201)
<<<<<<< HEAD
- Voice call/Gateway: prevent overlapping closed-loop turn races with per-call turn locking, route transcript dedupe via source-aware fingerprints with strict cache eviction bounds, and harden `voicecall latency` stats for large logs without spread-operator stack overflow. (#19140) Thanks @mbelinky.
- iOS/Onboarding: stop auth Step 3 retry-loop churn by pausing reconnect attempts on unauthorized/missing-token gateway errors and keeping auth/pairing issue state sticky during manual retry. (#19153) Thanks @mbelinky.
=======
- Telegram: enable DM voice-note transcription with CLI fallback handling. (#18564) Thanks @thhuang.
- Telegram/Polls: restore Telegram poll action wiring in channel handlers. (#18122) Thanks @akyourowngames.
- WebChat: strip reply/audio directive tags from rendered chat output. (#18093) Thanks @aldoeliacim.
- Discord: honor configured HTTP proxy for app-id and allowlist REST resolution. (#17958) Thanks @k2009.
- BlueBubbles: add fallback path to recover outbound `message_id` from `fromMe` webhooks when platform message IDs are missing. Thanks @tyler6204.
- BlueBubbles: match outbound message-id fallback recovery by chat identifier as well as account context. Thanks @tyler6204.
- BlueBubbles: include sender identifier in untrusted conversation metadata for conversation info payloads. Thanks @tyler6204.
- Security/Exec: fix the OC-09 credential-theft path via environment-variable injection. (#18048) Thanks @aether-ai-agent.
- Security/Config: confine `$include` resolution to the top-level config directory, harden traversal/symlink checks with cross-platform-safe path containment, and add doctor hints for invalid escaped include paths. (#18652) Thanks @aether-ai-agent.
- Security/Net: block SSRF bypass via ISATAP embedded IPv4 transition addresses and centralize hostname/IP blocking checks across URL safety validators. Thanks @zpbrent for reporting.
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
>>>>>>> d1c00dbb7 (fix: harden include confinement edge cases (#18652) (thanks @aether-ai-agent))
- Fix types in all tests. Typecheck the whole repository.
- Voice-call: auto-end calls when media streams disconnect to prevent stuck active calls. (#18435) Thanks @JayMishra-source.
- Gateway/Channels: wire `gateway.channelHealthCheckMinutes` into strict config validation, treat implicit account status as managed for health checks, and harden channel auto-restart flow (preserve restart-attempt caps across crash loops, propagate enabled/configured runtime flags, and stop pending restart backoff after manual stop). Thanks @steipete.
- Gateway/WebChat: hard-cap `chat.history` oversized payloads by truncating high-cost fields and replacing over-budget entries with placeholders, so history fetches stay within configured byte limits and avoid chat UI freezes. (#18505)
- UI/Usage: replace lingering undefined `var(--text-muted)` usage with `var(--muted)` in usage date-range and chart styles to keep muted text visible across themes. (#17975) Thanks @jogelin.
- UI/Usage: preserve selected-range totals when timeline data is downsampled by bucket-aggregating timeseries points (instead of dropping intermediate points), so filtered tokens/cost stay accurate. (#17959) Thanks @jogelin.
- UI/Sessions: refresh the sessions table only after successful deletes and preserve delete errors on cancel/failure paths, so deleted sessions disappear automatically without masking delete failures. (#18507)
- Scripts/UI/Windows: fix `pnpm ui:*` spawn `EINVAL` failures by restoring shell-backed launch for `.cmd`/`.bat` runners, narrowing shell usage to launcher types that require it, and rejecting unsafe forwarded shell metacharacters in UI script args. (#18594)
- Hooks/Session-memory: recover `/new` conversation summaries when session pointers are reset-path or missing `sessionFile`, and consistently prefer the newest `.jsonl.reset.*` transcript candidate for fallback extraction. (#18088)
- Auto-reply/Sessions: prevent stale thread ID leakage into non-thread sessions so replies stay in the main DM after topic interactions. (#18528) Thanks @j2h4u.
- Slack: restrict forwarded-attachment ingestion to explicit shared-message attachments and skip non-Slack forwarded `image_url` fetches, preventing non-forward attachment unfurls from polluting inbound agent context while preserving forwarded message handling.
- Feishu: detect bot mentions in post messages with embedded docs when `message.mentions` is empty. (#18074) Thanks @popomore.
- Agents/Sessions: align session lock watchdog hold windows with run and compaction timeout budgets (plus grace), preventing valid long-running turns from being force-unlocked mid-run while still recovering hung lock owners. (#18060)
- Cron: preserve default model fallbacks for cron agent runs when only `model.primary` is overridden, so failover still follows configured fallbacks unless explicitly cleared with `fallbacks: []`. (#18210) Thanks @mahsumaktas.
>>>>>>> 19a8f8bbf (test(cron): add model fallback regression coverage)
- Cron/Heartbeat: canonicalize session-scoped reminder `sessionKey` routing and preserve explicit flat `sessionKey` cron tool inputs, preventing enqueue/wake namespace drift for session-targeted reminders. (#18637) Thanks @vignesh07.
<<<<<<< HEAD
=======
- Cron/Webhooks: reuse existing session IDs for webhook/cron runs when the session key is stable and still fresh, preserving conversation history. (#18031) Thanks @Operative-001.
- Cron: prevent spin loops when cron jobs complete within the scheduled second by advancing the next run and enforcing a minimum refire gap. (#18073) Thanks @widingmarcus-cyber.
>>>>>>> e74ec2acd (fix(cron): add spin-loop regression coverage)
- OpenClawKit/iOS ChatUI: accept canonical session-key completion events for local pending runs and preserve message IDs across history refreshes, preventing stuck "thinking" state and message flicker after gateway replies. (#18165) Thanks @mbelinky.
- iOS/Onboarding: add QR-first onboarding wizard with setup-code deep link support, pairing/auth issue guidance, and device-pair QR generation improvements for Telegram/Web/TUI fallback flows. (#18162) Thanks @mbelinky and @Marvae.
- iOS/Gateway: stabilize connect/discovery state handling, add onboarding reset recovery in Settings, and fix iOS gateway-controller coverage for command-surface and last-connection persistence behavior. (#18164) Thanks @mbelinky.
- iOS/Talk: harden mobile talk config handling by ignoring redacted/env-placeholder API keys, support secure local keychain override, improve accessibility motion/contrast behavior in status UI, and tighten ATS to local-network allowance. (#18163) Thanks @mbelinky.
- iOS/Location: restore the significant location monitor implementation (service hooks + protocol surface + ATS key alignment) after merge drift so iOS builds compile again. (#18260) Thanks @ngutman.
- Telegram: keep DM-topic replies and draft previews in the originating private-chat topic by preserving positive `message_thread_id` values for DM threads. (#18586) Thanks @sebslight.
- Telegram: preserve private-chat topic `message_thread_id` on outbound sends (message/sticker/poll), keep thread-not-found retry fallback, and avoid masking `chat not found` routing errors. (#18993) Thanks @obviyus.
- Discord: prevent duplicate media delivery when the model uses the `message send` tool with media, by skipping media extraction from messaging tool results since the tool already sent the message directly. (#18270)
- Telegram: keep draft-stream preview replies attached to the user message for `replyToMode: "all"` in groups and DMs, preserving threaded reply context from preview through finalization. (#17880) Thanks @yinghaosang.
- Telegram: prevent streaming final replies from being overwritten by later final/error payloads, and suppress fallback tool-error warnings when a recovered assistant answer already exists after tool calls. (#17883) Thanks @Marvae and @obviyus.
- Telegram: disable block streaming when `channels.telegram.streamMode` is `off`, preventing newline/content-block replies from splitting into multiple messages. (#17679) Thanks @saivarunk.
<<<<<<< HEAD
=======
- Telegram: keep `streamMode: "partial"` draft previews in a single message across assistant-message/reasoning boundaries, preventing duplicate preview bubbles during partial-mode tool-call turns. (#18956) Thanks @obviyus.
- Telegram: normalize native command names for Telegram menu registration (`-` -> `_`) to avoid `BOT_COMMAND_INVALID` command-menu wipeouts, and log failed command syncs instead of silently swallowing them. (#19257) Thanks @akramcodez.
>>>>>>> c4e9bb3b9 (fix: sanitize native command names for Telegram API (#19257))
- Telegram: route non-abort slash commands on the normal chat/topic sequential lane while keeping true abort requests (`/stop`, `stop`) on the control lane, preventing command/reply race conditions from control-lane bypass. (#17899) Thanks @obviyus.
- Telegram: ignore `<media:...>` placeholder lines when extracting `MEDIA:` tool-result paths, preventing false local-file reads and dropped replies. (#18510) Thanks @yinghaosang.
- Auto-reply/TTS: keep tool-result media delivery enabled in group chats and native command sessions (while still suppressing tool summary text) so `NO_REPLY` follow-ups do not drop successful TTS audio. (#17991) Thanks @zerone0x.
- Discord: optimize reaction notification handling to skip unnecessary message fetches in `off`/`all`/`allowlist` modes, streamline reaction routing, and improve reaction emoji formatting. (#18248) Thanks @thewilloftheshadow and @victorGPT.
- CLI/Pairing: make `openclaw qr --remote` prefer `gateway.remote.url` over tailscale/public URL resolution and register the `openclaw clawbot qr` legacy alias path. (#18091)
- CLI/QR: restore fail-fast validation for `openclaw qr --remote` when neither `gateway.remote.url` nor tailscale `serve`/`funnel` is configured, preventing unusable remote pairing QR flows. (#18166) Thanks @mbelinky.
<<<<<<< HEAD
=======
- CLI/Doctor: ensure `openclaw doctor --fix --non-interactive --yes` exits promptly after completion so one-shot automation no longer hangs. (#18502)
- CLI/Doctor: auto-repair `dmPolicy="open"` configs missing wildcard allowlists and write channel-correct repair paths (including `channels.googlechat.dm.allowFrom`) so `openclaw doctor --fix` no longer leaves Google Chat configs invalid after attempted repair. (#18544)
- CLI/Doctor: detect gateway service token drift when the gateway token is only provided via environment variables, keeping service repairs aligned after token rotation.
<<<<<<< HEAD
=======
- Gateway/Update: prevent restart crash loops after failed self-updates by restarting only on successful updates, stopping early on failed install/build steps, and running `openclaw doctor --fix` during updates to sanitize config. (#18131) Thanks @RamiNoodle733.
- Gateway/Update: preserve update.run restart delivery context so post-update status replies route back to the initiating channel/thread. (#18267) Thanks @yinghaosang.
- CLI/Update: run a standalone restart helper after updates, honoring service-name overrides and reporting restart initiation separately from confirmed restarts. (#18050)
- CLI/Daemon: warn when a gateway restart sees a stale service token so users can reinstall with `openclaw gateway install --force`, and skip drift warnings for non-gateway service restarts. (#18018)
>>>>>>> 3f66280c3 (test(sessions): add delivery info regression coverage)
- CLI/Status: fix `openclaw status --all` token summaries for bot-token-only channels so Mattermost/Zalo no longer show a bot+app warning. (#18527) Thanks @echo931.
- CLI/Configure: make the `/model picker` allowlist prompt searchable with tokenized matching in `openclaw configure` so users can filter huge model lists by typing terms like `gpt-5.2 openai/`. (#19010) Thanks @bjesuiter.
- Voice Call: add an optional stale call reaper (`staleCallReaperSeconds`) to end stuck calls when enabled. (#18437)
- Auto-reply/Subagents: propagate group context (`groupId`, `groupChannel`, `space`) when spawning via `/subagents spawn`, matching tool-triggered subagent spawn behavior.
- Subagents: route nested announce results back to the parent session after the parent run ends, falling back only when the parent session is deleted. (#18043)
- Subagents: cap announce retry loops with max attempts and expiry to prevent infinite retry spam after deferred announces. (#18444)
>>>>>>> 19f8b6bf4 (fix: searchable model picker in configure (#19010) (thanks @bjesuiter))
- Agents/Tools/exec: add a preflight guard that detects likely shell env var injection (e.g. `$DM_JSON`, `$TMPDIR`) in Python/Node scripts before execution, preventing recurring cron failures and wasted tokens when models emit mixed shell+language source. (#12836)
- Agents/Tools: make loop detection progress-aware and phased by hard-blocking known `process(action=poll|log)` no-progress loops, warning on generic identical-call repeats, warning + no-progress-blocking ping-pong alternation loops (10/20), coalescing repeated warning spam into threshold buckets (including canonical ping-pong pairs), adding a global circuit breaker at 30 no-progress repeats, and emitting structured diagnostic `tool.loop` warning/error events for loop actions. (#16808) Thanks @akramcodez and @beca-oc.
- Agents/Hooks: preserve the `before_tool_call` wrapped-marker across abort-signal tool wrapping so the hook runs once per tool call in normal agent sessions. (#16852) Thanks @sreuter.
- Agents/Tests: add `before_message_write` persistence regression coverage for block/mutate behavior (including synthetic tool-result flushes) and thrown-hook fallback persistence. (#18197) Thanks @shakkernerd
- Agents/Tools: scope the `message` tool schema to the active channel so Telegram uses `buttons` and Discord uses `components`. (#18215) Thanks @obviyus.
- Agents/Models: probe the primary model when its auth-profile cooldown is near expiry (with per-provider throttling), so runs recover from temporary rate limits without staying on fallback models until restart. (#17478) Thanks @PlayerGhost.
- Agents/Failover: classify provider abort stop-reason errors (`Unhandled stop reason: abort`, `stop reason: abort`, `reason: abort`) as timeout-class failures so configured model fallback chains trigger instead of surfacing raw abort failures. (#18618) Thanks @sauerdaniel.
- Agents/Context: raise default total bootstrap prompt cap from `24000` to `150000` chars (keeping `bootstrapMaxChars` at `20000`), include total-cap visibility in `/context`, and mark truncation from injected-vs-raw sizes so total-cap clipping is reflected accurately.
- Memory/QMD: scope managed collection names per agent and precreate glob-backed collection directories before registration, preventing cross-agent collection clobbering and startup ENOENT failures in fresh workspaces. (#17194) Thanks @jonathanadams96.
- Cron: preserve per-job schedule-error isolation in post-run maintenance recompute so malformed sibling jobs no longer abort persistence of successful runs. (#17852) Thanks @pierreeurope.
- Gateway/Config: prevent `config.patch` object-array merges from falling back to full-array replacement when some patch entries lack `id`, so partial `agents.list` updates no longer drop unrelated agents. (#17989) Thanks @stakeswky.
- Config/Discord: require string IDs in Discord allowlists, keep onboarding inputs string-only, and add doctor repair for numeric entries. (#18220) Thanks @thewilloftheshadow.
- Security/Sessions: create new session transcript JSONL files with user-only (`0o600`) permissions and extend `openclaw security audit --fix` to remediate existing transcript file permissions.
- Infra/Fetch: ensure foreign abort-signal listener cleanup never masks original fetch successes/failures, while still preventing detached-finally unhandled rejection noise in `wrapFetchWithAbortSignal`. Thanks @Jackten.
- Heartbeat: allow suppressing tool error warning payloads during heartbeat runs via a new heartbeat config flag. (#18497) Thanks @thewilloftheshadow.

## 2026.2.15

### Changes

- Discord: unlock rich interactive agent prompts with Components v2 (buttons, selects, modals, and attachment-backed file blocks) so for native interaction through Discord. Thanks @thewilloftheshadow.
- Discord: components v2 UI + embeds passthrough + exec approval UX refinements (CV2 containers, button layout, Discord-forwarding skip). Thanks @thewilloftheshadow.
- Plugins: expose `llm_input` and `llm_output` hook payloads so extensions can observe prompt/input context and model output usage details. (#16724) Thanks @SecondThread.
>>>>>>> c20ef582c (fix: align cron session key routing (#18637) (thanks @vignesh07))
- Subagents: nested sub-agents (sub-sub-agents) with configurable depth. Set `agents.defaults.subagents.maxSpawnDepth: 2` to allow sub-agents to spawn their own children. Includes `maxChildrenPerAgent` limit (default 5), depth-aware tool policy, and proper announce chain routing. (#14447) Thanks @tyler6204.
- Discord: components v2 UI + embeds passthrough + exec approval UX refinements (CV2 containers, button layout, Discord-forwarding skip). Thanks @thewilloftheshadow.
- Slack/Discord/Telegram: add per-channel ack reaction overrides (account/channel-level) to support platform-specific emoji formats. (#17092) Thanks @zerone0x.
- Channels: deduplicate probe/token resolution base types across core + extensions while preserving per-channel error typing. (#16986) Thanks @iyoda and @thewilloftheshadow.
>>>>>>> c6b3736fe (fix: dedupe probe/token base types (#16986) (thanks @iyoda))

>>>>>>> c16bc7127 (fix: add discord routing debug logging (#16202) (thanks @jayleekr))
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
=======
- Agents: add a safety timeout around embedded `session.compact()` to ensure stalled compaction runs settle and release blocked session lanes. (#16331) Thanks @BinHPdev.
>>>>>>> c0cd3c3c0 (fix: add safety timeout to session.compact() to prevent lane deadlock (#16533))
- Agents: keep unresolved mutating tool failures visible until the same action retry succeeds, scope mutation-error surfacing to mutating calls (including `session_status` model changes), and dedupe duplicate failure warnings in outbound replies. (#16131) Thanks @Swader.
- Agents: classify external timeout aborts during compaction the same as internal timeouts, preventing unnecessary auth-profile rotation and preserving compaction-timeout snapshot fallback behavior. (#9855) Thanks @mverrilli.
>>>>>>> dbdcbe03e (fix: preserve bootstrap paths and expose failed mutations (#16131))
- Sessions/Agents: harden transcript path resolution for mismatched agent context by preserving explicit store roots and adding safe absolute-path fallback to the correct agent sessions directory. (#16288) Thanks @robbyczgw-cla.
- BlueBubbles: include sender identity in group chat envelopes and pass clean message text to the agent prompt, aligning with iMessage/Signal formatting. (#16210) Thanks @zerone0x.
- WhatsApp: honor per-account `dmPolicy` overrides (account-level settings now take precedence over channel defaults for inbound DMs). (#10082) Thanks @mcaxtr.
- Security/Node Host: enforce `system.run` rawCommand/argv consistency to prevent allowlist/approval bypass. Thanks @christos-eth.
- Security/Exec approvals: prevent safeBins allowlist bypass via shell expansion (host exec allowlist mode only; not enabled by default). Thanks @christos-eth.
- Security/Gateway: block `system.execApprovals.*` via `node.invoke` (use `exec.approvals.node.*` instead). Thanks @christos-eth.
- Security/Exec: harden PATH handling by disabling project-local `node_modules/.bin` bootstrapping by default, disallowing node-host `PATH` overrides, and spawning ACP servers via the current executable by default. Thanks @akhmittra.
- CLI: fix lazy core command registration so top-level maintenance commands (`doctor`, `dashboard`, `reset`, `uninstall`) resolve correctly instead of exposing a non-functional `maintenance` placeholder command.
- Security/Agents: scope CLI process cleanup to owned child PIDs to avoid killing unrelated processes on shared hosts. Thanks @aether-ai-agent.
- Security/Agents (macOS): prevent shell injection when writing Claude CLI keychain credentials. (#15924) Thanks @aether-ai-agent.
<<<<<<< HEAD
>>>>>>> 013e8f6b3 (fix: harden exec PATH handling)
- Security: fix Chutes manual OAuth login state validation (thanks @aether-ai-agent). (#16058)
=======
- Security: fix Chutes manual OAuth login state validation by requiring the full redirect URL (reject code-only pastes) (thanks @aether-ai-agent).
- Security/Tlon: harden Urbit URL fetching against SSRF by blocking private/internal hosts by default (opt-in: `channels.tlon.allowPrivateNetwork`). Thanks @p80n-sec.
- Security/Voice Call (Telnyx): require webhook signature verification when receiving inbound events; configs without `telnyx.publicKey` are now rejected unless `skipSignatureVerification` is enabled. Thanks @p80n-sec.
- Security/Discovery: stop treating Bonjour TXT records as authoritative routing (prefer resolved service endpoints) and prevent discovery from overriding stored TLS pins; autoconnect now requires a previously trusted gateway. Thanks @simecek.
- Skills: watch `SKILL.md` only when refreshing skills snapshot to avoid file-descriptor exhaustion in large data trees. (#11325) Thanks @household-bard.
>>>>>>> a99ad11a4 (fix: validate state for manual Chutes OAuth)
- macOS: hard-limit unkeyed `openclaw://agent` deep links and ignore `deliver` / `to` / `channel` unless a valid unattended key is provided. Thanks @Cillian-Collins.
- Plugins: suppress false duplicate plugin id warnings when the same extension is discovered via multiple paths (config/workspace/global vs bundled), while still warning on genuine duplicates. (#16222) Thanks @shadril238.
- Security/Google Chat: deprecate `users/<email>` allowlists (treat `users/...` as immutable user id only); keep raw email allowlists for usability. Thanks @vincentkoc.
- Security/Archive: enforce archive extraction entry/size limits to prevent resource exhaustion from high-expansion ZIP/TAR archives. Thanks @vincentkoc.
<<<<<<< HEAD
=======
- Security/Media: reject oversized base64-backed input media before decoding to avoid large allocations. Thanks @vincentkoc.
- Security/Gateway: reject oversized base64 chat attachments before decoding to avoid large allocations. Thanks @vincentkoc.
- Security/Gateway: stop returning raw resolved config values in `skills.status` requirement checks (prevents operator.read clients from reading secrets). Thanks @simecek.
- Security/Zalo: reject ambiguous shared-path webhook routing when multiple webhook targets match the same secret.
- Security/BlueBubbles: reject ambiguous shared-path webhook routing when multiple webhook targets match the same guid/password.
- Security/BlueBubbles: require explicit `mediaLocalRoots` allowlists for local outbound media path reads to prevent local file disclosure. (#16322) Thanks @mbelinky.
- Cron/Slack: preserve agent identity (name and icon) when cron jobs deliver outbound messages. (#16242) Thanks @robbyczgw-cla.
<<<<<<< HEAD
- Cron: deliver text-only output directly when `delivery.to` is set so cron recipients get full output instead of summaries. (#16360) Thanks @rubyrunsstuff.
=======
- Cron: deliver text-only output directly when `delivery.to` is set so cron recipients get full output instead of summaries. (#16360) Thanks @thewilloftheshadow.
- Cron: prevent `cron list`/`cron status` from silently skipping past-due recurring jobs by using maintenance recompute semantics. (#16156) Thanks @zerone0x.
- CLI/Dashboard: when `gateway.bind=lan`, generate localhost dashboard URLs to satisfy browser secure-context requirements while preserving non-LAN bind behavior. (#16434) Thanks @BinHPdev.
>>>>>>> b9d14855d (Fix: Force dashboard command to use localhost URL (#16434))
- Cron: repair missing/corrupt `nextRunAtMs` for the updated job without globally recomputing unrelated due jobs during `cron update`. (#15750)
- Discord: prefer gateway guild id when logging inbound messages so cached-miss guilds do not appear as `guild=dm`. Thanks @thewilloftheshadow.
- TUI: refactor searchable select list description layout and add regression coverage for ANSI-highlight width bounds.
<<<<<<< HEAD
>>>>>>> 80407cbc6 (fix: recompute all cron next-run times after job update (openclaw#15905) thanks @echoVic)
=======
- Models/CLI: guard `models status` string trimming paths to prevent crashes from malformed non-string config values. (#16395) Thanks @BinHPdev.
>>>>>>> 4734f9910 (Fix: Add type safety to models status command (#16395))
=======
=======
=======
=======
- Security: replace deprecated SHA-1 sandbox configuration hashing with SHA-256 for deterministic sandbox cache identity and recreation checks. Thanks @kexinoh.
- Sandbox/Security: block dangerous sandbox Docker config (bind mounts, host networking, unconfined seccomp/apparmor) to prevent container escape via config injection. Thanks @aether-ai-agent.
- Control UI: prevent stored XSS via assistant name/avatar by removing inline script injection, serving bootstrap config as JSON, and enforcing `script-src 'self'`. Thanks @Adam55A-code.
- Discord: preserve channel session continuity when runtime payloads omit `message.channelId` by falling back to event/raw `channel_id` values for routing/session keys, so same-channel messages keep history across turns/restarts. Also align diagnostics so active Discord runs no longer appear as `sessionKey=unknown`. (#17622) Thanks @shakkernerd.
- Web UI/Agents: hide `BOOTSTRAP.md` in the Agents Files list after onboarding is completed, avoiding confusing missing-file warnings for completed workspaces. (#17491) Thanks @gumadeiras.
- Security: replace deprecated SHA-1 sandbox configuration hashing with SHA-256 for deterministic sandbox cache identity and recreation checks. Thanks @kexinoh.
- Sandbox/Security: block dangerous sandbox Docker config (bind mounts, host networking, unconfined seccomp/apparmor) to prevent container escape via config injection. Thanks @aether-ai-agent.
- Control UI: prevent stored XSS via assistant name/avatar by removing inline script injection, serving bootstrap config as JSON, and enforcing `script-src 'self'`. Thanks @Adam55A-code.
- Discord: preserve channel session continuity when runtime payloads omit `message.channelId` by falling back to event/raw `channel_id` values for routing/session keys, so same-channel messages keep history across turns/restarts. Also align diagnostics so active Discord runs no longer appear as `sessionKey=unknown`. (#17622) Thanks @shakkernerd.
- Web UI/Agents: hide `BOOTSTRAP.md` in the Agents Files list after onboarding is completed, avoiding confusing missing-file warnings for completed workspaces. (#17491) Thanks @gumadeiras.
- Security/Logging: redact Telegram bot tokens from error messages and uncaught stack traces to prevent accidental secret leakage into logs. Thanks @aether-ai-agent.
- Sandbox/Security: block dangerous sandbox Docker config (bind mounts, host networking, unconfined seccomp/apparmor) to prevent container escape via config injection. Thanks @aether-ai-agent.
- LINE/Security: fail closed on webhook startup when channel token or channel secret is missing, and treat LINE accounts as configured only when both are present. (#17587) Thanks @davidahmann.
- Agents/Sandbox: clarify system prompt path guidance so sandbox `bash/exec` uses container paths (for example `/workspace`) while file tools keep host-bridge mapping, avoiding first-attempt path misses from host-only absolute paths in sandbox command execution. (#17693) Thanks @app/juniordevbot.
- Control UI: prevent stored XSS via assistant name/avatar by removing inline script injection, serving bootstrap config as JSON, and enforcing `script-src 'self'`. Thanks @Adam55A-code.
- Gateway/Control UI: preserve requested operator scopes for Control UI bypass modes (`allowInsecureAuth` / `dangerouslyDisableDeviceAuth`) when device identity is unavailable, preventing false `missing scope` failures on authenticated LAN/HTTP operator sessions. (#17682) Thanks @leafbird.
- Gateway/Security: redact sensitive session/path details from `status` responses for non-admin clients; full details remain available to `operator.admin`. (#8590) Thanks @fr33d3m0n.
- Skills/Security: restrict `download` installer `targetDir` to the per-skill tools directory to prevent arbitrary file writes. Thanks @Adam55A-code.
- Skills/Linux: harden go installer fallback on apt-based systems by handling root/no-sudo environments safely, doing best-effort apt index refresh, and returning actionable errors instead of failing with spawn errors. (#17687) Thanks @mcrolly.
- Web Fetch/Security: cap downloaded response body size before HTML parsing to prevent memory exhaustion from oversized or deeply nested pages. Thanks @xuemian168.
- Config/Gateway: make sensitive-key whitelist suffix matching case-insensitive while preserving `passwordFile` path exemptions, preventing accidental redaction of non-secret config values like `maxTokens` and IRC password-file paths. (#16042) Thanks @akramcodez.
- Dev tooling: harden git `pre-commit` hook against option injection from malicious filenames (for example `--force`), preventing accidental staging of ignored files. Thanks @mrthankyou.
- Gateway/Agent: reject malformed `agent:`-prefixed session keys (for example, `agent:main`) in `agent` and `agent.identity.get` instead of silently resolving them to the default agent, preventing accidental cross-session routing. (#15707) Thanks @rodrigouroz.
- Gateway/Chat: harden `chat.send` inbound message handling by rejecting null bytes, stripping unsafe control characters, and normalizing Unicode to NFC before dispatch. (#8593) Thanks @fr33d3m0n.
- Gateway/Send: return an actionable error when `send` targets internal-only `webchat`, guiding callers to use `chat.send` or a deliverable channel. (#15703) Thanks @rodrigouroz.
<<<<<<< HEAD
=======
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
- Browser/Agents: when browser control service is unavailable, return explicit non-retry guidance (instead of "try again") so models do not loop on repeated browser tool calls until timeout. (#17673) Thanks @austenstone.
- Subagents: use child-run-based deterministic announce idempotency keys across direct and queued delivery paths (with legacy queued-item fallback) to prevent duplicate announce retries without collapsing distinct same-millisecond announces. (#17150) Thanks @widingmarcus-cyber.
- Subagents/Models: preserve `agents.defaults.model.fallbacks` when subagent sessions carry a model override, so subagent runs fail over to configured fallback models instead of retrying only the overridden primary model.
- Agents/Models: probe the primary model when its auth-profile cooldown is near expiry (with per-provider throttling), so runs recover from temporary rate limits without staying on fallback models until restart. (#17478) Thanks @PlayerGhost.
- Telegram: omit `message_thread_id` for DM sends/draft previews and keep forum-topic handling (`id=1` general omitted, non-general kept), preventing DM failures with `400 Bad Request: message thread not found`. (#10942) Thanks @garnetlyx.
- Telegram: replace inbound `<media:audio>` placeholder with successful preflight voice transcript in message body context, preventing placeholder-only prompt bodies for mention-gated voice messages. (#16789) Thanks @Limitless2023.
- Telegram: retry inbound media `getFile` calls (3 attempts with backoff) and gracefully fall back to placeholder-only processing when retries fail, preventing dropped voice/media messages on transient Telegram network errors. (#16154) Thanks @yinghaosang.
- Telegram: finalize streaming preview replies in place instead of sending a second final message, preventing duplicate Telegram assistant outputs at stream completion. (#17218) Thanks @obviyus.
- Telegram: keep draft-stream preview replies attached to the user message for `replyToMode: "all"` in groups and DMs, preserving threaded reply context from preview through finalization. (#17880) Thanks @yinghaosang.
- Telegram: disable block streaming when `channels.telegram.streamMode` is `off`, preventing newline/content-block replies from splitting into multiple messages. (#17679) Thanks @saivarunk.
- Telegram: route non-abort slash commands on the normal chat/topic sequential lane while keeping true abort requests (`/stop`, `stop`) on the control lane, preventing command/reply race conditions from control-lane bypass. (#17899) Thanks @obviyus.
>>>>>>> 39bb1b332 (fix: auto-recover primary model after rate-limit cooldown expires (#17478) (#18045))
- Discord: preserve channel session continuity when runtime payloads omit `message.channelId` by falling back to event/raw `channel_id` values for routing/session keys, so same-channel messages keep history across turns/restarts. Also align diagnostics so active Discord runs no longer appear as `sessionKey=unknown`. (#17622) Thanks @shakkernerd.
- Group chats: always inject group chat context (name, participants, reply guidance) into the system prompt on every turn, not just the first. Prevents the model from losing awareness of which group it's in and incorrectly using the message tool to send to the same group. (#14447) Thanks @tyler6204.
>>>>>>> 559c8d993 (fix: replace deprecated SHA-1 in sandbox config hash)
- Telegram: omit `message_thread_id` for DM sends/draft previews and keep forum-topic handling (`id=1` general omitted, non-general kept), preventing DM failures with `400 Bad Request: message thread not found`. (#10942) Thanks @garnetlyx.
<<<<<<< HEAD
>>>>>>> cc0bfa0f3 (fix(telegram): restore thread_id=1 handling for DMs (regression from 19b8416a8) (openclaw#10942) thanks @garnetlyx)
=======
- Dev tooling: harden git `pre-commit` hook against option injection from malicious filenames (for example `--force`), preventing accidental staging of ignored files. Thanks @mrthankyou.
>>>>>>> ba84b1253 (fix: harden pre-commit hook against option injection)
- Subagents/Models: preserve `agents.defaults.model.fallbacks` when subagent sessions carry a model override, so subagent runs fail over to configured fallback models instead of retrying only the overridden primary model.
- Config/Gateway: make sensitive-key whitelist suffix matching case-insensitive while preserving `passwordFile` path exemptions, preventing accidental redaction of non-secret config values like `maxTokens` and IRC password-file paths. (#16042) Thanks @akramcodez.
>>>>>>> 191194236 (fix: make sensitive field whitelist case-insensitive (#16148))
- Group chats: always inject group chat context (name, participants, reply guidance) into the system prompt on every turn, not just the first. Prevents the model from losing awareness of which group it's in and incorrectly using the message tool to send to the same group. (#14447) Thanks @tyler6204.
- TUI: make searchable-select filtering and highlight rendering ANSI-aware so queries ignore hidden escape codes and no longer corrupt ANSI styling sequences during match highlighting. (#4519) Thanks @bee4come.
- TUI/Windows: coalesce rapid single-line submit bursts in Git Bash into one multiline message as a fallback when bracketed paste is unavailable, preventing pasted multiline text from being split into multiple sends. (#4986) Thanks @adamkane.
- TUI: suppress false `(no output)` placeholders for non-local empty final events during concurrent runs, preventing external-channel replies from showing empty assistant bubbles while a local run is still streaming. (#5782) Thanks @LagWizard and @vignesh07.
- Auto-reply/WhatsApp/TUI/Web: when a final assistant message is `NO_REPLY` and a messaging tool send succeeded, mirror the delivered messaging-tool text into session-visible assistant output so TUI/Web no longer show `NO_REPLY` placeholders. (#7010) Thanks @Morrowind-Xie.
- Gateway/Chat: harden `chat.send` inbound message handling by rejecting null bytes, stripping unsafe control characters, and normalizing Unicode to NFC before dispatch. (#8593) Thanks @fr33d3m0n.
- Gateway/Security: redact sensitive session/path details from `status` responses for non-admin clients; full details remain available to `operator.admin`. (#8590) Thanks @fr33d3m0n.
- Agents: return an explicit timeout error reply when an embedded run times out before producing any payloads, preventing silent dropped turns during slow cache-refresh transitions. (#16659) Thanks @liaosvcaf and @vignesh07.
- Browser/Agents: when browser control service is unavailable, return explicit non-retry guidance (instead of "try again") so models do not loop on repeated browser tool calls until timeout. (#17673) Thanks @austenstone.
- Agents/OpenAI: force `store=true` for direct OpenAI Responses/Codex runs to preserve multi-turn server-side conversation state, while leaving proxy/non-OpenAI endpoints unchanged. (#16803) Thanks @mark9232 and @vignesh07.
- CLI/Build: make legacy daemon CLI compatibility shim generation tolerant of minimal tsdown daemon export sets, while preserving restart/register compatibility aliases and surfacing explicit errors for unavailable legacy daemon commands. Thanks @vignesh07.
- Telegram: replace inbound `<media:audio>` placeholder with successful preflight voice transcript in message body context, preventing placeholder-only prompt bodies for mention-gated voice messages. (#16789) Thanks @Limitless2023.
<<<<<<< HEAD
>>>>>>> 2fc479b42 (fix: apply telegram voice transcript body substitution (#16789) (thanks @Limitless2023) (#16970))
=======
- Telegram: retry inbound media `getFile` calls (3 attempts with backoff) and gracefully fall back to placeholder-only processing when retries fail, preventing dropped voice/media messages on transient Telegram network errors. (#16154) Thanks @yinghaosang.
- Telegram: finalize streaming preview replies in place instead of sending a second final message, preventing duplicate Telegram assistant outputs at stream completion. (#17218) Thanks @obviyus.
>>>>>>> 86df16061 (fix: telegram stream preview finalizes in place (#17218) (thanks @obviyus))

## 2026.2.14

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
- Agents: deliver tool result media (screenshots, images, audio) to channels regardless of verbose level. (#11735) Thanks @strelov1.
>>>>>>> 68c78c4b4 (fix: deliver tool result media when verbose is off (#16679))
- Telegram: when `channels.telegram.commands.native` is `false`, exclude plugin commands from `setMyCommands` menu registration while keeping plugin slash handlers callable. (#15132) Thanks @Glucksberg.
- LINE: return 200 OK for Developers Console "Verify" requests (`{"events":[]}`) without `X-Line-Signature`, while still requiring signatures for real deliveries. (#16582) Thanks @arosstale.
- Cron: deliver text-only output directly when `delivery.to` is set so cron recipients get full output instead of summaries. (#16360) Thanks @thewilloftheshadow.
<<<<<<< HEAD
- CLI/Plugins: ensure `openclaw message send` exits after successful delivery across plugin-backed channels so one-shot sends do not hang. (#16491) Thanks @yinghaosang.
- CLI/Plugins: run registered plugin `gateway_stop` hooks before `openclaw message` exits (success and failure paths), so plugin-backed channels can clean up one-shot CLI resources. (#16580) Thanks @gumadeiras.
=======
- Cron/Slack: preserve agent identity (name and icon) when cron jobs deliver outbound messages. (#16242) Thanks @robbyczgw-cla.
- Media: accept `MEDIA:`-prefixed paths (lenient whitespace) when loading outbound media to prevent `ENOENT` for tool-returned local media paths. (#13107) Thanks @mcaxtr.
- Media understanding: treat binary `application/vnd.*`/zip/octet-stream attachments as non-text (while keeping vendor `+json`/`+xml` text-eligible) so Office/ZIP files are not inlined into prompt body text. (#16513) Thanks @rmramsey32.
- Agents: deliver tool result media (screenshots, images, audio) to channels regardless of verbose level. (#11735) Thanks @strelov1.
- Auto-reply/Block streaming: strip leading whitespace from streamed block replies so messages starting with blank lines no longer deliver visible leading empty lines. (#16422) Thanks @mcinteerj.
- Agents/Image tool: allow workspace-local image paths by including the active workspace directory in local media allowlists, and trust sandbox-validated paths in image loaders to prevent false "not under an allowed directory" rejections. (#15541)
- Agents/Image tool: propagate the effective workspace root into tool wiring so workspace-local image paths are accepted by default when running without an explicit `workspaceDir`. (#16722)
- BlueBubbles: include sender identity in group chat envelopes and pass clean message text to the agent prompt, aligning with iMessage/Signal formatting. (#16210) Thanks @zerone0x.
>>>>>>> 1712a71a3 (fix: strip leading whitespace in block streaming reply path (#16422))
- CLI: fix lazy core command registration so top-level maintenance commands (`doctor`, `dashboard`, `reset`, `uninstall`) resolve correctly instead of exposing a non-functional `maintenance` placeholder command.
- CLI/Dashboard: when `gateway.bind=lan`, generate localhost dashboard URLs to satisfy browser secure-context requirements while preserving non-LAN bind behavior. (#16434) Thanks @BinHPdev.
- BlueBubbles: include sender identity in group chat envelopes and pass clean message text to the agent prompt, aligning with iMessage/Signal formatting. (#16210) Thanks @zerone0x.
- WhatsApp: honor per-account `dmPolicy` overrides (account-level settings now take precedence over channel defaults for inbound DMs). (#10082) Thanks @mcaxtr.
- Media: accept `MEDIA:`-prefixed paths (lenient whitespace) when loading outbound media to prevent `ENOENT` for tool-returned local media paths. (#13107) Thanks @mcaxtr.
- Cron/Slack: preserve agent identity (name and icon) when cron jobs deliver outbound messages. (#16242) Thanks @robbyczgw-cla.
- Cron: prevent `cron list`/`cron status` from silently skipping past-due recurring jobs by using maintenance recompute semantics. (#16156) Thanks @zerone0x.
- Cron: repair missing/corrupt `nextRunAtMs` for the updated job without globally recomputing unrelated due jobs during `cron update`. (#15750)
- Discord: prefer gateway guild id when logging inbound messages so cached-miss guilds do not appear as `guild=dm`. Thanks @thewilloftheshadow.
- TUI: use available terminal width for session name display in searchable select lists. (#16238) Thanks @robbyczgw-cla.
- TUI: refactor searchable select list description layout and add regression coverage for ANSI-highlight width bounds.
- Models/CLI: guard `models status` string trimming paths to prevent crashes from malformed non-string config values. (#16395) Thanks @BinHPdev.
- Agents: add a safety timeout around embedded `session.compact()` to ensure stalled compaction runs settle and release blocked session lanes. (#16331) Thanks @BinHPdev.
- Gateway/Sessions: abort active embedded runs and clear queued session work before `sessions.reset`, returning unavailable if the run does not stop in time. (#16576) Thanks @Grynn.
- Sessions/Agents: harden transcript path resolution for mismatched agent context by preserving explicit store roots and adding safe absolute-path fallback to the correct agent sessions directory. (#16288) Thanks @robbyczgw-cla.
- Agents: keep unresolved mutating tool failures visible until the same action retry succeeds, scope mutation-error surfacing to mutating calls (including `session_status` model changes), and dedupe duplicate failure warnings in outbound replies. (#16131) Thanks @Swader.
- Agents: classify external timeout aborts during compaction the same as internal timeouts, preventing unnecessary auth-profile rotation and preserving compaction-timeout snapshot fallback behavior. (#9855) Thanks @mverrilli.
- Ollama/Agents: avoid forcing `<final>` tag enforcement for Ollama models, which could suppress all output as `(no output)`. (#16191) Thanks @Glucksberg.
- Plugins: suppress false duplicate plugin id warnings when the same extension is discovered via multiple paths (config/workspace/global vs bundled), while still warning on genuine duplicates. (#16222) Thanks @shadril238.
- Skills: watch `SKILL.md` only when refreshing skills snapshot to avoid file-descriptor exhaustion in large data trees. (#11325) Thanks @household-bard.
- Scripts/Security: validate GitHub logins and avoid shell invocation in `scripts/update-clawtributors.ts` to prevent command injection via malicious commit records. Thanks @scanleale.
- macOS: hard-limit unkeyed `openclaw://agent` deep links and ignore `deliver` / `to` / `channel` unless a valid unattended key is provided. Thanks @Cillian-Collins.
- Memory/QMD: cap QMD command output buffering to prevent memory exhaustion from pathological `qmd` command output.
- Memory/QMD: parse qmd scope keys once per request to avoid repeated parsing in scope checks.
- Memory/QMD: query QMD index using exact docid matches before falling back to prefix lookup for better recall correctness and index efficiency.
- Memory/QMD: make QMD result JSON parsing resilient to noisy command output by extracting the first JSON array from noisy `stdout`.
- Memory/QMD: pass result limits to `search`/`vsearch` commands so QMD can cap results earlier.
- Memory/QMD: avoid reading full markdown files when a `from/lines` window is requested in QMD reads.
- Memory/QMD: skip rewriting unchanged session export markdown files during sync to reduce disk churn.
<<<<<<< HEAD
=======
- Memory/QMD: make QMD result JSON parsing resilient to noisy command output by extracting the first JSON array from noisy `stdout`.
- Memory/QMD: treat prefixed `no results found` marker output as an empty result set in qmd JSON parsing. (#11302) Thanks @blazerui.
- Memory/QMD: avoid multi-collection `query` ranking corruption by running one `qmd query -c <collection>` per managed collection and merging by best score (also used for `search`/`vsearch` fallback-to-query). (#16740) Thanks @volarian-vai.
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
- Media/Security: allow outbound local media reads from the active agent workspace (including `workspace-<agentId>`) via agent-scoped local roots, avoiding broad global allowlisting of all per-agent workspaces. (#17136) Thanks @MisterGuy420.
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
- Security/iMessage: keep DM pairing-store identities out of group allowlist authorization (prevents cross-context command authorization). Thanks @vincentkoc.
- Security/Google Chat: deprecate `users/<email>` allowlists (treat `users/...` as immutable user id only); keep raw email allowlists for usability. Thanks @vincentkoc.
- Security/Google Chat: reject ambiguous shared-path webhook routing when multiple webhook targets verify successfully (prevents cross-account policy-context misrouting). Thanks @vincentkoc.
>>>>>>> e927fd1e3 (fix: allow agent workspace directories in media local roots (#17136))
- Telegram/Security: require numeric Telegram sender IDs for allowlist authorization (reject `@username` principals), auto-resolve `@username` to IDs in `openclaw doctor --fix` (when possible), and warn in `openclaw security audit` when legacy configs contain usernames. Thanks @vincentkoc.
- Telegram/Security: reject Telegram webhook startup when `webhookSecret` is missing or empty (prevents unauthenticated webhook request forgery). Thanks @yueyueL.
>>>>>>> abf42abd4 (fix: LINE webhook verification 200; fix tsgo error (#16582) (thanks @arosstale))
- Feishu/Security: harden media URL fetching against SSRF and local file disclosure. (#16285) Thanks @mbelinky.
- Telegram/Security: require numeric Telegram sender IDs for allowlist authorization (reject `@username` principals) and warn in `openclaw security audit` when legacy configs contain usernames. Thanks @vincentkoc.
>>>>>>> 5b4121d60 (fix: harden Feishu media URL fetching (#16285) (thanks @mbelinky))
- Security/Skills: harden archive extraction for download-installed skills to prevent path traversal outside the target directory. Thanks @markmusson.
- Security/Media: stream and bound URL-backed input media fetches to prevent memory exhaustion from oversized responses. Thanks @vincentkoc.
- Security/Signal: harden signal-cli archive extraction during install to prevent path traversal outside the install root.
>>>>>>> 4f043991e (fix: suppress false duplicate plugin warnings (#16222) (thanks @shadril238) (#16245))
- Security/Hooks: restrict hook transform modules to `~/.openclaw/hooks/transforms` (prevents path traversal/escape module loads via config). Config note: `hooks.transformsDir` must now be within that directory. Thanks @akhmittra.
- Security/Hooks: ignore hook package manifest entries that point outside the package directory (prevents out-of-tree handler loads during hook discovery).
- Ollama/Agents: avoid forcing `<final>` tag enforcement for Ollama models, which could suppress all output as `(no output)`. (#16191) Thanks @Glucksberg.

## 2026.2.13
>>>>>>> 7d3e5788e (fix: stop enforcing <final> for ollama (#16191) (thanks @Glucksberg))

<<<<<<< HEAD
=======
### Changes

- Skills: remove duplicate `local-places` Google Places skill/proxy and keep `goplaces` as the single supported Google Places path.
<<<<<<< HEAD
- Discord: send voice messages with waveform previews from local audio files (including silent delivery). (#7253) Thanks @nyanjou.
=======
- Agents: add pre-prompt context diagnostics (`messages`, `systemPromptChars`, `promptChars`, provider/model, session file) before embedded runner prompt calls to improve overflow debugging. (#8930) Thanks @Glucksberg.
- Onboarding/Providers: add first-class Hugging Face Inference provider support (provider wiring, onboarding auth choice/API key flow, and default-model selection), and preserve Hugging Face auth intent in auth-choice remapping (`tokenProvider=huggingface` with `authChoice=apiKey`) while skipping env-override prompts when an explicit token is provided. (#13472) Thanks @Josephrp.
- Onboarding/Providers: add `minimax-api-key-cn` auth choice for the MiniMax China API endpoint. (#15191) Thanks @liuy.

### Breaking

- Config/State: removed legacy `.moltbot` auto-detection/migration and `moltbot.json` config candidates. If you still have state/config under `~/.moltbot`, move it to `~/.openclaw` (recommended) or set `OPENCLAW_STATE_DIR` / `OPENCLAW_CONFIG_PATH` explicitly.
>>>>>>> 0cfea4629 (fix: wire minimax-api-key-cn onboarding (#15191) (thanks @liuy))

>>>>>>> a15033876 (fix: add Discord voice message changelog (#7253) (thanks @nyanjou))
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
=======
=======
=======
=======
=======
- Agents/Compaction: centralize exec default resolution in the shared tool factory so per-agent `tools.exec` overrides (host/security/ask/node and related defaults) persist across compaction retries. (#15833) Thanks @napetrov.
=======
=======
- Gateway/Auth: add trusted-proxy mode hardening follow-ups by keeping `OPENCLAW_GATEWAY_*` env compatibility, auto-normalizing invalid setup combinations in interactive `gateway configure` (trusted-proxy forces `bind=lan` and disables Tailscale serve/funnel), and suppressing shared-secret/rate-limit audit findings that do not apply to trusted-proxy deployments. (#15940) Thanks @nickytonline.
- Docs/Hooks: update hooks documentation URLs to the new `/automation/hooks` location. (#16165) Thanks @nicholascyh.
- Security/Audit: warn when `gateway.tools.allow` re-enables default-denied tools over HTTP `POST /tools/invoke`, since this can increase RCE blast radius if the gateway is reachable.
- Security/Plugins/Hooks: harden npm-based installs by restricting specs to registry packages only, passing `--ignore-scripts` to `npm pack`, and cleaning up temp install directories.
- Feishu: stop persistent Typing reaction on NO_REPLY/suppressed runs by wiring reply-dispatcher cleanup to remove typing indicators. (#15464) Thanks @arosstale.
<<<<<<< HEAD
- Agents: strip leading whitespace/newlines from `sanitizeUserFacingText` output and normalize whitespace-only outputs to empty text. (#16158) Thanks @mcinteerj.
>>>>>>> 3881af5b3 (fix: strip leading whitespace from sanitizeUserFacingText output (#16158))
=======
- Agents: strip leading empty lines from `sanitizeUserFacingText` output and normalize whitespace-only outputs to empty text. (#16158) Thanks @mcinteerj.
>>>>>>> 50a6e0e69 (fix: strip leading empty lines in sanitizeUserFacingText (#16280))
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
- Memory/QMD: default `memory.qmd.searchMode` to `search` for faster CPU-only recall and always scope `search`/`vsearch` requests to managed collections (auto-falling back to `query` when required). (#16047) Thanks @togotago.
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
- Onboarding/CLI: restore terminal state without resuming paused `stdin`, so onboarding exits cleanly (including Docker TTY installs that would otherwise hang). (#12972) Thanks @vincentkoc.
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
>>>>>>> 4c79a63eb (fix: default QMD search mode (#16047) (thanks @togotago))
- CLI/Completion: route plugin-load logs to stderr and write generated completion scripts directly to stdout to avoid `source <(openclaw completion ...)` corruption. (#15481) Thanks @arosstale.
- Gateway/Agents: stop injecting a phantom `main` agent into gateway agent listings when `agents.list` explicitly excludes it. (#11450) Thanks @arosstale.
>>>>>>> 3b5a9c14d (Fix: Preserve Per-Agent Exec Override After Session Compaction (#15833))
- Agents/Heartbeat: stop auto-creating `HEARTBEAT.md` during workspace bootstrap so missing files continue to run heartbeat as documented. (#11766) Thanks @shadril238.
<<<<<<< HEAD
>>>>>>> 386bb0c61 (fix: don't auto-create HEARTBEAT.md on workspace init (openclaw#12027) thanks @shadril238)
=======
- Telegram: cap bot menu registration to Telegram's 100-command limit with an overflow warning while keeping typed hidden commands available. (#15844) Thanks @battman21.
>>>>>>> 11ab1c693 (fix: enforce Telegram 100-command limit with warning (#5787) (#15844))
- CLI: lazily load outbound provider dependencies and remove forced success-path exits so commands terminate naturally without killing intentional long-running foreground actions. (#12906) Thanks @DrCrinkle.
>>>>>>> 874ff7089 (fix: ensure CLI exits after command completion (#12906))
- Clawdock: avoid Zsh readonly variable collisions in helper scripts. (#15501) Thanks @nkelner.
>>>>>>> 8c1e8bb2f (fix: note clawdock zsh compatibility (#15501) (thanks @nkelner))
- Discord: route autoThread replies to existing threads instead of the root channel. (#8302) Thanks @gavinbmoore, @thewilloftheshadow.
<<<<<<< HEAD
>>>>>>> 71939523a (fix: normalize Discord autoThread reply target (#8302) (thanks @gavinbmoore))
=======
- Discord/Agents: apply channel/group `historyLimit` during embedded-runner history compaction to prevent long-running channel sessions from bypassing truncation and overflowing context windows. (#11224) Thanks @shadril238.
- Telegram: scope skill commands to the resolved agent for default accounts so `setMyCommands` no longer triggers `BOT_COMMANDS_TOO_MUCH` when multiple agents are configured. (#15599)
- Plugins/Hooks: fire `before_tool_call` hook exactly once per tool invocation in embedded runs by removing duplicate dispatch paths while preserving parameter mutation semantics. (#15635) Thanks @lailoo.
>>>>>>> 8c3cc793b (fix: dedupe before_tool_call in embedded runtime (#15635) (thanks @lailoo))
- Agents/Image tool: cap image-analysis completion `maxTokens` by model capability (`min(4096, model.maxTokens)`) to avoid over-limit provider failures while still preventing truncation. (#11770) Thanks @detecti1.
- Security/Canvas: serve A2UI assets via the shared safe-open path (`openFileWithinRoot`) to close traversal/TOCTOU gaps, with traversal and symlink regression coverage. (#10525) Thanks @abdelsfane.
- Security/Gateway: breaking default-behavior change - canvas IP-based auth fallback now only accepts machine-scoped addresses (RFC1918, link-local, ULA IPv6, CGNAT); public-source IP matches now require bearer token auth. (#14661) Thanks @sumleo.
- Security/WhatsApp: enforce `0o600` on `creds.json` and `creds.json.bak` on save/backup/restore paths to reduce credential file exposure. (#10529) Thanks @abdelsfane.
>>>>>>> 397011bd7 (fix: increase image tool maxTokens from 512 to 4096 (#11770))
- Security/Gateway + ACP: block high-risk tools (`sessions_spawn`, `sessions_send`, `gateway`, `whatsapp_login`) from HTTP `/tools/invoke` by default with `gateway.tools.{allow,deny}` overrides, and harden ACP permission selection to fail closed when tool identity/options are ambiguous while supporting `allow_always`/`reject_always`. (#15390) Thanks @aether-ai-agent.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> ee31cd47b (fix: close OC-02 gaps in ACP permission + gateway HTTP deny config (#15390) (thanks @aether-ai-agent))
=======
=======
- Gateway/Tools Invoke: sanitize `/tools/invoke` execution failures while preserving `400` for tool input errors and returning `500` for unexpected runtime failures, with regression coverage and docs updates. (#13185) Thanks @davidrudduck.
>>>>>>> 767fd9f22 (fix: classify /tools/invoke errors and sanitize 500s (#13185) (thanks @davidrudduck))
- MS Teams: preserve parsed mention entities/text when appending OneDrive fallback file links, and accept broader real-world Teams mention ID formats (`29:...`, `8:orgid:...`) while still rejecting placeholder patterns. (#15436) Thanks @hyojin.
>>>>>>> 106d60551 (fix: harden msteams mentions and fallback links (#15436) (thanks @hyojin))
- Security/Audit: distinguish external webhooks (`hooks.enabled`) from internal hooks (`hooks.internal.enabled`) in attack-surface summaries to avoid false exposure signals when only internal hooks are enabled. (#13474) Thanks @mcaxtr.
<<<<<<< HEAD
=======
- Security/Onboarding: clarify multi-user DM isolation remediation with explicit `openclaw config set session.dmScope ...` commands in security audit, doctor security, and channel onboarding guidance. (#13129) Thanks @VintLin.
- Security/Audit: add misconfiguration checks for sandbox Docker config with sandbox mode off, ineffective `gateway.nodes.denyCommands` entries, global minimal tool-profile overrides by agent profiles, and permissive extension-plugin tool reachability.
>>>>>>> f612e3590 (fix: add dmScope guidance regression coverage (#13129) (thanks @VintLin))
- Auto-reply/Threading: auto-inject implicit reply threading so `replyToMode` works without requiring model-emitted `[[reply_to_current]]`, while preserving `replyToMode: "off"` behavior for implicit Slack replies and keeping block-streaming chunk coalescing stable under `replyToMode: "first"`. (#14976) Thanks @Diaspar4u.
>>>>>>> 79a38858a (fix: preserve off-mode semantics in auto reply threading (#14976) (thanks @Diaspar4u))
- Sandbox: pass configured `sandbox.docker.env` variables to sandbox containers at `docker create` time. (#15138) Thanks @stevebot-alive.
- Gateway/Restart: clear stale command-queue and heartbeat wake runtime state after SIGUSR1 in-process restarts to prevent zombie gateway behavior where queued work stops draining. (#15195) Thanks @joeykrug.
- Onboarding/CLI: restore terminal state without resuming paused `stdin`, so onboarding exits cleanly after choosing Web UI and the installer returns instead of appearing stuck.
<<<<<<< HEAD
=======
- Auth/OpenAI Codex: share OAuth login handling across onboarding and `models auth login --provider openai-codex`, keep onboarding alive when OAuth fails, and surface a direct OAuth help note instead of terminating the wizard. (#15406, follow-up to #14552) Thanks @zhiluo20.
- Cron: add regression coverage for announce-mode isolated jobs so runs that already report `delivered: true` do not enqueue duplicate main-session relays, including delivery configs where `mode` is omitted and defaults to announce. (#15737) Thanks @brandonwise.
>>>>>>> b8703546e (docs(changelog): note cron delivered-relay regression coverage (#15737) (thanks @brandonwise))
- Onboarding/Providers: add vLLM as an onboarding provider with model discovery, auth profile wiring, and non-interactive auth-choice validation. (#12577) Thanks @gejifeng.
- macOS Voice Wake: fix a crash in trigger trimming for CJK/Unicode transcripts by matching and slicing on original-string ranges instead of transformed-string indices. (#11052) Thanks @Flash-LHR.
- Heartbeat: prevent scheduler silent-death races during runner reloads, preserve retry cooldown backoff under wake bursts, and prioritize user/action wake causes over interval/retry reasons when coalescing. (#15108) Thanks @joeykrug.
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Outbound targets: fail closed for WhatsApp/Twitch/Google Chat fallback paths so invalid or missing targets are dropped instead of rerouted, and align resolver hints with strict target requirements. (#13578) Thanks @mcaxtr.
- Outbound: add a write-ahead delivery queue with crash-recovery retries to prevent lost outbound messages after gateway restarts. (#15636) Thanks @nabbilkhan, @thewilloftheshadow.
>>>>>>> 207e2c5af (fix: add outbound delivery crash recovery (#15636) (thanks @nabbilkhan) (#15636))
- Exec/Allowlist: allow multiline heredoc bodies (`<<`, `<<-`) while keeping multiline non-heredoc shell commands blocked, so exec approval parsing permits heredoc input safely without allowing general newline command chaining. (#13811) Thanks @mcaxtr.
- Docs/Mermaid: remove hardcoded Mermaid init theme blocks from four docs diagrams so dark mode inherits readable theme defaults. (#15157) Thanks @heytulsiprasad.
- Outbound/Threading: pass `replyTo` and `threadId` from `message send` tool actions through the core outbound send path to channel adapters, preserving thread/reply routing. (#14948) Thanks @mcaxtr.
<<<<<<< HEAD
>>>>>>> 13bfd9da8 (fix: thread replyToId and threadId through message tool send action (#14948))
=======
- Sessions/Agents: pass `agentId` when resolving existing transcript paths in reply runs so non-default agents and heartbeat/chat handlers no longer fail with `Session file path must be within sessions directory`. (#15141) Thanks @Goldenmonstew.
<<<<<<< HEAD
- Status/Sessions: stop clamping derived `totalTokens` to context-window size, keep prompt-token snapshots wired through session accounting, and surface context usage as unknown when fresh snapshot data is missing to avoid false 100% reports. (#15114) Thanks @echoVic.
>>>>>>> fd076eb43 (fix: /status shows incorrect context percentage — totalTokens clamped to contextTokens (#15114) (#15133))
=======
- Sessions/Agents: pass `agentId` through status and usage transcript-resolution paths (auto-reply, gateway usage APIs, and session cost/log loaders) so non-default agents can resolve absolute session files without path-validation failures. (#15103) Thanks @jalehman.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 990413534 (fix: land multi-agent session path fix + regressions (#15103) (#15448))
=======
=======
- Sessions: archive previous transcript files on `/new` and `/reset` session resets (including gateway `sessions.reset`) so stale transcripts do not accumulate on disk. (#14869) Thanks @mcaxtr.
>>>>>>> 31537c669 (fix: archive old transcript files on /new and /reset (#14949))
- Signal/Install: auto-install `signal-cli` via Homebrew on non-x64 Linux architectures, avoiding x86_64 native binary `Exec format error` failures on arm64/arm hosts. (#15443) Thanks @jogvan-k.
<<<<<<< HEAD
>>>>>>> 8307f9738 (fix: add changelog entry for signal-cli arch-aware install (#15443) (thanks @jogvan-k))
=======
- Discord: avoid misrouting numeric guild allowlist entries to `/channels/<guildId>` by prefixing guild-only inputs with `guild:` during resolution. (#12326) Thanks @headswim.
<<<<<<< HEAD
=======
- Config: preserve `${VAR}` env references when writing config files so `openclaw config set/apply/patch` does not persist secrets to disk. Thanks @thewilloftheshadow.
- Config: remove a cross-request env-snapshot race in config writes by carrying read-time env context into write calls per request, preserving `${VAR}` refs safely under concurrent gateway config mutations. (#11560) Thanks @akoscz.
- Config: log overwrite audit entries (path, backup target, and hash transition) whenever an existing config file is replaced, improving traceability for unexpected config clobbers.
- Process/Exec: avoid shell execution for `.exe` commands on Windows so env overrides work reliably in `runCommandWithTimeout`. Thanks @thewilloftheshadow.
>>>>>>> a4f4b0636 (fix: preserve ${VAR} env var references when writing config back to disk (#11560))
- Web tools/web_fetch: prefer `text/markdown` responses for Cloudflare Markdown for Agents, add `cf-markdown` extraction for markdown bodies, and redact fetched URLs in `x-markdown-tokens` debug logs to avoid leaking raw paths/query params. (#15376) Thanks @Yaxuan42.
<<<<<<< HEAD
- Config: keep legacy audio transcription migration strict by rejecting non-string/unsafe command tokens while still migrating valid custom script executables. (#5042) Thanks @shayan919293.
>>>>>>> 1f4943af3 (fix: note Discord guild allowlist resolution (#12326) (thanks @headswim))
=======
- Tools/web_search: support `freshness` for the Perplexity provider by mapping `pd`/`pw`/`pm`/`py` to Perplexity `search_recency_filter` values and including freshness in the Perplexity cache key. (#15343) Thanks @echoVic.
- Clawdock: avoid Zsh readonly variable collisions in helper scripts. (#15501) Thanks @nkelner.
- Memory: switch default local embedding model to the QAT `embeddinggemma-300m-qat-Q8_0` variant for better quality at the same footprint. (#15429) Thanks @azade-c.
- Docs/Mermaid: remove hardcoded Mermaid init theme blocks from four docs diagrams so dark mode inherits readable theme defaults. (#15157) Thanks @heytulsiprasad.
- Security/Pairing: generate 256-bit base64url device and node pairing tokens and use byte-safe constant-time verification to avoid token-compare edge-case failures. (#16535) Thanks @FaizanKolega, @gumadeiras.
>>>>>>> 48b3d7096 (fix: harden device pairing token generation and verification (#16535))

## 2026.2.12
>>>>>>> c32b92b7a (fix(macos): prevent Voice Wake crash on CJK trigger transcripts (openclaw#11052) thanks @Flash-LHR)

### Changes

- Version alignment: bump manifests and package versions to `2026.2.10`; keep `appcast.xml` unchanged until the next macOS release cut.
- CLI: add `openclaw logs --local-time` to display log timestamps in local timezone. (#13818) Thanks @xialonglee.
<<<<<<< HEAD
=======
- Telegram: render blockquotes as native `<blockquote>` tags instead of stripping them. (#14608)
- Discord: add role-based allowlists and role-based agent routing. (#10650) Thanks @Minidoracat.
>>>>>>> 22fe30c1d (fix: add discord role allowlists (#10650) (thanks @Minidoracat))
- Config: avoid redacting `maxTokens`-like fields during config snapshot redaction, preventing round-trip validation failures in `/config`. (#14006) Thanks @constansino.

### Breaking

- Hooks: `POST /hooks/agent` now rejects payload `sessionKey` overrides by default. To keep fixed hook context, set `hooks.defaultSessionKey` (recommended with `hooks.allowedSessionKeyPrefixes: ["hook:"]`). If you need legacy behavior, explicitly set `hooks.allowRequestSessionKey: true`. Thanks @alpernae for reporting.

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Gateway/OpenResponses: harden URL-based `input_file`/`input_image` handling with explicit SSRF deny policy, hostname allowlists (`files.urlAllowlist` / `images.urlAllowlist`), per-request URL input caps (`maxUrlParts`), blocked-fetch audit logging, and regression coverage/docs updates.
>>>>>>> 99f28031e (fix: harden OpenResponses URL input fetching)
- Security: fix unauthenticated Nostr profile API remote config tampering. (#13719) Thanks @coygeek.
- Security: remove bundled soul-evil hook. (#14757) Thanks @Imccccc.
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Security/Audit: add hook session-routing hardening checks (`hooks.defaultSessionKey`, `hooks.allowRequestSessionKey`, and prefix allowlists), and warn when HTTP API endpoints allow explicit session-key routing.
>>>>>>> 3421b2ec1 (fix: harden hook session key routing defaults)
- Security/Sandbox: confine mirrored skill sync destinations to the sandbox `skills/` root and stop using frontmatter-controlled skill names as filesystem destination paths. Thanks @1seal.
- Security/Web tools: treat browser/web content as untrusted by default (wrapped outputs for browser snapshot/tabs/console and structured external-content metadata for web tools), and strip `toolResult.details` from model-facing transcript/compaction inputs to reduce prompt-injection replay risk.
- Security/Hooks: harden webhook and device token verification with shared constant-time secret comparison, and add per-client auth-failure throttling for hook endpoints (`429` + `Retry-After`). Thanks @akhmittra.
<<<<<<< HEAD
>>>>>>> 3eb6a31b6 (fix: confine sandbox skill sync destinations)
=======
- Sessions/Gateway: harden transcript path resolution and reject unsafe session IDs/file paths so session operations stay within agent sessions directories. Thanks @akhmittra.
>>>>>>> 4199f9889 (fix: harden session transcript path resolution)
- Gateway: raise WS payload/buffer limits so 5,000,000-byte image attachments work reliably. (#14486) Thanks @0xRaini.
- Logging/CLI: use local timezone timestamps for console prefixing, and include `±HH:MM` offsets when using `openclaw logs --local-time` to avoid ambiguity. (#14771) Thanks @0xRaini.
- Gateway: drain active turns before restart to prevent message loss. (#13931) Thanks @0xRaini.
- Gateway: auto-generate auth token during install to prevent launchd restart loops. (#13813) Thanks @cathrynlavery.
- Gateway: prevent `undefined`/missing token in auth config. (#13809) Thanks @asklee-klawd.
- Gateway: handle async `EPIPE` on stdout/stderr during shutdown. (#13414) Thanks @keshav55.
- Cron: use requested `agentId` for isolated job auth resolution. (#13983) Thanks @0xRaini.
- Cron: prevent cron jobs from skipping execution when `nextRunAtMs` advances. (#14068) Thanks @WalterSumbon.
- Cron: pass `agentId` to `runHeartbeatOnce` for main-session jobs. (#14140) Thanks @ishikawa-pro.
- Cron: re-arm timers when `onTimer` fires while a job is still executing. (#14233) Thanks @tomron87.
- Cron: prevent duplicate fires when multiple jobs trigger simultaneously. (#14256) Thanks @xinhuagu.
- Cron: prevent duplicate announce-mode isolated cron deliveries, and keep main-session fallback active when best-effort structured delivery attempts fail to send any message. (#15739) Thanks @widingmarcus-cyber.
- Cron: isolate scheduler errors so one bad job does not break all jobs. (#14385) Thanks @MarvinDontPanic.
- Cron: prevent one-shot `at` jobs from re-firing on restart after skipped/errored runs. (#13878) Thanks @lailoo.
- Heartbeat: prevent scheduler stalls on unexpected run errors and avoid immediate rerun loops after `requests-in-flight` skips. (#14901) Thanks @joeykrug.
- Cron: honor stored session model overrides for isolated-agent runs while preserving `hooks.gmail.model` precedence for Gmail hook sessions. (#14983) Thanks @shtse8.
- Logging/Browser: fall back to `os.tmpdir()/openclaw` for default log, browser trace, and browser download temp paths when `/tmp/openclaw` is unavailable.
- WhatsApp: convert Markdown bold/strikethrough to WhatsApp formatting. (#14285) Thanks @Raikan10.
- WhatsApp: allow media-only sends and normalize leading blank payloads. (#14408) Thanks @karimnaguib.
- WhatsApp: default MIME type for voice messages when Baileys omits it. (#14444) Thanks @mcaxtr.
- Telegram: handle no-text message in model picker editMessageText. (#14397) Thanks @0xRaini.
- Telegram: surface REACTION_INVALID as non-fatal warning. (#14340) Thanks @0xRaini.
- BlueBubbles: fix webhook auth bypass via loopback proxy trust. (#13787) Thanks @coygeek.
- Slack: change default replyToMode from "off" to "all". (#14364) Thanks @nm-de.
- Slack: detect control commands when channel messages start with bot mention prefixes (for example, `@Bot /new`). (#14142) Thanks @beefiker.
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Slack: include thread reply metadata in inbound message footer context (`thread_ts`, `parent_user_id`) while keeping top-level `thread_ts == ts` events unthreaded. (#14625) Thanks @bennewton999.
- Signal: enforce E.164 validation for the Signal bot account prompt so mistyped numbers are caught early. (#15063) Thanks @Duartemartins.
>>>>>>> a43136c85 (fix: align slack thread footer metadata with reply semantics (#14625) (thanks @bennewton999))
- Discord: process DM reactions instead of silently dropping them. (#10418) Thanks @mcaxtr.
<<<<<<< HEAD
<<<<<<< HEAD
- Signal: enforce E.164 validation for the Signal bot account prompt so mistyped numbers are caught early. (#15063) Thanks @Duartemartins.
>>>>>>> 22593a272 (fix: refine cron heartbeat event detection)
=======
=======
- Discord: respect replyToMode in threads. (#11062) Thanks @cordx56.
>>>>>>> 926bf8477 (fix: update replyToMode notes (#11062) (thanks @cordx56))
- Heartbeat: filter noise-only system events so scheduled reminder notifications do not fire when cron runs carry only heartbeat markers. (#13317) Thanks @pvtclawn.
>>>>>>> 54513f424 (fix: align cron prompt content with filtered reminder events)
- Signal: render mention placeholders as `@uuid`/`@phone` so mention gating and Clawdbot targeting work. (#2013) Thanks @alexgleason.
- Agents/Reminders: guard reminder promises by appending a note when no `cron.add` succeeded in the turn, so users know nothing was scheduled. (#18588) Thanks @vignesh07.
- Discord: omit empty content fields for media-only messages while preserving caption whitespace. (#9507) Thanks @leszekszpunar.
- Onboarding/Providers: add Z.AI endpoint-specific auth choices (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`) and expand default Z.AI model wiring. (#13456) Thanks @tomsun28.
>>>>>>> 4c86010b0 (fix: remove bundled soul-evil hook (closes #8776) (#14757))
- Ollama: use configured `models.providers.ollama.baseUrl` for model discovery and normalize `/v1` endpoints to the native Ollama API root. (#14131) Thanks @shtse8.
<<<<<<< HEAD
=======
- Voice Call: pass Twilio stream auth token via `<Parameter>` instead of query string. (#14029) Thanks @mcwigglesmcgee.
- Feishu: pass `Buffer` directly to the Feishu SDK upload APIs instead of `Readable.from(...)` to avoid form-data upload failures. (#10345) Thanks @youngerstyle.
- Feishu: trigger mention-gated group handling only when the bot itself is mentioned (not just any mention). (#11088) Thanks @openperf.
- Feishu: probe status uses the resolved account context for multi-account credential checks. (#11233) Thanks @onevcat.
- Feishu DocX: preserve top-level converted block order using `firstLevelBlockIds` when writing/appending documents. (#13994) Thanks @Cynosure159.
- Feishu plugin packaging: remove `workspace:*` `openclaw` dependency from `extensions/feishu` and sync lockfile for install compatibility. (#14423) Thanks @jackcooper2015.
- CLI/Wizard: exit with code 1 when `configure`, `agents add`, or interactive `onboard` wizards are canceled, so `set -e` automation stops correctly. (#14156) Thanks @0xRaini.
- Media: strip `MEDIA:` lines with local paths instead of leaking as visible text. (#14399) Thanks @0xRaini.
- Config/Cron: exclude `maxTokens` from config redaction and honor `deleteAfterRun` on skipped cron jobs. (#13342) Thanks @niceysam.
- Config: ignore `meta` field changes in config file watcher. (#13460) Thanks @brandonwise.
- Cron: use requested `agentId` for isolated job auth resolution. (#13983) Thanks @0xRaini.
- Cron: pass `agentId` to `runHeartbeatOnce` for main-session jobs. (#14140) Thanks @ishikawa-pro.
- Cron: prevent cron jobs from skipping execution when `nextRunAtMs` advances. (#14068) Thanks @WalterSumbon.
- Cron: re-arm timers when `onTimer` fires while a job is still executing. (#14233) Thanks @tomron87.
- Cron: prevent duplicate fires when multiple jobs trigger simultaneously. (#14256) Thanks @xinhuagu.
- Cron: isolate scheduler errors so one bad job does not break all jobs. (#14385) Thanks @MarvinDontPanic.
- Cron: prevent one-shot `at` jobs from re-firing on restart after skipped/errored runs. (#13878) Thanks @lailoo.
- Daemon: suppress `EPIPE` error when restarting LaunchAgent. (#14343) Thanks @0xRaini.
- Antigravity: add opus 4.6 forward-compat model and bypass thinking signature sanitization. (#14218) Thanks @jg-noncelogic.
- Agents: prevent file descriptor leaks in child process cleanup. (#13565) Thanks @KyleChen26.
- Agents: prevent double compaction caused by cache TTL bypassing guard. (#13514) Thanks @taw0002.
- Agents: use last API call's cache tokens for context display instead of accumulated sum. (#13805) Thanks @akari-musubi.
<<<<<<< HEAD
=======
- Agents: keep followup-runner session `totalTokens` aligned with post-compaction context by using last-call usage and shared token-accounting logic. (#14979) Thanks @shtse8.
>>>>>>> 22593a272 (fix: refine cron heartbeat event detection)
- Discord: allow channel-edit to archive/lock threads and set auto-archive duration. (#5542) Thanks @stumct.
- Discord tests: use a partial @buape/carbon mock in slash command coverage. (#13262) Thanks @arosstale.
- Tests: update thread ID handling in Slack message collection tests. (#14108) Thanks @swizzmagik.
>>>>>>> d9f3d569a (fix: add Discord channel-edit thread params (#5542) (thanks @stumct))

## 2026.2.9
>>>>>>> 50a60b8be (fix: use configured base URL for Ollama model discovery (#14131))

### Added

- Gateway: add `agents.create`, `agents.update`, `agents.delete` RPC methods for web UI agent management. (#11045) Thanks @advaitpaliwal.

### Fixes

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
- Sessions: prune stale entries, cap session store size, rotate large stores, accept duration/size thresholds, default to warn-only maintenance, and prune cron run sessions after retention windows. (#13083) Thanks @skyfallsin, @Glucksberg, @gumadeiras.
- CI: Implement pipeline and workflow order. Thanks @quotentiroler.
>>>>>>> e19a23520 (fix: unify session maintenance and cron run pruning (#13083))
- WhatsApp: preserve original filenames for inbound documents. (#12691) Thanks @akramcodez.
- Telegram: harden quote parsing; preserve quote context; avoid QUOTE_TEXT_INVALID; avoid nested reply quote misclassification. (#12156) Thanks @rybnikov.
- Telegram: recover proactive sends when stale topic thread IDs are used by retrying without `message_thread_id`. (#11620)
<<<<<<< HEAD
=======
- Discord: auto-create forum/media thread posts on send, with chunked follow-up replies and media handling for forum sends. (#12380) Thanks @magendary, @thewilloftheshadow.
- Discord: cap gateway reconnect attempts to avoid infinite retry loops. (#12230) Thanks @Yida-Dev.
>>>>>>> d3c71875e (fix: cap Discord gateway reconnect at 50 attempts to prevent infinite loop (#12230))
- Telegram: render markdown spoilers with `<tg-spoiler>` HTML tags. (#11543) Thanks @ezhikkk.
- Telegram: truncate command registration to 100 entries to avoid `BOT_COMMANDS_TOO_MUCH` failures on startup. (#12356) Thanks @arosstale.
- Telegram: match DM `allowFrom` against sender user id (fallback to chat id) and clarify pairing logs. (#12779) Thanks @liuxiaopai-ai.
- Onboarding: QuickStart now auto-installs shell completion (prompt only in Manual).
- Auth: strip embedded line breaks from pasted API keys and tokens before storing/resolving credentials.
<<<<<<< HEAD
=======
- Agents: strip reasoning tags and downgraded tool markers from messaging tool and streaming output to prevent leakage. (#11053, #13453) Thanks @liebertar, @meaadore1221-afk, @gumadeiras.
- Browser: prevent stuck `act:evaluate` from wedging the browser tool, and make cancellation stop waiting promptly. (#13498) Thanks @onutc.
>>>>>>> 424d2dddf (fix: prevent act:evaluate hangs from getting browser tool stuck/killed (#13498))
- Web UI: make chat refresh smoothly scroll to the latest messages and suppress new-messages badge flash during manual refresh.
- Tools/web_search: include provider-specific settings in the web search cache key, and pass `inlineCitations` for Grok. (#12419) Thanks @tmchow.
- Tools/web_search: normalize direct Perplexity model IDs while keeping OpenRouter model IDs unchanged. (#12795) Thanks @cdorsey.
- Model failover: treat HTTP 400 errors as failover-eligible, enabling automatic model fallback. (#1879) Thanks @orenyomtov.
>>>>>>> 1cee5135e (fix: preserve original filename for WhatsApp inbound documents (#12691))
- Errors: prevent false positive context overflow detection when conversation mentions "context overflow" topic. (#2078) Thanks @sbking.
<<<<<<< HEAD
>>>>>>> c984e6d8d (fix: prevent false positive context overflow detection in conversation text (#2078))
- Model failover: treat HTTP 400 errors as failover-eligible, enabling automatic model fallback when providers return bad request errors. (#1879) Thanks @orenyomtov.
<<<<<<< HEAD
>>>>>>> 71b4be879 (fix: handle 400 status in failover to enable model fallback (#1879))
=======
- Telegram: truncate command registration to 100 entries to avoid `BOT_COMMANDS_TOO_MUCH` failures on startup. (#12356) Thanks @arosstale.
>>>>>>> 727a390d1 (fix: add telegram command-cap regression test (#12356) (thanks @arosstale))
- Exec approvals: format forwarded command text as inline/fenced monospace for safer approval scanning across channels. (#11937)
=======
- Errors: avoid rewriting/swallowing normal assistant replies that mention error keywords by scoping `sanitizeUserFacingText` rewrites to error-context. (#12988) Thanks @Takhoffman.
- Config: re-hydrate state-dir `.env` during runtime config loads so `${VAR}` substitutions remain resolvable. (#12748) Thanks @rodrigouroz.
- Gateway: no more post-compaction amnesia; injected transcript writes now preserve Pi session `parentId` chain so agents can remember again. (#12283) Thanks @Takhoffman.
- Gateway: fix multi-agent sessions.usage discovery. (#11523) Thanks @Takhoffman.
- Agents: recover from context overflow caused by oversized tool results (pre-emptive capping + fallback truncation). (#11579) Thanks @tyler6204.
- Subagents/compaction: stabilize announce timing and preserve compaction metrics across retries. (#11664) Thanks @tyler6204.
- Subagents: report timeout-aborted runs as timed out instead of completed successfully in parent-session announcements. (#13996) Thanks @dario-github.
- Cron: share isolated announce flow and harden scheduling/delivery reliability. (#11641) Thanks @tyler6204.
- Cron tool: recover flat params when LLM omits the `job` wrapper for add requests. (#12124) Thanks @tyler6204.
- Gateway/CLI: when `gateway.bind=lan`, use a LAN IP for probe URLs and Control UI links. (#11448) Thanks @AnonO6.
- CLI: make `openclaw plugins list` output scannable by hoisting source roots and shortening bundled/global/workspace plugin paths.
- Hooks: fix bundled hooks broken since 2026.2.2 (tsdown migration). (#9295) Thanks @patrickshao.
- Security/Plugins: install plugin and hook dependencies with `--ignore-scripts` to prevent lifecycle script execution.
- Routing: refresh bindings per message by loading config at route resolution so binding changes apply without restart. (#11372) Thanks @juanpablodlc.
- Exec approvals: render forwarded commands in monospace for safer approval scanning. (#11937) Thanks @sebslight.
>>>>>>> e85bbe01f (fix: report subagent timeout as 'timed out' instead of 'completed successfully' (#13996))
- Config: clamp `maxTokens` to `contextWindow` to prevent invalid model configs. (#5516) Thanks @lailoo.
- Docs: fix language switcher ordering and Japanese locale flag in Mintlify nav. (#12023) Thanks @joshp123.
- Paths: make internal path resolution respect `HOME`/`USERPROFILE` before `os.homedir()` across config, agents, sessions, pairing, cron, and CLI profiles. (#12091) Thanks @sebslight.
- Paths: structurally resolve `OPENCLAW_HOME`-derived home paths and fix Windows drive-letter handling in tool meta shortening. (#12125) Thanks @mcaxtr.
- Thinking: allow xhigh for `github-copilot/gpt-5.2-codex` and `github-copilot/gpt-5.2`. (#11646) Thanks @seans-openclawbot.
- Discord: support forum/media `thread create` starter messages, wire `message thread create --message`, and harden thread-create routing. (#10062) Thanks @jarvis89757.
- Gateway: stabilize chat routing by canonicalizing node session keys for node-originated chat methods. (#11755) Thanks @mbelinky.
- Web UI: make chat refresh smoothly scroll to the latest messages and suppress new-messages badge flash during manual refresh.
>>>>>>> 456bd5874 (fix(paths): structurally resolve home dir to prevent Windows path bugs (#12125))
- Cron: route text-only isolated agent announces through the shared subagent announce flow; add exponential backoff for repeated errors; preserve future `nextRunAtMs` on restart; include current-boundary schedule matches; prevent stale threadId reuse across targets; and add per-job execution timeout. (#11641) Thanks @tyler6204.
- Subagents: stabilize announce timing, preserve compaction metrics across retries, clamp overflow-prone long timeouts, and cap impossible context usage token totals. (#11551) Thanks @tyler6204.
>>>>>>> 191da1feb (fix: context overflow compaction and subagent announce improvements (#11664) (thanks @tyler6204))
- Agents: recover from context overflow caused by oversized tool results (pre-emptive capping + fallback truncation). (#11579) Thanks @tyler6204.
<<<<<<< HEAD
=======
- Telegram: render markdown spoilers with `<tg-spoiler>` HTML tags. (#11543) Thanks @ezhikkk.
- Telegram: recover proactive sends when stale topic thread IDs are used by retrying without `message_thread_id`, and clear explicit no-thread route updates instead of inheriting stale thread state. (#11620)
>>>>>>> d7bd68ff2 (fix: recover telegram sends from stale thread ids)
- Gateway/CLI: when `gateway.bind=lan`, use a LAN IP for probe URLs and Control UI links. (#11448) Thanks @AnonO6.
- Memory: set Voyage embeddings `input_type` for improved retrieval. (#10818) Thanks @mcinteerj.
- Memory/QMD: run boot refresh in background by default, add configurable QMD maintenance timeouts, and retry QMD after fallback failures. (#9690, #9705)
- Media understanding: recognize `.caf` audio attachments for transcription. (#10982) Thanks @succ985.
- State dir: honor `OPENCLAW_STATE_DIR` for default device identity and canvas storage paths. (#4824) Thanks @kossoy.
- Tests: harden flaky hotspots by removing timer sleeps, consolidating onboarding provider-auth coverage, and improving memory test realism. (#11598) Thanks @gumadeiras.
<<<<<<< HEAD
=======
- macOS: honor Nix-managed defaults suite (`ai.openclaw.mac`) for nixMode to prevent onboarding from reappearing after bundle-id churn. (#12205) Thanks @joshp123.
- Matrix: add multi-account support via `channels.matrix.accounts`; use per-account config for dm policy, allowFrom, groups, and other settings; serialize account startup to avoid race condition. (#7286, #3165, #3085) Thanks @emonty.
>>>>>>> 2b685b08c (fix: harden matrix multi-account routing (#7286) (thanks @emonty))

>>>>>>> ebe573040 (fix: use STATE_DIR instead of hardcoded ~/.openclaw for identity and canvas (#4824))
## 2026.2.6

### Changes

- Cron: default `wakeMode` is now `"now"` for new jobs (was `"next-heartbeat"`). (#10776) Thanks @tyler6204.
- Cron: `cron run` defaults to force execution; use `--due` to restrict to due-only. (#10776) Thanks @tyler6204.
- Models: support Anthropic Opus 4.6 and OpenAI Codex gpt-5.3-codex (forward-compat fallbacks). (#9853, #10720, #9995) Thanks @TinyTb, @calvin-hpnet, @tyler6204.
- Providers: add xAI (Grok) support. (#9885) Thanks @grp06.
<<<<<<< HEAD
=======
- Providers: add Baidu Qianfan support. (#8868) Thanks @ide-rea.
>>>>>>> 8f2884b98 (fix: i am fixing all the changes that claude made. vibe coding is not there yet. anyways, i fixed the issues that the bot told me to fix)
- Web UI: add token usage dashboard. (#10072) Thanks @Takhoffman.
- Memory: native Voyage AI support. (#7078) Thanks @mcinteerj.
- Sessions: cap sessions_history payloads to reduce context overflow. (#10000) Thanks @gut-puncture.
- CLI: sort commands alphabetically in help output. (#8068) Thanks @deepsoumya617.
- Agents: bump pi-mono to 0.52.7; add embedded forward-compat fallback for Opus 4.6 model ids.

### Added

- Cron: run history deep-links to session chat from the dashboard. (#10776) Thanks @tyler6204.
- Cron: per-run session keys in run log entries and default labels for cron sessions. (#10776) Thanks @tyler6204.
- Cron: legacy payload field compatibility (`deliver`, `channel`, `to`, `bestEffortDeliver`) in schema. (#10776) Thanks @tyler6204.

### Fixes

- Agents: recover from context overflow caused by oversized tool results (pre-emptive capping + fallback truncation). (#11579) Thanks @tyler6204.
- Cron: scheduler reliability (timer drift, restart catch-up, lock contention, stale running markers). (#10776) Thanks @tyler6204.
- Cron: store migration hardening (legacy field migration, parse error handling, explicit delivery mode persistence). (#10776) Thanks @tyler6204.
<<<<<<< HEAD
=======
- Memory: set Voyage embeddings `input_type` for improved retrieval. (#10818) Thanks @mcinteerj.
- Media understanding: recognize `.caf` audio attachments for transcription. (#10982) Thanks @succ985.
>>>>>>> b8f740fb1 (fix: add .caf to AUDIO_FILE_EXTENSIONS (#10982))
- Telegram: auto-inject DM topic threadId in message tool + subagent announce. (#7235) Thanks @Lukavyi.
- Security: require auth for Gateway canvas host and A2UI assets. (#9518) Thanks @coygeek.
- Cron: fix scheduling and reminder delivery regressions; harden next-run recompute + timer re-arming + legacy schedule fields. (#9733, #9823, #9948, #9932) Thanks @tyler6204, @pycckuu, @j2h4u, @fujiwara-tofu-shop.
- Update: harden Control UI asset handling in update flow. (#10146) Thanks @gumadeiras.
- Security: add skill/plugin code safety scanner; redact credentials from config.get gateway responses. (#9806, #9858) Thanks @abdelsfane.
- Exec approvals: coerce bare string allowlist entries to objects. (#9903) Thanks @mcaxtr.
- Slack: add mention stripPatterns for /new and /reset. (#9971) Thanks @ironbyte-rgb.
- Chrome extension: fix bundled path resolution. (#8914) Thanks @kelvinCB.
- Compaction/errors: allow multiple compaction retries on context overflow; show clear billing errors. (#8928, #8391) Thanks @Glucksberg.

>>>>>>> d90cac990 (fix: cron scheduler reliability, store hardening, and UX improvements (#10776))
## 2026.2.3

### Changes

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Telegram: auto-inject forum topic `threadId` in message tool and subagent announce so media, buttons, and subagent results land in the correct topic instead of General. (#7235) Thanks @Lukavyi.
>>>>>>> 01db1dde1 (fix: telegram topic auto-threading — use parseTelegramTarget, add tests (#7235) (thanks @Lukavyi))
- CLI: sort `openclaw --help` commands (and options) alphabetically. (#8068) Thanks @deepsoumya617.
- Telegram: remove last `@ts-nocheck` from `bot-handlers.ts`, use Grammy types directly, deduplicate `StickerMetadata`. Zero `@ts-nocheck` remaining in `src/telegram/`. (#9206)
- Telegram: remove `@ts-nocheck` from `bot-message.ts`, type deps via `Omit<BuildTelegramMessageContextParams>`, widen `allMedia` to `TelegramMediaRef[]`. (#9180)
- Telegram: remove `@ts-nocheck` from `bot.ts`, fix duplicate `bot.catch` error handler (Grammy overrides), remove dead reaction `message_thread_id` routing, harden sticker cache guard. (#9077)
- Onboarding: add Cloudflare AI Gateway provider setup and docs. (#7914) Thanks @roerohan.
>>>>>>> cf95b2f3f (fix: update changelog for help sorting (#8068) (thanks @deepsoumya617))
- Onboarding: add Moonshot (.cn) auth choice and keep the China base URL when preserving defaults. (#7180) Thanks @waynelwz.

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
- Control UI: add hardened fallback for asset resolution in global npm installs. (#4855) Thanks @anapivirtua.
- Update: remove dead restore control-ui step that failed on gitignored dist/ output.
<<<<<<< HEAD
=======
- Update: avoid wiping prebuilt Control UI assets during dev auto-builds (`tsdown --no-clean`), run update doctor via `openclaw.mjs`, and auto-restore missing UI assets after doctor. (#10146) Thanks @gumadeiras.
- Agents: harden embedded and CLI runner workspace resolution for missing/blank runtime inputs by falling back to per-agent workspace defaults (not CWD), preventing `sessions_spawn` early crashes. (#10176) Thanks @Yida-Dev.
>>>>>>> 421644940 (fix: guard resolveUserPath against undefined input (#10176))
- Models: add forward-compat fallback for `openai-codex/gpt-5.3-codex` when model registry hasn't discovered it yet. (#9989) Thanks @w1kke.
- Auto-reply/Docs: normalize `extra-high` (and spaced variants) to `xhigh` for Codex thinking levels, and align Codex 5.3 FAQ examples. (#9976) Thanks @slonce70.
>>>>>>> 72245855e (fix: add fallback for Control UI asset resolution in global installs)
- Compaction: remove orphaned `tool_result` messages during history pruning to prevent session corruption from aborted tool calls. (#9868, fixes #9769, #9724, #9672)
- Telegram: pass `parentPeer` for forum topic binding inheritance so group-level bindings apply to all topics within the group. (#9789, fixes #9545, #9351)
- CLI: pass `--disable-warning=ExperimentalWarning` as a Node CLI option when respawning (avoid disallowed `NODE_OPTIONS` usage; fixes npm pack). (#9691) Thanks @18-RAJAT.
>>>>>>> f32eeae3b (fix: remove orphaned tool_results during compaction pruning)
- CLI: resolve bundled Chrome extension assets by walking up to the nearest assets directory; add resolver and clipboard tests. (#8914) Thanks @kelvinCB.
- Tests: stabilize Windows ACL coverage with deterministic os.userInfo mocking. (#9335) Thanks @M00N7682.
=======
- Control UI: add hardened fallback for asset resolution in global npm installs. (#4855) Thanks @anapivirtua.
- Update: remove dead restore control-ui step that failed on gitignored dist/ output.
- Update: avoid wiping prebuilt Control UI assets during dev auto-builds (`tsdown --no-clean`), run update doctor via `openclaw.mjs`, and auto-restore missing UI assets after doctor. (#10146) Thanks @gumadeiras.
- Models: add forward-compat fallback for `openai-codex/gpt-5.3-codex` when model registry hasn't discovered it yet. (#9989) Thanks @w1kke.
- Auto-reply/Docs: normalize `extra-high` (and spaced variants) to `xhigh` for Codex thinking levels, and align Codex 5.3 FAQ examples. (#9976) Thanks @slonce70.
- Compaction: remove orphaned `tool_result` messages during history pruning to prevent session corruption from aborted tool calls. (#9868, fixes #9769, #9724, #9672)
- Telegram: pass `parentPeer` for forum topic binding inheritance so group-level bindings apply to all topics within the group. (#9789, fixes #9545, #9351)
- CLI: pass `--disable-warning=ExperimentalWarning` as a Node CLI option when respawning (avoid disallowed `NODE_OPTIONS` usage; fixes npm pack). (#9691) Thanks @18-RAJAT.
- CLI: resolve bundled Chrome extension assets by walking up to the nearest assets directory; add resolver and clipboard tests. (#8914) Thanks @kelvinCB.
- Tests: stabilize Windows ACL coverage with deterministic os.userInfo mocking. (#9335) Thanks @M00N7682.
- Exec approvals: coerce bare string allowlist entries to objects to prevent allowlist corruption. (#9903, fixes #9790) Thanks @mcaxtr.
- Exec approvals: ensure two-phase approval registration/decision flow works reliably by validating `twoPhase` requests and exposing `waitDecision` as an approvals-scoped gateway method. (#3357, fixes #2402) Thanks @ramin-shirali.
>>>>>>> 1af0edf7f (fix: ensure exec approval is registered before returning (#2402) (#3357))
- Heartbeat: allow explicit accountId routing for multi-account channels. (#8702) Thanks @lsh411.
- TUI/Gateway: handle non-streaming finals, refresh history for non-local chat runs, and avoid event gap warnings for targeted tool streams. (#8432) Thanks @gumadeiras.
- Security: stop exposing Gateway auth tokens via URL query parameters in Control UI entrypoints, and reject hook tokens in query parameters. (#9436) Thanks @coygeek.
- Shell completion: auto-detect and migrate slow dynamic patterns to cached files for faster terminal startup; add completion health checks to doctor/update/onboard.
>>>>>>> 1ee1522da (fix: resolve bundled chrome extension assets (#8914) (thanks @kelvinCB))
- Telegram: honor session model overrides in inline model selection. (#8193) Thanks @gildo.
- Web UI: apply button styling to the new-messages indicator.
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Onboarding: infer auth choice from non-interactive API key flags. (#8484) Thanks @f-trycua.
>>>>>>> 22927b083 (fix: infer --auth-choice from API key flags during non-interactive onboarding (#9241))
- Security: keep untrusted channel metadata out of system prompts (Slack/Discord). Thanks @KonstantinMirin.
<<<<<<< HEAD
=======
- Discord: treat allowlisted senders as owner for system-prompt identity hints while keeping channel topics untrusted.
- Security: enforce sandboxed media paths for message tool attachments. (#9182) Thanks @victormier.
- Security: require explicit credentials for gateway URL overrides to prevent credential leakage. (#8113) Thanks @victormier.
- Security: gate `whatsapp_login` tool to owner senders and default-deny non-owner contexts. (#8768) Thanks @victormier.
>>>>>>> d84eb4646 (fix: restore discord owner hint from allowlists)
- Voice call: harden webhook verification with host allowlists/proxy trust and keep ngrok loopback bypass.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> a749db982 (fix: harden voice-call webhook verification)
=======
=======
- Voice call: add regression coverage for anonymous inbound caller IDs with allowlist policy. (#8104) Thanks @victormier.
>>>>>>> 0cd47d830 (fix: cover anonymous voice allowlist callers (#8104) (thanks @victormier) (#9188))
- Cron: accept epoch timestamps and 0ms durations in CLI `--at` parsing.
- Cron: reload store data when the store file is recreated or mtime changes.
- Cron: deliver announce runs directly, honor delivery mode, and respect wakeMode for summaries. (#8540) Thanks @tyler6204.
- Cron: correct announce delivery inference for thread session keys and null delivery inputs. (#9733) Thanks @tyler6204.
- Telegram: include forward_from_chat metadata in forwarded messages and harden cron delivery target checks. (#8392) Thanks @Glucksberg.
<<<<<<< HEAD
>>>>>>> 78fd19472 (fix: telegram forward metadata + cron delivery guard (#8392) (thanks @Glucksberg))
=======
- Telegram: preserve DM topic threadId in deliveryContext. (#9039) Thanks @lailoo.
- macOS: fix cron payload summary rendering and ISO 8601 formatter concurrency safety.
<<<<<<< HEAD
>>>>>>> f2c5c847b (fix: preserve telegram DM topic threadId (#9039) (thanks @lailoo))
=======
- Discord: enforce DM allowlists for agent components (buttons/select menus), honoring pairing store approvals and tag matches. (#11254) Thanks @thedudeabidesai.
>>>>>>> 4537ebc43 (fix: enforce Discord agent component DM auth (#11254) (thanks @thedudeabidesai))

>>>>>>> 4a5d36892 (fix: keep Moonshot CN base URL in onboarding (#7180) (thanks @waynelwz))
## 2026.2.2-3

### Fixes

- Update: ship legacy daemon-cli shim for pre-tsdown update imports (fixes daemon restart after npm update).

## 2026.2.2-2

### Fixes

- CLI status: resolve build-info from bundled dist output (fixes "unknown" commit in npm builds).

## 2026.2.2-1

### Fixes

- CLI status: fall back to build-info for version detection (fixes "unknown" in beta builds). Thanks @gumadeira.
>>>>>>> e895e85f5 (fix: improve build-info resolution for commit/version)

<<<<<<< HEAD
<<<<<<< HEAD
## 2026.1.27-beta.1
Status: beta.
=======
## 2026.2.2
=======
## 2026.2.2
<<<<<<< HEAD
=======

### Changes

- Web UI: add Agents dashboard for managing agent files, tools, skills, models, channels, and cron jobs.
- Security: add healthcheck skill and bootstrap audit guidance. (#7641) Thanks @Takhoffman.
- Docs: seed zh-CN translations. (#6619) Thanks @joshp123.
- Docs: expand zh-Hans navigation and fix zh-CN index asset paths. (#7242) Thanks @joshp123.
- Docs: add zh-CN landing notice + AI-translated image. (#7303) Thanks @joshp123.
- Docs: fix typo - clawdbot is the compatibility shim, not openclaw. (#7415) Thanks @lailoo.
- Config: allow setting a default subagent thinking level via `agents.defaults.subagents.thinking` (and per-agent `agents.list[].subagents.thinking`). (#7372) Thanks @tyler6204.
- Memory: implement the opt-in QMD backend for workspace memory. (#3160) Thanks @vignesh07.
>>>>>>> 1ee57cf72 (fix: changelog entry for QMD memory (#3160) (thanks @vignesh07))

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Agents: repair malformed tool calls and session transcripts. (#7473) Thanks @justinhuangcode.
>>>>>>> cfd6b21d0 (fix: repair malformed tool calls and session transcripts (#7473) (thanks @justinhuangcode))
- fix(agents): validate AbortSignal instances before calling AbortSignal.any() (#7277) (thanks @Elarwei001)
- fix(webchat): respect user scroll position during streaming and refresh (#7226) (thanks @marcomarandiz)
<<<<<<< HEAD
>>>>>>> 5fb8f779c (fix: validate AbortSignal instances before calling AbortSignal.any() (#7277) (thanks @Elarwei001))
=======
- Media understanding: skip binary media from file text extraction. (#7475) Thanks @AlexZhangji.
>>>>>>> f49297e2c (fix: skip audio files from text extraction to prevent binary processing (#7475))
=======
- Docs: finish renaming the QMD memory docs to reference the OpenClaw state dir.
- Onboarding: keep TUI flow exclusive (skip completion prompt + background Web UI seed).
- Onboarding: drop completion prompt now handled by install/update.
- TUI: block onboarding output while TUI is active and restore terminal state on exit.
- CLI: cache shell completion scripts in state dir and source cached files in profiles.
- Zsh completion: escape option descriptions to avoid invalid option errors.
- Agents: repair malformed tool calls and session transcripts. (#7473) Thanks @justinhuangcode.
- fix(agents): validate AbortSignal instances before calling AbortSignal.any() (#7277) (thanks @Elarwei001)
- fix(webchat): respect user scroll position during streaming and refresh (#7226) (thanks @marcomarandiz)
- Telegram: recover from grammY long-poll timed out errors. (#7466) Thanks @macmimi23.
- Telegram: honor session model overrides in inline model selection. (#8193) Thanks @gildo.
- Media understanding: skip binary media from file text extraction. (#7475) Thanks @AlexZhangji.
- Security: enforce access-group gating for Slack slash commands when channel type lookup fails.
- Security: require validated shared-secret auth before skipping device identity on gateway connect.
>>>>>>> 41a4f1200 (fix: honor telegram model overrides in buttons (#8193) (thanks @gildo))
- Security: guard skill installer downloads with SSRF checks (block private/localhost URLs).
- Security: harden Windows exec allowlist; block cmd.exe bypass via single &. Thanks @simecek.
<<<<<<< HEAD
- Media understanding: apply SSRF guardrails to provider fetches; allow private baseUrl overrides explicitly.
=======
- Discord: route autoThread replies to existing threads instead of the root channel. (#8302) Thanks @gavinbmoore, @thewilloftheshadow.
- Media understanding: apply SSRF guardrails to provider fetches; allow private baseUrl overrides explicitly.
- fix(voice-call): harden inbound allowlist; reject anonymous callers; require Telnyx publicKey for allowlist; token-gate Twilio media streams; cap webhook body size (thanks @simecek)
- fix(webchat): respect user scroll position during streaming and refresh (#7226) (thanks @marcomarandiz)
- Telegram: recover from grammY long-poll timed out errors. (#7466) Thanks @macmimi23.
- Agents: repair malformed tool calls and session transcripts. (#7473) Thanks @justinhuangcode.
- fix(agents): validate AbortSignal instances before calling AbortSignal.any() (#7277) (thanks @Elarwei001)
- Media understanding: skip binary media from file text extraction. (#7475) Thanks @AlexZhangji.
- Onboarding: keep TUI flow exclusive (skip completion prompt + background Web UI seed); completion prompt now handled by install/update.
- TUI: block onboarding output while TUI is active and restore terminal state on exit.
- CLI/Zsh completion: cache scripts in state dir and escape option descriptions to avoid invalid option errors.
- fix(ui): resolve Control UI asset path correctly.
- fix(ui): refresh agent files after external edits.
- Docs: finish renaming the QMD memory docs to reference the OpenClaw state dir.
- Tests: stub SSRF DNS pinning in web auto-reply + Gemini video coverage. (#6619) Thanks @joshp123.
>>>>>>> 71939523a (fix: normalize Discord autoThread reply target (#8302) (thanks @gavinbmoore))

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
>>>>>>> 9bd64c8a1 (fix: expand SSRF guard coverage)

### Fixes

<<<<<<< HEAD
=======
- Security: guard remote media fetches with SSRF protections (block private/localhost, DNS pinning).
- Plugins: validate plugin/hook install paths and reject traversal-like names.
>>>>>>> 81c68f582 (fix: guard remote media fetches with SSRF checks)
- Telegram: add download timeouts for file fetches. (#6914) Thanks @hclsys.
- Telegram: enforce thread specs for DM vs forum sends. (#6833) Thanks @obviyus.
<<<<<<< HEAD

## 2026.1.31
>>>>>>> e25f8ed56 (fix: add changelog for telegram thread spec (#6833) (thanks @obviyus))
=======
- Streaming: avoid stuck typing indicator after streamed BlueBubbles replies.
- Streaming: dedupe fence-split handling and cover maxChars fallback for newline chunking.

## 2026.2.1
>>>>>>> 9ef24fd40 (fix: flush block streaming on paragraph boundaries for chunkMode=newline (#7014))

### Changes
<<<<<<< HEAD
<<<<<<< HEAD
- Rebrand: rename the npm package/CLI to `moltbot`, add a `moltbot` compatibility shim, and move extensions to the `@moltbot/*` scope.
- Commands: group /help and /commands output with Telegram paging. (#2504) Thanks @hougangdev.
- macOS: limit project-local `node_modules/.bin` PATH preference to debug builds (reduce PATH hijacking risk).
- macOS: finish Moltbot app rename for macOS sources, bundle identifiers, and shared kit paths. (#2844) Thanks @fal3.
- Branding: update launchd labels, mobile bundle IDs, and logging subsystems to bot.molt (legacy com.clawdbot migrations). Thanks @thewilloftheshadow.
=======
=======

- Telegram: use shared pairing store. (#6127) Thanks @obviyus.
- Agents: add OpenRouter app attribution headers. (#5050) Thanks @alexanderatallah.

### Fixes

<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
- Auto-reply: avoid referencing workspace files in /new greeting prompt. (#5706) Thanks @bravostation.
- Tools: treat `"*"` tool allowlist entries as valid to avoid spurious unknown-entry warnings.
>>>>>>> 521b12181 (fix: treat '*' tool allowlist as valid)
- Process: resolve Windows `spawn()` failures for npm-family CLIs by appending `.cmd` when needed. (#5815) Thanks @thejhinvirtuoso.
- Docs: update MiniMax OAuth setup commands; Extensions: use OpenClaw plugin SDK for MiniMax OAuth. (#5402) Thanks @Maosghoul.
- Discord: resolve PluralKit proxied senders for allowlists and labels. (#5838) Thanks @thewilloftheshadow.
>>>>>>> 3d5c03ec2 (fix: resolve Windows npm spawn ENOENT (#5815) (thanks @thejhinvirtuoso))
- Telegram: restore draft streaming partials. (#5543) Thanks @obviyus.
<<<<<<< HEAD
=======
- Onboarding: friendlier Windows onboarding message. (#6242) Thanks @shanselman.
- TUI: prevent crash when searching with digits in the model selector.
- Agents: wire before_tool_call plugin hook into tool execution. (#6570) Thanks @ryancnelson.
- Browser: secure Chrome extension relay CDP sessions.
- Docker: use container port for gateway command instead of host port. (#5110) Thanks @mise42.
- Docker: start gateway CMD by default for container deployments. (#6635) Thanks @kaizen403.
- fix(lobster): block arbitrary exec via lobsterPath/cwd injection (GHSA-4mhr-g7xj-cg8j). (#5335) Thanks @vignesh07.
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 8eb11bd30 (fix: wire before_tool_call hook into tool execution (#6570) (thanks @ryancnelson) (#6660))
=======
- Security: block LD_/DYLD_ env overrides for host exec. (#4896) Thanks @HassanFleyah.
=======
- Security: block LD*/DYLD* env overrides for host exec. (#4896) Thanks @HassanFleyah.
>>>>>>> 4347d2468 (fix: format issues and lint error in oauth.ts)
- Security: harden web tool content wrapping + file parsing safeguards. (#4058) Thanks @VACInc.
>>>>>>> a87a07ec8 (fix: harden host exec env validation (#4896) (thanks @HassanFleyah))

## 2026.1.30

### Changes

>>>>>>> f1de88c19 (fix: restore telegram draft streaming partials (#5543) (thanks @obviyus))
- CLI: add `completion` command (Zsh/Bash/PowerShell/Fish) and auto-setup during postinstall/onboarding.
- CLI: add per-agent `models status` (`--agent` filter). (#4780) Thanks @jlowin.
- Agents: add Kimi K2.5 to the synthetic model catalog. (#4407) Thanks @manikv12.
- Auth: switch Kimi Coding to built-in provider; normalize OAuth profile email.
- Agents: update pi SDK/API usage and dependencies.
- Web UI: refresh sessions after chat commands and improve session display names.
- Build: move TypeScript builds to `tsdown` + `tsgo` (faster builds, CI typechecks), update tsconfig target, and clean up lint rules.
- Docs: add pi/pi-dev docs and update OpenClaw branding + install links.
- Docker E2E: stabilize gateway readiness, plugin installs/manifests, and cleanup/doctor switch entrypoint checks.

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
- CLI: fix `tui:dev` port resolution.
- LINE: fix status command TypeError. (#4651)
- OAuth: skip expired-token warnings when refresh tokens are still valid. (#4593)
- Build: skip redundant UI install step in Dockerfile. (#4584) Thanks @obviyus.

## 2026.1.29

### Changes
- Rebrand: rename the npm package/CLI to `openclaw`, add a `openclaw` compatibility shim, and move extensions to the `@openclaw/*` scope.
- Onboarding: strengthen security warning copy for beta + access control expectations.
- Onboarding: add Venice API key to non-interactive flow. (#1893) Thanks @jonisjongithub.
- Config: auto-migrate legacy state/config paths and keep config resolution consistent across legacy filenames.
- Gateway: warn on hook tokens via query params; document header auth preference. (#2200) Thanks @YuriNachos.
- Gateway: add dangerous Control UI device auth bypass flag + audit warnings. (#2248)
- Doctor: warn on gateway exposure without auth. (#2016) Thanks @Alex-Alaniz.
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
>>>>>>> b9b94715f (fix: avoid stderr backpressure in macOS discovery (#3304) (thanks @abhijeet117))
- Tools: add per-sender group tool policies and fix precedence. (#1757) Thanks @adam91holt.
- Agents: summarize dropped messages during compaction safeguard pruning. (#2509) Thanks @jogi47.
- Memory Search: allow extra paths for memory indexing (ignores symlinks). (#3600) Thanks @kira-ariaki.
- Skills: add multi-image input support to Nano Banana Pro skill. (#1958) Thanks @tyler6204.
<<<<<<< HEAD
- Agents: honor tools.exec.safeBins in exec allowlist checks. (#2281)
- Matrix: switch plugin SDK to @vector-im/matrix-bot-sdk.
=======
- Skills: add missing dependency metadata for GitHub, Notion, Slack, Discord. (#1995) Thanks @jackheuberger.
- Commands: group /help and /commands output with Telegram paging. (#2504) Thanks @hougangdev.
- Routing: add per-account DM session scope and document multi-account isolation. (#3095) Thanks @jarvis-sam.
- Routing: precompile session key regexes. (#1697) Thanks @Ray0907.
- CLI: use Node's module compile cache for faster startup. (#2808) Thanks @pi0.
- CLI: add per-agent model status and auth order scoping. (#4780) Thanks @jlowin.
- Auth: show copyable Google auth URL after ASCII prompt. (#1787) Thanks @robbyczgw-cla.
- Agents: add Kimi K2.5 to the synthetic model catalog. (#4407) Thanks @manikv12.
- TUI: avoid width overflow when rendering selection lists. (#1686) Thanks @mossein.
- macOS: finish OpenClaw app rename for macOS sources, bundle identifiers, and shared kit paths. (#2844) Thanks @fal3.
- Branding: update launchd labels, mobile bundle IDs, and logging subsystems to bot.molt (legacy bundle ID migrations). Thanks @thewilloftheshadow.
- macOS: limit project-local `node_modules/.bin` PATH preference to debug builds (reduce PATH hijacking risk).
- macOS: keep custom SSH usernames in remote target. (#2046) Thanks @algal.
- macOS: avoid crash when rendering code blocks by bumping Textual to 0.3.1. (#2033) Thanks @garricn.
- Update: ignore dist/control-ui for dirty checks and restore after ui builds. (#1976) Thanks @Glucksberg.
- Build: bundle A2UI assets during build and stop tracking generated bundles. (#2455) Thanks @0oAstro.
- CI: increase Node heap size for macOS checks. (#1890) Thanks @realZachi.
- Config: apply config.env before ${VAR} substitution. (#1813) Thanks @spanishflu-est1918.
- Gateway: prefer newest session metadata when combining stores. (#1823) Thanks @emanuelst.
>>>>>>> daf27dd37 (fix: add per-agent models status (#4780) (thanks @jlowin))
- Docs: tighten Fly private deployment steps. (#2289) Thanks @dguido.
- Docs: add migration guide for moving to a new machine. (#2381)
- Docs: add Northflank one-click deployment guide. (#2167) Thanks @AdeboyeDN.
- Gateway: warn on hook tokens via query params; document header auth preference. (#2200) Thanks @YuriNachos.
- Gateway: add dangerous Control UI device auth bypass flag + audit warnings. (#2248)
- Doctor: warn on gateway exposure without auth. (#2016) Thanks @Alex-Alaniz.
- Config: auto-migrate legacy state/config paths and keep config resolution consistent across legacy filenames.
- Discord: add configurable privileged gateway intents for presences/members. (#2266) Thanks @kentaro.
- Docs: add Vercel AI Gateway to providers sidebar. (#1901) Thanks @jerilynzheng.
- Agents: expand cron tool description with full schema docs. (#1988) Thanks @tomascupr.
- Skills: add missing dependency metadata for GitHub, Notion, Slack, Discord. (#1995) Thanks @jackheuberger.
- Docs: add Render deployment guide. (#1975) Thanks @anurag.
- Docs: add Claude Max API Proxy guide. (#1875) Thanks @atalovesyou.
- Docs: add DigitalOcean deployment guide. (#1870) Thanks @0xJonHoldsCrypto.
- Docs: add Oracle Cloud (OCI) platform guide + cross-links. (#2333) Thanks @hirefrank.
- Docs: add Raspberry Pi install guide. (#1871) Thanks @0xJonHoldsCrypto.
- Docs: add GCP Compute Engine deployment guide. (#1848) Thanks @hougangdev.
- Docs: add LINE channel guide. Thanks @thewilloftheshadow.
- Docs: credit both contributors for Control UI refresh. (#1852) Thanks @EnzeD.
- Onboarding: add Venice API key to non-interactive flow. (#1893) Thanks @jonisjongithub.
- Onboarding: strengthen security warning copy for beta + access control expectations.
- Tlon: format thread reply IDs as @ud. (#1837) Thanks @wca4a.
- Gateway: prefer newest session metadata when combining stores. (#1823) Thanks @emanuelst.
- Web UI: keep sub-agent announce replies visible in WebChat. (#1977) Thanks @andrescardonas7.
- CI: increase Node heap size for macOS checks. (#1890) Thanks @realZachi.
- macOS: avoid crash when rendering code blocks by bumping Textual to 0.3.1. (#2033) Thanks @garricn.
- Browser: fall back to URL matching for extension relay target resolution. (#1999) Thanks @jonit-dev.
- Browser: route browser control via gateway/node; remove standalone browser control command and control URL config.
- Browser: route `browser.request` via node proxies when available; honor proxy timeouts; derive browser ports from `gateway.port`.
- Update: ignore dist/control-ui for dirty checks and restore after ui builds. (#1976) Thanks @Glucksberg.
- Build: bundle A2UI assets during build and stop tracking generated bundles. (#2455) Thanks @0oAstro.
- Telegram: allow caption param for media sends. (#1888) Thanks @mguellsegarra.
- Telegram: support plugin sendPayload channelData (media/buttons) and validate plugin commands. (#1917) Thanks @JoshuaLelon.
- Telegram: avoid block replies when streaming is disabled. (#1885) Thanks @ivancasco.
- Docs: keep docs header sticky so navbar stays visible while scrolling. (#2445) Thanks @chenyuan99.
<<<<<<< HEAD
- Docs: update exe.dev install instructions. (#https://github.com/moltbot/moltbot/pull/3047) Thanks @zackerthescar.
- Security: use Windows ACLs for permission audits and fixes on Windows. (#1957)
- Auth: show copyable Google auth URL after ASCII prompt. (#1787) Thanks @robbyczgw-cla.
- Routing: precompile session key regexes. (#1697) Thanks @Ray0907.
- TUI: avoid width overflow when rendering selection lists. (#1686) Thanks @mossein.
- Telegram: keep topic IDs in restart sentinel notifications. (#1807) Thanks @hsrvc.
- Telegram: add optional silent send flag (disable notifications). (#2382) Thanks @Suksham-sharma.
- Telegram: support editing sent messages via message(action="edit"). (#2394) Thanks @marcelomar21.
- Telegram: support quote replies for message tool and inbound context. (#2900) Thanks @aduk059.
- Telegram: add sticker receive/send with vision caching. (#2629) Thanks @longjos.
- Telegram: send sticker pixels to vision models. (#2650)
- Config: apply config.env before ${VAR} substitution. (#1813) Thanks @spanishflu-est1918.
- Slack: clear ack reaction after streamed replies. (#2044) Thanks @fancyboi999.
- macOS: keep custom SSH usernames in remote target. (#2046) Thanks @algal.
- CLI: use Node's module compile cache for faster startup. (#2808) Thanks @pi0.
- Routing: add per-account DM session scope and document multi-account isolation. (#3095) Thanks @jarvis-sam.

=======
- Docs: update exe.dev install instructions. (#https://github.com/openclaw/openclaw/pull/3047) Thanks @zackerthescar.
- Build: skip redundant UI install step in the Dockerfile. (#4584) Thanks @obviyus.
>>>>>>> fa9ec6e85 (fix: add docker ui install changelog entry (#4584) (thanks @obviyus))
### Breaking
- **BREAKING:** Gateway auth mode "none" is removed; gateway now requires token/password (Tailscale Serve identity still allowed).

### Fixes
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
=======
=======
- Infra: resolve Control UI assets for npm global installs. (#4909) Thanks @YuriNachos.
>>>>>>> 34bdbdb40 (fix: resolve Control UI assets for global installs (#4909) (thanks @YuriNachos))
- Gateway: prevent blank token prompts from storing "undefined". (#4873) Thanks @Hisleren.
>>>>>>> 39eb0b7bc (fix: prevent undefined gateway token defaults (#4873) (thanks @Hisleren))
- Telegram: use undici fetch for per-account proxy dispatcher. (#4456) Thanks @spiceoogway.
<<<<<<< HEAD
>>>>>>> 3a85cb183 (fix: honor Telegram proxy dispatcher (#4456) (thanks @spiceoogway))
=======
- Telegram: fix HTML nesting for overlapping styles and links. (#4578) Thanks @ThanhNguyxn.
<<<<<<< HEAD
>>>>>>> da71eaebd (fix: correct telegram html nesting (#4578) (thanks @ThanhNguyxn))
=======
- Telegram: resolve per-account bot token configs with normalized account IDs. (#5055) Thanks @jasonsschin.
>>>>>>> e849df64d (fix: normalize telegram account token lookup (#5055) (thanks @jasonsschin))
- Telegram: avoid silent empty replies by tracking normalization skips before fallback. (#3796)
- Telegram: accept numeric messageId/chatId in react action and honor channelId fallback. (#4533) Thanks @Ayush10.
- Telegram: scope native skill commands to bound agent per bot. (#4360) Thanks @robhparker.
- Telegram: fall back to session origin thread id for delivery context when missing. (#4911) Thanks @yevhen.
- Mentions: honor mentionPatterns even when explicit mentions are present. (#3303) Thanks @HirokiKobayashi-R.
>>>>>>> 718bc3f9c (fix: avoid silent telegram empty replies (#3796) (#3796))
- Discord: restore username directory lookup in target resolution. (#3131) Thanks @bonald.
- Agents: align MiniMax base URL test expectation with default provider config. (#3131) Thanks @bonald.
- Agents: respect configured context window cap for compaction safeguard. (#6187) Thanks @iamEvanYT.
- Agents: prevent retries on oversized image errors and surface size limits. (#2871) Thanks @Suksham-sharma.
- Agents: inherit provider baseUrl/api for inline models. (#2740) Thanks @lploc94.
- Memory Search: keep auto provider model defaults and only include remote when configured. (#2576) Thanks @papago2355.
- Telegram: include AccountId in native command context for multi-agent routing. (#2942) Thanks @Chloe-VP.
- Telegram: handle video note attachments in media extraction. (#2905) Thanks @mylukin.
- TTS: read OPENAI_TTS_BASE_URL at runtime instead of module load to honor config.env. (#3341) Thanks @hclsys.
- macOS: auto-scroll to bottom when sending a new message while scrolled up. (#2471) Thanks @kennyklee.
- Web UI: auto-expand the chat compose textarea while typing (with sensible max height). (#2950) Thanks @shivamraut101.
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
- Telegram: preserve reasoning tags inside code blocks. (#3952) Thanks @vinaygit18.
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
>>>>>>> 4583f8862 (fix: preserve reasoning tags inside code blocks (#4118) (thanks @vinaygit18))

## 2026.1.24-3

### Fixes
- Slack: fix image downloads failing due to missing Authorization header on cross-origin redirects. (#1936) Thanks @sanderhelgesen.
- Gateway: harden reverse proxy handling for local-client detection and unauthenticated proxied connects. (#1795) Thanks @orlyjamie.
- Security audit: flag loopback Control UI with auth disabled as critical. (#1795) Thanks @orlyjamie.
- CLI: resume claude-cli sessions and stream CLI replies to TUI clients. (#1921) Thanks @rmorse.

## 2026.1.24-2

### Fixes
- Packaging: include dist/link-understanding output in npm tarball (fixes missing apply.js import on install).

## 2026.1.24-1

### Fixes
- Packaging: include dist/shared output in npm tarball (fixes missing reasoning-tags import on install).

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
- Plugins: add provider auth registry + `moltbot models auth login` for plugin-driven OAuth/API key flows.
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
- Dependency refreshes (pi-* stack, Slack SDK, discord-api-types, file-type, zod, Biome, Vite).
- Refactors: centralized group allowlist/mention policy; lint/import cleanup; switch tsx → bun for TS execution.

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
- CLI: run `moltbot agent` via the Gateway by default; use `--local` to force embedded mode.
