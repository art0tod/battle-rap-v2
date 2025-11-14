import { beforeAll, afterAll, beforeEach } from 'vitest';
import { ensureTestEnv } from './helpers/env.js';

ensureTestEnv();

const [{ runMigrations }, { resetDatabase, resetRedis }, { closePool }, { shutdownRedis }] =
  await Promise.all([
    import('../src/db/migrations.js'),
    import('./helpers/db.js'),
    import('../src/db/pool.js'),
    import('../src/lib/redis.js'),
  ]);

beforeAll(async () => {
  await runMigrations({ silent: true });
  await resetDatabase();
  await resetRedis();
});

beforeEach(async () => {
  await resetDatabase();
  await resetRedis();
});

afterAll(async () => {
  await resetRedis();
  await closePool();
  await shutdownRedis();
});
