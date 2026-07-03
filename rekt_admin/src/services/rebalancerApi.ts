import { REBALANCER_BASE_URL } from '../config/rebalancer'

export type ArbBotStatus = 'running' | 'stopped' | 'error'

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
  timestamp?: string
}

export interface ArbConfig {
  NODE_ENV?: string
  MIN_PROFIT_THRESHOLD?: number
  TRADE_SIZE_USD?: number
  AUTO_EXECUTE_TRADES?: boolean
  PRICE_MOVEMENT_THRESHOLD?: number
  ANALYSIS_COOLDOWN_MS?: number
  EVENT_POLL_INTERVAL_MS?: number
  LOG_ALL_EVENTS?: boolean
  SOLANA_TOKEN_MINT?: string
  BASE_TOKEN_ADDRESS?: string
  BASE_USDC_ADDRESS?: string
  UNISWAP_V2_ROUTER02_ADDRESS?: string
  RUN_MODE?: string
  ENABLE_LIVE_TRADING?: boolean
}

export interface PriceSnapshot {
  solanaPrice?: number
  basePrice?: number
  timestamp?: number
  source?: string
}

export interface EventCoordinatorStats {
  eventCounts?: { solana?: number; base?: number }
  currentPrices?: PriceSnapshot
  baselinePrices?: PriceSnapshot
  currentChanges?: { solana?: number; base?: number }
  isAnalysisRunning?: boolean
  lastAnalysisTime?: number
}

export interface ArbStats {
  status: ArbBotStatus
  startedAt: number | null
  lastError: string | null
  eventCoordinatorStats: EventCoordinatorStats | null
}

export interface DashboardArb {
  status: ArbBotStatus
  stats: ArbStats
  config: ArbConfig | null
}

export interface VolumeSolanaDashboard {
  status: string
  stats: Record<string, unknown> | null
  config: Record<string, unknown> | null
  recentTrades?: unknown[]
}

export interface VolumeBaseDashboard {
  status: string
  stats: Record<string, unknown> | null
  config: Record<string, unknown> | null
  recentTrades?: unknown[]
}

export interface DashboardData {
  arb: DashboardArb
  volumeSolana: VolumeSolanaDashboard
  volumeBase: VolumeBaseDashboard
  sseClients: number
}

export interface HealthData {
  status: string
  arb: ArbBotStatus | string
  volumeSolana: string
  volumeBase: string
  sseClients: number
}

export type ArbConfigUpdate = Partial<{
  MIN_PROFIT_THRESHOLD: number
  TRADE_SIZE_USD: number
  AUTO_EXECUTE_TRADES: boolean
  PRICE_MOVEMENT_THRESHOLD: number
  ANALYSIS_COOLDOWN_MS: number
  EVENT_POLL_INTERVAL_MS: number
  LOG_ALL_EVENTS: boolean
}>

export interface BotEvent {
  type: string
  botId: 'arb' | 'volume-solana' | 'volume-base' | 'system'
  timestamp: number
  data: Record<string, unknown>
}

export interface SolanaTradeRecord {
  timestamp: string
  direction: string
  tokenAmount: number
  solAmount: number
  usdValue: number
  gasUsedSol: number
  signature: string
  success: boolean
  error: string | null
}

export interface BaseTradeRecord {
  timestamp: string
  direction: string
  tokenAmount: number
  usdcAmount: number
  usdValue: number
  gasUsedEth: number
  transactionHash: string
  success: boolean
  error: string | null
}

export interface SolanaVolumeStartBody {
  minTradeAmountSol: number
  maxTradeAmountSol: number
  tradingIntervalMs: number
  slippagePercent: number
  buyProbability?: number
  priorityFeeSol?: number
  randomizeTradeSize?: boolean
  maxTotalVolumeUsd?: number
  runDurationMinutes?: number
}

export interface BaseVolumeStartBody {
  minTradeAmountUsdc: number
  maxTradeAmountUsdc: number
  tradingIntervalMs: number
  slippageBps: number
  buyProbability?: number
  deadlineSeconds?: number
  randomizeTradeSize?: boolean
  maxTotalVolumeUsd?: number
  runDurationMinutes?: number
}

export interface PricingData {
  solana: {
    price: number
    priceUsd: number
    liquidity: number
    liquidityUsd: number
    marketCapUsd?: number
  }
  base: {
    price: number
    priceUsd: number
    liquidity: number
    liquidityUsd: number
  }
  priceDifference?: {
    absolute: number
    percent: number
  }
  timestamp?: number
}

export interface BalancesData {
  solana: {
    sol: number
    solUsd: number
    token: number
    tokenUsd: number
    totalUsd: number
  }
  base: {
    eth: number
    ethUsd: number
    usdc: number
    token: number
    totalUsd: number
  }
  combined?: {
    totalUsd: number
  }
  timestamp?: number
}

