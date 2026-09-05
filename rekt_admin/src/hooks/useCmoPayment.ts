import { useMemo, useCallback } from 'react'
import { useWalletClient, useAccount, useSwitchChain, useChainId, useReadContract } from 'wagmi'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { wrapFetchWithPayment, x402Client } from '@x402/fetch'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { toClientEvmSigner } from '@x402/evm'

const BASE_CHAIN_ID = 8453
const BASE_RPC = import.meta.env.VITE_BASE_RPC_HTTP_URL || 'https://mainnet.base.org'
const USDC_ADDRESS =
  import.meta.env.VITE_BASE_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const X402_NETWORK = `eip155:${BASE_CHAIN_ID}`

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const CMO_PRICES = {
  competition: Number(import.meta.env.VITE_CMO_PRICE_COMPETITION || '0.25'),
  kol: Number(import.meta.env.VITE_CMO_PRICE_KOL || '0.15'),
  trends: Number(import.meta.env.VITE_CMO_PRICE_TRENDS || '0.06'),
  contentDraft: Number(import.meta.env.VITE_CMO_PRICE_CONTENT_DRAFT || '0.05'),
  campaignBrief: Number(import.meta.env.VITE_CMO_PRICE_CAMPAIGN_BRIEF || '0.10'),
  brandMentions: Number(import.meta.env.VITE_CMO_PRICE_BRAND_MENTIONS || '0.08'),
  kolOpps: Number(import.meta.env.VITE_CMO_PRICE_KOL_OPPS || '0.12'),
  dayPackage: Number(import.meta.env.VITE_CMO_PRICE_DAY_PACKAGE || '0.60'),
  topics: Number(import.meta.env.VITE_CMO_PRICE_TOPICS || '0.21'),
  socialPulse: Number(import.meta.env.VITE_CMO_PRICE_SOCIAL_PULSE || '0.36'),
  newsEvents: Number(import.meta.env.VITE_CMO_PRICE_NEWS_EVENTS || '0.18'),
  intelPack: Number(import.meta.env.VITE_CMO_PRICE_INTEL_PACK || '0.75'),
  brandAnalyze: Number(import.meta.env.VITE_CMO_PRICE_BRAND_ANALYZE || '0.45'),
  featureEnrich: Number(import.meta.env.VITE_CMO_PRICE_FEATURE_ENRICH || '0.18'),
  curate: Number(import.meta.env.VITE_CMO_PRICE_CURATE || '0.18'),
  selectTemplate: Number(import.meta.env.VITE_CMO_PRICE_SELECT_TEMPLATE || '0.03'),
  brandify: Number(import.meta.env.VITE_CMO_PRICE_BRANDIFY || '0.48'),
  brandifyVision: Number(import.meta.env.VITE_CMO_PRICE_BRANDIFY_VISION || '0.19'),
  brandifyGenerate: Number(import.meta.env.VITE_CMO_PRICE_BRANDIFY_GENERATE || '0.29'),
  caption: Number(import.meta.env.VITE_CMO_PRICE_CAPTION || '0.24'),
} as const

export type CmoPaidAction = keyof typeof CMO_PRICES

export function formatUsd(n: number) {
  return `$${n.toFixed(2)}`
}

/**
 * x402-enabled fetch for CMO Workshop paid research (USDC on Base).
 * Reuses the admin Wagmi / Web3Modal wallet connection.
 */
export function useCmoPayment() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain()
  const isOnBase = chainId === BASE_CHAIN_ID

  const { data: usdcBalanceRaw, isLoading: isBalanceLoading, refetch: refetchUsdcBalance } =
    useReadContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: ERC20_BALANCE_ABI,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
      chainId: BASE_CHAIN_ID,
      query: { enabled: Boolean(isConnected && address && isOnBase) },
    })

  const usdcBalance = useMemo(() => {
    if (usdcBalanceRaw === undefined) return null
    return Number(formatUnits(usdcBalanceRaw, 6))
  }, [usdcBalanceRaw])

  const paidFetch = useMemo(() => {
    if (!walletClient || !isConnected) return null

    const publicClient = createPublicClient({
      chain: base,
      transport: http(BASE_RPC),
    })

    const signer = toClientEvmSigner(
      {
        address: walletClient.account.address,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signTypedData: (typedData: any) =>
          walletClient.signTypedData({
            account: walletClient.account,
            domain: typedData.domain,
            types: typedData.types,
            primaryType: typedData.primaryType,
            message: typedData.message,
          }),
      },
      publicClient,
    )

    const client = new x402Client()
    registerExactEvmScheme(client, {
      signer,
      networks: [X402_NETWORK],
    })

    return wrapFetchWithPayment(fetch, client)
  }, [walletClient, isConnected])

  const ensureBaseChain = useCallback(async () => {
    if (!isConnected || !walletClient) {
      throw new Error('Connect your wallet to pay for CMO research (USDC on Base).')
    }
    if (chainId !== BASE_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: BASE_CHAIN_ID })
      } catch (err) {
        throw new Error(
          err instanceof Error
            ? `Switch to Base network to pay with USDC. (${err.message})`
            : 'Switch to Base network to pay with USDC.',
        )
      }
    }
  }, [isConnected, walletClient, chainId, switchChainAsync])

  const ensurePaymentReady = useCallback(
    async (requiredUsd: number) => {
      await ensureBaseChain()
      const result = await refetchUsdcBalance()
      const balanceRaw = result?.data
      if (balanceRaw !== undefined) {
        const balance = Number(formatUnits(balanceRaw, 6))
        if (balance < requiredUsd - 0.000001) {
          throw new Error(
            `Insufficient USDC on Base. Need at least $${requiredUsd.toFixed(2)} (you have $${balance.toFixed(2)}).`,
          )
        }
      }
    },
    [ensureBaseChain, refetchUsdcBalance],
  )

  return {
    isConnected,
    address,
    shortAddress: address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null,
    chainId,
    isOnBase,
    usdcBalance,
    isBalanceLoading,
    paidFetch,
    ensureBaseChain,
    ensurePaymentReady,
    isSwitchingChain,
    isPaymentReady: Boolean(paidFetch),
    baseChainId: BASE_CHAIN_ID,
    refetchUsdcBalance,
    prices: CMO_PRICES,
  }
}
