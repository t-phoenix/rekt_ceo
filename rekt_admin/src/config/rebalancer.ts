/** Sol–Base rebalancer / arb bot HTTP API (separate from main REKT admin API). */
export const REBALANCER_BASE_URL =
  import.meta.env.VITE_REBALANCER_URL ?? 'https://rekt-token-rebalancer.onrender.com'
