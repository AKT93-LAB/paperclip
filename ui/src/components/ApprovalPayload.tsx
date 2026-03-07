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
      {!question && !recommendation && options.length === 0 && (
        <pre className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground overflow-x-auto max-h-48">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

function AssetLink({ assetId, label }: { assetId: string; label?: string }) {
  const href = `/api/assets/${assetId}/content`;
  return (
    <a className="underline" href={href} target="_blank" rel="noreferrer">
      {label ?? assetId}
    </a>
  );
}

export function ActionExecutionPayload({ payload }: { payload: Record<string, unknown> }) {
  const summary = getString(payload.summary || payload.title || payload.description);
  const actionType = getString(payload.actionType || (payload.action as any)?.type || (payload.action as any)?.kind);
  const previewAssetIds: string[] = Array.isArray(payload.previewAssetIds)
    ? (payload.previewAssetIds as any[]).map((x) => (typeof x === "string" ? x : "")).filter(Boolean)
    : [];
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
      {previewAssetIds.length > 0 ? (
        <div>
          <div className="text-xs text-muted-foreground">Previews</div>
          <ul className="mt-1 list-disc pl-5 space-y-1">
            {previewAssetIds.map((id) => (
              <li key={id} className="text-muted-foreground">
                <AssetLink assetId={id} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No previews attached.</div>
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
