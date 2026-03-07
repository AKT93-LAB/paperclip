import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";

export const issueProgressEvents = pgTable(
  "issue_progress_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    actorType: text("actor_type").notNull(),
    actorAgentId: uuid("actor_agent_id"),
    actorUserId: text("actor_user_id"),
    runId: uuid("run_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    issueCreatedIdx: index("issue_progress_events_issue_created_idx").on(table.issueId, table.createdAt),
    companyCreatedIdx: index("issue_progress_events_company_created_idx").on(
      table.companyId,
      table.createdAt,
    ),
  }),
);
