import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { redisManager } from '../utils/redis';
import { logger } from '../utils/logger';
import { config } from '../config';
import { INVITE_LOOKUP_ADMIN_SENTINEL } from '../constants/invite';
import { inviteHistoryService } from './invite-history.service';
import { analyticsService } from './analytics.service';
import { twitterService } from './twitter.service';
import { discordService } from './discord.service';
import { telegramService } from './telegram.service';
import { evaluateOnchainRule } from './onchain-verifier.service';
import type { OnchainRule } from '../schemas/campaign-def.schema';
import { supabaseSync } from './supabase-sync.service';

const KEY = {
  identity: (addr: string) => `campaign:identity:${addr.toLowerCase()}`,
  xp: (addr: string) => `campaign:xp:${addr.toLowerCase()}`,
  ledger: (addr: string) => `campaign:ledger:${addr.toLowerCase()}`,
  invite: (addr: string) => `campaign:invite:${addr.toLowerCase()}`,
  inviteIndex: (code: string) => `campaign:invite:code:${code.toLowerCase()}`,
  inviteSlotsV2: (addr: string) => `campaign:invite:slots:v2:${addr.toLowerCase()}`,
  inviteActivationV2: (addr: string) => `campaign:invite:activation:v2:${addr.toLowerCase()}`,
  inviteLookupV2: (code: string) => `campaign:invite:lookup:v2:${code.toLowerCase()}`,
  inviteClaimed: (code: string) => `campaign:invite:claimed:v2:${code.toLowerCase()}`,
  daily: (addr: string, date: string, kind: string) =>
    `campaign:daily:${addr.toLowerCase()}:${date}:${kind}`,
  streak: (addr: string) => `campaign:streak:${addr.toLowerCase()}`,
  layout: 'campaign:layout:launch_hub',
  campaigns: 'campaign:list',
  rulePresets: 'campaign:rules:x_presets',
  gateConfig: 'campaign:gate-config:v1',
  baseBalance: (addr: string) => `campaign:base_balance:${addr.toLowerCase()}`,
  oauthVerifier: (id: string) => `campaign:oauth:verifier:${id}`,
  xpRewards: 'campaign:xp-rewards:v1',
  linkXpClaimed: (addr: string, prov: string) =>
    `campaign:link_xp:${addr.toLowerCase()}:${prov}`,
  xMissionCredited: (addr: string, date: string, presetId: string) =>
    `campaign:xmission:credited:${addr.toLowerCase()}:${date}:${presetId}`,
  xMissionTask: (addr: string, date: string, presetId: string, taskId: string) =>
    `campaign:xmission:task:${addr.toLowerCase()}:${date}:${presetId}:${taskId}`,
  onchainDone: (campaignId: string, addr: string) =>
    `campaign:onchain:done:${String(campaignId).toLowerCase()}:${addr.toLowerCase()}`,
  onchainHoldAnchor: (campaignId: string, addr: string) =>
    `campaign:onchain:hold:${String(campaignId).toLowerCase()}:${addr.toLowerCase()}`,
  /** Per-wallet throttle before expensive twitterapi tweet pull for X mission verify */
  xVerifyThrottle: (addr: string) => `campaign:xverify:throttle:${addr.toLowerCase()}`,
  /** Throttle auto follow/guild/group re-check during Launch Hub bootstrap (seconds). */
  socialRefreshThrottle: (addr: string) => `campaign:socialRefresh:${addr.toLowerCase()}`,
};

export type XpRewardsConfig = {
  dailyCheckinBase: number;
  dailyCheckinStreakBonusMax: number;
  dailySpinBuckets: number[];
  linkXp: { x: number; discord: number; telegram: number; solana: number };
  inviteXpInvitee: number;
  inviteXpInviter: number;
  /** Preset id (e.g. daily-meme-share) -> XP for verified daily post */
  xMissionRewards: Record<string, number>;
};

function defaultXpRewardsConfig(): XpRewardsConfig {
  const invitee = Number(process.env.INVITE_XP_INVITEE);
  const inviter = Number(process.env.INVITE_XP_INVITER);
  return {
    dailyCheckinBase: 10,
    dailyCheckinStreakBonusMax: 20,
    dailySpinBuckets: [5, 10, 15, 20, 25, 35, 50, 75],
    linkXp: { x: 75, discord: 75, telegram: 50, solana: 40 },
    inviteXpInvitee: Number.isFinite(invitee) && invitee > 0 ? invitee : 75,
    inviteXpInviter: Number.isFinite(inviter) && inviter > 0 ? inviter : 200,
    xMissionRewards: { 'daily-meme-share': 60, 'gm-engagement': 40 },
  };
}

function parseIdentityJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return o && typeof o === 'object' ? o : null;
  } catch {
    return null;
  }
}

function buildLeaderboardRowPublic(
  rank: number,
  address: string,
  points: number,
  identity: Record<string, unknown> | null,
) {
  const handles = (identity?.handles as Record<string, unknown> | undefined) || {};
  const x = typeof handles.x === 'string' ? handles.x.trim() : '';
  const disc = typeof handles.discord === 'string' ? handles.discord.trim() : '';
  const handle =
    x !== ''
      ? x.startsWith('@')
        ? x
        : `@${x}`
      : disc !== ''
        ? disc.length > 28
          ? `${disc.slice(0, 25)}…`
          : disc
        : `${address.slice(0, 6)}…${address.slice(-4)}`;
  return {
    rank,
    address,
    points,
    handle,
    connections: {
      x: !!identity?.xLinked,
      discord: !!identity?.discordLinked,
      telegram: !!identity?.telegramLinked,
      solana: !!identity?.solanaLinked,
    },
    baseBalanceEligible: !!identity?.baseBalanceEligible,
  };
}

function buildLeaderboardRowAdmin(
  row: ReturnType<typeof buildLeaderboardRowPublic>,
  identity: Record<string, unknown> | null,
) {
  const handles = (identity?.handles as Record<string, unknown> | undefined) || {};
  return {
    ...row,
    handles,
    xEmail: identity?.xEmail ?? null,
    discordEmail: identity?.discordEmail ?? null,
    discordId: identity?.discordId ?? null,
    xId: identity?.xId ?? null,
  };
}

function mergeXpRewardsConfig(input: any): XpRewardsConfig {
  const base = defaultXpRewardsConfig();
  if (!input || typeof input !== 'object') return base;
  const link = { ...base.linkXp, ...(input.linkXp || {}) };
  const xMission = { ...base.xMissionRewards, ...(input.xMissionRewards || {}) };
  const buckets = Array.isArray(input.dailySpinBuckets)
    ? input.dailySpinBuckets.map((n: any) => Number(n)).filter((n: number) => n > 0)
    : base.dailySpinBuckets;
  return {
    dailyCheckinBase: Math.max(1, Number(input.dailyCheckinBase) || base.dailyCheckinBase),
    dailyCheckinStreakBonusMax: Math.max(
      0,
      Number(input.dailyCheckinStreakBonusMax) || base.dailyCheckinStreakBonusMax,
    ),
    dailySpinBuckets: buckets.length ? buckets : base.dailySpinBuckets,
    linkXp: {
      x: Math.max(0, Number(link.x) || 0),
      discord: Math.max(0, Number(link.discord) || 0),
      telegram: Math.max(0, Number(link.telegram) || 0),
      solana: Math.max(0, Number(link.solana) || 0),
    },
    inviteXpInvitee: Math.max(0, Number(input.inviteXpInvitee) || base.inviteXpInvitee),
    inviteXpInviter: Math.max(0, Number(input.inviteXpInviter) || base.inviteXpInviter),
    xMissionRewards: xMission,
  };
}

const DEFAULT_LAYOUT = {
  page: 'launch_hub',
  inviteColSpan: 2 as const,
  blocks: [
    { type: 'InviteCodeBlock', props: {}, colSpan: 2 as const },
    { type: 'SeasonStripBlock', props: {}, colSpan: 1 as const },
    { type: 'EligibilityBannerBlock', props: {}, colSpan: 1 as const },
    { type: 'IdentityChecklistBlock', props: {}, colSpan: 1 as const },
    { type: 'XPSummaryBlock', props: {}, colSpan: 1 as const },
    { type: 'DailyCheckinBlock', props: {}, colSpan: 1 as const },
    { type: 'DailySpinBlock', props: {}, colSpan: 1 as const },
    { type: 'XShareTaskBlock', props: { presetId: 'daily-meme-share' }, colSpan: 2 as const },
    { type: 'CampaignListBlock', props: {}, colSpan: 2 as const },
    { type: 'LeaderboardBlock', props: {}, colSpan: 2 as const },
    { type: 'ConnectGuideBlock', props: {}, colSpan: 1 as const },
  ],
};

/** Dev/demo Sepolia campaigns — aligns with frontend contract env (chain 11155111). Set `RPC_URL_CHAIN_11155111` on the server for verify. */
const DEFAULT_CAMPAIGNS = [
  {
    schemaVersion: 2 as const,
    id: 'sepolia-ceo-snapshot',
    title: 'Hold CEO token (Sepolia)',
    subtitle: 'Snapshot: wallet holds CEO on Ethereum Sepolia',
    status: 'LIVE',
    rewardText: '+75 XP — one-time on-chain check',
    ctaLabel: 'VERIFY',
    cta: 'VERIFY',
    actionUrl: 'https://sepolia.etherscan.io/token/0xA5bcA6252a477C4Eb62cDbabF3C16f7c06b4f741',
    color: 'yellow',
    iconKey: 'meme',
    xpReward: 75,
    chainId: 11155111,
    verificationMode: 'snapshot' as const,
    rule: {
      kind: 'erc20_min_balance' as const,
      token: '0xA5bcA6252a477C4Eb62cDbabF3C16f7c06b4f741',
      thresholdHuman: '0.000001',
    },
  },
  {
    schemaVersion: 2 as const,
    id: 'sepolia-usdc-snapshot',
    title: 'Hold test USDC (Sepolia)',
    subtitle: 'Snapshot: ERC-20 min balance',
    status: 'LIVE',
    rewardText: '+50 XP — configurable token threshold',
    ctaLabel: 'VERIFY',
    cta: 'VERIFY',
    actionUrl: 'https://sepolia.etherscan.io/token/0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    color: 'green',
    iconKey: 'uniswap',
    xpReward: 50,
    chainId: 11155111,
    verificationMode: 'snapshot' as const,
    rule: {
      kind: 'erc20_min_balance' as const,
      token: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
      thresholdHuman: '0.01',
      decimalsOverride: 6,
    },
  },
  {
    schemaVersion: 2 as const,
    id: 'sepolia-minter-nft',
    title: 'NFT from minter (Sepolia)',
    subtitle: 'Snapshot: ERC-721 balance ≥ 1 (minter contract)',
    status: 'LIVE',
    rewardText: '+100 XP — must hold ≥1 NFT',
    ctaLabel: 'VERIFY',
    cta: 'VERIFY',
    actionUrl: 'https://sepolia.etherscan.io/address/0xccb8a72cd9149F85c74de4d3d2D756782aa338e8',
    color: 'purple',
    iconKey: 'invite',
    xpReward: 100,
    chainId: 11155111,
    verificationMode: 'snapshot' as const,
    rule: {
      kind: 'erc721_min_balance' as const,
      contract: '0xccb8a72cd9149F85c74de4d3d2D756782aa338e8',
      minCount: 1,
    },
  },
  {
    schemaVersion: 2 as const,
    id: 'sepolia-ceo-held-window',
    title: 'Hold CEO — timed window',
    subtitle: 'First verify starts a timer; verify again after the hold completes',
    status: 'LIVE',
    rewardText: '+120 XP — proves min. wall time while eligible',
    ctaLabel: 'CHECK STATUS',
    cta: 'CHECK STATUS',
    actionUrl: 'https://sepolia.etherscan.io/token/0xA5bcA6252a477C4Eb62cDbabF3C16f7c06b4f741',
    color: 'red',
    iconKey: 'tag',
    xpReward: 120,
    chainId: 11155111,
    verificationMode: 'held_window' as const,
    minHoldSeconds: 120,
    rule: {
      kind: 'erc20_min_balance' as const,
      token: '0xA5bcA6252a477C4Eb62cDbabF3C16f7c06b4f741',
      thresholdHuman: '0.000001',
    },
  },
  {
    id: 'invite-the-crew',
    title: 'Invite the Crew',
    status: 'LIVE',
    rewardText: '+200 XP per qualified invite',
    cta: 'GRAB CODE',
    color: 'blue',
    iconKey: 'invite',
  },
];

