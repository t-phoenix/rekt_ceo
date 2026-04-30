import { ethers } from 'ethers';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { OnchainRule } from '../schemas/campaign-def.schema';

export type RuleEvalResult =
  | { ok: true }
  | { ok: false; code: 'rpc_error' | 'rule_not_met'; message: string };

const providers = new Map<number, ethers.JsonRpcProvider>();

/**
 * Resolve RPC URL for a chain. Convention: RPC_URL_CHAIN_{chainId}; Base mainnet defaults to config.rpcUrl / BASE_RPC_URL.
 */
export function getRpcUrlForChain(chainId: number): string {
  const k = `RPC_URL_CHAIN_${chainId}`;
  const fromEnv = process.env[k]?.trim();
  if (fromEnv) return fromEnv;
  if (chainId === 8453) {
    return process.env.BASE_RPC_URL?.trim() || config.rpcUrl;
  }
  if (chainId === 84532) {
    const s = process.env.RPC_URL_CHAIN_84532?.trim();
    if (s) return s;
  }
  throw new Error(`rpc_not_configured:${chainId}`);
}

function getProvider(chainId: number): ethers.JsonRpcProvider {
  let p = providers.get(chainId);
  if (p) return p;
  const url = getRpcUrlForChain(chainId);
  p = new ethers.JsonRpcProvider(url);
  providers.set(chainId, p);
  return p;
}

const ifaceErc20 = new ethers.Interface([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

const ifaceErc721 = new ethers.Interface([
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
]);

function normAddr(a: string): string {
  return a.toLowerCase();
}

export async function evaluateOnchainRule(
  wallet: string,
  chainId: number,
  rule: OnchainRule,
): Promise<RuleEvalResult> {
  const user = normAddr(wallet);

  try {
    const provider = getProvider(chainId);

    if (rule.kind === 'erc20_min_balance') {
      const c = new ethers.Contract(rule.token, ifaceErc20, provider);
      const [balRaw, decimals] = await Promise.all([
        (c as ethers.Contract).balanceOf(wallet) as Promise<bigint>,
        rule.decimalsOverride != null
          ? Promise.resolve(rule.decimalsOverride)
          : ((c as ethers.Contract).decimals() as Promise<number>),
      ]);

      const dec = Number(decimals);
      const thresholdWei = ethers.parseUnits(rule.thresholdHuman, dec);

      if (balRaw >= thresholdWei) {
        return { ok: true };
      }
      return { ok: false, code: 'rule_not_met', message: `ERC20 balance below threshold (${rule.thresholdHuman})` };
    }

    if (rule.kind === 'erc721_min_balance') {
      const c = new ethers.Contract(rule.contract, ifaceErc721, provider);
      const raw = await (c as ethers.Contract).balanceOf(wallet);
      const bal = typeof raw === 'bigint' ? raw : BigInt(String(raw));

      const min = BigInt(rule.minCount);
      if (bal >= min) {
        return { ok: true };
      }
      return { ok: false, code: 'rule_not_met', message: `NFT count below minimum (${rule.minCount})` };
    }

    if (rule.kind === 'erc721_owner_of') {
      const c = new ethers.Contract(rule.contract, ifaceErc721, provider);
      const tid = BigInt(rule.tokenId);
      const raw = await (c as ethers.Contract).ownerOf(tid);
      const owner = typeof raw === 'string' ? raw : String(raw);
      if (normAddr(owner) === user) {
        return { ok: true };
      }
      return {
        ok: false,
        code: 'rule_not_met',
        message: 'Wallet does not own this token',
      };
    }

    return { ok: false, code: 'rule_not_met', message: 'Unknown rule' };
  } catch (e) {
    logger.warn('onchain verify failed', { chainId, error: (e as Error).message });
    return {
      ok: false,
      code: 'rpc_error',
      message: (e as Error).message || 'RPC evaluation failed',
    };
  }
}
