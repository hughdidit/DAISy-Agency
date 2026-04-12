import { resolveDelegateConfig, resolveAgentAuthIsolation } from "../agents/delegate-config.js";
import { resolveSandboxConfigForAgent } from "../agents/sandbox.js";
import { listChannelPlugins } from "../channels/plugins/index.js";
import type { ChannelId } from "../channels/plugins/types.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { OpenClawConfig, GatewayBindMode } from "../config/config.js";
import { loadCronStore, resolveCronStorePath } from "../cron/store.js";
import { resolveGatewayAuth } from "../gateway/auth.js";
import { isLoopbackHost, resolveGatewayBindHost } from "../gateway/net.js";
import { resolveDmAllowState } from "../security/dm-policy-shared.js";
import { note } from "../terminal/note.js";
import { resolveDefaultChannelAccountContext } from "./channel-account-context.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
    : [];
}

function hasWriteTool(entries: string[]): boolean {
  return entries.some((entry) => entry.endsWith("_write"));
}

function hasAllowedDraftOrSendAction(entries: string[]): boolean {
  return entries.includes("draft_message") || entries.includes("send_message");
}

async function collectDelegateWarnings(cfg: OpenClawConfig): Promise<string[]> {
  const warnings: string[] = [];
  const agents = cfg.agents?.list ?? [];
  const rawPluginEntry = cfg.plugins?.entries?.["gws-toolkit-phase1"];
  const rawPluginConfig = asRecord(rawPluginEntry?.config);
  const credentialRoutes = asRecord(rawPluginConfig?.credentialRoutes);
  const agentCredentialBindings = asRecord(rawPluginConfig?.agentCredentialBindings);
  const allowUnboundAgents = rawPluginConfig?.allowUnboundAgents === true;
  const cronStore = await loadCronStore(resolveCronStorePath(cfg.cron?.store));

  for (const agent of agents) {
    const delegate = resolveDelegateConfig(cfg, agent.id);
    if (!delegate) {
      continue;
    }

    const authIsolation = resolveAgentAuthIsolation(cfg, agent.id);
    if (authIsolation !== "strict") {
      warnings.push(
        `- ERROR: Delegate agent "${agent.id}" is using legacy auth isolation. Set agents.list[].delegate.authIsolation to "strict".`,
      );
    }

    const sandbox = resolveSandboxConfigForAgent(cfg, agent.id);
    if (sandbox.mode !== "all") {
      warnings.push(
        `- ERROR: Delegate agent "${agent.id}" must run with sandbox.mode="all" (current: "${sandbox.mode}").`,
      );
    }
    if (sandbox.scope !== "agent") {
      warnings.push(
        `- ERROR: Delegate agent "${agent.id}" must use sandbox.scope="agent" (current: "${sandbox.scope}").`,
      );
    }

    if (!rawPluginEntry) {
      warnings.push(
        `- ERROR: Delegate agent "${agent.id}" requires plugins.entries.gws-toolkit-phase1 with explicit credentialRoutes and agentCredentialBindings.`,
      );
      continue;
    }
    if (!credentialRoutes || Object.keys(credentialRoutes).length === 0) {
      warnings.push(
        `- ERROR: Delegate agent "${agent.id}" is using synthesized legacy GWS credential routing. Configure named credentialRoutes and explicit bindings.`,
      );
      continue;
    }
    if (allowUnboundAgents) {
      warnings.push(
        `- ERROR: Delegate agent "${agent.id}" requires allowUnboundAgents=false in gws-toolkit-phase1.`,
      );
    }

    const agentSubject = `agent:${agent.id}`;
    const subagentSubject = `subagent:${agent.id}`;
    const agentRouteName =
      typeof agentCredentialBindings?.[agentSubject] === "string"
        ? String(agentCredentialBindings[agentSubject]).trim()
        : "";
    const subagentRouteName =
      typeof agentCredentialBindings?.[subagentSubject] === "string"
        ? String(agentCredentialBindings[subagentSubject]).trim()
        : "";

    if (!agentRouteName) {
      warnings.push(
        `- ERROR: Delegate agent "${agent.id}" is missing an explicit GWS binding for ${agentSubject}.`,
      );
    }
    if (!subagentRouteName) {
      warnings.push(
        `- ERROR: Delegate agent "${agent.id}" is missing an explicit GWS binding for ${subagentSubject}.`,
      );
    }

    const routeNames = [agentRouteName, subagentRouteName].filter(Boolean);
    const boundRoutes = routeNames
      .map((routeName) => {
        const route = asRecord(credentialRoutes[routeName]);
        return route ? { routeName, route } : null;
      })
      .filter(Boolean) as Array<{ routeName: string; route: Record<string, unknown> }>;

    for (const routeName of routeNames) {
      if (!Object.hasOwn(credentialRoutes, routeName)) {
        warnings.push(
          `- ERROR: Delegate agent "${agent.id}" references unknown GWS route "${routeName}".`,
        );
      }
    }

    const enabledWriteServices = asStringArray(rawPluginConfig?.enabledWriteServices);
    const routeWriteTools = boundRoutes.flatMap(({ route }) => asStringArray(route.allowedTools));
    const routeActions = boundRoutes.flatMap(({ route }) => asStringArray(route.allowedActions));
    const agentAllowedTools = asStringArray(agent.tools?.allow);

    if (delegate.tier === "tier1") {
      const disallowedTier1WriteTools = [...routeWriteTools, ...agentAllowedTools].filter(
        (tool) => tool.endsWith("_write") && tool !== "gws_gmail_write",
      );
      if (agentAllowedTools.includes("cron")) {
        warnings.push(
          `- ERROR: Delegate agent "${agent.id}" is tier1 but still allows the cron tool.`,
        );
      }
      if (disallowedTier1WriteTools.length > 0) {
        warnings.push(
          `- ERROR: Delegate agent "${agent.id}" is tier1 but exposes write-capable tools beyond Gmail draft posture (${Array.from(new Set(disallowedTier1WriteTools)).join(", ")}).`,
        );
      }
      if (
        agentAllowedTools.includes("gws_gmail_write") &&
        (routeActions.length === 0 || routeActions.some((action) => action !== "draft_message"))
      ) {
        warnings.push(
          `- ERROR: Delegate agent "${agent.id}" is tier1 but its bound GWS route does not restrict Gmail write actions to draft_message.`,
        );
      }
    }

    if (delegate.tier === "tier2" || delegate.tier === "tier3") {
      const pluginAllowsWrites = rawPluginConfig?.allowWriteOperations === true;
      const routeAllowsWriteTool = hasWriteTool(routeWriteTools);
      const routeAllowsDraftOrSend = hasAllowedDraftOrSendAction(routeActions);
      const agentAllowsWriteTool = hasWriteTool(agentAllowedTools);
      if (
        !pluginAllowsWrites ||
        enabledWriteServices.length === 0 ||
        !routeAllowsWriteTool ||
        !agentAllowsWriteTool ||
        (!routeAllowsDraftOrSend && routeActions.length > 0)
      ) {
        warnings.push(
          `- WARNING: Delegate agent "${agent.id}" is ${delegate.tier} but its write-capable GWS/tool posture is incomplete. Confirm allowWriteOperations, enabledWriteServices, route allowedTools, and agent tools.allow.`,
        );
      }
    }

    if (delegate.tier === "tier3") {
      if (delegate.cron.allowed !== true) {
        warnings.push(
          `- ERROR: Delegate agent "${agent.id}" is tier3 but delegate.cron.allowed is not enabled.`,
        );
      }
      if (!agentAllowedTools.includes("cron")) {
        warnings.push(
          `- WARNING: Delegate agent "${agent.id}" is tier3 but does not allow the cron tool.`,
        );
      }
      if (cfg.cron?.enabled === false) {
        warnings.push(
          `- WARNING: Delegate agent "${agent.id}" is tier3 but global cron is disabled.`,
        );
      }
      const misScopedJobs = cronStore.jobs.filter(
        (job) =>
          (job.agentId?.trim() || "main") === agent.id &&
          (job.sessionTarget !== "isolated" ||
            ((job.payload as { kind?: unknown } | undefined)?.kind ?? "") !== "agentTurn"),
      );
      if (misScopedJobs.length > 0) {
        warnings.push(
          `- ERROR: Delegate agent "${agent.id}" has cron jobs that are not isolated agentTurn runs (${misScopedJobs.map((job) => job.id).join(", ")}).`,
        );
      }
    }
  }

  return warnings;
}

