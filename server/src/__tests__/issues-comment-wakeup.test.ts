import { describe, expect, it } from "vitest";
import { shouldWakeAssigneeOnComment } from "../routes/issues-comment-wakeup.js";

describe("shouldWakeAssigneeOnComment", () => {
  it("wakes for board comments on assigned issues", () => {
    expect(
      shouldWakeAssigneeOnComment({
        actorType: "board",
        actorAgentId: null,
        assigneeAgentId: "agent-1",
        reopened: false,
        interruptedRunId: null,
        commentBody: "Please continue",
      }),
    ).toBe(true);
  });

  it("does not wake for internal agent comments", () => {
    expect(
      shouldWakeAssigneeOnComment({
        actorType: "agent",
        actorAgentId: "agent-1",
        assigneeAgentId: "agent-2",
        reopened: false,
        interruptedRunId: null,
        commentBody: "INTERNAL: working notes",
      }),
    ).toBe(false);
  });

  it("does not self-wake when an agent comments on its own assigned issue", () => {
    expect(
      shouldWakeAssigneeOnComment({
        actorType: "agent",
        actorAgentId: "agent-1",
        assigneeAgentId: "agent-1",
        reopened: false,
        interruptedRunId: null,
        commentBody: "Posting a strategy update",
      }),
    ).toBe(false);
  });

  it("still wakes when the issue is reopened via comment", () => {
    expect(
      shouldWakeAssigneeOnComment({
        actorType: "agent",
        actorAgentId: "agent-1",
        assigneeAgentId: "agent-1",
        reopened: true,
        interruptedRunId: null,
        commentBody: "Please reopen this work",
      }),
    ).toBe(true);
  });

  it("wakes assignee when another agent comments", () => {
    expect(
      shouldWakeAssigneeOnComment({
        actorType: "agent",
        actorAgentId: "agent-2",
        assigneeAgentId: "agent-1",
        reopened: false,
        interruptedRunId: null,
        commentBody: "@CEO review this",
      }),
    ).toBe(true);
  });
});
