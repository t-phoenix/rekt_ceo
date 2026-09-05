/**
 * CMO + template paid paths for OpenAPI discovery (merged into openapi.js).
 */
import {
  curatePriceUsd,
  selectTemplatePriceUsd,
  brandifyStagePriceUsd,
  brandifyVisionPriceUsd,
  brandifyGeneratePriceUsd,
  captionStagePriceUsd,
  topicsResearchPriceUsd,
  socialPulsePriceUsd,
  newsEventsPriceUsd,
  intelPackPriceUsd,
  dayPackagePriceUsd,
} from '../cmo/services/paid-run.js';

function fixedPayment(amount) {
  return {
    price: { mode: 'fixed', currency: 'USD', amount: String(amount) },
    protocols: [{ x402: {} }],
  };
}

function paidPost(operationId, summary, tags, price, bodySchema, responseSchema) {
  return {
    post: {
      operationId,
      summary,
      tags,
      'x-payment-info': fixedPayment(price),
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: bodySchema,
          },
        },
      },
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: responseSchema || {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'object' },
                },
                required: ['success', 'data'],
              },
            },
          },
        },
        402: { description: 'Payment Required' },
        400: { description: 'Invalid request' },
        500: { description: 'Upstream or processing error' },
      },
    },
  };
}

const pipelineDayBody = {
  type: 'object',
  properties: {
    pipelineId: { type: 'string', format: 'uuid' },
    ideaIndex: { type: 'integer', minimum: 0 },
    prompt: { type: 'string' },
    intensity: { type: 'string', enum: ['mild', 'medium', 'savage'] },
    audience: { type: 'string', enum: ['ct', 'normie', 'mixed'] },
    templateId: { type: 'string', nullable: true },
    ideate: { type: 'object' },
    imageUrl: { type: 'string' },
    context: { type: 'string' },
  },
  required: ['pipelineId'],
};

