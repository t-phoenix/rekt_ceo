/**
 * OpenAPI 3.1 discovery document for x402scan / AgentCash agent discovery.
 * Served at GET /openapi.json — does not replace runtime 402 behavior.
 */

import { buildCmoOpenApiPaths, cmoXGuidance } from './openapi-cmo.js';

function fixedPayment(amount) {
  return {
    price: { mode: 'fixed', currency: 'USD', amount: String(amount) },
    protocols: [{ x402: {} }],
  };
}

const strategyElementSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    type: { type: 'string', enum: ['existing', 'new'] },
    reasoning: { type: 'string' },
    ideas: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'type', 'ideas'],
};

const humorTagEnum = [
  'sarcasm', 'casual_roast', 'savage_roast', 'self_deprecation', 'absurdist',
  'deadpan', 'reversal', 'callback', 'wholesome_twist', 'observational', 'inside_baseball',
];

const captionCandidateSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    top_text: { type: 'string' },
    bottom_text: { type: 'string' },
    humor_tag: { type: 'string', enum: humorTagEnum },
    humor_pattern_used: { type: 'string', enum: humorTagEnum },
    intensity: { type: 'string', enum: ['mild', 'medium', 'savage'] },
    memetic_devices: { type: 'array', items: { type: 'string' } },
    ranking_score: { type: 'number', minimum: 0, maximum: 1 },
    scores: {
      type: 'object',
      properties: {
        template_fit: { type: 'number' },
        context_relevance: { type: 'number' },
        surprise: { type: 'number' },
        relatability: { type: 'number' },
        brevity: { type: 'number' },
        originality: { type: 'number' },
      },
    },
    why_funny: { type: 'string' },
    rank: { type: 'integer' },
  },
  required: ['top_text', 'bottom_text', 'ranking_score'],
};

