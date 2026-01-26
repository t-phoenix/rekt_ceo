import { useState, useEffect } from 'react'
import { Header, CEOPriceCard, NFTPricingCard, UserInfoLookup, MintButton, LiquidityPoolPage, ContractManagerPage } from './components'
import { useApiHealth, useCeoPrice, useNftPricing, useUserInfo, useAuth } from './hooks'

type Page = 'home' | 'liquidity' | 'contracts'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const { token, isAuthenticated, address: connectedAddress, validateToken } = useAuth()
  const { isHealthy: apiHealthy, isChecking: checking } = useApiHealth()
  const { price: ceoPrice, isLoading: priceLoading } = useCeoPrice({ enabled: apiHealthy })
  const { pfpPricing, memePricing, isLoading: pricingLoading } = useNftPricing({ enabled: apiHealthy })
  const { userMintInfo, userCEOBalance, isLoading: userInfoLoading, error: userInfoError, fetchUserInfo } = useUserInfo()

  // Validate session on mount and when address changes
  useEffect(() => {
    if (isAuthenticated && connectedAddress) {
      validateToken()
    }
  }, [isAuthenticated, connectedAddress, validateToken])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="container mx-auto px-6 py-8">
        {currentPage === 'liquidity' ? (
          <LiquidityPoolPage />
        ) : currentPage === 'contracts' ? (
          <ContractManagerPage />
        ) : (
          <>
            {checking ? (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">Checking API...</div>
            ) : !apiHealthy ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                ⚠️ Backend API is not responding
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center py-4 text-green-600 dark:text-green-400 font-medium">
                  API Connected ✓
                </div>

                <CEOPriceCard price={ceoPrice} isLoading={priceLoading} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <NFTPricingCard title="PFP NFT Pricing" pricing={pfpPricing} isLoading={pricingLoading} />
                  <NFTPricingCard title="MEME NFT Pricing" pricing={memePricing} isLoading={pricingLoading} />
                </div>

                <UserInfoLookup
                  userInfo={userMintInfo}
                  isLoading={userInfoLoading}
                  error={userInfoError}
                  onLookup={fetchUserInfo}
                  connectedAddress={connectedAddress}
                />

                <MintButton token={token} userCEOBalance={userCEOBalance} isAuthenticated={isAuthenticated} pfpPricing={pfpPricing} memePricing={memePricing} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
