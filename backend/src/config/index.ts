import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/reachinbox_dev'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  ELASTICSEARCH_URL: z.string().default('http://localhost:9200'),
  JWT_SECRET: z.string().min(8).default('your_jwt_secret_min_32_chars_here_1234567890'),
  GOOGLE_CLIENT_ID: z.string().default('your_google_client_id.apps.googleusercontent.com'),
  GOOGLE_CLIENT_SECRET: z.string().default('your_google_client_secret'),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/auth/google/callback'),
  SLACK_CLIENT_ID: z.string().default('your_slack_client_id'),
  SLACK_CLIENT_SECRET: z.string().default('your_slack_client_secret'),
  SLACK_CALLBACK_URL: z.string().default('http://localhost:5000/api/slack/callback'),
  ETHEREAL_USER: z.string().optional().default(''),
  ETHEREAL_PASS: z.string().optional().default(''),
  ENCRYPTION_KEY: z.string().min(16).default('your_encryption_key_min_32_chars_here_1234567890'),
  WORKER_CONCURRENCY: z.string().default('10').transform(Number),
  MIN_EMAIL_DELAY_MS: z.string().default('2000').transform(Number),
  MAX_EMAILS_PER_HOUR: z.string().default('200').transform(Number),
  FRONTEND_URL: z.string().default('http://localhost:5173')
});

export const config = envSchema.parse(process.env);
