import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import type { TierInfo } from '../services/api'

type NFTType = 'PFP' | 'MEME'

interface UseNftPricingOptions {
  enabled?: boolean
  refetchInterval?: number | null
}

interface UseNftPricingReturn {
  pfpPricing: TierInfo | null
  memePricing: TierInfo | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  refetchByType: (type: NFTType) => Promise<void>
}

export function useNftPricing(options: UseNftPricingOptions = {}): UseNftPricingReturn {
  const { enabled = true, refetchInterval = null } = options

  const [pfpPricing, setPfpPricing] = useState<TierInfo | null>(null)
  const [memePricing, setMemePricing] = useState<TierInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchPricing = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)
    try {
      const [pfp, meme] = await Promise.all([
        api.getPricing('PFP'),
        api.getPricing('MEME'),
      ])
      setPfpPricing(pfp)
      setMemePricing(meme)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch NFT pricing'))
      setPfpPricing(null)
      setMemePricing(null)
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  const fetchByType = useCallback(async (type: NFTType) => {
    if (!enabled) return

    try {
      const data = await api.getPricing(type)
      if (type === 'PFP') {
        setPfpPricing(data)
      } else {
        setMemePricing(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Failed to fetch ${type} pricing`))
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) {
      fetchPricing()
    }
  }, [enabled, fetchPricing])

  // Optional: Auto-refetch at interval
  useEffect(() => {
    if (!enabled || !refetchInterval) return

    const intervalId = setInterval(fetchPricing, refetchInterval)
    return () => clearInterval(intervalId)
  }, [enabled, refetchInterval, fetchPricing])

  return {
    pfpPricing,
    memePricing,
    isLoading,
    error,
    refetch: fetchPricing,
    refetchByType: fetchByType,
  }
}

