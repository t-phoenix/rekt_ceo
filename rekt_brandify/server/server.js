import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from './createApp.js';

dotenv.config();

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

async function startServer() {
  const { app } = createApp();

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
