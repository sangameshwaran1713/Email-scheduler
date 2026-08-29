import pino from 'pino';
import { config } from './index.js';

const pinoFn = (pino as any).default || pino;

const defaultLevel = config.NODE_ENV === 'production' ? 'info' : 'debug';

export const logger = pinoFn({
  level: (process.env.LOG_LEVEL || defaultLevel),
  transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});
