import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import { AppError, mapDbError } from '../lib/errors.js';

type ChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  initiator_id: string;
  initiator_name: string;
  opponent_id: string;
  opponent_name: string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

type ChallengeVotesRow = {
  challenge_id: string;
  initiator_votes: number;
  opponent_votes: number;
};

const baseSelect = `
  SELECT
    c.id,
    c.title,
    c.description,
    c.status,
    c.initiator_id,
    initiator.display_name AS initiator_name,
    c.opponent_id,
    opponent.display_name AS opponent_name,
    c.created_at,
    c.updated_at,
    c.accepted_at,
    c.started_at,
    c.completed_at,
    c.cancelled_at
  FROM challenge c
  JOIN app_user initiator ON initiator.id = c.initiator_id
  JOIN app_user opponent ON opponent.id = c.opponent_id
`;

const formatChallenge = (row: ChallengeRow, votes?: ChallengeVotesRow) => {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    timestamps: {
      created_at: row.created_at,
      updated_at: row.updated_at,
      accepted_at: row.accepted_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      cancelled_at: row.cancelled_at,
    },
    initiator: {
      id: row.initiator_id,
      display_name: row.initiator_name,
    },
    opponent: {
      id: row.opponent_id,
      display_name: row.opponent_name,
    },
    votes: {
      initiator: votes?.initiator_votes ?? 0,
      opponent: votes?.opponent_votes ?? 0,
    },
  };
};

const attachVotes = async (rows: ChallengeRow[]) => {
  if (!rows.length) {
    return [];
  }
  const ids = rows.map((row) => row.id);
  const { rows: voteRows } = await pool.query<ChallengeVotesRow>(
    `SELECT
        challenge_id,
        COUNT(*) FILTER (WHERE side = 'initiator')::int AS initiator_votes,
        COUNT(*) FILTER (WHERE side = 'opponent')::int AS opponent_votes
     FROM challenge_vote
     WHERE challenge_id = ANY($1::uuid[])
     GROUP BY challenge_id`,
    [ids]
  );
  const voteMap = new Map(voteRows.map((row) => [row.challenge_id, row]));
  return rows.map((row) => formatChallenge(row, voteMap.get(row.id)));
};

export const listChallenges = async () => {
  const { rows } = await pool.query<ChallengeRow>(`${baseSelect} ORDER BY c.updated_at DESC`);
  return attachVotes(rows);
};

export const getChallengeById = async (id: string) => {
  const { rows } = await pool.query<ChallengeRow>(`${baseSelect} WHERE c.id = $1`, [id]);
  if (!rows[0]) {
    return null;
  }
  const [formatted] = await attachVotes([rows[0]]);
  return formatted ?? null;
};

export const createChallenge = async (params: { initiatorId: string; opponentId: string; title: string; description?: string | null }) => {
  if (params.initiatorId === params.opponentId) {
    throw new AppError({ status: 400, code: 'challenge_same_user', message: 'Нельзя вызвать самого себя.' });
  }

  try {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO challenge(id, title, description, initiator_id, opponent_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [randomUUID(), params.title.trim(), params.description ?? null, params.initiatorId, params.opponentId]
    );
    return getChallengeById(rows[0].id);
  } catch (err) {
    throw mapDbError(err);
  }
};

export const acceptChallenge = async (params: { challengeId: string; userId: string }) => {
  try {
    const { rows } = await pool.query<{ id: string }>(
      `UPDATE challenge
       SET status = 'in_progress',
           accepted_at = now(),
           started_at = COALESCE(started_at, now()),
           updated_at = now()
       WHERE id = $1 AND opponent_id = $2 AND status = 'initiated'
       RETURNING id`,
      [params.challengeId, params.userId]
    );
    const id = rows[0]?.id;
    if (!id) {
      throw new AppError({ status: 400, code: 'challenge_accept_failed', message: 'Вызов недоступен для принятия.' });
    }
    return getChallengeById(id);
  } catch (err) {
    throw mapDbError(err);
  }
};

export const cancelChallenge = async (params: { challengeId: string; userId: string }) => {
  try {
    const { rows } = await pool.query<{ id: string }>(
      `UPDATE challenge
       SET status = 'cancelled',
           cancelled_at = now(),
           updated_at = now()
       WHERE id = $1
         AND status IN ('initiated','in_progress')
         AND (initiator_id = $2 OR opponent_id = $2)
       RETURNING id`,
      [params.challengeId, params.userId]
    );
    const id = rows[0]?.id;
    if (!id) {
      throw new AppError({ status: 400, code: 'challenge_cancel_failed', message: 'Вызов нельзя отменить.' });
    }
    return getChallengeById(id);
  } catch (err) {
    throw mapDbError(err);
  }
};

export const completeChallenge = async (params: { challengeId: string; userId: string }) => {
  try {
    const { rows } = await pool.query<{ id: string }>(
      `UPDATE challenge
       SET status = 'completed',
           completed_at = now(),
           updated_at = now()
       WHERE id = $1
         AND status = 'in_progress'
         AND (initiator_id = $2 OR opponent_id = $2)
       RETURNING id`,
      [params.challengeId, params.userId]
    );
    const id = rows[0]?.id;
    if (!id) {
      throw new AppError({ status: 400, code: 'challenge_complete_failed', message: 'Завершение недоступно.' });
    }
    return getChallengeById(id);
  } catch (err) {
    throw mapDbError(err);
  }
};

export const voteChallenge = async (params: { challengeId: string; userId: string; side: 'initiator' | 'opponent' }) => {
  const challenge = await pool.query<{ initiator_id: string; opponent_id: string; status: string }>(
    `SELECT initiator_id, opponent_id, status
     FROM challenge WHERE id = $1`,
    [params.challengeId]
  );
  const row = challenge.rows[0];
  if (!row) {
    throw new AppError({ status: 404, code: 'challenge_not_found', message: 'Вызов не найден.' });
  }
  if (row.status !== 'in_progress') {
    throw new AppError({ status: 400, code: 'challenge_closed', message: 'Голосование недоступно.' });
  }
  if (row.initiator_id === params.userId || row.opponent_id === params.userId) {
    throw new AppError({ status: 403, code: 'challenge_vote_restricted', message: 'Участники не могут голосовать.' });
  }

  try {
    await pool.query(
      `INSERT INTO challenge_vote(challenge_id, voter_id, side)
       VALUES ($1,$2,$3)
       ON CONFLICT (challenge_id, voter_id)
       DO UPDATE SET side = EXCLUDED.side, created_at = now()`,
      [params.challengeId, params.userId, params.side]
    );
  } catch (err) {
    throw mapDbError(err);
  }
  return getChallengeById(params.challengeId);
};
