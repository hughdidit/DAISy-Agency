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
  const raw = filePathRaw?.trim() || config.credentialsFile;
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

export type RouteAuthStatus = {
  routeName: string;
  mode: CredentialMode;
  bindingSubjects: string[];
  available: boolean;
  details: Record<string, unknown>;
};

export function getAuthSourceStatus(config: GwsToolkitConfig): {
  tokenPresent: boolean;
  credentialsFileConfigured: boolean;
  credentialsFileExists: boolean;
  credentialsFileAllowed: boolean;
  oauthAllowed: boolean;
  routes: RouteAuthStatus[];
} {
  const tokenValue = process.env[config.tokenEnvVar];
  const tokenPresent = typeof tokenValue === "string" && tokenValue.trim().length > 0;
  const credentialsFileConfigured = Boolean(config.credentialsFile);
  const credentialsFileExists =
    credentialsFileConfigured && config.credentialsFile
      ? fs.existsSync(normalizePath(config.credentialsFile))
      : false;
  let credentialsFileAllowed = false;
  if (credentialsFileConfigured && credentialsFileExists) {
    try {
      ensureCredentialFileAllowed(config, config.credentialsFile);
      credentialsFileAllowed = true;
    } catch {
      credentialsFileAllowed = false;
    }
  }

  const bindingSubjectsByRoute = new Map<string, string[]>();
  for (const [subject, routeName] of Object.entries(config.agentCredentialBindings)) {
    const list = bindingSubjectsByRoute.get(routeName) ?? [];
    list.push(subject);
    bindingSubjectsByRoute.set(routeName, list);
  }

  const routes = Object.entries(config.credentialRoutes).map(([routeName, route]) => {
    if (route.mode === "token") {
      const envVar = route.tokenEnvVar ?? config.tokenEnvVar;
      const present = typeof process.env[envVar] === "string" && process.env[envVar]?.trim();
      return {
        routeName,
        mode: route.mode,
        bindingSubjects: bindingSubjectsByRoute.get(routeName) ?? [],
        available: Boolean(present),
        details: { tokenEnvVar: envVar, tokenPresent: Boolean(present) },
      } satisfies RouteAuthStatus;
    }
    if (route.mode === "credentials_file") {
      try {
        const resolved = ensureCredentialFileAllowed(config, route.credentialsFile, {
          ...route,
          name: routeName,
        });
        return {
          routeName,
          mode: route.mode,
          bindingSubjects: bindingSubjectsByRoute.get(routeName) ?? [],
          available: true,
          details: { credentialsFile: path.basename(resolved) },
        } satisfies RouteAuthStatus;
      } catch (error) {
        return {
          routeName,
          mode: route.mode,
          bindingSubjects: bindingSubjectsByRoute.get(routeName) ?? [],
          available: false,
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
        } satisfies RouteAuthStatus;
      }
    }
    return {
      routeName,
      mode: route.mode,
      bindingSubjects: bindingSubjectsByRoute.get(routeName) ?? [],
      available: true,
      details: {
        oauthAllowed: config.allowedCredentialModes.includes("oauth"),
      },
    } satisfies RouteAuthStatus;
  });

  return {
    tokenPresent,
    credentialsFileConfigured,
    credentialsFileExists,
    credentialsFileAllowed,
    oauthAllowed: config.allowedCredentialModes.includes("oauth"),
    routes,
  };
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

  if (route.mode === "credentials_file") {
    const filePath = ensureCredentialFileAllowed(config, route.credentialsFile, route);
    return {
      mode: "credentials_file",
      env: {
        GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE: filePath,
      },
      args: [],
      route,
      bindingSubject: resolved.bindingSubject,
    };
  }

  if (route.mode === "oauth") {
    return {
      mode: "oauth",
      env: {},
      args: [],
      route,
      bindingSubject: resolved.bindingSubject,
    };
  }

  throw new PluginError("AUTH_ERROR", "No permitted auth mode available", {
    routeName: route.name,
    bindingSubject: resolved.bindingSubject,
  });
}
