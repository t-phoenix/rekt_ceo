/**
 * Bazaar (x402 v2) discovery extensions for paid routes.
 * Without these, AgentCash/x402scan report SCHEMA_INPUT_MISSING / SCHEMA_OUTPUT_MISSING
 * on live 402 challenges even when OpenAPI is complete.
 */
import { declareDiscoveryExtension } from '@x402/extensions/bazaar';

function jsonDiscovery({ input, inputSchema, outputExample, outputSchema }) {
  return declareDiscoveryExtension({
    bodyType: 'json',
    input,
    inputSchema,
    output: {
      example: outputExample,
      schema: outputSchema || { type: 'object' },
    },
  });
}

function formDiscovery({ input, inputSchema, outputExample, outputSchema }) {
  return declareDiscoveryExtension({
    bodyType: 'form-data',
    input,
    inputSchema,
    output: {
      example: outputExample,
      schema: outputSchema || { type: 'object' },
    },
  });
}

function queryDiscovery({ input, inputSchema, outputExample, outputSchema }) {
  return declareDiscoveryExtension({
    input,
    inputSchema,
    output: {
      example: outputExample,
      schema: outputSchema || { type: 'object' },
    },
  });
}

const successData = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { type: 'object' },
  },
};

/** @type {Record<string, object>} */
export const BAZAAR_BY_ROUTE = {
  'POST /api/sessions/start': formDiscovery({
    input: { image: '<binary>', templateId: 'drake', category: 'Classic' },
    inputSchema: {
      properties: {
        image: { type: 'string', format: 'binary', description: 'Meme image file' },
        customTarget: { type: 'string' },
        templateId: { type: 'string' },
        category: { type: 'string' },
        templateFilename: { type: 'string' },
      },
      required: ['image'],
    },
    outputExample: {
      sessionId: '00000000-0000-4000-8000-000000000001',
      imageUrl: 'https://example.com/upload.png',
      strategy: { elements: [{ name: 'logo', type: 'existing', ideas: ['swap for Rekt CEO'] }] },
    },
    outputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        imageUrl: { type: 'string' },
        strategy: { type: 'object' },
      },
    },
  }),

  'POST /api/generate': jsonDiscovery({
    input: {
      sessionId: '00000000-0000-4000-8000-000000000001',
      userCuratedChoices: [{ element: 'logo', idea: 'replace with Rekt CEO logo' }],
    },
    inputSchema: {
      properties: {
        sessionId: { type: 'string', format: 'uuid' },
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
      required: ['sessionId', 'userCuratedChoices'],
    },
    outputExample: {
      sessionId: '00000000-0000-4000-8000-000000000001',
      generatedImageUrl: 'https://example.com/out.png',
      engineUsed: 'flux',
    },
    outputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        generatedImageUrl: { type: 'string' },
        engineUsed: { type: 'string' },
      },
    },
  }),

  'POST /api/sessions/rate': jsonDiscovery({
    input: { sessionId: '00000000-0000-4000-8000-000000000001', rating: 'Like' },
    inputSchema: {
      properties: {
        sessionId: { type: 'string' },
        rating: { type: 'string', enum: ['Like', 'Dislike', 'Neutral'] },
      },
      required: ['sessionId', 'rating'],
    },
    outputExample: { success: true, session: { id: '00000000-0000-4000-8000-000000000001' } },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        session: { type: 'object' },
      },
    },
  }),

  'POST /api/captions/suggest': formDiscovery({
    input: { template_image: '<binary>', context: 'CEO token dumping' },
    inputSchema: {
      properties: {
        template_image: { type: 'string', format: 'binary' },
        context: { type: 'string' },
        topic: { type: 'string' },
      },
      required: ['template_image'],
    },
    outputExample: {
      run_id: 'cap_1',
      options: [{ top_text: 'WHEN', bottom_text: 'REKT', ranking_score: 0.9 }],
    },
    outputSchema: {
      type: 'object',
      properties: {
        run_id: { type: 'string' },
        options: { type: 'array' },
      },
    },
  }),

  'POST /api/captions/rate': jsonDiscovery({
    input: { run_id: 'cap_1', rating: 'Like', selected_candidate_id: '1' },
    inputSchema: {
      properties: {
        run_id: { type: 'string' },
        rating: { type: 'string', enum: ['Like', 'Dislike', 'Neutral'] },
        selected_candidate_id: { type: 'string' },
        feedback_text: { type: 'string' },
      },
      required: ['run_id', 'rating'],
    },
    outputExample: { success: true, run_id: 'cap_1', rating: 'Like' },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        run_id: { type: 'string' },
        rating: { type: 'string' },
      },
    },
  }),

  'GET /api/templates': queryDiscovery({
    input: { category: 'Classic', limit: '20' },
    inputSchema: {
      properties: {
        category: { type: 'string' },
        q: { type: 'string' },
        limit: { type: 'string' },
        offset: { type: 'string' },
      },
    },
    outputExample: { total: 1, items: [{ id: 'drake', name: 'Drake', category: 'Classic' }] },
    outputSchema: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        items: { type: 'array' },
      },
    },
  }),

  'GET /api/templates/:templateId': queryDiscovery({
    input: {},
    inputSchema: { properties: {} },
    outputExample: { id: 'drake', name: 'Drake', category: 'Classic' },
    outputSchema: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
  }),

  'GET /api/templates/:templateId/image': queryDiscovery({
    input: {},
    inputSchema: { properties: {} },
    outputExample: { contentType: 'image/jpeg' },
    outputSchema: { type: 'object' },
  }),
};

const researchBody = {
  properties: {
    topic: { type: 'string' },
    niche: { type: 'string' },
    brand: { type: 'string' },
    handles: { type: 'array', items: { type: 'string' } },
  },
};

