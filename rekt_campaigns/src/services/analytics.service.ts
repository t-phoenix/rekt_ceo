import type Redis from 'ioredis';
import { redisManager } from '../utils/redis';
import { logger } from '../utils/logger';
import { inviteHistoryService } from './invite-history.service';

const ZSET_SEASON = 'campaign:leaderboard:season';
const ZSET_LIFETIME = 'campaign:leaderboard:lifetime';
const IDENTITY_PATTERN = 'campaign:identity:*';
const DAILY_PREFIX = 'campaign:daily:';

/** O(1) per day when {@link bumpDailyEngagementCounters} is used */
export const statsKeys = {
  checkinsForDate: (d: string) => `campaign:stats:daily:${d}:checkins`,
  spinsForDate: (d: string) => `campaign:stats:daily:${d}:spins`,
};

const DAILY_KEY_RE = /^campaign:daily:(0x[a-f0-9]+):(\d{4}-\d{2}-\d{2}):(checkin|spin)$/;

async function sumZsetScores(client: Redis, key: string): Promise<number> {
  let cursor = '0';
  let sum = 0;
  do {
    const [next, elements] = await client.zscan(key, cursor, 'COUNT', 500);
    cursor = next;
    for (let i = 0; i < elements.length; i += 2) {
      sum += Number(elements[i + 1]);
    }
  } while (cursor !== '0');
  return sum;
}

