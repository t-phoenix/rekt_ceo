-- Brandify image brandification sessions (replaces MongoDB Session collection)
-- Apply: npm run db:migrate

CREATE TABLE IF NOT EXISTS brandify_sessions (
  session_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  original_image_url TEXT NOT NULL,
  generated_image_url TEXT,

  user_custom_target TEXT,
  ai_vision_raw JSONB,

  user_curated_choices JSONB NOT NULL DEFAULT '[]',
  compiled_prompt TEXT,

  engine_used TEXT,
  job_id TEXT,

  user_rating TEXT CHECK (
    user_rating IS NULL OR user_rating IN ('Like', 'Dislike', 'Neutral')
  ),

  template_id TEXT,
  category TEXT,
  template_filename TEXT,
  creator_wallet TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ,

  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_brandify_sessions_template_created
  ON brandify_sessions (template_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brandify_sessions_public_variations
  ON brandify_sessions (template_id, created_at DESC)
  WHERE is_public = TRUE
    AND generated_image_url IS NOT NULL
    AND error IS NULL;
