import fs from "node:fs";
import path from "node:path";
import { resolveCredentialRoute } from "./credential-routing.js";
import { PluginError } from "./errors.js";
import type {
  AuthResolution,
  CredentialMode,
  GwsToolkitConfig,
  InvocationContext,
  ResolvedRoute,
} from "./types.js";

function normalizePath(input: string): string {
  return path.resolve(input);
}

function normalizeComparablePath(input: string): string {
  const resolved = normalizePath(input);
  const stripped = resolved.replace(/[\\/]+$/, "");
  return process.platform === "win32" ? stripped.toLowerCase() : stripped;
}

function isPathInside(parent: string, child: string): boolean {
  const normalizedParent = normalizeComparablePath(parent);
  const normalizedChild = normalizeComparablePath(child);
  if (normalizedChild === normalizedParent) {
    return true;
  }
  const separator = process.platform === "win32" ? "\\" : "/";
  return normalizedChild.startsWith(`${normalizedParent}${separator}`);
}

function resolveExistingPath(input: string): string {
  return fs.realpathSync(normalizePath(input));
}

function shouldEnforceOwnerOnlyPermissions(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".json" || ext === ".yaml" || ext === ".yml" || ext === ".toml";
}

function ensurePosixPermissions(filePath: string, mode: number): void {
  if (process.platform === "win32") {
    return;
  }

  if (!shouldEnforceOwnerOnlyPermissions(filePath)) {
    if ((mode & 0o022) !== 0) {
      throw new PluginError(
        "AUTH_ERROR",
        "Configured credentials file permissions are too open; deny group/other write access.",
        {
          credentialsFile: path.basename(filePath),
          mode: `0${(mode & 0o777).toString(8)}`,
        },
      );
    }
    return;
  }

  if ((mode & 0o077) !== 0) {
    throw new PluginError(
      "AUTH_ERROR",
      "Configured credentials file permissions are too open; require owner-only access (for example 0600).",
      {
        credentialsFile: path.basename(filePath),
        mode: `0${(mode & 0o777).toString(8)}`,
      },
    );
  }
}

export function ensureCredentialFileAllowed(
  config: GwsToolkitConfig,
  filePathRaw: string | undefined,
  route?: ResolvedRoute,
): string {
  const raw =
    filePathRaw?.trim() ||
    (route && route.name !== "legacy-default" ? undefined : config.credentialsFile);
  if (!raw) {
    throw new PluginError("AUTH_ERROR", "credentials_file mode requires credentialsFile", {
      routeName: route?.name,
    });
  }
  const filePath = normalizePath(raw);
  if (!fs.existsSync(filePath)) {
    throw new PluginError("AUTH_ERROR", "Configured credentials file does not exist", {
      routeName: route?.name,
    });
  }

  const lstat = fs.lstatSync(filePath);
  if (lstat.isSymbolicLink()) {
    throw new PluginError("AUTH_ERROR", "Configured credentials file cannot be a symbolic link", {
      routeName: route?.name,
    });
  }
  if (!lstat.isFile()) {
    throw new PluginError("AUTH_ERROR", "Configured credentials file must be a regular file", {
      routeName: route?.name,
    });
  }

  ensurePosixPermissions(filePath, lstat.mode);

  let realFilePath: string;
  try {
    realFilePath = resolveExistingPath(filePath);
  } catch {
    throw new PluginError("AUTH_ERROR", "Configured credentials file path could not be resolved", {
      routeName: route?.name,
    });
  }

  const approved = config.approvedCredentialDirs.map((entry) => normalizePath(entry));
  if (approved.length === 0) {
    throw new PluginError("AUTH_ERROR", "approvedCredentialDirs must include at least one path", {
      routeName: route?.name,
    });
  }

  const resolvedApproved = approved.map((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      throw new PluginError(
        "AUTH_ERROR",
        "approvedCredentialDirs contains a path that does not exist",
        { routeName: route?.name },
      );
    }
    const dirStat = fs.statSync(dirPath);
    if (!dirStat.isDirectory()) {
      throw new PluginError("AUTH_ERROR", "approvedCredentialDirs entries must be directories", {
        routeName: route?.name,
      });
    }
    return resolveExistingPath(dirPath);
  });

  const inside = resolvedApproved.some((dirPath) => isPathInside(dirPath, realFilePath));
  if (!inside) {
    throw new PluginError("AUTH_ERROR", "credentialsFile is outside approvedCredentialDirs", {
      routeName: route?.name,
    });
  }

  return realFilePath;
}

export type RouteImpersonationStatus = {
  configured: boolean;
  source: "literal" | "env_var" | null;
  value?: string;
  envVar?: string;
  missing: boolean;
};

