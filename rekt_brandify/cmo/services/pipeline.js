import { STRATEGY_PROMPT, getCmoConfig } from './config.js';
import { fetchCampaignContextForPrompt } from './campaigns-context.js';
import { buildBrandPromptContext } from './brand-context.js';

function summarizeResearch(research = {}) {
  const parts = [];
  if (research.competition) {
    const c = research.competition;
    parts.push(`Competition: ${(c.competitors || []).join(', ') || 'n/a'}`);
    if (Array.isArray(c.ugc_tactics) && c.ugc_tactics.length) {
      parts.push(`UGC tactics: ${c.ugc_tactics.slice(0, 5).join('; ')}`);
    }
  }
  if (research.trends) {
    const t = typeof research.trends === 'string' ? research.trends : JSON.stringify(research.trends).slice(0, 800);
    parts.push(`Trends: ${t}`);
  }
  if (research.kol) {
    const kols = research.kol.kols || [];
    parts.push(`KOLs: ${kols.map((k) => k.handle || k.error).filter(Boolean).slice(0, 8).join(', ')}`);
  }
  if (research.topics || research.seo_keywords) {
    const kw = research.seo_keywords || research.topics?.seo_keywords || [];
    if (Array.isArray(kw) && kw.length) parts.push(`SEO keywords: ${kw.slice(0, 10).join(', ')}`);
  }
  return parts.join('\n') || 'No research summary available.';
}

/** Build editable auto-prompt for Strategy after Research completes. */
export async function buildStrategyPrompt(researchOutputs = {}, overrides = {}) {
  const campaign = await fetchCampaignContextForPrompt();
  const cfg = getCmoConfig();
  const summary = summarizeResearch(researchOutputs);
  const days = Number(overrides.days || researchOutputs.days || cfg.defaultDays || 7);
  const brandCtx = await buildBrandPromptContext({
    featureIds: overrides.featureIds || researchOutputs.featureIds || null,
    stage: 'strategy',
  });

  const base = [
    brandCtx.text || STRATEGY_PROMPT,
    '',
    `Season: ${campaign.season}`,
    `Hashtags: ${(campaign.hashtags || []).join(' ')}`,
    `Mention: ${campaign.mention}`,
    `Launch: ${cfg.launchUrl}`,
    `Meme gen: ${cfg.memeGenUrl}`,
    '',
    'Research summary:',
    summary,
    '',
    `Produce a ${days}-day engagement calendar as post_ideas (exactly ${days} ideas).`,
    'Each idea needs: title, angle, cta (memes or launch URL), platform (twitter), suggested_day (1..N).',
    'Arc the week: mix meme UGC bait with Launch Hub rituals. Do not ask users to like/comment/share.',
    'When product features are listed above, map some days to drive those CTAs.',
  ].join('\n');

  return overrides.promptEditable || overrides.autoPrompt || base;
}

/** Build per-idea day-package prompts after Strategy completes. */
export async function buildContentPrompts(strategy = {}, researchOutputs = {}, opts = {}) {
  const ideas = Array.isArray(strategy.post_ideas) ? strategy.post_ideas : [];
  const cfg = getCmoConfig();
  const researchBite = summarizeResearch(researchOutputs).slice(0, 500);
  const days = ideas.length || Number(strategy.days) || 7;
  const defaultFeatureIds = opts.featureIds || strategy.featureIds || null;

  const brandCtx = await buildBrandPromptContext({
    featureIds: defaultFeatureIds,
    stage: 'curate',
  });

  return ideas.map((idea, idx) => {
    const title = idea.title || idea.theme || `Post ${idx + 1}`;
    const angle = idea.angle || idea.theme || title;
    const cta = idea.cta || cfg.launchUrl;
    const platform = idea.platform || 'twitter';
    const day = idea.suggested_day || idx + 1;
    const autoPrompt = [
      brandCtx.text || STRATEGY_PROMPT,
      '',
      `DAY ${day} of ${days} — professional content curation for schedule-ready posts.`,
      `Title: ${title}`,
      `Angle: ${angle}`,
      `Platform: ${platform}`,
      `Primary product CTA destination: ${cta}`,
      `Hashtags if natural: ${(strategy.hashtags || ['#RektCEO', '#RektMeme']).join(' ')}`,
      strategy.mention ? `Mention when relevant: ${strategy.mention}` : '',
      strategy.season ? `Season context: ${strategy.season}` : '',
      '',
      'Curate like a senior social editor:',
      '1) BOLD catchy hook (scroll-stop, max ~12 words).',
      '2) Story OR rekt/crypto news take with real value for CT — not empty hype.',
      '3) Close with a product CTA template from the selected feature (never like/share bait).',
      '4) Visual meme concept + template category vibe for brandify.',
      '5) Output must be usable as-is for compose/schedule.',
      '',
      'Research / trends (lean on these):',
      researchBite,
      '',
      'Tone: CT-native, savage humor, professional curator discipline.',
    ].filter(Boolean).join('\n');

    return {
      ideaIndex: idx,
      title,
      platform,
      suggested_day: day,
      autoPrompt,
      promptEditable: autoPrompt,
      idea,
      intensity: 'savage',
      audience: 'ct',
      templateId: null,
      featureIds: Array.isArray(defaultFeatureIds) ? defaultFeatureIds : [],
      stagePrompts: {
        curate: autoPrompt,
        brandify: '',
        caption: '',
        compose: '',
      },
    };
  });
}

/** Fallback post_ideas when Lightreel fails — still research-aware. */
export function buildFallbackPostIdeas({ days = 7, campaign, cfg, researchOutputs }) {
  const summary = summarizeResearch(researchOutputs);
  const hasCompetitorHook = Boolean(researchOutputs?.competition?.competitors?.length);
  const n = Math.max(1, Number(days) || 7);
  return Array.from({ length: n }, (_, i) => {
    const day = i + 1;
    const memeDay = i % 2 === 0;
    return {
      title: memeDay
        ? (hasCompetitorHook ? `Meme counterpunch — day ${day}` : `Meme challenge — day ${day}`)
        : `Launch Hub ritual — day ${day}`,
      angle: memeDay
        ? `Turn timeline noise into a Rekt CEO meme. Context: ${summary.slice(0, 160)}`
        : `Remind the crew the season is live: ${campaign?.season || 'Launch'}. XP > vibes.`,
      cta: memeDay ? cfg.memeGenUrl : cfg.launchUrl,
      platform: 'twitter',
      suggested_day: day,
    };
  });
}

export { summarizeResearch };
