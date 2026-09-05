-- CMO content stages: index for pipeline day upserts + research intel notes
-- Safe to re-run.

CREATE INDEX IF NOT EXISTS idx_cmo_content_pipeline_day
  ON cmo_content_items (
    pipeline_run_id,
    ((metadata->>'suggested_day')::int)
  )
  WHERE pipeline_run_id IS NOT NULL
    AND metadata ? 'suggested_day';

CREATE INDEX IF NOT EXISTS idx_cmo_strategy_runs_type_created
  ON cmo_strategy_runs (type, created_at DESC);

COMMENT ON TABLE cmo_content_items IS
  'CMO drafts; metadata.stages tracks curate/select/brandify/caption/compose; metadata.suggested_day for upserts';
