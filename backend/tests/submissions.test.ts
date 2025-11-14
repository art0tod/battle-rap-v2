import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestApp } from './helpers/app.js';
import { pool } from '../src/db/pool.js';

describe('Submission restrictions', () => {
  it('prevents eliminated participants from uploading new submissions', async () => {
    const app = await createTestApp();
    try {
      const email = `eliminated_${Date.now()}@example.com`;
      const registerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          password: 'TestPassword123!',
          display_name: 'Eliminated MC',
        },
      });
      const payload = registerResponse.json();
      const accessToken = payload.access_token as string;
      const userId = payload.user.id as string;

      await pool.query(`INSERT INTO app_user_role(user_id, role) VALUES ($1,'artist') ON CONFLICT DO NOTHING`, [userId]);

      const tournamentId = randomUUID();
      const qualifierRoundId = randomUUID();
      const bracketRoundId = randomUUID();
      const matchId = randomUUID();
      const audioId = randomUUID();

      await pool.query(
        `INSERT INTO tournament (id, title, status)
         VALUES ($1,'Elimination Cup','ongoing')`,
        [tournamentId]
      );
      await pool.query(
        `INSERT INTO round (id, tournament_id, kind, number, scoring, status)
         VALUES
          ($1,$3,'qualifier1',1,'pass_fail','submission'),
          ($2,$3,'bracket',2,'rubric','finished')`,
        [qualifierRoundId, bracketRoundId, tournamentId]
      );
      const participantInsert = await pool.query<{ id: string }>(
        `INSERT INTO tournament_participant (tournament_id, user_id)
         VALUES ($1,$2)
         RETURNING id`,
        [tournamentId, userId]
      );
      const participantId = participantInsert.rows[0].id;

      await pool.query(
        `INSERT INTO match (id, round_id, status)
         VALUES ($1,$2,'finished')`,
        [matchId, bracketRoundId]
      );
      await pool.query(
        `INSERT INTO match_participant (match_id, participant_id, seed, result_status)
         VALUES ($1,$2,1,'eliminated')`,
        [matchId, participantId]
      );

      await pool.query(
        `INSERT INTO media_asset (id, kind, storage_key, mime, size_bytes, status)
         VALUES ($1,'audio','tests/audio.mp3','audio/mpeg',1024,'ready')`,
        [audioId]
      );

      const submissionResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/artist/rounds/${qualifierRoundId}/submissions`,
        headers: { authorization: `Bearer ${accessToken}` },
        payload: {
          audio_id: audioId,
          lyrics: 'Test blocked verse',
        },
      });
      expect(submissionResponse.statusCode).toBe(403);
      expect(submissionResponse.json()).toMatchObject({
        code: 'participant_eliminated',
      });
    } finally {
      await app.close();
    }
  });
});
