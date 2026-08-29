import pino from 'pino';
import { config } from './index.js';

const pinoFn = (pino as any).default || pino;

export const logger = pinoFn({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});
