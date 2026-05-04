import { query } from '../utils/db';
import { logger } from '../utils/logger';

export const supabaseSync = {
  /**
   * IDENTITY
   */
  async upsertUser(wallet: string, identityBlob: Record<string, unknown>): Promise<void> {
    try {
      await query(
        `INSERT INTO campaign_users (wallet, identity_blob, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (wallet) DO UPDATE SET
           identity_blob = EXCLUDED.identity_blob,
           updated_at = NOW()`,
        [wallet.toLowerCase(), JSON.stringify(identityBlob)]
      );
    } catch (e) {
      logger.warn('supabaseSync: upsertUser failed', { error: (e as Error).message });
    }
  },

  /**
   * XP & LEDGER
   */
  async updateUserXp(wallet: string, xp: { lifetime: number; season: number; level: number }): Promise<void> {
    try {
      await query(
        `INSERT INTO campaign_users (wallet, lifetime_xp, season_xp, level, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (wallet) DO UPDATE SET
           lifetime_xp = EXCLUDED.lifetime_xp,
           season_xp = EXCLUDED.season_xp,
           level = EXCLUDED.level,
           updated_at = NOW()`,
        [wallet.toLowerCase(), xp.lifetime, xp.season, xp.level]
      );
    } catch (e) {
      logger.warn('supabaseSync: updateUserXp failed', { error: (e as Error).message });
    }
  },

  async recordXpEvent(wallet: string, amount: number, reason: string, season = 'season-1'): Promise<void> {
    try {
      await query(
        `WITH upsert_user AS (
           INSERT INTO campaign_users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING
         )
         INSERT INTO campaign_xp_ledger (wallet, amount, reason, season)
         VALUES ($1, $2, $3, $4)`,
        [wallet.toLowerCase(), amount, reason, season]
      );
    } catch (e) {
      logger.warn('supabaseSync: recordXpEvent failed', { error: (e as Error).message });
    }
  },

  /**
   * STREAK
   */
  async updateStreak(wallet: string, streakCount: number, lastDate: string): Promise<void> {
    try {
      await query(
        `INSERT INTO campaign_users (wallet, streak_count, streak_last, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (wallet) DO UPDATE SET
           streak_count = EXCLUDED.streak_count,
           streak_last = EXCLUDED.streak_last,
           updated_at = NOW()`,
        [wallet.toLowerCase(), streakCount, lastDate]
      );
    } catch (e) {
      logger.warn('supabaseSync: updateStreak failed', { error: (e as Error).message });
    }
  },

  /**
   * INVITE SYSTEM (extends existing invite-history logic)
   */
  async upsertInviteSlots(wallet: string, batchId: string, codes: any[]): Promise<void> {
    try {
      await query(
        `WITH upsert_user AS (
           INSERT INTO campaign_users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING
         )
         INSERT INTO campaign_invite_slots (wallet, batch_id, codes, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW())
         ON CONFLICT (wallet) DO UPDATE SET
           batch_id = EXCLUDED.batch_id,
           codes = EXCLUDED.codes,
           updated_at = NOW()`,
        [wallet.toLowerCase(), batchId, JSON.stringify(codes)]
      );
    } catch (e) {
      logger.warn('supabaseSync: upsertInviteSlots failed', { error: (e as Error).message });
    }
  },

  async recordInviteLookup(code: string, owner: string | null): Promise<void> {
    try {
      await query(
        `INSERT INTO campaign_invite_lookups (code, owner)
         VALUES ($1, $2)
         ON CONFLICT (code) DO NOTHING`,
        [code, owner]
      );
    } catch (e) {
      logger.warn('supabaseSync: recordInviteLookup failed', { error: (e as Error).message });
    }
  },

  async recordInviteLookupClaim(code: string, claimedBy: string): Promise<void> {
    try {
      await query(
        `UPDATE campaign_invite_lookups
         SET claimed_by = $1, claimed_at = NOW()
         WHERE code = $2`,
        [claimedBy.toLowerCase(), code]
      );
    } catch (e) {
      logger.warn('supabaseSync: recordInviteLookupClaim failed', { error: (e as Error).message });
    }
  },

  /**
   * ON-CHAIN COMPLETIONS
   */
  async recordOnchainCompletion(campaignId: string, wallet: string, xpAwarded: number): Promise<void> {
    try {
      await query(
        `WITH upsert_user AS (
           INSERT INTO campaign_users (wallet) VALUES ($2) ON CONFLICT (wallet) DO NOTHING
         )
         INSERT INTO campaign_onchain_completions (campaign_id, wallet, xp_awarded)
         VALUES ($1, $2, $3)
         ON CONFLICT (campaign_id, wallet) DO NOTHING`,
        [campaignId, wallet.toLowerCase(), xpAwarded]
      );
    } catch (e) {
      logger.warn('supabaseSync: recordOnchainCompletion failed', { error: (e as Error).message });
    }
  },

  /**
   * LINK XP
   */
  async recordLinkXpClaim(wallet: string, provider: string, xpAmount: number): Promise<void> {
    try {
      await query(
        `WITH upsert_user AS (
           INSERT INTO campaign_users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING
         )
         INSERT INTO campaign_link_xp_claims (wallet, provider, xp_amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (wallet, provider) DO NOTHING`,
        [wallet.toLowerCase(), provider, xpAmount]
      );
    } catch (e) {
      logger.warn('supabaseSync: recordLinkXpClaim failed', { error: (e as Error).message });
    }
  },

  /**
   * ADMIN CONFIG
   */
  async snapshotAdminConfig(key: string, configBlob: any, updatedBy: string = 'admin_api'): Promise<void> {
    try {
      await query(
        `INSERT INTO campaign_admin_config (config_key, config_blob, updated_by)
         VALUES ($1, $2::jsonb, $3)`,
        [key, JSON.stringify(configBlob), updatedBy]
      );
    } catch (e) {
      logger.warn('supabaseSync: snapshotAdminConfig failed', { error: (e as Error).message });
    }
  },

  /**
   * X MISSION DAILY (Sync from redis aggregate)
   */
  async recordXMissionDaily(
    wallet: string,
    dateUtc: string,
    presetId: string,
    tasksCompleted: any[],
    totalXp: number,
    season = 'season-1'
  ): Promise<void> {
    try {
      await query(
        `WITH upsert_user AS (
           INSERT INTO campaign_users (wallet) VALUES ($1) ON CONFLICT (wallet) DO NOTHING
         )
         INSERT INTO campaign_xmission_daily (wallet, date_utc, preset_id, tasks_completed, total_xp, season)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         ON CONFLICT (wallet, date_utc, preset_id) DO UPDATE SET
           tasks_completed = EXCLUDED.tasks_completed,
           total_xp = EXCLUDED.total_xp`,
        [wallet.toLowerCase(), dateUtc, presetId, JSON.stringify(tasksCompleted), totalXp, season]
      );
    } catch (e) {
      logger.warn('supabaseSync: recordXMissionDaily failed', { error: (e as Error).message });
    }
  },

  /**
   * DAILY SNAPSHOT CRON JOB
   */
  async runDailySnapshot(season = 'season-1'): Promise<void> {
    try {
      // We will trigger the analytics service to get the latest stats and save to PG
      logger.info('supabaseSync: Running daily snapshot...');
      
      const { analyticsService } = await import('./analytics.service.js');
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      
      const summary = await analyticsService.getSummary(yesterday, today);
      
      if (summary && summary.redisAvailable) {
         await query(
           `INSERT INTO campaign_daily_stats (date_utc, checkins, spins, active_wallets, season)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (date_utc, season) DO UPDATE SET
              checkins = EXCLUDED.checkins,
              spins = EXCLUDED.spins,
              active_wallets = EXCLUDED.active_wallets`,
           [
             today, 
             summary.dailyEngagement.checkinsFromCounters, 
             summary.dailyEngagement.spinsFromCounters,
             summary.leaderboards.season.wallets,
             season
           ]
         );
      }
      
      logger.info('supabaseSync: Daily snapshot complete.');
    } catch (e) {
      logger.error('supabaseSync: runDailySnapshot failed', { error: (e as Error).message });
    }
  },

  /**
   * SEASON RESET FLOW
   */
  async performSeasonReset(currentSeason: string, newSeason: string): Promise<{ success: boolean; message: string }> {
    try {
      logger.info(`supabaseSync: Starting season reset ${currentSeason} -> ${newSeason}`);
      
      // 1. Snapshot current season to campaign_season_snapshots
      await query(
        `INSERT INTO campaign_season_snapshots (season, wallet, season_xp, lifetime_xp)
         SELECT current_season, wallet, season_xp, lifetime_xp
         FROM campaign_users
         WHERE current_season = $1
         ON CONFLICT (season, wallet) DO NOTHING`,
        [currentSeason]
      );

      // 2. Reset season_xp and current_season in PG
      await query(
        `UPDATE campaign_users 
         SET season_xp = 0, current_season = $1
         WHERE current_season = $2`,
        [newSeason, currentSeason]
      );

      // 3. Clear Redis ZSET for season
      const { redisManager } = await import('../utils/redis.js');
      const client = await redisManager.getClient();
      if (client) {
        await client.del('campaign:leaderboard:season');
        
        // Also need to clear the season_xp for all users in Redis
        // This is a slow operation but season reset is a rare admin action
        const keys = await client.keys('campaign:xp:*');
        for (const key of keys) {
           const raw = await client.get(key);
           if (raw) {
             try {
               const xpObj = JSON.parse(raw);
               xpObj.season = 0;
               await client.set(key, JSON.stringify(xpObj));
             } catch (e) {}
           }
        }
      }

      logger.info(`supabaseSync: Season reset complete`);
      return { success: true, message: `Successfully reset to ${newSeason}` };
    } catch (e) {
      logger.error('supabaseSync: performSeasonReset failed', { error: (e as Error).message });
      return { success: false, message: (e as Error).message };
    }
  }
};
