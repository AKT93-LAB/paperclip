import { describe, expect, it } from "vitest";

describe("openclaw no-reply recovery policy", () => {
  it("documents intended one-shot recovery semantics", () => {
    const shouldRecover = ({
      adapterType,
      status,
      errorCode,
      issueId,
      taskKey,
      invocationSource,
      recoveryAttempt,
    }: {
      adapterType: string;
      status: string;
      errorCode: string | null;
      issueId: string | null;
      taskKey: string | null;
      invocationSource: string;
      recoveryAttempt: number;
    }) => {
      if (adapterType !== "openclaw") return false;
      if (status !== "failed") return false;
      if (errorCode !== "openclaw_no_reply") return false;
      if (!issueId || !taskKey) return false;
      if (invocationSource === "timer") return false;
      if (recoveryAttempt >= 1) return false;
      return true;
    };

    expect(
      shouldRecover({
        adapterType: "openclaw",
        status: "failed",
        errorCode: "openclaw_no_reply",
        issueId: "issue-1",
        taskKey: "issue-1",
        invocationSource: "on_demand",
        recoveryAttempt: 0,
      }),
    ).toBe(true);

    expect(
      shouldRecover({
        adapterType: "openclaw",
        status: "failed",
        errorCode: "openclaw_no_reply",
        issueId: "issue-1",
        taskKey: "issue-1",
        invocationSource: "on_demand",
        recoveryAttempt: 1,
      }),
    ).toBe(false);
  });
});
