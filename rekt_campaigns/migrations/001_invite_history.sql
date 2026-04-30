-- Immutable invite ledger (append-only). Never DELETE rows in production.
-- Run: psql "$DATABASE_URL" -f migrations/001_invite_history.sql

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
