import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import infoRoutes from './routes/info.routes';
import mintRoutes from './routes/mint.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler } from './middleware/error-handler';
import { generalLimiter, authLimiter, mintLimiter } from './middleware/rate-limit';

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(cors({ 
  origin: config.corsOrigin, 
  credentials: true 
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

