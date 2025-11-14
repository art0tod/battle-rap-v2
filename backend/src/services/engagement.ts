import { pool } from '../db/pool.js';
import { AppError, mapDbError } from '../lib/errors.js';

const ensureBracketRoundByTrack = async (matchTrackId: string) => {
  const { rows } = await pool.query<{ kind: string }>(
    `SELECT r.kind
     FROM match_track mt
     JOIN match m ON m.id = mt.match_id
     JOIN round r ON r.id = m.round_id
     WHERE mt.id = $1`,
    [matchTrackId]
  );
  if (!rows[0]) {
    throw new AppError({ status: 404, code: 'track_not_found', message: 'Track not found.' });
  }
  if (rows[0].kind !== 'bracket') {
    throw new AppError({ status: 400, code: 'likes_not_allowed', message: 'Likes allowed only for bracket rounds.' });
  }
};

export const likeTrack = async (userId: string, matchTrackId: string) => {
  try {
    await ensureBracketRoundByTrack(matchTrackId);
    await pool.query(
      `INSERT INTO track_like(user_id, match_track_id)
       VALUES ($1,$2)
       ON CONFLICT (user_id, match_track_id) DO NOTHING`,
      [userId, matchTrackId]
    );
    const { rows } = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM track_like WHERE match_track_id = $1`,
      [matchTrackId]
    );
    return { match_track_id: matchTrackId, likes: rows[0]?.total ?? 0 };
  } catch (err) {
    throw mapDbError(err);
  }
};

export const unlikeTrack = async (userId: string, matchTrackId: string) => {
  try {
    await ensureBracketRoundByTrack(matchTrackId);
    await pool.query(
      `DELETE FROM track_like WHERE user_id = $1 AND match_track_id = $2`,
      [userId, matchTrackId]
    );
    const { rows } = await pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM track_like WHERE match_track_id = $1`,
      [matchTrackId]
    );
    return { match_track_id: matchTrackId, likes: rows[0]?.total ?? 0 };
  } catch (err) {
    throw mapDbError(err);
  }
};

export const listComments = async (params: { matchId: string; limit?: number; beforeId?: string }) => {
  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 100) : 50;
  try {
    const values: any[] = [params.matchId];
    let cursorClause = '';
    if (params.beforeId) {
      cursorClause = 'AND c.id < $2';
      values.push(params.beforeId);
    }
    const { rows } = await pool.query(
      `SELECT c.id, c.body, c.created_at,
              u.id AS user_id,
              u.display_name
       FROM comment c
       JOIN app_user u ON u.id = c.user_id
       WHERE c.match_id = $1 AND c.status = 'active'
         ${cursorClause}
       ORDER BY c.created_at DESC
       LIMIT ${limit}`,
      values
    );
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      author: { id: r.user_id, display_name: r.display_name },
    }));
  } catch (err) {
    throw mapDbError(err);
  }
};

export const addComment = async (params: { userId: string; matchId: string; matchTrackId?: string | null; body: string }) => {
  const body = params.body.trim();
  if (!body) {
    throw new AppError({ status: 400, code: 'comment_empty', message: 'Comment body is required.' });
  }
  try {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO comment(user_id, match_id, match_track_id, body, status, created_at)
       VALUES ($1,$2,$3,$4,'active',now())
       RETURNING id`,
      [params.userId, params.matchId, params.matchTrackId ?? null, body]
    );
    const id = rows[0]?.id;
    if (!id) {
      throw new AppError({ status: 500, code: 'comment_failed', message: 'Failed to add comment.' });
    }
    const { rows: out } = await pool.query(
      `SELECT c.id, c.body, c.created_at, u.id AS user_id, u.display_name
       FROM comment c
       JOIN app_user u ON u.id = c.user_id
       WHERE c.id = $1`,
      [id]
    );
    const r = out[0];
    return {
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      author: { id: r.user_id, display_name: r.display_name },
    };
  } catch (err) {
    throw mapDbError(err);
  }
};

