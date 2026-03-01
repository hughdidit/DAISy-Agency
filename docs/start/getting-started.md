---
summary: "Get OpenClaw installed and run your first chat in minutes."
read_when:
  - First time setup from zero
  - You want the fastest path to a working chat
title: "Getting Started"
---

# Getting Started

Goal: go from zero to a first working chat with minimal setup.

<<<<<<< HEAD
Fastest chat: open the Control UI (no channel setup needed). Run `moltbot dashboard`
and chat in the browser, or open `http://127.0.0.1:18789/` on the gateway host.
=======
<Info>
Fastest chat: open the Control UI (no channel setup needed). Run `openclaw dashboard`
and chat in the browser, or open `http://127.0.0.1:18789/` on the
<Tooltip headline="Gateway host" tip="The machine running the OpenClaw gateway service.">gateway host</Tooltip>.
>>>>>>> 675c26b2b (Docs: streamline start and install docs (#9648))
Docs: [Dashboard](/web/dashboard) and [Control UI](/web/control-ui).
</Info>

<<<<<<< HEAD
Recommended path: use the **CLI onboarding wizard** (`moltbot onboard`). It sets up:
- model/auth (OAuth recommended)
- gateway settings
- channels (WhatsApp/Telegram/Discord/Mattermost (plugin)/...)
- pairing defaults (secure DMs)
- workspace bootstrap + skills
- optional background service
=======
## Prereqs

- Node 22 or newer
>>>>>>> 675c26b2b (Docs: streamline start and install docs (#9648))

<Tip>
Check your Node version with `node --version` if you are unsure.
</Tip>

## Quick setup (CLI)

<<<<<<< HEAD
```json
{
  "routing": {
    "agents": {
      "main": {
        "workspace": "~/clawd",
        "sandbox": { "mode": "off" }
      }
    }
  }
}
```
=======
<Steps>
  <Step title="Install OpenClaw (recommended)">
    <Tabs>
      <Tab title="macOS/Linux">
        ```bash
        curl -fsSL https://openclaw.ai/install.sh | bash
        ```
      </Tab>
      <Tab title="Windows (PowerShell)">
        ```powershell
        iwr -useb https://openclaw.ai/install.ps1 | iex
        ```
      </Tab>
    </Tabs>
>>>>>>> 675c26b2b (Docs: streamline start and install docs (#9648))

    <Note>
    Other install methods and requirements: [Install](/install).
    </Note>

<<<<<<< HEAD
- Node `>=22`
- `pnpm` (optional; recommended if you build from source)
- **Recommended:** Brave Search API key for web search. Easiest path:
  `moltbot configure --section web` (stores `tools.web.search.apiKey`).
  See [Web tools](/tools/web).
=======
  </Step>
  <Step title="Run the onboarding wizard">
    ```bash
    openclaw onboard --install-daemon
    ```
>>>>>>> 675c26b2b (Docs: streamline start and install docs (#9648))

    The wizard configures auth, gateway settings, and optional channels.
    See [Onboarding Wizard](/start/wizard) for details.

  </Step>
  <Step title="Check the Gateway">
    If you installed the service, it should already be running:

<<<<<<< HEAD
```bash
<<<<<<< HEAD
curl -fsSL https://molt.bot/install.sh | bash
=======
curl -fsSL https://openclaw.ai/install.sh | bash
>>>>>>> 7a2c4d3cf (fix(docs): use canonical openclaw.ai domain instead of openclaw.bot)
```
=======
    ```bash
    openclaw gateway status
    ```
>>>>>>> 675c26b2b (Docs: streamline start and install docs (#9648))

  </Step>
  <Step title="Open the Control UI">
    ```bash
    openclaw dashboard
    ```
  </Step>
</Steps>

<Check>
If the Control UI loads, your Gateway is ready for use.
</Check>

<<<<<<< HEAD
```powershell
iwr -useb https://molt.bot/install.ps1 | iex
```
=======
## Optional checks and extras
>>>>>>> 675c26b2b (Docs: streamline start and install docs (#9648))

<AccordionGroup>
  <Accordion title="Run the Gateway in the foreground">
    Useful for quick tests or troubleshooting.

<<<<<<< HEAD
```bash
npm install -g moltbot@latest
```

```bash
pnpm add -g moltbot@latest
```
=======
    ```bash
    openclaw gateway --port 18789
    ```

  </Accordion>
  <Accordion title="Send a test message">
    Requires a configured channel.
>>>>>>> 675c26b2b (Docs: streamline start and install docs (#9648))

    ```bash
    openclaw message send --target +15555550123 --message "Hello from OpenClaw"
    ```

<<<<<<< HEAD
```bash
moltbot onboard --install-daemon
```

What you’ll choose:
- **Local vs Remote** gateway
- **Auth**: OpenAI Code (Codex) subscription (OAuth) or API keys. For Anthropic we recommend an API key; `claude setup-token` is also supported.
- **Providers**: WhatsApp QR login, Telegram/Discord bot tokens, Mattermost plugin tokens, etc.
- **Daemon**: background install (launchd/systemd; WSL2 uses systemd)
  - **Runtime**: Node (recommended; required for WhatsApp/Telegram). Bun is **not recommended**.
- **Gateway token**: the wizard generates one by default (even on loopback) and stores it in `gateway.auth.token`.
=======
  </Accordion>
</AccordionGroup>

## Go deeper

<Columns>
  <Card title="Onboarding Wizard (details)" href="/start/wizard">
    Full CLI wizard reference and advanced options.
  </Card>
  <Card title="macOS app onboarding" href="/start/onboarding">
    First run flow for the macOS app.
  </Card>
</Columns>
>>>>>>> 675c26b2b (Docs: streamline start and install docs (#9648))

## What you will have

- A running Gateway
- Auth configured
- Control UI access or a connected channel

## Next steps

<<<<<<< HEAD
- OAuth credentials (legacy import): `~/.clawdbot/credentials/oauth.json`
- Auth profiles (OAuth + API keys): `~/.clawdbot/agents/<agentId>/agent/auth-profiles.json`

Headless/server tip: do OAuth on a normal machine first, then copy `oauth.json` to the gateway host.

## 3) Start the Gateway

If you installed the service during onboarding, the Gateway should already be running:

```bash
moltbot gateway status
```

Manual run (foreground):

```bash
moltbot gateway --port 18789 --verbose
```

Dashboard (local loopback): `http://127.0.0.1:18789/`
If a token is configured, paste it into the Control UI settings (stored as `connect.params.auth.token`).

⚠️ **Bun warning (WhatsApp + Telegram):** Bun has known issues with these
channels. If you use WhatsApp or Telegram, run the Gateway with **Node**.

## 3.5) Quick verify (2 min)

```bash
moltbot status
moltbot health
moltbot security audit --deep
```

## 4) Pair + connect your first chat surface

### WhatsApp (QR login)

```bash
moltbot channels login
```

Scan via WhatsApp → Settings → Linked Devices.

WhatsApp doc: [WhatsApp](/channels/whatsapp)

### Telegram / Discord / others

The wizard can write tokens/config for you. If you prefer manual config, start with:
- Telegram: [Telegram](/channels/telegram)
- Discord: [Discord](/channels/discord)
- Mattermost (plugin): [Mattermost](/channels/mattermost)

**Telegram DM tip:** your first DM returns a pairing code. Approve it (see next step) or the bot won’t respond.

## 5) DM safety (pairing approvals)

Default posture: unknown DMs get a short code and messages are not processed until approved.
If your first DM gets no reply, approve the pairing:

```bash
moltbot pairing list whatsapp
moltbot pairing approve whatsapp <code>
```

Pairing doc: [Pairing](/start/pairing)

## From source (development)

If you’re hacking on Moltbot itself, run from source:

```bash
git clone https://github.com/moltbot/moltbot.git
cd moltbot
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
moltbot onboard --install-daemon
```

If you don’t have a global install yet, run the onboarding step via `pnpm moltbot ...` from the repo.
`pnpm build` also bundles A2UI assets; if you need to run just that step, use `pnpm canvas:a2ui:bundle`.

Gateway (from this repo):

```bash
node moltbot.mjs gateway --port 18789 --verbose
```

## 7) Verify end-to-end

In a new terminal, send a test message:

```bash
moltbot message send --target +15555550123 --message "Hello from Moltbot"
```

If `moltbot health` shows “no auth configured”, go back to the wizard and set OAuth/key auth — the agent won’t be able to respond without it.

Tip: `moltbot status --all` is the best pasteable, read-only debug report.
Health probes: `moltbot health` (or `moltbot status --deep`) asks the running gateway for a health snapshot.

## Next steps (optional, but great)

- macOS menu bar app + voice wake: [macOS app](/platforms/macos)
- iOS/Android nodes (Canvas/camera/voice): [Nodes](/nodes)
- Remote access (SSH tunnel / Tailscale Serve): [Remote access](/gateway/remote) and [Tailscale](/gateway/tailscale)
- Always-on / VPN setups: [Remote access](/gateway/remote), [exe.dev](/platforms/exe-dev), [Hetzner](/platforms/hetzner), [macOS remote](/platforms/mac/remote)
=======
- DM safety and approvals: [Pairing](/start/pairing)
- Connect more channels: [Channels](/channels)
- Advanced workflows and from source: [Setup](/start/setup)
>>>>>>> 675c26b2b (Docs: streamline start and install docs (#9648))