export function getRouteImpersonationStatus(route: ResolvedRoute): RouteImpersonationStatus {
  if (route.mode !== "credentials_file") {
    return {
      configured: false,
      source: null,
      missing: false,
    };
  }
  if (route.impersonatedUser) {
    return {
      configured: true,
      source: "literal",
      value: route.impersonatedUser,
      missing: false,
    };
  }
  if (route.impersonatedUserEnvVar) {
    const envVar = route.impersonatedUserEnvVar;
    const envValue = process.env[envVar];
    const value = typeof envValue === "string" && envValue.trim() ? envValue.trim() : undefined;
    return {
      configured: true,
      source: "env_var",
      envVar,
      value,
      missing: !value,
    };
  }
  return {
    configured: false,
    source: null,
    missing: false,
  };
}

export type RouteAuthStatus = {
  routeName: string;
  mode: CredentialMode;
  bindingSubjects: string[];
  available: boolean;
  details: Record<string, unknown>;
};

export type ActiveRouteAuthStatus = {
  bindingSubject: string;
  inherited: boolean;
  routeName?: string;
  mode?: CredentialMode;
  available: boolean;
  details: Record<string, unknown>;
};

type CredentialFileProbe = {
  configured: boolean;
  exists: boolean;
  allowed: boolean;
  configuredPath?: string;
  resolvedPath?: string;
  error?: string;
};

