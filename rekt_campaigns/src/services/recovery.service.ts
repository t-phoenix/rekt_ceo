import { query } from '../utils/db';
import { redisManager } from '../utils/redis';
import { logger } from '../utils/logger';

export const recoveryService = {
  /**
   * Rebuilds Redis state from Supabase data.
   * This is a disaster recovery method, useful if Redis is flushed.
   */
  async rebuildRedisFromSupabase(): Promise<{ success: boolean; walletsRestored: number; message: string }> {
    logger.info('recoveryService: Starting Redis rebuild from Supabase...');
    try {
      const client = await redisManager.getClient();
      if (!client) {
        return { success: false, walletsRestored: 0, message: 'Redis unavailable' };
      }

      let walletsRestored = 0;
      
      // 1. Rebuild Users (Identity, XP, Streaks)
      const usersRes = await query(`SELECT * FROM campaign_users`);
      if (usersRes && usersRes.rows.length > 0) {
        for (const user of usersRes.rows) {
          const wallet = user.wallet.toLowerCase();
          
          // Identity
          if (user.identity_blob) {
            await client.set(`campaign:identity:${wallet}`, JSON.stringify(user.identity_blob));
          }
          
          // XP
          const xpObj = {
            lifetime: Number(user.lifetime_xp) || 0,
            season: Number(user.season_xp) || 0,
            level: Number(user.level) || 1,
            nextLevelAt: (Number(user.level) || 1) * 500
          };
          await client.set(`campaign:xp:${wallet}`, JSON.stringify(xpObj));
          
          // Leaderboards
          if (xpObj.season > 0) {
            await client.zadd('campaign:leaderboard:season', xpObj.season, wallet);
          }
          if (xpObj.lifetime > 0) {
            await client.zadd('campaign:leaderboard:lifetime', xpObj.lifetime, wallet);
          }
          
          // Streaks
          if (user.streak_count > 0 && user.streak_last) {
            const streakObj = {
              count: user.streak_count,
              lastDate: new Date(user.streak_last).toISOString().slice(0, 10)
            };
            await client.set(`campaign:streak:${wallet}`, JSON.stringify(streakObj));
          }
          
          walletsRestored++;
        }
      }

      // 2. Rebuild Invite Slots
      const slotsRes = await query(`SELECT * FROM campaign_invite_slots`);
      if (slotsRes && slotsRes.rows.length > 0) {
        for (const slot of slotsRes.rows) {
          const wallet = slot.wallet.toLowerCase();
          const batchObj = {
            batchId: slot.batch_id,
            ownerAddr: wallet,
            codes: typeof slot.codes === 'string' ? JSON.parse(slot.codes) : slot.codes,
            updatedAt: slot.updated_at
          };
          await client.set(`campaign:invite:slots:v2:${wallet}`, JSON.stringify(batchObj));
        }
      }

      // 3. Rebuild Invite Lookups and Claims
      const lookupsRes = await query(`SELECT * FROM campaign_invite_lookups`);
      if (lookupsRes && lookupsRes.rows.length > 0) {
        for (const row of lookupsRes.rows) {
          const code = row.code;
          if (row.owner) {
            await client.set(`campaign:invite:lookup:v2:${code.toLowerCase()}`, row.owner);
          }
          if (row.claimed_by) {
            await client.set(`campaign:invite:claimed:v2:${code.toLowerCase()}`, row.claimed_by);
          }
        }
      }

      // 4. Rebuild On-chain completions
      const onchainRes = await query(`SELECT * FROM campaign_onchain_completions`);
      if (onchainRes && onchainRes.rows.length > 0) {
        for (const row of onchainRes.rows) {
          await client.set(
            `campaign:onchain:done:${row.campaign_id.toLowerCase()}:${row.wallet.toLowerCase()}`, 
            new Date(row.completed_at).toISOString()
          );
        }
      }

      // 5. Rebuild Link XP Claims
      const linkRes = await query(`SELECT * FROM campaign_link_xp_claims`);
      if (linkRes && linkRes.rows.length > 0) {
        for (const row of linkRes.rows) {
          await client.set(`campaign:link_xp:${row.wallet.toLowerCase()}:${row.provider}`, '1');
        }
      }

      // 6. Rebuild Admin Configs (latest versions)
      const configKeys = ['layout', 'campaigns', 'x_presets', 'gate_config', 'xp_rewards'];
      for (const key of configKeys) {
        const confRes = await query(
          `SELECT config_blob FROM campaign_admin_config WHERE config_key = $1 ORDER BY created_at DESC LIMIT 1`,
          [key]
        );
        if (confRes && confRes.rows.length > 0) {
          const blob = typeof confRes.rows[0].config_blob === 'string' 
            ? confRes.rows[0].config_blob 
            : JSON.stringify(confRes.rows[0].config_blob);
          
          let redisKey = '';
          if (key === 'layout') redisKey = 'campaign:layout:launch_hub';
          else if (key === 'campaigns') redisKey = 'campaign:list';
          else if (key === 'x_presets') redisKey = 'campaign:rules:x_presets';
          else if (key === 'gate_config') redisKey = 'campaign:gate-config:v1';
          else if (key === 'xp_rewards') redisKey = 'campaign:xp-rewards:v1';
          
          if (redisKey) {
            await client.set(redisKey, blob);
          }
        }
      }

      logger.info(`recoveryService: Redis rebuild complete. Restored ${walletsRestored} wallets.`);
      return { success: true, walletsRestored, message: 'Recovery successful' };
    } catch (e) {
      logger.error('recoveryService: rebuild failed', { error: (e as Error).message });
      return { success: false, walletsRestored: 0, message: (e as Error).message };
    }
  }
};
