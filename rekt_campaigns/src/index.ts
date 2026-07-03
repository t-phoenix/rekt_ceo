import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import campaignRoutes from './routes/campaign.routes';
import dailyRoutes from './routes/daily.routes';
import identityRoutes from './routes/identity.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middleware/error-handler';
import { generalLimiter } from './middleware/rate-limit';
import { supabaseSync } from './services/supabase-sync.service';

const app: Express = express();

/** Reverse proxies send X-Forwarded-For; required for accurate req.ip and express-rate-limit. */
const trustProxy =
  config.nodeEnv === 'production' || process.env.RENDER === 'true' || process.env.TRUST_PROXY === '1';
if (trustProxy) {
  const hops = Number(process.env.TRUST_PROXY_HOPS || '1');
  app.set('trust proxy', Number.isFinite(hops) && hops > 0 ? hops : 1);
}

app.use(helmet());

const allowedOrigins = [...config.corsOrigin.split(',').map((s) => s.trim())].filter(Boolean);

const isDevLikeOrigin = (origin: string): boolean => {
  if (config.nodeEnv === 'production') return false;
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0';
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || isDevLikeOrigin(origin)) {
        return callback(null, true);
      }
      logger.warn(`CORS rejected origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use('/api', generalLimiter);

app.use('/api/campaigns', campaignRoutes);
app.use('/api/daily', dailyRoutes);
app.use('/api/identity', identityRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'rekt_campaigns_api',
    version: '1.0.0',
    portHint: config.port,
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use(errorHandler);

import cron from 'node-cron';

const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Rekt Campaigns API on port ${PORT} (${config.nodeEnv})`);
  
  // Setup 24h cron to run exactly at Midnight UTC every day
  cron.schedule('0 0 * * *', async () => {
    logger.info('Starting midnight backup routines...');
    await supabaseSync.runDailySnapshot();
    await supabaseSync.runFullStateBackup();
  });
});

export default app;
