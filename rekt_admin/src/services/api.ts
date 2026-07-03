/** Trim trailing slashes — `http://localhost:3000/` + `/api/...` becomes `//api/...` and Express returns 404. */
function normalizeApiBase(url: string): string {
  return String(url).trim().replace(/\/+$/, '')
}

const API_URL = normalizeApiBase(import.meta.env.VITE_API_URL || 'http://localhost:3000')
/** Launch Hub + admin campaign routes (default: same as API_URL; override when campaigns run on port 4047). */
const CAMPAIGN_API_URL = normalizeApiBase(import.meta.env.VITE_CAMPAIGN_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000')

const ADMIN_KEY_STORAGE = 'rekt_admin_key'

// Vite only exposes env vars prefixed with VITE_. Plain `ADMIN_API_KEY` in `.env` is invisible to the browser.
// Optional: set `VITE_ADMIN_API_KEY` to the same value as backend `ADMIN_API_KEY` so local dev pre-fills the yellow bar once.
const envAdminKey =
  typeof import.meta.env.VITE_ADMIN_API_KEY === 'string'
    ? import.meta.env.VITE_ADMIN_API_KEY.trim()
    : ''
if (
  envAdminKey &&
  typeof window !== 'undefined' &&
  !window.localStorage.getItem(ADMIN_KEY_STORAGE)
) {
  window.localStorage.setItem(ADMIN_KEY_STORAGE, envAdminKey)
}

// Types
export interface NFTAttribute {
  trait_type: string
  value: string | number
}
export interface TierInfo {
  currentSupply: number
  tierId: number
  priceUSD: string
  priceCEO: string
  remainingInTier: number
}

export interface UserMintInfo {
  address: string
  pfp: {
    mintCount: number
    canMint: boolean
    maxMint: number
  }
  meme: {
    mintCount: number
    canMint: boolean
    maxMint: number
  }
}

export interface UserCEOBalance {
  address: string
  balance: string
  balanceRaw: string
  decimals: number
}

export interface CampaignLayoutBlock {
  type: string
  props?: Record<string, any>
  /** 1 = single grid column (default). 2 = span full hub width (both columns). */
  colSpan?: 1 | 2
}

export interface LaunchHubLayout {
  page: string
  blocks: CampaignLayoutBlock[]
  /** Kept in sync with `InviteCodeBlock` colSpan on save; used as legacy fallback if the block is omitted. */
  inviteColSpan?: 1 | 2
}

export interface LaunchAnalyticsSummary {
  redisAvailable: boolean
  partial?: boolean
  warnings?: string[]
  leaderboards: {
    season: { wallets: number; sumScores: number }
    lifetime: { wallets: number; sumScores: number }
  }
  identity: { walletsWithIdentityBlob: number; partial: boolean }
  invites: {
    ledgerEnabled: boolean
    codesIssued: number
    redemptions: number
  }
  dailyEngagement: {
    from: string
    to: string
    checkinsFromCounters: number
    spinsFromCounters: number
    checkinsFromScan?: number
    spinsFromScan?: number
    scanTruncated?: boolean
  }
}

export type OnchainRule =
  | { kind: 'erc20_min_balance'; token: string; thresholdHuman: string; decimalsOverride?: number }
  | { kind: 'erc721_min_balance'; contract: string; minCount: number }
  | { kind: 'erc721_owner_of'; contract: string; tokenId: string }

export type VerificationMode = 'none' | 'snapshot' | 'held_window'

export interface CampaignDef {
  schemaVersion?: 2
  id: string
  title: string
  subtitle?: string
  status: string
  rewardText: string
  cta: string
  ctaLabel?: string
  actionUrl?: string
  color?: string
  iconKey?: string
  xpReward?: number
  chainId?: number
  verificationMode?: VerificationMode
  minHoldSeconds?: number
  rule?: OnchainRule
}

export type XMissionTaskKind = 'mention' | 'meme_image' | 'friend_tags' | 'hashtags'

export interface XMissionTaskConfig {
  id: string
  label: string
  kind: XMissionTaskKind
  /** When true, task can be credited from its own tweet. When false, all required tasks must pass on the same tweet. */
  required: boolean
  xp: number
  mention?: string
  minFriendTags?: number
  hashtags?: string[]
}

export interface XRulePreset {
  id: string
  label: string
  rules: {
    mention: string
    mustHaveMemeImage: boolean
    minFriendTags: number
    hashtags: string[]
    minAccountAgeDays: number
    minLikesAfter24h: number
    delayBeforeCreditMinutes: number
    maxPerDay: number
    decayCurveEnabled: boolean
  }
  /** Per-task XP and gates; optional tasks need all required tasks on the same post. */
  tasks?: XMissionTaskConfig[]
}

export type GateKey =
  | 'baseBalanceEligible'
  | 'xLinked'
  | 'xFollowsRektCeo'
  | 'discordLinked'
  | 'discordInGuild'
  | 'telegramLinked'
  | 'telegramInGroup'

export interface GateRequirementConfig {
  required: boolean
  enabled: boolean
  label: string
  description?: string
}

export type GateConfig = Record<GateKey, GateRequirementConfig>

export interface XpRewardsConfig {
  dailyCheckinBase: number
  dailyCheckinStreakBonusMax: number
  dailySpinBuckets: number[]
  linkXp: { x: number; discord: number; telegram: number; solana: number }
  inviteXpInvitee: number
  inviteXpInviter: number
  xMissionRewards: Record<string, number>
}

function getAdminKey(): string {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || ''
}

export function setAdminKey(key: string) {
  localStorage.setItem(ADMIN_KEY_STORAGE, key)
}

async function adminFetch(path: string, init?: RequestInit) {
  const key = getAdminKey()
  if (!key) throw new Error('Admin key not configured')

  const res = await fetch(`${CAMPAIGN_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': key,
      ...(init?.headers || {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Admin request failed: ${res.status}`)
  }

  return res.json()
}

