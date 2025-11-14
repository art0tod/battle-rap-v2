import { describe, it, expect } from 'vitest';
import { createTestApp } from './helpers/app.js';
import { seedPublicBattlesFixture } from './helpers/seeds.js';
import { pool } from '../src/db/pool.js';

describe('Public battles listing', () => {
  it('returns current and finished battles with participants', async () => {
    const { currentMatchId } = await seedPublicBattlesFixture();
    const userRow = await pool.query<{ id: string }>(`SELECT id FROM app_user LIMIT 1`);
    if (userRow.rows[0]) {
      await pool.query(
        `INSERT INTO comment (id, user_id, match_id, body, status, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'Great battle', 'active', now())`,
        [userRow.rows[0].id, currentMatchId]
      );
    }
    const app = await createTestApp();
    try {
      const currentResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/battles',
        query: { status: 'current' },
      });
      expect(currentResponse.statusCode).toBe(200);
      const currentPayload = currentResponse.json();
      expect(Array.isArray(currentPayload.battles)).toBe(true);
      expect(currentPayload.battles).toHaveLength(1);
      expect(currentPayload.battles[0]).toMatchObject({
        status: 'scheduled',
        participants: expect.arrayContaining([
          expect.objectContaining({
            display_name: expect.any(String),
          }),
        ]),
      });
      expect(currentPayload.battles[0].engagement).toMatchObject({ comments: expect.any(Number) });

      const finishedResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/battles',
        query: { status: 'finished' },
      });
      expect(finishedResponse.statusCode).toBe(200);
      const finishedPayload = finishedResponse.json();
      expect(finishedPayload.battles).toHaveLength(1);
      expect(finishedPayload.battles[0].status).toBe('finished');
      expect(finishedPayload.battles[0].winner_match_track_id).toBeTruthy();
    } finally {
      await app.close();
    }
  });
});
