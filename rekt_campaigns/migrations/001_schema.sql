-- Single unified schema for Rekt Campaigns
-- Run: psql "$DATABASE_URL" -f migrations/001_schema.sql
-- Or: Supabase → SQL Editor → paste this file and Run.

-- ============================================================================
-- PART 1: CORE CAMPAIGN DATA (USERS, XP, DAILY)
-- ============================================================================

-- 1. User Accounts & Identity (cross-season, permanent)
CREATE TABLE IF NOT EXISTS campaign_users (
  wallet         VARCHAR(42) PRIMARY KEY,
  identity_blob  JSONB NOT NULL DEFAULT '{}',
  lifetime_xp    BIGINT NOT NULL DEFAULT 0,
  season_xp      BIGINT NOT NULL DEFAULT 0,
  level          INT NOT NULL DEFAULT 1,
  streak_count   INT NOT NULL DEFAULT 0,
  streak_last    DATE,
  current_season VARCHAR(32) NOT NULL DEFAULT 'season-1',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. XP Ledger (full history, append-only)
CREATE TABLE IF NOT EXISTS campaign_xp_ledger (
  id          BIGSERIAL PRIMARY KEY,
  wallet      VARCHAR(42) NOT NULL REFERENCES campaign_users(wallet),
  amount      INT NOT NULL,
  reason      VARCHAR(128) NOT NULL,
  season      VARCHAR(32) NOT NULL DEFAULT 'season-1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_wallet ON campaign_xp_ledger(wallet, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_season ON campaign_xp_ledger(season, created_at DESC);

-- ============================================================================
-- PART 2: INVITE SYSTEM
-- ============================================================================

-- Legacy/Immutable invite ledger
CREATE TABLE IF NOT EXISTS launch_invite_code_issued (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL,
  owner_wallet VARCHAR(42),
  source VARCHAR(32) NOT NULL,
  batch_id VARCHAR(128),
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_launch_invite_issued_owner ON launch_invite_code_issued (owner_wallet);
CREATE INDEX IF NOT EXISTS idx_launch_invite_issued_code ON launch_invite_code_issued (code);
CREATE INDEX IF NOT EXISTS idx_launch_invite_issued_batch ON launch_invite_code_issued (batch_id);
CREATE INDEX IF NOT EXISTS idx_launch_invite_issued_created ON launch_invite_code_issued (created_at DESC);

CREATE TABLE IF NOT EXISTS launch_invite_redemption (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL,
  invitee_wallet VARCHAR(42) NOT NULL,
  inviter_wallet VARCHAR(42),
  was_bootstrap BOOLEAN NOT NULL DEFAULT FALSE,
  was_admin_mint BOOLEAN NOT NULL DEFAULT FALSE,
  xp_invitee INT NOT NULL,
  xp_inviter INT NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_launch_invite_redemption_invitee UNIQUE (invitee_wallet)
);

CREATE INDEX IF NOT EXISTS idx_launch_invite_redemption_code ON launch_invite_redemption (code);
CREATE INDEX IF NOT EXISTS idx_launch_invite_redemption_inviter ON launch_invite_redemption (inviter_wallet);
CREATE INDEX IF NOT EXISTS idx_launch_invite_redemption_at ON launch_invite_redemption (redeemed_at DESC);

CREATE TABLE IF NOT EXISTS launch_invite_rotation (
  id BIGSERIAL PRIMARY KEY,
  owner_wallet VARCHAR(42) NOT NULL,
  previous_batch_id VARCHAR(128) NOT NULL,
  previous_codes JSONB NOT NULL,
  new_batch_id VARCHAR(128) NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_launch_invite_rotation_owner ON launch_invite_rotation (owner_wallet);
CREATE INDEX IF NOT EXISTS idx_launch_invite_rotation_at ON launch_invite_rotation (rotated_at DESC);

-- Fast lookup state
CREATE TABLE IF NOT EXISTS campaign_invite_slots (
  wallet      VARCHAR(42) PRIMARY KEY REFERENCES campaign_users(wallet),
  batch_id    VARCHAR(128) NOT NULL,
  codes       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_invite_lookups (
  code        VARCHAR(32) PRIMARY KEY,
  owner       VARCHAR(42),  -- null for admin/bootstrap
  claimed_by  VARCHAR(42),
  claimed_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 3: CAMPAIGNS & MISSIONS
-- ============================================================================

-- On-chain Campaign Completions
CREATE TABLE IF NOT EXISTS campaign_onchain_completions (
  campaign_id VARCHAR(64) NOT NULL,
  wallet      VARCHAR(42) NOT NULL REFERENCES campaign_users(wallet),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp_awarded  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, wallet)
);

-- Link XP Claims (prevents double-claim across Redis loss)
CREATE TABLE IF NOT EXISTS campaign_link_xp_claims (
  wallet    VARCHAR(42) NOT NULL REFERENCES campaign_users(wallet),
  provider  VARCHAR(16) NOT NULL,
  xp_amount INT NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (wallet, provider)
);

-- X Mission Daily Aggregates
CREATE TABLE IF NOT EXISTS campaign_xmission_daily (
  wallet      VARCHAR(42) NOT NULL REFERENCES campaign_users(wallet),
  date_utc    DATE NOT NULL,
  preset_id   VARCHAR(64) NOT NULL,
  tasks_completed JSONB NOT NULL DEFAULT '[]',  -- [{taskId, xp}]
  total_xp    INT NOT NULL DEFAULT 0,
  season      VARCHAR(32) NOT NULL DEFAULT 'season-1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (wallet, date_utc, preset_id)
);

-- ============================================================================
-- PART 4: ANALYTICS & ADMIN
-- ============================================================================

-- Daily Engagement Snapshots (rolled up from Redis counters)
CREATE TABLE IF NOT EXISTS campaign_daily_stats (
  date_utc   DATE NOT NULL,
  checkins   INT NOT NULL DEFAULT 0,
  spins      INT NOT NULL DEFAULT 0,
  x_missions INT NOT NULL DEFAULT 0,
  active_wallets INT NOT NULL DEFAULT 0,
  season     VARCHAR(32) NOT NULL DEFAULT 'season-1',
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (date_utc, season)
);

-- Admin Config Versions (auditable config history)
CREATE TABLE IF NOT EXISTS campaign_admin_config (
  id          BIGSERIAL PRIMARY KEY,
  config_key  VARCHAR(64) NOT NULL,  -- 'layout', 'campaigns', 'x_presets', 'gate_config', 'xp_rewards'
  config_blob JSONB NOT NULL,
  updated_by  VARCHAR(64),  -- 'admin_api' or wallet address
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_config_key ON campaign_admin_config(config_key, created_at DESC);

-- Season Archive (snapshot on season transition)
CREATE TABLE IF NOT EXISTS campaign_season_snapshots (
  id          BIGSERIAL PRIMARY KEY,
  season      VARCHAR(32) NOT NULL,
  wallet      VARCHAR(42) NOT NULL REFERENCES campaign_users(wallet),
  season_xp   BIGINT NOT NULL DEFAULT 0,
  lifetime_xp BIGINT NOT NULL DEFAULT 0,
  final_rank  INT,
  identity_snapshot JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season, wallet)
);
CREATE INDEX IF NOT EXISTS idx_season_snapshot_season ON campaign_season_snapshots(season, season_xp DESC);
