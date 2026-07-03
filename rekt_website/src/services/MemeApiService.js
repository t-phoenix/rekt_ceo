/**
 * MemeApiService - Client for the meme generation API (LLM picker + x402 payments).
 */

import { MemeApiError, MemeApiErrorCode } from './memeApiErrors';

const DEFAULT_PROD_URL = 'https://rekt-automations.onrender.com';

/**
 * In local dev, use same-origin /api/meme (craco proxy → Render) to avoid CORS.
 * In production, call the meme API directly (requires CORS_ORIGINS on the server).
 */
function resolveMemeApiBaseUrl() {
  if (process.env.REACT_APP_MEME_API_URL) {
    return process.env.REACT_APP_MEME_API_URL.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return '/meme-api';
  }
  return DEFAULT_PROD_URL;
}

const API_BASE_URL = resolveMemeApiBaseUrl();

class MemeApiService {
  get baseUrl() {
    return API_BASE_URL;
  }

  /**
   * Fetch API info including x402 payment metadata when enabled.
   */
  async fetchApiInfo() {
    try {
      const res = await fetch(`${API_BASE_URL}/`);
      if (!res.ok) return { payment: null };
      return res.json();
    } catch {
      return { payment: null };
    }
  }

  /**
   * Combined health + payment + supported LLM presets for the AI Suggest modal.
   */
  async fetchConnectionStatus() {
    let health = null;
    let online = false;
    let connectionError = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const healthRes = await fetch(`${API_BASE_URL}/api/meme/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (healthRes.ok) {
        health = await healthRes.json();
        online = true;
      } else {
        connectionError = `Health check failed (${healthRes.status})`;
      }
    } catch (err) {
      connectionError =
        err?.name === 'TimeoutError'
          ? 'Meme API timed out — the server may be waking up. Try again.'
          : 'Could not reach the meme API.';
    }

    const info = online ? await this.fetchApiInfo() : {};
    let llmPresets = [];
    let defaultLlm = null;

    if (online) {
      try {
        const llms = await this.fetchAvailableLLMs();
        llmPresets = llms.presets || [];
        defaultLlm = llms.default || llms.presets?.[0]?.id || null;
      } catch {
        connectionError = connectionError || 'Connected, but failed to load AI models.';
      }
    }

    return {
      online,
      health,
      paymentInfo: info?.payment || null,
      llmPresets,
      defaultLlm,
      error: connectionError,
    };
  }

  /**
   * Fetch available LLM presets from the server.
   */
  async fetchAvailableLLMs(fetchFn = fetch) {
    const res = await fetchFn(`${API_BASE_URL}/api/meme/llms`);
    if (!res.ok) {
      throw new MemeApiError('Failed to load AI model options.', {
        status: res.status,
        code: MemeApiErrorCode.NETWORK,
      });
    }
    return res.json();
  }

  /**
   * Generate meme text options based on topic and template image.
   * @param {string} topic
   * @param {boolean} isTwitterPost
   * @param {File} templateImage
   * @param {Object} options - { tone, humor_type, llm, llmModel, fetchFn, paymentRequired }
   */
  async generateMemeText(
    topic,
    isTwitterPost = false,
    templateImage,
    options = {}
  ) {
    const {
      tone,
      humor_type: humorType,
      llm,
      llmModel,
      fetchFn = fetch,
      paymentRequired = false,
    } = options;

    if (paymentRequired && fetchFn === fetch) {
      throw new MemeApiError(
        'Connect your wallet on Base to pay for AI meme generation.',
        { code: MemeApiErrorCode.WALLET_REQUIRED, status: 402 }
      );
    }

    const formData = new FormData();
    formData.append('topic', topic);
    formData.append('is_twitter_post', isTwitterPost.toString());
    formData.append('template_image', templateImage);
    if (tone) formData.append('tone', tone);
    if (humorType) formData.append('humor_type', humorType);
    if (llm) formData.append('llm', llm);
    if (llmModel) formData.append('llm_model', llmModel);

    let response;
    try {
      response = await fetchFn(`${API_BASE_URL}/api/meme/generate`, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      if (err instanceof MemeApiError) throw err;
      const isNetworkFailure =
        err?.message?.includes('Failed to fetch') ||
        err?.name === 'TypeError';
      throw new MemeApiError(
        isNetworkFailure
          ? 'Could not reach the meme API. This is often a CORS issue when calling Render directly from localhost — restart the dev server to use the local proxy, or redeploy the meme API with CORS middleware fixed.'
          : err?.message || 'Network error while generating meme text.',
        { code: MemeApiErrorCode.NETWORK }
      );
    }

    if (response.status === 402) {
      throw new MemeApiError(
        'Payment required — connect your wallet on Base to continue.',
        { status: 402, code: MemeApiErrorCode.PAYMENT_REQUIRED }
      );
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : 120000;
      throw new MemeApiError(
        'Rate limited — you can generate again in about 2 minutes.',
        {
          status: 429,
          code: MemeApiErrorCode.RATE_LIMITED,
          retryAfterMs,
        }
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail =
        typeof errorData.detail === 'string'
          ? errorData.detail
          : Array.isArray(errorData.detail)
            ? errorData.detail.map((d) => d.msg || d).join(', ')
            : null;

      if (response.status === 400) {
        throw new MemeApiError(detail || 'Invalid request.', {
          status: 400,
          code: MemeApiErrorCode.VALIDATION,
          detail,
        });
      }

      if (response.status >= 500) {
        throw new MemeApiError('Server error while generating meme text.', {
          status: response.status,
          code: MemeApiErrorCode.SERVER_ERROR,
          detail,
        });
      }

      throw new MemeApiError(detail || `Request failed (${response.status})`, {
        status: response.status,
        detail,
      });
    }

    const data = await response.json();

    if (!data.options || !Array.isArray(data.options) || data.options.length === 0) {
      throw new MemeApiError('Invalid response from meme API — no options returned.', {
        code: MemeApiErrorCode.SERVER_ERROR,
      });
    }

    return {
      options: data.options,
      metadata: data.metadata,
    };
  }

  /**
   * Generate AI-branded meme template (no x402 on this route yet).
   */
  async generateBrandedTemplate(
    templateImage,
    brandName,
    primaryColor,
    userPrompt,
    secondaryColor = null,
    logoImage = null
  ) {
    const formData = new FormData();
    formData.append('template_image', templateImage);
    formData.append('brand_name', brandName);
    formData.append('primary_color', primaryColor);
    formData.append('user_prompt', userPrompt);
    if (secondaryColor) formData.append('secondary_color', secondaryColor);
    if (logoImage) formData.append('logo_image', logoImage);

    const response = await fetch(`${API_BASE_URL}/api/meme/template/brand`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new MemeApiError(errorData.detail || `API request failed (${response.status})`, {
        status: response.status,
      });
    }

    const data = await response.json();
    if (!data.branded_template_base64) {
      throw new MemeApiError('Invalid response format from API');
    }

    return {
      brandedTemplateBase64: data.branded_template_base64,
      metadata: data.metadata,
    };
  }

  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

const memeApiService = new MemeApiService();
export default memeApiService;
