import { useCallback, useEffect, useState } from 'react'
import { useConnection, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { api } from '../services/api'

export const useAuth = () => {
  const connection = useConnection()
  const { signMessageAsync } = useSignMessage()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'))
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Extract values with safe defaults
  const address = connection?.address
  const isConnected = connection?.isConnected === true

  // Clear token when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setToken(null)
      localStorage.removeItem('auth_token')
    }
  }, [isConnected])

  const authenticate = useCallback(async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected')
    }

    setIsAuthenticating(true)
    try {
      // 1. Get nonce from backend
      const nonce = await api.getNonce(address)

      // 2. Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Rekt CEO Admin',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce,
      })

      const messageText = message.prepareMessage()

      // 3. Sign message (user must approve in wallet)
      const signature = await signMessageAsync({ message: messageText })

      // 4. Verify signature and get token
      const { token: jwt } = await api.verifySignature(messageText, signature)

      // 5. Store token
      setToken(jwt)
      localStorage.setItem('auth_token', jwt)
    } catch (error: any) {
      console.error('Authentication failed:', error)
      // User rejected signature
      if (error?.message?.includes('User rejected') || error?.code === 4001) {
        throw new Error('Signature rejected')
      }
      throw error
    } finally {
      setIsAuthenticating(false)
    }
  }, [address, isConnected, signMessageAsync])

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem('auth_token')
  }, [])

  return {
    token,
    isAuthenticated: Boolean(token) && isConnected,
    isConnected,
    address,
    authenticate,
    logout,
    isAuthenticating,
  }
}

