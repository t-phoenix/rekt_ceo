import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

interface UseCeoPriceOptions {
  enabled?: boolean
  refetchInterval?: number | null
}

interface UseCeoPriceReturn {
  price: string | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCeoPrice(options: UseCeoPriceOptions = {}): UseCeoPriceReturn {
  const { enabled = true, refetchInterval = null } = options

  const [price, setPrice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchPrice = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getCEOPrice()
      setPrice(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch CEO price'))
      setPrice(null)
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) {
      fetchPrice()
    }
  }, [enabled, fetchPrice])

  // Optional: Auto-refetch at interval
  useEffect(() => {
    if (!enabled || !refetchInterval) return

    const intervalId = setInterval(fetchPrice, refetchInterval)
    return () => clearInterval(intervalId)
  }, [enabled, refetchInterval, fetchPrice])

  return {
    price,
    isLoading,
    error,
    refetch: fetchPrice,
  }
}

