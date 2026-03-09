export type ApprovalArtifact = {
  assetId: string;
  label?: string;
  role?: string;
  kind?: string;
  summary?: string;
};

function humanizeToken(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function inferRoleFromLabel(label?: string): string | undefined {
  const normalized = (label || "").toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("preview") || normalized.includes("video") || normalized.includes("image") || normalized.includes("mock")) return "preview";
  if (normalized.includes("draft") || normalized.includes("caption") || normalized.includes("email")) return "draft";
  return "supporting";
}

function inferKindFromLabel(label?: string): string | undefined {
  const normalized = (label || "").toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("video")) return "video";
  if (normalized.includes("image") || normalized.includes("mock") || normalized.includes("design")) return "image";
  if (normalized.includes("caption") || normalized.includes("email") || normalized.includes("draft") || normalized.includes("text")) return "text";
  if (normalized.includes("checklist")) return "checklist";
  if (normalized.includes("report") || normalized.includes("paper") || normalized.includes("spec")) return "document";
  if (normalized.includes("diff") || normalized.includes("patch") || normalized.includes("code")) return "code";
  return undefined;
}

export function normalizeApprovalPayloadArtifacts(payload: Record<string, unknown>): Record<string, unknown> {
  const nextPayload: Record<string, unknown> = { ...payload };
  const existingArtifacts = Array.isArray(nextPayload.artifacts) ? nextPayload.artifacts : [];
  if (existingArtifacts.length > 0) return nextPayload;

  const previewAssetIds: string[] = Array.isArray(nextPayload.previewAssetIds)
    ? (nextPayload.previewAssetIds as unknown[]).filter((id): id is string => typeof id === "string")
    : [];

  const action = (((nextPayload as any).action ?? nextPayload) as any) as Record<string, unknown>;
  const actionPayload =
    action && typeof action.payload === "object" && action.payload
      ? (action.payload as Record<string, unknown>)
      : {};

  const artifactsFromKeys = new Map<string, ApprovalArtifact>();
  for (const [key, value] of Object.entries(actionPayload)) {
    if (typeof value !== "string") continue;
    if (!key.toLowerCase().endsWith("assetid")) continue;
    const base = key.slice(0, -"AssetId".length);
    const label = base ? humanizeToken(base) : "Artifact";
    artifactsFromKeys.set(value, {
      assetId: value,
      label,
      role: inferRoleFromLabel(label),
      kind: inferKindFromLabel(label),
    });
  }

  const combinedAssetIds = Array.from(new Set([...previewAssetIds, ...artifactsFromKeys.keys()]));
  if (combinedAssetIds.length === 0) return nextPayload;

  nextPayload.artifacts = combinedAssetIds.map((assetId) => {
    const inferred = artifactsFromKeys.get(assetId);
    return {
      assetId,
      label: inferred?.label,
      role: inferred?.role ?? (previewAssetIds.includes(assetId) ? "preview" : "supporting"),
      kind: inferred?.kind,
    } satisfies ApprovalArtifact;
  });

  return nextPayload;
}
