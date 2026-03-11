import { createDb } from "@paperclipai/db";
import { heartbeatService } from "../src/services/heartbeat.ts";

async function main() {
  const [agentId, issueId, reason = "manual_rescue"] = process.argv.slice(2);
  if (!agentId) throw new Error("agentId required");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const db = createDb(url);
  const heartbeat = heartbeatService(db);

  const result = await heartbeat.wakeup(agentId, {
    source: "on_demand",
    triggerDetail: "manual",
    reason,
    requestedByActorType: "system",
    requestedByActorId: "nova",
    contextSnapshot: {
      wakeReason: reason,
      wakeSource: "on_demand",
      wakeTriggerDetail: "manual",
      triggeredBy: "system",
      actorId: "nova",
      ...(issueId ? { issueId, taskId: issueId } : {}),
    },
    payload: issueId ? { issueId, taskId: issueId } : null,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
