import {
  Button,
  Label,
  Modal,
  Row,
  Separator,
  TextDisplay,
  TextInput,
  parseCustomId,
  serializePayload,
  type ButtonInteraction,
  type ComponentData,
  type ComponentParserResult,
  type MessagePayloadObject,
  type ModalInteraction,
  type TopLevelComponents,
} from "@buape/carbon";
import { ButtonStyle, Routes, TextInputStyle } from "discord-api-types/v10";
import type { OpenClawConfig } from "../../../src/config/config.js";
import { loadSessionStore, resolveStorePath } from "../../../src/config/sessions.js";
import { createDiscordClient, stripUndefinedFields } from "../../../src/discord/send.shared.js";
import { DiscordUiContainer } from "../../../src/discord/ui.js";
import {
  buildGatewayConnectionDetails,
  resolveGatewayCredentialsWithSecretInputs,
} from "../../../src/gateway/call.js";
import { GatewayClient } from "../../../src/gateway/client.js";
import type { EventFrame } from "../../../src/gateway/protocol/index.js";
import { logDebug, logError } from "../../../src/logger.js";
import {
  normalizeAccountId,
  resolveAgentIdFromSessionKey,
} from "../../../src/routing/session-key.js";
import { compileSafeRegex, testRegexWithBoundedInput } from "../../../src/security/safe-regex.js";
import {
  GATEWAY_CLIENT_MODES,
  GATEWAY_CLIENT_NAMES,
  normalizeMessageChannel,
} from "../../../src/utils/message-channel.js";
import { isCronGuardApproverAuthorized, type CronGuardPluginConfig } from "./config.js";
import type { CronGuardApprovalRecord, CronGuardApprover } from "./types.js";
import { isTerminalCronGuardStatus } from "./types.js";

const CRON_GUARD_COMPONENT_KEY = "cronguard";
const CRON_GUARD_MODAL_KEY = "cronguardmodal";
const CRON_GUARD_MODAL_HANDLER_WILDCARD = "__cron_guard_modal_wildcard__";
const CRON_GUARD_MODAL_PAYLOAD_FIELD_ID = "payload";

type PendingApproval = {
  discordMessageId: string;
  discordChannelId: string;
};

type CronGuardGatewayEventPayload = {
  requestId?: unknown;
};

type CronGuardGatewayEventName =
  | "cron.guard.requested"
  | "cron.guard.modified"
  | "cron.guard.resolved"
  | "cron.guard.applied"
  | "cron.guard.expired";

type CronGuardMessageKey = `${string}:channel` | `${string}:dm:${string}`;

export type CronGuardButtonAction = "approve" | "modify" | "deny";

type CronGuardApprovalHandlerOpts = {
  token: string;
  accountId: string;
  config: CronGuardPluginConfig;
  gatewayUrl?: string;
  cfg: OpenClawConfig;
};

type BuildApproverResult = { ok: true; approver: CronGuardApprover } | { ok: false };

function encodeCustomIdValue(value: string): string {
  return encodeURIComponent(value);
}

function decodeCustomIdValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function coerceComponentValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function stringifyJsonForDiscord(value: unknown, maxChars = 1200): string {
  const text = JSON.stringify(value, null, 2) ?? "{}";
  const clipped = text.length > maxChars ? `${text.slice(0, maxChars)}\n... (truncated)` : text;
  return clipped.replace(/`/g, "\u200b`");
}

function extractDiscordChannelId(sessionKey?: string | null): string | null {
  if (!sessionKey) {
    return null;
  }
  const match = sessionKey.match(/discord:(?:channel|group):(\d+)/);
  return match ? match[1] : null;
}

function resolveCronGuardDiscordAccountId(params: {
  cfg: OpenClawConfig;
  request: CronGuardApprovalRecord;
}): string | null {
  const sessionKey = params.request.requester.sessionKey?.trim();
  if (!sessionKey) {
    return null;
  }
  try {
    const agentId = resolveAgentIdFromSessionKey(sessionKey);
    const storePath = resolveStorePath(params.cfg.session?.store, { agentId });
    const store = loadSessionStore(storePath);
    const entry = store[sessionKey];
    const channel = normalizeMessageChannel(entry?.origin?.provider ?? entry?.lastChannel);
    if (channel && channel !== "discord") {
      return null;
    }
    const accountId = entry?.origin?.accountId ?? entry?.lastAccountId;
    return accountId?.trim() || null;
  } catch {
    return null;
  }
}

function resolveCronGuardApproverDiscordIds(approvers: string[]): string[] {
  const seen = new Set<string>();
  for (const entry of approvers) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const match = /^discord:(\d+)$/.exec(trimmed) ?? /^(\d+)$/.exec(trimmed);
    const userId = match?.[1];
    if (!userId || seen.has(userId)) {
      continue;
    }
    seen.add(userId);
  }
  return [...seen];
}

