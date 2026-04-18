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

if (!route || !active || typeof active.mode !== "string" || active.mode.length === 0) {
  process.exit(1);
}

process.stdout.write(
  JSON.stringify({
    configPath,
    bindingSubject,
    route,
    mode: active.mode,
    credentialsFile: typeof active.credentialsFile === "string" ? active.credentialsFile : null,
    impersonationConfigured:
      (typeof active.impersonatedUser === "string" && active.impersonatedUser.length > 0) ||
      (typeof active.impersonatedUserEnvVar === "string" && active.impersonatedUserEnvVar.length > 0),
    impersonationSource:
      typeof active.impersonatedUser === "string" && active.impersonatedUser.trim().length > 0
        ? "literal"
        : typeof active.impersonatedUserEnvVar === "string" &&
            active.impersonatedUserEnvVar.length > 0
          ? "env_var"
          : null,
    impersonatedUserEnvVar:
      typeof active.impersonatedUserEnvVar === "string" && active.impersonatedUserEnvVar.length > 0
        ? active.impersonatedUserEnvVar
        : null,
    impersonatedUser:
      typeof active.impersonatedUser === "string" && active.impersonatedUser.trim().length > 0
        ? active.impersonatedUser.trim()
        : typeof active.impersonatedUserEnvVar === "string" &&
            active.impersonatedUserEnvVar.length > 0 &&
            typeof process.env[active.impersonatedUserEnvVar] === "string" &&
            process.env[active.impersonatedUserEnvVar].trim().length > 0
          ? process.env[active.impersonatedUserEnvVar].trim()
          : null,
    impersonationMissing:
      (typeof active.impersonatedUser === "string" && active.impersonatedUser.length > 0
        ? active.impersonatedUser.trim().length === 0
        : typeof active.impersonatedUserEnvVar === "string" &&
            active.impersonatedUserEnvVar.length > 0
          ? !(
              typeof process.env[active.impersonatedUserEnvVar] === "string" &&
              process.env[active.impersonatedUserEnvVar].trim().length > 0
            )
          : false),
  }),
);
