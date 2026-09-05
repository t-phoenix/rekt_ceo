import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import { isPgEnabled, getPool } from './db/pg.js';
import apiRoutes from './routes/api.js';
import discoveryRoute from './x402-discovery.js';
import { buildOpenApiDocument } from './openapi.js';
import {
  dayPackagePriceUsd,
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
  stageChainPriceUsd,
} from '../cmo/services/paid-run.js';
import { applyBazaarExtensions } from './x402-bazaar.js';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FAVICON_PATH = path.join(__dirname, '..', 'public', 'favicon.ico');

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';
const USES_X402_ORG = FACILITATOR_URL.includes('x402.org');

function usesCdpFacilitator() {
  return FACILITATOR_URL.includes('cdp.coinbase.com')
    || Boolean(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET);
}

export function resolveX402NetworkId() {
  const configured = (process.env.X402_NETWORK || '').toLowerCase();
  if (USES_X402_ORG && !usesCdpFacilitator()) {
    return 'eip155:84532';
  }
  if (configured === 'base-sepolia' || configured === 'base_sepolia') {
    return 'eip155:84532';
  }
  return 'eip155:8453';
}

function createFacilitatorClient() {
  if (usesCdpFacilitator()) {
    if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
      throw new Error(
        'CDP facilitator requires CDP_API_KEY_ID and CDP_API_KEY_SECRET on the server.'
      );
    }
    return createCdpFacilitatorClient({
      baseUrl: FACILITATOR_URL.includes('cdp.coinbase.com') ? FACILITATOR_URL : undefined,
    });
  }
  return new HTTPFacilitatorClient({ url: FACILITATOR_URL });
}

