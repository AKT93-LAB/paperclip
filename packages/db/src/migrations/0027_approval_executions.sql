-- Store server-side execution results for approved actions (enterprise approvals)
CREATE TABLE IF NOT EXISTS approval_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  approval_id uuid NOT NULL REFERENCES approvals(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  action_type text NOT NULL,
  action_json jsonb NOT NULL,
  result_json jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approval_executions_company_created_idx ON approval_executions(company_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS approval_executions_approval_uq ON approval_executions(approval_id);
