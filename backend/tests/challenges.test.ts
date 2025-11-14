import { describe, it, expect } from 'vitest';
import { createTestApp } from './helpers/app.js';

async function registerUser(app: Awaited<ReturnType<typeof createTestApp>>, label: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: `${label}_${Date.now()}@example.com`,
      password: 'StrongPass123!',
      display_name: label,
    },
  });
  const payload = response.json();
  return {
    token: payload.access_token as string,
    userId: payload.user.id as string,
  };
}

describe('Challenges API', () => {
  it('supports lifecycle actions, including acceptance and voting', async () => {
    const app = await createTestApp();
    try {
      const initiator = await registerUser(app, 'initiator');
      const opponent = await registerUser(app, 'opponent');
      const fan = await registerUser(app, 'fan');

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/challenges',
        headers: { authorization: `Bearer ${initiator.token}` },
        payload: {
          opponent_id: opponent.userId,
          title: 'Street Finals',
          description: 'Быстрый вызов после сетки',
        },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = createResponse.json();
      const challengeId = created.id as string;
      expect(created.status).toBe('initiated');

      const acceptResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/challenges/${challengeId}/accept`,
        headers: { authorization: `Bearer ${opponent.token}` },
      });
      expect(acceptResponse.statusCode).toBe(200);
      expect(acceptResponse.json().status).toBe('in_progress');

      const voteResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/challenges/${challengeId}/votes`,
        headers: { authorization: `Bearer ${fan.token}` },
        payload: { side: 'initiator' },
      });
      expect(voteResponse.statusCode).toBe(200);
      expect(voteResponse.json().votes.initiator).toBe(1);

      const detailResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/challenges/${challengeId}`,
      });
      expect(detailResponse.statusCode).toBe(200);
      expect(detailResponse.json()).toMatchObject({
        id: challengeId,
        status: 'in_progress',
        votes: { initiator: 1, opponent: 0 },
      });

      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/challenges',
      });
      expect(listResponse.statusCode).toBe(200);
      const listPayload = listResponse.json();
      expect(Array.isArray(listPayload)).toBe(true);
      expect(listPayload[0]).toMatchObject({
        id: challengeId,
        title: 'Street Finals',
      });
    } finally {
      await app.close();
    }
  });
});
