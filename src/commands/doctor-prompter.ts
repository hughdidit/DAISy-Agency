import { confirm, select } from "@clack/prompts";
import type { RuntimeEnv } from "../runtime.js";
import { stylePromptHint, stylePromptMessage } from "../terminal/prompt-style.js";
import { guardCancel } from "./onboard-helpers.js";

export type DoctorOptions = {
  workspaceSuggestions?: boolean;
  yes?: boolean;
  nonInteractive?: boolean;
  deep?: boolean;
  repair?: boolean;
  dryRun?: boolean;
  force?: boolean;
  generateGatewayToken?: boolean;
};

export type DoctorExecutionMode = "inspect" | "dry-run" | "apply";

export function resolveDoctorExecutionMode(options: DoctorOptions): DoctorExecutionMode {
  if (options.dryRun === true) {
    return "dry-run";
  }
  if (options.repair === true || options.yes === true) {
    return "apply";
  }
  return "inspect";
}

export type DoctorPrompter = {
  confirm: (params: Parameters<typeof confirm>[0]) => Promise<boolean>;
  confirmRepair: (params: Parameters<typeof confirm>[0]) => Promise<boolean>;
  confirmAggressive: (params: Parameters<typeof confirm>[0]) => Promise<boolean>;
  confirmSkipInNonInteractive: (params: Parameters<typeof confirm>[0]) => Promise<boolean>;
  select: <T>(params: Parameters<typeof select>[0], fallback: T) => Promise<T>;
  mode: DoctorExecutionMode;
  isDryRun: boolean;
  shouldRepair: boolean;
  shouldForce: boolean;
};

export function createDoctorPrompter(params: {
  runtime: RuntimeEnv;
  options: DoctorOptions;
}): DoctorPrompter {
  const mode = resolveDoctorExecutionMode(params.options);
  const yes = params.options.yes === true && mode === "apply";
  const requestedNonInteractive = params.options.nonInteractive === true;
  const shouldRepair = mode === "apply";
  const shouldForce = mode === "apply" && params.options.force === true;
  const isDryRun = mode === "dry-run";
  const isTty = Boolean(process.stdin.isTTY);
  const nonInteractive = requestedNonInteractive || (!isTty && !yes);

  const canPrompt = isTty && !yes && !nonInteractive;
  const confirmDefault = async (p: Parameters<typeof confirm>[0]) => {
    if (nonInteractive) {
      return false;
    }
    if (shouldRepair) {
      return true;
    }
    if (!canPrompt) {
      return Boolean(p.initialValue ?? false);
    }
    return guardCancel(
      await confirm({
        ...p,
        message: stylePromptMessage(p.message),
      }),
      params.runtime,
    );
  };

  return {
    confirm: confirmDefault,
    confirmRepair: async (p) => {
      if (nonInteractive || isDryRun) {
        return false;
      }
      return confirmDefault(p);
    },
    confirmAggressive: async (p) => {
      if (nonInteractive || isDryRun) {
        return false;
      }
      if (shouldRepair && shouldForce) {
        return true;
      }
      if (shouldRepair && !shouldForce) {
        return false;
      }
      if (!canPrompt) {
        return Boolean(p.initialValue ?? false);
      }
      return guardCancel(
        await confirm({
          ...p,
          message: stylePromptMessage(p.message),
        }),
        params.runtime,
      );
    },
    confirmSkipInNonInteractive: async (p) => {
      if (nonInteractive || isDryRun) {
        return false;
      }
      if (shouldRepair) {
        return true;
      }
      return confirmDefault(p);
    },
    select: async <T>(p: Parameters<typeof select>[0], fallback: T) => {
      if (!canPrompt || shouldRepair) {
        return fallback;
      }
      return guardCancel(
        await select({
          ...p,
          message: stylePromptMessage(p.message),
          options: p.options.map((opt) =>
            opt.hint === undefined ? opt : { ...opt, hint: stylePromptHint(opt.hint) },
          ),
        }),
        params.runtime,
      ) as T;
    },
    mode,
    isDryRun,
    shouldRepair,
    shouldForce,
  };
}
