-- Brandify meme caption pipeline tables (Supabase / Postgres)
-- Apply: psql "$DATABASE_URL" -f rekt_brandify/migrations/001_caption_pipeline.sql

CREATE TABLE IF NOT EXISTS brandify_caption_runs (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'running',
  creator_wallet TEXT,
  template_id TEXT,
  category TEXT,
  template_image_url TEXT,
  input JSONB NOT NULL DEFAULT '{}',
  payment JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_brandify_caption_runs_status ON brandify_caption_runs (status);
CREATE INDEX IF NOT EXISTS idx_brandify_caption_runs_created ON brandify_caption_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brandify_caption_runs_template ON brandify_caption_runs (template_id);

CREATE TABLE IF NOT EXISTS brandify_caption_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES brandify_caption_runs (id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  model TEXT,
  latency_ms INTEGER,
  input JSONB,
  output JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brandify_caption_stages_run ON brandify_caption_stages (run_id);

CREATE TABLE IF NOT EXISTS brandify_caption_candidates (
  id TEXT NOT NULL,
  run_id UUID NOT NULL REFERENCES brandify_caption_runs (id) ON DELETE CASCADE,
  top_text TEXT NOT NULL,
  bottom_text TEXT NOT NULL,
  humor_tag TEXT,
  intensity TEXT,
  memetic_devices TEXT[] DEFAULT '{}',
  scores JSONB,
  ranking_score DOUBLE PRECISION,
  rank INTEGER,
  why_funny TEXT,
  returned_to_user BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (run_id, id)
);

CREATE INDEX IF NOT EXISTS idx_brandify_caption_candidates_run ON brandify_caption_candidates (run_id);

CREATE TABLE IF NOT EXISTS brandify_caption_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES brandify_caption_runs (id) ON DELETE CASCADE,
  selected_candidate_id TEXT,
  rating TEXT NOT NULL,
  feedback_text TEXT,
  creator_wallet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brandify_caption_feedback_run ON brandify_caption_feedback (run_id);
