import { GoogleAuth } from "google-auth-library";

const SECRET_MANAGER_SCOPE = "https://www.googleapis.com/auth/secretmanager";
const SECRET_MANAGER_BASE_URL = "https://secretmanager.googleapis.com/v1";
const GCE_METADATA_ACCESS_TOKEN_URL =
  `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token` +
  `?scopes=${encodeURIComponent(SECRET_MANAGER_SCOPE)}`;
const googleAuth = new GoogleAuth({
  scopes: [SECRET_MANAGER_SCOPE],
});

export const GCP_SECRET_ID_PATTERN = /^[A-Za-z0-9_-]{1,255}$/;
export const GCP_SECRET_VERSION_PATTERN = /^[A-Za-z0-9_-]{1,63}$/;
export const GCP_PROJECT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-:.]{0,127}$/;
export const GCP_SECRET_RESOURCE_NAME_PATTERN =
  /^projects\/[A-Za-z0-9][A-Za-z0-9-:.]{0,127}\/secrets\/[A-Za-z0-9_-]{1,255}\/versions\/[A-Za-z0-9_-]{1,63}$/;

export type GcpSecretAccessParams = {
  resourceName: string;
  timeoutMs: number;
};

type SecretManagerAccessResponse = {
  payload?: {
    data?: string;
  };
};

type MetadataAccessTokenResponse = {
  access_token?: unknown;
};

type AccessSecretVersion = (params: GcpSecretAccessParams) => Promise<string>;

let accessSecretVersionForTest: AccessSecretVersion | null = null;

export function setGcpSecretManagerAccessSecretVersionForTest(
  accessSecretVersion: AccessSecretVersion,
): void {
  accessSecretVersionForTest = accessSecretVersion;
}

export function clearGcpSecretManagerAccessSecretVersionForTest(): void {
  accessSecretVersionForTest = null;
}

export function isGcpSecretManagerResourceName(value: string): boolean {
  return GCP_SECRET_RESOURCE_NAME_PATTERN.test(value);
}

export function isGcpSecretManagerShortSecretId(value: string): boolean {
  return GCP_SECRET_ID_PATTERN.test(value);
}

export function buildGcpSecretManagerResourceName(params: {
  projectId: string;
  secretId: string;
  version: string;
}): string {
  if (!GCP_PROJECT_ID_PATTERN.test(params.projectId)) {
    throw new Error(`Google Secret Manager projectId is invalid: ${params.projectId}`);
  }
  if (!GCP_SECRET_ID_PATTERN.test(params.secretId)) {
    throw new Error(`Google Secret Manager secret id is invalid: ${params.secretId}`);
  }
  if (!GCP_SECRET_VERSION_PATTERN.test(params.version)) {
    throw new Error(`Google Secret Manager secret version is invalid: ${params.version}`);
  }
  return `projects/${params.projectId}/secrets/${params.secretId}/versions/${params.version}`;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function remainingTimeoutMs(startedAt: number, timeoutMs: number): number {
  return Math.max(0, timeoutMs - (Date.now() - startedAt));
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, description: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`${description} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function accessTokenFromMetadata(timeoutMs: number): Promise<string> {
  const response = await fetchWithTimeout(
    GCE_METADATA_ACCESS_TOKEN_URL,
    {
      headers: {
        "Metadata-Flavor": "Google",
      },
    },
    timeoutMs,
  );
  try {
    if (!response.ok) {
      throw new Error(`metadata server returned HTTP ${response.status}`);
    }
    if (response.headers.get("metadata-flavor") !== "Google") {
      throw new Error("metadata response did not include Metadata-Flavor: Google");
    }
    const payload = (await response.json()) as MetadataAccessTokenResponse;
    if (typeof payload.access_token !== "string" || payload.access_token.length === 0) {
      throw new Error("metadata response did not include access_token");
    }
    return payload.access_token;
  } catch (error) {
    throw new Error(`failed to read metadata access token: ${describeError(error)}`);
  }
}

async function accessTokenFromAdc(timeoutMs: number): Promise<string> {
  const startedAt = Date.now();
  try {
    const accessToken = await withTimeout(
      googleAuth.getAccessToken(),
      timeoutMs,
      "Google ADC access token refresh",
    );
    if (typeof accessToken !== "string" || accessToken.length === 0) {
      throw new Error("Google ADC did not return an access token.");
    }
    return accessToken;
  } catch (error) {
    try {
      const remainingMs = remainingTimeoutMs(startedAt, timeoutMs);
      if (remainingMs <= 0) {
        throw new Error(`metadata fallback skipped because ${timeoutMs}ms timeout was exhausted`);
      }
      return await accessTokenFromMetadata(remainingMs);
    } catch (metadataError) {
      throw new Error(
        `Google ADC did not return an access token: ${describeError(error)}; ` +
          `metadata fallback failed: ${describeError(metadataError)}`,
      );
    }
  }
}

export async function accessGcpSecretManagerSecretVersion(
  params: GcpSecretAccessParams,
): Promise<string> {
  if (accessSecretVersionForTest) {
    return await accessSecretVersionForTest(params);
  }
  if (!isGcpSecretManagerResourceName(params.resourceName)) {
    throw new Error(`Google Secret Manager resource name is invalid: ${params.resourceName}`);
  }

  const startedAt = Date.now();
  const accessToken = await accessTokenFromAdc(params.timeoutMs);
  const secretAccessTimeoutMs = remainingTimeoutMs(startedAt, params.timeoutMs);
  if (secretAccessTimeoutMs <= 0) {
    throw new Error(`Google Secret Manager access timed out after ${params.timeoutMs}ms`);
  }

  const response = await fetchWithTimeout(
    `${SECRET_MANAGER_BASE_URL}/${params.resourceName}:access`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    secretAccessTimeoutMs,
  );
  if (!response.ok) {
    throw new Error(
      `Google Secret Manager access failed for ${params.resourceName}: HTTP ${response.status}`,
    );
  }

  const payload = (await response.json()) as SecretManagerAccessResponse;
  const encoded = payload.payload?.data;
  if (typeof encoded !== "string" || encoded.length === 0) {
    throw new Error("Google Secret Manager response did not include payload.data.");
  }
  return Buffer.from(encoded, "base64").toString("utf8");
}
