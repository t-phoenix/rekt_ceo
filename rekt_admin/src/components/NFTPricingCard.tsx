import type { TierInfo } from '../services/api'

interface NFTPricingCardProps {
  title: string
  pricing: TierInfo | null
  isLoading: boolean
}

export function NFTPricingCard({ title, pricing, isLoading }: NFTPricingCardProps) {
  const formatPrice = (value: string | number) => {
    return parseFloat(Number(value).toFixed(4))
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      {isLoading ? (
        <div className="text-gray-500">Loading pricing...</div>
      ) : pricing ? (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Current Tier:</span>
            <span className="font-medium">{pricing.tierId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Price (USD):</span>
            <span className="font-medium text-green-600">
              ${formatPrice(pricing.priceUSD)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Price (CEO):</span>
            <span className="font-medium text-indigo-600">
              {formatPrice(pricing.priceCEO)} CEO
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Current Supply:</span>
            <span className="font-medium">{pricing.currentSupply}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Remaining in Tier:</span>
            <span className="font-medium">{pricing.remainingInTier}</span>
          </div>
        </div>
      ) : (
        <div className="text-gray-500">Unable to fetch pricing</div>
      )}
    </div>
  )
}

