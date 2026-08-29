import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { createCdpFacilitatorClient } from '@coinbase/cdp-sdk/x402';
import apiRoutes from './routes/api.js';
import discoveryRoute from './x402-discovery.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';
const USES_X402_ORG = FACILITATOR_URL.includes('x402.org');

function usesCdpFacilitator() {
  return FACILITATOR_URL.includes('cdp.coinbase.com')
    || Boolean(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET);
}

function resolveX402NetworkId() {
  const configured = (process.env.X402_NETWORK || '').toLowerCase();
  // x402.org public facilitator is testnet-only — never pair with mainnet
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

const X402_NETWORK_ID = resolveX402NetworkId();
const X402_NETWORK_LABEL = X402_NETWORK_ID === 'eip155:84532' ? 'Base Sepolia' : 'Base';

// Middleware
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : null;

app.use(cors(corsOrigins ? {
  origin: corsOrigins,
  credentials: true,
  exposedHeaders: [
    'payment-required',
    'payment-response',
    'PAYMENT-REQUIRED',
    'PAYMENT-RESPONSE',
    'X-PAYMENT-RESPONSE',
  ],
} : {
  exposedHeaders: [
    'payment-required',
    'payment-response',
    'PAYMENT-REQUIRED',
    'PAYMENT-RESPONSE',
    'X-PAYMENT-RESPONSE',
  ],
}));
app.use(express.json());

// === x402 Paywall Configuration ===
let paymentMiddlewareEnabled = false;
if (process.env.X402_RECEIVER_ADDRESS) {
  try {
    const facilitatorClient = createFacilitatorClient();
    const resourceServer = new x402ResourceServer(facilitatorClient)
      .register(X402_NETWORK_ID, new ExactEvmScheme());

    app.use(paymentMiddleware({
    "POST /api/sessions/start": {
      accepts: {
        scheme: "exact",
        price: `$${process.env.X402_PRICE_SESSION_START || '0.19'}`,
        network: X402_NETWORK_ID,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: "Upload a meme template and get AI Creative Director analysis"
    },
    "POST /api/generate": {
      accepts: {
        scheme: "exact",
        price: `$${process.env.X402_PRICE_GENERATE || '0.49'}`,
        network: X402_NETWORK_ID,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: "Generate a branded meme using Flux 2 Pro AI inpainting"
    },
    "POST /api/sessions/rate": {
      accepts: {
        scheme: "exact",
        price: `$${process.env.X402_PRICE_RATE || '0.01'}`,
        network: X402_NETWORK_ID,
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: "Rate a branded meme generation (Like/Dislike/Neutral)"
    }
  }, resourceServer));
  paymentMiddlewareEnabled = true;
  
  console.log(`💰 x402 payment middleware ENABLED`);
  console.log(`   Receiver:    ${process.env.X402_RECEIVER_ADDRESS}`);
  console.log(`   Facilitator: ${FACILITATOR_URL}${usesCdpFacilitator() ? ' (CDP auth)' : ''}`);
  console.log(`   Network:     ${X402_NETWORK_LABEL} (${X402_NETWORK_ID})`);
  console.log(`   Pricing:     $${process.env.X402_PRICE_SESSION_START || '0.19'} (start) + $${process.env.X402_PRICE_GENERATE || '0.49'} (generate) + $${process.env.X402_PRICE_RATE || '0.01'} (rate) = $0.69 per flow`);
  } catch (err) {
    console.error('❌ x402 payment middleware DISABLED:', err.message);
    console.error('   Set CDP_API_KEY_ID + CDP_API_KEY_SECRET on Render, or unset X402_RECEIVER_ADDRESS for free mode.');
  }
} else {
  console.log('⚠️  No X402_RECEIVER_ADDRESS provided in .env — running API in FREE mode (no payments required)');
}

// Health check (used by Render)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'rekt-brandify',
    payment: paymentMiddlewareEnabled
      ? { protocol: 'x402', network: X402_NETWORK_ID }
      : null,
  });
});

// Routes
app.use(discoveryRoute);
app.use('/api', apiRoutes);

app.use((err, _req, res, _next) => {
  console.error('Request error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;

async function startServer() {
  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB (Atlas)');
    } catch (err) {
      console.error('❌ MongoDB connection error:', err.message);
      console.warn('⚠️  Falling back to in-memory MongoDB — sessions will not persist across restarts.');
      console.warn('   To use Atlas: whitelist Render IPs in Network Access and verify MONGODB_URI.');
      const mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
      console.log('✅ Connected to MongoDB (In-Memory fallback)');
    }
  } else {
    console.log('⚠️  No MONGODB_URI provided in .env. Starting in-memory MongoDB for testing...');
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    console.log('✅ Connected to MongoDB (In-Memory)');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Meme Lab Backend running on http://localhost:${PORT}`);
  });
}

startServer();
