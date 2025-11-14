import { z } from 'zod';
import dotenv from 'dotenv';

const result = dotenv.config();
if (result.error && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.warn('[env] .env file not found, relying on process.env');
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('900s'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_REGION: z.string().min(1),
  CDN_BASE_URL: z.string().url(),
  MAX_AUDIO_SIZE_BYTES: z.coerce.number().int().positive().default(25_000_000),
  ALLOWED_AUDIO_MIME: z
    .string()
    .default('audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/aac,audio/m4a,audio/x-m4a,audio/ogg,audio/webm'),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);
