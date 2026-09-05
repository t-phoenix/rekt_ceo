/** Helpers for CMO paid routes: capture payer hint + log failures after x402. */

export function extractPayerHint(req) {
  const header =
    req.get('payment-signature')
    || req.get('x-payment')
    || req.get('X-PAYMENT')
    || req.get('payment-response')
    || '';
  if (!header) return null;
  // Keep a short fingerprint for support — not the full payment payload.
  return String(header).slice(0, 120);
}

export function priceForRoute(envKey, fallback) {
  const n = Number(process.env[envKey] || fallback);
  return Number.isFinite(n) ? n : Number(fallback);
}

/**
 * Estimated AgentCash spend for one day package (ideate + upload + vision + flux + captions).
 * Tunable via CMO_INTERNAL_* envs. User-facing price defaults to 2× this (volume play).
 */
export function estimateDayInternalCostUsd() {
  return (
    Number(process.env.CMO_INTERNAL_LIGHTREEL_USD || '0.06')
    + Number(process.env.CMO_INTERNAL_UPLOAD_USD || '0.01')
    + Number(process.env.CMO_INTERNAL_VISION_USD || '0.03')
    + Number(process.env.CMO_INTERNAL_FLUX_USD || '0.12')
    + Number(process.env.CMO_INTERNAL_CAPTION_USD || '0.08')
  );
}

/** Day package x402 price: override via X402_PRICE_CMO_DAY_PACKAGE, else markup × internal. */
export function dayPackagePriceUsd() {
  if (process.env.X402_PRICE_CMO_DAY_PACKAGE) {
    return priceForRoute('X402_PRICE_CMO_DAY_PACKAGE', '0.60');
  }
  const markup = Number(process.env.CMO_DAY_MARKUP || '2');
  const internal = estimateDayInternalCostUsd();
  const priced = internal * (Number.isFinite(markup) && markup > 0 ? markup : 2);
  return Number(priced.toFixed(2));
}

/** Stage / research standalone markup (default 3×). */
export function stageMarkup() {
  const m = Number(process.env.CMO_STAGE_MARKUP || '3');
  return Number.isFinite(m) && m > 0 ? m : 3;
}

export function stageMarkupPriceUsd(internalUsd, envOverrideKey = null, fallback = null) {
  if (envOverrideKey && process.env[envOverrideKey]) {
    return priceForRoute(envOverrideKey, fallback || String(internalUsd));
  }
  const priced = Number(internalUsd) * stageMarkup();
  return Number(priced.toFixed(2));
}

export function estimateCurateInternalUsd() {
  return Number(process.env.CMO_INTERNAL_LIGHTREEL_USD || '0.06');
}

export function estimateSelectInternalUsd() {
  return Number(process.env.CMO_INTERNAL_SELECT_USD || '0.01');
}

export function estimateBrandifyInternalUsd() {
  return (
    Number(process.env.CMO_INTERNAL_UPLOAD_USD || '0.01')
    + Number(process.env.CMO_INTERNAL_VISION_USD || '0.03')
    + Number(process.env.CMO_INTERNAL_FLUX_USD || '0.12')
  );
}

export function estimateCaptionInternalUsd() {
  return Number(process.env.CMO_INTERNAL_CAPTION_USD || '0.08');
}

export function curatePriceUsd() {
  return stageMarkupPriceUsd(estimateCurateInternalUsd(), 'X402_PRICE_CMO_CURATE', '0.18');
}

export function selectTemplatePriceUsd() {
  return stageMarkupPriceUsd(estimateSelectInternalUsd(), 'X402_PRICE_CMO_SELECT_TEMPLATE', '0.03');
}

export function brandifyStagePriceUsd() {
  return stageMarkupPriceUsd(estimateBrandifyInternalUsd(), 'X402_PRICE_CMO_BRANDIFY', '0.48');
}

/** Vision-only (analyze template → strategy options). Aligns with session start. */
export function brandifyVisionPriceUsd() {
  return stageMarkupPriceUsd(
    Number(process.env.CMO_INTERNAL_UPLOAD_USD || '0.01')
      + Number(process.env.CMO_INTERNAL_VISION_USD || '0.03'),
    'X402_PRICE_CMO_BRANDIFY_VISION',
    '0.19',
  );
}

/** Generate from curated choices. Aligns with /api/generate. */
export function brandifyGeneratePriceUsd() {
  return stageMarkupPriceUsd(
    Number(process.env.CMO_INTERNAL_FLUX_USD || '0.12'),
    'X402_PRICE_CMO_BRANDIFY_GENERATE',
    '0.29',
  );
}

export function captionStagePriceUsd() {
  return stageMarkupPriceUsd(estimateCaptionInternalUsd(), 'X402_PRICE_CMO_CAPTION', '0.24');
}

/** Ordered day content stages (compose is free). */
export const CONTENT_STAGE_ORDER = ['curate', 'select', 'brandify', 'caption', 'compose'];

export function stagePriceByKey(stage) {
  switch (stage) {
    case 'curate':
      return curatePriceUsd();
    case 'select':
    case 'select_template':
      return selectTemplatePriceUsd();
    case 'brandify':
      return brandifyStagePriceUsd();
    case 'caption':
      return captionStagePriceUsd();
    case 'compose':
      return 0;
    default:
      return 0;
  }
}

/**
 * One-shot price to run from `fromStage` through compose (sum of remaining paid stages).
 * Header X-CMO-From-Stage uses: curate|select|brandify|caption|compose
 */
export function stageChainPriceUsd(fromStage = 'curate') {
  const key = String(fromStage || 'curate').toLowerCase().replace('select_template', 'select');
  const start = Math.max(0, CONTENT_STAGE_ORDER.indexOf(key));
  let total = 0;
  for (const stage of CONTENT_STAGE_ORDER.slice(start)) {
    total += stagePriceByKey(stage);
  }
  return Number(total.toFixed(2));
}

export function topicsResearchPriceUsd() {
  return stageMarkupPriceUsd(0.07, 'X402_PRICE_CMO_TOPICS', '0.21');
}

export function socialPulsePriceUsd() {
  return stageMarkupPriceUsd(0.12, 'X402_PRICE_CMO_SOCIAL_PULSE', '0.36');
}

export function newsEventsPriceUsd() {
  return stageMarkupPriceUsd(0.06, 'X402_PRICE_CMO_NEWS_EVENTS', '0.18');
}

export function intelPackPriceUsd() {
  return stageMarkupPriceUsd(0.25, 'X402_PRICE_CMO_INTEL_PACK', '0.75');
}
