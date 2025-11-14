import { describe, it, expect } from 'vitest';
import { createTestApp } from './helpers/app.js';

const TEST_PASSWORD = 'SecurePassw0rd!';

describe('Auth flow', () => {
  it('registers, logs in, refreshes tokens and reads profile', async () => {
    const app = await createTestApp();
    try {
      const email = `user_${Date.now()}@example.com`;

      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: TEST_PASSWORD,
          display_name: 'Test User',
        },
      });
      expect(registerResponse.statusCode).toBe(200);
      const registerBody = registerResponse.json();
      expect(registerBody.user.email).toBe(email);
      expect(registerBody.access_token).toBeTruthy();

      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${registerBody.access_token}` },
      });
      expect(meResponse.statusCode).toBe(200);
      expect(meResponse.json()).toMatchObject({
        email,
        display_name: 'Test User',
      });

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email,
          password: TEST_PASSWORD,
        },
      });
      expect(loginResponse.statusCode).toBe(200);
      const loginBody = loginResponse.json();
      expect(loginBody.user.id).toBe(registerBody.user.id);

      const refreshCookie = loginResponse.cookies?.find(
        (cookie) => cookie.name === 'refresh_token'
      );
      expect(refreshCookie?.value).toBeTruthy();

      const refreshResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refresh_token: refreshCookie!.value },
      });
      expect(refreshResponse.statusCode).toBe(200);
      expect(refreshResponse.json()).toMatchObject({
        token_type: 'Bearer',
      });
    } finally {
      await app.close();
    }
  });
});
