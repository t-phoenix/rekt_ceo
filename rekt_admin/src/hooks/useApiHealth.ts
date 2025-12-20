import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

interface UseApiHealthReturn {
  isHealthy: boolean
  isChecking: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useApiHealth(): UseApiHealthReturn {
  const [isHealthy, setIsHealthy] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const checkHealth = useCallback(async () => {
    setIsChecking(true)
    setError(null)
    try {
      const healthy = await api.checkHealth()
      setIsHealthy(healthy)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Health check failed'))
      setIsHealthy(false)
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  return {
    isHealthy,
    isChecking,
    error,
    refetch: checkHealth,
  }
}

