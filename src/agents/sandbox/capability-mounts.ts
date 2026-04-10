import type { OpenClawConfig } from "../../config/config.js";
import { resolveSandboxGwsCredentialMount } from "./gws-credential-mounts.js";
import type { SandboxCapabilityMount } from "./types.js";

export function resolveSandboxCapabilityMounts(params: {
  config?: OpenClawConfig;
  agentId?: string;
  sessionKey: string;
}): SandboxCapabilityMount[] {
  const mounts: SandboxCapabilityMount[] = [];
  const gwsMount = resolveSandboxGwsCredentialMount(params);
  if (gwsMount) {
    mounts.push(gwsMount);
  }
  return mounts;
}
