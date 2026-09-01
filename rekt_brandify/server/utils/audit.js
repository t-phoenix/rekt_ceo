const ROUTE_PRICES = {
  'POST /api/sessions/start': process.env.X402_PRICE_SESSION_START || '0.19',
  'POST /api/generate': process.env.X402_PRICE_GENERATE || '0.49',
  'POST /api/sessions/rate': process.env.X402_PRICE_RATE || '0.01',
  'POST /api/captions/suggest': process.env.X402_PRICE_CAPTION_SUGGEST || '0.10',
  'POST /api/captions/rate': process.env.X402_PRICE_CAPTION_RATE || '0.01',
};

/**
 * Extract x402 payment metadata from an Express request (after middleware verification).
 */
export function capturePaymentMeta(req, routeKey) {
  const paymentHeader =
    req.get('payment-signature')
    || req.get('x-payment')
    || req.get('X-PAYMENT')
    || null;

  return {
    route: routeKey,
    price_usd: ROUTE_PRICES[routeKey] || null,
    payment_header_present: Boolean(paymentHeader),
    payment_header: paymentHeader ? String(paymentHeader).slice(0, 2000) : null,
    captured_at: new Date().toISOString(),
  };
}

/** Sanitize request bodies for audit log (strip binary / large fields). */
export function summarizeRequestBody(body, { maxString = 2000 } = {}) {
  if (!body || typeof body !== 'object') return {};

  const out = {};
  for (const [key, value] of Object.entries(body)) {
    if (value == null) {
      out[key] = value;
      continue;
    }
    if (typeof value === 'string') {
      out[key] = value.length > maxString ? `${value.slice(0, maxString)}…` : value;
      continue;
    }
    if (Array.isArray(value) || typeof value === 'object') {
      try {
        const serialized = JSON.stringify(value);
        out[key] = serialized.length > maxString
          ? JSON.parse(`${serialized.slice(0, maxString)}`)
          : value;
      } catch {
        out[key] = '[unserializable]';
      }
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Truncate response payloads for audit log storage. */
export function summarizeResponseBody(body, { maxString = 4000 } = {}) {
  if (body == null) return null;
  try {
    const serialized = typeof body === 'string' ? body : JSON.stringify(body);
    if (serialized.length <= maxString) {
      return typeof body === 'string' ? { message: body } : body;
    }
    return { truncated: true, preview: serialized.slice(0, maxString) };
  } catch {
    return { truncated: true, preview: String(body).slice(0, maxString) };
  }
}

export function summarizeMultipartFields(body) {
  if (!body || typeof body !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string' && value.length > 500) {
      out[key] = `${value.slice(0, 500)}…`;
    } else {
      out[key] = value;
    }
  }
  return out;
}
