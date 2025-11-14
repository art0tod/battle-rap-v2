import { describe, it, expect } from 'vitest';
import { createTestApp } from './helpers/app.js';

describe('Health endpoint', () => {
  it('responds with ok status', async () => {
    const app = await createTestApp();
    try {
      const response = await app.inject({ method: 'GET', url: '/health' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    } finally {
      await app.close();
    }
  });
});
