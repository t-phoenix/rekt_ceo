import { getBrandProfile } from '../db/brandProfile.js';
import { getProductFeaturesByIds, listProductFeatures } from '../db/productFeatures.js';
import { listPromptMemory } from '../db/promptMemory.js';
import { STRATEGY_PROMPT } from './config.js';

function asList(v) {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
}

export function formatFeatureBlock(feature) {
  if (!feature) return '';
  const lines = [
    `Feature: ${feature.title} [${feature.status}/${feature.category}]`,
    feature.short_description ? `Summary: ${feature.short_description}` : '',
    feature.cta_label && (feature.cta_url || feature.url)
      ? `CTA: ${feature.cta_label} → ${feature.cta_url || feature.url}`
      : (feature.url ? `URL: ${feature.url}` : ''),
  ];
  const dos = asList(feature.do_follow);
  const donts = asList(feature.dont_follow);
  if (dos.length) lines.push(`Do: ${dos.join('; ')}`);
  if (donts.length) lines.push(`Don't: ${donts.join('; ')}`);
  return lines.filter(Boolean).join('\n');
}

/**
 * Compact brand + feature + memory context for LLM prompts.
 */
export async function buildBrandPromptContext({
  featureIds = null,
  stage = null,
  includeMemories = true,
  maxFeatures = 8,
} = {}) {
  const brand = await getBrandProfile();
  const parts = [];

  const voice = brand?.voice || 'savage CT-native';
  const tone = brand?.tone || 'edgy-humor';
  parts.push(`Brand: ${brand?.name || 'Rekt CEO'}${brand?.tagline ? ` — ${brand.tagline}` : ''}`);
  parts.push(`Voice: ${voice}. Tone: ${tone}.`);
  if (Array.isArray(brand?.slogans) && brand.slogans.length) {
    parts.push(`Slogans: ${brand.slogans.join(' / ')}`);
  }

  const dos = asList(brand?.do_list);
  const donts = asList(brand?.dont_list);
  if (dos.length) parts.push(`Brand DO: ${dos.slice(0, 8).join('; ')}`);
  if (donts.length) parts.push(`Brand DON'T: ${donts.slice(0, 8).join('; ')}`);

  if (brand?.website_url) parts.push(`Website: ${brand.website_url}`);
  if (brand?.launch_url) parts.push(`Launch hub: ${brand.launch_url}`);
  if (brand?.meme_gen_url) parts.push(`Meme gen: ${brand.meme_gen_url}`);

  const guidelines = brand?.guidelines || {};
  if (guidelines.audience) parts.push(`Audience: ${guidelines.audience}`);
  if (guidelines.positioning) parts.push(`Positioning: ${String(guidelines.positioning).slice(0, 400)}`);

  let features = [];
  if (Array.isArray(featureIds) && featureIds.length) {
    features = await getProductFeaturesByIds(featureIds);
  } else if (featureIds === undefined) {
    // no selection → nothing extra
  }
  // If empty selection intentionally, skip. Callers pass [] or ids.

  if (features.length) {
    parts.push('', 'Selected product features to weave into this content:');
    for (const f of features.slice(0, maxFeatures)) {
      parts.push(formatFeatureBlock(f));
      parts.push('');
    }
  }

  if (includeMemories && stage) {
    const memories = await listPromptMemory({ stage, acceptedOnly: true, limit: 3 });
    if (memories.length) {
      parts.push('Learned prompt preferences for this stage:');
      for (const m of memories) {
        parts.push(`- ${String(m.edited_prompt || '').slice(0, 400)}`);
      }
    }
  }

  // Always keep core strategy DNA as fallback line
  parts.push('', `Core strategy DNA: ${STRATEGY_PROMPT}`);

  return {
    text: parts.filter(Boolean).join('\n'),
    brand,
    features,
  };
}

/** Convenience: all active features for UI defaults. */
export async function listActiveFeaturesForPicker() {
  return listProductFeatures({ activeOnly: true, limit: 100 });
}
