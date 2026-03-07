import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { approvals } from "./approvals.js";

export const approvalExecutions = pgTable(
  "approval_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    approvalId: uuid("approval_id").notNull().references(() => approvals.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    actionType: text("action_type").notNull(),
    actionJson: jsonb("action_json").$type<Record<string, unknown>>().notNull(),
    resultJson: jsonb("result_json").$type<Record<string, unknown> | null>(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyCreatedIdx: index("approval_executions_company_created_idx").on(
      table.companyId,
      table.createdAt,
    ),
    approvalUq: uniqueIndex("approval_executions_approval_uq").on(table.approvalId),
  }),
);
