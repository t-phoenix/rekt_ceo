import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { readContract, simulateContract } from 'wagmi/actions'
import { config } from '../config/wagmi'
import type { Address } from 'viem'
import { formatUnits, parseUnits } from 'viem'
import { useEffect } from 'react'
import UNISWAP_V2_ROUTER_ABI from '../abi/UniswapRouter02.json'
import UNISWAP_V2_PAIR_ABI from '../abi/UniswapV2Pair.json'
import ERC20_ABI from '../abi/ERC20.json'

// Types
export interface PoolData {
  token0: Address // CEO token address
  token1: Address // USDC address
  reserve0: string // CEO reserve
  reserve1: string // USDC reserve
  totalSupply: string // LP token total supply
  kLast: string // Last K value
}

export interface PoolPriceData {
  priceCEO: string // Price of CEO in USDC
  priceUSDC: string // Price of USDC in CEO (1 / priceCEO)
  liquidityUSD: string // Total liquidity in USD
  volume24h: string // 24h volume
  fee24h: string // 24h fees
}

export interface UserPosition {
  lpBalance: string // User's LP token balance
  lpBalanceRaw: string // Raw LP token balance
  token0Amount: string // CEO amount in position
  token1Amount: string // USDC amount in position
  share: string // User's share of pool (percentage)
  valueUSD: string // Total value of position in USD
}

export interface SwapQuote {
  amountOut: string // Output amount
  amountOutMin: string // Minimum output (with slippage)
  path: Address[] // Swap path
  priceImpact: string // Price impact percentage
}

export interface AddLiquidityQuote {
  amount0: string // CEO amount needed
  amount1: string // USDC amount needed
  lpTokens: string // LP tokens to receive
  share: string // Share of pool
}

// Uniswap V2 Router 02 ABI imported from JSON file

// Uniswap V2 Factory ABI (minimal)
const UNISWAP_V2_FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
    ],
    name: 'getPair',
    outputs: [{ internalType: 'address', name: 'pair', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Uniswap V2 Pair ABI imported from JSON file
// ERC20 ABI imported from JSON file

// Helper function to get pool address from factory
export async function getPoolAddress(
  routerAddress: Address,
  token0: Address,
  token1: Address
): Promise<Address | null> {
  try {
    if (!routerAddress || !token0 || !token1) {
      console.error('Missing required addresses for getPoolAddress')
      return null
    }

    // Get factory from router
    const factory = (await readContract(config, {
      address: routerAddress,
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: 'factory',
    })) as Address

    if (!factory || factory === '0x0000000000000000000000000000000000000000') {
      console.error('Invalid factory address from router')
      return null
    }

    // Get pair address from factory (order matters - smaller address first)
    // Uniswap V2 pairs are ordered by address (lower address is token0)
    const token0Lower = token0.toLowerCase() as Address
    const token1Lower = token1.toLowerCase() as Address
    const [addr0, addr1] = token0Lower < token1Lower ? [token0Lower, token1Lower] : [token1Lower, token0Lower]
    
    const pairAddress = (await readContract(config, {
      address: factory,
      abi: UNISWAP_V2_FACTORY_ABI,
      functionName: 'getPair',
      args: [addr0, addr1],
    })) as Address

    // Check if pair exists (getPair returns zero address if it doesn't exist)
    if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
      console.warn(`Pool does not exist for pair: ${token0} / ${token1}`)
      return null
    }

    return pairAddress
  } catch (error) {
    console.error('Error getting pool address:', error)
    return null
  }
}

// Hook to fetch pool data
export function usePoolData(
  token0: Address | undefined,
  token1: Address | undefined,
  routerAddress: Address | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['poolData', token0, token1, routerAddress],
    queryFn: async (): Promise<PoolData | null> => {
      if (!token0 || !token1 || !routerAddress) return null

      const poolAddress = await getPoolAddress(routerAddress, token0, token1)
      if (!poolAddress) {
        throw new Error('Pool does not exist')
      }

      // Read pool data
      const [token0Addr, token1Addr, reserves, totalSupply, kLast] = await Promise.all([
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'token0',
        }) as Promise<Address>,
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'token1',
        }) as Promise<Address>,
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'getReserves',
        }) as Promise<[bigint, bigint, number]>,
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'totalSupply',
        }) as Promise<bigint>,
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'kLast',
        }) as Promise<bigint>,
      ])

      // Determine which token is which based on addresses
      const isToken0First = token0.toLowerCase() === token0Addr.toLowerCase()
      const reserve0 = isToken0First ? reserves[0] : reserves[1]
      const reserve1 = isToken0First ? reserves[1] : reserves[0]

      // Get token decimals for formatting
      const [decimals0, decimals1] = await Promise.all([
        readContract(config, {
          address: token0,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
        readContract(config, {
          address: token1,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ])

      // Format reserves with correct decimals
      const reserve0Formatted = formatUnits(reserve0, decimals0)
      const reserve1Formatted = formatUnits(reserve1, decimals1)
      // LP tokens have 18 decimals
      const totalSupplyFormatted = formatUnits(totalSupply, 18)

      

      return {
        token0: token0Addr,
        token1: token1Addr,
        reserve0: reserve0Formatted,
        reserve1: reserve1Formatted,
        totalSupply: totalSupplyFormatted,
        kLast: kLast.toString(),
      }
    },
    enabled: enabled && !!token0 && !!token1 && !!routerAddress,
    refetchInterval: 10000, // Refetch every 10 seconds
  })
}

