<<<<<<< HEAD
import { loadLogs } from "./controllers/logs";
import { loadNodes } from "./controllers/nodes";
import { loadDebug } from "./controllers/debug";
import type { MoltbotApp } from "./app";
=======
import type { OpenClawApp } from "./app.ts";
import { loadDebug } from "./controllers/debug.ts";
import { loadLogs } from "./controllers/logs.ts";
import { loadNodes } from "./controllers/nodes.ts";
>>>>>>> 6e09c1142 (chore: Switch to `NodeNext` for `module`/`moduleResolution` in `ui`.)

type PollingHost = {
  nodesPollInterval: number | null;
  logsPollInterval: number | null;
  debugPollInterval: number | null;
  tab: string;
};

export function startNodesPolling(host: PollingHost) {
  if (host.nodesPollInterval != null) {
    return;
  }
  host.nodesPollInterval = window.setInterval(
    () => void loadNodes(host as unknown as MoltbotApp, { quiet: true }),
    5000,
  );
}

export function stopNodesPolling(host: PollingHost) {
  if (host.nodesPollInterval == null) {
    return;
  }
  clearInterval(host.nodesPollInterval);
  host.nodesPollInterval = null;
}

export function startLogsPolling(host: PollingHost) {
  if (host.logsPollInterval != null) {
    return;
  }
  host.logsPollInterval = window.setInterval(() => {
<<<<<<< HEAD
<<<<<<< HEAD
    if (host.tab !== "logs") return;
    void loadLogs(host as unknown as MoltbotApp, { quiet: true });
=======
    if (host.tab !== "logs") {return;}
=======
    if (host.tab !== "logs") {
      return;
    }
>>>>>>> e9a32b83c (chore: Manually fix lint issues in `ui`.)
    void loadLogs(host as unknown as OpenClawApp, { quiet: true });
>>>>>>> 5ba4586e5 (chore: lint the `ui` folder.)
  }, 2000);
}

export function stopLogsPolling(host: PollingHost) {
  if (host.logsPollInterval == null) {
    return;
  }
  clearInterval(host.logsPollInterval);
  host.logsPollInterval = null;
}

export function startDebugPolling(host: PollingHost) {
  if (host.debugPollInterval != null) {
    return;
  }
  host.debugPollInterval = window.setInterval(() => {
<<<<<<< HEAD
<<<<<<< HEAD
    if (host.tab !== "debug") return;
    void loadDebug(host as unknown as MoltbotApp);
=======
    if (host.tab !== "debug") {return;}
=======
    if (host.tab !== "debug") {
      return;
    }
>>>>>>> e9a32b83c (chore: Manually fix lint issues in `ui`.)
    void loadDebug(host as unknown as OpenClawApp);
>>>>>>> 5ba4586e5 (chore: lint the `ui` folder.)
  }, 3000);
}

export function stopDebugPolling(host: PollingHost) {
  if (host.debugPollInterval == null) {
    return;
  }
  clearInterval(host.debugPollInterval);
  host.debugPollInterval = null;
}
