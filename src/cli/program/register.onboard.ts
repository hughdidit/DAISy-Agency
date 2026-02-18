import type { Command } from "commander";
import type { GatewayDaemonRuntime } from "../../commands/daemon-runtime.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { onboardCommand } from "../../commands/onboard.js";
=======
import { ONBOARD_PROVIDER_AUTH_FLAGS } from "../../commands/onboard-provider-auth-flags.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import { ONBOARD_PROVIDER_AUTH_FLAGS } from "../../commands/onboard-provider-auth-flags.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import type {
  AuthChoice,
  GatewayAuthChoice,
  GatewayBind,
  NodeManagerChoice,
  TailscaleMode,
} from "../../commands/onboard-types.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { formatAuthChoiceChoicesForCli } from "../../commands/auth-choice-options.js";
import { ONBOARD_PROVIDER_AUTH_FLAGS } from "../../commands/onboard-provider-auth-flags.js";
=======
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { formatAuthChoiceChoicesForCli } from "../../commands/auth-choice-options.js";
import { ONBOARD_PROVIDER_AUTH_FLAGS } from "../../commands/onboard-provider-auth-flags.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import { formatAuthChoiceChoicesForCli } from "../../commands/auth-choice-options.js";
import { ONBOARD_PROVIDER_AUTH_FLAGS } from "../../commands/onboard-provider-auth-flags.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
import { onboardCommand } from "../../commands/onboard.js";
>>>>>>> eab9dc538 (refactor(onboard): unify auth-choice catalog for CLI help)
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { runCommandWithRuntime } from "../cli-utils.js";

function resolveInstallDaemonFlag(
  command: unknown,
  opts: { installDaemon?: boolean },
): boolean | undefined {
  if (!command || typeof command !== "object") {
    return undefined;
  }
  const getOptionValueSource =
    "getOptionValueSource" in command ? command.getOptionValueSource : undefined;
  if (typeof getOptionValueSource !== "function") {
    return undefined;
  }

  // Commander doesn't support option conflicts natively; keep original behavior.
  // If --skip-daemon is explicitly passed, it wins.
  if (getOptionValueSource.call(command, "skipDaemon") === "cli") {
    return false;
  }
  if (getOptionValueSource.call(command, "installDaemon") === "cli") {
    return Boolean(opts.installDaemon);
  }
  return undefined;
}

const AUTH_CHOICE_HELP = formatAuthChoiceChoicesForCli({
  includeLegacyAliases: true,
  includeSkip: true,
});

export function registerOnboardCommand(program: Command) {
  const command = program
    .command("onboard")
    .description("Interactive wizard to set up the gateway, workspace, and skills")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/onboard", "docs.molt.bot/cli/onboard")}\n`,
    )
    .option("--workspace <dir>", "Agent workspace directory (default: ~/clawd)")
    .option("--reset", "Reset config + credentials + sessions + workspace before running wizard")
    .option("--non-interactive", "Run without prompts", false)
    .option(
      "--accept-risk",
      "Acknowledge that agents are powerful and full system access is risky (required for --non-interactive)",
      false,
    )
    .option("--flow <flow>", "Wizard flow: quickstart|advanced|manual")
    .option("--mode <mode>", "Wizard mode: local|remote")