// Hook to fetch pool price data
export function usePoolPriceData(
  token0: Address | undefined,
  token1: Address | undefined,
  routerAddress: Address | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['poolPriceData', token0, token1, routerAddress],
    queryFn: async (): Promise<PoolPriceData | null> => {
      if (!token0 || !token1 || !routerAddress) {
        console.warn('Missing required addresses for pool price data')
        return null
      }

      const poolAddress = await getPoolAddress(routerAddress, token0, token1)
      if (!poolAddress) {
        throw new Error(`Pool does not exist for ${token0} / ${token1}. Please create the pool first.`)
      }

      // Get pair token addresses and reserves
      const [pairToken0, reserves] = await Promise.all([
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'token0',
        }) as Promise<Address>,
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'getReserves',
        }) as Promise<[bigint, bigint, number]>,
      ])

      // Get token decimals for both tokens
      const [decimals0, decimals1] = await Promise.all([
        readContract(config, {
          address: token0,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
        readContract(config, {
          address: token1,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ])

      // Determine which token is which based on actual pair ordering
      // In Uniswap V2, token0 is always the token with the lower address
      const pairToken0Lower = pairToken0.toLowerCase()
      const isToken0CEO = token0.toLowerCase() === pairToken0Lower
      
      // Map reserves to our token order (token0 = CEO, token1 = USDC)
      let ceoReserve: bigint
      let usdcReserve: bigint
      let ceoDecimals: number
      let usdcDecimals: number
      
      if (isToken0CEO) {
        // CEO is pairToken0, USDC is pairToken1
        ceoReserve = reserves[0]
        usdcReserve = reserves[1]
        ceoDecimals = decimals0 // decimals0 is CEO decimals (from token0 parameter)
        usdcDecimals = decimals1 // decimals1 is USDC decimals (from token1 parameter)
      } else {
        // CEO is pairToken1, USDC is pairToken0 (addresses are swapped in pair)
        ceoReserve = reserves[1]
        usdcReserve = reserves[0]
        ceoDecimals = decimals0 // decimals0 is CEO decimals (from token0 parameter)
        usdcDecimals = decimals1 // decimals1 is USDC decimals (from token1 parameter)
      }

      // Format reserves with correct decimals
      const ceoReserveFormatted = Number(formatUnits(ceoReserve, ceoDecimals))
      const usdcReserveFormatted = Number(formatUnits(usdcReserve, usdcDecimals))

      // Calculate prices
      // priceCEO = USDC per CEO = usdcReserve / ceoReserve
      const priceCEO = ceoReserveFormatted > 0 ? (usdcReserveFormatted / ceoReserveFormatted).toString() : '0'
      // priceUSDC = CEO per USDC = ceoReserve / usdcReserve
      const priceUSDC = usdcReserveFormatted > 0 ? (ceoReserveFormatted / usdcReserveFormatted).toString() : '0'

      // Calculate liquidity in USD (assuming USDC is USD-pegged)
      // Total liquidity = (CEO value in USD + USDC value) * 2
      // CEO value = ceoReserve * priceCEO
      // USDC value = usdcReserve (since USDC is 1:1 with USD)
      const liquidityUSD = ((ceoReserveFormatted * Number(priceCEO) + usdcReserveFormatted) * 2).toString()

      // TODO: Get volume24h from subgraph or events
      const volume24h = '0'
      const fee24h = (Number(volume24h) * 0.003).toString() // 0.3% fee

      return {
        priceCEO,
        priceUSDC,
        liquidityUSD,
        volume24h,
        fee24h,
      }
    },
    enabled: enabled && !!token0 && !!token1 && !!routerAddress,
    refetchInterval: 10000,
  })
}

// Hook to fetch user position
export function useUserPosition(
  token0: Address | undefined,
  token1: Address | undefined,
  routerAddress: Address | undefined,
  userAddress: Address | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['userPosition', token0, token1, routerAddress, userAddress],
    queryFn: async (): Promise<UserPosition | null> => {
      if (!token0 || !token1 || !routerAddress || !userAddress) return null

      const poolAddress = await getPoolAddress(routerAddress, token0, token1)
      if (!poolAddress) {
        return null // Pool doesn't exist, user has no position
      }

      // Get pool data
      const [reserves, totalSupply, lpBalance] = await Promise.all([
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'getReserves',
        }) as Promise<[bigint, bigint, number]>,
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'totalSupply',
        }) as Promise<bigint>,
        readContract(config, {
          address: poolAddress,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [userAddress],
        }) as Promise<bigint>,
      ])

      if (totalSupply === 0n) {
        return {
          lpBalance: '0',
          lpBalanceRaw: '0',
          token0Amount: '0',
          token1Amount: '0',
          share: '0',
          valueUSD: '0',
        }
      }

      // Determine which token is which
      const isToken0First = token0.toLowerCase() < token1.toLowerCase()
      const reserve0 = isToken0First ? reserves[0] : reserves[1]
      const reserve1 = isToken0First ? reserves[1] : reserves[0]

      // Calculate user's share
      const lpBalanceBigInt = BigInt(lpBalance.toString())
      const totalSupplyBigInt = BigInt(totalSupply.toString())

      const share = totalSupplyBigInt > 0n
        ? (Number(lpBalanceBigInt * 10000n / totalSupplyBigInt) / 100).toString()
        : '0'

      // Get token decimals first (needed for formatting)
      const [decimals0, decimals1] = await Promise.all([
        readContract(config, {
          address: token0,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
        readContract(config, {
          address: token1,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ])

      // Calculate token amounts (raw bigint values)
      const token0AmountRaw = totalSupplyBigInt > 0n
        ? (lpBalanceBigInt * reserve0) / totalSupplyBigInt
        : 0n
      const token1AmountRaw = totalSupplyBigInt > 0n
        ? (lpBalanceBigInt * reserve1) / totalSupplyBigInt
        : 0n

      // Format token amounts with correct decimals
      const token0Amount = formatUnits(token0AmountRaw, decimals0)
      const token1Amount = formatUnits(token1AmountRaw, decimals1)

      // Calculate value in USD (assuming token1 is USDC)
      const token0Formatted = Number(token0Amount)
      const token1Formatted = Number(token1Amount)
      
      // Get price to calculate token0 value
      // Need to format reserves with decimals to get accurate price
      const reserve0Formatted = Number(formatUnits(reserve0, decimals0))
      const reserve1Formatted = Number(formatUnits(reserve1, decimals1))
      const priceCEO = reserve0Formatted > 0 ? reserve1Formatted / reserve0Formatted : 0
      const valueUSD = (token0Formatted * priceCEO + token1Formatted).toString()

      
      return {
        lpBalance: formatUnits(lpBalanceBigInt, 18), // LP tokens typically have 18 decimals
        lpBalanceRaw: lpBalanceBigInt.toString(),
        token0Amount, // Now properly formatted with decimals
        token1Amount, // Now properly formatted with decimals
        share,
        valueUSD,
      }
    },
    enabled: enabled && !!token0 && !!token1 && !!routerAddress && !!userAddress,
    refetchInterval: 10000,
  })
}