export function buildOpenApiDocument(options = {}) {
  const {
    publicOrigin = process.env.X402_PUBLIC_ORIGIN || 'https://rekt-ceo-brandification.onrender.com',
    contactEmail = process.env.X402_CONTACT_EMAIL || 'team@rektceo.club',
    priceSessionStart = process.env.X402_PRICE_SESSION_START || '0.19',
    priceGenerate = process.env.X402_PRICE_GENERATE || '0.49',
    priceRate = process.env.X402_PRICE_RATE || '0.01',
    priceCaptionSuggest = process.env.X402_PRICE_CAPTION_SUGGEST || '0.10',
    priceCaptionRate = process.env.X402_PRICE_CAPTION_RATE || '0.01',
  } = options;

  return {
    openapi: '3.1.0',
    info: {
      title: 'Rekt CEO Meme Brandifier + CMO Workshop',
      version: '1.1.0',
      description:
        'AI-powered meme brandification, captions, template catalog, and CMO research/content pipelines for Rekt CEO ($CEO). Pay per call with USDC on Base via x402.',
      contact: { email: contactEmail },
      'x-guidance': [
        'Brandify workflow (image brandification) on Base USDC via x402:',
        '1. POST /api/sessions/start — multipart upload with field "image" (required). Returns sessionId, imageUrl, and strategy.elements[].',
        '2. POST /api/generate — JSON body with sessionId and userCuratedChoices [{ element, idea }]. Returns generatedImageUrl.',
        '3. POST /api/sessions/rate — JSON body with sessionId and rating (Like|Dislike|Neutral).',
        'Caption workflow (meme text suggestions):',
        '4. POST /api/captions/suggest — multipart: template_image + context (or topic). Returns top 3 captions from 10 candidates with humor tags and scores.',
        '5. POST /api/captions/rate — JSON: run_id, selected_candidate_id, rating (Like|Dislike|Neutral), optional feedback_text.',
        'Free: GET /api/templates/{templateId}/variations — public community brandified versions.',
        cmoXGuidance(),
        'Pay with USDC on Base (eip155:8453). Send unauthenticated request first to receive HTTP 402 + payment-required header, then retry with x402 payment.',
      ].join('\n'),
    },
    servers: [{ url: publicOrigin.replace(/\/$/, '') }],
    paths: {
      ...buildCmoOpenApiPaths(options),
      '/health': {
        get: {
          operationId: 'healthCheck',
          summary: 'Service health check',
          tags: ['Meta'],
          security: [],
          responses: {
            200: {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      service: { type: 'string' },
                      payment: {
                        type: 'object',
                        nullable: true,
                        properties: {
                          protocol: { type: 'string' },
                          network: { type: 'string' },
                        },
                      },
                    },
                    required: ['status', 'service'],
                  },
                },
              },
            },
          },
        },
      },
      '/api/templates/{templateId}/variations': {
        get: {
          operationId: 'listTemplateVariations',
          summary: 'List public brandified variations for a meme template',
          tags: ['Templates'],
          security: [],
          parameters: [
            {
              name: 'templateId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
            },
            {
              name: 'offset',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 0, default: 0 },
            },
          ],
          responses: {
            200: {
              description: 'Paginated variation list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      templateId: { type: 'string' },
                      total: { type: 'integer' },
                      items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            sessionId: { type: 'string' },
                            generatedImageUrl: { type: 'string', format: 'uri' },
                            originalImageUrl: { type: 'string', format: 'uri' },
                            userRating: { type: 'string' },
                            timestamp: { type: 'string', format: 'date-time' },
                          },
                        },
                      },
                    },
                    required: ['templateId', 'total', 'items'],
                  },
                },
              },
            },
          },
        },
      },
      '/api/sessions/start': {
        post: {
          operationId: 'startBrandifySession',
          summary: 'Upload a meme and get AI Creative Director element analysis',
          tags: ['Brandify'],
          'x-payment-info': fixedPayment(priceSessionStart),
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    image: { type: 'string', format: 'binary', description: 'Meme image file' },
                    customTarget: {
                      type: 'string',
                      description: 'Optional element to prioritize for brandification',
                    },
                    templateId: { type: 'string', description: 'Meme template identifier' },
                    category: { type: 'string', description: 'Meme category name' },
                    templateFilename: { type: 'string', description: 'Original template filename' },
                  },
                  required: ['image'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Session started with vision strategy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      sessionId: { type: 'string', format: 'uuid' },
                      imageUrl: { type: 'string', format: 'uri' },
                      strategy: {
                        type: 'object',
                        properties: {
                          elements: { type: 'array', items: strategyElementSchema },
                        },
                        required: ['elements'],
                      },
                    },
                    required: ['sessionId', 'imageUrl', 'strategy'],
                  },
                },
              },
            },
            402: { description: 'Payment Required' },
            400: { description: 'Missing image or invalid request' },
          },
        },
      },
      '/api/generate': {
        post: {
          operationId: 'generateBrandedMeme',
          summary: 'Generate a branded meme from curated element choices',
          tags: ['Brandify'],
          'x-payment-info': fixedPayment(priceGenerate),
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sessionId: { type: 'string', format: 'uuid' },
                    userCuratedChoices: {
                      type: 'array',
                      minItems: 1,
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
              },
            },
          },
          responses: {
            200: {
              description: 'Branded image generated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      sessionId: { type: 'string', format: 'uuid' },
                      generatedImageUrl: { type: 'string', format: 'uri' },
                      engineUsed: { type: 'string' },
                    },
                    required: ['sessionId', 'generatedImageUrl', 'engineUsed'],
                  },
                },
              },
            },
            402: { description: 'Payment Required' },
            404: { description: 'Session not found' },
          },
        },
      },
      '/api/sessions/rate': {
        post: {
          operationId: 'rateBrandifySession',
          summary: 'Rate a branded meme generation',
          tags: ['Brandify'],
          'x-payment-info': fixedPayment(priceRate),
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sessionId: { type: 'string', format: 'uuid' },
                    rating: { type: 'string', enum: ['Like', 'Dislike', 'Neutral'] },
                  },
                  required: ['sessionId', 'rating'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Rating saved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      session: { type: 'object' },
                    },
                    required: ['success', 'session'],
                  },
                },
              },
            },
            402: { description: 'Payment Required' },
            404: { description: 'Session not found' },
          },
        },
      },
      '/api/captions/suggest': {
        post: {
          operationId: 'suggestMemeCaptions',
          summary: 'Generate top 3 meme captions from template image and context',
          tags: ['Captions'],
          'x-payment-info': fixedPayment(priceCaptionSuggest),
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    template_image: {
                      type: 'string',
                      format: 'binary',
                      description: 'Meme template image file',
                    },
                    context: {
                      type: 'string',
                      description: 'Tweet, one-liner, or topic seed (max 2000 chars)',
                    },
                    topic: {
                      type: 'string',
                      description: 'Alias for context (legacy compatibility)',
                    },
                    context_type: {
                      type: 'string',
                      enum: ['topic', 'tweet', 'headline', 'quote', 'auto'],
                      default: 'auto',
                    },
                    is_twitter_post: {
                      type: 'string',
                      enum: ['true', 'false'],
                      description: 'Hint that context is a tweet',
                    },
                    intensity: {
                      type: 'string',
                      enum: ['mild', 'medium', 'savage'],
                      default: 'medium',
                    },
                    humor_palette: {
                      type: 'string',
                      description: 'Comma-separated humor tags or JSON array',
                    },
                    audience: {
                      type: 'string',
                      enum: ['ct', 'normie', 'mixed'],
                      default: 'ct',
                    },
                    template_id: { type: 'string' },
                    category: { type: 'string' },
                    creator_wallet: { type: 'string' },
                  },
                  required: ['template_image'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Top 3 ranked caption options',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      run_id: { type: 'string', format: 'uuid' },
                      options: {
                        type: 'array',
                        minItems: 1,
                        maxItems: 3,
                        items: captionCandidateSchema,
                      },
                      all_candidates_count: { type: 'integer', default: 10 },
                      metadata: {
                        type: 'object',
                        properties: {
                          run_id: { type: 'string', format: 'uuid' },
                          pipeline_persona: { type: 'array', items: { type: 'string' } },
                          context_type: { type: 'string' },
                          intensity: { type: 'string' },
                          audience: { type: 'string' },
                          humor_palette: { type: 'array', items: { type: 'string' } },
                          template_guess: { type: 'string', nullable: true },
                          llm: { type: 'object' },
                        },
                      },
                    },
                    required: ['run_id', 'options', 'all_candidates_count', 'metadata'],
                  },
                },
              },
            },
            402: { description: 'Payment Required' },
            400: { description: 'Missing template_image or invalid request' },
          },
        },
      },
      '/api/captions/rate': {
        post: {
          operationId: 'rateCaptionRun',
          summary: 'Rate a caption suggestion run',
          tags: ['Captions'],
          'x-payment-info': fixedPayment(priceCaptionRate),
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    run_id: { type: 'string', format: 'uuid' },
                    selected_candidate_id: { type: 'string' },
                    rating: { type: 'string', enum: ['Like', 'Dislike', 'Neutral'] },
                    feedback_text: { type: 'string' },
                    creator_wallet: { type: 'string' },
                  },
                  required: ['run_id', 'rating'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Rating saved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      run_id: { type: 'string', format: 'uuid' },
                      rating: { type: 'string' },
                    },
                    required: ['success', 'run_id', 'rating'],
                  },
                },
              },
            },
            402: { description: 'Payment Required' },
            404: { description: 'Caption run not found' },
          },
        },
      },
    },
  };
}
