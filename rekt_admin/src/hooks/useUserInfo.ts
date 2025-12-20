import { useState, useCallback } from 'react'
import { api } from '../services/api'
import type { UserMintInfo } from '../services/api'

interface UseUserInfoReturn {
  userMintInfo: UserMintInfo | null
  userCEOBalance: number | null
  isLoading: boolean
  error: string | null
  fetchUserInfo: (address: string) => Promise<void>
  clearUserInfo: () => void
}

export function useUserInfo(): UseUserInfoReturn {
  const [userMintInfo, setUserMintInfo] = useState<UserMintInfo | null>(null)
  const [userCEOBalance, setUserCEOBalance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserInfo = useCallback(async (address: string) => {
    const trimmedAddress = address.trim()
    if (!trimmedAddress) {
      setError('Please enter a valid address')
      return
    }

    // Basic address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
      setError('Invalid Ethereum address format')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const info = await api.getUserInfo(trimmedAddress)
      setUserMintInfo(info)
      const balance = await api.getUserCEOBalance(trimmedAddress)
      setUserCEOBalance(Number(balance.balance))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user info'
      setError(message)
      setUserMintInfo(null)
      setUserCEOBalance(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearUserInfo = useCallback(() => {
    setUserMintInfo(null)
    setUserCEOBalance(null)
    setError(null)
  }, [])

  return {
    userMintInfo,
    userCEOBalance,
    isLoading,
    error,
    fetchUserInfo,
    clearUserInfo,
  }
}

