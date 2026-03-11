import type { Db } from "@paperclipai/db";
import { issueProgressService } from "./issue-progress.js";
import { issueService } from "./issues.js";

export type ApprovalLifecycleTrigger = "created" | "approved" | "rejected" | "revision_requested" | "resubmitted";

export interface ApprovalLifecycleIssue {
  id: string;
  companyId: string;
  identifier?: string | null;
  title?: string | null;
  status: string;
}

export interface ApprovalLifecycleApproval {
  id: string;
  type: string;
  status: string;
}

export interface ApprovalLifecycleActor {
  actorType: "agent" | "user";
  actorId: string;
  agentId?: string | null;
  runId?: string | null;
}

interface SyncApprovalLifecycleParams {
  approval: ApprovalLifecycleApproval;
  linkedIssues: ApprovalLifecycleIssue[];
  trigger: ApprovalLifecycleTrigger;
  actor: ApprovalLifecycleActor;
  executionResult?: Record<string, unknown> | null;
}

function executionSucceeded(executionResult?: Record<string, unknown> | null) {
  const status = typeof executionResult?.status === "string" ? executionResult.status.toLowerCase() : null;
  return status === "succeeded" || status === "success" || status === "completed";
}

function executionFailed(executionResult?: Record<string, unknown> | null) {
  const status = typeof executionResult?.status === "string" ? executionResult.status.toLowerCase() : null;
  return status === "failed" || status === "error";
}

export function deriveIssueStatusFromApprovalLifecycle(input: {
  issueStatus: string;
  approvalType: string;
  trigger: ApprovalLifecycleTrigger;
  executionResult?: Record<string, unknown> | null;
}): string | null {
  const approvalType = input.approvalType;

  if (approvalType === "human_decision") {
    if ((input.trigger === "created" || input.trigger === "resubmitted") && input.issueStatus === "in_progress") {
      return "in_review";
    }
    if ((input.trigger === "rejected" || input.trigger === "revision_requested") && input.issueStatus === "in_review") {
      return "in_progress";
    }
    if (input.trigger === "approved" && (input.issueStatus === "in_review" || input.issueStatus === "in_progress")) {
      return "done";
    }
    return null;
  }

  if (approvalType === "action_execution") {
    if ((input.trigger === "created" || input.trigger === "resubmitted") && input.issueStatus === "in_progress") {
      return "in_review";
    }
    if ((input.trigger === "rejected" || input.trigger === "revision_requested") && input.issueStatus === "in_review") {
      return "in_progress";
    }
    if (input.trigger === "approved") {
      if (executionFailed(input.executionResult)) return "blocked";
      if (executionSucceeded(input.executionResult) && (input.issueStatus === "in_review" || input.issueStatus === "in_progress")) {
        return "done";
      }
    }
    return null;
  }

  return null;
}

export function buildApprovalLifecycleComment(input: {
  issueIdentifier?: string | null;
  approval: ApprovalLifecycleApproval;
  trigger: ApprovalLifecycleTrigger;
  nextStatus: string | null;
  executionResult?: Record<string, unknown> | null;
}) {
  const issueLabel = input.issueIdentifier ?? "this issue";
  const base = `Approval ${input.approval.id} (${input.approval.type}) ${input.trigger.replaceAll("_", " ")} for ${issueLabel}.`;
  const statusPart = input.nextStatus ? ` Issue status auto-updated to ${input.nextStatus}.` : "";

  if (input.approval.type === "action_execution" && input.trigger === "approved" && input.executionResult) {
    const execStatus = typeof input.executionResult.status === "string" ? input.executionResult.status : "unknown";
    return `${base} Execution result: ${execStatus}.${statusPart}`;
  }

  return `${base}${statusPart}`;
}

function toProgressActor(actor: ApprovalLifecycleActor) {
  if (actor.actorType === "agent") {
    return {
      actorType: "agent" as const,
      actorAgentId: actor.agentId ?? actor.actorId,
      runId: actor.runId ?? null,
    };
  }
  return {
    actorType: "user" as const,
    actorUserId: actor.actorId,
    runId: actor.runId ?? null,
  };
}

export async function syncLinkedIssuesForApprovalLifecycle(db: Db, params: SyncApprovalLifecycleParams) {
  const issuesSvc = issueService(db);
  const progressSvc = issueProgressService(db);

  for (const issue of params.linkedIssues) {
    const nextStatus = deriveIssueStatusFromApprovalLifecycle({
      issueStatus: issue.status,
      approvalType: params.approval.type,
      trigger: params.trigger,
      executionResult: params.executionResult,
    });

    if (nextStatus && nextStatus !== issue.status) {
      await issuesSvc.update(issue.id, { status: nextStatus });
    }

    const comment = buildApprovalLifecycleComment({
      issueIdentifier: issue.identifier,
      approval: params.approval,
      trigger: params.trigger,
      nextStatus,
      executionResult: params.executionResult,
    });

    await issuesSvc.addComment(issue.id, comment, {
      agentId: params.actor.actorType === "agent" ? (params.actor.agentId ?? params.actor.actorId) : undefined,
      userId: params.actor.actorType === "user" ? params.actor.actorId : undefined,
    });

    await progressSvc.record({
      companyId: issue.companyId,
      issueId: issue.id,
      eventType: `approval_${params.trigger}`,
      actor: toProgressActor(params.actor),
      metadata: {
        approvalId: params.approval.id,
        approvalType: params.approval.type,
        approvalStatus: params.approval.status,
        nextStatus,
        executionStatus: params.executionResult?.status ?? null,
      },
    });
  }
}