function buildCronGuardActionLabel(record: CronGuardApprovalRecord): string {
  if (record.action === "add") {
    return "Add cron job";
  }
  if (record.action === "update") {
    return `Update cron job ${record.targetJobId ?? "<unknown>"}`;
  }
  return `Remove cron job ${record.targetJobId ?? "<unknown>"}`;
}

function buildCronGuardRequesterLines(record: CronGuardApprovalRecord): string[] {
  const lines: string[] = [];
  if (record.requester.agentId) {
    lines.push(`- Agent: ${record.requester.agentId}`);
  }
  if (record.requester.sessionKey) {
    lines.push(`- Session: ${record.requester.sessionKey}`);
  }
  if (record.requester.messageChannel) {
    lines.push(`- Channel: ${record.requester.messageChannel}`);
  }
  if (record.diffSummary?.changedFields?.length) {
    lines.push(`- Changed fields: ${record.diffSummary.changedFields.join(", ")}`);
  }
  if (record.approver?.principal) {
    lines.push(`- Approver: ${record.approver.principal}`);
  }
  if (record.applyResult?.error) {
    lines.push(`- Apply error: ${record.applyResult.error}`);
  }
  return lines;
}

type CronGuardContainerParams = {
  cfg: OpenClawConfig;
  accountId: string;
  title: string;
  description?: string;
  record: CronGuardApprovalRecord;
  actionRow?: Row<Button>;
  footer?: string;
  accentColor?: string;
};

class CronGuardApprovalContainer extends DiscordUiContainer {
  constructor(params: CronGuardContainerParams) {
    const components: Array<TextDisplay | Separator | Row<Button>> = [
      new TextDisplay(`## ${params.title}`),
      new TextDisplay(`### Request\n${buildCronGuardActionLabel(params.record)}`),
    ];
    if (params.description) {
      components.push(new TextDisplay(params.description));
    }
    components.push(new Separator({ divider: true, spacing: "small" }));
    components.push(
      new TextDisplay(
        `### Proposed Payload\n\`\`\`json\n${stringifyJsonForDiscord(params.record.currentPayload, 2000)}\n\`\`\``,
      ),
    );
    const metadataLines = buildCronGuardRequesterLines(params.record);
    if (metadataLines.length > 0) {
      components.push(new TextDisplay(metadataLines.join("\n")));
    }
    if (params.actionRow) {
      components.push(params.actionRow);
    }
    if (params.footer) {
      components.push(new Separator({ divider: false, spacing: "small" }));
      components.push(new TextDisplay(`-# ${params.footer}`));
    }
    super({
      cfg: params.cfg,
      accountId: params.accountId,
      components,
      accentColor: params.accentColor,
    });
  }
}

function buildCronGuardMessagePayload(container: DiscordUiContainer): MessagePayloadObject {
  const components: TopLevelComponents[] = [container];
  return { components };
}

function createPendingContainer(params: {
  request: CronGuardApprovalRecord;
  cfg: OpenClawConfig;
  accountId: string;
  actionRow?: Row<Button>;
}): CronGuardApprovalContainer {
  const expiresAtSeconds = Math.max(0, Math.floor(params.request.expiresAtMs / 1000));
  return new CronGuardApprovalContainer({
    cfg: params.cfg,
    accountId: params.accountId,
    title: "Cron Approval Required",
    description:
      params.request.status === "modified"
        ? "A cron change request was modified and needs review."
        : "A cron change request needs your approval.",
    record: params.request,
    actionRow: params.actionRow,
    footer: `Expires <t:${expiresAtSeconds}:R> · ID: ${params.request.requestId}`,
    accentColor: "#F59E0B",
  });
}

function createApplyingContainer(params: {
  request: CronGuardApprovalRecord;
  cfg: OpenClawConfig;
  accountId: string;
}): CronGuardApprovalContainer {
  return new CronGuardApprovalContainer({
    cfg: params.cfg,
    accountId: params.accountId,
    title: "Cron Approval: Applying",
    description: "Approval recorded. Applying the cron mutation now.",
    record: params.request,
    footer: `ID: ${params.request.requestId}`,
    accentColor: "#3B82F6",
  });
}