export async function noteSecurityWarnings(cfg: OpenClawConfig) {
  const warnings: string[] = [];
  const auditHint = `- Run: ${formatCliCommand("openclaw security audit --deep")}`;

  if (cfg.approvals?.exec?.enabled === false) {
    warnings.push(
      "- Note: approvals.exec.enabled=false disables approval forwarding only.",
      "  Host exec gating still comes from ~/.openclaw/exec-approvals.json.",
      `  Check local policy with: ${formatCliCommand("openclaw approvals get --gateway")}`,
    );
  }

  // ===========================================
  // GATEWAY NETWORK EXPOSURE CHECK
  // ===========================================
  // Check for dangerous gateway binding configurations
  // that expose the gateway to network without proper auth

  const gatewayBind = (cfg.gateway?.bind ?? "loopback") as string;
  const customBindHost = cfg.gateway?.customBindHost?.trim();
  const bindModes: GatewayBindMode[] = ["auto", "lan", "loopback", "custom", "tailnet"];
  const bindMode = bindModes.includes(gatewayBind as GatewayBindMode)
    ? (gatewayBind as GatewayBindMode)
    : undefined;
  const resolvedBindHost = bindMode
    ? await resolveGatewayBindHost(bindMode, customBindHost)
    : "0.0.0.0";
  const isExposed = !isLoopbackHost(resolvedBindHost);

  const resolvedAuth = resolveGatewayAuth({
    authConfig: cfg.gateway?.auth,
    env: process.env,
    tailscaleMode: cfg.gateway?.tailscale?.mode ?? "off",
  });
  const authToken = resolvedAuth.token?.trim() ?? "";
  const authPassword = resolvedAuth.password?.trim() ?? "";
  const hasToken = authToken.length > 0;
  const hasPassword = authPassword.length > 0;
  const hasSharedSecret =
    (resolvedAuth.mode === "token" && hasToken) ||
    (resolvedAuth.mode === "password" && hasPassword);
  const bindDescriptor = `"${gatewayBind}" (${resolvedBindHost})`;
  const saferRemoteAccessLines = [
    "  Safer remote access: keep bind loopback and use Tailscale Serve/Funnel or an SSH tunnel.",
    "  Example tunnel: ssh -N -L 18789:127.0.0.1:18789 user@gateway-host",
    "  Docs: https://docs.openclaw.ai/gateway/remote",
  ];

  if (isExposed) {
    if (!hasSharedSecret) {
      const authFixLines =
        resolvedAuth.mode === "password"
          ? [
              `  Fix: ${formatCliCommand("openclaw configure")} to set a password`,
              `  Or switch to token: ${formatCliCommand("openclaw config set gateway.auth.mode token")}`,
            ]
          : [
              `  Fix: ${formatCliCommand("openclaw doctor --fix")} to generate a token`,
              `  Or set token directly: ${formatCliCommand(
                "openclaw config set gateway.auth.mode token",
              )}`,
            ];
      warnings.push(
        `- CRITICAL: Gateway bound to ${bindDescriptor} without authentication.`,
        `  Anyone on your network (or internet if port-forwarded) can fully control your agent.`,
        `  Fix: ${formatCliCommand("openclaw config set gateway.bind loopback")}`,
        ...saferRemoteAccessLines,
        ...authFixLines,
      );
    } else {
      // Auth is configured, but still warn about network exposure
      warnings.push(
        `- WARNING: Gateway bound to ${bindDescriptor} (network-accessible).`,
        `  Ensure your auth credentials are strong and not exposed.`,
        ...saferRemoteAccessLines,
      );
    }
  }

  const warnDmPolicy = async (params: {
    label: string;
    provider: ChannelId;
    accountId: string;
    dmPolicy: string;
    allowFrom?: Array<string | number> | null;
    policyPath?: string;
    allowFromPath: string;
    approveHint: string;
    normalizeEntry?: (raw: string) => string;
  }) => {
    const dmPolicy = params.dmPolicy;
    const policyPath = params.policyPath ?? `${params.allowFromPath}policy`;
    const { hasWildcard, allowCount, isMultiUserDm } = await resolveDmAllowState({
      provider: params.provider,
      accountId: params.accountId,
      allowFrom: params.allowFrom,
      normalizeEntry: params.normalizeEntry,
    });
    const dmScope = cfg.session?.dmScope ?? "main";

    if (dmPolicy === "open") {
      const allowFromPath = `${params.allowFromPath}allowFrom`;
      warnings.push(`- ${params.label} DMs: OPEN (${policyPath}="open"). Anyone can DM it.`);
      if (!hasWildcard) {
        warnings.push(
          `- ${params.label} DMs: config invalid — "open" requires ${allowFromPath} to include "*".`,
        );
      }
    }

    if (dmPolicy === "disabled") {
      warnings.push(`- ${params.label} DMs: disabled (${policyPath}="disabled").`);
      return;
    }

    if (dmPolicy !== "open" && allowCount === 0) {
      warnings.push(
        `- ${params.label} DMs: locked (${policyPath}="${dmPolicy}") with no allowlist; unknown senders will be blocked / get a pairing code.`,
      );
      warnings.push(`  ${params.approveHint}`);
    }

    if (dmScope === "main" && isMultiUserDm) {
      warnings.push(
        `- ${params.label} DMs: multiple senders share the main session; run: ` +
          formatCliCommand('openclaw config set session.dmScope "per-channel-peer"') +
          ' (or "per-account-channel-peer" for multi-account channels) to isolate sessions.',
      );
    }
  };

  for (const plugin of listChannelPlugins()) {
    if (!plugin.security) {
      continue;
    }
    const { defaultAccountId, account, enabled, configured } =
      await resolveDefaultChannelAccountContext(plugin, cfg);
    if (!enabled) {
      continue;
    }
    if (!configured) {
      continue;
    }
    const dmPolicy = plugin.security.resolveDmPolicy?.({
      cfg,
      accountId: defaultAccountId,
      account,
    });
    if (dmPolicy) {
      await warnDmPolicy({
        label: plugin.meta.label ?? plugin.id,
        provider: plugin.id,
        accountId: defaultAccountId,
        dmPolicy: dmPolicy.policy,
        allowFrom: dmPolicy.allowFrom,
        policyPath: dmPolicy.policyPath,
        allowFromPath: dmPolicy.allowFromPath,
        approveHint: dmPolicy.approveHint,
        normalizeEntry: dmPolicy.normalizeEntry,
      });
    }
    if (plugin.security.collectWarnings) {
      const extra = await plugin.security.collectWarnings({
        cfg,
        accountId: defaultAccountId,
        account,
      });
      if (extra?.length) {
        warnings.push(...extra);
      }
    }
  }

  warnings.push(...(await collectDelegateWarnings(cfg)));

  const lines = warnings.length > 0 ? warnings : ["- No channel security warnings detected."];
  lines.push(auditHint);
  note(lines.join("\n"), "Security");
}
