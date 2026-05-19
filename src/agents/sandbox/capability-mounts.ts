import type { OpenClawConfig } from "../../config/config.js";
import {
  resolveSandboxGmailPolicyMounts,
  resolveSandboxGwsCredentialMount,
} from "./gws-credential-mounts.js";
import type { SandboxCapabilityMount } from "./types.js";

export function resolveSandboxCapabilityMounts(params: {
  config?: OpenClawConfig;
  agentId?: string;
  sessionKey: string;
  targetConfigPath?: string;
}): SandboxCapabilityMount[] {
  const mounts: SandboxCapabilityMount[] = [];
  const gwsMount = resolveSandboxGwsCredentialMount(params);
  if (gwsMount) {
    mounts.push(gwsMount);
  }
  mounts.push(...resolveSandboxGmailPolicyMounts(params));
  return mounts;
}
