import { useState, useEffect } from 'react'
import type { Address } from 'viem'
import type { SwapQuote } from '../hooks/useLiquidityPool'
import { formatTokenAmount, formatPercentage } from '../utils/formatNumber'

interface SwapInterfaceProps {
  amountIn: string
  setAmountIn: (value: string) => void
  tokenIn: Address
  setTokenIn: (token: Address) => void
  tokenOut: Address
  quote: SwapQuote | undefined
  quoteLoading: boolean
  quoteError: Error | null
  onSwap: () => void
  isPending: boolean
  isSuccess: boolean
  error: Error | null
  tokenBalances: { token0: string; token1: string } | undefined
  balancesLoading: boolean
  CEOAddress: Address
  USDCAddress: Address
  userAddress: Address | undefined
  onApprove?: (amount: string) => void
  approvalPending?: boolean
  allowance?: string
  allowanceLoading?: boolean
}

export function SwapInterface({
  amountIn,
  setAmountIn,
  tokenIn,
  setTokenIn,
  tokenOut,
  quote,
  quoteLoading,
  quoteError,
  onSwap,
  isPending,
  isSuccess,
  error,
  tokenBalances,
  balancesLoading,
  CEOAddress,
  USDCAddress,
  userAddress,
  onApprove,
  approvalPending = false,
  allowance,
  allowanceLoading = false,
}: SwapInterfaceProps) {
  const isCEOIn = tokenIn === CEOAddress
  const isUSDCIn = tokenIn === USDCAddress
  const balance = isCEOIn
    ? tokenBalances?.token0 || '0'
    : isUSDCIn
      ? tokenBalances?.token1 || '0'
      : '0'
  const tokenInSymbol = isCEOIn ? 'CEO' : 'USDC'
  const tokenOutSymbol = isCEOIn ? 'USDC' : 'CEO'

  // Approval amount state
  const [approvalAmount, setApprovalAmount] = useState('')

  // Update approval amount when swap amount or token changes
  useEffect(() => {
    if (amountIn && parseFloat(amountIn) > 0) {
      // Default to swap amount, but allow user to adjust
      setApprovalAmount(amountIn)
    } else {
      setApprovalAmount('')
    }
  }, [amountIn, tokenIn])

  const handleMax = () => {
    setAmountIn(balance)
  }

  const handleMaxApproval = () => {
    setApprovalAmount(balance)
  }

  const handleFlip = () => {
    setTokenIn(tokenOut)
    setAmountIn('')
    setApprovalAmount('')
  }

  // Check if approval is needed
  const needsApproval = userAddress && allowance && parseFloat(allowance) < parseFloat(amountIn || '0')
  const hasEnoughBalance = parseFloat(amountIn || '0') > 0 && parseFloat(amountIn || '0') <= parseFloat(balance)
  const approvalAmountNum = parseFloat(approvalAmount || '0')
  const hasValidApprovalAmount = approvalAmountNum > 0 && approvalAmountNum <= parseFloat(balance)
  
  const canSwap =
    amountIn &&
    parseFloat(amountIn) > 0 &&
    hasEnoughBalance &&
    !needsApproval &&
    quote &&
    !quoteLoading &&
    !isPending &&
    !approvalPending

  const canApprove =
    hasValidApprovalAmount &&
    !isPending &&
    !approvalPending

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {/* Input Token */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">From</label>
            <div className="flex flex-col items-end gap-1">
              <div className="text-sm text-gray-500">
                Balance:{' '}
                {balancesLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  <span className="font-medium text-gray-700">
                    {formatTokenAmount(balance, { symbol: tokenInSymbol, maxDecimals: 6 })}
                  </span>
                )}
              </div>
              {userAddress && (
                <div className="text-xs text-gray-400">
                  Approved:{' '}
                  {allowanceLoading ? (
                    <span className="text-gray-300">Loading...</span>
                  ) : (
                    <span className={parseFloat(allowance || '0') >= parseFloat(amountIn || '0') ? 'text-green-600' : 'text-yellow-600'}>
                      {formatTokenAmount(allowance || '0', { symbol: tokenInSymbol, maxDecimals: 6 })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="number"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                disabled={isPending}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleMax}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isPending || !balance || parseFloat(balance) === 0}
              >
                MAX
              </button>
              <div className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">
                {tokenInSymbol}
              </div>
            </div>
          </div>
        </div>

        {/* Flip Button */}
        <div className="flex justify-center -my-2">
          <button
            onClick={handleFlip}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isPending}
            aria-label="Flip tokens"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        {/* Output Token */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">To</label>
            <div className="text-sm text-gray-500">
              Balance:{' '}
              {balancesLoading ? (
                <span className="text-gray-400">Loading...</span>
              ) : (
                <span className="font-medium text-gray-700">
                  {formatTokenAmount(
                    isCEOIn ? tokenBalances?.token1 || '0' : tokenBalances?.token0 || '0',
                    { symbol: tokenOutSymbol, maxDecimals: 6 }
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={
                  quoteLoading
                    ? 'Calculating...'
                    : quote
                      ? formatTokenAmount(quote.amountOut, { maxDecimals: 6 })
                      : '0.0'
                }
                readOnly
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>
            <div className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">
              {tokenOutSymbol}
            </div>
          </div>
        </div>

        {/* Quote Info */}
        {quote && !quoteLoading && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Price Impact</span>
              <span
                className={`font-medium ${
                  parseFloat(quote.priceImpact) > 1
                    ? 'text-red-600'
                    : parseFloat(quote.priceImpact) > 0.5
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`}
              >
                {formatPercentage(quote.priceImpact, { maxDecimals: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Minimum Received</span>
              <span className="font-medium text-gray-900">
                {formatTokenAmount(quote.amountOutMin, { symbol: tokenOutSymbol, maxDecimals: 6 })}
              </span>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {quoteError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {quoteError.message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            Swap failed: {error.message}
          </div>
        )}
        {amountIn && parseFloat(amountIn) > parseFloat(balance) && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded text-sm">
            Insufficient balance
          </div>
        )}
        {isSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
            Swap successful!
          </div>
        )}

        {/* Approval Notice */}
        {needsApproval && userAddress && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  Token Approval Required
                </p>
                <p className="text-xs text-yellow-700 mb-3">
                  You need to approve the router to spend your {tokenInSymbol} tokens before swapping.
                  Enter the amount you want to approve (this will overwrite your previous approval).
                </p>
                
                {/* Approval Amount Input */}
                <div className="space-y-2 mb-3">
                  <label className="text-xs font-medium text-yellow-800 block">
                    Approval Amount ({tokenInSymbol})
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={approvalAmount}
                        onChange={(e) => setApprovalAmount(e.target.value)}
                        placeholder="0.0"
                        min="0"
                        step="0.000001"
                        className="w-full px-3 py-2 text-sm border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none bg-white"
                        disabled={approvalPending}
                      />
                    </div>
                    <button
                      onClick={handleMaxApproval}
                      className="px-3 py-2 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={approvalPending || !balance || parseFloat(balance) === 0}
                    >
                      MAX
                    </button>
                  </div>
                  {approvalAmount && parseFloat(approvalAmount) > parseFloat(balance) && (
                    <p className="text-xs text-red-600">Approval amount exceeds balance</p>
                  )}
                  {allowance && parseFloat(allowance) > 0 && (
                    <p className="text-xs text-yellow-600">
                      Current approval: {formatTokenAmount(allowance, { symbol: tokenInSymbol, maxDecimals: 6 })}
                    </p>
                  )}
                </div>

                {onApprove && (
                  <button
                    onClick={() => onApprove(approvalAmount)}
                    disabled={!canApprove || approvalPending}
                    className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors ${
                      canApprove && !approvalPending
                        ? 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800'
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {approvalPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
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
                        Approving...
                      </span>
                    ) : (
                      `Approve ${formatTokenAmount(approvalAmount, { symbol: tokenInSymbol, maxDecimals: 6 })}`
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={onSwap}
          disabled={!canSwap}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
            canSwap
              ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
              : 'bg-gray-300 cursor-not-allowed'
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
              Swapping...
            </span>
          ) : !amountIn || parseFloat(amountIn) === 0 ? (
            'Enter an amount'
          ) : parseFloat(amountIn) > parseFloat(balance) ? (
            'Insufficient balance'
          ) : needsApproval ? (
            'Approve token first'
          ) : quoteLoading ? (
            'Calculating...'
          ) : (
            'Swap'
          )}
        </button>
      </div>
    </div>
  )
}

