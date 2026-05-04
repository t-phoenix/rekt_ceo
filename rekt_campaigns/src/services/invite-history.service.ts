import { getPool } from '../utils/db';
import { logger } from '../utils/logger';

export type IssuedRow = {
  id: string;
  code: string;
  ownerWallet: string | null;
  source: string;
  batchId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
};

export type RedemptionRow = {
  id: string;
  code: string;
  inviteeWallet: string;
  inviterWallet: string | null;
  wasBootstrap: boolean;
  wasAdminMint: boolean;
  xpInvitee: number;
  xpInviter: number;
  redeemedAt: string;
};

export type RotationRow = {
  id: string;
  ownerWallet: string;
  previousBatchId: string;
  previousCodes: unknown;
  newBatchId: string;
  rotatedAt: string;
};

function isPgEnabled(): boolean {
  return !!getPool();
}

export const inviteHistoryService = {
  isEnabled(): boolean {
    return isPgEnabled();
  },

  async recordCodesIssued(
    rows: Array<{
      code: string;
      ownerWallet: string | null;
      source: 'user_batch' | 'admin' | 'bootstrap_env';
      batchId: string | null;
      meta?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    const p = getPool();
    if (!p || rows.length === 0) return;
    const client = await p.connect();
    try {
      for (const r of rows) {
        await client.query(
          `INSERT INTO launch_invite_code_issued (code, owner_wallet, source, batch_id, meta)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [
            r.code,
            r.ownerWallet,
            r.source,
            r.batchId,
            JSON.stringify(r.meta || {}),
          ],
        );
      }
    } catch (e) {
      logger.warn('invite-history: recordCodesIssued failed', { error: (e as Error).message });
    } finally {
      client.release();
    }
  },

  async recordRotation(input: {
    ownerWallet: string;
    previousBatchId: string;
    previousCodes: { code: string; status: string; redeemedBy?: string; redeemedAt?: string }[];
    newBatchId: string;
  }): Promise<void> {
    const p = getPool();
    if (!p) return;
    try {
      await p.query(
        `INSERT INTO launch_invite_rotation (owner_wallet, previous_batch_id, previous_codes, new_batch_id)
         VALUES ($1, $2, $3::jsonb, $4)`,
        [
          input.ownerWallet.toLowerCase(),
          input.previousBatchId,
          JSON.stringify(input.previousCodes),
          input.newBatchId,
        ],
      );
    } catch (e) {
      logger.warn('invite-history: recordRotation failed', { error: (e as Error).message });
    }
  },

  async recordRedemption(input: {
    code: string;
    inviteeWallet: string;
    inviterWallet: string | null;
    wasBootstrap: boolean;
    wasAdminMint: boolean;
    xpInvitee: number;
    xpInviter: number;
  }): Promise<void> {
    const p = getPool();
    if (!p) return;
    try {
      await p.query(
        `INSERT INTO launch_invite_redemption
          (code, invitee_wallet, inviter_wallet, was_bootstrap, was_admin_mint, xp_invitee, xp_inviter)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (invitee_wallet) DO NOTHING`,
        [
          input.code,
          input.inviteeWallet.toLowerCase(),
          input.inviterWallet ? input.inviterWallet.toLowerCase() : null,
          input.wasBootstrap,
          input.wasAdminMint,
          input.xpInvitee,
          input.xpInviter,
        ],
      );
    } catch (e) {
      logger.warn('invite-history: recordRedemption failed', { error: (e as Error).message });
    }
  },

  async getWalletHistory(address: string): Promise<{
    issued: IssuedRow[];
    joiners: RedemptionRow[];
    rotations: RotationRow[];
    redeemedAsInvitee: RedemptionRow | null;
  }> {
    const p = getPool();
    const empty = {
      issued: [] as IssuedRow[],
      joiners: [] as RedemptionRow[],
      rotations: [] as RotationRow[],
      redeemedAsInvitee: null as RedemptionRow | null,
    };
    if (!p) return empty;
    const addr = address.toLowerCase();
    try {
      const [issued, joiners, rotations, asInv] = await Promise.all([
        p.query(
          `SELECT id, code, owner_wallet, source, batch_id, meta, created_at
           FROM launch_invite_code_issued
           WHERE owner_wallet = $1
           ORDER BY created_at DESC
           LIMIT 200`,
          [addr],
        ),
        p.query(
          `SELECT id, code, invitee_wallet, inviter_wallet, was_bootstrap, was_admin_mint,
                  xp_invitee, xp_inviter, redeemed_at
           FROM launch_invite_redemption
           WHERE inviter_wallet = $1
           ORDER BY redeemed_at DESC
           LIMIT 200`,
          [addr],
        ),
        p.query(
          `SELECT id, owner_wallet, previous_batch_id, previous_codes, new_batch_id, rotated_at
           FROM launch_invite_rotation
           WHERE owner_wallet = $1
           ORDER BY rotated_at DESC
           LIMIT 50`,
          [addr],
        ),
        p.query(
          `SELECT id, code, invitee_wallet, inviter_wallet, was_bootstrap, was_admin_mint,
                  xp_invitee, xp_inviter, redeemed_at
           FROM launch_invite_redemption
           WHERE invitee_wallet = $1
           LIMIT 1`,
          [addr],
        ),
      ]);
      return {
        issued: issued.rows.map(mapIssued),
        joiners: joiners.rows.map(mapRedemption),
        rotations: rotations.rows.map(mapRotation),
        redeemedAsInvitee: asInv.rows[0] ? mapRedemption(asInv.rows[0]) : null,
      };
    } catch (e) {
      logger.warn('invite-history: getWalletHistory failed', { error: (e as Error).message });
      return empty;
    }
  },

  async adminAggregateCounts(): Promise<{ codesIssued: number; redemptions: number }> {
    const p = getPool();
    if (!p) return { codesIssued: 0, redemptions: 0 };
    try {
      const [a, b] = await Promise.all([
        p.query(`SELECT COUNT(*)::text AS c FROM launch_invite_code_issued`),
        p.query(`SELECT COUNT(*)::text AS c FROM launch_invite_redemption`),
      ]);
      return {
        codesIssued: Number(a.rows[0]?.c) || 0,
        redemptions: Number(b.rows[0]?.c) || 0,
      };
    } catch (e) {
      logger.warn('invite-history: adminAggregateCounts failed', { error: (e as Error).message });
      return { codesIssued: 0, redemptions: 0 };
    }
  },

  async adminGlobalRecent(limit = 100): Promise<{
    issued: IssuedRow[];
    redemptions: RedemptionRow[];
    rotations: RotationRow[];
  }> {
    const p = getPool();
    const empty = { issued: [] as IssuedRow[], redemptions: [] as RedemptionRow[], rotations: [] as RotationRow[] };
    if (!p) return empty;
    const lim = Math.min(500, Math.max(1, limit));
    try {
      const [issued, redemptions, rotations] = await Promise.all([
        p.query(
          `SELECT id, code, owner_wallet, source, batch_id, meta, created_at
           FROM launch_invite_code_issued
           ORDER BY created_at DESC
           LIMIT $1`,
          [lim],
        ),
        p.query(
          `SELECT id, code, invitee_wallet, inviter_wallet, was_bootstrap, was_admin_mint,
                  xp_invitee, xp_inviter, redeemed_at
           FROM launch_invite_redemption
           ORDER BY redeemed_at DESC
           LIMIT $1`,
          [lim],
        ),
        p.query(
          `SELECT id, owner_wallet, previous_batch_id, previous_codes, new_batch_id, rotated_at
           FROM launch_invite_rotation
           ORDER BY rotated_at DESC
           LIMIT $1`,
          [Math.min(100, lim)],
        ),
      ]);
      return {
        issued: issued.rows.map(mapIssued),
        redemptions: redemptions.rows.map(mapRedemption),
        rotations: rotations.rows.map(mapRotation),
      };
    } catch (e) {
      logger.warn('invite-history: adminGlobalRecent failed', { error: (e as Error).message });
      return empty;
    }
  },
};

function mapIssued(r: any): IssuedRow {
  return {
    id: String(r.id),
    code: r.code,
    ownerWallet: r.owner_wallet,
    source: r.source,
    batchId: r.batch_id,
    meta: (r.meta && typeof r.meta === 'object' ? r.meta : {}) as Record<string, unknown>,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
  };
}

function mapRedemption(r: any): RedemptionRow {
  return {
    id: String(r.id),
    code: r.code,
    inviteeWallet: r.invitee_wallet,
    inviterWallet: r.inviter_wallet,
    wasBootstrap: !!r.was_bootstrap,
    wasAdminMint: !!r.was_admin_mint,
    xpInvitee: Number(r.xp_invitee),
    xpInviter: Number(r.xp_inviter),
    redeemedAt: r.redeemed_at ? new Date(r.redeemed_at).toISOString() : '',
  };
}

function mapRotation(r: any): RotationRow {
  return {
    id: String(r.id),
    ownerWallet: r.owner_wallet,
    previousBatchId: r.previous_batch_id,
    previousCodes: r.previous_codes,
    newBatchId: r.new_batch_id,
    rotatedAt: r.rotated_at ? new Date(r.rotated_at).toISOString() : '',
  };
}
