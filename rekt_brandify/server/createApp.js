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
  return {
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
  };
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
