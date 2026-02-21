import type { ChannelId } from "../channels/plugins/types.js";
<<<<<<< HEAD
import { normalizeChannelId } from "../channels/plugins/index.js";
=======
import { isPlainObject } from "../infra/plain-object.js";
<<<<<<< HEAD
>>>>>>> fbb79d401 (fix(security): harden runtime command override gating)
import type { NativeCommandsSetting } from "./types.js";
=======
import type { CommandsConfig, NativeCommandsSetting } from "./types.js";

export type CommandFlagKey = {
  [K in keyof CommandsConfig]-?: Exclude<CommandsConfig[K], undefined> extends boolean ? K : never;
}[keyof CommandsConfig];
>>>>>>> 08e020881 (refactor(security): unify command gating and blocked-key guards)

function resolveAutoDefault(providerId?: ChannelId): boolean {
  const id = normalizeChannelId(providerId);
  if (!id) return false;
  if (id === "discord" || id === "telegram") return true;
  if (id === "slack") return false;
  return false;
}

export function resolveNativeSkillsEnabled(params: {
  providerId: ChannelId;
  providerSetting?: NativeCommandsSetting;
  globalSetting?: NativeCommandsSetting;
}): boolean {
  const { providerId, providerSetting, globalSetting } = params;
  const setting = providerSetting === undefined ? globalSetting : providerSetting;
  if (setting === true) return true;
  if (setting === false) return false;
  return resolveAutoDefault(providerId);
}

export function resolveNativeCommandsEnabled(params: {
  providerId: ChannelId;
  providerSetting?: NativeCommandsSetting;
  globalSetting?: NativeCommandsSetting;
}): boolean {
  const { providerId, providerSetting, globalSetting } = params;
  const setting = providerSetting === undefined ? globalSetting : providerSetting;
  if (setting === true) return true;
  if (setting === false) return false;
  // auto or undefined -> heuristic
  return resolveAutoDefault(providerId);
}

export function isNativeCommandsExplicitlyDisabled(params: {
  providerSetting?: NativeCommandsSetting;
  globalSetting?: NativeCommandsSetting;
}): boolean {
  const { providerSetting, globalSetting } = params;
  if (providerSetting === false) return true;
  if (providerSetting === undefined) return globalSetting === false;
  return false;
}
<<<<<<< HEAD
=======

function getOwnCommandFlagValue(
  config: { commands?: unknown } | undefined,
  key: CommandFlagKey,
): unknown {
  const { commands } = config ?? {};
  if (!isPlainObject(commands) || !Object.hasOwn(commands, key)) {
    return undefined;
  }
  return commands[key];
}

export function isCommandFlagEnabled(
  config: { commands?: unknown } | undefined,
  key: CommandFlagKey,
): boolean {
  return getOwnCommandFlagValue(config, key) === true;
}

export function isRestartEnabled(config?: { commands?: unknown }): boolean {
  return getOwnCommandFlagValue(config, "restart") !== false;
}
>>>>>>> fbb79d401 (fix(security): harden runtime command override gating)
