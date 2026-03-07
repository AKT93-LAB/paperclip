import { and, eq, lt, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { issueProgressEvents, issues } from "@paperclipai/db";

export type ProgressActor =
  | { actorType: "agent"; actorAgentId: string; actorUserId?: string | null; runId?: string | null }
  | { actorType: "user"; actorUserId: string; actorAgentId?: string | null; runId?: string | null };

export function issueProgressService(db: Db) {
  return {
    record: async (params: {
      companyId: string;
      issueId: string;
      eventType: string;
      actor: ProgressActor;
      metadata?: Record<string, unknown> | null;
      createdAt?: Date;
    }) => {
      const now = params.createdAt ?? new Date();
      await db.insert(issueProgressEvents).values({
        companyId: params.companyId,
        issueId: params.issueId,
        eventType: params.eventType,
        actorType: params.actor.actorType,
        actorAgentId: params.actor.actorType === "agent" ? params.actor.actorAgentId : null,
        actorUserId: params.actor.actorType === "user" ? params.actor.actorUserId : null,
        runId: (params.actor.runId as any) ?? null,
        metadata: params.metadata ?? null,
        createdAt: now,
      });

      // Denormalized fast path.
      await db
        .update(issues)
        .set({ lastProgressAt: now, updatedAt: sql`updated_at` })
        .where(eq(issues.id, params.issueId));
    },

    listStaleInProgressIssues: async (params: {
      companyId: string;
      staleBefore: Date;
      limit: number;
    }) => {
      // NOTE: postgres-js parameter binding can choke on Date objects in some raw SQL contexts.
      // Use an explicit timestamptz cast.
      const staleBeforeIso = params.staleBefore.toISOString();

      const rows = await db
        .select({
          id: issues.id,
          title: issues.title,
          assigneeAgentId: issues.assigneeAgentId,
          lastProgressAt: issues.lastProgressAt,
          updatedAt: issues.updatedAt,
        })
        .from(issues)
        .where(
          and(
            eq(issues.companyId, params.companyId),
            eq(issues.status, "in_progress" as any),
            lt(
              sql`COALESCE(${issues.lastProgressAt}, ${issues.updatedAt})`,
              sql`${staleBeforeIso}::timestamptz`,
            ),
          ),
        )
        .limit(params.limit);
      return rows;
    },
  };
}
