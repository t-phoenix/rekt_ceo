import type { UserPosition } from '../hooks/useLiquidityPool'
import { formatCurrency, formatTokenAmount, formatPercentage } from '../utils/formatNumber'

interface PositionDisplayProps {
  position: UserPosition | null | undefined
  isLoading: boolean
  error: Error | null
}

export function PositionDisplay({
  position,
  isLoading,
  error,
}: PositionDisplayProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Position</h2>
        <div className="text-gray-500">Loading position data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Position</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          Error loading position: {error.message}
        </div>
      </div>
    )
  }

  if (!position || parseFloat(position.lpBalance) === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Position</h2>
        <div className="text-center py-8 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p className="text-lg font-medium mb-2">No liquidity position</p>
          <p className="text-sm">Add liquidity to start earning fees</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Position</h2>

      <div className="space-y-4">
        {/* Total Value */}
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="text-sm text-indigo-600 mb-1">Total Value</div>
          <div className="text-2xl font-bold text-indigo-900">
            {formatCurrency(position.valueUSD, { compact: true })}
          </div>
        </div>

        {/* Position Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">CEO Amount</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatTokenAmount(position.token0Amount, { symbol: 'CEO', maxDecimals: 6 })}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">USDC Amount</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatTokenAmount(position.token1Amount, { symbol: 'USDC', maxDecimals: 6 })}
            </div>
          </div>
        </div>

        {/* LP Token Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">LP Tokens</span>
            <span className="text-sm font-medium text-gray-900">
              {formatTokenAmount(position.lpBalance, { maxDecimals: 6 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Pool Share</span>
            <span className="text-sm font-medium text-gray-900">
              {formatPercentage(position.share, { maxDecimals: 4 })}
            </span>
          </div>
        </div>


        {/* Remove Liquidity Button (Future Implementation) */}
        <button
          disabled
          className="w-full py-2 px-4 rounded-lg font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
        >
          Remove Liquidity (Coming Soon)
        </button>
      </div>
    </div>
  )
}

