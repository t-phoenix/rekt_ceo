-- CMO Workshop tables (same Supabase Postgres as brandify_*)
-- Apply: npm run db:migrate

CREATE TABLE IF NOT EXISTS cmo_brand_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice TEXT,
  tone TEXT,
  slogans TEXT[],
  guidelines JSONB NOT NULL DEFAULT '{}',
  website_url TEXT,
  launch_url TEXT DEFAULT 'https://rektceo.com/launch',
  meme_gen_url TEXT DEFAULT 'https://rektceo.com/memes',
  strategy_mode TEXT NOT NULL DEFAULT 'campaign',
  campaigns_api_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO cmo_brand_profile (voice, tone, slogans, strategy_mode)
SELECT 'savage CT-native', 'edgy-humor', ARRAY['REKT', '$CEO', 'Rekt CEO'], 'campaign'
WHERE NOT EXISTS (SELECT 1 FROM cmo_brand_profile LIMIT 1);

CREATE TABLE IF NOT EXISTS cmo_strategy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  agentcash_cost_usd NUMERIC(10, 4),
  cache_key TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cmo_strategy_runs_type ON cmo_strategy_runs (type);
CREATE INDEX IF NOT EXISTS idx_cmo_strategy_runs_created ON cmo_strategy_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cmo_strategy_runs_cache ON cmo_strategy_runs (cache_key);

CREATE TABLE IF NOT EXISTS cmo_content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'draft',
  platform TEXT,
  post_type TEXT,
  deliverable_type TEXT,
  body_text TEXT,
  hashtags TEXT[],
  media_url TEXT,
  meme_template_id TEXT,
  brandify_session_id UUID REFERENCES brandify_sessions (session_id) ON DELETE SET NULL,
  caption_run_id UUID REFERENCES brandify_caption_runs (id) ON DELETE SET NULL,
  source_research_id UUID REFERENCES cmo_strategy_runs (id) ON DELETE SET NULL,
  kol_target_handle TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  pipeline_run_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cmo_content_status ON cmo_content_items (status);
CREATE INDEX IF NOT EXISTS idx_cmo_content_platform ON cmo_content_items (platform);
CREATE INDEX IF NOT EXISTS idx_cmo_content_scheduled ON cmo_content_items (scheduled_at);

CREATE TABLE IF NOT EXISTS cmo_kol_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'twitter',
  tier TEXT NOT NULL DEFAULT 'C',
  compatibility_score NUMERIC(5, 2),
  last_fetched_at TIMESTAMPTZ,
  last_post_id TEXT,
  engagement_notes JSONB NOT NULL DEFAULT '{}',
  UNIQUE (handle, platform)
);

CREATE TABLE IF NOT EXISTS cmo_fetch_cache (
  cache_key TEXT PRIMARY KEY,
  provider TEXT,
  endpoint TEXT,
  response JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ttl_seconds INTEGER NOT NULL,
  cost_usd NUMERIC(10, 4)
);

CREATE TABLE IF NOT EXISTS cmo_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  type TEXT NOT NULL,
  external_id TEXT,
  author TEXT,
  body TEXT,
  post_url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  draft_reply TEXT,
  priority TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cmo_interactions_status ON cmo_interactions (status);
CREATE INDEX IF NOT EXISTS idx_cmo_interactions_platform ON cmo_interactions (platform);

CREATE TABLE IF NOT EXISTS cmo_pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  current_step INTEGER NOT NULL DEFAULT 0,
  steps JSONB NOT NULL DEFAULT '[]',
  outputs JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
