import { useMemo, useCallback } from 'react';
import { useWalletClient, useAccount, useSwitchChain, useChainId, useReadContract } from 'wagmi';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { toClientEvmSigner } from '@x402/evm';
import { MemeApiError, MemeApiErrorCode } from '../services/memeApiErrors';

const BASE_CHAIN_ID = Number(process.env.REACT_APP_BASE_CHAIN_ID || 8453);
const BASE_RPC = process.env.REACT_APP_BASE_RPC_HTTP_URL || 'https://mainnet.base.org';
const USDC_ADDRESS =
  process.env.REACT_APP_BASE_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const X402_NETWORK = `eip155:${BASE_CHAIN_ID}`;

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

export function parseUsdcPrice(priceLabel = '$0.05') {
  const numeric = Number(String(priceLabel).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0.05;
}

/**
 * x402-enabled fetch + USDC balance checks for AI Suggest payments on Base.
 */
export function useMemeApiPayment(priceLabel = '$0.05') {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const priceUsdc = parseUsdcPrice(priceLabel);
  const isOnBase = chainId === BASE_CHAIN_ID;

  const { data: usdcBalanceRaw, isLoading: isBalanceLoading, refetch: refetchUsdcBalance } =
    useReadContract({
      address: USDC_ADDRESS,
      abi: ERC20_BALANCE_ABI,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
      chainId: BASE_CHAIN_ID,
      query: { enabled: Boolean(isConnected && address && isOnBase) },
    });

  const usdcBalance = useMemo(() => {
    if (usdcBalanceRaw === undefined) return null;
    return Number(formatUnits(usdcBalanceRaw, 6));
  }, [usdcBalanceRaw]);

  const hasSufficientUsdc =
    usdcBalance === null ? null : usdcBalance >= priceUsdc - 0.000001;

  const paidFetch = useMemo(() => {
    if (!walletClient || !isConnected) return null;

    const publicClient = createPublicClient({
      chain: base,
      transport: http(BASE_RPC),
    });

    const signer = toClientEvmSigner(
      {
        address: walletClient.account.address,
        signTypedData: (typedData) =>
          walletClient.signTypedData({
            account: walletClient.account,
            domain: typedData.domain,
            types: typedData.types,
            primaryType: typedData.primaryType,
            message: typedData.message,
          }),
      },
      publicClient
    );

    const client = new x402Client();
    registerExactEvmScheme(client, {
      signer,
      networks: [X402_NETWORK],
    });

    return wrapFetchWithPayment(fetch, client);
  }, [walletClient, isConnected]);

  const ensureBaseChain = useCallback(async () => {
    if (!isConnected || !walletClient) {
      throw new MemeApiError('Connect your wallet to pay for AI meme generation.', {
        code: MemeApiErrorCode.WALLET_REQUIRED,
      });
    }

    if (chainId !== BASE_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      } catch (err) {
        throw new MemeApiError('Please switch to Base network to pay with USDC.', {
          code: MemeApiErrorCode.WRONG_CHAIN,
          detail: err?.message,
        });
      }
    }
  }, [isConnected, walletClient, chainId, switchChainAsync]);

  const ensurePaymentReady = useCallback(async () => {
    await ensureBaseChain();
    const result = await refetchUsdcBalance();
    const balanceRaw = result?.data;

    if (balanceRaw !== undefined) {
      const balance = Number(formatUnits(balanceRaw, 6));
      if (balance < priceUsdc - 0.000001) {
        throw new MemeApiError(
          `Insufficient USDC on Base. You need at least ${priceLabel} to generate.`,
          { code: MemeApiErrorCode.PAYMENT_FAILED }
        );
      }
      return;
    }

    if (hasSufficientUsdc === false) {
      throw new MemeApiError(
        `Insufficient USDC on Base. You need at least ${priceLabel} to generate.`,
        { code: MemeApiErrorCode.PAYMENT_FAILED }
      );
    }
  }, [ensureBaseChain, refetchUsdcBalance, hasSufficientUsdc, priceLabel, priceUsdc]);

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return {
    isConnected,
    address,
    shortAddress,
    chainId,
    isOnBase,
    usdcBalance,
    isBalanceLoading,
    hasSufficientUsdc,
    priceUsdc,
    paidFetch,
    ensureBaseChain,
    ensurePaymentReady,
    isSwitchingChain,
    isPaymentReady: Boolean(paidFetch),
    baseChainId: BASE_CHAIN_ID,
    refetchUsdcBalance,
  };
}
