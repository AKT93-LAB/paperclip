import { describe, expect, it } from "vitest";
import { shouldResetTaskSessionForWake } from "../services/heartbeat.js";

describe("shouldResetTaskSessionForWake", () => {
  it("resets for manual invokes", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeSource: "on_demand",
        wakeTriggerDetail: "manual",
      }),
    ).toBe(true);
  });

  it("resets for issue assignment", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeReason: "issue_assigned",
      }),
    ).toBe(true);
  });

  it("resets for no-reply recovery", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeReason: "openclaw_no_reply_recovery",
      }),
    ).toBe(true);
  });

  it("resets for stale issue wakes", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeReason: "issue_stale",
      }),
    ).toBe(true);
  });

  it("does not reset for ordinary issue comments", () => {
    expect(
      shouldResetTaskSessionForWake({
        wakeReason: "issue_commented",
      }),
    ).toBe(false);
  });
});
