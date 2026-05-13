import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import infoRoutes from './routes/info.routes';
import mintRoutes from './routes/mint.routes';
import healthRoutes from './routes/health.routes';
import zkRoutes from "./routes/zk.routes"
import { errorHandler } from './middleware/error-handler';
import { generalLimiter, authLimiter, mintLimiter } from './middleware/rate-limit';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration - allow multiple origins
const allowedOrigins = [
  ...config.corsOrigin.split(',').map((s) => s.trim()),
  'https://rekt.ceo',
  'https://www.rekt.ceo',
].filter(Boolean);

// In non-production, accept any localhost / 127.0.0.1 origin so dev servers on
// 3000 / 3001 / 5173 / 5174 / Vite-randomised ports all work without re-editing .env.
const isDevLikeOrigin = (origin: string): boolean => {
  if (config.nodeEnv === 'production') return false;
  try {
    const url = new URL(origin);
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '0.0.0.0'
    );
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || isDevLikeOrigin(origin)) {
      return callback(null, true);
    }
    logger.warn(`CORS rejected origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/mint', mintLimiter);
app.use('/api', generalLimiter);

//zk routes
app.use("/zk", zkRoutes)

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/info', infoRoutes);
app.use('/api/mint', mintRoutes);
app.use('/api/health', healthRoutes);
// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Rekt CEO Backend API',
    version: '1.0.0',
  });
});

// Error handling (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Chain ID: ${config.chainId}`);
});

export default app;