const DEFAULT_X_PRESETS = [
  {
    id: 'daily-meme-share',
    label: 'Daily Meme Share',
    rules: {
      mention: '@rekt_ceo',
      mustHaveMemeImage: false,
      minFriendTags: 2,
      hashtags: ['#RektCEO', '#RektMeme', '#GMRekt'],
      minAccountAgeDays: 60,
      minLikesAfter24h: 3,
      delayBeforeCreditMinutes: 30,
      maxPerDay: 1,
      decayCurveEnabled: true,
    },
    tasks: [
      {
        id: 'mention',
        label: 'Mention @rekt_ceo',
        kind: 'mention',
        required: true,
        xp: 60,
        mention: '@rekt_ceo',
      },
      {
        id: 'meme_image',
        label: 'Attach a meme image',
        kind: 'meme_image',
        required: false,
        xp: 200,
      },
      {
        id: 'friend_tags',
        label: 'Tag 2 friends',
        kind: 'friend_tags',
        required: false,
        xp: 30,
        minFriendTags: 2,
      },
      {
        id: 'hashtags',
        label: 'Campaign hashtags',
        kind: 'hashtags',
        required: false,
        xp: 30,
        hashtags: ['#RektCEO', '#RektMeme', '#GMRekt'],
      },
    ],
  },
  {
    id: 'gm-engagement',
    label: 'GM Engagement (replies/quotes)',
    rules: {
      mention: '@rekt_ceo',
      mustHaveMemeImage: false,
      minFriendTags: 0,
      hashtags: ['#GMRekt'],
      minAccountAgeDays: 30,
      minLikesAfter24h: 1,
      delayBeforeCreditMinutes: 15,
      maxPerDay: 3,
      decayCurveEnabled: true,
    },
    tasks: [
      {
        id: 'mention',
        label: 'Mention @rekt_ceo',
        kind: 'mention',
        required: true,
        xp: 25,
        mention: '@rekt_ceo',
      },
      {
        id: 'hashtags',
        label: 'Use #GMRekt',
        kind: 'hashtags',
        required: true,
        xp: 20,
        hashtags: ['#GMRekt'],
      },
    ],
  },
];

// Eligibility gate keys that the admin can toggle.
// `enabled=false` hides the row entirely. `required=true` makes it block the gate.
// `evmConnected` is intentionally omitted from the admin-toggleable surface — it is the
// foundational identity check (no SIWE -> no token -> nothing to gate). It is always required.
type GateKey =
  | 'baseBalanceEligible'
  | 'xLinked'
  | 'xFollowsRektCeo'
  | 'discordLinked'
  | 'discordInGuild'
  | 'telegramLinked'
  | 'telegramInGroup';

interface GateRequirementConfig {
  required: boolean;
  enabled: boolean;
  label: string;
  description?: string;
}

type GateConfig = Record<GateKey, GateRequirementConfig>;

const DEFAULT_GATE_CONFIG: GateConfig = {
  baseBalanceEligible: {
    required: false,
    enabled: true,
    label: 'Hold $10 USD on Base',
    description: 'Wallet must hold ≥ $10 USD equivalent (ETH + USDC) on Base.',
  },
  xLinked: {
    required: true,
    enabled: true,
    label: 'Connect X (Twitter)',
    description: 'Link your X account via OAuth so we can verify follow + posts.',
  },
  xFollowsRektCeo: {
    required: true,
    enabled: true,
    label: 'Follow @rekt_ceo on X',
    description: 'You must follow @rekt_ceo from your linked account.',
  },
  discordLinked: {
    required: true,
    enabled: true,
    label: 'Connect Discord',
    description: 'Link your Discord account so we can verify guild membership.',
  },
  discordInGuild: {
    required: true,
    enabled: true,
    label: 'Join Rekt CEO Discord',
    description: 'Be a member of the configured Rekt CEO Discord server.',
  },
  telegramLinked: {
    required: false,
    enabled: true,
    label: 'Connect Telegram',
    description: 'Login with Telegram (optional unless admin makes it required).',
  },
  telegramInGroup: {
    required: false,
    enabled: true,
    label: 'Join Rekt CEO Telegram',
    description: 'Be a member of the configured Telegram group.',
  },
};

