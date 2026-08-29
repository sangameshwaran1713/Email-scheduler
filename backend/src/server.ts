import app from './app.js';
import { config } from './config/index.js';
import { logger } from './config/logger.js';

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info({
    message: 'Express API Server started successfully',
    port: PORT,
    env: config.NODE_ENV,
    healthUrl: `http://localhost:${PORT}/health`,
  });
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  logger.info({ message: `Received ${signal}, initiating graceful shutdown...` });
  
  server.close(() => {
    logger.info({ message: 'HTTP server closed successfully.' });
    process.exit(0);
  });

  // Force shutdown after 10 seconds if connections are stuck
  setTimeout(() => {
    logger.error({ message: 'Forced shutdown after timeout.' });
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
