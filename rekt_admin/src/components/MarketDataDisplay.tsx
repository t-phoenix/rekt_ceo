import type { PoolPriceData, PoolData } from '../hooks/useLiquidityPool'
import { formatPrice, formatCurrency, formatTokenAmount } from '../utils/formatNumber'

interface MarketDataDisplayProps {
  poolPriceData: PoolPriceData | undefined
  poolData: PoolData | undefined
  poolDataLoading: boolean
  isLoading: boolean
  error: Error | null
}

export function MarketDataDisplay({
  poolPriceData,
  poolData,
  poolDataLoading,
  isLoading,
  error,
}: MarketDataDisplayProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Market Data</h2>
        <div className="text-gray-500">Loading market data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Market Data</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          Error loading market data: {error.message}
        </div>
      </div>
    )
  }

  if (!poolPriceData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Market Data</h2>
        <div className="text-gray-500">No market data available</div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Market Data</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CEO Price */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-lg p-4 transition-colors">
          <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-1 font-medium">CEO Price</div>
          <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
            {formatPrice(poolPriceData.priceCEO, { prefix: '$', maxDecimals: 6 })}
          </div>
          <div className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-1">per CEO token</div>
        </div>

        {/* USDC Price */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 transition-colors">
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1 font-medium">USDC Price</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {formatTokenAmount(poolPriceData.priceUSDC, { maxDecimals: 6 })}
          </div>
          <div className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">CEO per USDC</div>
        </div>

        {/* Total Liquidity */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 transition-colors">
          <div className="text-sm text-green-600 dark:text-green-400 mb-1 font-medium">Total Liquidity</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {formatCurrency(poolPriceData.liquidityUSD, { compact: true })}
          </div>
          <div className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">in pool</div>
        </div>

        {/* 24h Volume */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4 transition-colors">
          <div className="text-sm text-purple-600 dark:text-purple-400 mb-1 font-medium">24h Volume</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {formatCurrency(poolPriceData.volume24h, { compact: true })}
          </div>
          <div className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1">trading volume</div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 transition-colors border border-transparent dark:border-gray-700/50">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">24h Fees</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(poolPriceData.fee24h, { compact: true })}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">0.3% of volume</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 transition-colors border border-transparent dark:border-gray-700/50">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pool Fee</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">0.3%</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">per swap</div>
          </div>
        </div>
      </div>

      {/* Pool Information */}
      {poolData && !poolDataLoading && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider text-xs">Pool Information</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 transition-colors border border-transparent dark:border-gray-700/50">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total LP Supply</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatTokenAmount(poolData.totalSupply, { maxDecimals: 4 })}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 transition-colors border border-transparent dark:border-gray-700/50">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">CEO Reserve</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatTokenAmount(poolData.reserve0, { symbol: 'CEO', maxDecimals: 18 })}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 transition-colors border border-transparent dark:border-gray-700/50">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">USDC Reserve</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatTokenAmount(poolData.reserve1, { symbol: 'USDC', maxDecimals: 6 })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

