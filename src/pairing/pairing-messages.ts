import { formatCliCommand } from "../cli/command-format.js";
import type { PairingChannel } from "./pairing-store.js";

export function buildPairingReply(params: {
  channel: PairingChannel;
  idLine: string;
  code: string;
}): string {
  const { channel, idLine, code } = params;
  return [
    "Moltbot: access not configured.",
    "",
    idLine,
    "",
    `Pairing code: ${code}`,
    "",
    "Ask the bot owner to approve with:",
<<<<<<< HEAD
    formatCliCommand(`moltbot pairing approve ${channel} <code>`),
=======
    formatCliCommand(`openclaw pairing approve ${channel} ${code}`),
>>>>>>> 74273d62d (fix(pairing): show actual code in approval command instead of placeholder (#13723))
  ].join("\n");
}
