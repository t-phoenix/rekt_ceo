import type { Address } from 'viem'
import type { AddLiquidityQuote, PoolData } from '../hooks/useLiquidityPool'
import { formatTokenAmount, formatPrice, formatPercentage } from '../utils/formatNumber'

interface AddLiquidityInterfaceProps {
  amount0: string
  setAmount0: (value: string) => void
  amount1: string
  setAmount1: (value: string) => void
  quote: AddLiquidityQuote | undefined
  quoteLoading: boolean
  quoteError: Error | null
  onAddLiquidity: () => void
  isPending: boolean
  isSuccess: boolean
  error: Error | null
  tokenBalances: { token0: string; token1: string } | undefined
  balancesLoading: boolean
  poolData: PoolData | undefined
  poolDataLoading: boolean
  CEOAddress: Address // Reserved for future use
  USDCAddress: Address // Reserved for future use
  ceoAllowance?: string
  usdcAllowance?: string
  ceoAllowanceLoading?: boolean
  usdcAllowanceLoading?: boolean
}

export function AddLiquidityInterface({
  amount0,
  setAmount0,
  amount1,
  setAmount1,
  quote,
  quoteLoading,
  quoteError,
  onAddLiquidity,
  isPending,
  isSuccess,
  error,
  tokenBalances,
  balancesLoading,
  poolData,
  poolDataLoading,
  CEOAddress: _CEOAddress, // Reserved for future use
  USDCAddress: _USDCAddress, // Reserved for future use
  ceoAllowance,
  usdcAllowance,
  ceoAllowanceLoading,
  usdcAllowanceLoading,
}: AddLiquidityInterfaceProps) {
  const handleMax0 = () => {
    if (tokenBalances) {
      setAmount0(tokenBalances.token0)
    }
  }

  const handleMax1 = () => {
    if (tokenBalances) {
      setAmount1(tokenBalances.token1)
    }
  }

  const handleAmount0Change = (value: string) => {
    setAmount0(value)
    // TODO: Calculate optimal amount1 based on pool reserves
    // This should be done in the quote hook
  }

  const handleAmount1Change = (value: string) => {
    setAmount1(value)
    // TODO: Calculate optimal amount0 based on pool reserves
    // This should be done in the quote hook
  }

  const canAddLiquidity =
    amount0 &&
    amount1 &&
    parseFloat(amount0) > 0 &&
    parseFloat(amount1) > 0 &&
    parseFloat(amount0) <= parseFloat(tokenBalances?.token0 || '0') &&
    parseFloat(amount1) <= parseFloat(tokenBalances?.token1 || '0') &&
    quote &&
    !quoteLoading &&
    !isPending

  const ratio = poolData
    ? parseFloat(poolData.reserve1) / parseFloat(poolData.reserve0)
    : 0

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 transition-colors">
        <p className="text-sm text-blue-800 dark:text-blue-400">
          <strong>Tip:</strong> Adding liquidity provides tokens to the pool. You'll receive LP tokens
          representing your share of the pool. You can remove your liquidity at any time.
        </p>
      </div>

      {/* CEO Amount */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">CEO Amount</label>
          <div className="flex flex-col items-end gap-1">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Balance:{' '}
              {balancesLoading ? (
                <span className="text-gray-400 dark:text-gray-500">Loading...</span>
              ) : (
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {formatTokenAmount(tokenBalances?.token0 || '0', { symbol: 'CEO', maxDecimals: 6 })}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Approved:{' '}
              {ceoAllowanceLoading ? (
                <span className="text-gray-300 dark:text-gray-600">Loading...</span>
              ) : (
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {formatTokenAmount(ceoAllowance || '0', { symbol: 'CEO', maxDecimals: 6 })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              value={amount0}
              onChange={(e) => handleAmount0Change(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 text-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              disabled={isPending}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleMax0}
              className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                isPending ||
                !tokenBalances?.token0 ||
                parseFloat(tokenBalances.token0) === 0
              }
            >
              MAX
            </button>
            <div className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg">
              CEO
            </div>
          </div>
        </div>
      </div>

      {/* Plus Icon */}
      <div className="flex justify-center">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full border-4 border-white dark:border-gray-800">
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
      </div>

      {/* USDC Amount */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">USDC Amount</label>
          <div className="flex flex-col items-end gap-1">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Balance:{' '}
              {balancesLoading ? (
                <span className="text-gray-400 dark:text-gray-500">Loading...</span>
              ) : (
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {formatTokenAmount(tokenBalances?.token1 || '0', { symbol: 'USDC', maxDecimals: 6 })}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Approved:{' '}
              {usdcAllowanceLoading ? (
                <span className="text-gray-300 dark:text-gray-600">Loading...</span>
              ) : (
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {formatTokenAmount(usdcAllowance || '0', { symbol: 'USDC', maxDecimals: 6 })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              value={amount1}
              onChange={(e) => handleAmount1Change(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 text-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              disabled={isPending}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleMax1}
              className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                isPending ||
                !tokenBalances?.token1 ||
                parseFloat(tokenBalances.token1) === 0
              }
            >
              MAX
            </button>
            <div className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg">
              USDC
            </div>
          </div>
        </div>
      </div>

      {/* Pool Ratio Info */}
      {poolData && !poolDataLoading && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm transition-colors">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Current Pool Ratio</span>
            <span className="font-medium text-gray-900 dark:text-gray-200">
              1 CEO = {formatPrice(ratio.toString(), { maxDecimals: 6 })} USDC
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">CEO Reserve</span>
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {formatTokenAmount(poolData.reserve0, { symbol: 'CEO', maxDecimals: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">USDC Reserve</span>
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {formatTokenAmount(poolData.reserve1, { symbol: 'USDC', maxDecimals: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Quote Info */}
      {quote && !quoteLoading && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm transition-colors">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">LP Tokens to Receive</span>
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {formatTokenAmount(quote.lpTokens, { maxDecimals: 6 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Pool Share</span>
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {formatPercentage(quote.share, { maxDecimals: 4 })}
            </span>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {quoteError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
          {quoteError.message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
          Add liquidity failed: {error.message}
        </div>
      )}
      {amount0 && parseFloat(amount0) > parseFloat(tokenBalances?.token0 || '0') && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded text-sm">
          Insufficient CEO balance
        </div>
      )}
      {amount1 && parseFloat(amount1) > parseFloat(tokenBalances?.token1 || '0') && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded text-sm">
          Insufficient USDC balance
        </div>
      )}
      {isSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded text-sm">
          Liquidity added successfully!
        </div>
      )}

      {/* Add Liquidity Button */}
      <button
        onClick={onAddLiquidity}
        disabled={!canAddLiquidity}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${canAddLiquidity
            ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 dark:bg-indigo-500 dark:hover:bg-indigo-600'
            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
          }`}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Adding Liquidity...
          </span>
        ) : !amount0 || parseFloat(amount0) === 0 || !amount1 || parseFloat(amount1) === 0 ? (
          'Enter amounts'
        ) : parseFloat(amount0) > parseFloat(tokenBalances?.token0 || '0') ||
          parseFloat(amount1) > parseFloat(tokenBalances?.token1 || '0') ? (
          'Insufficient balance'
        ) : quoteLoading ? (
          'Calculating...'
        ) : (
          'Add Liquidity'
        )}
      </button>
    </div>
  )
}

