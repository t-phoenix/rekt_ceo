-- Full audit storage: session stages, payments, API request log
-- Apply: npm run db:migrate

ALTER TABLE brandify_sessions
  ADD COLUMN IF NOT EXISTS payment JSONB;

CREATE TABLE IF NOT EXISTS brandify_session_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES brandify_sessions (session_id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  model TEXT,
  latency_ms INTEGER,
  input JSONB,
  output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brandify_session_stages_session
  ON brandify_session_stages (session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_brandify_session_stages_stage
  ON brandify_session_stages (stage);

ALTER TABLE brandify_caption_runs
  ADD COLUMN IF NOT EXISTS response_metadata JSONB;

CREATE TABLE IF NOT EXISTS brandify_api_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  session_id UUID,
  run_id UUID,
  creator_wallet TEXT,
  payment JSONB,
  request_summary JSONB NOT NULL DEFAULT '{}',
  response_summary JSONB,
  latency_ms INTEGER,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brandify_api_request_log_created
  ON brandify_api_request_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brandify_api_request_log_session
  ON brandify_api_request_log (session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_brandify_api_request_log_run
  ON brandify_api_request_log (run_id)
  WHERE run_id IS NOT NULL;