export function getPaymentRouteConfig(networkId) {
  // Day package = 2× estimated AgentCash internal cost (volume play); override with X402_PRICE_CMO_DAY_PACKAGE.
  const dayUnit = () => `$${dayPackagePriceUsd().toFixed(2)}`;
  const batchPrice = (context) => {
    const header = context?.adapter?.getHeader?.('x-cmo-day-count')
      || context?.adapter?.getHeader?.('X-CMO-Day-Count');
    let n = Number(header);
    if (!Number.isFinite(n) || n < 1) {
      try {
        const url = context?.adapter?.getUrl?.() || '';
        const q = new URL(url, 'http://localhost').searchParams.get('days');
        n = Number(q);
      } catch {
        n = 1;
      }
    }
    if (!Number.isFinite(n) || n < 1) n = 1;
    return `$${(n * dayPackagePriceUsd()).toFixed(2)}`;
  };
  const fromStagePrice = (context) => {
    const header = context?.adapter?.getHeader?.('x-cmo-from-stage')
      || context?.adapter?.getHeader?.('X-CMO-From-Stage')
      || 'curate';
    return `$${stageChainPriceUsd(header).toFixed(2)}`;
  };

  return applyBazaarExtensions({
    'POST /api/sessions/start': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_SESSION_START || '0.19'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Upload a meme template and get AI Creative Director analysis',
    },
    'POST /api/generate': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_GENERATE || '0.49'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Generate a branded meme using Flux 2 Pro AI inpainting',
    },
    'POST /api/sessions/rate': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_RATE || '0.01'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Rate a branded meme generation (Like/Dislike/Neutral)',
    },
    'POST /api/captions/suggest': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_CAPTION_SUGGEST || '0.10'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Generate top 3 meme captions from template image + context',
    },
    'POST /api/captions/rate': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_CAPTION_RATE || '0.01'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Rate a caption suggestion run (Like/Dislike/Neutral)',
    },
    'GET /api/templates': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_TEMPLATES_LIST || '0.01'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'List Rekt CEO meme templates from the Brandify catalog',
    },
    'GET /api/templates/:templateId': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_TEMPLATES_DETAIL || '0.01'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Get a single meme template metadata record',
    },
    'GET /api/templates/:templateId/image': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_TEMPLATES_IMAGE || '0.02'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Download a meme template image',
    },
    'POST /api/cmo/research/competition': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_CMO_COMPETITION || '0.25'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Competition intelligence playbook for engagement and meme UGC',
    },
    'POST /api/cmo/research/kol': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_CMO_KOL || '0.15'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'KOL discovery and engagement strategy',
    },
    'POST /api/cmo/research/trends': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_CMO_TRENDS || '0.06'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Social trends research via Lightreel',
    },
    'POST /api/cmo/research/content-draft': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_CMO_CONTENT_DRAFT || '0.05'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Engagement-optimized social post draft',
    },
    'POST /api/cmo/research/brand-mentions': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_CMO_BRAND_MENTIONS || '0.08'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Brand mention scan via AgentCash / Lightreel',
    },
    'POST /api/cmo/research/kol-opportunities': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_CMO_KOL_OPPS || '0.12'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'KOL engagement opportunities from watchlist',
    },
    'POST /api/cmo/research/topics': {
      accepts: {
        scheme: 'exact',
        price: `$${topicsResearchPriceUsd().toFixed(2)}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Topic determination + SEO/GEO keyword packs via AgentCash',
    },
    'POST /api/cmo/research/social-pulse': {
      accepts: {
        scheme: 'exact',
        price: `$${socialPulsePriceUsd().toFixed(2)}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Twitter + Reddit + optional LinkedIn social pulse',
    },
    'POST /api/cmo/research/news-events': {
      accepts: {
        scheme: 'exact',
        price: `$${newsEventsPriceUsd().toFixed(2)}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'News, events, and research references for content topics',
    },
    'POST /api/cmo/research/intel-pack': {
      accepts: {
        scheme: 'exact',
        price: `$${intelPackPriceUsd().toFixed(2)}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'One-shot research intel: topics + social + news/events',
    },
    'POST /api/cmo/strategy/campaign-brief': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_CMO_CAMPAIGN_BRIEF || '0.10'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'N-day campaign brief with AgentCash calendar assist',
    },
    'POST /api/cmo/content/day-package': {
      accepts: {
        scheme: 'exact',
        price: dayUnit(),
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Full day content package: ideate, brandify meme, caption, save draft',
    },
    'POST /api/cmo/content/batch-package': {
      accepts: {
        scheme: 'exact',
        price: batchPrice,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Batch day packages — price = dayCount × day package (send X-CMO-Day-Count)',
    },
    'POST /api/cmo/content/curate': {
      accepts: {
        scheme: 'exact',
        price: `$${curatePriceUsd().toFixed(2)}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Curate research-aware social copy + CTA for one campaign day',
    },
    'POST /api/cmo/content/select-template': {
      accepts: {
        scheme: 'exact',
        price: `$${selectTemplatePriceUsd().toFixed(2)}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Select meme template from curated ideate output',
    },
    'POST /api/cmo/content/brandify': {
      accepts: {
        scheme: 'exact',
        price: `$${brandifyStagePriceUsd().toFixed(2)}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Auto brandify (vision + first ideas + generate) — prefer interactive vision/generate for operators',
    },
    'POST /api/cmo/content/brandify-vision': {
      accepts: {
        scheme: 'exact',
        price: `$${brandifyVisionPriceUsd().toFixed(2)}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Analyze meme template and return branding options for curator selection',
    },
    'POST /api/cmo/content/brandify-generate': {
      accepts: {
        scheme: 'exact',
        price: `$${brandifyGeneratePriceUsd().toFixed(2)}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Generate branded meme from curated element choices',
    },
    'POST /api/cmo/content/caption': {
      accepts: {
        scheme: 'exact',
        price: `$${captionStagePriceUsd().toFixed(2)}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Generate meme captions for a branded image',
    },
    'POST /api/cmo/content/run-from-stage': {
      accepts: {
        scheme: 'exact',
        price: fromStagePrice,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Pay once and run remaining day stages from X-CMO-From-Stage through compose',
    },
    'POST /api/cmo/brand/analyze': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_CMO_BRAND_ANALYZE || '0.45'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'AgentCash brand-agency analysis from website URL; persists guidelines + features',
    },
    'POST /api/cmo/features/enrich': {
      accepts: {
        scheme: 'exact',
        price: `$${process.env.X402_PRICE_CMO_FEATURE_ENRICH || '0.18'}`,
        network: networkId,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: 'Enrich a product feature from its URL via AgentCash',
    },
  });
}

/**
 * Build the Express app (no listen, no DB). Used by server.js and tests.
 */
export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  const X402_NETWORK_ID = resolveX402NetworkId();
  const X402_NETWORK_LABEL = X402_NETWORK_ID === 'eip155:84532' ? 'Base Sepolia' : 'Base';

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : null;

  const corsOptions = corsOrigins
    ? {
        origin: corsOrigins,
        credentials: true,
        exposedHeaders: [
          'payment-required',
          'payment-response',
          'PAYMENT-REQUIRED',
          'PAYMENT-RESPONSE',
          'X-PAYMENT-RESPONSE',
        ],
      }
    : {
        exposedHeaders: [
          'payment-required',
          'payment-response',
          'PAYMENT-REQUIRED',
          'PAYMENT-RESPONSE',
          'X-PAYMENT-RESPONSE',
        ],
      };

  app.use(cors(corsOptions));
  app.use(express.json());

  let paymentMiddlewareEnabled = false;

  app.get('/health', async (_req, res) => {
    let database = null;
    if (isPgEnabled()) {
      try {
        const pool = getPool();
        await pool.query('SELECT 1');
        database = { status: 'connected', provider: 'postgres' };
      } catch (err) {
        database = { status: 'error', message: err.message };
      }
    } else {
      database = { status: 'disabled' };
    }

    res.json({
      status: 'ok',
      service: 'rekt-brandify',
      database,
      payment: paymentMiddlewareEnabled
        ? { protocol: 'x402', network: X402_NETWORK_ID }
        : null,
    });
  });

  app.get('/favicon.ico', (_req, res) => {
    res.type('image/x-icon');
    res.sendFile(FAVICON_PATH);
  });

  app.get('/openapi.json', (_req, res) => {
    res.json(buildOpenApiDocument());
  });

  app.use(discoveryRoute);

  if (process.env.X402_RECEIVER_ADDRESS) {
    try {
      const facilitatorClient = createFacilitatorClient();
      const resourceServer = new x402ResourceServer(facilitatorClient)
        .register(X402_NETWORK_ID, new ExactEvmScheme());

      // CMO research/strategy AI routes are x402 for both admin wallet payers and external agents.
      // Admin-only free routes (wallet status, content CRUD, calendar, launch-context) are not priced.
      app.use(paymentMiddleware(getPaymentRouteConfig(X402_NETWORK_ID), resourceServer));
      paymentMiddlewareEnabled = true;

      console.log('💰 x402 payment middleware ENABLED');
      console.log(`   Receiver:    ${process.env.X402_RECEIVER_ADDRESS}`);
      console.log(`   Facilitator: ${FACILITATOR_URL}${usesCdpFacilitator() ? ' (CDP auth)' : ''}`);
      console.log(`   Network:     ${X402_NETWORK_LABEL} (${X402_NETWORK_ID})`);
      console.log(
        `   Pricing:     $${process.env.X402_PRICE_SESSION_START || '0.19'} (start) + $${process.env.X402_PRICE_GENERATE || '0.49'} (generate) + $${process.env.X402_PRICE_RATE || '0.01'} (rate) + $${process.env.X402_PRICE_CAPTION_SUGGEST || '0.10'} (captions)`
      );
    } catch (err) {
      console.error('❌ x402 payment middleware DISABLED:', err.message);
      console.error('   Set CDP_API_KEY_ID + CDP_API_KEY_SECRET on Render, or unset X402_RECEIVER_ADDRESS for free mode.');
    }
  } else {
    console.log('⚠️  No X402_RECEIVER_ADDRESS provided in .env — running API in FREE mode (no payments required)');
  }

  app.use('/api', apiRoutes);

  app.use((err, _req, res, _next) => {
    console.error('Request error:', err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      error: err.message || 'Internal Server Error',
    });
  });

  return {
    app,
    paymentMiddlewareEnabled,
    x402NetworkId: X402_NETWORK_ID,
  };
}
