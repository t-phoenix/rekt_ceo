-- Link strategy runs + enrich pipeline session storage
-- Apply: npm run db:migrate

ALTER TABLE cmo_strategy_runs
  ADD COLUMN IF NOT EXISTS pipeline_run_id UUID,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_cmo_strategy_runs_pipeline
  ON cmo_strategy_runs (pipeline_run_id, created_at DESC)
  WHERE pipeline_run_id IS NOT NULL;

ALTER TABLE cmo_pipeline_runs
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_cmo_content_pipeline
  ON cmo_content_items (pipeline_run_id, updated_at DESC)
  WHERE pipeline_run_id IS NOT NULL;

COMMENT ON COLUMN cmo_strategy_runs.pipeline_run_id IS
  'Optional link to cmo_pipeline_runs session that triggered this paid/AgentCash run';
COMMENT ON COLUMN cmo_pipeline_runs.metadata IS
  'Session-level extras (operator notes, UI prefs, last_synced_at, etc.)';