function createResolvedContainer(params: {
  request: CronGuardApprovalRecord;
  cfg: OpenClawConfig;
  accountId: string;
}): CronGuardApprovalContainer {
  const { request } = params;
  let title = "Cron Approval";
  let description = "Request resolved.";
  let accentColor = "#6B7280";
  if (request.status === "denied") {
    title = "Cron Approval: Denied";
    description = request.approver?.principal
      ? `Denied by ${request.approver.principal}.`
      : "Request denied.";
    accentColor = "#EF4444";
  } else if (request.status === "applied") {
    title = "Cron Approval: Applied";
    description = "The approved cron change was applied.";
    accentColor = "#22C55E";
  } else if (request.status === "failed") {
    title = "Cron Approval: Apply Failed";
    description = request.applyResult?.error
      ? `The approval succeeded, but apply failed: ${request.applyResult.error}`
      : "The approval succeeded, but apply failed.";
    accentColor = "#EF4444";
  } else if (request.status === "expired") {
    title = "Cron Approval: Expired";
    description = "This request expired before it was resolved.";
  }
  return new CronGuardApprovalContainer({
    cfg: params.cfg,
    accountId: params.accountId,
    title,
    description,
    record: request,
    footer: `ID: ${request.requestId}`,
    accentColor,
  });
}

class CronGuardApprovalActionButton extends Button {
  customId: string;
  label: string;
  style: ButtonStyle;

  constructor(params: {
    requestId: string;
    action: CronGuardButtonAction;
    label: string;
    style: ButtonStyle;
  }) {
    super();
    this.customId = buildCronGuardButtonCustomId(params.requestId, params.action);
    this.label = params.label;
    this.style = params.style;
  }
}

class CronGuardApprovalActionRow extends Row<Button> {
  constructor(requestId: string) {
    super([
      new CronGuardApprovalActionButton({
        requestId,
        action: "approve",
        label: "Approve",
        style: ButtonStyle.Success,
      }),
      new CronGuardApprovalActionButton({
        requestId,
        action: "modify",
        label: "Modify",
        style: ButtonStyle.Primary,
      }),
      new CronGuardApprovalActionButton({
        requestId,
        action: "deny",
        label: "Deny",
        style: ButtonStyle.Danger,
      }),
    ]);
  }
}

class CronGuardModifyPayloadInput extends TextInput {
  customId = CRON_GUARD_MODAL_PAYLOAD_FIELD_ID;
  style = TextInputStyle.Paragraph;
  required = true;
  minLength = 2;
  maxLength = 4000;
  value?: string;

  constructor(value: string) {
    super();
    this.value = value;
  }
}

class CronGuardModifyModalLabel extends Label {
  label = "Edited JSON payload";
  description = "Submit a valid JSON object. The payload will be revalidated before apply.";
  component: TextInput;
  customId = CRON_GUARD_MODAL_PAYLOAD_FIELD_ID;

  constructor(value: string) {
    const component = new CronGuardModifyPayloadInput(value);
    super(component);
    this.component = component;
  }
}

class CronGuardModifyPromptModal extends Modal {
  title: string;
  customId: string;
  components: [Label];

  constructor(params: { request: CronGuardApprovalRecord }) {
    super();
    this.title = `Modify cron ${params.request.action}`;
    this.customId = buildCronGuardModalCustomId(params.request.requestId);
    this.components = [
      new CronGuardModifyModalLabel(JSON.stringify(params.request.currentPayload, null, 2)),
    ];
  }

  async run(): Promise<void> {
    throw new Error("Cron Guard prompt modal is not registered as a submission handler.");
  }
}

export function buildCronGuardButtonCustomId(
  requestId: string,
  action: CronGuardButtonAction,
): string {
  return `${CRON_GUARD_COMPONENT_KEY}:id=${encodeCustomIdValue(requestId)};action=${action}`;
}

export function buildCronGuardModalCustomId(requestId: string): string {
  return `${CRON_GUARD_MODAL_KEY}:id=${encodeCustomIdValue(requestId)}`;
}

