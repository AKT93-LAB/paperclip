import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  addApprovalCommentSchema,
  createApprovalSchema,
  requestApprovalRevisionSchema,
  resolveApprovalSchema,
  resubmitApprovalSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { logger } from "../middleware/logger.js";
import {
  approvalService,
  actionExecutionService,
  heartbeatService,
  issueApprovalService,
  logActivity,
  secretService,
} from "../services/index.js";
import { normalizeApprovalPayloadArtifacts } from "../services/approval-artifacts.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { redactEventPayload } from "../redaction.js";

function redactApprovalPayload<T extends { type?: string; payload: Record<string, unknown> }>(approval: T): T {
  const redacted = (redactEventPayload(approval.payload) ?? {}) as Record<string, unknown>;
  const normalized = approval.type === "action_execution" ? normalizeApprovalPayloadArtifacts(redacted) : redacted;
  return {
    ...approval,
    payload: normalized,
  };
}

export function approvalRoutes(db: Db) {
  const router = Router();
  const svc = approvalService(db);
  const heartbeat = heartbeatService(db);
  const issueApprovalsSvc = issueApprovalService(db);
  const secretsSvc = secretService(db);
  const actionExecutions = actionExecutionService(db);
  const strictSecretsMode = process.env.PAPERCLIP_SECRETS_STRICT_MODE === "true";

  router.get("/companies/:companyId/approvals", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const status = req.query.status as string | undefined;
    const result = await svc.list(companyId, status);
    res.json(result.map((approval) => redactApprovalPayload(approval)));
  });

  router.get("/approvals/:id", async (req, res) => {
    const id = req.params.id as string;
    const approval = await svc.getById(id);
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    assertCompanyAccess(req, approval.companyId);
    res.json(redactApprovalPayload(approval));
  });

  router.post("/companies/:companyId/approvals", validate(createApprovalSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const rawIssueIds = req.body.issueIds;
    const issueIds = Array.isArray(rawIssueIds)
      ? rawIssueIds.filter((value: unknown): value is string => typeof value === "string")
      : [];
    const uniqueIssueIds = Array.from(new Set(issueIds));
    const { issueIds: _issueIds, ...approvalInput } = req.body;

    let normalizedPayload =
      approvalInput.type === "hire_agent"
        ? await secretsSvc.normalizeHireApprovalPayloadForPersistence(
            companyId,
            approvalInput.payload,
            { strictMode: strictSecretsMode },
          )
        : approvalInput.payload;

    if (approvalInput.type === "action_execution" && normalizedPayload && typeof normalizedPayload === "object") {
      normalizedPayload = normalizeApprovalPayloadArtifacts(normalizedPayload as Record<string, unknown>);
    }

    const actor = getActorInfo(req);
    const approval = await svc.create(companyId, {
      ...approvalInput,
      payload: normalizedPayload,
      requestedByUserId: actor.actorType === "user" ? actor.actorId : null,
      requestedByAgentId:
        approvalInput.requestedByAgentId ?? (actor.actorType === "agent" ? actor.actorId : null),
      status: "pending",
      decisionNote: null,
      decidedByUserId: null,
      decidedAt: null,
      updatedAt: new Date(),
    });

    if (uniqueIssueIds.length > 0) {
      await issueApprovalsSvc.linkManyForApproval(approval.id, uniqueIssueIds, {
        agentId: actor.agentId,
        userId: actor.actorType === "user" ? actor.actorId : null,
      });
    }

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "approval.created",
      entityType: "approval",
      entityId: approval.id,
      details: { type: approval.type, issueIds: uniqueIssueIds },
    });

    res.status(201).json(redactApprovalPayload(approval));
  });

  router.get("/approvals/:id/issues", async (req, res) => {
    const id = req.params.id as string;
    const approval = await svc.getById(id);
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    assertCompanyAccess(req, approval.companyId);
    const issues = await issueApprovalsSvc.listIssuesForApproval(id);
    res.json(issues);
  });

  router.post("/approvals/:id/approve", validate(resolveApprovalSchema), async (req, res) => {
    assertBoard(req);
    const id = req.params.id as string;
    const approval = await svc.approve(
      id,
      req.body.decidedByUserId ?? "board",
      req.body.decision,
      req.body.decisionNote,
    );
    const linkedIssues = await issueApprovalsSvc.listIssuesForApproval(approval.id);
    const linkedIssueIds = linkedIssues.map((issue) => issue.id);
    const primaryIssueId = linkedIssueIds[0] ?? null;

    // Enterprise action approvals: system executes the action on approval.
    let executionResult: Record<string, unknown> | null = null;
    if (approval.type === "action_execution") {
      const payload = (approval.payload ?? {}) as Record<string, unknown>;
      const action = (payload.action ?? payload) as Record<string, unknown>;
      const kind =
        typeof payload.actionType === "string"
          ? payload.actionType
          : typeof (action as any).kind === "string"
            ? (action as any).kind
            : "http_request";

      if (kind === "executor_call") {
        const exec = await actionExecutions.executeExecutorCall({
          companyId: approval.companyId,
          approvalId: approval.id,
          action,
        });
        executionResult = {
          executionId: exec.executionId,
          status: exec.status,
          result: exec.resultJson ?? null,
          error: exec.error ?? null,
        };
      } else if (kind !== "http_request" && kind !== "http" && kind !== "webhook") {
        executionResult = { status: "failed", error: `Unsupported action type: ${kind}` };
      } else {
        const exec = await actionExecutions.executeHttpAction({
          companyId: approval.companyId,
          approvalId: approval.id,
          action,
        });
        executionResult = {
          executionId: exec.executionId,
          status: exec.status,
          result: exec.resultJson ?? null,
          error: exec.error ?? null,
        };
      }
    }

    await logActivity(db, {
      companyId: approval.companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "approval.approved",
      entityType: "approval",
      entityId: approval.id,
      details: {
        type: approval.type,
        requestedByAgentId: approval.requestedByAgentId,
        linkedIssueIds,
        executionResult,
      },
    });

    if (approval.requestedByAgentId) {
      try {
        const wakeRun = await heartbeat.wakeup(approval.requestedByAgentId, {
          source: "automation",
          triggerDetail: "system",
          reason: "approval_approved",
          payload: {
            approvalId: approval.id,
            approvalStatus: approval.status,
            decisionJson: (approval as any).decisionJson ?? null,
            decisionNote: approval.decisionNote ?? null,
            executionResult,
            issueId: primaryIssueId,
            issueIds: linkedIssueIds,
          },
          requestedByActorType: "user",
          requestedByActorId: req.actor.userId ?? "board",
          contextSnapshot: {
            source: "approval.approved",
            approvalId: approval.id,
            approvalStatus: approval.status,
            issueId: primaryIssueId,
            issueIds: linkedIssueIds,
            taskId: primaryIssueId,
            wakeReason: "approval_approved",
          },
        });

        await logActivity(db, {
          companyId: approval.companyId,
          actorType: "user",
          actorId: req.actor.userId ?? "board",
          action: "approval.requester_wakeup_queued",
          entityType: "approval",
          entityId: approval.id,
          details: {
            requesterAgentId: approval.requestedByAgentId,
            wakeRunId: wakeRun?.id ?? null,
            linkedIssueIds,
          },
        });
      } catch (err) {
        logger.warn(
          {
            err,
            approvalId: approval.id,
            requestedByAgentId: approval.requestedByAgentId,
          },
          "failed to queue requester wakeup after approval",
        );
        await logActivity(db, {
          companyId: approval.companyId,
          actorType: "user",
          actorId: req.actor.userId ?? "board",
          action: "approval.requester_wakeup_failed",
          entityType: "approval",
          entityId: approval.id,
          details: {
            requesterAgentId: approval.requestedByAgentId,
            linkedIssueIds,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }

    res.json(redactApprovalPayload(approval));
  });

  router.post("/approvals/:id/reject", validate(resolveApprovalSchema), async (req, res) => {
    assertBoard(req);
    const id = req.params.id as string;
    const approval = await svc.reject(id, req.body.decidedByUserId ?? "board", req.body.decisionNote);
    const linkedIssues = await issueApprovalsSvc.listIssuesForApproval(approval.id);
    const linkedIssueIds = linkedIssues.map((issue) => issue.id);
    const primaryIssueId = linkedIssueIds[0] ?? null;

    await logActivity(db, {
      companyId: approval.companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "approval.rejected",
      entityType: "approval",
      entityId: approval.id,
      details: {
        type: approval.type,
        requestedByAgentId: approval.requestedByAgentId,
        linkedIssueIds,
      },
    });

    // Notify the requesting agent on reject as well (so it can revise or propose new options).
    if (approval.requestedByAgentId) {
      try {
        const wakeRun = await heartbeat.wakeup(approval.requestedByAgentId, {
          source: "automation",
          triggerDetail: "system",
          reason: "approval_rejected",
          payload: {
            approvalId: approval.id,
            approvalStatus: approval.status,
            decisionJson: (approval as any).decisionJson ?? null,
            decisionNote: approval.decisionNote ?? null,
            issueId: primaryIssueId,
            issueIds: linkedIssueIds,
          },
          requestedByActorType: "user",
          requestedByActorId: req.actor.userId ?? "board",
          contextSnapshot: {
            source: "approval.rejected",
            approvalId: approval.id,
            approvalStatus: approval.status,
            issueId: primaryIssueId,
            issueIds: linkedIssueIds,
            taskId: primaryIssueId,
            wakeReason: "approval_rejected",
          },
        });

        await logActivity(db, {
          companyId: approval.companyId,
          actorType: "user",
          actorId: req.actor.userId ?? "board",
          action: "approval.requester_wakeup_queued",
          entityType: "approval",
          entityId: approval.id,
          details: {
            requesterAgentId: approval.requestedByAgentId,
            wakeRunId: wakeRun?.id ?? null,
            linkedIssueIds,
          },
        });
      } catch (err) {
        logger.warn(
          {
            err,
            approvalId: approval.id,
            requestedByAgentId: approval.requestedByAgentId,
          },
          "failed to queue requester wakeup after approval rejection",
        );
        await logActivity(db, {
          companyId: approval.companyId,
          actorType: "user",
          actorId: req.actor.userId ?? "board",
          action: "approval.requester_wakeup_failed",
          entityType: "approval",
          entityId: approval.id,
          details: {
            requesterAgentId: approval.requestedByAgentId,
            linkedIssueIds,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }

    res.json(redactApprovalPayload(approval));
  });

  router.post(
    "/approvals/:id/request-revision",
    validate(requestApprovalRevisionSchema),
    async (req, res) => {
      assertBoard(req);
      const id = req.params.id as string;
      const approval = await svc.requestRevision(
        id,
        req.body.decidedByUserId ?? "board",
        req.body.decisionNote,
      );

      await logActivity(db, {
        companyId: approval.companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "approval.revision_requested",
        entityType: "approval",
        entityId: approval.id,
        details: { type: approval.type },
      });

      res.json(redactApprovalPayload(approval));
    },
  );

  router.post("/approvals/:id/resubmit", validate(resubmitApprovalSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);

    if (req.actor.type === "agent" && req.actor.agentId !== existing.requestedByAgentId) {
      res.status(403).json({ error: "Only requesting agent can resubmit this approval" });
      return;
    }

    const normalizedPayload = req.body.payload
      ? existing.type === "hire_agent"
        ? await secretsSvc.normalizeHireApprovalPayloadForPersistence(
            existing.companyId,
            req.body.payload,
            { strictMode: strictSecretsMode },
          )
        : req.body.payload
      : undefined;
    const approval = await svc.resubmit(id, normalizedPayload);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: approval.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "approval.resubmitted",
      entityType: "approval",
      entityId: approval.id,
      details: { type: approval.type },
    });
    res.json(redactApprovalPayload(approval));
  });

  router.get("/approvals/:id/comments", async (req, res) => {
    const id = req.params.id as string;
    const approval = await svc.getById(id);
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    assertCompanyAccess(req, approval.companyId);
    const comments = await svc.listComments(id);
    res.json(comments);
  });

  router.post("/approvals/:id/comments", validate(addApprovalCommentSchema), async (req, res) => {
    const id = req.params.id as string;
    const approval = await svc.getById(id);
    if (!approval) {
      res.status(404).json({ error: "Approval not found" });
      return;
    }
    assertCompanyAccess(req, approval.companyId);
    const actor = getActorInfo(req);
    const comment = await svc.addComment(id, req.body.body, {
      agentId: actor.agentId ?? undefined,
      userId: actor.actorType === "user" ? actor.actorId : undefined,
    });

    await logActivity(db, {
      companyId: approval.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "approval.comment_added",
      entityType: "approval",
      entityId: approval.id,
      details: { commentId: comment.id },
    });

    res.status(201).json(comment);
  });

  return router;
}
