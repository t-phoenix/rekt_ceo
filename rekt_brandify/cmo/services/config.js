export function getCmoConfig() {
  return {
    strategyMode: process.env.CMO_STRATEGY_MODE || 'campaign',
    campaignsApiUrl: process.env.CAMPAIGNS_API_URL || 'http://localhost:4047',
    launchUrl: process.env.CMO_LAUNCH_URL || 'https://rektceo.com/launch',
    memeGenUrl: process.env.CMO_MEME_GEN_URL || 'https://rektceo.com/memes',
    defaultDays: Number(process.env.CMO_DEFAULT_DAYS || '7'),
    xReadProvider: process.env.X_READ_PROVIDER || 'agentcash',
    monthlyBudgetUsd: Number(process.env.CMO_MONTHLY_AGENTCASH_BUDGET_USD || '50'),
    walletLowUsd: Number(process.env.CMO_WALLET_LOW_BALANCE_USD || '5'),
    walletCriticalUsd: Number(process.env.CMO_WALLET_CRITICAL_BALANCE_USD || '1'),
    competitionCacheTtlHours: Number(process.env.COMPETITION_CACHE_TTL_HOURS || '6'),
    kolTierAHours: Number(process.env.KOL_TIER_A_INTERVAL_HOURS || '6'),
    kolTierBHours: Number(process.env.KOL_TIER_B_INTERVAL_HOURS || '24'),
  };
}

export const STRATEGY_PROMPT =
  'Optimize for maximum engagement and user-generated Rekt CEO memes. ' +
  'Drive users to make memes at rektceo.com/memes, share on X with campaign hashtags, ' +
  'connect wallet at /launch, and complete Launch Hub missions for XP. ' +
  'Tone: CT-native, savage-humor, never corporate.';

export const STABLE_ENRICH = 'https://stableenrich.dev';
export const STABLE_SOCIAL = 'https://stablesocial.dev';