export function parseCronGuardButtonData(
  data: ComponentData,
): { requestId: string; action: CronGuardButtonAction } | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const requestId = coerceComponentValue((data as { id?: unknown }).id);
  const action = coerceComponentValue(
    (data as { action?: unknown }).action,
  ) as CronGuardButtonAction;
  if (!requestId || (action !== "approve" && action !== "modify" && action !== "deny")) {
    return null;
  }
  return {
    requestId: decodeCustomIdValue(requestId),
    action,
  };
}

export function parseCronGuardModalData(data: ComponentData): { requestId: string } | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const requestId = coerceComponentValue((data as { id?: unknown }).id);
  if (!requestId) {
    return null;
  }
  return {
    requestId: decodeCustomIdValue(requestId),
  };
}

function parseCronGuardModalCustomIdForCarbon(id: string): ComponentParserResult {
  if (id === "*" || id === CRON_GUARD_MODAL_HANDLER_WILDCARD) {
    return { key: "*", data: {} };
  }
  const parsed = parseCustomId(id);
  if (parsed.key !== CRON_GUARD_MODAL_KEY) {
    return parsed;
  }
  return { key: "*", data: parsed.data };
}

export class DiscordCronGuardApprovalHandler {
  private gatewayClient: GatewayClient | null = null;
  private pending = new Map<CronGuardMessageKey, PendingApproval>();
  private requestTimeouts = new Map<string, NodeJS.Timeout>();
  private requestCache = new Map<string, CronGuardApprovalRecord>();
  private started = false;

  constructor(private readonly opts: CronGuardApprovalHandlerOpts) {}

  shouldHandle(request: CronGuardApprovalRecord): boolean {
    if (!this.opts.config.enabled || !this.opts.config.discord.enabled) {
      return false;
    }
    if (this.opts.config.approvers.length === 0) {
      return false;
    }

    const requestAccountId = resolveCronGuardDiscordAccountId({
      cfg: this.opts.cfg,
      request,
    });
    if (requestAccountId) {
      const handlerAccountId = normalizeAccountId(this.opts.accountId);
      if (normalizeAccountId(requestAccountId) !== handlerAccountId) {
        return false;
      }
    }

    if (this.opts.config.discord.agentFilter.length > 0) {
      const agentId = request.requester.agentId;
      if (!agentId || !this.opts.config.discord.agentFilter.includes(agentId)) {
        return false;
      }
    }

    if (this.opts.config.discord.sessionFilter.length > 0) {
      const sessionKey = request.requester.sessionKey;
      if (!sessionKey) {
        return false;
      }
      const matches = this.opts.config.discord.sessionFilter.some((pattern) => {
        if (sessionKey.includes(pattern)) {
          return true;
        }
        const regex = compileSafeRegex(pattern);
        return regex ? testRegexWithBoundedInput(regex, sessionKey) : false;
      });
      if (!matches) {
        return false;
      }
    }

    return true;
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;

    if (!this.opts.config.enabled || !this.opts.config.discord.enabled) {
      logDebug("discord cron approvals: disabled");
      return;
    }
    if (this.opts.config.approvers.length === 0) {
      logDebug("discord cron approvals: no approvers configured");
      return;
    }

    const { url: gatewayUrl } = buildGatewayConnectionDetails({
      config: this.opts.cfg,
      url: this.opts.gatewayUrl,
    });
    const gatewayAuth = await resolveGatewayCredentialsWithSecretInputs({
      config: this.opts.cfg,
      urlOverride: this.opts.gatewayUrl,
      env: process.env,
    });

    this.gatewayClient = new GatewayClient({
      url: gatewayUrl,
      token: gatewayAuth.token,
      password: gatewayAuth.password,
      clientName: GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT,
      clientDisplayName: "Discord Cron Approvals",
      mode: GATEWAY_CLIENT_MODES.BACKEND,
      scopes: ["operator.read", "operator.approvals"],
      onEvent: (evt) => this.handleGatewayEvent(evt),
      onHelloOk: () => {
        logDebug("discord cron approvals: connected to gateway");
      },
      onConnectError: (err) => {
        logError(`discord cron approvals: connect error: ${err.message}`);
      },
      onClose: (code, reason) => {
        logDebug(`discord cron approvals: gateway closed: ${code} ${reason}`);
      },
    });

    this.gatewayClient.start();
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }
    this.started = false;

    for (const timeoutId of this.requestTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    this.pending.clear();
    this.requestTimeouts.clear();
    this.requestCache.clear();

    this.gatewayClient?.stop();
    this.gatewayClient = null;
  }

