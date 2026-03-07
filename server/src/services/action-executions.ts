import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { approvalExecutions } from "@paperclipai/db";

export type ActionExecutionResult = {
  executionId: string;
  status: "succeeded" | "failed";
  resultJson?: Record<string, unknown> | null;
  error?: string | null;
};

function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const key = k.toLowerCase();
    if (key.includes("authorization") || key.includes("cookie") || key.includes("token")) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function actionExecutionService(db: Db) {
  return {
    getByApprovalId: async (approvalId: string) =>
      db
        .select()
        .from(approvalExecutions)
        .where(eq(approvalExecutions.approvalId, approvalId))
        .then((rows) => rows[0] ?? null),

    executeExecutorCall: async (params: {
      companyId: string;
      approvalId: string;
      action: Record<string, unknown>;
    }): Promise<ActionExecutionResult> => {
      const baseUrl = process.env.PAPERCLIP_EXECUTOR_BASE_URL;
      const token = process.env.PAPERCLIP_EXECUTOR_TOKEN;
      if (!baseUrl || !token) {
        return { executionId: params.approvalId, status: "failed", error: "executor not configured" };
      }

      const kind = typeof (params.action as any).executor === "string" ? (params.action as any).executor : "unknown";
      const payload = (params.action as any).payload && typeof (params.action as any).payload === "object" ? (params.action as any).payload : {};

      // Ensure an execution record exists (idempotent per approval)
      const existing = await db
        .select()
        .from(approvalExecutions)
        .where(eq(approvalExecutions.approvalId, params.approvalId))
        .then((rows) => rows[0] ?? null);

      if (existing && (existing.status === "succeeded" || existing.status === "failed")) {
        return {
          executionId: existing.id,
          status: existing.status as "succeeded" | "failed",
          resultJson: (existing.resultJson as any) ?? null,
          error: existing.error ?? null,
        };
      }

      const now = new Date();
      const execution = existing
        ? await db
            .update(approvalExecutions)
            .set({ status: "running", startedAt: now, updatedAt: now })
            .where(eq(approvalExecutions.id, existing.id))
            .returning()
            .then((rows) => rows[0])
        : await db
            .insert(approvalExecutions)
            .values({
              companyId: params.companyId,
              approvalId: params.approvalId,
              status: "running",
              actionType: "executor_call",
              actionJson: params.action,
              startedAt: now,
              createdAt: now,
              updatedAt: now,
            })
            .returning()
            .then((rows) => rows[0]);

      try {
        const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/execute/${encodeURIComponent(kind)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            approvalId: params.approvalId,
            companyId: params.companyId,
            payload,
          }),
        });
        const text = await resp.text();
        const resultJson: Record<string, unknown> = {
          ok: resp.ok,
          status: resp.status,
          bodyExcerpt: text.slice(0, 4000),
          executorKind: kind,
        };
        const finished = new Date();
        await db
          .update(approvalExecutions)
          .set({ status: resp.ok ? "succeeded" : "failed", resultJson, error: resp.ok ? null : text.slice(0, 500), finishedAt: finished, updatedAt: finished })
          .where(eq(approvalExecutions.id, execution.id));

        return { executionId: execution.id, status: resp.ok ? "succeeded" : "failed", resultJson, error: resp.ok ? null : text.slice(0, 500) };
      } catch (err) {
        const finished = new Date();
        const message = err instanceof Error ? err.message : String(err);
        await db
          .update(approvalExecutions)
          .set({ status: "failed", error: message, finishedAt: finished, updatedAt: finished })
          .where(eq(approvalExecutions.id, execution.id));
        return { executionId: execution.id, status: "failed", error: message };
      }
    },

    executeHttpAction: async (params: {
      companyId: string;
      approvalId: string;
      action: Record<string, unknown>;
    }): Promise<ActionExecutionResult> => {
      const existing = await db
        .select()
        .from(approvalExecutions)
        .where(eq(approvalExecutions.approvalId, params.approvalId))
        .then((rows) => rows[0] ?? null);

      if (existing && (existing.status === "succeeded" || existing.status === "failed")) {
        return {
          executionId: existing.id,
          status: existing.status as "succeeded" | "failed",
          resultJson: (existing.resultJson as any) ?? null,
          error: existing.error ?? null,
        };
      }

      const now = new Date();

      const execution = existing
        ? await db
            .update(approvalExecutions)
            .set({ status: "running", startedAt: now, updatedAt: now })
            .where(eq(approvalExecutions.id, existing.id))
            .returning()
            .then((rows) => rows[0])
        : await db
            .insert(approvalExecutions)
            .values({
              companyId: params.companyId,
              approvalId: params.approvalId,
              status: "running",
              actionType: "http_request",
              actionJson: params.action,
              startedAt: now,
              createdAt: now,
              updatedAt: now,
            })
            .returning()
            .then((rows) => rows[0]);

      const url = typeof params.action.url === "string" ? params.action.url : "";
      const method = typeof params.action.method === "string" ? params.action.method : "POST";
      const headersRaw = params.action.headers && typeof params.action.headers === "object" ? params.action.headers : {};
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(headersRaw as any)) {
        if (typeof v === "string") headers[k] = v;
      }

      let body: any = undefined;
      if (typeof (params.action as any).bodyText === "string") {
        body = (params.action as any).bodyText;
      } else if ((params.action as any).bodyJson && typeof (params.action as any).bodyJson === "object") {
        body = JSON.stringify((params.action as any).bodyJson);
        if (!Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) {
          headers["Content-Type"] = "application/json";
        }
      }

      const timeoutSec = typeof (params.action as any).timeoutSec === "number" ? (params.action as any).timeoutSec : 20;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Math.max(1, timeoutSec) * 1000);

      try {
        const resp = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });
        const text = await resp.text();
        const resultJson: Record<string, unknown> = {
          url,
          method,
          requestHeaders: redactHeaders(headers),
          status: resp.status,
          ok: resp.ok,
          responseTextExcerpt: text.slice(0, 4000),
        };

        const finished = new Date();
        await db
          .update(approvalExecutions)
          .set({
            status: "succeeded",
            resultJson,
            finishedAt: finished,
            updatedAt: finished,
          })
          .where(eq(approvalExecutions.id, execution.id));

        return { executionId: execution.id, status: "succeeded", resultJson, error: null };
      } catch (err) {
        const finished = new Date();
        const message = err instanceof Error ? err.message : String(err);
        await db
          .update(approvalExecutions)
          .set({
            status: "failed",
            error: message,
            finishedAt: finished,
            updatedAt: finished,
          })
          .where(eq(approvalExecutions.id, execution.id));
        return { executionId: execution.id, status: "failed", error: message };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
