import { ethers } from 'ethers';
import { config } from '../config';
import { campaignService } from './campaign.service';
import { logger } from '../utils/logger';

const USDC_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const USDC_DECIMALS = 6;

/**
 * Identity + on-chain eligibility service.
 *
 * Today this is a thin façade that:
 *   - calls Base RPC for USDC balance (proxy for "$10 on Base")
 *   - persists link state for X / Discord / Telegram / Solana via Redis
 *   - exposes simple "manual link" endpoints suitable for early access
 *
 * The verification adapters (twitterapi.io reads, Discord bot, Telegram bot)
 * will plug into this service later via `markLinked` after verification.
 */
class IdentityService {
  private baseProviderCache: ethers.JsonRpcProvider | null = null;

  private getBaseProvider() {
    if (this.baseProviderCache) return this.baseProviderCache;
    const baseRpcUrl = process.env.BASE_RPC_URL || config.rpcUrl;
    this.baseProviderCache = new ethers.JsonRpcProvider(baseRpcUrl);
    return this.baseProviderCache;
  }

  async refreshBaseBalance(address: string) {
    const threshold = Number(process.env.BASE_BALANCE_THRESHOLD_USD || 10);
    try {
      const provider = this.getBaseProvider();

      const erc20Iface = new ethers.Interface([
        'function balanceOf(address) view returns (uint256)',
      ]);

      const usdc = new ethers.Contract(USDC_BASE, erc20Iface, provider);
      const [usdcRaw, ethRaw] = await Promise.all([
        usdc.balanceOf(address).catch(() => BigInt(0)),
        provider.getBalance(address).catch(() => BigInt(0)),
      ]);

      const usdcUsd = Number(usdcRaw) / 10 ** USDC_DECIMALS;
      const ethPrice = Number(process.env.ETH_PRICE_USD_FALLBACK || 3000);
      const ethUsd = Number(ethers.formatEther(ethRaw)) * ethPrice;
      const totalUsd = usdcUsd + ethUsd;

      const result = await campaignService.setBaseBalanceState(address, totalUsd, threshold);
      return { ...result, threshold };
    } catch (error) {
      logger.warn('Base balance refresh failed', { error: (error as Error).message });
      const result = await campaignService.setBaseBalanceState(address, 0, threshold);
      return { ...result, threshold, error: 'rpc_unavailable' };
    }
  }

  async markLinked(
    address: string,
    provider: 'x' | 'discord' | 'telegram' | 'solana',
    handle: string,
  ) {
    const identity = await campaignService.getIdentity(address);
    const wasLinked =
      provider === 'x'
        ? !!identity.xLinked
        : provider === 'discord'
          ? !!identity.discordLinked
          : provider === 'telegram'
            ? !!identity.telegramLinked
            : !!identity.solanaLinked;

    const handles = { ...identity.handles, [provider]: handle };
    const patch: Record<string, any> = { handles };

    if (provider === 'x') patch.xLinked = true;
    if (provider === 'discord') patch.discordLinked = true;
    if (provider === 'telegram') patch.telegramLinked = true;
    if (provider === 'solana') patch.solanaLinked = true;

    const out = await campaignService.setIdentityField(address, patch);
    if (!wasLinked) {
      void campaignService.awardAccountLinkXpIfNew(address, provider);
    }
    return out;
  }

  async unlink(address: string, provider: 'x' | 'discord' | 'telegram' | 'solana') {
    const identity = await campaignService.getIdentity(address);
    const handles = { ...identity.handles, [provider]: null };
    const patch: Record<string, any> = { handles };

    if (provider === 'x') patch.xLinked = false;
    if (provider === 'discord') patch.discordLinked = false;
    if (provider === 'telegram') patch.telegramLinked = false;
    if (provider === 'solana') patch.solanaLinked = false;

    return campaignService.setIdentityField(address, patch);
  }
}

export const identityService = new IdentityService();
