import fs from "node:fs";
import path from "node:path";
import { PluginError } from "./errors.js";
import type { AuthResolution, CredentialMode, GwsToolkitConfig } from "./types.js";

function normalizePath(input: string): string {
  return path.resolve(input);
}

function isPathInside(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
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
    // For non-document fixture paths, enforce a 0644-like floor by denying group/other write.
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

  // Real credential document files require owner-only permissions.
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

function ensureCredentialFileAllowed(config: GwsToolkitConfig): string {
  const raw = config.credentialsFile;
  if (!raw) {
    throw new PluginError("AUTH_ERROR", "credentials_file mode requires credentialsFile");
  }
  const filePath = normalizePath(raw);
  if (!fs.existsSync(filePath)) {
    throw new PluginError("AUTH_ERROR", "Configured credentials file does not exist");
  }

  const lstat = fs.lstatSync(filePath);
  if (lstat.isSymbolicLink()) {
    throw new PluginError("AUTH_ERROR", "Configured credentials file cannot be a symbolic link");
  }

  if (!lstat.isFile()) {
    throw new PluginError("AUTH_ERROR", "Configured credentials file must be a regular file");
  }

  ensurePosixPermissions(filePath, lstat.mode);

  let realFilePath: string;
  try {
    realFilePath = resolveExistingPath(filePath);
  } catch {
    throw new PluginError("AUTH_ERROR", "Configured credentials file path could not be resolved");
  }

  const approved = config.approvedCredentialDirs.map((entry) => normalizePath(entry));
  if (approved.length === 0) {
    throw new PluginError("AUTH_ERROR", "approvedCredentialDirs must include at least one path");
  }

  const resolvedApproved = approved.map((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      throw new PluginError(
        "AUTH_ERROR",
        "approvedCredentialDirs contains a path that does not exist",
      );
    }

    const dirStat = fs.statSync(dirPath);
    if (!dirStat.isDirectory()) {
      throw new PluginError("AUTH_ERROR", "approvedCredentialDirs entries must be directories");
    }

    return resolveExistingPath(dirPath);
  });

  const inside = resolvedApproved.some((dirPath) => isPathInside(dirPath, realFilePath));
  if (!inside) {
    throw new PluginError("AUTH_ERROR", "credentialsFile is outside approvedCredentialDirs");
  }

  return realFilePath;
}

export type AuthSourceStatus = {
  tokenPresent: boolean;
  credentialsFileConfigured: boolean;
  credentialsFileExists: boolean;
  credentialsFileAllowed: boolean;
  oauthAllowed: boolean;
};

export function getAuthSourceStatus(config: GwsToolkitConfig): AuthSourceStatus {
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
      ensureCredentialFileAllowed(config);
      credentialsFileAllowed = true;
    } catch {
      credentialsFileAllowed = false;
    }
  }

  return {
    tokenPresent,
    credentialsFileConfigured,
    credentialsFileExists,
    credentialsFileAllowed,
    oauthAllowed: config.allowedCredentialModes.includes("oauth"),
  };
}

export function resolveAuth(config: GwsToolkitConfig): AuthResolution {
  const modes = new Set<CredentialMode>(config.allowedCredentialModes);
  const tokenValue = process.env[config.tokenEnvVar];
  if (modes.has("token") && typeof tokenValue === "string" && tokenValue.trim()) {
    return {
      mode: "token",
      env: { [config.tokenEnvVar]: tokenValue.trim() },
      args: [],
    };
  }

  if (modes.has("credentials_file") && config.credentialsFile) {
    const filePath = ensureCredentialFileAllowed(config);
    return {
      mode: "credentials_file",
      env: {
        GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE: filePath,
      },
      args: ["--credentials-file", filePath],
    };
  }

  if (modes.has("oauth")) {
    return {
      mode: "oauth",
      env: {},
      args: [],
    };
  }

  throw new PluginError("AUTH_ERROR", "No permitted auth mode available", {
    allowedCredentialModes: [...modes],
  });
}
