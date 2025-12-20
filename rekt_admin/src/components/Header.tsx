import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useConnection } from 'wagmi'
import { useAuth } from '../hooks/useAuth'

export const Header = () => {
  const { open } = useWeb3Modal()
  const { address, status } = useConnection()
  const { isAuthenticated, authenticate, logout, isAuthenticating } = useAuth()
  const isConnected = status === 'connected'

  const handleSignIn = async () => {
    try {
      await authenticate().then(() => {
        console.log("Sign in successful")
      })
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  const handleDisconnect = () => {
    logout()
    open()
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">REKT ADMIN</h1>
        
        <div className="flex items-center gap-3">
          {isConnected && address ? (
            <>
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-green-600 font-medium">✓ Signed In (nonce authenticated)</span>
                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSignIn}
                    disabled={isAuthenticating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {isAuthenticating ? 'Signing...' : 'Sign In'}
                  </button>
                  <button
                    onClick={() => open()}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </button>
                </>
              )}
            </>
          ) : (
            <button
              onClick={() => open()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