export function buildCmoOpenApiPaths(options = {}) {
  const priceCompetition = options.priceCompetition || process.env.X402_PRICE_CMO_COMPETITION || '0.25';
  const priceKol = options.priceKol || process.env.X402_PRICE_CMO_KOL || '0.15';
  const priceTrends = options.priceTrends || process.env.X402_PRICE_CMO_TRENDS || '0.06';
  const priceDraft = options.priceDraft || process.env.X402_PRICE_CMO_CONTENT_DRAFT || '0.05';
  const priceMentions = options.priceMentions || process.env.X402_PRICE_CMO_BRAND_MENTIONS || '0.08';
  const priceKolOpps = options.priceKolOpps || process.env.X402_PRICE_CMO_KOL_OPPS || '0.12';
  const priceBrief = options.priceBrief || process.env.X402_PRICE_CMO_CAMPAIGN_BRIEF || '0.10';
  const priceTplList = options.priceTplList || process.env.X402_PRICE_TEMPLATES_LIST || '0.01';
  const priceTplDetail = options.priceTplDetail || process.env.X402_PRICE_TEMPLATES_DETAIL || '0.01';
  const priceTplImage = options.priceTplImage || process.env.X402_PRICE_TEMPLATES_IMAGE || '0.02';

  const dayPrice = String(dayPackagePriceUsd().toFixed(2));

  return {
    '/api/templates': {
      get: {
        operationId: 'listTemplates',
        summary: 'List meme templates from Brandify catalog',
        tags: ['Templates'],
        'x-payment-info': fixedPayment(priceTplList),
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'offset', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Template catalog',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    categories: { type: 'array', items: { type: 'string' } },
                    items: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          402: { description: 'Payment Required' },
        },
      },
    },
    '/api/templates/{templateId}': {
      get: {
        operationId: 'getTemplate',
        summary: 'Get meme template metadata',
        tags: ['Templates'],
        'x-payment-info': fixedPayment(priceTplDetail),
        parameters: [
          { name: 'templateId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Template metadata', content: { 'application/json': { schema: { type: 'object' } } } },
          402: { description: 'Payment Required' },
          404: { description: 'Not found' },
        },
      },
    },
    '/api/templates/{templateId}/image': {
      get: {
        operationId: 'getTemplateImage',
        summary: 'Download meme template image',
        tags: ['Templates'],
        'x-payment-info': fixedPayment(priceTplImage),
        parameters: [
          { name: 'templateId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Image bytes', content: { 'image/*': { schema: { type: 'string', format: 'binary' } } } },
          402: { description: 'Payment Required' },
        },
      },
    },
    '/api/cmo/research/competition': paidPost(
      'cmoCompetition',
      'Competition intelligence playbook',
      ['CMO Research'],
      priceCompetition,
      {
        type: 'object',
        properties: {
          handles: { type: 'array', items: { type: 'string' } },
          include_reddit: { type: 'boolean' },
          depth: { type: 'string', enum: ['basic', 'deep'] },
        },
        required: ['handles'],
      },
    ),
    '/api/cmo/research/kol': paidPost(
      'cmoKol',
      'KOL discovery and engagement plan',
      ['CMO Research'],
      priceKol,
      {
        type: 'object',
        properties: {
          handles: { type: 'array', items: { type: 'string' } },
          niche: { type: 'string' },
        },
        required: ['handles'],
      },
    ),
    '/api/cmo/research/trends': paidPost(
      'cmoTrends',
      'Social trends via Lightreel',
      ['CMO Research'],
      priceTrends,
      {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          niche: { type: 'string' },
        },
      },
    ),
    '/api/cmo/research/content-draft': paidPost(
      'cmoContentDraft',
      'Engagement-optimized social post draft',
      ['CMO Research'],
      priceDraft,
      {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          platform: { type: 'string' },
          prompt: { type: 'string' },
        },
      },
    ),
    '/api/cmo/research/brand-mentions': paidPost(
      'cmoBrandMentions',
      'Brand mention scan',
      ['CMO Research'],
      priceMentions,
      { type: 'object', properties: { brand: { type: 'string' } } },
    ),
    '/api/cmo/research/kol-opportunities': paidPost(
      'cmoKolOpportunities',
      'KOL engagement opportunities from watchlist',
      ['CMO Research'],
      priceKolOpps,
      { type: 'object', properties: { limit: { type: 'integer' } } },
    ),
    '/api/cmo/research/topics': paidPost(
      'cmoResearchTopics',
      'Topics + SEO/GEO keyword packs',
      ['CMO Research'],
      topicsResearchPriceUsd().toFixed(2),
      {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          niche: { type: 'string' },
          brand: { type: 'string' },
        },
      },
    ),
    '/api/cmo/research/social-pulse': paidPost(
      'cmoSocialPulse',
      'Twitter + Reddit + optional LinkedIn pulse',
      ['CMO Research'],
      socialPulsePriceUsd().toFixed(2),
      {
        type: 'object',
        properties: {
          handles: { type: 'array', items: { type: 'string' } },
          topic: { type: 'string' },
          redditQuery: { type: 'string' },
          linkedinUrls: { type: 'array', items: { type: 'string' } },
          linkedinCompanyUrls: { type: 'array', items: { type: 'string' } },
        },
      },
    ),
    '/api/cmo/research/news-events': paidPost(
      'cmoNewsEvents',
      'News, events, and research references',
      ['CMO Research'],
      newsEventsPriceUsd().toFixed(2),
      {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          query: { type: 'string' },
          topics: { type: 'array', items: { type: 'object' } },
        },
      },
    ),
    '/api/cmo/research/intel-pack': paidPost(
      'cmoIntelPack',
      'One-shot research intel pack',
      ['CMO Research'],
      intelPackPriceUsd().toFixed(2),
      {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          niche: { type: 'string' },
          brand: { type: 'string' },
          handles: { type: 'array', items: { type: 'string' } },
          linkedinUrls: { type: 'array', items: { type: 'string' } },
        },
      },
    ),
    '/api/cmo/strategy/campaign-brief': paidPost(
      'cmoCampaignBrief',
      'N-day campaign brief with calendar assist',
      ['CMO Strategy'],
      priceBrief,
      {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1 },
          focus: { type: 'string' },
          research_context: { type: 'object' },
          prompt: { type: 'string' },
        },
      },
    ),
    '/api/cmo/content/day-package': paidPost(
      'cmoDayPackage',
      'Full day package: curate + brandify + caption',
      ['CMO Content'],
      dayPrice,
      pipelineDayBody,
    ),
    '/api/cmo/content/batch-package': {
      post: {
        operationId: 'cmoBatchPackage',
        summary: 'Batch day packages (send X-CMO-Day-Count for dynamic price)',
        tags: ['CMO Content'],
        'x-payment-info': {
          price: { mode: 'dynamic', currency: 'USD', amount: dayPrice, note: 'Multiply by X-CMO-Day-Count' },
          protocols: [{ x402: {} }],
        },
        parameters: [
          {
            name: 'X-CMO-Day-Count',
            in: 'header',
            required: true,
            schema: { type: 'integer', minimum: 1 },
            description: 'Number of days being processed (must match ideaIndexes length)',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pipelineId: { type: 'string', format: 'uuid' },
                  ideaIndexes: { type: 'array', items: { type: 'integer' } },
                  prompts: { type: 'object' },
                  onlyIdle: { type: 'boolean' },
                },
                required: ['pipelineId'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Batch results',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          402: { description: 'Payment Required' },
        },
      },
    },
    '/api/cmo/content/curate': paidPost(
      'cmoCurate',
      'Curate research-aware social copy for one day',
      ['CMO Content'],
      curatePriceUsd().toFixed(2),
      pipelineDayBody,
    ),
    '/api/cmo/content/select-template': paidPost(
      'cmoSelectTemplate',
      'Select meme template from curated ideate',
      ['CMO Content'],
      selectTemplatePriceUsd().toFixed(2),
      pipelineDayBody,
    ),
    '/api/cmo/content/brandify': paidPost(
      'cmoBrandify',
      'Brandify selected meme template',
      ['CMO Content'],
      brandifyStagePriceUsd().toFixed(2),
      pipelineDayBody,
    ),
    '/api/cmo/content/brandify-vision': paidPost(
      'cmoBrandifyVision',
      'Analyze meme template and return branding options',
      ['CMO Content'],
      brandifyVisionPriceUsd().toFixed(2),
      {
        type: 'object',
        properties: {
          pipelineId: { type: 'string', format: 'uuid' },
          ideaIndex: { type: 'integer', minimum: 0 },
          templateId: { type: 'string' },
        },
        required: ['pipelineId'],
      },
    ),
    '/api/cmo/content/brandify-generate': paidPost(
      'cmoBrandifyGenerate',
      'Generate branded meme from curated element choices',
      ['CMO Content'],
      brandifyGeneratePriceUsd().toFixed(2),
      {
        type: 'object',
        properties: {
          pipelineId: { type: 'string', format: 'uuid' },
          ideaIndex: { type: 'integer', minimum: 0 },
          userCuratedChoices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                element: { type: 'string' },
                idea: { type: 'string' },
              },
              required: ['element', 'idea'],
            },
          },
        },
        required: ['pipelineId', 'userCuratedChoices'],
      },
    ),
    '/api/cmo/content/caption': paidPost(
      'cmoCaption',
      'Caption branded meme image',
      ['CMO Content'],
      captionStagePriceUsd().toFixed(2),
      pipelineDayBody,
    ),
    '/api/cmo/content/run-from-stage': paidPost(
      'cmoRunFromStage',
      'Pay once and run remaining day stages (send X-CMO-From-Stage)',
      ['CMO Content'],
      curatePriceUsd().toFixed(2),
      pipelineDayBody,
    ),
    '/api/cmo/brand/analyze': paidPost(
      'cmoBrandAnalyze',
      'Brand-agency analysis from website URL',
      ['CMO Brand'],
      process.env.X402_PRICE_CMO_BRAND_ANALYZE || '0.45',
      {
        type: 'object',
        properties: {
          websiteUrl: { type: 'string', format: 'uri' },
        },
        required: ['websiteUrl'],
      },
    ),
    '/api/cmo/features/enrich': paidPost(
      'cmoFeatureEnrich',
      'Enrich a product feature from its URL',
      ['CMO Brand'],
      process.env.X402_PRICE_CMO_FEATURE_ENRICH || '0.18',
      {
        type: 'object',
        properties: {
          featureId: { type: 'string' },
          url: { type: 'string', format: 'uri' },
        },
        required: ['url'],
      },
    ),
  };
}

export function cmoXGuidance() {
  return [
    'CMO research → strategy → content workflow (Base USDC x402):',
    'A. POST /api/cmo/research/intel-pack (or topics / social-pulse / news-events) for SEO/GEO keywords, social, news.',
    'B. POST /api/cmo/strategy/campaign-brief with research_context → post_ideas[].',
    'C. Either POST /api/cmo/content/day-package (2× bundle) OR stages: curate → select-template → brandify (or brandify-vision → brandify-generate) → caption.',
    'D. Batch: POST /api/cmo/content/batch-package with header X-CMO-Day-Count = number of days.',
    'E. Brand studio: POST /api/cmo/brand/analyze, POST /api/cmo/features/enrich.',
    'Template catalog: GET /api/templates (paid). Free: GET /api/templates/{id}/variations.',
    'Admin compose/schedule routes require x-admin-key and are not public paid listings.',
    'Retry after 402 with x402 payment. Do not double-pay stage retries blindly — stages upsert by suggested_day.',
  ].join('\n');
}
