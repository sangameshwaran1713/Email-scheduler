import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from './config/logger.js';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { setupBullBoard } from './queues/bull-board.js';
import authRouter from './routes/auth.routes.js';
import slackRouter from './routes/slack.routes.js';
import emailRouter from './routes/email.routes.js';
import { initializeEmailIndex } from './elasticsearch/email.search.js';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });
  next();
});

// Root & Health check endpoints
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'reachinbox-api',
    message: 'ReachInbox API Server is running.',
    frontendUrl: config.FRONTEND_URL || 'http://localhost:5173',
    healthCheck: 'http://localhost:5000/health',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'reachinbox-api',
    timestamp: new Date().toISOString(),
    env: config.NODE_ENV,
  });
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/slack', slackRouter);
app.use('/api/emails', emailRouter);

// Initialize Elasticsearch Index asynchronously
initializeEmailIndex().catch((err) => {
  logger.warn({ message: 'Async Elasticsearch init warning', error: err });
});

// Mount Bull Board dashboard asynchronously
setupBullBoard()
  .then((router) => {
    app.use('/admin/queues', router);
    logger.info({ message: 'Bull Board dashboard mounted at /admin/queues' });
  })
  .catch((err) => {
    logger.error({ message: 'Failed to mount Bull Board dashboard', error: err });
  });

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    error: `Cannot ${req.method} ${req.path}`,
  });
});

// Centralized Error handling
app.use(errorHandler);

export default app;
