import { logger } from "../middleware/logger.js";
import { and, eq, gt } from "drizzle-orm";
import { heartbeatService, issueProgressService } from "./index.js";
import type { Db } from "@paperclipai/db";
import { companies, issueProgressEvents } from "@paperclipai/db";

export function startStuckDetector(db: Db) {
  const enabled = (process.env.PAPERCLIP_STUCK_DETECTOR_ENABLED ?? "true").toLowerCase() === "true";
  if (!enabled) return;

  const intervalSec = Number(process.env.PAPERCLIP_STUCK_DETECTOR_INTERVAL_SEC) || 600;
  const staleSec = Number(process.env.PAPERCLIP_STUCK_DETECTOR_STALE_SEC) || 3600;
  const limit = Number(process.env.PAPERCLIP_STUCK_DETECTOR_LIMIT) || 20;

  const heartbeat = heartbeatService(db);
  const progress = issueProgressService(db);

  async function tick() {
    try {
      // Naive multi-company scan: list company ids (small set).
      const companyIds = await db
        .select({ id: companies.id })
        .from(companies)
        .limit(50)
        .then((rows) => rows.map((r) => r.id));

      const staleBefore = new Date(Date.now() - staleSec * 1000);
      const staleBeforeIso = staleBefore.toISOString();

      for (const companyId of companyIds) {
        const stale = await progress.listStaleInProgressIssues({ companyId, staleBefore, limit });
        for (const issue of stale) {
          if (!issue.assigneeAgentId) continue;

          // Throttle: do not wake the same issue too frequently even if it's still stale.
          const wakeCooldownSec =
            Number(process.env.PAPERCLIP_STUCK_DETECTOR_WAKE_COOLDOWN_SEC) || 1800; // 30 min default

          const recent = await db
            .select({ id: issueProgressEvents.id })
            .from(issueProgressEvents)
            .where(
              and(
                eq(issueProgressEvents.issueId, issue.id),
                eq(issueProgressEvents.eventType, "stuck_wakeup_queued"),
                gt(issueProgressEvents.createdAt, new Date(Date.now() - wakeCooldownSec * 1000)),
              ),
            )
            .limit(1);

          if (recent.length > 0) continue;

          await db.insert(issueProgressEvents).values({
            companyId,
            issueId: issue.id,
            eventType: "stuck_wakeup_queued",
            actorType: "system",
            metadata: { assigneeAgentId: issue.assigneeAgentId, staleBefore: staleBeforeIso },
          });

          // Queue a single wake; heartbeat service still respects agent cooldown.
          await heartbeat
            .wakeup(issue.assigneeAgentId, {
              source: "automation",
              triggerDetail: "system",
              reason: "issue_stale",
              payload: {
                issueId: issue.id,
                staleBefore: staleBeforeIso,
              },
              requestedByActorType: "system",
              requestedByActorId: "stuck-detector",
              contextSnapshot: {
                issueId: issue.id,
                taskId: issue.id,
                wakeReason: "issue_stale",
                source: "stuck-detector",
              },
            })
            .catch((err) => logger.warn({ err, issueId: issue.id }, "failed to wake stale issue assignee"));
        }
      }
    } catch (err) {
      logger.warn({ err }, "stuck-detector tick failed");
    }
  }

  // initial delay
  setTimeout(() => void tick(), 10_000);
  setInterval(() => void tick(), Math.max(30, intervalSec) * 1000);

  logger.info(
    {
      intervalSec,
      staleSec,
      limit,
    },
    "stuck-detector started",
  );
}
