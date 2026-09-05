-- Multi-output brandify workflows per content day (analysis → choices → generations)
-- Apply: npm run db:migrate

CREATE TABLE IF NOT EXISTS cmo_brandify_outputs (
  id UUID PRIMARY KEY,
  content_item_id UUID NOT NULL REFERENCES cmo_content_items(id) ON DELETE CASCADE,
  pipeline_run_id UUID REFERENCES cmo_pipeline_runs(id) ON DELETE SET NULL,
  session_id UUID,
  template_id TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (status IN (
      'analyzing',
      'awaiting_choices',
      'processing',
      'done',
      'failed',
      'incomplete'
    )),
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  label TEXT,
  original_image_url TEXT,
  media_url TEXT,
  engine_used TEXT,
  strategy JSONB,
  choices JSONB NOT NULL DEFAULT '[]'::jsonb,
  draft_selections JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  brandify_error TEXT,
  custom_target TEXT,
  feedback TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cmo_brandify_outputs_content_updated
  ON cmo_brandify_outputs (content_item_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cmo_brandify_outputs_pipeline
  ON cmo_brandify_outputs (pipeline_run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cmo_brandify_outputs_current
  ON cmo_brandify_outputs (content_item_id)
  WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_cmo_brandify_outputs_session
  ON cmo_brandify_outputs (session_id)
  WHERE session_id IS NOT NULL;

COMMENT ON TABLE cmo_brandify_outputs IS
  'One row per brandify attempt (analysis and/or generation). Multiple outputs per day; is_current selects the live media_url.';