function probeCredentialFile(
  config: GwsToolkitConfig,
  filePathRaw: string | undefined,
  route?: ResolvedRoute,
): CredentialFileProbe {
  const raw =
    filePathRaw?.trim() ||
    (route && route.name !== "legacy-default" ? undefined : config.credentialsFile?.trim());
  if (!raw) {
    return {
      configured: false,
      exists: false,
      allowed: false,
      ...(route?.mode === "credentials_file"
        ? {
            error: "Credentials file route is missing a configured credentials file path",
          }
        : {}),
    };
  }
  const configuredPath = normalizePath(raw);
  const exists = fs.existsSync(configuredPath);
  if (!exists) {
    return {
      configured: true,
      exists: false,
      allowed: false,
      configuredPath,
      error: "Configured credentials file does not exist",
    };
  }
  try {
    const resolvedPath = ensureCredentialFileAllowed(config, raw, route);
    return {
      configured: true,
      exists: true,
      allowed: true,
      configuredPath,
      resolvedPath,
    };
  } catch (error) {
    return {
      configured: true,
      exists: true,
      allowed: false,
      configuredPath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function getAuthSourceStatus(config: GwsToolkitConfig): {
  tokenPresent: boolean;
  credentialsFileConfigured: boolean;
  credentialsFileExists: boolean;
  credentialsFileAllowed: boolean;
  routes: RouteAuthStatus[];
} {
  const tokenValue = process.env[config.tokenEnvVar];
  const tokenPresent = typeof tokenValue === "string" && tokenValue.trim().length > 0;
  const credentialFileProbes = [
    ...(config.credentialsFile ? [probeCredentialFile(config, config.credentialsFile)] : []),
    ...Object.entries(config.credentialRoutes)
      .filter(([, route]) => route.mode === "credentials_file")
      .map(([routeName, route]) =>
        probeCredentialFile(config, route.credentialsFile, {
          ...route,
          name: routeName,
        }),
      ),
  ];
  const credentialsFileConfigured = credentialFileProbes.some((probe) => probe.configured);
  const credentialsFileExists = credentialFileProbes.some((probe) => probe.exists);
  const credentialsFileAllowed = credentialFileProbes.some((probe) => probe.allowed);

  const bindingSubjectsByRoute = new Map<string, string[]>();
  for (const [subject, routeName] of Object.entries(config.agentCredentialBindings)) {
    const list = bindingSubjectsByRoute.get(routeName) ?? [];
    list.push(subject);
    bindingSubjectsByRoute.set(routeName, list);
  }

  const routes = Object.entries(config.credentialRoutes).map(([routeName, route]) => {
    const modeAllowed = config.allowedCredentialModes.includes(route.mode);
    if (route.mode === "token") {
      const envVar = route.tokenEnvVar ?? config.tokenEnvVar;
      const present = typeof process.env[envVar] === "string" && process.env[envVar]?.trim();
      return {
        routeName,
        mode: route.mode,
        bindingSubjects: bindingSubjectsByRoute.get(routeName) ?? [],
        available: modeAllowed && Boolean(present),
        details: {
          tokenEnvVar: envVar,
          tokenPresent: Boolean(present),
          modeAllowed,
          impersonationConfigured: false,
        },
      } satisfies RouteAuthStatus;
    }

    const routeWithName = {
      ...route,
      name: routeName,
    };
    const probe = probeCredentialFile(config, route.credentialsFile, routeWithName);
    const impersonation = getRouteImpersonationStatus(routeWithName);
    if (probe.allowed && probe.resolvedPath) {
      return {
        routeName,
        mode: route.mode,
        bindingSubjects: bindingSubjectsByRoute.get(routeName) ?? [],
        available: modeAllowed && !impersonation.missing,
        details: {
          credentialsFile: path.basename(probe.resolvedPath),
          configuredCredentialsFile: probe.configuredPath,
          resolvedCredentialsFile: probe.resolvedPath,
          modeAllowed,
          impersonationConfigured: impersonation.configured,
          impersonationSource: impersonation.source,
          impersonatedUserEnvVar: impersonation.envVar,
          impersonatedUser: impersonation.value,
          impersonatedUserMissing: impersonation.missing,
        },
      } satisfies RouteAuthStatus;
    }
    return {
      routeName,
      mode: route.mode,
      bindingSubjects: bindingSubjectsByRoute.get(routeName) ?? [],
      available: false,
      details: {
        configuredCredentialsFile: probe.configuredPath,
        error: probe.error ?? "Configured credentials file is unavailable",
        modeAllowed,
        impersonationConfigured: impersonation.configured,
        impersonationSource: impersonation.source,
        impersonatedUserEnvVar: impersonation.envVar,
        impersonatedUser: impersonation.value,
        impersonatedUserMissing: impersonation.missing,
      },
    } satisfies RouteAuthStatus;
  });

  return {
    tokenPresent,
    credentialsFileConfigured,
    credentialsFileExists,
    credentialsFileAllowed,
    routes,
  };
}

export function getActiveRouteAuthStatus(
  config: GwsToolkitConfig,
  ctx: InvocationContext,
): ActiveRouteAuthStatus {
  try {
    const resolved = resolveCredentialRoute(config, ctx);
    const route = resolved.route;
    const modeAllowed = config.allowedCredentialModes.includes(route.mode);
    if (route.mode === "token") {
      const envVar = route.tokenEnvVar ?? config.tokenEnvVar;
      const tokenPresent =
        typeof process.env[envVar] === "string" && Boolean(process.env[envVar]?.trim());
      return {
        bindingSubject: resolved.bindingSubject,
        inherited: resolved.inherited,
        routeName: route.name,
        mode: route.mode,
        available: modeAllowed && tokenPresent,
        details: {
          tokenEnvVar: envVar,
          tokenPresent,
          modeAllowed,
          impersonationConfigured: false,
        },
      };
    }

    const probe = probeCredentialFile(config, route.credentialsFile, route);
    const impersonation = getRouteImpersonationStatus(route);
    return {
      bindingSubject: resolved.bindingSubject,
      inherited: resolved.inherited,
      routeName: route.name,
      mode: route.mode,
      available: modeAllowed && probe.allowed && !impersonation.missing,
      details: {
        ...(probe.resolvedPath ? { credentialsFile: path.basename(probe.resolvedPath) } : {}),
        configuredCredentialsFile: probe.configuredPath,
        resolvedCredentialsFile: probe.resolvedPath,
        modeAllowed,
        ...(probe.allowed
          ? {}
          : { error: probe.error ?? "Configured credentials file is unavailable" }),
        impersonationConfigured: impersonation.configured,
        impersonationSource: impersonation.source,
        impersonatedUserEnvVar: impersonation.envVar,
        impersonatedUser: impersonation.value,
        impersonatedUserMissing: impersonation.missing,
      },
    };
  } catch (error) {
    return {
      bindingSubject: ctx.bindingSubject ?? "unknown",
      inherited: false,
      available: false,
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function resolveAuth(config: GwsToolkitConfig, ctx: InvocationContext): AuthResolution {
  const resolved = resolveCredentialRoute(config, ctx);
  const route = resolved.route;

  if (!config.allowedCredentialModes.includes(route.mode)) {
    throw new PluginError("AUTH_ERROR", `Auth mode denied by config: ${route.mode}`, {
      routeName: route.name,
      bindingSubject: resolved.bindingSubject,
    });
  }

  if (route.mode === "token") {
    const envVar = route.tokenEnvVar ?? config.tokenEnvVar;
    const tokenValue = process.env[envVar];
    if (typeof tokenValue !== "string" || !tokenValue.trim()) {
      throw new PluginError("AUTH_ERROR", "No permitted token auth value available", {
        routeName: route.name,
        bindingSubject: resolved.bindingSubject,
      });
    }
    return {
      mode: "token",
      env: { [envVar]: tokenValue.trim() },
      args: [],
      route,
      bindingSubject: resolved.bindingSubject,
    };
  }

  const filePath = ensureCredentialFileAllowed(config, route.credentialsFile, route);
  const env: Record<string, string> = {
    GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE: filePath,
  };
  const impersonation = getRouteImpersonationStatus(route);
  if (impersonation.configured) {
    if (!impersonation.value) {
      throw new PluginError(
        "AUTH_ERROR",
        "Route impersonation is configured but no impersonated user value is available.",
        {
          routeName: route.name,
          bindingSubject: resolved.bindingSubject,
          impersonatedUserEnvVar: impersonation.envVar,
        },
      );
    }
    env.GOOGLE_WORKSPACE_CLI_IMPERSONATED_USER = impersonation.value;
  }
  return {
    mode: "credentials_file",
    env,
    args: [],
    route,
    bindingSubject: resolved.bindingSubject,
    impersonatedUser: impersonation.value,
  };
}
