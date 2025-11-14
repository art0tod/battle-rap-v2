import { randomUUID } from 'node:crypto';
import { pool, tx, type DbClient } from '../db/pool.js';
import { AppError, mapDbError } from '../lib/errors.js';
import { resolveCdnUrl } from './media.js';
import { CHALLENGE_TOURNAMENT_ID } from '../lib/constants.js';

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

type ChallengeResponseRow = {
  challenge_id: string;
  user_id: string;
  audio_id: string;
  description: string | null;
  submitted_at: string;
  storage_key: string | null;
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

const toChallengeResponse = (row: ChallengeResponseRow) => ({
  user_id: row.user_id,
  audio_id: row.audio_id,
  audio_url: row.storage_key ? resolveCdnUrl(row.storage_key) : null,
  description: row.description,
  submitted_at: row.submitted_at,
});

type ChallengeBattleRecord = {
  match_id: string;
  round_id: string;
  initiator_participant_id: string;
  opponent_participant_id: string;
};

const ensureChallengeTournament = async (client: DbClient) => {
  await client.query(
    `INSERT INTO tournament (id, title, status, registration_open_at, submission_deadline_at, judging_deadline_at, public_at)
     VALUES ($1, 'Пользовательские баттлы', 'ongoing', now(), now(), now(), now())
     ON CONFLICT (id) DO NOTHING`,
    [CHALLENGE_TOURNAMENT_ID]
  );
};

const ensureChallengeRound = async (client: DbClient, challengeId: string) => {
  await client.query(
    `INSERT INTO round (id, tournament_id, kind, number, scoring, status, starts_at, submission_deadline_at, judging_deadline_at, strategy)
     VALUES ($1, $2, 'challenge', 1, 'points', 'submission', now(), now() + INTERVAL '3 days', now() + INTERVAL '7 days', 'weighted')
     ON CONFLICT (id) DO NOTHING`,
    [challengeId, CHALLENGE_TOURNAMENT_ID]
  );
};

const ensureChallengeParticipant = async (client: DbClient, userId: string) => {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO tournament_participant (tournament_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (tournament_id, user_id)
     DO UPDATE SET tournament_id = EXCLUDED.tournament_id
     RETURNING id`,
    [CHALLENGE_TOURNAMENT_ID, userId]
  );
  return rows[0].id;
};

const ensureChallengeBattleRecord = async (client: DbClient, challengeId: string, initiatorId: string, opponentId: string): Promise<ChallengeBattleRecord> => {
  const existing = await client.query<ChallengeBattleRecord & { challenge_id: string }>(
    `SELECT
        match_id,
        round_id,
        initiator_participant_id,
        opponent_participant_id
     FROM challenge_match
     WHERE challenge_id = $1`,
    [challengeId]
  );
  if (existing.rows[0]) {
    const row = existing.rows[0];
    return {
      match_id: row.match_id,
      round_id: row.round_id,
      initiator_participant_id: row.initiator_participant_id,
      opponent_participant_id: row.opponent_participant_id,
    };
  }

  await ensureChallengeTournament(client);
  await ensureChallengeRound(client, challengeId);

  const initiatorParticipantId = await ensureChallengeParticipant(client, initiatorId);
  const opponentParticipantId = await ensureChallengeParticipant(client, opponentId);
  const matchId = randomUUID();

  await client.query(
    `INSERT INTO match (id, round_id, starts_at, status)
     VALUES ($1, $2, now(), 'submission')
     ON CONFLICT (id) DO NOTHING`,
    [matchId, challengeId]
  );

  await client.query(
    `INSERT INTO match_participant (match_id, participant_id, seed)
     VALUES ($1, $2, 1)
     ON CONFLICT (match_id, participant_id) DO UPDATE SET seed = EXCLUDED.seed`,
    [matchId, initiatorParticipantId]
  );

  await client.query(
    `INSERT INTO match_participant (match_id, participant_id, seed)
     VALUES ($1, $2, 2)
     ON CONFLICT (match_id, participant_id) DO UPDATE SET seed = EXCLUDED.seed`,
    [matchId, opponentParticipantId]
  );

  await client.query(
    `INSERT INTO challenge_match (challenge_id, tournament_id, round_id, match_id, initiator_participant_id, opponent_participant_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (challenge_id) DO UPDATE
       SET match_id = EXCLUDED.match_id,
           round_id = EXCLUDED.round_id`,
    [challengeId, CHALLENGE_TOURNAMENT_ID, challengeId, matchId, initiatorParticipantId, opponentParticipantId]
  );

  return {
    match_id: matchId,
    round_id: challengeId,
    initiator_participant_id: initiatorParticipantId,
    opponent_participant_id: opponentParticipantId,
  };
};

const formatChallenge = (row: ChallengeRow, votes?: ChallengeVotesRow, responses?: ChallengeResponseRow[]) => {
  const responseList = responses ?? [];
  const initiatorResponse = responseList.find((resp) => resp.user_id === row.initiator_id);
  const opponentResponse = responseList.find((resp) => resp.user_id === row.opponent_id);
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
    responses: {
      initiator: initiatorResponse ? toChallengeResponse(initiatorResponse) : null,
      opponent: opponentResponse ? toChallengeResponse(opponentResponse) : null,
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
  const { rows: responseRows } = await pool.query<ChallengeResponseRow>(
    `SELECT
        cs.challenge_id,
        cs.user_id,
        cs.audio_id,
        cs.description,
        cs.submitted_at,
        ma.storage_key
     FROM challenge_submission cs
     LEFT JOIN media_asset ma ON ma.id = cs.audio_id
     WHERE cs.challenge_id = ANY($1::uuid[])`,
    [ids]
  );
  const responseMap = new Map<string, ChallengeResponseRow[]>();
  for (const response of responseRows) {
    if (!responseMap.has(response.challenge_id)) {
      responseMap.set(response.challenge_id, []);
    }
    responseMap.get(response.challenge_id)!.push(response);
  }
  return rows.map((row) => formatChallenge(row, voteMap.get(row.id), responseMap.get(row.id)));
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
    await tx(async (client) => {
      const { rows } = await client.query<{ id: string; initiator_id: string; opponent_id: string }>(
        `UPDATE challenge
         SET status = 'in_progress',
             accepted_at = now(),
             started_at = COALESCE(started_at, now()),
             updated_at = now()
         WHERE id = $1 AND opponent_id = $2 AND status = 'initiated'
         RETURNING id, initiator_id, opponent_id`,
        [params.challengeId, params.userId]
      );
      const row = rows[0];
      if (!row) {
        throw new AppError({ status: 400, code: 'challenge_accept_failed', message: 'Вызов недоступен для принятия.' });
      }
      await ensureChallengeBattleRecord(client, params.challengeId, row.initiator_id, row.opponent_id);
    });
    return getChallengeById(params.challengeId);
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

export const submitChallengeResponse = async (params: { challengeId: string; userId: string; audioId: string; description?: string | null }) => {
  try {
    await tx(async (client) => {
      const { rows } = await client.query<{ initiator_id: string; opponent_id: string; status: string }>(
        `SELECT initiator_id, opponent_id, status FROM challenge WHERE id = $1`,
        [params.challengeId]
      );
      const challenge = rows[0];
      if (!challenge) {
        throw new AppError({ status: 404, code: 'challenge_not_found', message: 'Вызов не найден.' });
      }
      if (challenge.status !== 'in_progress') {
        throw new AppError({ status: 400, code: 'challenge_response_closed', message: 'Загрузка трека недоступна.' });
      }
      if (params.userId !== challenge.initiator_id && params.userId !== challenge.opponent_id) {
        throw new AppError({ status: 403, code: 'challenge_response_forbidden', message: 'Только участники могут загружать треки.' });
      }

      const battleRecord = await ensureChallengeBattleRecord(client, params.challengeId, challenge.initiator_id, challenge.opponent_id);

      await client.query(
        `INSERT INTO challenge_submission (challenge_id, user_id, audio_id, description)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (challenge_id, user_id)
         DO UPDATE SET
           audio_id = EXCLUDED.audio_id,
           description = EXCLUDED.description,
           submitted_at = now(),
           updated_at = now()`,
        [params.challengeId, params.userId, params.audioId, params.description ?? null]
      );

      const participantId = params.userId === challenge.initiator_id ? battleRecord.initiator_participant_id : battleRecord.opponent_participant_id;
      await client.query(
        `INSERT INTO match_track (match_id, participant_id, audio_id, lyrics, submitted_at)
         VALUES ($1,$2,$3,$4,now())
         ON CONFLICT (match_id, participant_id)
         DO UPDATE SET audio_id = EXCLUDED.audio_id, lyrics = EXCLUDED.lyrics, submitted_at = now()`,
        [battleRecord.match_id, participantId, params.audioId, params.description ?? null]
      );

      const { rows: submissionCountRows } = await client.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total
         FROM challenge_submission
         WHERE challenge_id = $1 AND audio_id IS NOT NULL`,
        [params.challengeId]
      );
      if ((submissionCountRows[0]?.total ?? 0) >= 2) {
        await client.query(`UPDATE match SET status = 'judging', starts_at = COALESCE(starts_at, now()) WHERE id = $1`, [battleRecord.match_id]);
      }
    });
  } catch (err) {
    throw mapDbError(err);
  }
  return getChallengeById(params.challengeId);
};
