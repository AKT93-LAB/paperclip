import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { assets, issues } from "@paperclipai/db";
import { unprocessable } from "../errors.js";

function issueText(issue: { title?: string | null; description?: string | null }) {
  return `${issue.title ?? ""}\n${issue.description ?? ""}`.toLowerCase();
}

export function issueRequiresArtifactBackedApproval(issue: {
  title?: string | null;
  description?: string | null;
}) {
  const text = issueText(issue);
  return (
    text.includes("reviewable work package") ||
    text.includes("artifact package") ||
    text.includes("artifacts[]") ||
    text.includes("approval payloads using artifacts")
  );
}

function extractArtifactIds(payload: Record<string, unknown>) {
  const artifactsValue = payload.artifacts;
  if (!Array.isArray(artifactsValue)) return [] as string[];
  return artifactsValue
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const assetId = (item as Record<string, unknown>).assetId;
      return typeof assetId === "string" && assetId.trim().length > 0 ? assetId.trim() : null;
    })
    .filter((value): value is string => Boolean(value));
}

export async function assertApprovalPayloadSatisfiesLinkedIssueRequirements(input: {
  db: Db;
  companyId: string;
  approvalType: string;
  payload: Record<string, unknown>;
  linkedIssueIds: string[];
}) {
  const { db, companyId, payload, linkedIssueIds } = input;
  if (linkedIssueIds.length === 0) return;

  const linkedIssues = await db
    .select({
      id: issues.id,
      title: issues.title,
      description: issues.description,
    })
    .from(issues)
    .where(and(eq(issues.companyId, companyId), inArray(issues.id, linkedIssueIds)));

  const requiresArtifactPackage = linkedIssues.some(issueRequiresArtifactBackedApproval);
  if (!requiresArtifactPackage) return;

  const artifactIds = Array.from(new Set(extractArtifactIds(payload)));
  if (artifactIds.length === 0) {
    throw unprocessable(
      "This approval is linked to a reviewable work package and must include artifacts[] with real assetIds.",
    );
  }

  const existingAssets = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.companyId, companyId), inArray(assets.id, artifactIds)));
  const existingAssetIds = new Set(existingAssets.map((asset) => asset.id));
  const missingAssetIds = artifactIds.filter((id) => !existingAssetIds.has(id));
  if (missingAssetIds.length > 0) {
    throw unprocessable(
      `Approval artifacts reference missing assetIds: ${missingAssetIds.join(", ")}. Upload assets first via /api/companies/:companyId/assets/files.`,
    );
  }
}
