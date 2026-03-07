import { logger } from "../middleware/logger.js";
import { heartbeatService, issueProgressService } from "./index.js";
import type { Db } from "@paperclipai/db";
import { companies } from "@paperclipai/db";

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

      for (const companyId of companyIds) {
        const stale = await progress.listStaleInProgressIssues({ companyId, staleBefore, limit });
        for (const issue of stale) {
          if (!issue.assigneeAgentId) continue;
          // Queue a single wake; heartbeat service already respects cooldown.
          await heartbeat
            .wakeup(issue.assigneeAgentId, {
              source: "automation",
              triggerDetail: "system",
              reason: "issue_stale",
              payload: {
                issueId: issue.id,
                staleBefore: staleBefore.toISOString(),
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