export interface PoolsData {
  solana: {
    chain: string
    dex: string
    reserves?: {
      virtual?: {
        solFormatted?: number
        tokensFormatted?: number
      }
      real?: {
        solFormatted?: number
        tokensFormatted?: number
      }
    }
    liquidity?: number
    liquidityUsd?: number
    price?: number
    priceUsd?: number
  }
  base: {
    chain: string
    dex: string
    reserves?: {
      usdcFormatted?: number
      tokensFormatted?: number
    }
    liquidity?: number
    liquidityUsd?: number
    price?: number
    priceUsd?: number
  }
  comparison?: {
    priceDifference?: {
      absolute: number
      percent: number
    }
    liquidityRatio?: number
    recommendedDirection?: string
  }
  timestamp?: number
}

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const url = `${REBALANCER_BASE_URL.replace(/\/$/, '')}${path}`
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
    let json: ApiEnvelope<T> | null = null
    try {
      json = (await res.json()) as ApiEnvelope<T>
    } catch {
      json = null
    }

    if (!res.ok) {
      const msg = json?.error || `HTTP ${res.status}: ${res.statusText || 'Request failed'}`
      return { ok: false, error: msg }
    }

    if (!json?.success) {
      return { ok: false, error: json?.error || 'Request failed' }
    }
    return { ok: true, data: json.data as T }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    return { ok: false, error: msg }
  }
}

export const rebalancerApi = {
  baseUrl: REBALANCER_BASE_URL,

  async getHealth(): Promise<{ ok: true; data: HealthData } | { ok: false; error: string }> {
    return request<HealthData>('/health')
  },

  async getDashboard(): Promise<{ ok: true; data: DashboardData } | { ok: false; error: string }> {
    return request<DashboardData>('/dashboard')
  },

  async getArbConfig(): Promise<{ ok: true; data: ArbConfig } | { ok: false; error: string }> {
    return request<ArbConfig>('/arb/config')
  },

  async putArbConfig(body: ArbConfigUpdate): Promise<
    { ok: true; data: { updated: Record<string, unknown> } } | { ok: false; error: string }
  > {
    return request<{ updated: Record<string, unknown> }>('/arb/config', {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  async postArbStart(body: ArbConfigUpdate = {}): Promise<
    { ok: true; data: { message: string } } | { ok: false; error: string }
  > {
    return request<{ message: string }>('/arb/start', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  async postArbStop(): Promise<{ ok: true; data: { message: string } } | { ok: false; error: string }> {
    return request<{ message: string }>('/arb/stop', { method: 'POST', body: '{}' })
  },

  async getArbStats(): Promise<{ ok: true; data: ArbStats } | { ok: false; error: string }> {
    return request<ArbStats>('/arb/stats')
  },

  async postArbTrigger(): Promise<
    { ok: true; data: { message: string; result: unknown } } | { ok: false; error: string }
  > {
    return request<{ message: string; result: unknown }>('/arb/trigger', { method: 'POST', body: '{}' })
  },

  async postArbResetBaseline(): Promise<
    { ok: true; data: { message: string } } | { ok: false; error: string }
  > {
    return request<{ message: string }>('/arb/reset-baseline', { method: 'POST', body: '{}' })
  },

  // —— Volume: Solana ——
  async getVolumeSolanaStatus(): Promise<
    { ok: true; data: { status: string; config: Record<string, unknown> | null } } | { ok: false; error: string }
  > {
    return request<{ status: string; config: Record<string, unknown> | null }>('/volume/solana/status')
  },

  async getVolumeSolanaStats(): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
    return request<Record<string, unknown>>('/volume/solana/stats')
  },

  async getVolumeSolanaTrades(limit = 20): Promise<{ ok: true; data: SolanaTradeRecord[] } | { ok: false; error: string }> {
    return request<SolanaTradeRecord[]>(`/volume/solana/trades?limit=${limit}`)
  },

  async postVolumeSolanaStart(body: SolanaVolumeStartBody): Promise<
    { ok: true; data: { message: string } } | { ok: false; error: string }
  > {
    return request<{ message: string }>('/volume/solana/start', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  async postVolumeSolanaStop(): Promise<
    { ok: true; data: { message: string } } | { ok: false; error: string }
  > {
    return request<{ message: string }>('/volume/solana/stop', { method: 'POST', body: '{}' })
  },

  // —— Volume: Base ——
  async getVolumeBaseStatus(): Promise<
    { ok: true; data: { status: string; config: Record<string, unknown> | null } } | { ok: false; error: string }
  > {
    return request<{ status: string; config: Record<string, unknown> | null }>('/volume/base/status')
  },

  async getVolumeBaseStats(): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
    return request<Record<string, unknown>>('/volume/base/stats')
  },

  async getVolumeBaseTrades(limit = 20): Promise<{ ok: true; data: BaseTradeRecord[] } | { ok: false; error: string }> {
    return request<BaseTradeRecord[]>(`/volume/base/trades?limit=${limit}`)
  },

  async postVolumeBaseStart(body: BaseVolumeStartBody): Promise<
    { ok: true; data: { message: string } } | { ok: false; error: string }
  > {
    return request<{ message: string }>('/volume/base/start', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  async postVolumeBaseStop(): Promise<
    { ok: true; data: { message: string } } | { ok: false; error: string }
  > {
    return request<{ message: string }>('/volume/base/stop', { method: 'POST', body: '{}' })
  },

  // —— New pricing/balance/pool endpoints ——
  async getPricing(): Promise<{ ok: true; data: PricingData } | { ok: false; error: string }> {
    return request<PricingData>('/api/pricing')
  },

  async getBalances(): Promise<{ ok: true; data: BalancesData } | { ok: false; error: string }> {
    return request<BalancesData>('/api/balances')
  },

  async getPools(): Promise<{ ok: true; data: PoolsData } | { ok: false; error: string }> {
    return request<PoolsData>('/api/pools')
  },
}

export function eventsUrl(): string {
  return `${REBALANCER_BASE_URL.replace(/\/$/, '')}/events`
}
