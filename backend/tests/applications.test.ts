import { describe, it, expect } from 'vitest';
import { createTestApp } from './helpers/app.js';

describe('Participation applications', () => {
  it('allows authenticated user to submit and read their application', async () => {
    const app = await createTestApp();
    try {
      const email = `applicant_${Date.now()}@example.com`;

      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'ApplicantPass123!',
          display_name: 'Applicant',
        },
      });
      const accessToken = registerResponse.json().access_token as string;

      const submitResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/applications',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          city: 'Kazan',
          age: 23,
          full_name: 'Applicant One',
          beat_author: 'Beat Maker',
          lyrics: 'Первый куплет тестовой заявки',
        },
      });
      expect(submitResponse.statusCode).toBe(200);
      expect(submitResponse.json()).toMatchObject({
        status: 'submitted',
      });

      const meResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/applications/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(meResponse.statusCode).toBe(200);
      expect(meResponse.json()).toMatchObject({
        city: 'Kazan',
        full_name: 'Applicant One',
        status: 'submitted',
      });
    } finally {
      await app.close();
    }
  });
});
