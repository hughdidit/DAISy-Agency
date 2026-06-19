import { GoogleAuth } from "google-auth-library";

const SECRET_MANAGER_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const SECRET_MANAGER_BASE_URL = "https://secretmanager.googleapis.com/v1";
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

export async function accessGcpSecretManagerSecretVersion(
  params: GcpSecretAccessParams,
): Promise<string> {
  if (accessSecretVersionForTest) {
    return await accessSecretVersionForTest(params);
  }
  if (!isGcpSecretManagerResourceName(params.resourceName)) {
    throw new Error(`Google Secret Manager resource name is invalid: ${params.resourceName}`);
  }

  const client = await googleAuth.getClient();
  const response = await client.request<SecretManagerAccessResponse>({
    method: "GET",
    url: `${SECRET_MANAGER_BASE_URL}/${params.resourceName}:access`,
    timeout: params.timeoutMs,
  });
  const encoded = response.data?.payload?.data;
  if (typeof encoded !== "string" || encoded.length === 0) {
    throw new Error("Google Secret Manager response did not include payload.data.");
  }
  return Buffer.from(encoded, "base64").toString("utf8");
}
