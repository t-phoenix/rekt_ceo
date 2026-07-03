import { useState, useEffect, useCallback } from 'react';
import memeApiService from '../services/MemeApiService';

/**
 * Loads meme API health, x402 payment config, and server-supported LLM presets.
 */
export function useMemeApiConnection({ enabled = true } = {}) {
  const [status, setStatus] = useState('idle'); // idle | loading | online | offline
  const [health, setHealth] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [llmPresets, setLlmPresets] = useState([]);
  const [defaultLlm, setDefaultLlm] = useState('');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const connection = await memeApiService.fetchConnectionStatus();
      setHealth(connection.health);
      setPaymentInfo(connection.paymentInfo);
      setLlmPresets(connection.llmPresets || []);
      setDefaultLlm(connection.defaultLlm || connection.llmPresets?.[0]?.id || '');
      setStatus(connection.online ? 'online' : 'offline');
      if (!connection.online) {
        setError(connection.error || 'Meme API is unreachable.');
      }
    } catch (err) {
      setStatus('offline');
      setHealth(null);
      setPaymentInfo(null);
      setLlmPresets([]);
      setDefaultLlm('');
      setError(err?.message || 'Failed to connect to meme API.');
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  return {
    status,
    health,
    paymentInfo,
    llmPresets,
    defaultLlm,
    error,
    isOnline: status === 'online',
    isLoading: status === 'loading',
    refresh: load,
  };
}
