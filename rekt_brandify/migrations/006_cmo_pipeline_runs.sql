-- CMO pipeline run orchestration columns
-- Apply: npm run db:migrate

ALTER TABLE cmo_pipeline_runs
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS error TEXT,
  ADD COLUMN IF NOT EXISTS error_step TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_cmo_pipeline_runs_status ON cmo_pipeline_runs (status);
CREATE INDEX IF NOT EXISTS idx_cmo_pipeline_runs_updated ON cmo_pipeline_runs (updated_at DESC);
