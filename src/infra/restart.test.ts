<<<<<<< HEAD
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __testing,
  consumeGatewaySigusr1RestartAuthorization,
  isGatewaySigusr1RestartExternallyAllowed,
  scheduleGatewaySigusr1Restart,
  setGatewaySigusr1RestartPolicy,
} from "./restart.js";

describe("restart authorization", () => {
  beforeEach(() => {
    __testing.resetSigusr1State();
    vi.useFakeTimers();
    vi.spyOn(process, "kill").mockImplementation(() => true);
  });

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
    vi.restoreAllMocks();
    __testing.resetSigusr1State();
  });

  it("consumes a scheduled authorization once", async () => {
    expect(consumeGatewaySigusr1RestartAuthorization()).toBe(false);

    scheduleGatewaySigusr1Restart({ delayMs: 0 });

    expect(consumeGatewaySigusr1RestartAuthorization()).toBe(true);
    expect(consumeGatewaySigusr1RestartAuthorization()).toBe(false);

    await vi.runAllTimersAsync();
  });

  it("tracks external restart policy", () => {
    expect(isGatewaySigusr1RestartExternallyAllowed()).toBe(false);
    setGatewaySigusr1RestartPolicy({ allowExternal: true });
    expect(isGatewaySigusr1RestartExternallyAllowed()).toBe(true);
=======
import { describe, expect, it } from "vitest";
import { findGatewayPidsOnPortSync } from "./restart.js";

describe("findGatewayPidsOnPortSync", () => {
  it("returns an empty array for a port with no listeners", () => {
    const pids = findGatewayPidsOnPortSync(19999);
    expect(pids).toEqual([]);
  });

  it("never includes the current process PID", () => {
    const pids = findGatewayPidsOnPortSync(18789);
    expect(pids).not.toContain(process.pid);
  });

  it("returns an array (not undefined or null) on any port", () => {
    const pids = findGatewayPidsOnPortSync(0);
    expect(Array.isArray(pids)).toBe(true);
>>>>>>> 63c6080d5 (fix: clean stale gateway PIDs before triggerOpenClawRestart calls launchctl/systemctl)
  });
});
