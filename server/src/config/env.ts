import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load server .env (and root .env if running from workspace root)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
if (typeof __dirname !== 'undefined') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  SERVER_URL: z.string().default('http://localhost:5000'),
  SOCKET_URL: z.string().default('http://localhost:5000'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  SESSION_SECRET: z.string().default('session-secret'),
  COOKIE_SECURE: z.string().transform((v) => v === 'true').default('false'),
  PAYMENT_GATEWAY: z.enum(['mock', 'razorpay']).default('mock'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  EXECUTION_TIMEOUT_MS: z.coerce.number().default(3000),
  MAX_MEMORY_MB: z.coerce.number().default(128),
  ADMIN_EMAIL: z.string().default('admin@codebreak.dev'),
  ADMIN_PASSWORD: z.string().default('Admin@CodeBreak2026'),
  ADMIN_NAME: z.string().default('Contest Director'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
