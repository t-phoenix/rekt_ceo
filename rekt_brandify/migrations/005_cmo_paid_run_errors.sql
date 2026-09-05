-- CMO paid-run failure tracking (x402 + AgentCash debugging)
-- Apply: npm run db:migrate

ALTER TABLE cmo_strategy_runs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS error_detail JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payer_hint TEXT,
  ADD COLUMN IF NOT EXISTS x402_price_usd NUMERIC(10, 4);

CREATE INDEX IF NOT EXISTS idx_cmo_strategy_runs_status ON cmo_strategy_runs (status);
CREATE INDEX IF NOT EXISTS idx_cmo_strategy_runs_failed
  ON cmo_strategy_runs (created_at DESC)
  WHERE status = 'failed';
