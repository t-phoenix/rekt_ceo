/** Normalize Nexus v2 TokenBalance shape for existing UI components. */

export function normalizeTokenBalance(token) {
  if (!token) return token;

  const breakdown = (token.chainBalances ?? []).map((chainBalance) => ({
    ...chainBalance,
    balance: chainBalance.usableBalance ?? chainBalance.balance,
    balanceInFiat: Number.parseFloat(chainBalance.value ?? "0") || 0,
    contractAddress: chainBalance.contractAddress,
    chain: chainBalance.chain,
  }));

  return {
    ...token,
    balance: token.usableBalance ?? token.balance,
    balanceInFiat: Number.parseFloat(token.value ?? "0") || 0,
    breakdown,
    icon: token.logo,
  };
}

export function normalizeTokenBalances(balances) {
  if (!Array.isArray(balances)) return [];
  return balances.map(normalizeTokenBalance);
}
