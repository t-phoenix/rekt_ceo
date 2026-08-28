/**
 * BrandifyApiService - Client for the rekt_brandify interactive brandification API.
 */

import { MemeApiError, MemeApiErrorCode } from './memeApiErrors';

const DEFAULT_PROD_URL = 'https://rekt-ceo-brandification.onrender.com';

function resolveBrandifyApiBaseUrl() {
  // Local dev: same-origin proxy avoids CORS issues with x402 402 responses.
  if (process.env.NODE_ENV === 'development') {
    return '/brandify-api';
  }
  if (process.env.REACT_APP_BRANDIFY_API_URL) {
    return process.env.REACT_APP_BRANDIFY_API_URL.replace(/\/$/, '');
  }
  return DEFAULT_PROD_URL;
}

const API_BASE_URL = resolveBrandifyApiBaseUrl();

const DEFAULT_PRICES = {
  sessionStart: '$0.19',
  generate: '$0.49',
  rate: '$0.01',
};

class BrandifyApiService {
  get baseUrl() {
    return API_BASE_URL;
  }

  async fetchHealth() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return { online: false, error: `Health check failed (${res.status})` };
      const data = await res.json();
      return { online: true, data };
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        online: false,
        error:
          err?.name === 'AbortError'
            ? 'Brandify API timed out — the server may be waking up.'
            : 'Could not reach the Brandify API.',
      };
    }
  }

  async fetchX402Discovery() {
    try {
      const res = await fetch(`${API_BASE_URL}/.well-known/x402`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  parseDiscoveryPrices(discovery) {
    const endpoints = discovery?.endpoints || [];
    const findPrice = (path) =>
      endpoints.find((e) => e.path === path)?.price || null;

    return {
      sessionStart: findPrice('/api/sessions/start') || DEFAULT_PRICES.sessionStart,
      generate: findPrice('/api/generate') || DEFAULT_PRICES.generate,
      rate: findPrice('/api/sessions/rate') || DEFAULT_PRICES.rate,
    };
  }

  async fetchConnectionStatus() {
    const health = await this.fetchHealth();
    const discovery = health.online ? await this.fetchX402Discovery() : null;
    const prices = this.parseDiscoveryPrices(discovery);
    const paymentActive = Boolean(health.data?.payment?.protocol === 'x402');

    return {
      online: health.online,
      error: health.error || null,
      discovery,
      prices,
      paymentInfo: paymentActive
        ? { protocol: 'x402', ...prices }
        : null,
    };
  }

  async fetchVariations(templateId, { limit = 20, offset = 0 } = {}) {
    if (!templateId) {
      return { templateId: null, total: 0, items: [] };
    }

    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    const res = await fetch(
      `${API_BASE_URL}/api/templates/${encodeURIComponent(templateId)}/variations?${params}`
    );

    if (!res.ok) {
      throw new MemeApiError('Failed to load community variations.', {
        code: MemeApiErrorCode.NETWORK,
        status: res.status,
      });
    }

    return res.json();
  }

  async startSession(file, { customTarget, templateId, category, templateFilename, fetchFn = fetch } = {}) {
    const formData = new FormData();
    formData.append('image', file);
    if (customTarget) formData.append('customTarget', customTarget);
    if (templateId) formData.append('templateId', templateId);
    if (category) formData.append('category', category);
    if (templateFilename) formData.append('templateFilename', templateFilename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const res = await fetchFn(`${API_BASE_URL}/api/sessions/start`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new MemeApiError(errBody.error || `Session start failed (${res.status})`, {
          code: MemeApiErrorCode.NETWORK,
          status: res.status,
        });
      }

      return res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof MemeApiError) throw err;
      if (err?.name === 'AbortError') {
        throw new MemeApiError('Brandify analysis timed out — try again.', {
          code: MemeApiErrorCode.NETWORK,
        });
      }
      throw new MemeApiError(err?.message || 'Failed to start brandify session.', {
        code: MemeApiErrorCode.NETWORK,
      });
    }
  }

  async generateBranded(sessionId, userCuratedChoices, { fetchFn = fetch } = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetchFn(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userCuratedChoices }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new MemeApiError(errBody.error || `Generation failed (${res.status})`, {
          code: MemeApiErrorCode.NETWORK,
          status: res.status,
        });
      }

      return res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof MemeApiError) throw err;
      if (err?.name === 'AbortError') {
        throw new MemeApiError('Brandify generation timed out — try again.', {
          code: MemeApiErrorCode.NETWORK,
        });
      }
      throw new MemeApiError(err?.message || 'Failed to generate branded meme.', {
        code: MemeApiErrorCode.NETWORK,
      });
    }
  }

  async rateSession(sessionId, rating, { fetchFn = fetch } = {}) {
    const res = await fetchFn(`${API_BASE_URL}/api/sessions/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, rating }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new MemeApiError(errBody.error || `Rating failed (${res.status})`, {
        code: MemeApiErrorCode.NETWORK,
        status: res.status,
      });
    }

    return res.json();
  }
}

const brandifyApiService = new BrandifyApiService();
export default brandifyApiService;
