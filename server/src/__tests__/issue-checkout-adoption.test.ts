import { describe, expect, it } from "vitest";

describe("issue checkout adoption policy", () => {
  it("allows assignee run to adopt an in-progress issue when checkoutRunId is null", () => {
    const canAdopt = ({
      status,
      assigneeAgentId,
      actorAgentId,
      checkoutRunId,
      executionRunId,
      actorRunId,
    }: {
      status: string;
      assigneeAgentId: string | null;
      actorAgentId: string;
      checkoutRunId: string | null;
      executionRunId: string | null;
      actorRunId: string | null;
    }) => {
      return Boolean(
        actorRunId &&
          status === "in_progress" &&
          assigneeAgentId === actorAgentId &&
          checkoutRunId == null &&
          (executionRunId == null || executionRunId === actorRunId),
      );
    };

    expect(
      canAdopt({
        status: "in_progress",
        assigneeAgentId: "agent-1",
        actorAgentId: "agent-1",
        checkoutRunId: null,
        executionRunId: null,
        actorRunId: "run-1",
      }),
    ).toBe(true);
  });

  it("does not adopt when another execution run already owns the issue", () => {
    const canAdopt = ({
      status,
      assigneeAgentId,
      actorAgentId,
      checkoutRunId,
      executionRunId,
      actorRunId,
    }: {
      status: string;
      assigneeAgentId: string | null;
      actorAgentId: string;
      checkoutRunId: string | null;
      executionRunId: string | null;
      actorRunId: string | null;
    }) => {
      return Boolean(
        actorRunId &&
          status === "in_progress" &&
          assigneeAgentId === actorAgentId &&
          checkoutRunId == null &&
          (executionRunId == null || executionRunId === actorRunId),
      );
    };

    expect(
      canAdopt({
        status: "in_progress",
        assigneeAgentId: "agent-1",
        actorAgentId: "agent-1",
        checkoutRunId: null,
        executionRunId: "run-2",
        actorRunId: "run-1",
      }),
    ).toBe(false);
  });
});
