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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
      <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-6">{title} Pricing</h2>
      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <div className="w-8 h-4 bg-gray-100 dark:bg-gray-700 animate-pulse rounded"></div>
          <span className="text-sm">Loading...</span>
        </div>
      ) : pricing ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-2xl p-5 transition-colors border border-indigo-100/30 dark:border-indigo-700/30">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Current Tier</span>
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-100 bg-white/50 dark:bg-indigo-700/50 px-2 py-0.5 rounded shadow-sm">Tier {pricing.tierId}</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-3xl font-black text-indigo-900 dark:text-indigo-100">${formatPrice(pricing.priceUSD)}</div>
                  <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 mt-1 uppercase tracking-tight">USD Basis</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatPrice(pricing.priceCEO)}</div>
                  <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 mt-1 uppercase tracking-tight">CEO Tokens</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800 transition-colors">
              <div className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Supply</div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{pricing.currentSupply} <span className="text-[10px] text-gray-400">NFTs</span></div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800 transition-colors">
              <div className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Remaining</div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{pricing.remainingInTier} <span className="text-[10px] text-gray-400">in Tier</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm font-bold text-red-500 dark:text-red-400">Pricing unavailable</div>
      )}
    </div>
  )
}

