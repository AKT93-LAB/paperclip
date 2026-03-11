import { UserPlus, Lightbulb, ShieldCheck, HelpCircle } from "lucide-react";

export const typeLabel: Record<string, string> = {
  hire_agent: "Hire Agent",
  approve_ceo_strategy: "CEO Strategy",
  human_decision: "Decision",
  action_execution: "Action",
};

export const typeIcon: Record<string, typeof UserPlus> = {
  hire_agent: UserPlus,
  approve_ceo_strategy: Lightbulb,
  human_decision: HelpCircle,
  action_execution: ShieldCheck,
};

export const defaultTypeIcon = ShieldCheck;

function PayloadField({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">{label}</span>
      <span>{String(value)}</span>
    </div>
  );
}

export function HireAgentPayload({ payload }: { payload: Record<string, unknown> }) {
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">Name</span>
        <span className="font-medium">{String(payload.name ?? "—")}</span>
      </div>
      <PayloadField label="Role" value={payload.role} />
      <PayloadField label="Title" value={payload.title} />
      <PayloadField label="Icon" value={payload.icon} />
      {!!payload.capabilities && (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs pt-0.5">Capabilities</span>
          <span className="text-muted-foreground">{String(payload.capabilities)}</span>
        </div>
      )}
      {!!payload.adapterType && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-20 sm:w-24 shrink-0 text-xs">Adapter</span>
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {String(payload.adapterType)}
          </span>
        </div>
      )}
    </div>
  );
}

