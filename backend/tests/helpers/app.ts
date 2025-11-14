import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/http/app.js';

export async function createTestApp(): Promise<FastifyInstance> {
  const app = buildApp();
  await app.ready();
  return app;
}
