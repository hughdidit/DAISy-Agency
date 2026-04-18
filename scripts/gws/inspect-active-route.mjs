import { loadActiveGwsPluginConfig } from "./active-config.mjs";

const { configPath, config: cfg } = loadActiveGwsPluginConfig();
const bindingSubject = "agent:main";
const boundRoute =
  typeof cfg?.agentCredentialBindings?.[bindingSubject] === "string" &&
  cfg.agentCredentialBindings[bindingSubject].length > 0
    ? cfg.agentCredentialBindings[bindingSubject]
    : null;
const route =
  boundRoute ??
  (cfg?.allowUnboundAgents === true &&
  typeof cfg?.defaultCredentialRoute === "string" &&
  cfg.defaultCredentialRoute.length > 0
    ? cfg.defaultCredentialRoute
    : null);
const active =
  route && cfg?.credentialRoutes && typeof cfg.credentialRoutes[route] === "object"
    ? cfg.credentialRoutes[route]
    : null;
const hasLiteralImpersonatedUser =
  typeof active?.impersonatedUser === "string" && active.impersonatedUser.trim().length > 0;
const hasEnvVarImpersonatedUser =
  typeof active?.impersonatedUserEnvVar === "string" && active.impersonatedUserEnvVar.length > 0;
const resolvedEnvImpersonatedUser =
  hasEnvVarImpersonatedUser &&
  typeof process.env[active.impersonatedUserEnvVar] === "string" &&
  process.env[active.impersonatedUserEnvVar].trim().length > 0
    ? process.env[active.impersonatedUserEnvVar].trim()
    : null;

if (!route) {
  console.error("missing route binding");
  process.exit(1);
}

if (!active) {
  console.error(`no active entry for route ${route}`);
  process.exit(1);
}

if (typeof active.mode !== "string" || active.mode.length === 0) {
  console.error(`active.mode missing or empty for route ${route}`);
  process.exit(1);
}

process.stdout.write(
  JSON.stringify({
    configPath,
    bindingSubject,
    route,
    mode: active.mode,
    credentialsFile: typeof active.credentialsFile === "string" ? active.credentialsFile : null,
    impersonationConfigured: hasLiteralImpersonatedUser || hasEnvVarImpersonatedUser,
    impersonationSource: hasLiteralImpersonatedUser
      ? "literal"
      : hasEnvVarImpersonatedUser
        ? "env_var"
        : null,
    impersonatedUserEnvVar: hasEnvVarImpersonatedUser ? active.impersonatedUserEnvVar : null,
    impersonatedUser: hasLiteralImpersonatedUser
      ? active.impersonatedUser.trim()
      : resolvedEnvImpersonatedUser,
    impersonationMissing: hasLiteralImpersonatedUser
      ? false
      : hasEnvVarImpersonatedUser
        ? !resolvedEnvImpersonatedUser
        : false,
  }),
);
