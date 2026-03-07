-- Progress tracking to prevent silent stalls in autonomous orgs.

ALTER TABLE issues
ADD COLUMN IF NOT EXISTS last_progress_at timestamptz;

UPDATE issues SET last_progress_at = COALESCE(last_progress_at, updated_at, now());

CREATE TABLE IF NOT EXISTS issue_progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_type text NOT NULL,
  actor_agent_id uuid,
  actor_user_id text,
  run_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS issue_progress_events_issue_created_idx ON issue_progress_events(issue_id, created_at);
CREATE INDEX IF NOT EXISTS issue_progress_events_company_created_idx ON issue_progress_events(company_id, created_at);
