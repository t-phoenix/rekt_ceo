import { useMemeApiPayment } from './useMemeApiPayment';

/**
 * x402 payment hook for brandify API — reuses meme payment stack with dynamic step price.
 */
export function useBrandifyPayment(priceLabel = '$0.19') {
  return useMemeApiPayment(priceLabel);
}
