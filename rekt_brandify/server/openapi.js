/**
 * OpenAPI 3.1 discovery document for x402scan / AgentCash agent discovery.
 * Served at GET /openapi.json — does not replace runtime 402 behavior.
 */

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

export function buildOpenApiDocument(options = {}) {
  const {
    publicOrigin = process.env.X402_PUBLIC_ORIGIN || 'https://rekt-ceo-brandification.onrender.com',
    contactEmail = process.env.X402_CONTACT_EMAIL || 'team@rektceo.club',
    priceSessionStart = process.env.X402_PRICE_SESSION_START || '0.19',
    priceGenerate = process.env.X402_PRICE_GENERATE || '0.49',
    priceRate = process.env.X402_PRICE_RATE || '0.01',
  } = options;

  return {
    openapi: '3.1.0',
    info: {
      title: 'Rekt CEO Meme Brandifier',
      version: '1.0.0',
      description:
        'AI-powered meme template brandification for the Rekt CEO ($CEO) crypto brand. Upload a meme, get creative direction, generate branded versions, and rate results.',
      contact: { email: contactEmail },
      'x-guidance': [
        'Three-step paid workflow on Base USDC via x402:',
        '1. POST /api/sessions/start — multipart upload with field "image" (required). Returns sessionId, imageUrl, and strategy.elements[].',
        '2. POST /api/generate — JSON body with sessionId and userCuratedChoices [{ element, idea }]. Returns generatedImageUrl.',
        '3. POST /api/sessions/rate — JSON body with sessionId and rating (Like|Dislike|Neutral).',
        'Free: GET /api/templates/{templateId}/variations — public community brandified versions.',
        'Pay with USDC on Base (eip155:8453). Send unauthenticated request first to receive HTTP 402 + payment-required header, then retry with x402 payment.',
      ].join('\n'),
    },
    servers: [{ url: publicOrigin.replace(/\/$/, '') }],
    paths: {
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
    },
  };
}
