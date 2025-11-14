const DEFAULTS = {
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    'postgres://app:adminadmin@127.0.0.1:5432/battle_rap_test',
  REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://127.0.0.1:6379',
  JWT_SECRET: process.env.TEST_JWT_SECRET ?? 'testsupersecretsecret',
  JWT_ACCESS_TTL: process.env.TEST_JWT_ACCESS_TTL ?? '900s',
  JWT_REFRESH_TTL: process.env.TEST_JWT_REFRESH_TTL ?? '7d',
  S3_ENDPOINT: process.env.TEST_S3_ENDPOINT ?? 'http://localhost:9000',
  S3_BUCKET: process.env.TEST_S3_BUCKET ?? 'test-bucket',
  S3_ACCESS_KEY: process.env.TEST_S3_ACCESS_KEY ?? 'test-access',
  S3_SECRET_KEY: process.env.TEST_S3_SECRET_KEY ?? 'test-secret',
  S3_REGION: process.env.TEST_S3_REGION ?? 'eu-central-1',
  CDN_BASE_URL: process.env.TEST_CDN_BASE_URL ?? 'http://localhost:9000',
};

let applied = false;

export function ensureTestEnv() {
  if (applied) {
    return;
  }
  process.env.NODE_ENV = 'test';
  for (const [key, value] of Object.entries(DEFAULTS)) {
    process.env[key] ??= value;
  }
  applied = true;
}
