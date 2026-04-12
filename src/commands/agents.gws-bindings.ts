import { buildDelegateGwsBindingSubjects } from "../agents/delegate-config.js";
import type { OpenClawConfig } from "../config/config.js";
import { normalizeAgentId } from "../routing/session-key.js";

const GWS_PLUGIN_ID = "gws-toolkit-phase1";

type GwsBindingChange = {
  subject: string;
  routeName: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function applyAgentGwsBindings(
  cfg: OpenClawConfig,
  params: {
    agentId: string;
    routeName: string;
    subagentRouteName?: string;
  },
):
  | {
      ok: true;
      config: OpenClawConfig;
      added: GwsBindingChange[];
      updated: GwsBindingChange[];
      skipped: GwsBindingChange[];
    }
  | {
      ok: false;
      errors: string[];
    } {
  const agentId = normalizeAgentId(params.agentId);
  const routeName = params.routeName.trim();
  const subagentRouteName = params.subagentRouteName?.trim() || routeName;
  if (!routeName) {
    return {
      ok: false,
      errors: ["Provide a non-empty --gws-route <routeName>."],
    };
  }

  const pluginEntry = cfg.plugins?.entries?.[GWS_PLUGIN_ID];
  if (!pluginEntry) {
    return {
      ok: false,
      errors: [
        `Plugin "${GWS_PLUGIN_ID}" is not configured. Add credentialRoutes before writing GWS bindings.`,
      ],
    };
  }

  const rawPluginConfig = asRecord(pluginEntry.config);
  const credentialRoutes = asRecord(rawPluginConfig?.credentialRoutes);
  if (!credentialRoutes || Object.keys(credentialRoutes).length === 0) {
    return {
      ok: false,
      errors: [
        `Plugin "${GWS_PLUGIN_ID}" has no configured credentialRoutes. Add named routes before writing explicit GWS bindings.`,
      ],
    };
  }

  const errors: string[] = [];
  if (!Object.hasOwn(credentialRoutes, routeName)) {
    errors.push(`Unknown GWS route "${routeName}".`);
  }
  if (subagentRouteName !== routeName && !Object.hasOwn(credentialRoutes, subagentRouteName)) {
    errors.push(`Unknown subagent GWS route "${subagentRouteName}".`);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const currentBindings = asRecord(rawPluginConfig?.agentCredentialBindings) ?? {};
  const nextBindings: Record<string, string> = Object.fromEntries(
    Object.entries(currentBindings).flatMap(([subject, value]) =>
      typeof value === "string" ? [[subject, value]] : [],
    ),
  );

  const subjects = buildDelegateGwsBindingSubjects(agentId);
  const desired: GwsBindingChange[] = [
    { subject: subjects.agent, routeName },
    { subject: subjects.subagent, routeName: subagentRouteName },
  ];

  const added: GwsBindingChange[] = [];
  const updated: GwsBindingChange[] = [];
  const skipped: GwsBindingChange[] = [];

  for (const binding of desired) {
    const existing = nextBindings[binding.subject];
    if (!existing) {
      nextBindings[binding.subject] = binding.routeName;
      added.push(binding);
      continue;
    }
    if (existing === binding.routeName) {
      skipped.push(binding);
      continue;
    }
    nextBindings[binding.subject] = binding.routeName;
    updated.push(binding);
  }

  if (added.length === 0 && updated.length === 0) {
    return {
      ok: true,
      config: cfg,
      added,
      updated,
      skipped,
    };
  }

  return {
    ok: true,
    config: {
      ...cfg,
      plugins: {
        ...cfg.plugins,
        entries: {
          ...cfg.plugins?.entries,
          [GWS_PLUGIN_ID]: {
            ...pluginEntry,
            config: rawPluginConfig
              ? {
                  ...rawPluginConfig,
                  agentCredentialBindings: nextBindings,
                }
              : {
                  agentCredentialBindings: nextBindings,
                },
          },
        },
      },
    },
    added,
    updated,
    skipped,
  };
}
