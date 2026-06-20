import { useMemo, useCallback } from 'react';
import { useWalletClient, useAccount, useSwitchChain, useChainId } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { toClientEvmSigner } from '@x402/evm';
import { MemeApiError, MemeApiErrorCode } from '../services/memeApiErrors';

const BASE_CHAIN_ID = Number(process.env.REACT_APP_BASE_CHAIN_ID || 8453);
const BASE_RPC = process.env.REACT_APP_BASE_RPC_HTTP_URL || 'https://mainnet.base.org';
const X402_NETWORK = `eip155:${BASE_CHAIN_ID}`;

/**
 * Creates an x402-enabled fetch wrapper using the connected wagmi wallet.
 * Handles 402 → sign USDC payment → retry automatically on Base.
 */
export function useMemeApiPayment() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const isOnBase = chainId === BASE_CHAIN_ID;

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

  return {
    isConnected,
    address,
    chainId,
    isOnBase,
    paidFetch,
    ensureBaseChain,
    isSwitchingChain,
    isPaymentReady: Boolean(paidFetch),
    baseChainId: BASE_CHAIN_ID,
  };
}
