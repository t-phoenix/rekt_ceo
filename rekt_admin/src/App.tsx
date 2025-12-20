import { Header, CEOPriceCard, NFTPricingCard, UserInfoLookup, MintButton } from './components'
import { useApiHealth, useCeoPrice, useNftPricing, useUserInfo, useAuth } from './hooks'

function App() {
  const { token, isAuthenticated, address: connectedAddress } = useAuth()
  const { isHealthy: apiHealthy, isChecking: checking } = useApiHealth()
  const { price: ceoPrice, isLoading: priceLoading } = useCeoPrice({ enabled: apiHealthy })
  const { pfpPricing, memePricing, isLoading: pricingLoading } = useNftPricing({ enabled: apiHealthy })
  const { userMintInfo, userCEOBalance, isLoading: userInfoLoading, error: userInfoError, fetchUserInfo } = useUserInfo()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-6 py-8">
        {checking ? (
          <div className="text-center py-12 text-gray-600">Checking API...</div>
        ) : !apiHealthy ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            ⚠️ Backend API is not responding
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center py-4 text-green-600 font-medium">
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
      </main>
    </div>
  )
}

export default App