<<<<<<< HEAD
    .option(
      "--auth-choice <choice>",
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      "Auth: setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|xiaomi-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|skip",
=======
      "Auth: setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ai-gateway-api-key|moonshot-api-key|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|xiaomi-api-key|qianfan-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|skip",
>>>>>>> 30ac80b96 (Add baidu qianfan model provider)
=======
      "Auth: setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ai-gateway-api-key|cloudflare-ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|xiaomi-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|skip",
>>>>>>> 5b0851ebd (feat: add cloudflare ai gateway provider)
=======
      "Auth: setup-token|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ai-gateway-api-key|cloudflare-ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|xiaomi-api-key|xai-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|skip",
>>>>>>> db31c0ccc (feat: add xAI Grok provider support)
=======
      "Auth: setup-token|token|chutes|openai-codex|openai-api-key|xai-api-key|openrouter-api-key|ai-gateway-api-key|cloudflare-ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|xiaomi-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|skip",
>>>>>>> 8d0e7997c (chore(onboard): move xAI up in auth list)
=======
      "Auth: setup-token|token|chutes|openai-codex|openai-api-key|xai-api-key|qianfan-api-key|openrouter-api-key|ai-gateway-api-key|cloudflare-ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|xiaomi-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|skip|together-api-key",
>>>>>>> 661279cbf (feat: adding support for Together ai provider (#10304))
=======
      "Auth: setup-token|token|chutes|openai-codex|openai-api-key|xai-api-key|qianfan-api-key|openrouter-api-key|litellm-api-key|ai-gateway-api-key|cloudflare-ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|xiaomi-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|skip|together-api-key",
>>>>>>> a36b9be24 (Feat/litellm provider (#12823))
=======
      "Auth: setup-token|token|chutes|openai-codex|openai-api-key|xai-api-key|qianfan-api-key|openrouter-api-key|litellm-api-key|ai-gateway-api-key|cloudflare-ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|xiaomi-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|custom-api-key|skip|together-api-key",
>>>>>>> 029b77c85 (onboard: support custom provider in non-interactive flow (#14223))
=======
      "Auth: setup-token|token|chutes|openai-codex|openai-api-key|xai-api-key|qianfan-api-key|openrouter-api-key|litellm-api-key|ai-gateway-api-key|cloudflare-ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|zai-coding-global|zai-coding-cn|zai-global|zai-cn|xiaomi-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|custom-api-key|skip|together-api-key",
>>>>>>> 540996f10 (feat(provider): Z.AI endpoints + model catalog (#13456) (thanks @tomsun28) (#13456))
=======
      "Auth: setup-token|token|chutes|vllm|openai-codex|openai-api-key|xai-api-key|qianfan-api-key|openrouter-api-key|litellm-api-key|ai-gateway-api-key|cloudflare-ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|zai-coding-global|zai-coding-cn|zai-global|zai-cn|xiaomi-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|custom-api-key|skip|together-api-key",
>>>>>>> e73d881c5 (Onboarding: add vLLM provider support)
=======
      "Auth: setup-token|token|chutes|openai-codex|openai-api-key|xai-api-key|qianfan-api-key|openrouter-api-key|litellm-api-key|ai-gateway-api-key|cloudflare-ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|zai-coding-global|zai-coding-cn|zai-global|zai-cn|xiaomi-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|custom-api-key|skip|together-api-key|huggingface-api-key",
      "Auth: setup-token|token|chutes|vllm|openai-codex|openai-api-key|xai-api-key|qianfan-api-key|openrouter-api-key|litellm-api-key|ai-gateway-api-key|cloudflare-ai-gateway-api-key|moonshot-api-key|moonshot-api-key-cn|kimi-code-api-key|synthetic-api-key|venice-api-key|gemini-api-key|zai-api-key|zai-coding-global|zai-coding-cn|zai-global|zai-cn|xiaomi-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|custom-api-key|skip|together-api-key|huggingface-api-key",
>>>>>>> 08b7932df (feat(agents) : Hugging Face Inference provider first-class support and Together API fix and Direct Injection Refactor Auths [AI-assisted] (#13472))
    )
=======
    .option("--auth-choice <choice>", `Auth: ${AUTH_CHOICE_HELP}`)
>>>>>>> eab9dc538 (refactor(onboard): unify auth-choice catalog for CLI help)
    .option(
      "--token-provider <id>",
      "Token provider id (non-interactive; used with --auth-choice token)",
    )
    .option("--token <token>", "Token value (non-interactive; used with --auth-choice token)")
    .option(
      "--token-profile-id <id>",
      "Auth profile id (non-interactive; default: <provider>:manual)",
    )
    .option("--token-expires-in <duration>", "Optional token expiry duration (e.g. 365d, 12h)")
    .option("--cloudflare-ai-gateway-account-id <id>", "Cloudflare Account ID")
<<<<<<< HEAD
    .option("--cloudflare-ai-gateway-gateway-id <id>", "Cloudflare AI Gateway ID")
    .option("--cloudflare-ai-gateway-api-key <key>", "Cloudflare AI Gateway API key")
    .option("--moonshot-api-key <key>", "Moonshot API key")
    .option("--kimi-code-api-key <key>", "Kimi Coding API key")
    .option("--gemini-api-key <key>", "Gemini API key")
    .option("--zai-api-key <key>", "Z.AI API key")
    .option("--xiaomi-api-key <key>", "Xiaomi API key")
    .option("--qianfan-api-key <key>", "QIANFAN API key")
    .option("--minimax-api-key <key>", "MiniMax API key")
    .option("--synthetic-api-key <key>", "Synthetic API key")
    .option("--venice-api-key <key>", "Venice API key")
    .option("--together-api-key <key>", "Together AI API key")
    .option("--huggingface-api-key <key>", "Hugging Face API key (HF token)")
    .option("--opencode-zen-api-key <key>", "OpenCode Zen API key")
    .option("--xai-api-key <key>", "xAI API key")
<<<<<<< HEAD
=======
    .option("--litellm-api-key <key>", "LiteLLM API key")
    .option("--qianfan-api-key <key>", "QIANFAN API key")
<<<<<<< HEAD
>>>>>>> a36b9be24 (Feat/litellm provider (#12823))
=======
=======
    .option("--cloudflare-ai-gateway-gateway-id <id>", "Cloudflare AI Gateway ID");

  for (const providerFlag of ONBOARD_PROVIDER_AUTH_FLAGS) {
    command.option(providerFlag.cliOption, providerFlag.description);
  }

  command
>>>>>>> d8beddc8b (refactor(onboard): unify auth-choice aliases and provider flags)
    .option("--custom-base-url <url>", "Custom provider base URL")
    .option("--custom-api-key <key>", "Custom provider API key (optional)")
    .option("--custom-model-id <id>", "Custom provider model ID")
    .option("--custom-provider-id <id>", "Custom provider ID (optional; auto-derived by default)")
    .option(
      "--custom-compatibility <mode>",
      "Custom provider API compatibility: openai|anthropic (default: openai)",
    )
>>>>>>> 029b77c85 (onboard: support custom provider in non-interactive flow (#14223))
    .option("--gateway-port <port>", "Gateway port")
    .option("--gateway-bind <mode>", "Gateway bind: loopback|tailnet|lan|auto|custom")
    .option("--gateway-auth <mode>", "Gateway auth: token|password")
    .option("--gateway-token <token>", "Gateway token (token auth)")
    .option("--gateway-password <password>", "Gateway password (password auth)")
    .option("--remote-url <url>", "Remote Gateway WebSocket URL")
    .option("--remote-token <token>", "Remote Gateway token (optional)")
    .option("--tailscale <mode>", "Tailscale: off|serve|funnel")
    .option("--tailscale-reset-on-exit", "Reset tailscale serve/funnel on exit")
    .option("--install-daemon", "Install gateway service")
    .option("--no-install-daemon", "Skip gateway service install")
    .option("--skip-daemon", "Skip gateway service install")
    .option("--daemon-runtime <runtime>", "Daemon runtime: node|bun")
    .option("--skip-channels", "Skip channel setup")
    .option("--skip-skills", "Skip skills setup")
    .option("--skip-health", "Skip health check")
    .option("--skip-ui", "Skip Control UI/TUI prompts")
    .option("--node-manager <name>", "Node manager for skills: npm|pnpm|bun")
    .option("--json", "Output JSON summary", false);

  command.action(async (opts, commandRuntime) => {
    await runCommandWithRuntime(defaultRuntime, async () => {
      const installDaemon = resolveInstallDaemonFlag(commandRuntime, {
        installDaemon: Boolean(opts.installDaemon),
      });
      const gatewayPort =
        typeof opts.gatewayPort === "string" ? Number.parseInt(opts.gatewayPort, 10) : undefined;
      await onboardCommand(
        {
          workspace: opts.workspace as string | undefined,
          nonInteractive: Boolean(opts.nonInteractive),
          acceptRisk: Boolean(opts.acceptRisk),
          flow: opts.flow as "quickstart" | "advanced" | "manual" | undefined,
          mode: opts.mode as "local" | "remote" | undefined,
          authChoice: opts.authChoice as AuthChoice | undefined,
          tokenProvider: opts.tokenProvider as string | undefined,
          token: opts.token as string | undefined,
          tokenProfileId: opts.tokenProfileId as string | undefined,
          tokenExpiresIn: opts.tokenExpiresIn as string | undefined,
          anthropicApiKey: opts.anthropicApiKey as string | undefined,
          openaiApiKey: opts.openaiApiKey as string | undefined,
          openrouterApiKey: opts.openrouterApiKey as string | undefined,
          aiGatewayApiKey: opts.aiGatewayApiKey as string | undefined,
          cloudflareAiGatewayAccountId: opts.cloudflareAiGatewayAccountId as string | undefined,
          cloudflareAiGatewayGatewayId: opts.cloudflareAiGatewayGatewayId as string | undefined,
          cloudflareAiGatewayApiKey: opts.cloudflareAiGatewayApiKey as string | undefined,
          moonshotApiKey: opts.moonshotApiKey as string | undefined,
          kimiCodeApiKey: opts.kimiCodeApiKey as string | undefined,
          geminiApiKey: opts.geminiApiKey as string | undefined,
          zaiApiKey: opts.zaiApiKey as string | undefined,
          xiaomiApiKey: opts.xiaomiApiKey as string | undefined,
          qianfanApiKey: opts.qianfanApiKey as string | undefined,
          minimaxApiKey: opts.minimaxApiKey as string | undefined,
          syntheticApiKey: opts.syntheticApiKey as string | undefined,
          veniceApiKey: opts.veniceApiKey as string | undefined,
          togetherApiKey: opts.togetherApiKey as string | undefined,
          huggingfaceApiKey: opts.huggingfaceApiKey as string | undefined,
          opencodeZenApiKey: opts.opencodeZenApiKey as string | undefined,
          xaiApiKey: opts.xaiApiKey as string | undefined,
          litellmApiKey: opts.litellmApiKey as string | undefined,
          customBaseUrl: opts.customBaseUrl as string | undefined,
          customApiKey: opts.customApiKey as string | undefined,
          customModelId: opts.customModelId as string | undefined,
          customProviderId: opts.customProviderId as string | undefined,
          customCompatibility: opts.customCompatibility as "openai" | "anthropic" | undefined,
          gatewayPort:
            typeof gatewayPort === "number" && Number.isFinite(gatewayPort)
              ? gatewayPort
              : undefined,
          gatewayBind: opts.gatewayBind as GatewayBind | undefined,
          gatewayAuth: opts.gatewayAuth as GatewayAuthChoice | undefined,
          gatewayToken: opts.gatewayToken as string | undefined,
          gatewayPassword: opts.gatewayPassword as string | undefined,
          remoteUrl: opts.remoteUrl as string | undefined,
          remoteToken: opts.remoteToken as string | undefined,
          tailscale: opts.tailscale as TailscaleMode | undefined,
          tailscaleResetOnExit: Boolean(opts.tailscaleResetOnExit),
          reset: Boolean(opts.reset),
          installDaemon,
          daemonRuntime: opts.daemonRuntime as GatewayDaemonRuntime | undefined,
          skipChannels: Boolean(opts.skipChannels),
          skipSkills: Boolean(opts.skipSkills),
          skipHealth: Boolean(opts.skipHealth),
          skipUi: Boolean(opts.skipUi),
          nodeManager: opts.nodeManager as NodeManagerChoice | undefined,
          json: Boolean(opts.json),
        },
        defaultRuntime,
      );
    });
  });
}