const researchRoutes = [
  ['POST /api/cmo/research/competition', { handles: ['@example'], depth: 'basic' }, { ...researchBody, required: ['handles'] }],
  ['POST /api/cmo/research/kol', { handles: ['@kol'], niche: 'crypto' }, researchBody],
  ['POST /api/cmo/research/trends', { topic: 'memecoins', niche: 'crypto' }, researchBody],
  ['POST /api/cmo/research/content-draft', { topic: 'launch day', platform: 'x' }, { properties: { topic: { type: 'string' }, platform: { type: 'string' } }, required: ['topic'] }],
  ['POST /api/cmo/research/brand-mentions', { brand: 'Rekt CEO' }, { properties: { brand: { type: 'string' } } }],
  ['POST /api/cmo/research/kol-opportunities', { limit: 10 }, { properties: { limit: { type: 'integer' } } }],
  ['POST /api/cmo/research/topics', { topic: 'CEO token', niche: 'crypto' }, researchBody],
  ['POST /api/cmo/research/social-pulse', { topic: 'CEO', handles: ['@rektceo'] }, researchBody],
  ['POST /api/cmo/research/news-events', { topic: 'memecoins' }, researchBody],
  ['POST /api/cmo/research/intel-pack', { topic: 'CEO', niche: 'crypto' }, researchBody],
  ['POST /api/cmo/strategy/campaign-brief', { days: 7, focus: 'launch' }, { properties: { days: { type: 'integer' }, focus: { type: 'string' }, prompt: { type: 'string' } } }],
  ['POST /api/cmo/content/day-package', { pipelineId: '00000000-0000-4000-8000-000000000002', ideaIndex: 0 }, { properties: { pipelineId: { type: 'string' }, ideaIndex: { type: 'integer' }, prompt: { type: 'string' } }, required: ['pipelineId'] }],
  ['POST /api/cmo/content/batch-package', { pipelineId: '00000000-0000-4000-8000-000000000002', ideaIndexes: [0, 1] }, { properties: { pipelineId: { type: 'string' }, ideaIndexes: { type: 'array', items: { type: 'integer' } } }, required: ['pipelineId'] }],
  ['POST /api/cmo/content/curate', { pipelineId: '00000000-0000-4000-8000-000000000002', ideaIndex: 0 }, { properties: { pipelineId: { type: 'string' }, ideaIndex: { type: 'integer' }, prompt: { type: 'string' } }, required: ['pipelineId'] }],
  ['POST /api/cmo/content/select-template', { pipelineId: '00000000-0000-4000-8000-000000000002', ideaIndex: 0 }, { properties: { pipelineId: { type: 'string' }, ideaIndex: { type: 'integer' } }, required: ['pipelineId'] }],
  ['POST /api/cmo/content/brandify', { pipelineId: '00000000-0000-4000-8000-000000000002', ideaIndex: 0, templateId: 'drake' }, { properties: { pipelineId: { type: 'string' }, ideaIndex: { type: 'integer' }, templateId: { type: 'string' } }, required: ['pipelineId'] }],
  ['POST /api/cmo/content/brandify-vision', { pipelineId: '00000000-0000-4000-8000-000000000002', ideaIndex: 0, templateId: 'drake' }, { properties: { pipelineId: { type: 'string' }, templateId: { type: 'string' } }, required: ['pipelineId'] }],
  ['POST /api/cmo/content/brandify-generate', { pipelineId: '00000000-0000-4000-8000-000000000002', ideaIndex: 0, userCuratedChoices: [{ element: 'logo', idea: 'Rekt' }] }, { properties: { pipelineId: { type: 'string' }, userCuratedChoices: { type: 'array' } }, required: ['pipelineId', 'userCuratedChoices'] }],
  ['POST /api/cmo/content/caption', { pipelineId: '00000000-0000-4000-8000-000000000002', ideaIndex: 0, context: 'launch' }, { properties: { pipelineId: { type: 'string' }, context: { type: 'string' } }, required: ['pipelineId'] }],
  ['POST /api/cmo/content/run-from-stage', { pipelineId: '00000000-0000-4000-8000-000000000002', ideaIndex: 0 }, { properties: { pipelineId: { type: 'string' }, ideaIndex: { type: 'integer' } }, required: ['pipelineId'] }],
  ['POST /api/cmo/brand/analyze', { websiteUrl: 'https://rektceo.club' }, { properties: { websiteUrl: { type: 'string', format: 'uri' } }, required: ['websiteUrl'] }],
  ['POST /api/cmo/features/enrich', { featureId: '00000000-0000-4000-8000-000000000003', url: 'https://example.com/feature' }, { properties: { featureId: { type: 'string' }, url: { type: 'string' } }, required: ['url'] }],
];

for (const [route, input, inputSchema] of researchRoutes) {
  BAZAAR_BY_ROUTE[route] = jsonDiscovery({
    input,
    inputSchema,
    outputExample: { success: true, data: {} },
    outputSchema: successData,
  });
}

/**
 * Attach bazaar discovery extension onto a payment route config entry.
 * @param {string} routeKey e.g. "POST /api/generate"
 * @param {object} routeConfig
 */
export function withBazaar(routeKey, routeConfig) {
  const bazaar = BAZAAR_BY_ROUTE[routeKey];
  if (!bazaar) return routeConfig;
  return {
    ...routeConfig,
    mimeType: routeConfig.mimeType || 'application/json',
    extensions: {
      ...(routeConfig.extensions || {}),
      ...bazaar,
    },
  };
}

/** Apply bazaar extensions to every known paid route in a config map. */
export function applyBazaarExtensions(routeMap) {
  const out = {};
  for (const [key, value] of Object.entries(routeMap)) {
    out[key] = withBazaar(key, value);
  }
  return out;
}