// Hook to get swap quote
export function useSwapQuote(
  amountIn: string | undefined,
  tokenIn: Address | undefined,
  tokenOut: Address | undefined,
  routerAddress: Address | undefined,
  enabled: boolean = true,
  slippageTolerance: number = 0.5 // Default 0.5% slippage
) {
  return useQuery({
    queryKey: ['swapQuote', amountIn, tokenIn, tokenOut, routerAddress, slippageTolerance],
    queryFn: async (): Promise<SwapQuote> => {
      if (!amountIn || !tokenIn || !tokenOut || !routerAddress) {
        throw new Error('Missing required parameters for swap quote')
      }

      const amountInNum = parseFloat(amountIn)
      if (isNaN(amountInNum) || amountInNum <= 0) {
        throw new Error('Invalid input amount')
      }

      // Get token decimals
      const [decimalsIn, decimalsOut] = await Promise.all([
        readContract(config, {
          address: tokenIn,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
        readContract(config, {
          address: tokenOut,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ])

      // Convert input amount to raw bigint format
      const amountInRaw = parseUnits(amountIn, decimalsIn)

      // Set swap path
      const path: Address[] = [tokenIn, tokenOut]

      // Get output amount from router
      const amounts = (await readContract(config, {
        address: routerAddress,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountInRaw, path],
      })) as bigint[]

      if (!amounts || amounts.length < 2) {
        throw new Error('Invalid response from router')
      }

      const amountOutRaw = amounts[amounts.length - 1] // Last element is the output amount
      const amountOut = formatUnits(amountOutRaw, decimalsOut)

      // Calculate minimum output with slippage tolerance
      const slippageMultiplier = BigInt(Math.floor((100 - slippageTolerance) * 100))
      const amountOutMinRaw = (amountOutRaw * slippageMultiplier) / 10000n
      const amountOutMin = formatUnits(amountOutMinRaw, decimalsOut)

      // Calculate price impact
      // Get pool reserves to calculate spot price
      const poolAddress = await getPoolAddress(routerAddress, tokenIn, tokenOut)
      let priceImpact = '0'

      if (poolAddress) {
        try {
          const reserves = (await readContract(config, {
            address: poolAddress,
            abi: UNISWAP_V2_PAIR_ABI,
            functionName: 'getReserves',
          })) as [bigint, bigint, number]

          // Determine which reserve is which based on token order in pair
          const pairToken0 = (await readContract(config, {
            address: poolAddress,
            abi: UNISWAP_V2_PAIR_ABI,
            functionName: 'token0',
          })) as Address

          const isTokenInFirst = tokenIn.toLowerCase() === pairToken0.toLowerCase()
          const reserveIn = isTokenInFirst ? reserves[0] : reserves[1]
          const reserveOut = isTokenInFirst ? reserves[1] : reserves[0]

          // Calculate spot price: reserveOut / reserveIn
          // Spot output = amountIn * (reserveOut / reserveIn)
          // But we need to account for decimals
          const reserveInFormatted = Number(formatUnits(reserveIn, decimalsIn))
          const reserveOutFormatted = Number(formatUnits(reserveOut, decimalsOut))

          if (reserveInFormatted > 0) {
            const spotPrice = reserveOutFormatted / reserveInFormatted
            const spotOutput = amountInNum * spotPrice
            const actualOutput = parseFloat(amountOut)

            // Price impact = ((spotOutput - actualOutput) / spotOutput) * 100
            if (spotOutput > 0) {
              const impact = ((spotOutput - actualOutput) / spotOutput) * 100
              priceImpact = Math.max(0, impact).toString() // Ensure non-negative
            }
          }
        } catch (error) {
          console.warn('Could not calculate price impact:', error)
          // Price impact remains '0' if calculation fails
        }
      }

      return {
        amountOut,
        amountOutMin,
        path,
        priceImpact,
      }
    },
    enabled: enabled && !!amountIn && !!tokenIn && !!tokenOut && !!routerAddress && amountIn !== '0' && parseFloat(amountIn) > 0,
    refetchInterval: 5000, // Refetch every 5 seconds for quotes
  })
}

// Hook to execute swap
export function useSwap() {
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()
  const { data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Invalidate queries when transaction is confirmed
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['poolData'] })
      queryClient.invalidateQueries({ queryKey: ['poolPriceData'] })
      queryClient.invalidateQueries({ queryKey: ['userPosition'] })
      queryClient.invalidateQueries({ queryKey: ['swapQuote'] })
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] })
      queryClient.invalidateQueries({ queryKey: ['tokenAllowance'] })
    }
  }, [isSuccess, hash, queryClient])

  const swap = useMutation({
    mutationFn: async (_params: {
      amountIn: string
      amountOutMin: string
      path: Address[]
      to: Address
      deadline: number
      routerAddress: Address
    }) => {
      const { amountIn, amountOutMin, path, to, deadline, routerAddress } = _params

      // Validate inputs
      if (!amountIn || !amountOutMin || !path || path.length < 2 || !to || !routerAddress) {
        throw new Error('Missing required swap parameters')
      }

      const amountInNum = parseFloat(amountIn)
      const amountOutMinNum = parseFloat(amountOutMin)

      if (isNaN(amountInNum) || amountInNum <= 0) {
        throw new Error('Invalid input amount')
      }

      if (isNaN(amountOutMinNum) || amountOutMinNum < 0) {
        throw new Error('Invalid minimum output amount')
      }

      // Get token decimals for both input and output tokens
      const [tokenIn, tokenOut] = [path[0], path[path.length - 1]]
      const [decimalsIn, decimalsOut] = await Promise.all([
        readContract(config, {
          address: tokenIn,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
        readContract(config, {
          address: tokenOut,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ])

      // Convert human-readable amounts to raw bigint format
      const amountInRaw = parseUnits(amountIn, decimalsIn)
      const amountOutMinRaw = parseUnits(amountOutMin, decimalsOut)

      

      // Check token approval - Uniswap router needs approval to spend user's tokens
      // This is a safety check, but the UI should handle approval before calling swap
      const currentAllowance = (await readContract(config, {
        address: tokenIn,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [to, routerAddress],
      })) as bigint

      // If allowance is insufficient, throw a helpful error
      if (currentAllowance < amountInRaw) {
        const allowanceFormatted = formatUnits(currentAllowance, decimalsIn)
        throw new Error(
          `Insufficient token approval. Please approve the router to spend your tokens first. Current allowance: ${allowanceFormatted}, Required: ${amountIn}`
        )
      }

      // Execute the swap transaction with explicit gas settings
      try {
        const txHash = await writeContractAsync({
          address: routerAddress,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [amountInRaw, amountOutMinRaw, path, to, BigInt(deadline)],
          // Let wagmi handle gas estimation automatically
        })

        return txHash
      } catch (error: any) {
        // Provide more helpful error messages
        if (error?.message?.includes('gas')) {
          throw new Error(
            `Gas estimation failed. This might be due to insufficient token approval, insufficient balance, or invalid swap parameters. Please check your token balance and approval.`
          )
        }
        if (error?.message?.includes('revert')) {
          throw new Error(
            `Swap failed: ${error.message}. This might be due to insufficient liquidity, slippage tolerance exceeded, or insufficient token approval.`
          )
        }
        throw error
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh data after swap (immediate feedback)
      queryClient.invalidateQueries({ queryKey: ['poolData'] })
      queryClient.invalidateQueries({ queryKey: ['poolPriceData'] })
      queryClient.invalidateQueries({ queryKey: ['userPosition'] })
      queryClient.invalidateQueries({ queryKey: ['swapQuote'] })
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] })
      queryClient.invalidateQueries({ queryKey: ['tokenAllowance'] })
      // Also refetch immediately for better UX
      queryClient.refetchQueries({ queryKey: ['poolData'] })
      queryClient.refetchQueries({ queryKey: ['poolPriceData'] })
      queryClient.refetchQueries({ queryKey: ['userPosition'] })
      queryClient.refetchQueries({ queryKey: ['tokenBalances'] })
    },
  })

  return {
    swap: swap.mutate,
    swapAsync: swap.mutateAsync,
    isPending: isPending || isConfirming || swap.isPending,
    isSuccess,
    error: error || swap.error,
    hash: hash || swap.data,
  }
}

// Hook to get add liquidity quote
export function useAddLiquidityQuote(
  amount0: string | undefined,
  amount1: string | undefined,
  token0: Address | undefined,
  token1: Address | undefined,
  routerAddress: Address | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['addLiquidityQuote', amount0, amount1, token0, token1, routerAddress],
    queryFn: async (): Promise<AddLiquidityQuote | null> => {
      // Need at least one amount to calculate quote
      if ((!amount0 || amount0 === '0') && (!amount1 || amount1 === '0')) return null
      if (!token0 || !token1 || !routerAddress) return null

      // Get token decimals first
      const [decimals0, decimals1] = await Promise.all([
        readContract(config, {
          address: token0,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
        readContract(config, {
          address: token1,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ])

      const poolAddress = await getPoolAddress(routerAddress, token0, token1)
      
      if (!poolAddress) {
        // New pool - both amounts are required, any ratio works
        if (!amount0 || amount0 === '0' || !amount1 || amount1 === '0') return null
        
        // Convert to raw amounts
        const amount0Raw = parseUnits(amount0, decimals0)
        const amount1Raw = parseUnits(amount1, decimals1)
        const MINIMUM_LIQUIDITY = 1000n // Uniswap V2 minimum liquidity
        
        // Calculate sqrt(amount0 * amount1) using a simple approximation
        // For large numbers, we need a better sqrt calculation
        const product = amount0Raw * amount1Raw
        // Use Babylonian method for better precision with bigints
        let sqrt = product
        if (sqrt > 0n) {
          let x = sqrt
          let y = (x + 1n) / 2n
          while (y < x) {
            x = y
            y = (x + product / x) / 2n
          }
          sqrt = x
        }
        
        const lpTokens = sqrt > MINIMUM_LIQUIDITY ? (sqrt - MINIMUM_LIQUIDITY) : 0n
        
        return {
          amount0,
          amount1,
          lpTokens: formatUnits(lpTokens, 18), // LP tokens have 18 decimals
          share: '100', // First liquidity provider gets 100% initially
        }
      }

      // Existing pool - calculate based on current reserves
      // For existing pools, amounts must be in proportion to maintain price
      const [reserves, totalSupply, pairToken0] = await Promise.all([
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'getReserves',
        }) as Promise<[bigint, bigint, number]>,
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'totalSupply',
        }) as Promise<bigint>,
        readContract(config, {
          address: poolAddress,
          abi: UNISWAP_V2_PAIR_ABI,
          functionName: 'token0',
        }) as Promise<Address>,
      ])

      // Determine which token is which in the pair
      const isToken0First = token0.toLowerCase() === pairToken0.toLowerCase()
      const reserve0 = isToken0First ? reserves[0] : reserves[1]
      const reserve1 = isToken0First ? reserves[1] : reserves[0]

      if (reserve0 === 0n || reserve1 === 0n) {
        // Empty pool - treat as new pool
        if (!amount0 || amount0 === '0' || !amount1 || amount1 === '0') return null
        
        const amount0Raw = parseUnits(amount0, decimals0)
        const amount1Raw = parseUnits(amount1, decimals1)
        const MINIMUM_LIQUIDITY = 1000n
        
        const product = amount0Raw * amount1Raw
        let sqrt = product
        if (sqrt > 0n) {
          let x = sqrt
          let y = (x + 1n) / 2n
          while (y < x) {
            x = y
            y = (x + product / x) / 2n
          }
          sqrt = x
        }
        
        const lpTokens = sqrt > MINIMUM_LIQUIDITY ? (sqrt - MINIMUM_LIQUIDITY) : 0n
        
        return {
          amount0,
          amount1,
          lpTokens: formatUnits(lpTokens, 18),
          share: '100',
        }
      }

      // Calculate optimal amounts based on provided input
      // If amount0 is provided, calculate amount1. If amount1 is provided, calculate amount0.
      // If both are provided, use the smaller ratio (as Uniswap router does)
      let amount0Raw: bigint
      let amount1Raw: bigint

      if (amount0 && amount0 !== '0') {
        amount0Raw = parseUnits(amount0, decimals0)
        // Calculate amount1 from amount0 using the reserve ratio
        // amount1 = (amount0 * reserve1) / reserve0
        amount1Raw = (amount0Raw * reserve1) / reserve0
        
        // If amount1 is also provided, use the smaller ratio (as Uniswap does)
        if (amount1 && amount1 !== '0') {
          const amount1RawFromInput = parseUnits(amount1, decimals1)
          const amount1FromRatio = (amount0Raw * reserve1) / reserve0
          
          // Use the smaller of the two to maintain ratio
          if (amount1RawFromInput < amount1FromRatio) {
            amount1Raw = amount1RawFromInput
            // Recalculate amount0 from amount1
            amount0Raw = (amount1Raw * reserve0) / reserve1
          }
        }
      } else if (amount1 && amount1 !== '0') {
        amount1Raw = parseUnits(amount1, decimals1)
        // Calculate amount0 from amount1 using the reserve ratio
        amount0Raw = (amount1Raw * reserve0) / reserve1
      } else {
        return null
      }

      // Calculate LP tokens: min(amount0/reserve0, amount1/reserve1) * totalSupply
      const lpFrom0 = (amount0Raw * totalSupply) / reserve0
      const lpFrom1 = (amount1Raw * totalSupply) / reserve1
      const lpTokens = lpFrom0 < lpFrom1 ? lpFrom0 : lpFrom1

      // Calculate share
      const newTotalSupply = totalSupply + lpTokens
      const share = newTotalSupply > 0n
        ? (Number((lpTokens * 10000n) / newTotalSupply) / 100).toString()
        : '0'

      return {
        amount0: formatUnits(amount0Raw, decimals0),
        amount1: formatUnits(amount1Raw, decimals1),
        lpTokens: formatUnits(lpTokens, 18), // LP tokens have 18 decimals
        share,
      }
    },
    enabled: enabled && !!token0 && !!token1 && !!routerAddress && ((!!amount0 && amount0 !== '0') || (!!amount1 && amount1 !== '0')),
    refetchInterval: 5000,
  })
}