  async getRequest(requestId: string): Promise<CronGuardApprovalRecord | null> {
    const cached = this.requestCache.get(requestId);
    if (cached) {
      return cached;
    }
    return await this.fetchRequest(requestId);
  }

  buildApprover(userId: string): BuildApproverResult {
    const auth = isCronGuardApproverAuthorized({
      config: this.opts.config,
      channel: "discord",
      senderId: userId,
      from: `discord:${userId}`,
    });
    if (!auth.ok) {
      return { ok: false };
    }
    return {
      ok: true,
      approver: {
        id: userId,
        principal: auth.principal,
        channel: "discord",
        from: `discord:${userId}`,
      },
    };
  }

  createModifyModal(request: CronGuardApprovalRecord): Modal {
    return new CronGuardModifyPromptModal({ request });
  }

  async resolveRequest(
    requestId: string,
    disposition: "approve" | "deny",
    approver: CronGuardApprover,
  ): Promise<boolean> {
    if (!this.gatewayClient) {
      logError("discord cron approvals: gateway client not connected");
      return false;
    }
    try {
      const request = await this.gatewayClient.request<CronGuardApprovalRecord>(
        "cron.guard.resolve",
        {
          requestId,
          disposition,
          approver,
        },
      );
      if (request?.requestId) {
        this.requestCache.set(request.requestId, request);
      }
      return true;
    } catch (err) {
      logError(`discord cron approvals: resolve failed: ${String(err)}`);
      return false;
    }
  }

  async modifyRequest(
    requestId: string,
    payload: Record<string, unknown>,
    approver: CronGuardApprover,
  ): Promise<boolean> {
    if (!this.gatewayClient) {
      logError("discord cron approvals: gateway client not connected");
      return false;
    }
    try {
      const request = await this.gatewayClient.request<CronGuardApprovalRecord>(
        "cron.guard.modify",
        {
          requestId,
          payload,
          approver,
        },
      );
      if (request?.requestId) {
        this.requestCache.set(request.requestId, request);
      }
      return true;
    } catch (err) {
      logError(`discord cron approvals: modify failed: ${String(err)}`);
      return false;
    }
  }

  private async fetchRequest(requestId: string): Promise<CronGuardApprovalRecord | null> {
    if (!this.gatewayClient) {
      return null;
    }
    try {
      const request = await this.gatewayClient.request<CronGuardApprovalRecord>(
        "cron.guard.requests.get",
        {
          requestId,
        },
      );
      if (request?.requestId) {
        this.requestCache.set(request.requestId, request);
        return request;
      }
    } catch (err) {
      logError(`discord cron approvals: failed to fetch request ${requestId}: ${String(err)}`);
    }
    return null;
  }

  private handleGatewayEvent(evt: EventFrame): void {
    const event = evt.event as CronGuardGatewayEventName;
    if (
      event !== "cron.guard.requested" &&
      event !== "cron.guard.modified" &&
      event !== "cron.guard.resolved" &&
      event !== "cron.guard.applied" &&
      event !== "cron.guard.expired"
    ) {
      return;
    }
    const payload = (evt.payload ?? {}) as CronGuardGatewayEventPayload;
    const requestId = typeof payload.requestId === "string" ? payload.requestId : "";
    if (!requestId) {
      return;
    }
    void this.syncRequestFromEvent(requestId, event);
  }

  private async syncRequestFromEvent(
    requestId: string,
    event: CronGuardGatewayEventName,
  ): Promise<void> {
    const request = await this.fetchRequest(requestId);
    if (!request || !this.shouldHandle(request)) {
      return;
    }

    if (event === "cron.guard.requested") {
      await this.ensureApprovalDelivery(request);
      return;
    }
    if (event === "cron.guard.modified") {
      await this.updatePendingMessages(request);
      return;
    }
    if (event === "cron.guard.resolved" && request.status === "approved") {
      await this.updateApplyingMessages(request);
      return;
    }
    if (
      event === "cron.guard.resolved" ||
      event === "cron.guard.applied" ||
      event === "cron.guard.expired"
    ) {
      await this.finalizeMessages(request);
    }
  }

