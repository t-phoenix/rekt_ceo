import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';
import apiRoutes from './routes/api.js';
import discoveryRoute from './x402-discovery.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// === x402 Paywall Configuration ===
if (process.env.X402_RECEIVER_ADDRESS) {
  const facilitatorClient = new HTTPFacilitatorClient({ 
    url: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator' 
  });
  
  const resourceServer = new x402ResourceServer(facilitatorClient)
    .register("eip155:8453", new ExactEvmScheme()); // Base Mainnet
    
  app.use(paymentMiddleware({
    "POST /api/sessions/start": {
      accepts: {
        scheme: "exact",
        price: `$${process.env.X402_PRICE_SESSION_START || '0.19'}`,
        network: "eip155:8453",
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: "Upload a meme template and get AI Creative Director analysis"
    },
    "POST /api/generate": {
      accepts: {
        scheme: "exact",
        price: `$${process.env.X402_PRICE_GENERATE || '0.49'}`,
        network: "eip155:8453",
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: "Generate a branded meme using Flux 2 Pro AI inpainting"
    },
    "POST /api/sessions/rate": {
      accepts: {
        scheme: "exact",
        price: `$${process.env.X402_PRICE_RATE || '0.01'}`,
        network: "eip155:8453",
        payTo: process.env.X402_RECEIVER_ADDRESS,
      },
      description: "Rate a branded meme generation (Like/Dislike/Neutral)"
    }
  }, resourceServer));
  
  console.log(`💰 x402 payment middleware ENABLED`);
  console.log(`   Receiver: ${process.env.X402_RECEIVER_ADDRESS}`);
  console.log(`   Network:  Base (eip155:8453)`);
  console.log(`   Pricing:  $${process.env.X402_PRICE_SESSION_START || '0.19'} (start) + $${process.env.X402_PRICE_GENERATE || '0.49'} (generate) + $${process.env.X402_PRICE_RATE || '0.01'} (rate) = $0.69 per flow`);
} else {
  console.log('⚠️  No X402_RECEIVER_ADDRESS provided in .env — running API in FREE mode (no payments required)');
}

// Health check (used by Render)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'rekt-brandify' });
});

// Routes
app.use(discoveryRoute);
app.use('/api', apiRoutes);

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;

async function startServer() {
  if (MONGODB_URI) {
    await mongoose.connect(MONGODB_URI)
      .then(() => console.log('✅ Connected to MongoDB (Atlas)'))
      .catch(err => console.error('❌ MongoDB connection error:', err));
  } else {
    console.log('⚠️  No MONGODB_URI provided in .env. Starting in-memory MongoDB for testing...');
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    console.log('✅ Connected to MongoDB (In-Memory)');
  }

  // Start Server
  app.listen(PORT, () => {
    console.log(`🚀 Meme Lab Backend running on http://localhost:${PORT}`);
  });
}

startServer();