function normalizeGateConfig(input: any): GateConfig {
  const out = { ...DEFAULT_GATE_CONFIG };
  if (!input || typeof input !== 'object') return out;
  for (const k of Object.keys(DEFAULT_GATE_CONFIG) as GateKey[]) {
    const def = DEFAULT_GATE_CONFIG[k];
    const incoming = input[k] || {};
    out[k] = {
      required: typeof incoming.required === 'boolean' ? incoming.required : def.required,
      enabled: typeof incoming.enabled === 'boolean' ? incoming.enabled : def.enabled,
      label: typeof incoming.label === 'string' && incoming.label.trim() ? incoming.label : def.label,
      description:
        typeof incoming.description === 'string' && incoming.description.trim()
          ? incoming.description
          : def.description,
    };
  }
  return out;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeNonce(address: string, date = todayKey()): string {
  const slug = address ? address.slice(2, 8).toUpperCase() : 'XXXXXX';
  return `REKT-${slug}-${date.replace(/-/g, '')}`;
}

function tweetText(tweet: any): string {
  const text: string = tweet?.text || tweet?.full_text || tweet?.content || '';
  return typeof text === 'string' ? text : '';
}

function tweetCreatedMs(tweet: any): number | null {
  const raw = tweet?.createdAt || tweet?.created_at || tweet?.created_at_ms;
  if (typeof raw === 'string') {
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  return null;
}

function tweetLikeCount(tweet: any): number | null {
  const n = tweet?.favorite_count ?? tweet?.like_count ?? tweet?.legacy?.favorite_count ?? tweet?.public_metrics?.like_count;
  if (n == null) return null;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

function tweetHasImageMedia(tweet: any): boolean {
  const buckets = [tweet?.extended_entities?.media, tweet?.entities?.media, tweet?.media];
  for (const list of buckets) {
    if (!Array.isArray(list)) continue;
    for (const m of list) {
      const t = (m?.type || m?.media_type || '').toLowerCase();
      if (t === 'photo' || t === 'animated_gif' || t === 'video') return true;
    }
  }
  // twitterapi.io often provides `media` as an array of URLs or objects
  if (Array.isArray(tweet?.media) && tweet.media.length > 0) return true;
  if (tweet?.entities?.media && Array.isArray(tweet.entities.media) && tweet.entities.media.length > 0) return true;
  // some variations put media directly at the root
  if (Array.isArray(tweet?.photos) && tweet.photos.length > 0) return true;
  if (Array.isArray(tweet?.video) && tweet.video.length > 0) return true;
  if (tweet?.media?.photos && Array.isArray(tweet.media.photos) && tweet.media.photos.length > 0) return true;
  return false;
}

function countHandleMentions(text: string): number {
  const m = text.match(/@\w+/g);
  return m ? m.length : 0;
}

export type XMissionTaskKind = 'mention' | 'meme_image' | 'friend_tags' | 'hashtags';

export type NormalizedMissionTask = {
  id: string;
  label: string;
  kind: XMissionTaskKind;
  required: boolean;
  xp: number;
  mention?: string;
  minFriendTags?: number;
  hashtags?: string[];
};

function slugMissionTaskId(raw: string): string {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (s || 'task').slice(0, 48);
}

function deriveMissionTasksFromRules(rules: any): NormalizedMissionTask[] {
  const mention = rules?.mention || '@rekt_ceo';
  const tasks: NormalizedMissionTask[] = [
    {
      id: 'mention',
      label: 'Mention @rekt_ceo',
      kind: 'mention',
      required: true,
      xp: 60,
      mention,
    },
    {
      id: 'meme_image',
      label: 'Attach a meme image',
      kind: 'meme_image',
      required: false,
      xp: 200,
    },
  ];
  if (Number(rules?.minFriendTags) > 0) {
    tasks.push({
      id: 'friend_tags',
      label: `Tag ${rules.minFriendTags} friends`,
      kind: 'friend_tags',
      required: false,
      xp: 25,
      minFriendTags: Number(rules.minFriendTags),
    });
  }
  if (Array.isArray(rules?.hashtags) && rules.hashtags.length) {
    tasks.push({
      id: 'hashtags',
      label: 'Campaign hashtags',
      kind: 'hashtags',
      required: false,
      xp: 25,
      hashtags: rules.hashtags.map((h: any) => String(h)),
    });
  }
  return tasks;
}

export function normalizeMissionTasks(preset: any): NormalizedMissionTask[] {
  const raw = preset?.tasks;
  const rules = preset?.rules || {};
  if (Array.isArray(raw) && raw.length > 0) {
    const out: NormalizedMissionTask[] = [];
    for (const t of raw) {
      const kind = t?.kind as XMissionTaskKind;
      if (kind !== 'mention' && kind !== 'meme_image' && kind !== 'friend_tags' && kind !== 'hashtags') {
        continue;
      }
      const id = slugMissionTaskId(t.id || kind);
      const hashtags =
        kind === 'hashtags' && Array.isArray(t.hashtags)
          ? t.hashtags.map((h: any) => String(h))
          : kind === 'hashtags' && typeof t.hashtags === 'string'
            ? t.hashtags
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
            : undefined;
      out.push({
        id,
        label: typeof t.label === 'string' && t.label.trim() ? t.label.trim() : id,
        kind,
        required: !!t.required,
        xp: Math.max(0, Number(t.xp) || 0),
        mention: typeof t.mention === 'string' ? t.mention : kind === 'mention' ? rules.mention : undefined,
        minFriendTags:
          kind === 'friend_tags' && t.minFriendTags != null ? Number(t.minFriendTags) : undefined,
        hashtags,
      });
    }
    return out.length ? out : deriveMissionTasksFromRules(rules);
  }
  return deriveMissionTasksFromRules(rules);
}

function tweetUtcDateKey(tweet: any): string | null {
  const ms = tweetCreatedMs(tweet);
  if (ms == null) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Per-tweet gates from preset.rules (delay, 24h likes) — false = skip tweet for scoring. */
function tweetPassesPresetTweetGuards(tweet: any, rules: any): boolean {
  const delayMin = Number(rules?.delayBeforeCreditMinutes) || 0;
  if (delayMin > 0) {
    const created = tweetCreatedMs(tweet);
    if (created != null) {
      const ageMin = (Date.now() - created) / 60_000;
      if (ageMin < delayMin) return false;
    }
  }
  const minLikes = Number(rules?.minLikesAfter24h) || 0;
  if (minLikes > 0) {
    const created = tweetCreatedMs(tweet);
    if (created != null) {
      const ageH = (Date.now() - created) / 3_600_000;
      if (ageH >= 24) {
        const likes = tweetLikeCount(tweet);
        if (likes != null && likes < minLikes) return false;
      }
    }
  }
  return true;
}

function matchesMissionTask(tweet: any, task: NormalizedMissionTask, rulesFallback: any): boolean {
  const text = tweetText(tweet);
  const lower = text.toLowerCase();
  switch (task.kind) {
    case 'mention': {
      const mention = String(task.mention || rulesFallback?.mention || '@rekt_ceo').toLowerCase();
      const mentionNorm = mention.replace(/^@/, '');
      return lower.includes(`@${mentionNorm}`) || lower.includes(mention);
    }
    case 'meme_image':
      return tweetHasImageMedia(tweet);
    case 'friend_tags': {
      const minF = Number(task.minFriendTags) || 0;
      if (minF <= 0) return false;
      const mentions = countHandleMentions(text);
      return mentions >= minF + 1;
    }
    case 'hashtags': {
      const tags = Array.isArray(task.hashtags) ? task.hashtags : [];
      if (!tags.length) return false;
      for (const tag of tags) {
        if (!lower.includes(String(tag).toLowerCase())) return false;
      }
      return true;
    }
    default:
      return false;
  }
}

function matchesAllRequiredMissionTasks(
  tweet: any,
  tasks: NormalizedMissionTask[],
  rulesFallback: any,
): boolean {
  const req = tasks.filter((t) => t.required);
  if (!req.length) return true;
  return req.every((t) => matchesMissionTask(tweet, t, rulesFallback));
}

/** Human-readable why `tweetPassesPresetTweetGuards` would be false — for UX hints. */
function tweetGuardSkipReason(tweet: any, rules: any): string | null {
  const delayMin = Number(rules?.delayBeforeCreditMinutes) || 0;
  if (delayMin > 0) {
    const created = tweetCreatedMs(tweet);
    if (created != null) {
      const ageMin = (Date.now() - created) / 60_000;
      if (ageMin < delayMin) {
        const left = Math.max(1, Math.ceil(delayMin - ageMin));
        return `Post is inside the cooldown window (~${delayMin} min after posting, ~${left} min left before verify counts it).`;
      }
    }
  }
  const minLikes = Number(rules?.minLikesAfter24h) || 0;
  if (minLikes > 0) {
    const created = tweetCreatedMs(tweet);
    if (created != null) {
      const ageH = (Date.now() - created) / 3_600_000;
      if (ageH >= 24) {
        const likes = tweetLikeCount(tweet);
        if (likes != null && likes < minLikes) {
          return `After 24 hours this post needs at least ${minLikes} likes to qualify (currently ~${likes}).`;
        }
      }
    }
  }
  return null;
}

function taskMismatchHintForKind(task: NormalizedMissionTask, rulesFallback: any): string {
  switch (task.kind) {
    case 'mention': {
      const m = String(task.mention || rulesFallback?.mention || '@rekt_ceo').trim();
      return `Put ${m.startsWith('@') ? m : `@${m}`} in the post text so we can detect the mention.`;
    }
    case 'meme_image':
      return 'Attach an image or GIF — videos alone may not count as “meme media” depending on payload.';
    case 'friend_tags': {
      const n = Number(task.minFriendTags) || Number(rulesFallback?.minFriendTags) || 0;
      const need = Math.max(1, n);
      return `Tag at least ${need} other accounts besides yourself (mentions / @handles in the tweet).`;
    }
    case 'hashtags': {
      const tags = Array.isArray(task.hashtags) ? task.hashtags : [];
      const list = tags.length ? tags.join(', ') : '(configured hashtags)';
      return `Include every hashtag in one post — required set: ${list}.`;
    }
    default:
      return 'Adjust the tweet to satisfy this checklist row.';
  }
}

/** Why a pending task stayed uncredited despite tweets that passed guards. */
function explainPendingXMissionTask(
  task: NormalizedMissionTask,
  tasks: NormalizedMissionTask[],
  rules: any,
  guardedPosts: any[],
): string {
  if (!guardedPosts.length) {
    return 'Posts from UTC today didn’t survive delay / scoring filters yet — adjust timing or eligibility, then retry.';
  }

  let seenTaskWithoutRequiredBundle = false;
  for (const tweet of guardedPosts) {
    const taskOk = matchesMissionTask(tweet, task, rules);
    const requiredOk = matchesAllRequiredMissionTasks(tweet, tasks, rules);
    if (taskOk && !requiredOk) seenTaskWithoutRequiredBundle = true;
  }

  if (!task.required && seenTaskWithoutRequiredBundle) {
    return 'Optional bonuses only award when one post satisfies every required task.';
  }

  const anyTweetMatchesTask = guardedPosts.some((tw) => matchesMissionTask(tw, task, rules));
  if (!anyTweetMatchesTask) return taskMismatchHintForKind(task, rules);

  if (!task.required) {
    return 'No single post qualifies for this optional row together with every required rule.';
  }
  return `${taskMismatchHintForKind(task, rules)} If you edited the post recently, changes can take time to propagate — wait and verify again.`;
}

type XMTaskVerificationOutcome = 'credited_now' | 'already_credited' | 'pending' | 'pending_cooldown';

function buildXMissionVerificationReport(args: {
  today: string;
  tweetsFetched: number;
  postsTodayUtc: number;
  utcTodayPosts: any[];
  guardedPosts: any[];
  tasks: NormalizedMissionTask[];
  rules: any;
  newCredits: Array<{ taskId: string; xp: number }>;
  creditedIdsFinal: Set<string>;
  pendingCredits: Array<{ taskId: string; xp: number; unlocksAt: number }>;
}): {
  todayUtc: string;
  tweetsFetched: number;
  postsTodayUtc: number;
  postsEligibleAfterGuards: number;
  globalHints: string[];
  tasks: Array<{
    taskId: string;
    label: string;
    kind: string;
    required: boolean;
    xp: number;
    outcome: XMTaskVerificationOutcome;
    detail?: string;
    unlocksAt?: number;
  }>;
} {
  const {
    today,
    tweetsFetched,
    postsTodayUtc,
    utcTodayPosts,
    guardedPosts,
    tasks,
    rules,
    newCredits,
    creditedIdsFinal,
    pendingCredits,
  } = args;
  const globalHints: string[] = [];
  if (tweetsFetched === 0) {
    globalHints.push('No recent posts were returned — post from your linked X account first.');
  } else if (postsTodayUtc === 0) {
    globalHints.push(
      `No posts fell on UTC day ${today} — we grade on UTC even if your timezone differs.`,
    );
  } else if (utcTodayPosts.length > 0 && guardedPosts.length === 0) {
    const newest = [...utcTodayPosts].sort(
      (a, b) => (tweetCreatedMs(b) || 0) - (tweetCreatedMs(a) || 0),
    )[0];
    const g = tweetGuardSkipReason(newest, rules);
    if (g) globalHints.push(g);
    else
      globalHints.push(
        'Posts from UTC today did not pass delay / 24h-like rules yet — check mission timing settings.',
      );
  }

  const taskReports = tasks.map((t) => {
    const creditedNow = newCredits.some((c) => c.taskId === t.id);
    if (creditedNow) {
      return {
        taskId: t.id,
        label: t.label,
        kind: t.kind,
        required: t.required,
        xp: t.xp,
        outcome: 'credited_now' as const,
        detail: 'Credited XP on this verification run.',
      };
    }
    if (creditedIdsFinal.has(t.id)) {
      return {
        taskId: t.id,
        label: t.label,
        kind: t.kind,
        required: t.required,
        xp: t.xp,
        outcome: 'already_credited' as const,
        detail: 'Already counted for UTC today.',
      };
    }
    const pendingCredit = pendingCredits.find((c) => c.taskId === t.id);
    if (pendingCredit) {
      return {
        taskId: t.id,
        label: t.label,
        kind: t.kind,
        required: t.required,
        xp: t.xp,
        outcome: 'pending_cooldown' as const,
        detail: `Valid post detected! Auto-crediting in ~${Math.ceil(Math.max(0, pendingCredit.unlocksAt - Date.now()) / 60000)}m.`,
        unlocksAt: pendingCredit.unlocksAt,
      };
    }
    return {
      taskId: t.id,
      label: t.label,
      kind: t.kind,
      required: t.required,
      xp: t.xp,
      outcome: 'pending' as const,
      detail: explainPendingXMissionTask(t, tasks, rules, guardedPosts),
    };
  });

  return {
    todayUtc: today,
    tweetsFetched,
    postsTodayUtc,
    postsEligibleAfterGuards: guardedPosts.length,
    globalHints,
    tasks: taskReports,
  };
}

function validateTweetAgainstMissionRules(
  tweet: any,
  rules: any,
): { ok: true } | { ok: false; code: string; message: string } {
  const text = tweetText(tweet);
  const lower = text.toLowerCase();
  const mention = String(rules?.mention || '@rekt_ceo').toLowerCase();
  const mentionNorm = mention.replace(/^@/, '');
  if (!lower.includes(`@${mentionNorm}`) && !lower.includes(mention)) {
    return {
      ok: false,
      code: 'missing_mention',
      message: `Post must mention ${rules?.mention || '@rekt_ceo'}.`,
    };
  }

  const hashtags: string[] = Array.isArray(rules?.hashtags) ? rules.hashtags : [];
  for (const tag of hashtags) {
    const t = String(tag).toLowerCase();
    if (!lower.includes(t)) {
      return { ok: false, code: 'missing_hashtag', message: `Missing required hashtag: ${tag}` };
    }
  }

  const minFriends = Number(rules?.minFriendTags) || 0;
  if (minFriends > 0) {
    const mentions = countHandleMentions(text);
    if (mentions < minFriends + 1) {
      return {
        ok: false,
        code: 'not_enough_tags',
        message: `Tag at least ${minFriends} other accounts (in addition to the project).`,
      };
    }
  }

  if (rules?.mustHaveMemeImage && !tweetHasImageMedia(tweet)) {
    return {
      ok: false,
      code: 'missing_media',
      message: 'Post must include an image or GIF (meme media).',
    };
  }

  const delayMin = Number(rules?.delayBeforeCreditMinutes) || 0;
  if (delayMin > 0) {
    const created = tweetCreatedMs(tweet);
    if (created != null) {
      const ageMin = (Date.now() - created) / 60_000;
      if (ageMin < delayMin) {
        return {
          ok: false,
          code: 'too_fresh',
          message: `Wait ~${delayMin} minutes after posting, then verify again.`,
        };
      }
    }
  }

  const minLikes = Number(rules?.minLikesAfter24h) || 0;
  if (minLikes > 0) {
    const created = tweetCreatedMs(tweet);
    if (created != null) {
      const ageH = (Date.now() - created) / 3_600_000;
      if (ageH >= 24) {
        const likes = tweetLikeCount(tweet);
        if (likes != null && likes < minLikes) {
          return {
            ok: false,
            code: 'not_enough_likes',
            message: `After 24h the post needs at least ${minLikes} likes — grow engagement and try again.`,
          };
        }
      }
    }
  }

  return { ok: true };
}

async function checkMissionAccountAge(
  handle: string,
  rules: any,
): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const minDays = Number(rules?.minAccountAgeDays) || 0;
  if (minDays <= 0) return { ok: true };

  try {
    const info: any = await twitterService.getUserInfo(handle);
    const createdRaw =
      info?.createdAt ||
      info?.created_at ||
      info?.userCreatedAt ||
      info?.data?.createdAt ||
      info?.data?.created_at ||
      info?.legacy?.created_at;
    if (!createdRaw) {
      return { ok: true };
    }
    const ms = typeof createdRaw === 'string' ? Date.parse(createdRaw) : Number(createdRaw);
    if (!Number.isFinite(ms)) {
      return { ok: true };
    }
    const days = (Date.now() - ms) / 86_400_000;
    if (days < minDays) {
      return {
        ok: false,
        code: 'account_too_new',
        message: `X account must be at least ${minDays} days old for this mission.`,
      };
    }
  } catch {
    /* best-effort */
  }

  return { ok: true };
}

export type InviteCodeSlot = {
  code: string;
  status: 'open' | 'redeemed';
  redeemedBy?: string;
  redeemedAt?: string;
};

export type InviteSlotsBatch = {
  batchId: string;
  ownerAddr: string;
  codes: InviteCodeSlot[];
  updatedAt: string;
};

export type InviteActivationRecord = {
  code: string;
  inviterAddress: string | null;
  bootstrap: boolean;
  /** True when the code was minted via admin on-demand (no peer inviter XP). */
  adminMint?: boolean;
  xpInvitee: number;
  xpInviter: number;
  activatedAt: string;
};

function randomInviteSegment(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export function normalizeInviteCodeInput(raw: string): string | null {
  const s = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!/^REKT-[A-Z0-9]{4,20}$/.test(s)) return null;
  return s;
}

function parseBootstrapCodes(): Set<string> {
  const raw = process.env.LAUNCH_HUB_BOOTSTRAP_CODES || '';
  const set = new Set<string>();
  for (const part of raw.split(',')) {
    const c = normalizeInviteCodeInput(part);
    if (c) set.add(c);
  }
  return set;
}

export type InviteBootstrapSlice = {
  inviteWall: boolean;
  batch: InviteSlotsBatch | null;
  activation: InviteActivationRecord | null;
  canRotate: boolean;
};

class CampaignService {
  private memCache = new Map<string, any>();

  getDailyNoncePhrase(address?: string): string {
    return makeNonce(address || '');
  }

  private async withRedis<T = unknown>(fn: (client: any) => Promise<T>, fallback: () => T): Promise<T> {
    try {
      const client = await redisManager.getClient();
      if (!client) return fallback();
      return await fn(client);
    } catch (error) {
      logger.warn('Redis access failed, using fallback', { error: (error as Error).message });
      return fallback();
    }
  }

  async getLayout() {
    return this.withRedis(
      async (client) => {
        const raw = await client.get(KEY.layout);
        if (raw) return JSON.parse(raw);
        await client.set(KEY.layout, JSON.stringify(DEFAULT_LAYOUT));
        return DEFAULT_LAYOUT;
      },
      () => this.memCache.get(KEY.layout) || DEFAULT_LAYOUT,
    );
  }

  async setLayout(layout: any) {
    await this.withRedis(
      async (client) => {
        await client.set(KEY.layout, JSON.stringify(layout));
        return true;
      },
      () => {
        this.memCache.set(KEY.layout, layout);
        return true;
      },
    );
    void supabaseSync.snapshotAdminConfig('layout', layout);
    return layout;
  }

  async setCampaigns(campaigns: any[]) {
    await this.withRedis(
      async (client) => {
        await client.set(KEY.campaigns, JSON.stringify(campaigns));
        return true;
      },
      () => {
        this.memCache.set(KEY.campaigns, campaigns);
        return true;
      },
    );
    void supabaseSync.snapshotAdminConfig('campaigns', campaigns);
    return campaigns;
  }

  /**
   * API-facing shape including legacy Redis rows mapped to predictable fields.
   */
  normalizeCampaignRow(c: any): any {
    if (!c || typeof c !== 'object') return c;
    const sv = Number((c as Record<string, unknown>).schemaVersion);
    if ((c as Record<string, unknown>).schemaVersion === 2 || sv === 2) {
      const o = c as Record<string, unknown>;
      const ctaLabel = typeof o.ctaLabel === 'string' && o.ctaLabel.trim() ? o.ctaLabel : typeof o.cta === 'string' && o.cta ? String(o.cta) : 'OPEN';
      return {
        ...o,
        schemaVersion: 2,
        ctaLabel,
        cta: ctaLabel,
        verificationMode: (o.verificationMode as string) || 'none',
        xpReward: Math.max(0, Number(o.xpReward) || 0),
        chainId: Number(o.chainId) || 8453,
        actionUrl:
          typeof o.actionUrl === 'string' && o.actionUrl.trim() ? String(o.actionUrl).trim() : undefined,
      };
    }
    const o = c as Record<string, unknown>;
    const ctaLabel = typeof o.cta === 'string' && o.cta.trim() ? String(o.cta) : 'OPEN';
    return {
      ...o,
      schemaVersion: 1,
      verificationMode: 'none',
      xpReward: 0,
      chainId: 8453,
      ctaLabel,
      cta: ctaLabel,
    };
  }

  async getCampaigns(): Promise<any[]> {
    return this.withRedis(
      async (client) => {
        const raw = await client.get(KEY.campaigns);
        let list = raw ? JSON.parse(raw) : DEFAULT_CAMPAIGNS;
        if (!raw) await client.set(KEY.campaigns, JSON.stringify(DEFAULT_CAMPAIGNS));
        list = Array.isArray(list) ? list : DEFAULT_CAMPAIGNS;
        return list.map((row: unknown) => this.normalizeCampaignRow(row));
      },
      () =>
        Array.isArray(this.memCache.get(KEY.campaigns))
          ? (this.memCache.get(KEY.campaigns) as any[]).map((row) => this.normalizeCampaignRow(row))
          : DEFAULT_CAMPAIGNS.map((row) => this.normalizeCampaignRow(row)),
    );
  }

  /** Raw list for persistence path / verify lookup (normalized fields only). */
  private async _getCampaignsRaw(): Promise<any[]> {
    return this.withRedis(
      async (client) => {
        const raw = await client.get(KEY.campaigns);
        if (!raw) {
          await client.set(KEY.campaigns, JSON.stringify(DEFAULT_CAMPAIGNS));
          return DEFAULT_CAMPAIGNS;
        }
        let list = JSON.parse(raw);
        if (!Array.isArray(list)) list = DEFAULT_CAMPAIGNS;
        return list;
      },
      () =>
        Array.isArray(this.memCache.get(KEY.campaigns)) ? (this.memCache.get(KEY.campaigns) as any[]) : DEFAULT_CAMPAIGNS,
    );
  }

  private async _campaignById(rawId: string): Promise<{ raw: Record<string, unknown>; normalized: any } | null> {
    const list = await this._getCampaignsRaw();
    const id = rawId.trim();
    const raw = list.find((c: Record<string, unknown>) => String(c?.id ?? '') === id);
    if (!raw) return null;
    return { raw: { ...raw } as Record<string, unknown>, normalized: this.normalizeCampaignRow(raw) };
  }

  async enrichCampaignListWithViewer(
    campaignsNormalized: any[],
    address?: string,
  ): Promise<Array<Record<string, unknown>>> {
    const addrLower = address?.toLowerCase();
    return Promise.all(
      campaignsNormalized.map(async (campaign) => {
        const prog = addrLower
          ? await this.getCampaignProgressForViewer(addrLower, campaign)
          : { verifiable: false, completed: false };
        return { ...(campaign as object), viewerProgress: prog } as Record<string, unknown>;
      }),
    );
  }

  /** Status for Refresh/Hold UX. */
  async getCampaignProgressForViewer(
    addressLower: string,
    campaignNormalized: any,
  ): Promise<Record<string, unknown>> {
    const mode = campaignNormalized?.verificationMode;
    if (!mode || mode === 'none') {
      return { verifiable: false, completed: false };
    }

    const id = campaignNormalized?.id;
    if (!id) return { verifiable: false, completed: false };

    const completed = await this.withRedis<boolean>(
      async (client) => {
        const v = await client.get(KEY.onchainDone(String(id), addressLower));
        return !!v;
      },
      () => !!this.memCache.get(KEY.onchainDone(String(id), addressLower)),
    );

    let holdAnchorMs: number | null = null;
    if (campaignNormalized.verificationMode === 'held_window') {
      await this.withRedis(
        async (client) => {
          const ms = await client.get(KEY.onchainHoldAnchor(String(id), addressLower));
          if (ms) holdAnchorMs = Number(ms);
          return true;
        },
        () => {
          const m = this.memCache.get(KEY.onchainHoldAnchor(String(id), addressLower)) as string | undefined;
          if (m) holdAnchorMs = Number(m);
          return true;
        },
      );
    }

    const holdMs = Number(campaignNormalized.minHoldSeconds) * 1000 || 0;
    const elapsedOk =
      campaignNormalized.verificationMode === 'snapshot' ||
      (campaignNormalized.verificationMode === 'held_window' &&
        holdAnchorMs != null &&
        Date.now() - holdAnchorMs >= holdMs);

    return {
      verifiable: true,
      verificationMode: mode,
      completed,
      holdStartedAt: holdAnchorMs ? new Date(holdAnchorMs).toISOString() : undefined,
      minHoldSeconds: campaignNormalized.minHoldSeconds ?? undefined,
      elapsedMinHold: !!elapsedOk,
      xpReward: campaignNormalized.xpReward ?? 0,
    };
  }

  async verifyOnchainCampaign(wallet: string, campaignId: string): Promise<
    | { ok: true; already: boolean; xp: any }
    | {
      ok: false;
      code:
      | 'not_found'
      | 'not_verifiable'
      | 'already_completed'
      | 'rpc_error'
      | 'rule_not_met'
      | 'hold_started'
      | 'hold_pending'
      | 'gate_blocked';
      message: string;
      holdStartedAt?: string;
    }
  > {
    const lookup = await this._campaignById(campaignId);
    if (!lookup) return { ok: false, code: 'not_found', message: 'Unknown campaign id' };

    const n = lookup.normalized;
    const mode = n.verificationMode;
    if (!mode || mode === 'none') {
      return { ok: false, code: 'not_verifiable', message: 'This campaign has no on-chain verification' };
    }

    const identity = await this.getIdentity(wallet);
    const gateConfig = await this.getGateConfig();
    const eligibility = this.computeEligibility(identity, gateConfig);
    if (!eligibility.eligible) {
      return { ok: false, code: 'gate_blocked', message: 'Complete Launch Hub eligibility first' };
    }

    const rule = n.rule as OnchainRule | undefined;
    if (!rule) return { ok: false, code: 'not_verifiable', message: 'Campaign rule missing' };

    const chainId = Number(n.chainId) || 8453;
    const xpAmount = Math.max(0, Number(n.xpReward) || 0);

    const already = await this.withRedis<boolean>(
      async (client) => !!(await client.get(KEY.onchainDone(campaignId, wallet))),
      () => !!this.memCache.get(KEY.onchainDone(campaignId, wallet)),
    );
    if (already) {
      const xp = await this.getXp(wallet);
      return { ok: true, already: true, xp };
    }

    const evalResult = await evaluateOnchainRule(wallet, chainId, rule);

    if (!evalResult.ok) {
      if (mode === 'held_window') {
        await this._clearHoldAnchor(campaignId, wallet);
      }
      return {
        ok: false,
        code: evalResult.code === 'rpc_error' ? 'rpc_error' : 'rule_not_met',
        message: evalResult.message,
      };
    }

    if (mode === 'snapshot') {
      return this._finalizeOnchainClaim(wallet, campaignId, xpAmount);
    }

    const minMs = Math.max(1000, Number(n.minHoldSeconds) * 1000 || 0);
    const anchor = await this._getHoldAnchorMs(campaignId, wallet);

    if (anchor == null) {
      await this._setHoldAnchorNow(campaignId, wallet);
      const now = Date.now();
      return {
        ok: false,
        code: 'hold_started',
        message: `Eligibility recorded. Wait ${n.minHoldSeconds}s from first check, then refresh again while still eligible.`,
        holdStartedAt: new Date(now).toISOString(),
      };
    }

    if (Date.now() - anchor < minMs) {
      return {
        ok: false,
        code: 'hold_pending',
        message: 'Minimum hold period not reached yet. Try again later.',
        holdStartedAt: new Date(anchor).toISOString(),
      };
    }

    return this._finalizeOnchainClaim(wallet, campaignId, xpAmount);
  }

  private async _getHoldAnchorMs(campaignId: string, wallet: string): Promise<number | null> {
    return this.withRedis(
      async (client) => {
        const v = await client.get(KEY.onchainHoldAnchor(campaignId, wallet));
        return v ? Number(v) : null;
      },
      () => {
        const m = this.memCache.get(KEY.onchainHoldAnchor(campaignId, wallet)) as string | undefined;
        return m ? Number(m) : null;
      },
    );
  }

  private async _setHoldAnchorNow(campaignId: string, wallet: string): Promise<void> {
    const ts = String(Date.now());
    await this.withRedis(
      async (client) => {
        await client.set(KEY.onchainHoldAnchor(campaignId, wallet), ts, 'EX', 60 * 60 * 24 * 60);
        return true;
      },
      () => {
        this.memCache.set(KEY.onchainHoldAnchor(campaignId, wallet), ts);
        return true;
      },
    );
  }

  private async _clearHoldAnchor(campaignId: string, wallet: string): Promise<void> {
    await this.withRedis(
      async (client) => {
        await client.del(KEY.onchainHoldAnchor(campaignId, wallet));
        return true;
      },
      () => {
        this.memCache.delete(KEY.onchainHoldAnchor(campaignId, wallet));
        return true;
      },
    );
  }

  private async _finalizeOnchainClaim(
    wallet: string,
    campaignId: string,
    xpAmount: number,
  ): Promise<{ ok: true; already: boolean; xp: any }> {
    const nx = await this.withRedis<boolean>(
      async (client) => {
        const r = await client.set(KEY.onchainDone(campaignId, wallet), new Date().toISOString(), 'NX');
        return r === 'OK';
      },
      () => {
        const k = KEY.onchainDone(campaignId, wallet);
        if (this.memCache.has(k)) return false;
        this.memCache.set(k, '1');
        return true;
      },
    );
    if (!nx) {
      const xp = await this.getXp(wallet);
      return { ok: true, already: true, xp };
    }
    const xp = await this.addXp(wallet, xpAmount, `onchain_campaign_${campaignId}`);
    await this._clearHoldAnchor(campaignId, wallet);
    void supabaseSync.recordOnchainCompletion(campaignId, wallet, xpAmount);
    return { ok: true, already: false, xp };
  }

  async getXRulePresets() {
    return this.withRedis(
      async (client) => {
        const raw = await client.get(KEY.rulePresets);
        if (raw) return JSON.parse(raw);
        await client.set(KEY.rulePresets, JSON.stringify(DEFAULT_X_PRESETS));
        return DEFAULT_X_PRESETS;
      },
      () => this.memCache.get(KEY.rulePresets) || DEFAULT_X_PRESETS,
    );
  }

  async setXRulePresets(presets: any[]) {
    await this.withRedis(
      async (client) => {
        await client.set(KEY.rulePresets, JSON.stringify(presets));
        return true;
      },
      () => {
        this.memCache.set(KEY.rulePresets, presets);
        return true;
      },
    );
    void supabaseSync.snapshotAdminConfig('x_presets', presets);
    return presets;
  }

  async getXpRewardsConfig(): Promise<XpRewardsConfig> {
    return this.withRedis(
      async (client) => {
        const raw = await client.get(KEY.xpRewards);
        if (!raw) return defaultXpRewardsConfig();
        try {
          return mergeXpRewardsConfig(JSON.parse(raw));
        } catch {
          return defaultXpRewardsConfig();
        }
      },
      () => defaultXpRewardsConfig(),
    );
  }

  async setXpRewardsConfig(input: any): Promise<XpRewardsConfig> {
    const merged = mergeXpRewardsConfig(input);
    await this.withRedis(
      async (client) => {
        await client.set(KEY.xpRewards, JSON.stringify(merged));
        return true;
      },
      () => {
        this.memCache.set(KEY.xpRewards, merged);
        return true;
      },
    );
    void supabaseSync.snapshotAdminConfig('xp_rewards', merged);
    return merged;
  }

  pickXSharePresetIdFromLayout(layout: any): string {
    const blocks: any[] = Array.isArray(layout?.blocks) ? layout.blocks : [];
    const block = blocks.find((b) => b?.type === 'XShareTaskBlock');
    const id = typeof block?.props?.presetId === 'string' ? block.props.presetId.trim() : '';
    return id || 'daily-meme-share';
  }

  async isXMissionCreditedToday(
    address: string,
    presetId: string,
    date: string = todayKey(),
  ): Promise<boolean> {
    const presets = await this.getXRulePresets();
    const preset =
      presets.find((p: any) => p?.id === presetId) || DEFAULT_X_PRESETS.find((p) => p.id === presetId);
    const tasks = normalizeMissionTasks(preset || DEFAULT_X_PRESETS[0]);
    if (!tasks.length) return false;
    const credited = await this.getXMissionCreditedTaskIds(
      address,
      presetId,
      date,
      tasks.map((t) => t.id),
    );
    return tasks.every((t) => credited.has(t.id));
  }

  async getXMissionCreditedTaskIds(
    address: string,
    presetId: string,
    date: string,
    taskIds: string[],
  ): Promise<Set<string>> {
    const addr = address.toLowerCase();
    if (!taskIds.length) return new Set();
    return this.withRedis(
      async (client) => {
        const keys = taskIds.map((tid) => KEY.xMissionTask(addr, date, presetId, tid));
        const vals: (string | null)[] = await client.mget(...keys);
        const set = new Set<string>();
        taskIds.forEach((tid, i) => {
          if (vals[i]) set.add(tid);
        });
        return set;
      },
      () => new Set(),
    );
  }

  async tryCreditXMissionTask(
    address: string,
    date: string,
    presetId: string,
    taskId: string,
  ): Promise<boolean> {
    const addr = address.toLowerCase();
    return this.withRedis(
      async (client) => {
        const nx = await client.set(
          KEY.xMissionTask(addr, date, presetId, taskId),
          '1',
          'NX',
          'EX',
          60 * 60 * 48,
        );
        return nx === 'OK';
      },
      () => false,
    );
  }

  async getXMissionHubState(address: string | undefined, preset: any, presetId: string) {
    const effectiveId = preset?.id || presetId;
    const tasks = normalizeMissionTasks(preset);
    const today = todayKey();
    const ids = tasks.map((t) => t.id);
    const credited =
      address && ids.length
        ? await this.getXMissionCreditedTaskIds(address, effectiveId, today, ids)
        : new Set<string>();
    const tasksOut = tasks.map((t) => ({
      id: t.id,
      label: t.label,
      kind: t.kind,
      required: t.required,
      xp: t.xp,
      creditedToday: credited.has(t.id),
    }));
    const totalXpEarnedToday = tasksOut.filter((t) => t.creditedToday).reduce((s, t) => s + t.xp, 0);
    const totalXpAvailable = tasks.reduce((s, t) => s + t.xp, 0);
    const allTasksCredited = tasks.length > 0 && tasks.every((t) => credited.has(t.id));
    return {
      presetId: effectiveId,
      label: preset?.label || 'Daily X Mission',
      rules: preset?.rules || {},
      tasks: tasksOut,
      today,
      allTasksCredited,
      totalXpAvailable,
      totalXpEarnedToday,
    };
  }

  /**
   * One-time XP per linked provider (survives unlink — no double-claim farming).
   */
  async awardAccountLinkXpIfNew(
    address: string,
    provider: 'x' | 'discord' | 'telegram' | 'solana',
  ): Promise<{ awarded: number; xp?: any; reason?: string }> {
    const cfg = await this.getXpRewardsConfig();
    const amount = cfg.linkXp[provider];
    if (amount <= 0) return { awarded: 0, reason: 'zero_or_disabled' };

    const firstTime = await this.withRedis(
      async (client) => {
        const nx = await client.set(KEY.linkXpClaimed(address, provider), '1', 'NX');
        return nx === 'OK';
      },
      () => false,
    );

    if (!firstTime) return { awarded: 0, reason: 'already_claimed' };
    const xp = await this.addXp(address, amount, `account_link_${provider}`);
    void supabaseSync.recordLinkXpClaim(address, provider, amount);
    return { awarded: amount, xp };
  }

  async verifyAndCreditXMission(
    address: string,
    presetId?: string,
  ): Promise<
    | {
      ok: true;
      presetId: string;
      credits: Array<{ taskId: string; xp: number }>;
      awarded: number;
      xp: any;
      allTasksComplete: boolean;
      verification: {
        todayUtc: string;
        tweetsFetched: number;
        postsTodayUtc: number;
        postsEligibleAfterGuards: number;
        globalHints: string[];
        skippedTweetFetch?: boolean;
        tasks: Array<{
          taskId: string;
          label: string;
          kind: string;
          required: boolean;
          xp: number;
          outcome: 'credited_now' | 'already_credited' | 'pending' | 'pending_cooldown';
          detail?: string;
          unlocksAt?: number;
        }>;
      };
      pendingCredits?: Array<{ taskId: string; xp: number; unlocksAt: number }>;
    }
    | { ok: false; error: string; message: string; presetId?: string }
  > {
    const layout = await this.getLayout();
    const id = (presetId && String(presetId).trim()) || this.pickXSharePresetIdFromLayout(layout);
    const presets = await this.getXRulePresets();
    const preset = presets.find((p: any) => p?.id === id) || DEFAULT_X_PRESETS[0];
    const effectiveId = preset?.id || id;
    const tasks = normalizeMissionTasks(preset);
    const today = todayKey();
    const rules = preset?.rules || {};

    if (!twitterService.isConfigured()) {
      return {
        ok: false,
        error: 'twitterapi_unconfigured',
        message: 'Mission verification is unavailable (TWITTERAPI_IO_KEY missing).',
        presetId: effectiveId,
      };
    }

    const identity = await this.getIdentity(address);
    const handleRaw = identity?.handles?.x;
    if (!identity?.xLinked || !handleRaw) {
      return {
        ok: false,
        error: 'x_not_linked',
        message: 'Connect your X account first, then post and verify.',
        presetId: effectiveId,
      };
    }
    const handle = String(handleRaw).replace(/^@/, '');

    const accountCheck = await checkMissionAccountAge(handle, rules);
    if (!accountCheck.ok) {
      return {
        ok: false,
        error: accountCheck.code,
        message: accountCheck.message,
        presetId: effectiveId,
      };
    }

    if (!tasks.length) {
      const xp = await this.getXp(address);
      return {
        ok: true,
        presetId: effectiveId,
        credits: [],
        awarded: 0,
        xp,
        allTasksComplete: true,
        verification: {
          todayUtc: today,
          tweetsFetched: 0,
          postsTodayUtc: 0,
          postsEligibleAfterGuards: 0,
          globalHints: [],
          skippedTweetFetch: true,
          tasks: [],
        },
      };
    }

    const taskIds = tasks.map((t) => t.id);
    let creditedIds = await this.getXMissionCreditedTaskIds(address, effectiveId, today, taskIds);

    if (tasks.every((t) => creditedIds.has(t.id))) {
      const xp = await this.getXp(address);
      return {
        ok: true,
        presetId: effectiveId,
        credits: [],
        awarded: 0,
        xp,
        allTasksComplete: true,
        verification: {
          todayUtc: today,
          tweetsFetched: 0,
          postsTodayUtc: 0,
          postsEligibleAfterGuards: 0,
          globalHints: [
            'All mission rows are already credited for UTC today — skipped downloading posts.',
          ],
          skippedTweetFetch: true,
          tasks: tasks.map((t) => ({
            taskId: t.id,
            label: t.label,
            kind: t.kind,
            required: t.required,
            xp: t.xp,
            outcome: 'already_credited' as const,
            detail: 'Already counted earlier today.',
          })),
        },
      };
    }

    const cooldownParsed = Number(process.env.X_MISSION_VERIFY_COOLDOWN_SEC ?? '60');
    const verifyCooldownSec = Number.isFinite(cooldownParsed) && cooldownParsed >= 0 ? Math.min(900, cooldownParsed) : 60;

    if (verifyCooldownSec > 0) {
      const throttleKey = KEY.xVerifyThrottle(address);
      const allowed = await this.withRedis(async (client) => {
        const nx = await client.set(throttleKey, '1', 'NX', 'EX', verifyCooldownSec);
        return nx === 'OK';
      }, () => true);
      if (!allowed) {
        return {
          ok: false,
          error: 'verify_cooldown',
          message:
            verifyCooldownSec >= 60
              ? `Verify is rate-limited — try again in about ${Math.ceil(verifyCooldownSec / 60)} min.`
              : `Verify is rate-limited — try again in about ${verifyCooldownSec}s.`,
          presetId: effectiveId,
        };
      }
    }

    let tweets: any[];
    try {
      tweets = await twitterService.listRecentTweets(handle);
    } catch (e) {
      logger.warn('listRecentTweets failed', { error: (e as Error).message });
      return {
        ok: false,
        error: 'twitter_fetch_failed',
        message: 'Could not load recent posts from X. Try again shortly.',
        presetId: effectiveId,
      };
    }

    const utcTodayPosts = tweets.filter((t) => tweetUtcDateKey(t) === today);
    const sortedPosts = utcTodayPosts.sort((a, b) => (tweetCreatedMs(b) || 0) - (tweetCreatedMs(a) || 0));

    const newCredits: Array<{ taskId: string; xp: number }> = [];
    const pendingCredits: Array<{ taskId: string; xp: number; unlocksAt: number }> = [];

    const delayMin = Number(rules?.delayBeforeCreditMinutes) || 0;
    const minLikes = Number(rules?.minLikesAfter24h) || 0;

    for (const tweet of sortedPosts) {
      const created = tweetCreatedMs(tweet) || Date.now();
      const ageMin = (Date.now() - created) / 60_000;
      const passesAge = delayMin <= 0 || ageMin >= delayMin;
      const unlocksAt = passesAge ? 0 : created + delayMin * 60_000;

      let passesLikes = true;
      if (minLikes > 0 && ageMin >= 24 * 60) {
        const likes = tweetLikeCount(tweet);
        if (likes != null && likes < minLikes) passesLikes = false;
      }
      if (!passesLikes) continue;

      const passesRequiredBundle = matchesAllRequiredMissionTasks(tweet, tasks, rules);

      for (const task of tasks) {
        if (creditedIds.has(task.id)) continue;
        if (pendingCredits.some(p => p.taskId === task.id)) continue;
        if (task.xp <= 0) continue;
        if (!matchesMissionTask(tweet, task, rules)) continue;
        if (!task.required && !passesRequiredBundle) continue;

        if (passesAge) {
          const locked = await this.tryCreditXMissionTask(address, today, effectiveId, task.id);
          if (locked) {
            await this.addXp(address, task.xp, `x_mission_${effectiveId}_${task.id}`);
            newCredits.push({ taskId: task.id, xp: task.xp });
            creditedIds.add(task.id);
          }
        } else {
          pendingCredits.push({ taskId: task.id, xp: task.xp, unlocksAt });
        }
      }
    }

    const awarded = newCredits.reduce((s, c) => s + c.xp, 0);
    const xp = await this.getXp(address);
    const allTasksComplete = tasks.every((t) => creditedIds.has(t.id));

    // For backwards compatibility in guardedPosts logs, only pass those that passed age check
    const guardedPosts = sortedPosts.filter((tweet) => {
      const created = tweetCreatedMs(tweet) || Date.now();
      const ageMin = (Date.now() - created) / 60_000;
      return delayMin <= 0 || ageMin >= delayMin;
    });

    const verification = buildXMissionVerificationReport({
      today,
      tweetsFetched: tweets.length,
      postsTodayUtc: utcTodayPosts.length,
      utcTodayPosts,
      guardedPosts,
      tasks,
      rules,
      newCredits,
      creditedIdsFinal: creditedIds,
      pendingCredits,
    });

    return {
      ok: true,
      presetId: effectiveId,
      credits: newCredits,
      pendingCredits,
      awarded,
      xp,
      allTasksComplete,
      verification,
    };
  }

  async getGateConfig(): Promise<GateConfig> {
    const raw = await this.withRedis(
      async (client) => client.get(KEY.gateConfig),
      () => this.memCache.get(KEY.gateConfig) || null,
    );
    if (!raw) return { ...DEFAULT_GATE_CONFIG };
    try {
      return normalizeGateConfig(typeof raw === 'string' ? JSON.parse(raw) : raw);
    } catch {
      return { ...DEFAULT_GATE_CONFIG };
    }
  }

  async setGateConfig(patch: any): Promise<GateConfig> {
    const current = await this.getGateConfig();
    const merged = normalizeGateConfig({ ...current, ...(patch || {}) });
    await this.withRedis(
      async (client) => {
        await client.set(KEY.gateConfig, JSON.stringify(merged));
        return true;
      },
      () => {
        this.memCache.set(KEY.gateConfig, merged);
        return true;
      },
    );
    void supabaseSync.snapshotAdminConfig('gate_config', merged);
    return merged;
  }

  async getIdentity(address?: string) {
    const baseIdentity = {
      evmConnected: !!address,
      solanaLinked: false,
      xLinked: false,
      xId: null as string | null,
      xEmail: null as string | null,
      xFollowsRektCeo: null as boolean | null, // null = unknown
      discordLinked: false,
      discordId: null as string | null,
      discordEmail: null as string | null,
      discordEmailVerified: null as boolean | null,
      discordInGuild: null as boolean | null,
      telegramLinked: false,
      telegramUserId: null as string | null,
      telegramInGroup: null as boolean | null,
      baseBalanceEligible: false,
      baseBalanceUsd: 0,
      handles: { x: null, discord: null, telegram: null, solana: null },
    };

    if (!address) return baseIdentity;

    return this.withRedis(
      async (client) => {
        const raw = await client.get(KEY.identity(address));
        if (!raw) return baseIdentity;
        return { ...baseIdentity, ...JSON.parse(raw), evmConnected: true };
      },
      () => ({ ...baseIdentity, ...(this.memCache.get(KEY.identity(address)) || {}), evmConnected: true }),
    );
  }

  /**
   * Re-check X → @rekt_ceo follow (twitterapi.io), Discord guild membership, and Telegram group
   * membership from data already stored on the Redis identity blob, then persist updated flags.
   * Called on throttled bootstrap and via POST /identity/refresh-social (manual).
   */
  async refreshSocialMembership(addressRaw: string): Promise<Record<string, unknown>> {
    const addr = addressRaw.trim().toLowerCase();
    if (!addr) return {};
    const id = await this.getIdentity(addr);
    const patch: Record<string, unknown> = {};

    const xRaw = id?.handles?.x;
    const xHandle =
      typeof xRaw === 'string'
        ? xRaw.replace(/^@/, '').trim()
        : '';
    const followTarget = (process.env.X_FOLLOW_TARGET || 'rekt_ceo').replace(/^@/, '');
    if (id?.xLinked && xHandle && twitterService.isConfigured()) {
      const follows = await twitterService.checkFollows(xHandle, followTarget);
      if (follows !== null) patch.xFollowsRektCeo = follows;
    }

    const discordUserId = id?.discordId;
    if (id?.discordLinked && discordUserId) {
      const inGuild = await discordService.isMember(String(discordUserId));
      if (inGuild !== null) patch.discordInGuild = inGuild;
    }

    const tgUserId = id?.telegramUserId;
    if (id?.telegramLinked && tgUserId != null && tgUserId !== '' && telegramService.isConfigured()) {
      const member = await telegramService.isMember(tgUserId);
      if (member !== null) patch.telegramInGroup = member;
    }

    if (Object.keys(patch).length === 0) return {};
    await this.setIdentityField(addr, patch);
    return patch;
  }

  /**
   * Throttled refresh during Launch Hub bootstrap (default 86400 s). Bypass with `force: true`.
   */
  async maybeRefreshSocialMembership(
    addrRaw: string,
    opts?: { force?: boolean },
  ): Promise<boolean> {
    const addr = addrRaw.trim().toLowerCase();
    if (!addr) return false;

    const ttlParsed = Number(process.env.SOCIAL_MEMBERSHIP_REFRESH_TTL_SEC || '86400');
    const ttlSec =
      Number.isFinite(ttlParsed) && ttlParsed >= 0 ? Math.floor(ttlParsed) : 86400;

    const throttleKey = KEY.socialRefreshThrottle(addr);

    if (opts?.force) {
      await this.withRedis(
        async (client) => {
          await client.del(throttleKey);
          return true;
        },
        () => true,
      );
    } else if (ttlSec > 0) {
      const throttleHit = await this.withRedis(async (client) => {
        const exists = await client.exists(throttleKey);
        return exists === 1;
      }, () => false);
      if (throttleHit) return false;
    }

    await this.refreshSocialMembership(addr);

    if (ttlSec > 0) {
      await this.withRedis(
        async (client) => {
          await client.set(throttleKey, '1', 'EX', ttlSec);
          return true;
        },
        () => true,
      );
    }
    return true;
  }

  async setIdentityField(address: string, patch: Record<string, any>) {
    const current = await this.getIdentity(address);
    const next = { ...current, ...patch };
    // Always update memCache so the identity blob survives across calls when
    // Redis is unavailable (dev without Docker, or transient outage).
    this.memCache.set(KEY.identity(address), next);
    await this.withRedis(
      async (client) => {
        await client.set(KEY.identity(address), JSON.stringify(next));
        return true;
      },
      () => true,
    );
    void supabaseSync.upsertUser(address, next);
    return next;
  }

  /**
   * Stash the PKCE `code_verifier` for an in-flight OAuth dance, keyed by an
   * opaque short-lived id we embed in the OAuth `state` JWT. TTL is kept
   * short (10 minutes) — same lifetime as the state JWT — to bound the
   * verifier's exposure window.
   *
   * Cache lifecycle:
   *   - 10 minute TTL when Redis is up.
   *   - In-memory map fallback when Redis is down (dev mode without Docker).
   */
  async setOAuthVerifier(id: string, verifier: string, ttlSeconds = 600) {
    this.memCache.set(KEY.oauthVerifier(id), { verifier, exp: Date.now() + ttlSeconds * 1000 });
    await this.withRedis(
      async (client) => {
        await client.set(KEY.oauthVerifier(id), verifier, 'EX', ttlSeconds);
        return true;
      },
      () => true,
    );
  }

  /**
   * One-shot read: returns the verifier and removes it. Returns null if the
   * id is unknown or the in-memory entry has expired.
   */
  async consumeOAuthVerifier(id: string): Promise<string | null> {
    const fromRedis = await this.withRedis(
      async (client) => {
        const value = await client.get(KEY.oauthVerifier(id));
        if (!value) return null;
        await client.del(KEY.oauthVerifier(id));
        return value;
      },
      () => null,
    );
    if (fromRedis) {
      this.memCache.delete(KEY.oauthVerifier(id));
      return fromRedis;
    }
    const memEntry = this.memCache.get(KEY.oauthVerifier(id)) as
      | { verifier: string; exp: number }
      | undefined;
    if (!memEntry) return null;
    this.memCache.delete(KEY.oauthVerifier(id));
    if (memEntry.exp && memEntry.exp < Date.now()) return null;
    return memEntry.verifier;
  }

  /**
   * Compute the per-address gate that decides whether the user can access
   * the full Launch Hub (campaign tasks, daily spin, leaderboard, …).
   *
   * The gate is driven by the admin-managed `gateConfig`:
   *   - `enabled=false` hides the row from the checklist entirely
   *   - `required=true`  makes the check block the gate
   *   - `required=false` shows it as an OPTIONAL row (informational only)
   *
   * `evmConnected` is always required and is not part of the admin surface;
   * without a SIWE'd wallet there is no identity blob to gate on.
   *
   * `xFollowsRektCeo` / `discordInGuild` / `telegramInGroup` are derived
   * from their respective `*Linked` checks plus the bot result. When the
   * relevant bot/API isn't configured we treat the result as "linked is
   * enough" to avoid softlocking degens during early access.
   */
  isInviteLaunchRequired(): boolean {
    return process.env.REQUIRE_INVITE_CODE !== 'false';
  }

  computeEligibility(identity: any, gateConfig?: GateConfig) {
    const cfg = gateConfig ? normalizeGateConfig(gateConfig) : { ...DEFAULT_GATE_CONFIG };

    const checks = {
      evmConnected: !!identity?.evmConnected,
      baseBalanceEligible: !!identity?.baseBalanceEligible,
      xLinked: !!identity?.xLinked,
      xFollowsRektCeo: !!(identity?.xLinked && identity?.xFollowsRektCeo !== false),
      discordLinked: !!identity?.discordLinked,
      discordInGuild: !!(identity?.discordLinked && identity?.discordInGuild !== false),
      telegramLinked: !!identity?.telegramLinked,
      telegramInGroup: !!(identity?.telegramLinked && identity?.telegramInGroup !== false),
    } as Record<string, boolean>;

    type Row = {
      key: string;
      label: string;
      group: string;
      optional: boolean;
      enabled: boolean;
      passed: boolean;
      description?: string;
    };

    const groupOf = (k: string): string => {
      if (k === 'evmConnected' || k === 'baseBalanceEligible') return 'wallet';
      if (k.startsWith('x')) return 'x';
      if (k.startsWith('discord')) return 'discord';
      if (k.startsWith('telegram')) return 'telegram';
      return 'other';
    };

    const requirements: Row[] = [];

    // EVM connection is foundational — always required, always enabled.
    requirements.push({
      key: 'evmConnected',
      label: 'Connect EVM wallet',
      group: 'wallet',
      optional: false,
      enabled: true,
      passed: checks.evmConnected,
    });

    const order: GateKey[] = [
      'baseBalanceEligible',
      'xLinked',
      'xFollowsRektCeo',
      'discordLinked',
      'discordInGuild',
      'telegramLinked',
      'telegramInGroup',
    ];

    for (const key of order) {
      const c = cfg[key];
      requirements.push({
        key,
        label: c.label,
        group: groupOf(key),
        optional: !c.required,
        enabled: c.enabled !== false,
        passed: !!checks[key],
        description: c.description,
      });
    }

    const visible = requirements.filter((r) => r.enabled);
    const missingRequired = visible.filter((r) => !r.optional && !r.passed);

    return {
      eligible: missingRequired.length === 0,
      checks,
      missing: missingRequired.map((r) => ({ key: r.key, label: r.label, group: r.group })),
      requirements: visible.map((r) => ({
        key: r.key,
        label: r.label,
        group: r.group,
        optional: r.optional,
        passed: r.passed,
        description: r.description,
      })),
      gateConfig: cfg,
    };
  }

  async getXp(address?: string) {
    const baseXp = { lifetime: 0, season: 0, level: 1, nextLevelAt: 500 };
    if (!address) return baseXp;

    return this.withRedis(
      async (client) => {
        const raw = await client.get(KEY.xp(address));
        if (!raw) return baseXp;
        return { ...baseXp, ...JSON.parse(raw) };
      },
      () => baseXp,
    );
  }

  async addXp(address: string, amount: number, reason: string) {
    if (!address || amount <= 0) return await this.getXp(address);

    const xp = await this.getXp(address);
    const lifetime = xp.lifetime + amount;
    const season = xp.season + amount;
    const level = Math.max(1, Math.floor(lifetime / 500) + 1);
    const nextLevelAt = level * 500;
    const next = { lifetime, season, level, nextLevelAt };

    await this.withRedis(
      async (client) => {
        await client.set(KEY.xp(address), JSON.stringify(next));
        await client.zincrby('campaign:leaderboard:season', amount, address.toLowerCase());
        await client.zincrby('campaign:leaderboard:lifetime', amount, address.toLowerCase());
        const ledgerEntry = JSON.stringify({
          ts: new Date().toISOString(),
          amount,
          reason,
        });
        await client.lpush(KEY.ledger(address), ledgerEntry);
        await client.ltrim(KEY.ledger(address), 0, 49);
        return true;
      },
      () => true,
    );

    void supabaseSync.updateUserXp(address, next);
    void supabaseSync.recordXpEvent(address, amount, reason);

    return next;
  }

  async getDailyState(address: string) {
    const today = todayKey();
    const checkinKey = KEY.daily(address, today, 'checkin');
    const spinKey = KEY.daily(address, today, 'spin');

    return this.withRedis(
      async (client) => {
        const [checkin, spin, streakRaw] = await Promise.all([
          client.get(checkinKey),
          client.get(spinKey),
          client.get(KEY.streak(address)),
        ]);

        return {
          today,
          checkinClaimed: !!checkin,
          spinClaimed: !!spin,
          streak: streakRaw ? JSON.parse(streakRaw) : { count: 0, lastDate: null },
        };
      },
      () => ({ today, checkinClaimed: false, spinClaimed: false, streak: { count: 0, lastDate: null } }),
    );
  }

  async claimDailyCheckin(address: string) {
    const cfg = await this.getXpRewardsConfig();
    const state = await this.getDailyState(address);
    if (state.checkinClaimed) {
      return {
        awarded: 0,
        claimed: false,
        reason: 'Check-in already claimed today',
        breakdown: {
          base: cfg.dailyCheckinBase,
          streakBonus: 0,
          streakDays: state.streak?.count || 0,
        },
      };
    }

    const today = state.today;
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const lastDate = state.streak?.lastDate;
    const newCount = lastDate === yesterday ? (state.streak.count || 0) + 1 : 1;

    const baseAward = cfg.dailyCheckinBase;
    const streakBonus = Math.min(
      cfg.dailyCheckinStreakBonusMax,
      Math.max(0, newCount - 1),
    );
    const awarded = baseAward + streakBonus;

    await this.withRedis(
      async (client) => {
        const checkinKey = KEY.daily(address, today, 'checkin');
        await client.setex(checkinKey, 60 * 60 * 30, '1');
        await client.set(KEY.streak(address), JSON.stringify({ count: newCount, lastDate: today }));
        await analyticsService.bumpDailyEngagementCounters(client, today, 'checkin');
        return true;
      },
      () => true,
    );

    const xp = await this.addXp(address, awarded, 'daily_checkin');
    void supabaseSync.updateStreak(address, newCount, today);
    return {
      awarded,
      claimed: true,
      streak: newCount,
      xp,
      breakdown: { base: baseAward, streakBonus, streakDays: newCount },
    };
  }

  async claimDailySpin(address: string) {
    const cfg = await this.getXpRewardsConfig();
    const state = await this.getDailyState(address);
    if (state.spinClaimed) {
      return {
        awarded: 0,
        claimed: false,
        reason: 'Spin already used today',
        buckets: cfg.dailySpinBuckets,
      };
    }

    const buckets = cfg.dailySpinBuckets.length ? cfg.dailySpinBuckets : [10];
    const bucketIndex = Math.floor(Math.random() * buckets.length);
    const awarded = buckets[bucketIndex];

    await this.withRedis(
      async (client) => {
        const spinKey = KEY.daily(address, state.today, 'spin');
        await client.setex(spinKey, 60 * 60 * 30, '1');
        await analyticsService.bumpDailyEngagementCounters(client, state.today, 'spin');
        return true;
      },
      () => true,
    );

    const xp = await this.addXp(address, awarded, 'daily_spin');
    return {
      awarded,
      claimed: true,
      xp,
      buckets,
      bucketIndex,
    };
  }

  private async mintBatchOnClient(client: any, ownerLower: string): Promise<InviteSlotsBatch> {
    const batchId = crypto.randomBytes(8).toString('hex');
    const ts = new Date().toISOString();
    const codes: InviteCodeSlot[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 3; i++) {
      let code = '';
      for (let t = 0; t < 48; t++) {
        code = `REKT-${randomInviteSegment()}`;
        if (seen.has(code)) continue;
        const clash = await client.exists(KEY.inviteLookupV2(code));
        if (clash) continue;
        seen.add(code);
        break;
      }
      if (!code || !seen.has(code)) {
        throw new Error('invite_code_generation_exhausted');
      }
      codes.push({ code, status: 'open' });
    }
    for (const slot of codes) {
      await client.set(KEY.inviteLookupV2(slot.code), ownerLower);
    }
    const batch: InviteSlotsBatch = { batchId, ownerAddr: ownerLower, codes, updatedAt: ts };
    await client.set(KEY.inviteSlotsV2(ownerLower), JSON.stringify(batch));
    return batch;
  }

  /**
   * Ensures the wallet has a batch of three live invite codes (stored in Redis).
   */
  async ensureInviteSlots(address: string): Promise<InviteSlotsBatch> {
    const owner = address.toLowerCase();
    let createdNew = false;
    const batch = await this.withRedis(
      async (client) => {
        const raw = await client.get(KEY.inviteSlotsV2(owner));
        if (raw) return JSON.parse(raw) as InviteSlotsBatch;
        createdNew = true;
        return this.mintBatchOnClient(client, owner);
      },
      () => {
        throw new Error('redis_unavailable');
      },
    );
    if (createdNew) {
      void inviteHistoryService.recordCodesIssued(
        batch.codes.map((slot) => ({
          code: slot.code,
          ownerWallet: owner,
          source: 'user_batch' as const,
          batchId: batch.batchId,
          meta: { initialStatus: slot.status },
        })),
      );
    }
    void supabaseSync.upsertInviteSlots(address, batch.batchId, batch.codes);
    return batch;
  }

  /**
   * Admin: mint a single on-demand code (Redis lookup → sentinel; immutable row in Postgres).
   */
  async adminMintInviteCode(opts?: { label?: string }): Promise<{ code: string } | { error: string }> {
    const adminSentinel = INVITE_LOOKUP_ADMIN_SENTINEL.toLowerCase();
    const label = typeof opts?.label === 'string' && opts.label.trim() ? opts.label.trim() : 'on_demand';
    const code = await this.withRedis(
      async (client) => {
        for (let t = 0; t < 64; t++) {
          const candidate = `REKT-${randomInviteSegment()}`;
          const clash = await client.exists(KEY.inviteLookupV2(candidate));
          if (clash) continue;
          await client.set(KEY.inviteLookupV2(candidate), adminSentinel);
          return candidate;
        }
        return null;
      },
      () => null,
    );
    if (!code) return { error: 'redis_unavailable_or_code_exhausted' };
    void inviteHistoryService.recordCodesIssued([
      {
        code,
        ownerWallet: null,
        source: 'admin',
        batchId: null,
        meta: { label },
      },
    ]);
    return { code };
  }

  async getInviteActivation(address: string): Promise<InviteActivationRecord | null> {
    const owner = address.toLowerCase();
    return this.withRedis(
      async (client) => {
        const raw = await client.get(KEY.inviteActivationV2(owner));
        if (!raw) return null;
        return JSON.parse(raw) as InviteActivationRecord;
      },
      () => null,
    );
  }

  async getInviteBootstrapSlice(
    address: string | undefined,
    viewerIsWalletOwner: boolean,
  ): Promise<InviteBootstrapSlice> {
    const inviteWall = this.isInviteLaunchRequired();
    if (!address) {
      return { inviteWall, batch: null, activation: null, canRotate: false };
    }
    const activation = await this.getInviteActivation(address);
    let batch: InviteSlotsBatch | null = null;
    let canRotate = false;
    if (viewerIsWalletOwner) {
      try {
        batch = await this.ensureInviteSlots(address);
        canRotate =
          batch.codes.length >= 3 && batch.codes.every((c) => c.status === 'redeemed');
      } catch (e) {
        logger.warn('ensureInviteSlots failed in bootstrap', { error: (e as Error).message });
        batch = null;
      }
    }
    return { inviteWall, batch, activation, canRotate };
  }

  private verifyInvitePreflightToken(token: string | undefined, normalizedCode: string): boolean {
    if (!token || !normalizedCode) return false;
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { t?: string; code?: string };
      return payload.t === 'invite_preflight' && payload.code === normalizedCode;
    } catch {
      return false;
    }
  }

  /**
   * Pre-wallet: checks that a code exists and is redeemable; returns a short-lived JWT
   * that must be sent with POST /invite/redeem (same browser session).
   */
  async validateInvitePreflight(
    rawCode: string,
  ): Promise<{ ok: true; code: string; proof: string } | { ok: false; message: string }> {
    const code = normalizeInviteCodeInput(rawCode);
    if (!code) {
      return { ok: false, message: 'Invalid invite code format.' };
    }

    const bootstrapCodes = parseBootstrapCodes();

    type PreflightRow =
      | { kind: 'ok' }
      | { kind: 'used' }
      | { kind: 'unknown' }
      | { kind: 'inactive' }
      | { kind: 'redis_down' };

    const row = await this.withRedis<PreflightRow>(
      async (client) => {
        const claimed = await client.get(KEY.inviteClaimed(code));
        if (claimed) {
          return { kind: 'used' as const };
        }
        const lookupRaw = await client.get(KEY.inviteLookupV2(code));
        const inviter =
          lookupRaw && typeof lookupRaw === 'string' ? lookupRaw.toLowerCase() : null;
        if (!inviter && !bootstrapCodes.has(code)) {
          return { kind: 'unknown' as const };
        }
        if (inviter && inviter !== INVITE_LOOKUP_ADMIN_SENTINEL.toLowerCase()) {
          const batchRaw = await client.get(KEY.inviteSlotsV2(inviter));
          if (batchRaw) {
            const batch = JSON.parse(batchRaw) as InviteSlotsBatch;
            const slot = batch.codes.find((c) => c.code === code);
            if (!slot || slot.status !== 'open') {
              return { kind: 'inactive' as const };
            }
          }
        }
        return { kind: 'ok' as const };
      },
      () => ({ kind: 'redis_down' as const }),
    );

    if (row.kind === 'redis_down') {
      return { ok: false, message: 'Invite system temporarily unavailable.' };
    }
    if (row.kind === 'used') {
      return { ok: false, message: 'This invite code has already been redeemed.' };
    }
    if (row.kind === 'unknown') {
      return { ok: false, message: 'Unknown invite code.' };
    }
    if (row.kind === 'inactive') {
      return { ok: false, message: 'This invite code is no longer active.' };
    }

    const proof = jwt.sign({ t: 'invite_preflight', code }, config.jwtSecret, { expiresIn: '2h' });
    return { ok: true, code, proof };
  }

  async redeemInviteCode(
    inviteeAddr: string,
    rawCode: string,
    preflightToken?: string | null,
  ): Promise<
    | { ok: true; already: true; activation: InviteActivationRecord }
    | {
      ok: true;
      already: false;
      activation: InviteActivationRecord;
      xp: { invitee: Record<string, unknown>; inviter: Record<string, unknown> | null };
    }
    | { ok: false; error: string; message: string }
  > {
    const invitee = inviteeAddr.toLowerCase();
    const code = normalizeInviteCodeInput(rawCode);
    if (!code) {
      return { ok: false, error: 'invalid_format', message: 'Invalid invite code format.' };
    }

    const existing = await this.getInviteActivation(inviteeAddr);
    if (existing) {
      return { ok: true, already: true, activation: existing };
    }

    if (this.isInviteLaunchRequired()) {
      if (!this.verifyInvitePreflightToken(preflightToken || undefined, code)) {
        return {
          ok: false,
          error: 'proof_required',
          message:
            'Validate your invite code first (pre-wallet step), then connect and sign to register.',
        };
      }
    }

    const bootstrapCodes = parseBootstrapCodes();

    const adminSentinel = INVITE_LOOKUP_ADMIN_SENTINEL.toLowerCase();
    const xpCfg = await this.getXpRewardsConfig();

    type RedeemLock =
      | { kind: 'used' }
      | { kind: 'invalid' }
      | { kind: 'self' }
      | {
        kind: 'ok';
        activation: InviteActivationRecord;
        xpI: number;
        xpR: number;
        inviterForXp: string | null;
      }
      | { kind: 'redis_down' };

    const lock = await this.withRedis<RedeemLock>(
      async (client) => {
        const nx = await client.set(KEY.inviteClaimed(code), invitee, 'NX');
        if (nx !== 'OK') {
          return { kind: 'used' as const };
        }

        let inviterLookup: string | null = null;
        let isBootstrap = false;
        let isAdminMint = false;

        const lookupRaw = await client.get(KEY.inviteLookupV2(code));
        if (lookupRaw && typeof lookupRaw === 'string') {
          inviterLookup = lookupRaw.toLowerCase();
        } else if (bootstrapCodes.has(code)) {
          isBootstrap = true;
        } else {
          await client.del(KEY.inviteClaimed(code));
          return { kind: 'invalid' as const };
        }

        if (inviterLookup === adminSentinel) {
          isAdminMint = true;
        }

        if (inviterLookup && !isAdminMint && inviterLookup === invitee) {
          await client.del(KEY.inviteClaimed(code));
          return { kind: 'self' as const };
        }

        if (inviterLookup && !isAdminMint) {
          const batchRaw = await client.get(KEY.inviteSlotsV2(inviterLookup));
          if (!batchRaw) {
            await client.del(KEY.inviteClaimed(code));
            return { kind: 'invalid' as const };
          }
          const batch = JSON.parse(batchRaw) as InviteSlotsBatch;
          const slot = batch.codes.find((c) => c.code === code);
          if (!slot || slot.status !== 'open') {
            await client.del(KEY.inviteClaimed(code));
            return { kind: 'invalid' as const };
          }
          const now = new Date().toISOString();
          slot.status = 'redeemed';
          slot.redeemedBy = invitee;
          slot.redeemedAt = now;
          batch.updatedAt = now;
          await client.set(KEY.inviteSlotsV2(inviterLookup), JSON.stringify(batch));
        }

        const xpI = xpCfg.inviteXpInvitee;
        const xpR = isBootstrap || isAdminMint ? 0 : xpCfg.inviteXpInviter;
        const inviterForXp = isBootstrap || isAdminMint ? null : inviterLookup;
        const activation: InviteActivationRecord = {
          code,
          inviterAddress: isBootstrap || isAdminMint ? null : inviterLookup,
          bootstrap: isBootstrap,
          adminMint: isAdminMint,
          xpInvitee: xpI,
          xpInviter: xpR,
          activatedAt: new Date().toISOString(),
        };

        await client.set(KEY.inviteActivationV2(invitee), JSON.stringify(activation));
        void supabaseSync.recordInviteLookupClaim(code, invitee);
        return {
          kind: 'ok' as const,
          activation,
          xpI,
          xpR,
          inviterForXp,
        };
      },
      () => ({ kind: 'redis_down' as const }),
    );

    if (lock.kind === 'redis_down') {
      return {
        ok: false,
        error: 'service_unavailable',
        message: 'Invite system temporarily unavailable.',
      };
    }
    if (lock.kind === 'used') {
      return { ok: false, error: 'code_used', message: 'This invite code was already used.' };
    }
    if (lock.kind === 'invalid') {
      return { ok: false, error: 'invalid_code', message: 'Unknown or inactive invite code.' };
    }
    if (lock.kind === 'self') {
      return { ok: false, error: 'self_redeem', message: 'You cannot redeem your own invite code.' };
    }

    const xpInviteeWallet = await this.addXp(inviteeAddr, lock.xpI, 'invite_redeemed_invitee');
    let inviterXp: any = null;
    if (lock.inviterForXp && lock.xpR > 0) {
      inviterXp = await this.addXp(lock.inviterForXp, lock.xpR, 'invite_redeemed_inviter');
    }

    void inviteHistoryService.recordRedemption({
      code: lock.activation.code,
      inviteeWallet: inviteeAddr,
      inviterWallet: lock.inviterForXp,
      wasBootstrap: lock.activation.bootstrap,
      wasAdminMint: !!lock.activation.adminMint,
      xpInvitee: lock.xpI,
      xpInviter: lock.xpR,
    });

    return {
      ok: true,
      already: false,
      activation: lock.activation,
      xp: { invitee: xpInviteeWallet, inviter: inviterXp },
    };
  }

  async rotateInviteBatch(
    address: string,
  ): Promise<
    { ok: true; batch: InviteSlotsBatch } | { ok: false; error: string; message: string }
  > {
    const owner = address.toLowerCase();
    type RotateInner =
      | { kind: 'no_batch' }
      | { kind: 'incomplete' }
      | { kind: 'ok'; batch: InviteSlotsBatch; previousBatchId: string; previousCodes: InviteCodeSlot[] }
      | { kind: 'redis_down' };

    const result = await this.withRedis<RotateInner>(
      async (client) => {
        const raw = await client.get(KEY.inviteSlotsV2(owner));
        if (!raw) return { kind: 'no_batch' as const };
        const batch = JSON.parse(raw) as InviteSlotsBatch;
        if (!batch.codes.every((c) => c.status === 'redeemed')) {
          return { kind: 'incomplete' as const };
        }
        const previousBatchId = batch.batchId;
        const previousCodes = batch.codes.map((c) => ({ ...c }));
        for (const c of batch.codes) {
          await client.del(KEY.inviteLookupV2(c.code));
        }
        const next = await this.mintBatchOnClient(client, owner);
        return {
          kind: 'ok' as const,
          batch: next,
          previousBatchId,
          previousCodes,
        };
      },
      () => ({ kind: 'redis_down' as const }),
    );

    if (result.kind === 'redis_down') {
      return {
        ok: false,
        error: 'service_unavailable',
        message: 'Invite system temporarily unavailable.',
      };
    }
    if (result.kind === 'no_batch') {
      return { ok: false, error: 'no_batch', message: 'No invite batch found.' };
    }
    if (result.kind === 'incomplete') {
      return {
        ok: false,
        error: 'batch_incomplete',
        message: 'All three invite codes must be redeemed before minting a new set.',
      };
    }
    void inviteHistoryService.recordRotation({
      ownerWallet: owner,
      previousBatchId: result.previousBatchId,
      previousCodes: result.previousCodes,
      newBatchId: result.batch.batchId,
    });
    void inviteHistoryService.recordCodesIssued(
      result.batch.codes.map((slot) => ({
        code: slot.code,
        ownerWallet: owner,
        source: 'user_batch' as const,
        batchId: result.batch.batchId,
        meta: { afterRotation: true, initialStatus: slot.status },
      })),
    );
    return { ok: true, batch: result.batch };
  }

  async setBaseBalanceState(address: string, usd: number, threshold: number) {
    const eligible = usd >= threshold;
    await this.setIdentityField(address, { baseBalanceUsd: usd, baseBalanceEligible: eligible });
    await this.withRedis(
      async (client) => {
        await client.setex(KEY.baseBalance(address), 60 * 30, JSON.stringify({ usd, eligible, ts: Date.now() }));
        return true;
      },
      () => true,
    );
    return { usd, eligible };
  }

  async getXpLedger(address?: string): Promise<Array<{ ts?: number; amount?: number; reason?: string }>> {
    if (!address) return [];
    const addr = address.toLowerCase();
    return this.withRedis(
      async (client) => {
        const raw = await client.lrange(KEY.ledger(addr), 0, 49);
        const out: Array<{ ts?: number; amount?: number; reason?: string }> = [];
        for (const r of raw) {
          try {
            const row = JSON.parse(r) as { ts?: number; amount?: number; reason?: string };
            if (row && typeof row === 'object') out.push(row);
          } catch {
            /* skip */
          }
        }
        return out;
      },
      () => [],
    );
  }

  async getAdminUserProfile(addressRaw: string) {
    const addr = addressRaw.trim().toLowerCase();
    const gateConfig = await this.getGateConfig();
    const campaignsList = await this.getCampaigns();
    const [identity, xp, daily, campaigns, inviteSlice, xpLedger, inviteHistory] = await Promise.all([
      this.getIdentity(addr),
      this.getXp(addr),
      this.getDailyState(addr),
      this.enrichCampaignListWithViewer(campaignsList, addr),
      this.getInviteBootstrapSlice(addr, true),
      this.getXpLedger(addr),
      inviteHistoryService.getWalletHistory(addr),
    ]);
    return {
      address: addr,
      identity,
      xp,
      daily,
      campaigns,
      invite: inviteSlice,
      eligibility: this.computeEligibility(identity, gateConfig),
      xpLedger,
      inviteHistory,
    };
  }

  async getLeaderboard(
    scope: 'season' | 'lifetime' = 'season',
    limit = 25,
    opts?: { adminDetail?: boolean },
  ) {
    const zsetKey = scope === 'lifetime' ? 'campaign:leaderboard:lifetime' : 'campaign:leaderboard:season';
    const fallback = [
      {
        rank: 1,
        address: '0x0000000000000000000000000000000000000001',
        handle: '@rekt_legend',
        points: 12450,
        connections: { x: true, discord: false, telegram: false, solana: false },
        baseBalanceEligible: true,
      },
      {
        rank: 2,
        address: '0x0000000000000000000000000000000000000002',
        handle: '@ceo_memelord',
        points: 11320,
        connections: { x: true, discord: true, telegram: false, solana: false },
        baseBalanceEligible: false,
      },
      {
        rank: 3,
        address: '0x0000000000000000000000000000000000000003',
        handle: '@based_rekt',
        points: 10960,
        connections: { x: true, discord: false, telegram: false, solana: false },
        baseBalanceEligible: true,
      },
    ];

    return this.withRedis(
      async (client) => {
        const entries: string[] = await client.zrevrange(zsetKey, 0, limit - 1, 'WITHSCORES');
        if (!entries || entries.length === 0) return fallback;

        const rows: { address: string; points: number }[] = [];
        for (let i = 0; i < entries.length; i += 2) {
          rows.push({ address: entries[i], points: Number(entries[i + 1]) });
        }

        const identityPayloads = await Promise.all(rows.map((r) => client.get(KEY.identity(r.address))));

        return rows.map((r, idx) => {
          const ident = parseIdentityJson(identityPayloads[idx]);
          const pub = buildLeaderboardRowPublic(idx + 1, r.address, r.points, ident);
          return opts?.adminDetail ? buildLeaderboardRowAdmin(pub, ident) : pub;
        });
      },
      () => fallback,
    );
  }

  buildBootstrap(
    identity: any,
    xp: any,
    daily: any,
    campaigns: any[],
    leaderboard: any[],
    inviteSlice: InviteBootstrapSlice,
    address?: string,
    gateConfig?: GateConfig,
  ) {
    const eligibility = this.computeEligibility(identity, gateConfig);
    return {
      identity,
      eligibility,
      xp,
      daily,
      invite: {
        inviteWall: inviteSlice.inviteWall,
        activation: inviteSlice.activation,
        batch: inviteSlice.batch,
        canRotate: inviteSlice.canRotate,
      },
      season: {
        id: 'season-1',
        title: 'Season 1: Pre-Launch Hype',
        endsInDays: 30,
        focus: 'Daily memes, social rituals, invite the crew.',
      },
      campaigns,
      leaderboard,
      gateConfig: eligibility.gateConfig,
    };
  }
}

export const campaignService = new CampaignService();

export const campaignServiceTest = {
  todayKey,
  makeNonce,
  KEY,
};