  private async ensureApprovalDelivery(request: CronGuardApprovalRecord): Promise<void> {
    if (this.findPendingEntries(request.requestId).length > 0) {
      await this.updatePendingMessages(request);
      return;
    }

    const { rest, request: discordRequest } = createDiscordClient(
      { token: this.opts.token, accountId: this.opts.accountId },
      this.opts.cfg,
    );
    const payload = buildCronGuardMessagePayload(
      createPendingContainer({
        request,
        cfg: this.opts.cfg,
        accountId: this.opts.accountId,
        actionRow: new CronGuardApprovalActionRow(request.requestId),
      }),
    );
    const body = stripUndefinedFields(serializePayload(payload));
    const sendToChannel =
      this.opts.config.discord.target === "channel" || this.opts.config.discord.target === "both";
    const sendToDm =
      this.opts.config.discord.target === "dm" || this.opts.config.discord.target === "both";
    let fallbackToDm = false;

    if (sendToChannel) {
      const channelId = extractDiscordChannelId(request.requester.sessionKey);
      if (channelId) {
        try {
          const message = (await discordRequest(
            () =>
              rest.post(Routes.channelMessages(channelId), {
                body,
              }) as Promise<{ id: string; channel_id: string }>,
            "send-cron-approval-channel",
          )) as { id: string; channel_id: string };
          if (message?.id) {
            this.ensureRequestTimeout(request);
            this.setPendingEntry(`${request.requestId}:channel`, {
              discordChannelId: channelId,
              discordMessageId: message.id,
            });
          }
        } catch (err) {
          logError(`discord cron approvals: failed to send to channel: ${String(err)}`);
          fallbackToDm = true;
        }
      } else {
        fallbackToDm = true;
      }
    }

    if (sendToDm || fallbackToDm) {
      const approverIds = resolveCronGuardApproverDiscordIds(this.opts.config.approvers);
      for (const userId of approverIds) {
        try {
          const dmChannel = (await discordRequest(
            () =>
              rest.post(Routes.userChannels(), {
                body: { recipient_id: userId },
              }) as Promise<{ id: string }>,
            "cron-approval-dm-channel",
          )) as { id: string };
          if (!dmChannel?.id) {
            continue;
          }
          const message = (await discordRequest(
            () =>
              rest.post(Routes.channelMessages(dmChannel.id), {
                body,
              }) as Promise<{ id: string; channel_id: string }>,
            "send-cron-approval-dm",
          )) as { id: string; channel_id: string };
          if (!message?.id) {
            continue;
          }
          this.ensureRequestTimeout(request);
          this.setPendingEntry(`${request.requestId}:dm:${userId}`, {
            discordChannelId: dmChannel.id,
            discordMessageId: message.id,
          });
        } catch (err) {
          logError(`discord cron approvals: failed to notify user ${userId}: ${String(err)}`);
        }
      }
    }
  }

  private async updatePendingMessages(request: CronGuardApprovalRecord): Promise<void> {
    await this.updateMessages(
      request.requestId,
      createPendingContainer({
        request,
        cfg: this.opts.cfg,
        accountId: this.opts.accountId,
        actionRow: new CronGuardApprovalActionRow(request.requestId),
      }),
    );
  }

  private async updateApplyingMessages(request: CronGuardApprovalRecord): Promise<void> {
    await this.updateMessages(
      request.requestId,
      createApplyingContainer({
        request,
        cfg: this.opts.cfg,
        accountId: this.opts.accountId,
      }),
    );
  }

  private async finalizeMessages(request: CronGuardApprovalRecord): Promise<void> {
    const terminal = isTerminalCronGuardStatus(request.status);
    const container = createResolvedContainer({
      request,
      cfg: this.opts.cfg,
      accountId: this.opts.accountId,
    });
    const entries = this.findPendingEntries(request.requestId);
    for (const [key, pending] of entries) {
      if (terminal) {
        this.pending.delete(key);
      }
      await this.finalizeMessage(
        pending.discordChannelId,
        pending.discordMessageId,
        container,
        terminal,
      );
    }
    if (terminal) {
      this.clearRequestTimeout(request.requestId);
      this.requestCache.delete(request.requestId);
    }
  }

  private async updateMessages(requestId: string, container: DiscordUiContainer): Promise<void> {
    for (const [, pending] of this.findPendingEntries(requestId)) {
      await this.updateMessage(pending.discordChannelId, pending.discordMessageId, container);
    }
  }

