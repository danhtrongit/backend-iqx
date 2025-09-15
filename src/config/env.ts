import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  // Database
  DATABASE_URL: z.string(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().transform(Number).optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_SSL: z.string().transform(val => val === 'true').default('false'),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_TIME_WINDOW: z.string().default('1m'),
  
  // CORS
  CORS_ORIGIN: z.string().transform(val => val.split(',')).default('*'),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default('true'),
  
  // Swagger
  SWAGGER_HOST: z.string().optional(),
  SWAGGER_SCHEMES: z.string().transform(val => val?.split(',') || ['http']).optional(),
  
  // Proxy Targets
  PROXY_IQ_TARGET: z.string().url().default('https://iq.vietcap.com.vn'),
  PROXY_TRADING_TARGET: z.string().url().default('https://trading.vietcap.com.vn'),
  PROXY_AI_TARGET: z.string().url().default('https://ai.vietcap.com.vn'),
});

export type Config = z.infer<typeof envSchema>;

function validateEnv(): Config {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      console.error(error.format());
      process.exit(1);
    }
    throw error;
  }
}

export const config = validateEnv();