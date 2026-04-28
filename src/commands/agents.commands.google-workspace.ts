import { writeConfigFile } from "../config/config.js";
import { logConfigUpdated } from "../config/logging.js";
import { normalizeAgentId } from "../routing/session-key.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { requireValidConfig } from "./agents.command-shared.js";
import { applyAgentConfig, buildAgentSummaries } from "./agents.config.js";
import { applyAgentGwsBindings } from "./agents.gws-bindings.js";

type AgentsGoogleWorkspaceSetOptions = {
  agent?: string;
  email?: string;
  gwsRoute?: string;
  subagentGwsRoute?: string;
  json?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeWorkspaceEmail(value: string | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) ? trimmed : null;
}

function resolveWorkspaceIdentityDomains(cfg: Awaited<ReturnType<typeof requireValidConfig>>) {
  const pluginConfig = asRecord(cfg?.plugins?.entries?.["gws-toolkit-phase1"]?.config);
  const rawDomains = pluginConfig?.workspaceIdentityDomains;
  return Array.isArray(rawDomains)
    ? rawDomains
        .flatMap((domain) => (typeof domain === "string" ? [domain.trim().toLowerCase()] : []))
        .filter(Boolean)
    : [];
}

export async function agentsGoogleWorkspaceSetCommand(
  opts: AgentsGoogleWorkspaceSetOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const cfg = await requireValidConfig(runtime);
  if (!cfg) {
    return;
  }

  const agentId = normalizeAgentId(opts.agent);
  if (!agentId) {
    runtime.error("Provide --agent <id>.");
    runtime.exit(1);
    return;
  }
  const agentExists = buildAgentSummaries(cfg).some((summary) => summary.id === agentId);
  if (!agentExists) {
    runtime.error(`Agent "${agentId}" not found.`);
    runtime.exit(1);
    return;
  }

  const email = normalizeWorkspaceEmail(opts.email);
  if (!email) {
    runtime.error("Provide a valid --email <user@domain> Google Workspace identity.");
    runtime.exit(1);
    return;
  }
  const domain = email.slice(email.lastIndexOf("@") + 1);
  const allowedDomains = resolveWorkspaceIdentityDomains(cfg);
  if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
    runtime.error(
      `Google Workspace identity domain "${domain}" is not allowed. Configure workspaceIdentityDomains or use an allowed domain: ${allowedDomains.join(", ")}.`,
    );
    runtime.exit(1);
    return;
  }

  const gwsRoute = opts.gwsRoute?.trim();
  if (!gwsRoute) {
    runtime.error("Provide --gws-route <routeName>.");
    runtime.exit(1);
    return;
  }
  const subagentGwsRoute = opts.subagentGwsRoute?.trim();

  const withIdentity = applyAgentConfig(cfg, {
    agentId,
    googleWorkspace: { email },
  });
  const gwsResult = applyAgentGwsBindings(withIdentity, {
    agentId,
    routeName: gwsRoute,
    ...(subagentGwsRoute ? { subagentRouteName: subagentGwsRoute } : {}),
  });
  if (!gwsResult.ok) {
    runtime.error(gwsResult.errors.join("\n"));
    runtime.exit(1);
    return;
  }

  await writeConfigFile(gwsResult.config);
  const payload = {
    agentId,
    googleWorkspace: { email },
    gwsBindings: {
      added: gwsResult.added,
      updated: gwsResult.updated,
      skipped: gwsResult.skipped,
    },
  };
  if (opts.json) {
    runtime.log(JSON.stringify(payload, null, 2));
    return;
  }

  logConfigUpdated(runtime);
  runtime.log(`Agent: ${agentId}`);
  runtime.log(`Google Workspace: ${email}`);
  if (gwsResult.added.length > 0) {
    runtime.log("Added GWS bindings:");
    for (const binding of gwsResult.added) {
      runtime.log(`- ${binding.subject} -> ${binding.routeName}`);
    }
  }
  if (gwsResult.updated.length > 0) {
    runtime.log("Updated GWS bindings:");
    for (const binding of gwsResult.updated) {
      runtime.log(`- ${binding.subject} -> ${binding.routeName}`);
    }
  }
  if (gwsResult.skipped.length > 0) {
    runtime.log("Existing GWS bindings:");
    for (const binding of gwsResult.skipped) {
      runtime.log(`- ${binding.subject} -> ${binding.routeName}`);
    }
  }
}
