import { eq } from "drizzle-orm";
import { createDb, approvals } from "@paperclipai/db";
import { normalizeApprovalPayloadArtifacts } from "../src/services/approval-artifacts.js";

async function main() {
  const db = createDb();
  const rows = await db.select().from(approvals);
  let scanned = 0;
  let updated = 0;

  for (const row of rows) {
    scanned += 1;
    if (row.type !== "action_execution") continue;
    const payload = row.payload as Record<string, unknown> | null;
    if (!payload || typeof payload !== "object") continue;

    const before = JSON.stringify(payload);
    const afterPayload = normalizeApprovalPayloadArtifacts(payload);
    const after = JSON.stringify(afterPayload);
    if (before === after) continue;

    await db
      .update(approvals)
      .set({ payload: afterPayload, updatedAt: new Date() })
      .where(eq(approvals.id, row.id));
    updated += 1;
  }

  console.log(JSON.stringify({ ok: true, scanned, updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
