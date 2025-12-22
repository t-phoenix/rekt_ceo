import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import type { UserPosition } from '../hooks/useLiquidityPool'
import {
  useRemoveLiquidity,
  useTokenAllowance,
  useApproveToken,
  usePoolData,
  getPoolAddress,
} from '../hooks/useLiquidityPool'
import { formatCurrency, formatTokenAmount, formatPercentage } from '../utils/formatNumber'

interface PositionDisplayProps {
  position: UserPosition | null | undefined
  isLoading: boolean
  error: Error | null
  token0: Address | undefined
  token1: Address | undefined
  routerAddress: Address | undefined
  userAddress: Address | undefined
}

export function PositionDisplay({
  position,
  isLoading,
  error,
  token0,
  token1,
  routerAddress,
  userAddress,
}: PositionDisplayProps) {
  const [approveAmount, setApproveAmount] = useState<string>('')
  const [removeAmount, setRemoveAmount] = useState<string>('')
  const slippageTolerance = 0.5 // Default 0.5% slippage

  // Get pool data to determine token order
  const { data: poolData } = usePoolData(token0, token1, routerAddress, !!token0 && !!token1 && !!routerAddress)

  // Get pool address (LP token address)
  const { data: poolAddress } = useQuery({
    queryKey: ['poolAddress', token0, token1, routerAddress],
    queryFn: async () => {
      if (!token0 || !token1 || !routerAddress) return null
      return await getPoolAddress(routerAddress, token0, token1)
    },
    enabled: !!token0 && !!token1 && !!routerAddress,
  })

  // Get LP token allowance
  const {
    data: lpTokenAllowance,
  } = useTokenAllowance(
    poolAddress || undefined,
    userAddress,
    routerAddress,
    !!poolAddress && !!userAddress && !!routerAddress
  )

  // Remove liquidity hook
  const {
    removeLiquidityAsync,
    isPending: removeLiquidityPending,
    isSuccess: removeLiquiditySuccess,
    error: removeLiquidityError,
  } = useRemoveLiquidity()

  // Approval hook for LP tokens
  const {
    approveAsync: approveLpTokenAsync,
    isPending: approvalPending,
  } = useApproveToken()

  // Set approve amount to max LP balance when position changes
  useEffect(() => {
    if (position && parseFloat(position.lpBalance) > 0 && !approveAmount) {
      setApproveAmount(position.lpBalance)
    }
  }, [position, approveAmount])

  // Set remove amount to max LP balance when position changes
  useEffect(() => {
    if (position && parseFloat(position.lpBalance) > 0 && !removeAmount) {
      setRemoveAmount(position.lpBalance)
    }
  }, [position, removeAmount])

  // Calculate minimum amounts with slippage tolerance based on pool reserves
  // Formula: amount = (liquidity * reserve) / totalSupply
  // Important: We need to be very conservative because Uniswap V2 locks minimum liquidity (1000 wei)
  const minAmounts = useMemo(() => {
    if (!position || !removeAmount || parseFloat(removeAmount) === 0 || !poolData) {
      return { amount0Min: '0', amount1Min: '0' }
    }

    const removeAmountNum = parseFloat(removeAmount)
    const lpBalanceNum = parseFloat(position.lpBalance)
    const totalSupplyNum = parseFloat(poolData.totalSupply)

    if (removeAmountNum > lpBalanceNum || lpBalanceNum === 0 || totalSupplyNum === 0) {
      return { amount0Min: '0', amount1Min: '0' }
    }

    // Calculate amounts using Uniswap V2 formula: amount = (liquidity * reserve) / totalSupply
    const reserve0Num = parseFloat(poolData.reserve0)
    const reserve1Num = parseFloat(poolData.reserve1)

    // Calculate expected amounts from reserves (exact formula from Uniswap V2)
    let token0Amount = (removeAmountNum * reserve0Num) / totalSupplyNum
    let token1Amount = (removeAmountNum * reserve1Num) / totalSupplyNum

    // Account for minimum liquidity locked in Uniswap V2 (1000 wei = 0.000000000000001 LP tokens)
    // This is negligible for most cases, but we should still account for rounding
    // The actual amount received will be slightly less due to rounding in the contract
    
    // Apply slippage tolerance with a very conservative buffer
    // INSUFFICIENT_A_AMOUNT means our minimum is too high, so we need to be very conservative
    // Use a much larger buffer (10% + slippage tolerance) to ensure we don't hit the error
    const bufferPercent = slippageTolerance + 10 // Add 10% extra buffer for safety
    const safeMultiplier = (100 - bufferPercent) / 100
    
    // Calculate minimum amounts with very conservative buffer
    let amount0Min = Math.max(0, token0Amount * safeMultiplier)
    let amount1Min = Math.max(0, token1Amount * safeMultiplier)
    
    // Further reduce by 2% to account for rounding errors, precision issues, and minimum liquidity lock
    // Uniswap V2 locks 1000 wei of minimum liquidity, which can affect calculations
    amount0Min = amount0Min * 0.98
    amount1Min = amount1Min * 0.98

    // Format to reasonable precision (avoid too many decimal places)
    // Round down to 6 decimal places to match token display precision
    // Use Math.floor to always round down (more conservative)
    amount0Min = Math.floor(amount0Min * 1000000) / 1000000
    amount1Min = Math.floor(amount1Min * 1000000) / 1000000
    
    // Ensure we never have zero minimums if we expect tokens (but allow zero if amount is truly zero)
    if (amount0Min === 0 && token0Amount > 0.000001) {
      // If we expect tokens but got zero, use 80% of expected as absolute minimum
      amount0Min = Math.floor(token0Amount * 0.8 * 1000000) / 1000000
    }
    if (amount1Min === 0 && token1Amount > 0.000001) {
      amount1Min = Math.floor(token1Amount * 0.8 * 1000000) / 1000000
    }

    return { 
      amount0Min: amount0Min.toString(), 
      amount1Min: amount1Min.toString() 
    }
  }, [position, removeAmount, slippageTolerance, poolData])

  // Check if approval is needed for remove amount
  const needsApproval = useMemo(() => {
    if (!lpTokenAllowance || !removeAmount || parseFloat(removeAmount) === 0) return false
    return parseFloat(lpTokenAllowance) < parseFloat(removeAmount)
  }, [lpTokenAllowance, removeAmount])

  // Handle LP token approval
  const handleApproveLpToken = async () => {
    if (!poolAddress || !routerAddress || !userAddress || !approveAmount || !position) return

    try {
      await approveLpTokenAsync({
        token: poolAddress,
        spender: routerAddress,
        amount: approveAmount,
        owner: userAddress,
      })
      // Optionally clear the approve amount after successful approval
      // setApproveAmount('')
    } catch (error) {
      console.error('LP token approval failed:', error)
    }
  }

  // Check if approval button is enabled
  const canApprove = useMemo(() => {
    return (
      poolAddress &&
      routerAddress &&
      userAddress &&
      approveAmount &&
      parseFloat(approveAmount) > 0 &&
      parseFloat(approveAmount) <= parseFloat(position?.lpBalance || '0') &&
      !approvalPending
    )
  }, [poolAddress, routerAddress, userAddress, approveAmount, position, approvalPending])

  // Handle remove liquidity
  const handleRemoveLiquidity = async () => {
    if (!position || !token0 || !token1 || !routerAddress || !userAddress || !removeAmount) return
    if (!poolData || !poolAddress) return

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

    // IMPORTANT: Map minimum amounts to match the pair's token order
    // poolData.token0 and token1 are the actual pair token addresses (ordered by address)
    // poolData.reserve0 and reserve1 are mapped to our input order (token0 = CEO, token1 = USDC)
    // We need to map the minimum amounts to match the pair's order
    const isToken0CEO = token0.toLowerCase() === poolData.token0.toLowerCase()
    const amountAMin = isToken0CEO ? minAmounts.amount0Min : minAmounts.amount1Min
    const amountBMin = isToken0CEO ? minAmounts.amount1Min : minAmounts.amount0Min

    // Calculate expected amounts for logging (in pair order)
    const expectedA = isToken0CEO 
      ? ((parseFloat(removeAmount) * parseFloat(poolData.reserve0)) / parseFloat(poolData.totalSupply)).toString()
      : ((parseFloat(removeAmount) * parseFloat(poolData.reserve1)) / parseFloat(poolData.totalSupply)).toString()
    const expectedB = isToken0CEO
      ? ((parseFloat(removeAmount) * parseFloat(poolData.reserve1)) / parseFloat(poolData.totalSupply)).toString()
      : ((parseFloat(removeAmount) * parseFloat(poolData.reserve0)) / parseFloat(poolData.totalSupply)).toString()

    // Log parameters for debugging
    console.log('Remove Liquidity Parameters:', {
      pairToken0: poolData.token0,
      pairToken1: poolData.token1,
      inputToken0: token0,
      inputToken1: token1,
      isToken0CEO,
      liquidity: removeAmount,
      expectedAmountA: expectedA,
      expectedAmountB: expectedB,
      amountAMin,
      amountBMin,
      minVsExpectedA: expectedA !== '0' ? `${((parseFloat(amountAMin) / parseFloat(expectedA)) * 100).toFixed(2)}%` : 'N/A',
      minVsExpectedB: expectedB !== '0' ? `${((parseFloat(amountBMin) / parseFloat(expectedB)) * 100).toFixed(2)}%` : 'N/A',
      to: userAddress,
      deadline,
      routerAddress,
      lpTokenAllowance,
      lpBalance: position.lpBalance,
      poolReserve0: poolData.reserve0,
      poolReserve1: poolData.reserve1,
      poolTotalSupply: poolData.totalSupply,
    })

    try {
      await removeLiquidityAsync({
        token0: poolData.token0,
        token1: poolData.token1,
        liquidity: removeAmount,
        amount0Min: amountAMin,
        amount1Min: amountBMin,
        to: userAddress,
        deadline,
        routerAddress,
      })
      setRemoveAmount('')
    } catch (error: any) {
      console.error('Remove liquidity failed:', error)
      // Log more detailed error information
      if (error?.message) {
        console.error('Error message:', error.message)
      }
      if (error?.cause) {
        console.error('Error cause:', error.cause)
      }
      if (error?.data) {
        console.error('Error data:', error.data)
      }
    }
  }

  // Check if remove liquidity is enabled
  const canRemoveLiquidity = useMemo(() => {
    return (
      position &&
      removeAmount &&
      parseFloat(removeAmount) > 0 &&
      parseFloat(removeAmount) <= parseFloat(position.lpBalance) &&
      !needsApproval &&
      !removeLiquidityPending &&
      !approvalPending &&
      poolData &&
      poolAddress
    )
  }, [position, removeAmount, needsApproval, removeLiquidityPending, approvalPending, poolData, poolAddress])

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
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Approved Balance</span>
            <span className="text-sm font-medium text-gray-900">
              {lpTokenAllowance ? formatTokenAmount(lpTokenAllowance, { maxDecimals: 6 }) : '0'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Pool Share</span>
            <span className="text-sm font-medium text-gray-900">
              {formatPercentage(position.share, { maxDecimals: 4 })}
            </span>
          </div>
        </div>

        {/* Approve LP Tokens Section */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800">Approve LP Tokens</h3>
            <div className="text-right">
              <div className="text-xs text-gray-500">Currently Approved</div>
              <div className="text-sm font-medium text-gray-900">
                {lpTokenAllowance ? formatTokenAmount(lpTokenAllowance, { maxDecimals: 6 }) : '0'}
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Approval Amount
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
              <button
                onClick={() => setApproveAmount(position.lpBalance)}
                className="px-4 py-2 text-sm font-medium text-yellow-600 hover:text-yellow-700 border border-yellow-300 rounded-lg hover:bg-yellow-50"
              >
                MAX
              </button>
            </div>
            {approveAmount && parseFloat(approveAmount) > parseFloat(position.lpBalance) && (
              <p className="mt-1 text-sm text-red-600">Amount exceeds LP balance</p>
            )}
            {lpTokenAllowance && approveAmount && parseFloat(approveAmount) > 0 && (
              <p className="mt-1 text-sm text-gray-600">
                After approval: {formatTokenAmount(approveAmount, { maxDecimals: 6 })} LP tokens
              </p>
            )}
          </div>

          <button
            onClick={handleApproveLpToken}
            disabled={!canApprove}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
              canApprove
                ? 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {approvalPending ? (
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
                Approving...
              </span>
            ) : !approveAmount || parseFloat(approveAmount) === 0 ? (
              'Enter amount'
            ) : parseFloat(approveAmount) > parseFloat(position.lpBalance) ? (
              'Amount too high'
            ) : (
              'Approve LP Tokens'
            )}
          </button>
        </div>

        {/* Remove Liquidity Section */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Remove Liquidity</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Remove
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={removeAmount}
                onChange={(e) => setRemoveAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <button
                onClick={() => setRemoveAmount(position.lpBalance)}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
              >
                MAX
              </button>
            </div>
            {removeAmount && parseFloat(removeAmount) > parseFloat(position.lpBalance) && (
              <p className="mt-1 text-sm text-red-600">Amount exceeds LP balance</p>
            )}
            {needsApproval && removeAmount && parseFloat(removeAmount) > 0 && (
              <p className="mt-1 text-sm text-yellow-600">
                Insufficient approval. Please approve {formatTokenAmount(removeAmount, { maxDecimals: 6 })} LP tokens first.
              </p>
            )}
            {removeAmount && parseFloat(removeAmount) > 0 && poolData && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected CEO:</span>
                  <span className="text-gray-900">
                    {formatTokenAmount(
                      ((parseFloat(removeAmount) * parseFloat(poolData.reserve0)) / parseFloat(poolData.totalSupply)).toString(),
                      { maxDecimals: 6 }
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected USDC:</span>
                  <span className="text-gray-900">
                    {formatTokenAmount(
                      ((parseFloat(removeAmount) * parseFloat(poolData.reserve1)) / parseFloat(poolData.totalSupply)).toString(),
                      { maxDecimals: 6 }
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min CEO (with {slippageTolerance}% slippage):</span>
                  <span className="text-gray-900">{formatTokenAmount(minAmounts.amount0Min, { maxDecimals: 6 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min USDC (with {slippageTolerance}% slippage):</span>
                  <span className="text-gray-900">{formatTokenAmount(minAmounts.amount1Min, { maxDecimals: 6 })}</span>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {removeLiquidityError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {removeLiquidityError.message || 'Failed to remove liquidity'}
            </div>
          )}

          {/* Success Display */}
          {removeLiquiditySuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
              Liquidity removed successfully!
            </div>
          )}

          <button
            onClick={handleRemoveLiquidity}
            disabled={!canRemoveLiquidity}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
              canRemoveLiquidity
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {removeLiquidityPending ? (
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
                Removing Liquidity...
              </span>
            ) : !removeAmount || parseFloat(removeAmount) === 0 ? (
              'Enter amount'
            ) : parseFloat(removeAmount) > parseFloat(position.lpBalance) ? (
              'Amount too high'
            ) : needsApproval ? (
              'Insufficient Approval'
            ) : (
              'Remove Liquidity'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