  private async finalizeMessage(
    channelId: string,
    messageId: string,
    container: DiscordUiContainer,
    terminal: boolean,
  ): Promise<void> {
    if (!terminal || !this.opts.config.discord.cleanupAfterResolve) {
      await this.updateMessage(channelId, messageId, container);
      return;
    }
    try {
      const { rest, request: discordRequest } = createDiscordClient(
        { token: this.opts.token, accountId: this.opts.accountId },
        this.opts.cfg,
      );
      await discordRequest(
        () => rest.delete(Routes.channelMessage(channelId, messageId)) as Promise<void>,
        "delete-cron-approval",
      );
    } catch (err) {
      logError(`discord cron approvals: failed to delete message: ${String(err)}`);
      await this.updateMessage(channelId, messageId, container);
    }
  }

  private async updateMessage(
    channelId: string,
    messageId: string,
    container: DiscordUiContainer,
  ): Promise<void> {
    try {
      const { rest, request: discordRequest } = createDiscordClient(
        { token: this.opts.token, accountId: this.opts.accountId },
        this.opts.cfg,
      );
      const payload = buildCronGuardMessagePayload(container);
      await discordRequest(
        () =>
          rest.patch(Routes.channelMessage(channelId, messageId), {
            body: stripUndefinedFields(serializePayload(payload)),
          }),
        "update-cron-approval",
      );
    } catch (err) {
      logError(`discord cron approvals: failed to update message: ${String(err)}`);
    }
  }

  private createTimeout(request: CronGuardApprovalRecord): NodeJS.Timeout {
    const timeoutMs = Math.max(0, request.expiresAtMs - Date.now());
    const timeoutId = setTimeout(() => {
      void this.handleApprovalTimeout(request.requestId);
    }, timeoutMs);
    timeoutId.unref?.();
    return timeoutId;
  }

  private ensureRequestTimeout(request: CronGuardApprovalRecord): void {
    if (this.requestTimeouts.has(request.requestId)) {
      return;
    }
    this.requestTimeouts.set(request.requestId, this.createTimeout(request));
  }

  private clearRequestTimeout(requestId: string): void {
    const timeoutId = this.requestTimeouts.get(requestId);
    if (!timeoutId) {
      return;
    }
    clearTimeout(timeoutId);
    this.requestTimeouts.delete(requestId);
  }

  private async handleApprovalTimeout(requestId: string): Promise<void> {
    const request = await this.fetchRequest(requestId);
    if (!request) {
      this.clearRequestTimeout(requestId);
      return;
    }
    this.requestCache.set(requestId, request);
    const resolvedRequest = isTerminalCronGuardStatus(request.status)
      ? request
      : {
          ...request,
          status: "expired" as const,
          resolvedAtMs: request.resolvedAtMs ?? Date.now(),
        };
    const container = createResolvedContainer({
      request: resolvedRequest,
      cfg: this.opts.cfg,
      accountId: this.opts.accountId,
    });
    for (const [key, pending] of this.findPendingEntries(requestId)) {
      this.pending.delete(key);
      await this.updateMessage(pending.discordChannelId, pending.discordMessageId, container);
    }
    this.clearRequestTimeout(requestId);
    if (isTerminalCronGuardStatus(resolvedRequest.status)) {
      this.requestCache.delete(requestId);
    }
  }

  private setPendingEntry(key: CronGuardMessageKey, pending: PendingApproval): void {
    this.pending.set(key, pending);
  }

  private findPendingEntries(requestId: string): Array<[CronGuardMessageKey, PendingApproval]> {
    return [...this.pending.entries()].filter(
      ([key]) => key === `${requestId}:channel` || key.startsWith(`${requestId}:dm:`),
    ) as Array<[CronGuardMessageKey, PendingApproval]>;
  }
}

export type CronGuardApprovalButtonContext = {
  handler: DiscordCronGuardApprovalHandler;
};

export class CronGuardApprovalButton extends Button {
  label = "cronguard";
  customId = `${CRON_GUARD_COMPONENT_KEY}:seed=1`;
  style = ButtonStyle.Primary;

  constructor(private readonly ctx: CronGuardApprovalButtonContext) {
    super();
  }

