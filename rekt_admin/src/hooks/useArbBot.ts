import { useCallback, useEffect, useState } from 'react'
import {
  rebalancerApi,
  eventsUrl,
  type ArbConfig,
  type ArbStats,
  type DashboardData,
  type HealthData,
  type BotEvent,
  type ArbConfigUpdate,
  type SolanaTradeRecord,
  type BaseTradeRecord,
  type SolanaVolumeStartBody,
  type BaseVolumeStartBody,
  type PricingData,
  type BalancesData,
  type PoolsData,
} from '../services/rebalancerApi'

const FEED_MAX = 80
const VOLUME_TRADES_MAX = 50

export interface OpportunityFeedItem {
  id: string
  timestamp: number
  direction?: string
  priceDifferencePercent?: number
  estimatedProfitUsd?: number
  executed?: boolean
  simulationSuccess?: boolean
  raw: Record<string, unknown>
}

export interface TradeFeedItem {
  id: string
  timestamp: number
  direction?: string
  netProfitUsd?: number
  totalCostUsd?: number
  totalRevenueUsd?: number
  raw: Record<string, unknown>
}

function pushFeed<T extends { id: string }>(prev: T[], item: T): T[] {
  return [item, ...prev].slice(0, FEED_MAX)
}

export function useArbBot() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [arbConfig, setArbConfig] = useState<ArbConfig | null>(null)
  const [arbStats, setArbStats] = useState<ArbStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState<string | null>(null)
  const [sseConnected, setSseConnected] = useState(false)
  const [lastSseEventAt, setLastSseEventAt] = useState<number | null>(null)
  const [opportunities, setOpportunities] = useState<OpportunityFeedItem[]>([])
  const [trades, setTrades] = useState<TradeFeedItem[]>([])
  const [analysisNote, setAnalysisNote] = useState<string | null>(null)

  const [solVolumeStatus, setSolVolumeStatus] = useState<{
    status: string
    config: Record<string, unknown> | null
  } | null>(null)
  const [baseVolumeStatus, setBaseVolumeStatus] = useState<{
    status: string
    config: Record<string, unknown> | null
  } | null>(null)
  const [solVolumeStats, setSolVolumeStats] = useState<Record<string, unknown> | null>(null)
  const [baseVolumeStats, setBaseVolumeStats] = useState<Record<string, unknown> | null>(null)
  const [solVolumeTrades, setSolVolumeTrades] = useState<SolanaTradeRecord[]>([])
  const [baseVolumeTrades, setBaseVolumeTrades] = useState<BaseTradeRecord[]>([])
  const [volumeError, setVolumeError] = useState<string | null>(null)
  const [pricingData, setPricingData] = useState<PricingData | null>(null)
  const [balancesData, setBalancesData] = useState<BalancesData | null>(null)
  const [poolsData, setPoolsData] = useState<PoolsData | null>(null)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [balancesError, setBalancesError] = useState<string | null>(null)
  const [poolsError, setPoolsError] = useState<string | null>(null)

  const refreshHealth = useCallback(async () => {
    const r = await rebalancerApi.getHealth()
    if (r.ok) {
      setHealth(r.data)
      setHealthError(null)
    } else {
      setHealthError(r.error)
    }
  }, [])

  const refreshDashboard = useCallback(async () => {
    const r = await rebalancerApi.getDashboard()
    if (r.ok) {
      setDashboard(r.data)
      if (r.data.arb.config) setArbConfig(r.data.arb.config)
      setArbStats(r.data.arb.stats)
    }
  }, [])

  const refreshArbConfig = useCallback(async () => {
    const r = await rebalancerApi.getArbConfig()
    if (r.ok) setArbConfig(r.data)
  }, [])

  const refreshArbStats = useCallback(async () => {
    const r = await rebalancerApi.getArbStats()
    if (r.ok) setArbStats(r.data)
  }, [])

  const loadVolumeSnapshot = useCallback(async () => {
    const [st, bt, trS, trB, sst, bst] = await Promise.all([
      rebalancerApi.getVolumeSolanaStatus(),
      rebalancerApi.getVolumeBaseStatus(),
      rebalancerApi.getVolumeSolanaTrades(25),
      rebalancerApi.getVolumeBaseTrades(25),
      rebalancerApi.getVolumeSolanaStats(),
      rebalancerApi.getVolumeBaseStats(),
    ])
    if (st.ok) setSolVolumeStatus(st.data)
    if (bt.ok) setBaseVolumeStatus(bt.data)
    if (trS.ok) setSolVolumeTrades(trS.data.slice(0, VOLUME_TRADES_MAX))
    if (trB.ok) setBaseVolumeTrades(trB.data.slice(0, VOLUME_TRADES_MAX))
    if (sst.ok) setSolVolumeStats(sst.data)
    if (bst.ok) setBaseVolumeStats(bst.data)
  }, [])

  const loadMarketSnapshot = useCallback(async () => {
    const [pricing, balances, pools] = await Promise.all([
      rebalancerApi.getPricing(),
      rebalancerApi.getBalances(),
      rebalancerApi.getPools(),
    ])
    if (pricing.ok) {
      setPricingData(pricing.data)
      setPricingError(null)
    } else {
      setPricingData(null)
      setPricingError(pricing.error)
    }
    if (balances.ok) {
      setBalancesData(balances.data)
      setBalancesError(null)
    } else {
      setBalancesData(null)
      setBalancesError(balances.error)
    }
    if (pools.ok) {
      setPoolsData(pools.data)
      setPoolsError(null)
    } else {
      setPoolsData(null)
      setPoolsError(pools.error)
    }

    const errors = [pricing.ok ? null : pricing.error, balances.ok ? null : balances.error, pools.ok ? null : pools.error]
      .filter(Boolean)
      .join(' | ')
    setMarketError(errors || null)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setActionError(null)
    await refreshHealth()
    const dash = await rebalancerApi.getDashboard()
    if (dash.ok) {
      setDashboard(dash.data)
      const cfg = dash.data.arb.config
      if (cfg) setArbConfig(cfg)
      const rtS = dash.data.volumeSolana?.recentTrades
      const rtB = dash.data.volumeBase?.recentTrades
      if (Array.isArray(rtS) && rtS.length)
        setSolVolumeTrades(rtS.slice(0, VOLUME_TRADES_MAX) as SolanaTradeRecord[])
      if (Array.isArray(rtB) && rtB.length)
        setBaseVolumeTrades(rtB.slice(0, VOLUME_TRADES_MAX) as BaseTradeRecord[])
    }
    const cfgOnly = await rebalancerApi.getArbConfig()
    if (cfgOnly.ok) setArbConfig(cfgOnly.data)
    const stats = await rebalancerApi.getArbStats()
    if (stats.ok) setArbStats(stats.data)
    await loadVolumeSnapshot()
    await loadMarketSnapshot()
    setLoading(false)
  }, [refreshHealth, loadVolumeSnapshot, loadMarketSnapshot])

  useEffect(() => {
    if (typeof window === 'undefined') return
    loadAll()
  }, [loadAll])

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshHealth()
    }, 15000)
    return () => window.clearInterval(id)
  }, [refreshHealth])

  useEffect(() => {
    if (arbStats?.status !== 'running') return
    const id = window.setInterval(() => {
      refreshArbStats()
    }, 10000)
    return () => window.clearInterval(id)
  }, [arbStats?.status, refreshArbStats])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      void refreshHealth()
      void refreshArbStats()
      void loadVolumeSnapshot()
      void loadMarketSnapshot()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refreshHealth, refreshArbStats, loadVolumeSnapshot, loadMarketSnapshot])

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadMarketSnapshot()
    }, 7000)
    return () => window.clearInterval(id)
  }, [loadMarketSnapshot])

  const handleSseMessage = useCallback(
    (ev: MessageEvent) => {
      try {
        const event = JSON.parse(ev.data) as BotEvent
        setLastSseEventAt(Date.now())
        const t = event.type

        if (t === 'system:status' && event.data && typeof event.data === 'object') {
          const d = event.data as unknown as DashboardData
          setDashboard(d)
          if (d.arb?.config) setArbConfig(d.arb.config)
          if (d.arb?.stats) setArbStats(d.arb.stats)
          const rtS = d.volumeSolana?.recentTrades
          const rtB = d.volumeBase?.recentTrades
          if (Array.isArray(rtS) && rtS.length)
            setSolVolumeTrades(rtS.slice(0, VOLUME_TRADES_MAX) as SolanaTradeRecord[])
          if (Array.isArray(rtB) && rtB.length)
            setBaseVolumeTrades(rtB.slice(0, VOLUME_TRADES_MAX) as BaseTradeRecord[])
          return
        }

        if (t === 'arb:started') {
          refreshArbStats()
          refreshArbConfig()
          return
        }
        if (t === 'arb:stopped') {
          refreshArbStats()
          return
        }
        if (t === 'arb:config_updated') {
          refreshArbConfig()
          return
        }
        if (t === 'arb:analysis') {
          setAnalysisNote(`Analysis @ ${new Date(event.timestamp).toLocaleTimeString()}`)
          return
        }
        if (t === 'arb:opportunity') {
          const d = event.data as Record<string, unknown>
          setOpportunities((prev) =>
            pushFeed(prev, {
              id: `${event.timestamp}-${Math.random().toString(36).slice(2)}`,
              timestamp: event.timestamp,
              direction: d.direction as string | undefined,
              priceDifferencePercent: d.priceDifferencePercent as number | undefined,
              estimatedProfitUsd: d.estimatedProfitUsd as number | undefined,
              executed: d.executed as boolean | undefined,
              simulationSuccess: d.simulationSuccess as boolean | undefined,
              raw: d,
            })
          )
          setAnalysisNote(null)
          return
        }
        if (t === 'arb:trade') {
          const d = event.data as Record<string, unknown>
          setTrades((prev) =>
            pushFeed(prev, {
              id: `${event.timestamp}-${Math.random().toString(36).slice(2)}`,
              timestamp: event.timestamp,
              direction: d.direction as string | undefined,
              netProfitUsd: d.netProfitUsd as number | undefined,
              totalCostUsd: d.totalCostUsd as number | undefined,
              totalRevenueUsd: d.totalRevenueUsd as number | undefined,
              raw: d,
            })
          )
          return
        }

        if (t === 'volume:solana:trade') {
          const d = event.data as Record<string, unknown>
          const row: SolanaTradeRecord = {
            timestamp: new Date(event.timestamp).toISOString(),
            direction: String(d.direction ?? ''),
            tokenAmount: Number(d.tokenAmount ?? 0),
            solAmount: Number(d.solAmount ?? 0),
            usdValue: Number(d.usdValue ?? 0),
            gasUsedSol: Number(d.gasUsedSol ?? 0),
            signature: String(d.signature ?? ''),
            success: d.success !== false,
            error: d.error != null ? String(d.error) : null,
          }
          setSolVolumeTrades((prev) => [row, ...prev].slice(0, VOLUME_TRADES_MAX))
          return
        }

        if (t === 'volume:base:trade') {
          const d = event.data as Record<string, unknown>
          const row: BaseTradeRecord = {
            timestamp: new Date(event.timestamp).toISOString(),
            direction: String(d.direction ?? ''),
            tokenAmount: Number(d.tokenAmount ?? 0),
            usdcAmount: Number(d.usdcAmount ?? 0),
            usdValue: Number(d.usdValue ?? 0),
            gasUsedEth: Number(d.gasUsedEth ?? 0),
            transactionHash: String(d.transactionHash ?? ''),
            success: d.success !== false,
            error: d.error != null ? String(d.error) : null,
          }
          setBaseVolumeTrades((prev) => [row, ...prev].slice(0, VOLUME_TRADES_MAX))
          return
        }

        if (
          t === 'volume:solana:started' ||
          t === 'volume:solana:stopped' ||
          t === 'volume:base:started' ||
          t === 'volume:base:stopped'
        ) {
          void loadVolumeSnapshot()
          return
        }
      } catch {
        // ignore malformed SSE payloads
      }
    },
    [refreshArbConfig, refreshArbStats, loadVolumeSnapshot]
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return

    const url = eventsUrl()
    const es = new EventSource(url)

    es.onopen = () => setSseConnected(true)
    es.onerror = () => {
      setSseConnected(false)
    }
    es.onmessage = handleSseMessage

    return () => {
      es.close()
      setSseConnected(false)
    }
  }, [handleSseMessage])

  const updateConfig = useCallback(async (body: ArbConfigUpdate) => {
    setActionError(null)
    const r = await rebalancerApi.putArbConfig(body)
    if (!r.ok) {
      setActionError(r.error)
      return { ok: false as const, error: r.error }
    }
    await refreshArbConfig()
    return { ok: true as const, data: r.data }
  }, [refreshArbConfig])

  const startBot = useCallback(
    async (overrides: ArbConfigUpdate = {}) => {
      setActionError(null)
      const r = await rebalancerApi.postArbStart(overrides)
      if (!r.ok) {
        setActionError(r.error)
        return { ok: false as const, error: r.error }
      }
      await refreshDashboard()
      await refreshArbStats()
      return { ok: true as const }
    },
    [refreshDashboard, refreshArbStats]
  )

  const stopBot = useCallback(async () => {
    setActionError(null)
    const r = await rebalancerApi.postArbStop()
    if (!r.ok) {
      setActionError(r.error)
      return { ok: false as const, error: r.error }
    }
    await refreshArbStats()
    return { ok: true as const }
  }, [refreshArbStats])

  const triggerAnalysis = useCallback(async () => {
    setActionError(null)
    const r = await rebalancerApi.postArbTrigger()
    if (!r.ok) {
      setActionError(r.error)
      return { ok: false as const, error: r.error }
    }
    return { ok: true as const, data: r.data }
  }, [])

  const resetBaseline = useCallback(async () => {
    setActionError(null)
    const r = await rebalancerApi.postArbResetBaseline()
    if (!r.ok) {
      setActionError(r.error)
      return { ok: false as const, error: r.error }
    }
    await refreshArbStats()
    return { ok: true as const }
  }, [refreshArbStats])

  const clearArbFeeds = useCallback(() => {
    setOpportunities([])
    setTrades([])
  }, [])

  const startSolanaVolume = useCallback(
    async (body: SolanaVolumeStartBody) => {
      setVolumeError(null)
      const r = await rebalancerApi.postVolumeSolanaStart(body)
      if (!r.ok) {
        setVolumeError(r.error)
        return { ok: false as const, error: r.error }
      }
      await loadVolumeSnapshot()
      return { ok: true as const }
    },
    [loadVolumeSnapshot]
  )

  const stopSolanaVolume = useCallback(async () => {
    setVolumeError(null)
    const r = await rebalancerApi.postVolumeSolanaStop()
    if (!r.ok) {
      setVolumeError(r.error)
      return { ok: false as const, error: r.error }
    }
    await loadVolumeSnapshot()
    return { ok: true as const }
  }, [loadVolumeSnapshot])

  const startBaseVolume = useCallback(
    async (body: BaseVolumeStartBody) => {
      setVolumeError(null)
      const r = await rebalancerApi.postVolumeBaseStart(body)
      if (!r.ok) {
        setVolumeError(r.error)
        return { ok: false as const, error: r.error }
      }
      await loadVolumeSnapshot()
      return { ok: true as const }
    },
    [loadVolumeSnapshot]
  )

  const stopBaseVolume = useCallback(async () => {
    setVolumeError(null)
    const r = await rebalancerApi.postVolumeBaseStop()
    if (!r.ok) {
      setVolumeError(r.error)
      return { ok: false as const, error: r.error }
    }
    await loadVolumeSnapshot()
    return { ok: true as const }
  }, [loadVolumeSnapshot])

  return {
    baseUrl: rebalancerApi.baseUrl,
    health,
    healthError,
    dashboard,
    arbConfig,
    arbStats,
    loading,
    actionError,
    setActionError,
    sseConnected,
    lastSseEventAt,
    opportunities,
    trades,
    analysisNote,
    loadAll,
    loadVolumeSnapshot,
    loadMarketSnapshot,
    refreshHealth,
    refreshArbConfig,
    refreshArbStats,
    updateConfig,
    startBot,
    stopBot,
    triggerAnalysis,
    resetBaseline,
    clearArbFeeds,
    solVolumeStatus,
    baseVolumeStatus,
    solVolumeStats,
    baseVolumeStats,
    solVolumeTrades,
    baseVolumeTrades,
    volumeError,
    setVolumeError,
    pricingData,
    balancesData,
    poolsData,
    marketError,
    pricingError,
    balancesError,
    poolsError,
    startSolanaVolume,
    stopSolanaVolume,
    startBaseVolume,
    stopBaseVolume,
  }
}
