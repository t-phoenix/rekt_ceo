import { HUMOR_TAGS } from '../constants/caption.js';

const HUMOR_TAG_LIST = HUMOR_TAGS.join(', ');

export const TEMPLATE_DECODE_SYSTEM = `You are "The Template Whisperer" — a meme format archaeologist for crypto Twitter (CT).
Decode the visual grammar of meme templates: panel roles, typical setup/punchline zones, and caption style.
Return ONLY valid JSON.`;

export function buildTemplateDecodeUserPrompt({ category, templateId }) {
  const hint = category
    ? `Known category hint: "${category}".`
    : templateId
      ? `Template catalog id: "${templateId}".`
      : '';

  return `Analyze this meme template image. ${hint}
Return JSON:
{
  "template_guess": "human-readable template name",
  "format": "two_panel_comparison | reaction | multi_panel | single_panel | other",
  "zones": [
    { "id": "top", "role": "what this zone typically represents", "typical_tone": "negative|positive|neutral" }
  ],
  "visual_hooks": ["notable visual elements"],
  "caption_style_hint": "brief guidance on length and tone for captions"
}`;
}

export const CONTEXT_EXTRACT_SYSTEM = `You are "The Context Vulture" — you scavenge punchline seeds from tweets, headlines, and one-liners for meme writers.
Extract hooks, entities, and angles. Return ONLY valid JSON.`;

export function buildContextExtractUserPrompt({ context, contextType, audience }) {
  return `Parse this user context for meme caption writing.
context_type: ${contextType}
audience: ${audience}
context:
"""
${context}
"""

Return JSON:
{
  "core_hook": "the main joke seed in one sentence",
  "entities": ["key nouns/people/tokens"],
  "sentiment": "bullish|bearish|skeptical|ironic|neutral|chaotic",
  "tweet_meta": { "is_reply_bait": false, "has_handles": false },
  "suggested_angles": ["angle 1", "angle 2", "angle 3"]
}`;
}

export const CAPTION_STORM_SYSTEM = `You are "The Caption Goblin" — an unhinged meme writer for Rekt CEO ($CEO) crypto culture.
Write SHORT meme captions (3-10 words per line). Every caption must fit the template zones and user context.
Humor must feel native to CT — not corporate, not generic "wen moon" spam.
Return ONLY valid JSON.`;

export function buildCaptionStormUserPrompt({
  templateDecode,
  contextExtract,
  intensity,
  humorPalette,
  audience,
  count = 10,
}) {
  const palette = humorPalette?.length
    ? humorPalette.join(', ')
    : `diverse mix across: ${HUMOR_TAG_LIST}`;

  return `Generate exactly ${count} meme caption options.

TEMPLATE DECODE:
${JSON.stringify(templateDecode, null, 2)}

CONTEXT EXTRACT:
${JSON.stringify(contextExtract, null, 2)}

CONSTRAINTS:
- intensity cap: ${intensity}
- preferred humor_palette: ${palette}
- audience: ${audience}
- Use top_text and bottom_text (empty string if single-panel)
- Each caption needs a unique humor_tag from: ${HUMOR_TAG_LIST}
- Vary humor_tag across candidates — no duplicates unless palette forces it

Return JSON:
{
  "candidates": [
    {
      "id": "cand_01",
      "top_text": "...",
      "bottom_text": "...",
      "humor_tag": "reversal",
      "intensity": "medium",
      "memetic_devices": ["callback", "exaggeration"],
      "alignment_note": "why this maps to template zones"
    }
  ]
}`;
}

export const JUDGE_SYSTEM = `You are "The Judge Judy of CT" — a ruthless meme critic.
Score each caption 0.0-1.0 on: template_fit, context_relevance, surprise, relatability, brevity, originality.
Penalize generic crypto clichés. Crown the funniest with honest why_funny one-liners.
Return ONLY valid JSON.`;

export function buildJudgeUserPrompt({ templateDecode, contextExtract, candidates }) {
  return `Rank these meme caption candidates. Score ALL of them.

TEMPLATE:
${JSON.stringify(templateDecode, null, 2)}

CONTEXT:
${JSON.stringify(contextExtract, null, 2)}

CANDIDATES:
${JSON.stringify(candidates, null, 2)}

Return JSON:
{
  "ranked": [
    {
      "id": "cand_01",
      "scores": {
        "template_fit": 0.9,
        "context_relevance": 0.85,
        "surprise": 0.8,
        "relatability": 0.75,
        "brevity": 0.95,
        "originality": 0.7
      },
      "ranking_score": 0.84,
      "rank": 1,
      "why_funny": "one line explaining the joke"
    }
  ]
}`;
}
