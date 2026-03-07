-- Add structured decision payload for enterprise-grade approvals.
ALTER TABLE approvals
ADD COLUMN IF NOT EXISTS decision_json jsonb;

-- Optional: index for common querying (type/status already indexed)
-- CREATE INDEX IF NOT EXISTS approvals_company_status_idx ON approvals(company_id, status);