function parseIsoDate(s: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T00:00:00.000Z`);
  if (!Number.isFinite(t)) return null;
  return s;
}

function eachUtcDateInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  let t = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(t) || !Number.isFinite(end) || t > end) return out;
  while (t <= end) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 86_400_000;
  }
  return out;
}

/** Sum counter keys for date range (fast path). */
async function sumStatsCounters(
  client: Redis,
  from: string,
  to: string,
  kind: 'checkins' | 'spins',
): Promise<number> {
  const days = eachUtcDateInclusive(from, to);
  if (days.length === 0) return 0;
  const keys =
    kind === 'checkins' ? days.map((d) => statsKeys.checkinsForDate(d)) : days.map((d) => statsKeys.spinsForDate(d));
  const vals = await client.mget(...keys);
  let sum = 0;
  for (const v of vals) {
    sum += Number(v) || 0;
  }
  return sum;
}

/**
 * Slow path: SCAN daily claim keys, filter by UTC date range and kind.
 * Stops after maxKeysScanned to protect Redis.
 */
async function scanDailyClaimsInRange(
  client: Redis,
  from: string,
  to: string,
  kind: 'checkin' | 'spin',
  maxKeysScanned: number,
): Promise<{ count: number; truncated: boolean }> {
  let cursor = '0';
  let scanned = 0;
  let count = 0;
  let truncated = false;
  const fromMs = Date.parse(`${from}T00:00:00.000Z`);
  const toMs = Date.parse(`${to}T23:59:59.999Z`);
  do {
    const [next, keys] = await client.scan(cursor, 'MATCH', `${DAILY_PREFIX}*`, 'COUNT', 300);
    cursor = next;
    for (const k of keys) {
      scanned++;
      if (scanned > maxKeysScanned) {
        truncated = true;
        return { count, truncated };
      }
      const m = DAILY_KEY_RE.exec(k);
      if (!m) continue;
      if (m[3] !== kind) continue;
      const d = m[2];
      const dm = Date.parse(`${d}T12:00:00.000Z`);
      if (dm >= fromMs && dm <= toMs) count += 1;
    }
  } while (cursor !== '0');
  return { count, truncated };
}

async function countIdentityKeys(client: Redis, maxIterations: number): Promise<{ count: number; partial: boolean }> {
  let cursor = '0';
  let count = 0;
  let iterations = 0;
  let partial = false;
  do {
    iterations += 1;
    if (iterations > maxIterations) {
      partial = true;
      break;
    }
    const [next, keys] = await client.scan(cursor, 'MATCH', IDENTITY_PATTERN, 'COUNT', 200);
    cursor = next;
    count += keys.length;
  } while (cursor !== '0');
  return { count, partial };
}

export type AnalyticsSummary = {
  redisAvailable: boolean;
  partial?: boolean;
  warnings?: string[];
  leaderboards: {
    season: { wallets: number; sumScores: number };
    lifetime: { wallets: number; sumScores: number };
  };
  identity: { walletsWithIdentityBlob: number; partial: boolean };
  invites: {
    ledgerEnabled: boolean;
    codesIssued: number;
    redemptions: number;
  };
  dailyEngagement: {
    from: string;
    to: string;
    checkinsFromCounters: number;
    spinsFromCounters: number;
    checkinsFromScan?: number;
    spinsFromScan?: number;
    scanTruncated?: boolean;
  };
};

export const analyticsService = {
  statsKeys,

  async bumpDailyEngagementCounters(
    client: Redis,
    dateUtc: string,
    kind: 'checkin' | 'spin',
  ): Promise<void> {
    const key =
      kind === 'checkin' ? statsKeys.checkinsForDate(dateUtc) : statsKeys.spinsForDate(dateUtc);
    await client.incr(key);
  },

  async getSummary(from?: string, to?: string, options?: { slowDailyScan?: boolean }): Promise<AnalyticsSummary> {
    const warnings: string[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const defaultFrom = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    const fromD = parseIsoDate(from || defaultFrom) || defaultFrom;
    const toD = parseIsoDate(to || today) || today;

    const invites = await inviteHistoryService.adminAggregateCounts();

    let redisAvailable = false;
    try {
      redisAvailable = await redisManager.isAvailable();
    } catch {
      redisAvailable = false;
    }

    if (!redisAvailable) {
      return {
        redisAvailable: false,
        partial: true,
        warnings: ['Redis unavailable — leaderboard and identity metrics omitted.'],
        leaderboards: { season: { wallets: 0, sumScores: 0 }, lifetime: { wallets: 0, sumScores: 0 } },
        identity: { walletsWithIdentityBlob: 0, partial: true },
        invites: {
          ledgerEnabled: inviteHistoryService.isEnabled(),
          codesIssued: invites.codesIssued,
          redemptions: invites.redemptions,
        },
        dailyEngagement: {
          from: fromD,
          to: toD,
          checkinsFromCounters: 0,
          spinsFromCounters: 0,
        },
      };
    }

    const client = await redisManager.getClient();
    if (!client) {
      return {
        redisAvailable: false,
        partial: true,
        warnings: ['Redis client unavailable — metrics omitted.'],
        leaderboards: { season: { wallets: 0, sumScores: 0 }, lifetime: { wallets: 0, sumScores: 0 } },
        identity: { walletsWithIdentityBlob: 0, partial: true },
        invites: {
          ledgerEnabled: inviteHistoryService.isEnabled(),
          codesIssued: invites.codesIssued,
          redemptions: invites.redemptions,
        },
        dailyEngagement: {
          from: fromD,
          to: toD,
          checkinsFromCounters: 0,
          spinsFromCounters: 0,
        },
      };
    }

    try {
      const [seasonCard, lifeCard, seasonSum, lifeSum, idCount] = await Promise.all([
        client.zcard(ZSET_SEASON),
        client.zcard(ZSET_LIFETIME),
        sumZsetScores(client, ZSET_SEASON),
        sumZsetScores(client, ZSET_LIFETIME),
        countIdentityKeys(client, 2500),
      ]);

      const checkinsFromCounters = await sumStatsCounters(client, fromD, toD, 'checkins');
      const spinsFromCounters = await sumStatsCounters(client, fromD, toD, 'spins');

      let checkinsFromScan: number | undefined;
      let spinsFromScan: number | undefined;
      let scanTruncated = false;

      if (options?.slowDailyScan) {
        const [cScan, sScan] = await Promise.all([
          scanDailyClaimsInRange(client, fromD, toD, 'checkin', 40_000),
          scanDailyClaimsInRange(client, fromD, toD, 'spin', 40_000),
        ]);
        checkinsFromScan = cScan.count;
        spinsFromScan = sScan.count;
        scanTruncated = cScan.truncated || sScan.truncated;
        if (scanTruncated) {
          warnings.push('Daily engagement SCAN hit cap — counts may be incomplete.');
        }
      }

      if (idCount.partial) {
        warnings.push('Identity wallet count SCAN hit iteration cap — value is a lower bound.');
      }

      return {
        redisAvailable: true,
        partial: !!(idCount.partial || scanTruncated),
        warnings: warnings.length ? warnings : undefined,
        leaderboards: {
          season: { wallets: seasonCard, sumScores: seasonSum },
          lifetime: { wallets: lifeCard, sumScores: lifeSum },
        },
        identity: { walletsWithIdentityBlob: idCount.count, partial: idCount.partial },
        invites: {
          ledgerEnabled: inviteHistoryService.isEnabled(),
          codesIssued: invites.codesIssued,
          redemptions: invites.redemptions,
        },
        dailyEngagement: {
          from: fromD,
          to: toD,
          checkinsFromCounters,
          spinsFromCounters,
          ...(checkinsFromScan != null ? { checkinsFromScan, spinsFromScan, scanTruncated } : {}),
        },
      };
    } catch (e) {
      logger.warn('analytics.getSummary failed', { error: (e as Error).message });
      return {
        redisAvailable: true,
        partial: true,
        warnings: [`Analytics read error: ${(e as Error).message}`],
        leaderboards: { season: { wallets: 0, sumScores: 0 }, lifetime: { wallets: 0, sumScores: 0 } },
        identity: { walletsWithIdentityBlob: 0, partial: true },
        invites: {
          ledgerEnabled: inviteHistoryService.isEnabled(),
          codesIssued: invites.codesIssued,
          redemptions: invites.redemptions,
        },
        dailyEngagement: {
          from: fromD,
          to: toD,
          checkinsFromCounters: 0,
          spinsFromCounters: 0,
        },
      };
    }
  },
};