  async run(interaction: ButtonInteraction, data: ComponentData): Promise<void> {
    const parsed = parseCronGuardButtonData(data);
    if (!parsed) {
      await interaction
        .reply({
          content: "This cron approval is no longer valid.",
          ephemeral: true,
        })
        .catch(() => undefined);
      return;
    }

    const userId = interaction.userId;
    if (!userId) {
      await interaction
        .reply({
          content: "Unable to identify user for this interaction.",
          ephemeral: true,
        })
        .catch(() => undefined);
      return;
    }

    const auth = this.ctx.handler.buildApprover(userId);
    if (!auth.ok) {
      await interaction
        .reply({
          content: "⛔ You are not authorized to approve cron requests.",
          ephemeral: true,
        })
        .catch(() => undefined);
      return;
    }

    if (parsed.action === "modify") {
      const request = await this.ctx.handler.getRequest(parsed.requestId);
      if (!request) {
        await interaction
          .reply({
            content: "This cron approval is no longer available.",
            ephemeral: true,
          })
          .catch(() => undefined);
        return;
      }
      await interaction.showModal(this.ctx.handler.createModifyModal(request)).catch(async () => {
        await interaction
          .reply({
            content: "Failed to open the cron modify dialog.",
            ephemeral: true,
          })
          .catch(() => undefined);
      });
      return;
    }

    const actionLabel = parsed.action === "approve" ? "approval" : "denial";
    await interaction
      .reply({
        content: `Submitting ${actionLabel} for ${parsed.requestId}...`,
        ephemeral: true,
      })
      .catch(() => undefined);

    const ok = await this.ctx.handler.resolveRequest(
      parsed.requestId,
      parsed.action === "approve" ? "approve" : "deny",
      auth.approver,
    );
    if (!ok) {
      await interaction
        .followUp?.({
          content:
            "Failed to submit the cron approval action. The request may already be resolved.",
          ephemeral: true,
        })
        .catch(() => undefined);
    }
  }
}

export class CronGuardApprovalModal extends Modal {
  title = "Cron Guard Modify";
  customId = CRON_GUARD_MODAL_HANDLER_WILDCARD;
  components: Label[] = [];
  customIdParser = parseCronGuardModalCustomIdForCarbon;

  constructor(private readonly ctx: { handler: DiscordCronGuardApprovalHandler }) {
    super();
  }

  async run(interaction: ModalInteraction, data: ComponentData): Promise<void> {
    const parsed = parseCronGuardModalData(data);
    if (!parsed) {
      await interaction
        .reply({
          content: "This cron modify form is no longer valid.",
          ephemeral: true,
        })
        .catch(() => undefined);
      return;
    }

    const userId = interaction.user?.id;
    if (!userId) {
      await interaction
        .reply({
          content: "Unable to identify user for this interaction.",
          ephemeral: true,
        })
        .catch(() => undefined);
      return;
    }

    const auth = this.ctx.handler.buildApprover(userId);
    if (!auth.ok) {
      await interaction
        .reply({
          content: "⛔ You are not authorized to modify cron requests.",
          ephemeral: true,
        })
        .catch(() => undefined);
      return;
    }

    let payload: Record<string, unknown>;
    try {
      const text = interaction.fields.getText(CRON_GUARD_MODAL_PAYLOAD_FIELD_ID, true);
      const parsedPayload = JSON.parse(text) as unknown;
      if (!parsedPayload || typeof parsedPayload !== "object" || Array.isArray(parsedPayload)) {
        throw new Error("JSON payload must be an object.");
      }
      payload = parsedPayload as Record<string, unknown>;
    } catch (err) {
      await interaction
        .reply({
          content: `Invalid JSON payload: ${String(err)}`,
          ephemeral: true,
        })
        .catch(() => undefined);
      return;
    }

    const ok = await this.ctx.handler.modifyRequest(parsed.requestId, payload, auth.approver);
    if (!ok) {
      await interaction
        .reply({
          content: "Failed to submit the modified cron request. It may already be resolved.",
          ephemeral: true,
        })
        .catch(() => undefined);
      return;
    }

    await interaction
      .reply({
        content: `Submitted updated payload for ${parsed.requestId}.`,
        ephemeral: true,
      })
      .catch(() => undefined);
  }
}

export function createCronGuardApprovalButton(
  params: ConstructorParameters<typeof CronGuardApprovalButton>[0],
): Button {
  return new CronGuardApprovalButton(params);
}

export function createCronGuardApprovalModal(
  params: ConstructorParameters<typeof CronGuardApprovalModal>[0],
): Modal {
  return new CronGuardApprovalModal(params);
}

export const __testing = {
  buildCronGuardActionLabel,
  extractDiscordChannelId,
  resolveCronGuardApproverDiscordIds,
};
