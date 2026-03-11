import { describe, expect, it } from "vitest";
import { deriveIssueStatusFromApprovalLifecycle } from "../services/approval-issue-lifecycle.js";

describe("deriveIssueStatusFromApprovalLifecycle", () => {
  it("moves in-progress human-decision work to in_review when approval is created", () => {
    expect(
      deriveIssueStatusFromApprovalLifecycle({
        issueStatus: "in_progress",
        approvalType: "human_decision",
        trigger: "created",
      }),
    ).toBe("in_review");
  });

  it("moves human-decision work to done when approved", () => {
    expect(
      deriveIssueStatusFromApprovalLifecycle({
        issueStatus: "in_review",
        approvalType: "human_decision",
        trigger: "approved",
      }),
    ).toBe("done");
  });

  it("reopens in-review human-decision work on revision request", () => {
    expect(
      deriveIssueStatusFromApprovalLifecycle({
        issueStatus: "in_review",
        approvalType: "human_decision",
        trigger: "revision_requested",
      }),
    ).toBe("in_progress");
  });

  it("blocks action execution work when execution approval resolves with failure", () => {
    expect(
      deriveIssueStatusFromApprovalLifecycle({
        issueStatus: "in_review",
        approvalType: "action_execution",
        trigger: "approved",
        executionResult: { status: "failed" },
      }),
    ).toBe("blocked");
  });
});
