import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';
import { env } from '../config/env.js';

export const createRedisConnection = (overrides: RedisOptions = {}) =>
  new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    ...overrides,
  });

export const redis = createRedisConnection();

export async function ensureRedis() {
  if (!redis.status || redis.status === 'close' || redis.status === 'end') {
    await redis.connect();
  }
}

export async function shutdownRedis() {
  if (redis.status !== 'end') {
    await redis.quit();
  }
}