// Hook to add liquidity
export function useAddLiquidity() {
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()
  const { data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Invalidate queries when transaction is confirmed
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['poolData'] })
      queryClient.invalidateQueries({ queryKey: ['poolPriceData'] })
      queryClient.invalidateQueries({ queryKey: ['userPosition'] })
      queryClient.invalidateQueries({ queryKey: ['addLiquidityQuote'] })
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] })
      queryClient.invalidateQueries({ queryKey: ['tokenAllowance'] })
    }
  }, [isSuccess, hash, queryClient])

  const addLiquidity = useMutation({
    mutationFn: async (_params: {
      token0: Address
      token1: Address
      amount0Desired: string
      amount1Desired: string
      amount0Min: string
      amount1Min: string
      to: Address
      deadline: number
      routerAddress: Address
      ceoAddress?: Address // Optional: CEO token address for better error messages
      usdcAddress?: Address // Optional: USDC token address for better error messages
    }) => {
      const { token0, token1, amount0Desired, amount1Desired, amount0Min, amount1Min, to, deadline, routerAddress, ceoAddress, usdcAddress } = _params

      // Validate inputs
      if (!token0 || !token1 || !amount0Desired || !amount1Desired || !to || !routerAddress) {
        throw new Error('Missing required parameters for add liquidity')
      }

      const amount0DesiredNum = parseFloat(amount0Desired)
      const amount1DesiredNum = parseFloat(amount1Desired)
      const amount0MinNum = parseFloat(amount0Min)
      const amount1MinNum = parseFloat(amount1Min)

      if (isNaN(amount0DesiredNum) || amount0DesiredNum <= 0) {
        throw new Error('Invalid amount0Desired')
      }
      if (isNaN(amount1DesiredNum) || amount1DesiredNum <= 0) {
        throw new Error('Invalid amount1Desired')
      }
      if (isNaN(amount0MinNum) || amount0MinNum < 0) {
        throw new Error('Invalid amount0Min')
      }
      if (isNaN(amount1MinNum) || amount1MinNum < 0) {
        throw new Error('Invalid amount1Min')
      }

      // Identify which token is CEO and which is USDC for better error messages
      const isToken0CEO = ceoAddress && token0.toLowerCase() === ceoAddress.toLowerCase()
      const isToken1CEO = ceoAddress && token1.toLowerCase() === ceoAddress.toLowerCase()
      const isToken0USDC = usdcAddress && token0.toLowerCase() === usdcAddress.toLowerCase()
      const isToken1USDC = usdcAddress && token1.toLowerCase() === usdcAddress.toLowerCase()
      const token0Name = isToken0CEO ? 'CEO' : (isToken0USDC ? 'USDC' : 'Token0')
      const token1Name = isToken1CEO ? 'CEO' : (isToken1USDC ? 'USDC' : 'Token1')

      // Get token decimals
      const [decimals0, decimals1] = await Promise.all([
        readContract(config, {
          address: token0,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
        readContract(config, {
          address: token1,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ])

      // Convert amounts to raw bigint format
      const amount0DesiredRaw = parseUnits(amount0Desired, decimals0)
      const amount1DesiredRaw = parseUnits(amount1Desired, decimals1)
      const amount0MinRaw = parseUnits(amount0Min, decimals0)
      const amount1MinRaw = parseUnits(amount1Min, decimals1)

      // Check token approvals
      const [allowance0, allowance1] = await Promise.all([
        readContract(config, {
          address: token0,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [to, routerAddress],
        }) as Promise<bigint>,
        readContract(config, {
          address: token1,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [to, routerAddress],
        }) as Promise<bigint>,
      ])

      // Format amounts for error messages (use the correct amount for each token)
      const amount0Formatted = formatUnits(amount0DesiredRaw, decimals0)
      const amount1Formatted = formatUnits(amount1DesiredRaw, decimals1)

      // Check if approvals are sufficient with better error messages
      if (allowance0 < amount0DesiredRaw) {
        const allowance0Formatted = formatUnits(allowance0, decimals0)
        throw new Error(
          `Insufficient ${token0Name} approval. Please approve the router to spend your ${token0Name} tokens first. Current allowance: ${allowance0Formatted}, Required: ${amount0Formatted}`
        )
      }

      if (allowance1 < amount1DesiredRaw) {
        const allowance1Formatted = formatUnits(allowance1, decimals1)
        throw new Error(
          `Insufficient ${token1Name} approval. Please approve the router to spend your ${token1Name} tokens first. Current allowance: ${allowance1Formatted}, Required: ${amount1Formatted}`
        )
      }

      // Execute the add liquidity transaction
      try {
        const txHash = await writeContractAsync({
          address: routerAddress,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'addLiquidity',
          args: [
            token0,
            token1,
            amount0DesiredRaw,
            amount1DesiredRaw,
            amount0MinRaw,
            amount1MinRaw,
            to,
            BigInt(deadline),
          ],
        })

        return txHash
      } catch (error: any) {
        // Provide more helpful error messages
        if (error?.message?.includes('gas')) {
          throw new Error(
            `Gas estimation failed. This might be due to insufficient token approval, insufficient balance, or invalid liquidity parameters. Please check your token balances and approvals.`
          )
        }
        if (error?.message?.includes('revert')) {
          throw new Error(
            `Add liquidity failed: ${error.message}. This might be due to insufficient liquidity ratio, slippage tolerance exceeded, or insufficient token approval.`
          )
        }
        throw error
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh data after add liquidity (immediate feedback)
      queryClient.invalidateQueries({ queryKey: ['poolData'] })
      queryClient.invalidateQueries({ queryKey: ['poolPriceData'] })
      queryClient.invalidateQueries({ queryKey: ['userPosition'] })
      queryClient.invalidateQueries({ queryKey: ['addLiquidityQuote'] })
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] })
      queryClient.invalidateQueries({ queryKey: ['tokenAllowance'] })
      // Also refetch immediately for better UX
      queryClient.refetchQueries({ queryKey: ['poolData'] })
      queryClient.refetchQueries({ queryKey: ['poolPriceData'] })
      queryClient.refetchQueries({ queryKey: ['userPosition'] })
      queryClient.refetchQueries({ queryKey: ['tokenBalances'] })
    },
  })

  return {
    addLiquidity: addLiquidity.mutate,
    addLiquidityAsync: addLiquidity.mutateAsync,
    isPending: isPending || isConfirming || addLiquidity.isPending,
    isSuccess,
    error: error || addLiquidity.error,
    hash: hash || addLiquidity.data,
  }
}

// Hook to remove liquidity
export function useRemoveLiquidity() {
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()
  const { data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Invalidate queries when transaction is confirmed
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['poolData'] })
      queryClient.invalidateQueries({ queryKey: ['poolPriceData'] })
      queryClient.invalidateQueries({ queryKey: ['userPosition'] })
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] })
      queryClient.invalidateQueries({ queryKey: ['tokenAllowance'] })
    }
  }, [isSuccess, hash, queryClient])

  const removeLiquidity = useMutation({
    mutationFn: async (_params: {
      token0: Address
      token1: Address
      liquidity: string
      amount0Min: string
      amount1Min: string
      to: Address
      deadline: number
      routerAddress: Address
    }) => {
      const { token0, token1, liquidity, amount0Min, amount1Min, to, deadline, routerAddress } = _params

      // Validate inputs
      if (!token0 || !token1 || !liquidity || !to || !routerAddress) {
        throw new Error('Missing required parameters for remove liquidity')
      }

      const liquidityNum = parseFloat(liquidity)
      const amount0MinNum = parseFloat(amount0Min)
      const amount1MinNum = parseFloat(amount1Min)

      if (isNaN(liquidityNum) || liquidityNum <= 0) {
        throw new Error('Invalid liquidity amount')
      }
      if (isNaN(amount0MinNum) || amount0MinNum < 0) {
        throw new Error('Invalid amount0Min')
      }
      if (isNaN(amount1MinNum) || amount1MinNum < 0) {
        throw new Error('Invalid amount1Min')
      }

      // Get pool address to check LP token address
      const poolAddress = await getPoolAddress(routerAddress, token0, token1)
      if (!poolAddress) {
        throw new Error('Pool does not exist')
      }

      // LP tokens have 18 decimals
      const liquidityRaw = parseUnits(liquidity, 18)

      // Get token decimals for minimum amounts
      const [decimals0, decimals1] = await Promise.all([
        readContract(config, {
          address: token0,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
        readContract(config, {
          address: token1,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ])

      const amount0MinRaw = parseUnits(amount0Min, decimals0)
      const amount1MinRaw = parseUnits(amount1Min, decimals1)

      // Check LP token balance
      const lpTokenBalance = (await readContract(config, {
        address: poolAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [to],
      })) as bigint

      if (lpTokenBalance < liquidityRaw) {
        const balanceFormatted = formatUnits(lpTokenBalance, 18)
        throw new Error(
          `Insufficient LP token balance. Current balance: ${balanceFormatted}, Required: ${liquidity}`
        )
      }

      // Check LP token approval (pool address is the LP token)
      const lpTokenAllowance = (await readContract(config, {
        address: poolAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [to, routerAddress],
      })) as bigint

      if (lpTokenAllowance < liquidityRaw) {
        const allowanceFormatted = formatUnits(lpTokenAllowance, 18)
        throw new Error(
          `Insufficient LP token approval. Please approve the router to spend your LP tokens first. Current allowance: ${allowanceFormatted}, Required: ${liquidity}`
        )
      }

      // Log parameters for debugging
      console.log('Remove Liquidity Hook - Parameters:', {
        token0,
        token1,
        liquidity: liquidity,
        liquidityRaw: liquidityRaw.toString(),
        amount0Min: amount0Min,
        amount0MinRaw: amount0MinRaw.toString(),
        amount1Min: amount1Min,
        amount1MinRaw: amount1MinRaw.toString(),
        to,
        deadline,
        routerAddress,
        poolAddress,
        lpTokenBalance: lpTokenBalance.toString(),
        lpTokenAllowance: lpTokenAllowance.toString(),
      })

      // Simulate the transaction first to catch errors before sending
      // Note: simulateContract may not work in all environments, so we'll catch and continue
      try {
        const simulationResult = await simulateContract(config, {
          address: routerAddress,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'removeLiquidity',
          args: [
            token0,
            token1,
            liquidityRaw,
            amount0MinRaw,
            amount1MinRaw,
            to,
            BigInt(deadline),
          ],
        })
        console.log('Transaction simulation successful', simulationResult)
      } catch (simError: any) {
        console.error('Transaction simulation failed:', {
          simError,
          message: simError?.message,
          cause: simError?.cause,
          data: simError?.data,
          shortMessage: simError?.shortMessage,
        })
        
        // Extract more detailed error information
        const errorMessage = simError?.data?.message || simError?.shortMessage || simError?.message || 'Unknown simulation error'
        
        // Check for specific revert reasons
        if (errorMessage.includes('UniswapV2: INSUFFICIENT_LIQUIDITY_BURNED')) {
          throw new Error('Insufficient liquidity to burn. Please check your LP token balance.')
        }
        if (errorMessage.includes('UniswapV2: INSUFFICIENT_A_AMOUNT') || errorMessage.includes('UniswapV2: INSUFFICIENT_B_AMOUNT')) {
          throw new Error(`Minimum amount too high. The calculated minimum amounts (${amount0Min}, ${amount1Min}) exceed what can be received. Try reducing slippage tolerance or the removal amount.`)
        }
        if (errorMessage.includes('UniswapV2: EXPIRED')) {
          throw new Error('Transaction deadline expired. Please try again.')
        }
        if (errorMessage.includes('UniswapV2: INSUFFICIENT_LIQUIDITY')) {
          throw new Error('Insufficient liquidity in the pool.')
        }
        
        throw new Error(`Transaction simulation failed: ${errorMessage}. Please check your LP token balance, approval, and minimum amounts.`)
      }

      // Execute the remove liquidity transaction
      try {
        const txHash = await writeContractAsync({
          address: routerAddress,
          abi: UNISWAP_V2_ROUTER_ABI,
          functionName: 'removeLiquidity',
          args: [
            token0,
            token1,
            liquidityRaw,
            amount0MinRaw,
            amount1MinRaw,
            to,
            BigInt(deadline),
          ],
        })

        return txHash
      } catch (error: any) {
        // Log the full error for debugging
        console.error('Remove liquidity transaction error:', {
          error,
          message: error?.message,
          cause: error?.cause,
          data: error?.data,
          shortMessage: error?.shortMessage,
        })

        // Provide more helpful error messages
        if (error?.message?.includes('gas') || error?.shortMessage?.includes('gas')) {
          const errorDetails = error?.data?.message || error?.shortMessage || error?.message || 'Unknown error'
          throw new Error(
            `Gas estimation failed: ${errorDetails}. This might be due to insufficient LP token approval, insufficient LP balance, invalid minimum amounts, or token ordering issues. Please check your LP token balance, approval, and ensure minimum amounts are correct.`
          )
        }
        if (error?.message?.includes('revert') || error?.shortMessage?.includes('revert')) {
          const errorDetails = error?.data?.message || error?.shortMessage || error?.message || 'Unknown error'
          throw new Error(
            `Remove liquidity failed: ${errorDetails}. This might be due to insufficient liquidity, slippage tolerance exceeded, or insufficient LP token approval.`
          )
        }
        throw error
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh data after remove liquidity (immediate feedback)
      queryClient.invalidateQueries({ queryKey: ['poolData'] })
      queryClient.invalidateQueries({ queryKey: ['poolPriceData'] })
      queryClient.invalidateQueries({ queryKey: ['userPosition'] })
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] })
      queryClient.invalidateQueries({ queryKey: ['tokenAllowance'] })
      // Also refetch immediately for better UX
      queryClient.refetchQueries({ queryKey: ['poolData'] })
      queryClient.refetchQueries({ queryKey: ['poolPriceData'] })
      queryClient.refetchQueries({ queryKey: ['userPosition'] })
      queryClient.refetchQueries({ queryKey: ['tokenBalances'] })
    },
  })

  return {
    removeLiquidity: removeLiquidity.mutate,
    removeLiquidityAsync: removeLiquidity.mutateAsync,
    isPending: isPending || isConfirming || removeLiquidity.isPending,
    isSuccess,
    error: error || removeLiquidity.error,
    hash: hash || removeLiquidity.data,
  }
}

// Hook to get token balances
export function useTokenBalances(
  token0: Address | undefined,
  token1: Address | undefined,
  userAddress: Address | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tokenBalances', token0, token1, userAddress],
    queryFn: async (): Promise<{ token0: string; token1: string }> => {
      if (!token0 || !token1 || !userAddress) {
        return { token0: '0', token1: '0' }
      }

      const [balance0, balance1, decimals0, decimals1] = await Promise.all([
        readContract(config, {
          address: token0,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [userAddress],
        }) as Promise<bigint>,
        readContract(config, {
          address: token1,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [userAddress],
        }) as Promise<bigint>,
        readContract(config, {
          address: token0,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
        readContract(config, {
          address: token1,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ])

      return {
        token0: formatUnits(balance0, decimals0),
        token1: formatUnits(balance1, decimals1),
      }
    },
    enabled: enabled && !!token0 && !!token1 && !!userAddress,
    refetchInterval: 10000,
  })
}

// Hook to get token allowance
export function useTokenAllowance(
  token: Address | undefined,
  owner: Address | undefined,
  spender: Address | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['tokenAllowance', token, owner, spender],
    queryFn: async (): Promise<string> => {
      if (!token || !owner || !spender) return '0'

      const [allowance, decimals] = await Promise.all([
        readContract(config, {
          address: token,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [owner, spender],
        }) as Promise<bigint>,
        readContract(config, {
          address: token,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }) as Promise<number>,
      ])

      return formatUnits(allowance, decimals)
    },
    enabled: enabled && !!token && !!owner && !!spender,
    refetchInterval: 10000, // Refetch every 10 seconds
  })
}

// Hook to approve tokens
export function useApproveToken() {
  const queryClient = useQueryClient()
  const { writeContractAsync } = useWriteContract()
  const { data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Invalidate queries when transaction is confirmed
  useEffect(() => {
    if (isSuccess && hash) {
      queryClient.invalidateQueries({ queryKey: ['tokenAllowance'] })
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] }) // Balance might change if approving max
    }
  }, [isSuccess, hash, queryClient])

  const approve = useMutation({
    mutationFn: async (_params: {
      token: Address
      spender: Address
      amount: string // Human-readable amount (will overwrite previous approval)
      owner: Address
    }) => {
      const { token, spender, amount, owner } = _params

      if (!token || !spender || !amount || !owner) {
        throw new Error('Missing required approval parameters')
      }

      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid approval amount. Must be a positive number.')
      }

      // Get token decimals
      const decimals = (await readContract(config, {
        address: token,
        abi: ERC20_ABI,
        functionName: 'decimals',
      })) as number

      // Convert amount to raw bigint
      const amountRaw = parseUnits(amount, decimals)

      // Execute approval transaction (this will overwrite any previous approval)
      const txHash = await writeContractAsync({
        address: token,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amountRaw],
      })

      return txHash
    },
    onSuccess: () => {
      // Invalidate allowance queries to refresh (immediate feedback)
      queryClient.invalidateQueries({ queryKey: ['tokenAllowance'] })
      queryClient.invalidateQueries({ queryKey: ['tokenBalances'] })
      // Also refetch immediately for better UX
      queryClient.refetchQueries({ queryKey: ['tokenAllowance'] })
    },
  })

  return {
    approve: approve.mutate,
    approveAsync: approve.mutateAsync,
    isPending: isPending || isConfirming || approve.isPending,
    isSuccess,
    error: error || approve.error,
    hash: hash || approve.data,
  }
}