export function CeoStrategyPayload({ payload }: { payload: Record<string, unknown> }) {
  const plan = payload.plan ?? payload.description ?? payload.strategy ?? payload.text;
  return (
    <div className="mt-3 space-y-1.5 text-sm">
      <PayloadField label="Title" value={payload.title} />
      {!!plan && (
        <div className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap font-mono text-xs max-h-48 overflow-y-auto">
          {String(plan)}
        </div>
      )}
      {!plan && (
        <pre className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground overflow-x-auto max-h-48">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

function getString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function getOptions(payload: Record<string, unknown>): Array<{ id: string; label: string }> {
  const raw = payload.options;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((opt) => {
      if (opt && typeof opt === "object") {
        const o = opt as Record<string, unknown>;
        const id = getString(o.id || o.value || o.key);
        const label = getString(o.label || o.name || o.title || id);
        if (!id) return null;
        return { id, label };
      }
      const id = getString(opt);
      return id ? { id, label: id } : null;
    })
    .filter((v): v is { id: string; label: string } => Boolean(v));
}

export function HumanDecisionPayload({ payload }: { payload: Record<string, unknown> }) {
  const question = getString(payload.question || payload.prompt || payload.title);
  const recommendation = getString(payload.recommendation || payload.proposal || payload.recommended);
  const rationale = getString(payload.rationale || payload.reasoning);
  const options = getOptions(payload);

  const artifacts: ArtifactRef[] = Array.isArray(payload.artifacts)
    ? (payload.artifacts as unknown[])
        .map(normalizeArtifactRef)
        .filter((item): item is ArtifactRef => Boolean(item))
    : [];

  const previewAssets: ArtifactRef[] = Array.isArray(payload.previewAssets)
    ? (payload.previewAssets as unknown[])
        .map(normalizeArtifactRef)
        .filter((item): item is ArtifactRef => Boolean(item))
        .map((item) => ({ ...item, role: item.role ?? "preview" }))
    : [];

  const fallbackPreviewAssetIds: string[] = Array.isArray(payload.previewAssetIds)
    ? (payload.previewAssetIds as any[]).map((x) => (typeof x === "string" ? x : "")).filter(Boolean)
    : [];

  const normalizedArtifacts: ArtifactRef[] = artifacts.length > 0
    ? artifacts
    : previewAssets.length > 0
      ? previewAssets
      : fallbackPreviewAssetIds.map((assetId) => ({ assetId, role: "preview" }));

  const sectionLabel = artifactSectionLabel(normalizedArtifacts);

  return (
    <div className="mt-3 space-y-2 text-sm">
      {question && (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-muted-foreground whitespace-pre-wrap">
          {question}
        </div>
      )}
      {recommendation && (
        <div>
          <div className="text-xs text-muted-foreground">Recommendation</div>
          <div className="mt-1 rounded-md bg-muted/40 px-3 py-2 whitespace-pre-wrap">{recommendation}</div>
        </div>
      )}
      {rationale && (
        <div>
          <div className="text-xs text-muted-foreground">Rationale</div>
          <div className="mt-1 rounded-md bg-muted/40 px-3 py-2 text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
            {rationale}
          </div>
        </div>
      )}
      {options.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground">Options</div>
          <div className="mt-1 space-y-1">
            {options.map((opt) => (
              <div key={opt.id} className="text-muted-foreground">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-2">{opt.id}</span>
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
      {normalizedArtifacts.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground">{sectionLabel}</div>
          <div className="mt-2 space-y-3">
            {normalizedArtifacts.map((item, index) => (
              <AssetPreview
                key={`${item.assetId}:${index}`}
                assetId={item.assetId}
                index={index}
                label={item.label}
                summary={item.summary}
                kind={item.kind}
                role={item.role}
              />
            ))}
          </div>
        </div>
      )}
      {!question && !recommendation && options.length === 0 && normalizedArtifacts.length === 0 && (
        <pre className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground overflow-x-auto max-h-48">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";

type AssetMeta = {
  id: string;
  contentType?: string;
  originalFilename?: string | null;
  byteSize?: number;
};

type ArtifactPackageDoc = {
  package_version?: string;
  project?: string;
  created_at?: string;
  artifacts?: Array<{
    id?: string;
    role?: string;
    kind?: string;
    title?: string;
    description?: string;
    status?: string;
  }>;
  deliverables?: Record<string, unknown>;
  next_steps?: string[];
};

function parseFilenameFromContentDisposition(value: string | null): string | null {
  if (!value) return null;
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).trim() || null;
    } catch {
      return utf8Match[1].trim() || null;
    }
  }
  const basicMatch = value.match(/filename="?([^";]+)"?/i);
  return basicMatch?.[1]?.trim() || null;
}

function looksRandomFilename(name: string | null | undefined): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  const stem = trimmed.replace(/\.[^.]+$/, "");
  return /^[a-f0-9-]{12,}$/i.test(stem);
}

function parseArtifactPackageDoc(text: string | null): ArtifactPackageDoc | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.artifacts)) return null;
    if (typeof parsed.project !== "string" && typeof parsed.package_version !== "string") return null;
    return parsed as ArtifactPackageDoc;
  } catch {
    return null;
  }
}

function humanizeDeliverableKey(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanAssetLabel(meta: AssetMeta | null, assetId: string, index?: number, preferredLabel?: string): string {
  const explicitLabel = preferredLabel?.trim() || "";
  if (explicitLabel) return explicitLabel;

  const preferredName = meta?.originalFilename?.trim() || "";
  if (preferredName && !looksRandomFilename(preferredName)) return preferredName;

  const ct = (meta?.contentType || "").toLowerCase();
  const kind = ct.startsWith("video/")
    ? "Video preview"
    : ct.startsWith("image/")
      ? "Image preview"
      : ct.startsWith("text/") || ct.includes("json") || ct.includes("markdown")
        ? "Text preview"
        : "Attachment preview";

  return typeof index === "number" ? `${kind} ${index + 1}` : `${kind} (${assetId.slice(0, 8)})`;
}

type ArtifactRef = {
  assetId: string;
  label?: string;
  summary?: string;
  kind?: string;
  role?: string;
};

function normalizeArtifactRef(value: unknown): ArtifactRef | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const assetId = getString(record.assetId || record.id).trim();
  if (!assetId) return null;
  const label = getString(record.label || record.name || record.title).trim() || undefined;
  const summary = getString(record.summary || record.description || record.explanation).trim() || undefined;
  const kind = getString(record.kind || record.type).trim() || undefined;
  const role = getString(record.role).trim() || undefined;
  return { assetId, label, summary, kind, role };
}

function humanizeToken(value: string | undefined): string | null {
  const token = value?.trim();
  if (!token) return null;
  return token
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function artifactBadgeTone(role?: string): string {
  const normalized = (role || "").toLowerCase();
  if (["primary", "preview", "primary_preview"].includes(normalized)) {
    return "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
  }
  if (["draft", "proposal"].includes(normalized)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (["supporting", "attachment", "evidence", "reference"].includes(normalized)) {
    return "border-border bg-background text-muted-foreground";
  }
  return "border-border bg-background text-muted-foreground";
}

function artifactSectionLabel(artifacts: ArtifactRef[]): string {
  const previewCount = artifacts.filter((artifact) => {
    const role = (artifact.role || "").toLowerCase();
    return role === "preview" || role === "primary_preview";
  }).length;
  if (previewCount > 0 && previewCount === artifacts.length) return "Previews";
  if (previewCount > 0) return "Artifacts & previews";
  return "Artifacts";
}

function AssetPreview({ assetId, index, label: preferredLabel, summary, kind, role }: { assetId: string; index?: number; label?: string; summary?: string; kind?: string; role?: string }) {
  const [meta, setMeta] = useState<AssetMeta | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contentUrl = useMemo(() => `/api/assets/${assetId}/content`, [assetId]);

  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    setTextPreview(null);
    setError(null);

    (async () => {
      try {
        // Use HEAD on the content endpoint to avoid needing a separate JSON metadata route.
        const resp = await fetch(contentUrl, { method: "HEAD" });
        if (!resp.ok) throw new Error(`asset head ${resp.status}`);
        const contentType = resp.headers.get("content-type") || undefined;
        const len = resp.headers.get("content-length");
        const disposition = resp.headers.get("content-disposition");
        const size = len ? Number(len) : undefined;
        const m: AssetMeta = {
          id: assetId,
          contentType,
          originalFilename: parseFilenameFromContentDisposition(disposition),
          byteSize: Number.isFinite(size as any) ? (size as number) : undefined,
        };
        if (cancelled) return;
        setMeta(m);

        const ct = (m.contentType || "").toLowerCase();
        const isTextLike = ct.startsWith("text/") || ct.includes("json") || ct.includes("markdown");
        const smallEnough = typeof m.byteSize === "number" ? m.byteSize <= 50_000 : false;

        if (isTextLike && smallEnough) {
          const t = await fetch(contentUrl).then((r) => {
            if (!r.ok) throw new Error(`asset content ${r.status}`);
            return r.text();
          });
          if (cancelled) return;
          setTextPreview(t.slice(0, 4000));
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId, contentUrl]);

  const ct = (meta?.contentType || "").toLowerCase();
  const label = humanAssetLabel(meta, assetId, index, preferredLabel);
  const roleLabel = humanizeToken(role);
  const kindLabel = humanizeToken(kind) || humanizeToken(meta?.contentType?.split("/")[0]);
  const artifactPackage = parseArtifactPackageDoc(textPreview);

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium truncate">{label}</div>
            {roleLabel && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${artifactBadgeTone(role)}`}>
                {roleLabel}
              </span>
            )}
            {kindLabel && (
              <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                {kindLabel}
              </span>
            )}
          </div>
          {summary && <div className="text-xs text-muted-foreground leading-relaxed">{summary}</div>}
          <div className="text-xs text-muted-foreground truncate">
            {meta?.contentType ? `${meta.contentType}` : "Unknown type"}
            {typeof meta?.byteSize === "number" ? ` • ${meta.byteSize} bytes` : ""}
          </div>
        </div>
      </div>

      {error && <div className="text-xs text-red-500">Preview error: {error}</div>}

      {ct.startsWith("video/") && (
        <video
          className="w-full max-w-xl rounded"
          controls
          playsInline
          preload="metadata"
          src={contentUrl}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {ct.startsWith("image/") && (
        <img className="w-full max-w-xl rounded" src={contentUrl} alt={label} />
      )}

      {artifactPackage ? (
        <div className="space-y-3 rounded-md bg-muted/30 p-3">
          <div>
            <div className="text-sm font-medium">{artifactPackage.project || label}</div>
            <div className="text-xs text-muted-foreground">
              {artifactPackage.package_version ? `Package v${artifactPackage.package_version}` : "Artifact package"}
              {artifactPackage.created_at ? ` • ${new Date(artifactPackage.created_at).toLocaleString()}` : ""}
            </div>
          </div>

          {Array.isArray(artifactPackage.artifacts) && artifactPackage.artifacts.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Included artifacts</div>
              <div className="space-y-2">
                {artifactPackage.artifacts.map((artifact, idx) => (
                  <div key={`${artifact.id ?? idx}`} className="rounded border border-border bg-background p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium">{artifact.title || artifact.id || `Artifact ${idx + 1}`}</div>
                      {artifact.role && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${artifactBadgeTone(artifact.role)}`}>
                          {humanizeToken(artifact.role)}
                        </span>
                      )}
                      {artifact.kind && (
                        <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                          {humanizeToken(artifact.kind)}
                        </span>
                      )}
                    </div>
                    {artifact.description && (
                      <div className="mt-1 text-xs text-muted-foreground">{artifact.description}</div>
                    )}
                    {artifact.status && (
                      <div className="mt-1 text-[11px] text-muted-foreground">Status: {humanizeToken(artifact.status)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {artifactPackage.deliverables && Object.keys(artifactPackage.deliverables).length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Deliverables status</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(artifactPackage.deliverables).map(([key, value]) => (
                  <div key={key} className="rounded border border-border bg-background px-2 py-1.5 text-xs flex items-center justify-between gap-2">
                    <span>{humanizeDeliverableKey(key)}</span>
                    <span className={value === true ? "text-green-600 dark:text-green-400 font-medium" : value === false ? "text-muted-foreground" : "text-foreground"}>
                      {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(artifactPackage.next_steps) && artifactPackage.next_steps.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Next steps</div>
              <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                {artifactPackage.next_steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : textPreview != null ? (
        <pre className="text-xs whitespace-pre-wrap break-words max-h-64 overflow-y-auto bg-muted/40 p-2 rounded">
          {textPreview}
        </pre>
      ) : null}

      {!error && !ct.startsWith("video/") && !ct.startsWith("image/") && textPreview == null && (
        <div className="text-xs text-muted-foreground">Preview not available (open to view).</div>
      )}
    </div>
  );
}

export function ActionExecutionPayload({ payload }: { payload: Record<string, unknown> }) {
  const summary = getString(payload.summary || payload.title || payload.description);
  const actionType = getString(payload.actionType || (payload.action as any)?.type || (payload.action as any)?.kind);

  const artifacts: ArtifactRef[] = Array.isArray(payload.artifacts)
    ? (payload.artifacts as unknown[])
        .map(normalizeArtifactRef)
        .filter((item): item is ArtifactRef => Boolean(item))
    : [];

  const previewAssets: ArtifactRef[] = Array.isArray(payload.previewAssets)
    ? (payload.previewAssets as unknown[])
        .map(normalizeArtifactRef)
        .filter((item): item is ArtifactRef => Boolean(item))
        .map((item) => ({ ...item, role: item.role ?? "preview" }))
    : [];

  const fallbackPreviewAssetIds: string[] = Array.isArray(payload.previewAssetIds)
    ? (payload.previewAssetIds as any[]).map((x) => (typeof x === "string" ? x : "")).filter(Boolean)
    : [];

  const normalizedArtifacts: ArtifactRef[] = artifacts.length > 0
    ? artifacts
    : previewAssets.length > 0
      ? previewAssets
      : fallbackPreviewAssetIds.map((assetId) => ({ assetId, role: "preview" }));

  const sectionLabel = artifactSectionLabel(normalizedArtifacts);

  return (
    <div className="mt-3 space-y-2 text-sm">
      {summary && (
        <div className="rounded-md bg-muted/40 px-3 py-2 text-muted-foreground whitespace-pre-wrap">
          {summary}
        </div>
      )}
      {actionType && (
        <div className="text-xs text-muted-foreground">
          Action type: <span className="font-mono">{actionType}</span>
        </div>
      )}
      {normalizedArtifacts.length > 0 ? (
        <div>
          <div className="text-xs text-muted-foreground">{sectionLabel}</div>
          <div className="mt-2 space-y-3">
            {normalizedArtifacts.map((item, index) => (
              <AssetPreview
                key={`${item.assetId}:${index}`}
                assetId={item.assetId}
                index={index}
                label={item.label}
                summary={item.summary}
                kind={item.kind}
                role={item.role}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No artifacts attached.</div>
      )}
      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">Raw payload</summary>
        <pre className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground overflow-x-auto max-h-48">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export function ApprovalPayloadRenderer({ type, payload }: { type: string; payload: Record<string, unknown> }) {
  if (type === "hire_agent") return <HireAgentPayload payload={payload} />;
  if (type === "human_decision") return <HumanDecisionPayload payload={payload} />;
  if (type === "action_execution") return <ActionExecutionPayload payload={payload} />;
  return <CeoStrategyPayload payload={payload} />;
}