export const api = {
  // Health check
  async checkHealth(): Promise<boolean> {
    console.log("Checking backend health: ", API_URL)
    try {
      const res = await fetch(`${API_URL}/api/health`)
      console.log("Backend is healthy: ", res)
      return res.ok
    } catch (error) {
      console.log("Backend is not healthy: ", error)
      return false
    }
  },

  // Get nonce for SIWE
  async getNonce(address: string): Promise<string> {
    const res = await fetch(`${API_URL}/api/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    })


    if (!res.ok) throw new Error('Failed to get nonce')
    const data = await res.json()
    return data.data.nonce
  },

  // Verify signature and get JWT
  async verifySignature(message: string, signature: string): Promise<{ address: string; token: string }> {
    const res = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, signature }),
    })
    if (!res.ok) throw new Error('Failed to verify signature')

    const data = await res.json()
    return data.data
  },

  // Get CEO token price
  async getCEOPrice(): Promise<string> {
    const res = await fetch(`${API_URL}/api/info/ceo-price`)
    if (!res.ok) throw new Error('Failed to get CEO price')
    const data = await res.json()
    return data.data.price
  },

  // Get NFT pricing by type (PFP or MEME)
  async getPricing(nftType: 'PFP' | 'MEME'): Promise<TierInfo> {
    const res = await fetch(`${API_URL}/api/info/pricing/${nftType}`)
    if (!res.ok) throw new Error(`Failed to get ${nftType} pricing`)
    const data = await res.json()
    return data.data
  },

  // Get user mint info by address
  async getUserInfo(address: string): Promise<UserMintInfo> {
    const res = await fetch(`${API_URL}/api/info/user/${address}`)
    if (!res.ok) throw new Error('Failed to get user info')
    const data = await res.json()
    return data.data
  },

  async getUserCEOBalance(address: string): Promise<UserCEOBalance> {
    const res = await fetch(`${API_URL}/api/info/ceo-balance/${address}`)
    if (!res.ok) throw new Error('Failed to get user CEO balance')
    const data = await res.json()
    return data.data
  },

  async getLaunchHubLayout(): Promise<LaunchHubLayout> {
    const res = await fetch(`${CAMPAIGN_API_URL}/api/campaigns/launch-hub-layout`)
    if (!res.ok) throw new Error('Failed to get launch hub layout')
    const data = await res.json()
    return data.data
  },

  async getLaunchHubBootstrap(address?: string): Promise<any> {
    const query = address ? `?address=${address}` : ''
    const res = await fetch(`${CAMPAIGN_API_URL}/api/campaigns/launch-hub-bootstrap${query}`)
    if (!res.ok) throw new Error('Failed to get launch hub bootstrap data')
    const data = await res.json()
    return data.data
  },

  async getAdminLayout(): Promise<LaunchHubLayout> {
    const data = await adminFetch('/api/admin/launch-hub-layout')
    return data.data
  },

  async setAdminLayout(layout: LaunchHubLayout): Promise<LaunchHubLayout> {
    const data = await adminFetch('/api/admin/launch-hub-layout', {
      method: 'PUT',
      body: JSON.stringify(layout),
    })
    return data.data
  },

  async getAdminCampaigns(): Promise<CampaignDef[]> {
    const data = await adminFetch('/api/admin/campaigns')
    return data.data
  },

  async setAdminCampaigns(campaigns: CampaignDef[]): Promise<CampaignDef[]> {
    const data = await adminFetch('/api/admin/campaigns', {
      method: 'PUT',
      body: JSON.stringify({ campaigns }),
    })
    return data.data
  },

  async getAdminXRulePresets(): Promise<XRulePreset[]> {
    const data = await adminFetch('/api/admin/x-rule-presets')
    return data.data
  },

  async setAdminXRulePresets(presets: XRulePreset[]): Promise<XRulePreset[]> {
    const data = await adminFetch('/api/admin/x-rule-presets', {
      method: 'PUT',
      body: JSON.stringify({ presets }),
    })
    return data.data
  },

  async getAdminGateConfig(): Promise<GateConfig> {
    const data = await adminFetch('/api/admin/gate-config')
    return data.data
  },

  async setAdminGateConfig(gateConfig: GateConfig): Promise<GateConfig> {
    const data = await adminFetch('/api/admin/gate-config', {
      method: 'PUT',
      body: JSON.stringify({ gateConfig }),
    })
    return data.data
  },

  async getAdminXpRewards(): Promise<XpRewardsConfig> {
    const data = await adminFetch('/api/admin/xp-rewards')
    return data.data
  },

  async setAdminXpRewards(xpRewards: XpRewardsConfig): Promise<XpRewardsConfig> {
    const data = await adminFetch('/api/admin/xp-rewards', {
      method: 'PUT',
      body: JSON.stringify(xpRewards),
    })
    return data.data
  },

  async adminMintInviteCode(label?: string): Promise<{ code: string }> {
    const data = await adminFetch('/api/admin/invite-codes/mint', {
      method: 'POST',
      body: JSON.stringify({ label: label || '' }),
    })
    return data.data
  },

  async adminGetInviteLedger(limit = 100): Promise<{
    issued: any[]
    redemptions: any[]
    rotations: any[]
    ledgerEnabled: boolean
  }> {
    const data = await adminFetch(`/api/admin/invite-ledger?limit=${limit}`)
    return data.data
  },

  async getAdminAnalyticsSummary(opts?: {
    from?: string
    to?: string
    slowDailyScan?: boolean
  }): Promise<LaunchAnalyticsSummary> {
    const q = new URLSearchParams()
    if (opts?.from) q.set('from', opts.from)
    if (opts?.to) q.set('to', opts.to)
    if (opts?.slowDailyScan) q.set('slowDailyScan', '1')
    const qs = q.toString()
    const data = await adminFetch(`/api/admin/analytics/summary${qs ? `?${qs}` : ''}`)
    return data.data
  },

  async getAdminLaunchUser(address: string): Promise<Record<string, unknown>> {
    const enc = encodeURIComponent(address.trim())
    const data = await adminFetch(`/api/admin/users/${enc}`)
    return data.data
  },

  async getAdminLeaderboard(scope: 'season' | 'lifetime' = 'season', limit = 50): Promise<unknown[]> {
    const data = await adminFetch(`/api/admin/leaderboard?scope=${scope}&limit=${limit}`)
    return data.data
  },

  // Get permit nonce for address
  async getPermitNonce(address: string): Promise<bigint> {
    const res = await fetch(`${API_URL}/api/info/permit-nonce/${address}`)
    if (!res.ok) return 0n
    const data = await res.json()
    return BigInt(data.data?.nonce || 0)
  },

  // Initiate mint
  async initiateMint(
    nftType: 'PFP' | 'MEME',
    imageData: string,
    permitSignature: {
      owner: string
      spender: string
      value: string
      deadline: number
      v: number
      r: string
      s: string
    },
    token: string,
    attributes?: NFTAttribute[]
  ): Promise<{ taskId: string; status: string; message?: string }> {
    const res = await fetch(`${API_URL}/api/mint/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ nftType, imageData, permitSignature, attributes }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Mint failed')

    return {
      taskId: data.data?.id || 'unknown',
      status: data.data?.status || 'queued',
      message: data.message,
    }
  },
}



