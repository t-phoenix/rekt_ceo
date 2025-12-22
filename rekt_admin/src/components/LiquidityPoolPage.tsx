import { useState } from 'react'
import { useAccount } from 'wagmi'
import type { Address } from 'viem'
import {
  usePoolData,
  usePoolPriceData,
  useUserPosition,
  useSwap,
  useSwapQuote,
  useAddLiquidity,
  useAddLiquidityQuote,
  useTokenBalances,
  useTokenAllowance,
  useApproveToken,
} from '../hooks/useLiquidityPool'
import { SwapInterface } from './SwapInterface'
import { AddLiquidityInterface } from './AddLiquidityInterface'
import { ApproveInterface } from './ApproveInterface'
import { PositionDisplay } from './PositionDisplay'
import { MarketDataDisplay } from './MarketDataDisplay'

// Contract addresses from environment variables
const CEO_TOKEN_ADDRESS = import.meta.env.VITE_CEO_TOKEN_ADDRESS as Address
const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS as Address
const ROUTER_ADDRESS = import.meta.env.VITE_UNISWAP_ROUTER_ADDRESS as Address

type Tab = 'swap' | 'liquidity' | 'approve'

export function LiquidityPoolPage() {
  const { address } = useAccount()
  const [activeTab, setActiveTab] = useState<Tab>('swap')
  const [swapAmountIn, setSwapAmountIn] = useState('')
  const [swapTokenIn, setSwapTokenIn] = useState<Address>(CEO_TOKEN_ADDRESS)
  const [liquidityAmount0, setLiquidityAmount0] = useState('')
  const [liquidityAmount1, setLiquidityAmount1] = useState('')
  const [ceoApprovalAmount, setCeoApprovalAmount] = useState('')
  const [usdcApprovalAmount, setUsdcApprovalAmount] = useState('')

  // Pool data queries
  const { data: poolData, isLoading: poolDataLoading, error: poolDataError } = usePoolData(
    CEO_TOKEN_ADDRESS,
    USDC_ADDRESS,
    ROUTER_ADDRESS,
    true
  )
  const {
    data: poolPriceData,
    isLoading: poolPriceLoading,
    error: poolPriceError,
  } = usePoolPriceData(CEO_TOKEN_ADDRESS, USDC_ADDRESS, ROUTER_ADDRESS, true)
  const {
    data: userPosition,
    isLoading: positionLoading,
    error: positionError,
  } = useUserPosition(CEO_TOKEN_ADDRESS, USDC_ADDRESS, ROUTER_ADDRESS, address, !!address)
  const {
    data: tokenBalances,
    isLoading: balancesLoading,
  } = useTokenBalances(CEO_TOKEN_ADDRESS, USDC_ADDRESS, address, !!address)

  // Token allowance for swap
  const {
    data: tokenAllowance,
    isLoading: allowanceLoading,
  } = useTokenAllowance(swapTokenIn, address, ROUTER_ADDRESS, !!address && !!swapTokenIn)

  // Approval hooks
  const {
    approveAsync: approveTokenAsync,
    isPending: approvalPending,
  } = useApproveToken()
  
  // Separate approval hooks for CEO and USDC
  const {
    approveAsync: approveCEOAsync,
    isPending: ceoApprovalPending,
    isSuccess: ceoApprovalSuccess,
    error: ceoApprovalError,
  } = useApproveToken()
  
  const {
    approveAsync: approveUSDCAsync,
    isPending: usdcApprovalPending,
    isSuccess: usdcApprovalSuccess,
    error: usdcApprovalError,
  } = useApproveToken()

  // Swap quote
  const swapTokenOut = swapTokenIn === CEO_TOKEN_ADDRESS ? USDC_ADDRESS : CEO_TOKEN_ADDRESS
  const {
    data: swapQuote,
    isLoading: quoteLoading,
    error: quoteError,
  } = useSwapQuote(swapAmountIn, swapTokenIn, swapTokenOut, ROUTER_ADDRESS, !!swapAmountIn)

  // Add liquidity quote
  const {
    data: addLiquidityQuote,
    isLoading: addLiquidityQuoteLoading,
    error: addLiquidityQuoteError,
  } = useAddLiquidityQuote(
    liquidityAmount0,
    liquidityAmount1,
    CEO_TOKEN_ADDRESS,
    USDC_ADDRESS,
    ROUTER_ADDRESS,
    true
  )

  // Mutations
  const {
    swapAsync,
    isPending: swapPending,
    isSuccess: swapSuccess,
    error: swapError,
  } = useSwap()
  const {
    addLiquidityAsync,
    isPending: addLiquidityPending,
    isSuccess: addLiquiditySuccess,
    error: addLiquidityError,
  } = useAddLiquidity()

  const handleApprove = async (amount: string) => {
    if (!address || !swapTokenIn || !amount) return

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      console.error('Invalid approval amount')
      return
    }

    try {
      await approveTokenAsync({
        token: swapTokenIn,
        spender: ROUTER_ADDRESS,
        amount: amount,
        owner: address,
      })
    } catch (error) {
      console.error('Approval failed:', error)
    }
  }

  const handleSwap = async () => {
    if (!swapQuote || !address) return

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

    try {
      await swapAsync({
        amountIn: swapAmountIn,
        amountOutMin: swapQuote.amountOutMin,
        path: swapQuote.path,
        to: address,
        deadline,
        routerAddress: ROUTER_ADDRESS,
      })
      setSwapAmountIn('')
    } catch (error) {
      console.error('Swap failed:', error)
    }
  }

  // Token allowances for liquidity
  const {
    data: ceoAllowance,
    isLoading: ceoAllowanceLoading,
  } = useTokenAllowance(CEO_TOKEN_ADDRESS, address, ROUTER_ADDRESS, !!address)
  const {
    data: usdcAllowance,
    isLoading: usdcAllowanceLoading,
  } = useTokenAllowance(USDC_ADDRESS, address, ROUTER_ADDRESS, !!address)

  const handleAddLiquidity = async () => {
    if (!addLiquidityQuote || !address || !poolData) return

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

    // Map amounts to token0/token1 order (Uniswap orders tokens by address)
    // poolData.token0 and token1 are ordered by address, not by CEO/USDC
    const isToken0CEO = poolData.token0.toLowerCase() === CEO_TOKEN_ADDRESS.toLowerCase()
    const amount0Desired = isToken0CEO ? liquidityAmount0 : liquidityAmount1
    const amount1Desired = isToken0CEO ? liquidityAmount1 : liquidityAmount0
    const amount0Min = isToken0CEO ? '0' : '0' // TODO: Calculate with slippage
    const amount1Min = isToken0CEO ? '0' : '0' // TODO: Calculate with slippage

    try {
      await addLiquidityAsync({
        token0: poolData.token0,
        token1: poolData.token1,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        to: address,
        deadline,
        routerAddress: ROUTER_ADDRESS,
        ceoAddress: CEO_TOKEN_ADDRESS,
        usdcAddress: USDC_ADDRESS,
      })
      setLiquidityAmount0('')
      setLiquidityAmount1('')
    } catch (error) {
      console.error('Add liquidity failed:', error)
    }
  }

  const handleApproveCEO = async (amount: string) => {
    if (!address || !amount) return

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      console.error('Invalid approval amount')
      return
    }

    try {
      await approveCEOAsync({
        token: CEO_TOKEN_ADDRESS,
        spender: ROUTER_ADDRESS,
        amount: amount,
        owner: address,
      })
      setCeoApprovalAmount('')
    } catch (error) {
      console.error('CEO approval failed:', error)
    }
  }

  const handleApproveUSDC = async (amount: string) => {
    if (!address || !amount) return

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      console.error('Invalid approval amount')
      return
    }

    try {
      await approveUSDCAsync({
        token: USDC_ADDRESS,
        spender: ROUTER_ADDRESS,
        amount: amount,
        owner: address,
      })
      setUsdcApprovalAmount('')
    } catch (error) {
      console.error('USDC approval failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CEO/USDC Liquidity Pool</h1>
          <p className="text-gray-600">Manage your liquidity and swap tokens</p>
        </div>

        {/* Market Data */}
        <div className="mb-6">
          <MarketDataDisplay
            poolPriceData={poolPriceData ?? undefined}
            poolData={poolData ?? undefined}
            poolDataLoading={poolDataLoading}
            isLoading={poolPriceLoading}
            error={poolPriceError}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('swap')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'swap'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Swap
              </button>
              <button
                onClick={() => setActiveTab('liquidity')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'liquidity'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Liquidity
              </button>
              <button
                onClick={() => setActiveTab('approve')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'approve'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Approve
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'swap' ? (
              <SwapInterface
                amountIn={swapAmountIn}
                setAmountIn={setSwapAmountIn}
                tokenIn={swapTokenIn}
                setTokenIn={setSwapTokenIn}
                tokenOut={swapTokenOut}
                quote={swapQuote}
                quoteLoading={quoteLoading}
                quoteError={quoteError}
                onSwap={handleSwap}
                isPending={swapPending}
                isSuccess={swapSuccess}
                error={swapError}
                tokenBalances={tokenBalances}
                balancesLoading={balancesLoading}
                CEOAddress={CEO_TOKEN_ADDRESS}
                USDCAddress={USDC_ADDRESS}
                userAddress={address}
                onApprove={handleApprove}
                approvalPending={approvalPending}
                allowance={tokenAllowance}
                allowanceLoading={allowanceLoading}
              />
            ) : activeTab === 'liquidity' ? (
              <AddLiquidityInterface
                amount0={liquidityAmount0}
                setAmount0={setLiquidityAmount0}
                amount1={liquidityAmount1}
                setAmount1={setLiquidityAmount1}
                quote={addLiquidityQuote ?? undefined}
                quoteLoading={addLiquidityQuoteLoading}
                quoteError={addLiquidityQuoteError}
                onAddLiquidity={handleAddLiquidity}
                isPending={addLiquidityPending}
                isSuccess={addLiquiditySuccess}
                error={addLiquidityError}
                tokenBalances={tokenBalances}
                balancesLoading={balancesLoading}
                poolData={poolData ?? undefined}
                poolDataLoading={poolDataLoading}
                CEOAddress={CEO_TOKEN_ADDRESS}
                USDCAddress={USDC_ADDRESS}
                ceoAllowance={ceoAllowance}
                usdcAllowance={usdcAllowance}
                ceoAllowanceLoading={ceoAllowanceLoading}
                usdcAllowanceLoading={usdcAllowanceLoading}
              />
            ) : (
              <ApproveInterface
                ceoAmount={ceoApprovalAmount}
                setCeoAmount={setCeoApprovalAmount}
                usdcAmount={usdcApprovalAmount}
                setUsdcAmount={setUsdcApprovalAmount}
                onApproveCEO={handleApproveCEO}
                onApproveUSDC={handleApproveUSDC}
                ceoApprovalPending={ceoApprovalPending}
                usdcApprovalPending={usdcApprovalPending}
                ceoApprovalSuccess={ceoApprovalSuccess}
                usdcApprovalSuccess={usdcApprovalSuccess}
                ceoError={ceoApprovalError}
                usdcError={usdcApprovalError}
                tokenBalances={tokenBalances}
                balancesLoading={balancesLoading}
                ceoAllowance={ceoAllowance}
                usdcAllowance={usdcAllowance}
                ceoAllowanceLoading={ceoAllowanceLoading}
                usdcAllowanceLoading={usdcAllowanceLoading}
                CEOAddress={CEO_TOKEN_ADDRESS}
                USDCAddress={USDC_ADDRESS}
                routerAddress={ROUTER_ADDRESS}
              />
            )}
          </div>
        </div>

        {/* User Position */}
        {address && (
          <div className="mb-6">
            <PositionDisplay
              position={userPosition}
              isLoading={positionLoading}
              error={positionError}
              token0={CEO_TOKEN_ADDRESS}
              token1={USDC_ADDRESS}
              routerAddress={ROUTER_ADDRESS}
              userAddress={address}
            />
          </div>
        )}

        {/* Pool Data Debug (can be removed in production) */}
        {poolDataError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-semibold">Pool Data Error:</p>
            <p className="text-sm">{poolDataError.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}

