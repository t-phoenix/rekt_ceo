import { useState, useEffect, useCallback, useMemo } from 'react';
import brandifyApiService from '../services/BrandifyApiService';
import { parseUsdcPrice } from './useMemeApiPayment';

/**
 * Loads brandify API health and x402 step pricing from /.well-known/x402.
 */
export function useBrandifyConnection({ enabled = true } = {}) {
  const [status, setStatus] = useState('idle');
  const [prices, setPrices] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const connection = await brandifyApiService.fetchConnectionStatus();
      setPrices(connection.prices);
      setPaymentInfo(connection.paymentInfo);
      setStatus(connection.online ? 'online' : 'offline');
      if (!connection.online) {
        setError(connection.error || 'Brandify API is unreachable.');
      }
    } catch (err) {
      setStatus('offline');
      setPrices(null);
      setPaymentInfo(null);
      setError(err?.message || 'Failed to connect to Brandify API.');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  const totalPriceLabel = useMemo(() => {
    if (!prices) return '$0.69';
    const total =
      parseUsdcPrice(prices.sessionStart) +
      parseUsdcPrice(prices.generate) +
      parseUsdcPrice(prices.rate);
    return `$${total.toFixed(2)}`;
  }, [prices]);

  return {
    status,
    prices,
    paymentInfo,
    totalPriceLabel,
    error,
    isOnline: status === 'online',
    isLoading: status === 'loading',
    refresh: load,
  };
}
