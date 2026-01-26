import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useConnection } from 'wagmi'
import { useAuth } from '../hooks/useAuth'

import { useTheme } from '../context/ThemeContext'

interface HeaderProps {
  currentPage?: 'home' | 'liquidity' | 'contracts'
  onNavigate?: (page: 'home' | 'liquidity' | 'contracts') => void
}

export const Header = ({ currentPage = 'home', onNavigate }: HeaderProps) => {
  const { open } = useWeb3Modal()
  const { address, status, chain } = useConnection()
  const { isAuthenticated, authenticate, logout, isAuthenticating } = useAuth()
  const { theme, toggleTheme } = useTheme()
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
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">REKT ADMIN</h1>
          {onNavigate && (
            <nav className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('home')}
                className={`px-3 py-2 text-sm font-medium rounded transition-colors ${currentPage === 'home'
                  ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('liquidity')}
                className={`px-3 py-2 text-sm font-medium rounded transition-colors ${currentPage === 'liquidity'
                  ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                Liquidity Pool
              </button>
              <button
                onClick={() => onNavigate('contracts')}
                className={`px-3 py-2 text-sm font-medium rounded transition-colors ${currentPage === 'contracts'
                  ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                Contracts
              </button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.071 19.071l.707-.707M7.757 7.757l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            )}
          </button>

          {isConnected && chain && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight">
                {chain.name}
              </span>
            </div>
          )}
          {isConnected && address ? (
            <>
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">✓ Signed In</span>
                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
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
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
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

