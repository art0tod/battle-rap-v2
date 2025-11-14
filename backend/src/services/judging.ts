import { pool } from '../db/pool.js';
import { AppError, mapDbError } from '../lib/errors.js';
import { resolveCdnUrl } from './media.js';
import { CHALLENGE_TOURNAMENT_ID } from '../lib/constants.js';

export type EvaluationPayload = {
  judgeId: string;
  matchId: string;
  roundId: string;
  pass?: boolean;
  score?: number;
  rubric?: Record<string, number>;
  comment?: string;
};

export const upsertEvaluation = async (payload: EvaluationPayload) => {
  try {
    await pool.query(
      `INSERT INTO evaluation(judge_id, target_type, target_id, round_id, pass, score, rubric, comment)
       VALUES ($1,'match',$2,$3,$4,$5,$6,$7)
       ON CONFLICT (judge_id, target_type, target_id)
       DO UPDATE SET pass=EXCLUDED.pass,
                     score=EXCLUDED.score,
                     rubric=EXCLUDED.rubric,
                     comment=EXCLUDED.comment`,
      [
        payload.judgeId,
        payload.matchId,
        payload.roundId,
        payload.pass ?? null,
        payload.score ?? null,
        payload.rubric ? JSON.stringify(payload.rubric) : null,
        payload.comment ?? null,
      ]
    );
  } catch (err) {
    throw mapDbError(err);
  }
};

export const finalizeMatch = async (matchId: string) => {
  try {
    await pool.query('SELECT finalize_match($1)', [matchId]);
  } catch (err) {
    throw mapDbError(err);
  }
};

export const refreshPublicViews = async () => {
  try {
    await pool.query('SELECT refresh_public_views()');
  } catch (err) {
    throw mapDbError(err);
  }
};

const assignmentColumns = `
  ja.id,
  ja.match_id,
  ja.status,
  ja.assigned_at,
  m.round_id,
  m.starts_at,
  m.status AS match_status,
  r.kind AS round_kind,
  r.number AS round_number,
  r.scoring AS round_scoring,
  r.status AS round_status,
  r.strategy AS round_strategy,
  r.judging_deadline_at
`;

export const listJudgeAssignments = async (judgeId: string) => {
  const { rows } = await pool.query(
    `SELECT ${assignmentColumns}
     FROM judge_assignment ja
     JOIN match m ON m.id = ja.match_id
     JOIN round r ON r.id = m.round_id
     WHERE ja.judge_id = $1
     ORDER BY ja.assigned_at DESC`,
    [judgeId]
  );
  return rows;
};

export const assignNextBattleToJudge = async (judgeId: string) => {
  const { rows: existingRows } = await pool.query(
    `SELECT ${assignmentColumns}
     FROM judge_assignment ja
     JOIN match m ON m.id = ja.match_id
     JOIN round r ON r.id = m.round_id
     WHERE ja.judge_id = $1 AND ja.status = 'assigned'
     ORDER BY ja.assigned_at ASC
     LIMIT 1`,
    [judgeId]
  );
  if (existingRows[0]) {
    return existingRows[0];
  }

  const { rows: candidateRows } = await pool.query(
    `SELECT m.id AS match_id
     FROM match m
     JOIN round r ON r.id = m.round_id
     WHERE r.status = 'judging'
       AND (r.judging_deadline_at IS NULL OR r.judging_deadline_at > now())
       AND m.status NOT IN ('finished','tie')
       AND EXISTS (
         SELECT 1 FROM match_track mt WHERE mt.match_id = m.id
       )
       AND EXISTS (
         SELECT 1 FROM tournament_judge tj
         WHERE tj.tournament_id = r.tournament_id AND tj.user_id = $1
       )
       AND NOT EXISTS (
         SELECT 1 FROM judge_assignment ja
         WHERE ja.judge_id = $1 AND ja.match_id = m.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM evaluation e
         WHERE e.judge_id = $1 AND e.target_type = 'match' AND e.target_id = m.id
       )
     ORDER BY r.number ASC, m.starts_at NULLS FIRST, m.id
     LIMIT 1`,
    [judgeId]
  );

  const matchId = candidateRows[0]?.match_id;
  if (!matchId) {
    return null;
  }

  const { rows: insertedRows } = await pool.query(
    `INSERT INTO judge_assignment (judge_id, match_id)
     VALUES ($1, $2)
     ON CONFLICT (judge_id, match_id)
     DO UPDATE
       SET status = 'assigned',
           assigned_at = now()
     RETURNING id`,
    [judgeId, matchId]
  );

  const assignmentId = insertedRows[0]?.id;
  if (!assignmentId) {
    return null;
  }

  const { rows } = await pool.query(
    `SELECT ${assignmentColumns}
     FROM judge_assignment ja
     JOIN match m ON m.id = ja.match_id
     JOIN round r ON r.id = m.round_id
     WHERE ja.id = $1`,
    [assignmentId]
  );
  return rows[0] ?? null;
};

export const listAvailableJudgeBattles = async (judgeId: string, limit = 20) => {
  const { rows } = await pool.query(
    `SELECT
        m.id AS match_id,
        m.status AS match_status,
        m.starts_at,
        r.id AS round_id,
        r.number AS round_number,
        r.kind AS round_kind,
        r.status AS round_status,
        t.id AS tournament_id,
        t.title AS tournament_title
     FROM match m
     JOIN round r ON r.id = m.round_id
     JOIN tournament t ON t.id = r.tournament_id
     WHERE r.status = 'judging'
       AND (r.judging_deadline_at IS NULL OR r.judging_deadline_at > now())
       AND m.status NOT IN ('finished','tie')
       AND EXISTS (
         SELECT 1 FROM match_track mt WHERE mt.match_id = m.id
       )
       AND EXISTS (
         SELECT 1 FROM tournament_judge tj
         WHERE tj.tournament_id = r.tournament_id AND tj.user_id = $1
       )
       AND NOT EXISTS (
         SELECT 1 FROM judge_assignment ja
         WHERE ja.judge_id = $1 AND ja.match_id = m.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM evaluation e
         WHERE e.judge_id = $1 AND e.target_type = 'match' AND e.target_id = m.id
       )
     ORDER BY r.number ASC, m.starts_at NULLS FIRST, m.id
     LIMIT $2`,
    [judgeId, limit],
  );
  return rows;
};

export const updateJudgeAssignmentStatus = async (params: {
  assignmentId: string;
  judgeId: string;
  status: 'completed' | 'skipped';
}) => {
  const { rows: updatedRows } = await pool.query(
    `UPDATE judge_assignment
     SET status = $3
     WHERE id = $1 AND judge_id = $2
     RETURNING id`,
    [params.assignmentId, params.judgeId, params.status]
  );
  const updatedId = updatedRows[0]?.id;
  if (!updatedId) {
    throw new AppError({ status: 404, code: 'assignment_not_found', message: 'Assignment not found.' });
  }
  const { rows } = await pool.query(
    `SELECT ${assignmentColumns}
     FROM judge_assignment ja
     JOIN match m ON m.id = ja.match_id
     JOIN round r ON r.id = m.round_id
     WHERE ja.id = $1`,
    [updatedId]
  );
  return rows[0] ?? null;
};

export const getMatchRound = async (matchId: string) => {
  const { rows } = await pool.query(
    `SELECT m.id, m.round_id
     FROM match m WHERE m.id = $1`,
    [matchId]
  );
  return rows[0] ?? null;
};

export const listJudgeHistory = async (judgeId: string) => {
  const { rows } = await pool.query(
    `SELECT
        e.id,
        e.created_at,
        e.score,
        e.pass,
        e.rubric,
        e.comment,
        m.id AS match_id,
        m.status AS match_status,
        r.id AS round_id,
        r.number AS round_number,
        r.kind AS round_kind,
        t.id AS tournament_id,
        t.title AS tournament_title
     FROM evaluation e
     JOIN match m ON m.id = e.target_id
     JOIN round r ON r.id = m.round_id
     JOIN tournament t ON t.id = r.tournament_id
     WHERE e.judge_id = $1 AND e.target_type = 'match'
     ORDER BY e.created_at DESC
     LIMIT 50`,
    [judgeId]
  );
  return rows;
};

export const searchJudgeBattles = async (judgeId: string, query: string, limit = 10) => {
  const term = `%${query.trim().replace(/\s+/g, '%')}%`;
  const { rows } = await pool.query(
    `SELECT DISTINCT
        m.id AS match_id,
        m.status AS match_status,
        m.starts_at,
        r.id AS round_id,
        r.number AS round_number,
        r.kind AS round_kind,
        r.status AS round_status,
        t.id AS tournament_id,
        t.title AS tournament_title
     FROM match m
     JOIN round r ON r.id = m.round_id
     JOIN tournament t ON t.id = r.tournament_id
     LEFT JOIN match_participant mp ON mp.match_id = m.id
     LEFT JOIN tournament_participant tp ON tp.id = mp.participant_id
     LEFT JOIN app_user u ON u.id = tp.user_id
     WHERE m.status NOT IN ('finished','tie')
       AND EXISTS (
         SELECT 1 FROM tournament_judge tj
         WHERE tj.tournament_id = t.id AND tj.user_id = $1
       )
       AND (
         t.title ILIKE $2 OR u.display_name ILIKE $2
       )
     ORDER BY r.number ASC, m.starts_at NULLS LAST
     LIMIT $3`,
    [judgeId, term, limit]
  );
  return rows;
};

export const assignSpecificBattleToJudge = async (judgeId: string, matchId: string) => {
  const { rows } = await pool.query(
    `SELECT
        m.id,
        m.status AS match_status,
        r.id AS round_id,
        r.status AS round_status,
        r.judging_deadline_at,
        t.id AS tournament_id
     FROM match m
     JOIN round r ON r.id = m.round_id
     JOIN tournament t ON t.id = r.tournament_id
     WHERE m.id = $1`,
    [matchId]
  );
  const match = rows[0];
  if (!match) {
    throw new AppError({ status: 404, code: 'battle_not_found', message: 'Battle not found.' });
  }
  const isChallengeTournament = match.tournament_id === CHALLENGE_TOURNAMENT_ID;
  if (!isChallengeTournament && match.round_status !== 'judging') {
    throw new AppError({ status: 400, code: 'assignment_not_allowed', message: 'Round is not accepting manual judging.' });
  }
  if (!isChallengeTournament) {
    const { rows: judgeRows } = await pool.query(
      `SELECT 1
       FROM tournament_judge
       WHERE tournament_id = $1 AND user_id = $2
       LIMIT 1`,
      [match.tournament_id, judgeId]
    );
    if (!judgeRows[0]) {
      throw new AppError({ status: 403, code: 'not_authorized', message: 'Вы не назначены судьёй в этом турнире.' });
    }
  }
  const now = Date.now();
  if (match.judging_deadline_at && now > new Date(match.judging_deadline_at).getTime()) {
    throw new AppError({ status: 400, code: 'judging_closed', message: 'Дедлайн на судейство истёк.' });
  }
  const { rows: assignmentRows } = await pool.query(
    `INSERT INTO judge_assignment (judge_id, match_id)
     VALUES ($1,$2)
     ON CONFLICT (judge_id, match_id)
     DO UPDATE SET status = 'assigned', assigned_at = now()
     RETURNING id`,
    [judgeId, matchId]
  );
  const assignmentId = assignmentRows[0]?.id;
  if (!assignmentId) {
    throw new AppError({ status: 500, code: 'assignment_failed', message: 'Не удалось назначить баттл.' });
  }
  const { rows: details } = await pool.query(
    `SELECT ${assignmentColumns}
     FROM judge_assignment ja
     JOIN match m ON m.id = ja.match_id
     JOIN round r ON r.id = m.round_id
     WHERE ja.id = $1`,
    [assignmentId]
  );
  return details[0] ?? null;
};

export const getJudgeBattleDetails = async (judgeId: string, matchId: string) => {
  const { rows: matchRows } = await pool.query<{
    id: string;
    round_id: string;
    starts_at: string | null;
    match_status: string;
    ends_at: string | null;
    winner_match_track_id: string | null;
    round_kind: string;
    round_number: number;
    round_scoring: string;
    round_status: string;
    round_strategy: string;
    judging_deadline_at: string | null;
    has_assignment: boolean;
    is_tournament_judge: boolean;
  }>(
    `SELECT
        m.id,
        m.round_id,
        m.starts_at,
        m.status AS match_status,
        m.ends_at,
        m.winner_match_track_id,
        r.kind AS round_kind,
        r.number AS round_number,
        r.scoring AS round_scoring,
        r.status AS round_status,
        r.strategy AS round_strategy,
        r.judging_deadline_at,
        EXISTS (
          SELECT 1 FROM judge_assignment ja
          WHERE ja.judge_id = $1 AND ja.match_id = m.id
        ) AS has_assignment,
        EXISTS (
          SELECT 1 FROM tournament_judge tj
          WHERE tj.tournament_id = r.tournament_id AND tj.user_id = $1
        ) AS is_tournament_judge
     FROM match m
     JOIN round r ON r.id = m.round_id
     WHERE m.id = $2`,
    [judgeId, matchId]
  );

  const match = matchRows[0];
  if (!match) {
    return null;
  }
  if (!match.has_assignment && !match.is_tournament_judge) {
    throw new AppError({ status: 403, code: 'assignment_required', message: 'Judge not assigned to this battle.' });
  }

  const { rows: participantRows } = await pool.query(
    `SELECT
        mp.match_id,
        mp.participant_id,
        mp.seed,
        tp.user_id,
        u.display_name,
        mt.id AS track_id,
        mt.submitted_at,
        mt.lyrics,
        ma.storage_key,
        ma.mime,
        ma.duration_sec,
        scores.avg_total
     FROM match_participant mp
     JOIN tournament_participant tp ON tp.id = mp.participant_id
     JOIN app_user u ON u.id = tp.user_id
     LEFT JOIN match_track mt ON mt.match_id = mp.match_id AND mt.participant_id = mp.participant_id
     LEFT JOIN media_asset ma ON ma.id = mt.audio_id
     LEFT JOIN mv_match_track_scores scores ON scores.match_track_id = mt.id
     WHERE mp.match_id = $1
     ORDER BY mp.seed NULLS LAST, u.display_name`,
    [matchId]
  );

  const participants = participantRows.map((row) => ({
    participant_id: row.participant_id,
    user_id: row.user_id,
    display_name: row.display_name,
    seed: row.seed,
    avg_total_score: row.avg_total !== null && row.avg_total !== undefined ? Number(row.avg_total) : null,
    track: row.track_id
      ? {
          id: row.track_id,
          audio_url: row.storage_key ? resolveCdnUrl(row.storage_key) : null,
          mime: row.mime,
          duration_sec: row.duration_sec !== null && row.duration_sec !== undefined ? Number(row.duration_sec) : null,
          submitted_at: row.submitted_at,
          lyrics: row.lyrics ?? null,
        }
      : null,
  }));

  const { rows: rubricRows } = await pool.query(
    `SELECT
        key,
        name,
        weight,
        min_value,
        max_value,
        position
     FROM round_rubric_criterion
     WHERE round_id = $1
     ORDER BY position NULLS LAST, name`,
    [match.round_id]
  );

  const { rows: evaluationRows } = await pool.query(
    `SELECT pass, score, rubric, total_score, comment
     FROM evaluation
     WHERE judge_id = $1 AND target_type = 'match' AND target_id = $2`,
    [judgeId, matchId]
  );

  return {
    match: {
      id: match.id,
      round_id: match.round_id,
      status: match.match_status,
      starts_at: match.starts_at,
      ends_at: match.ends_at,
      winner_match_track_id: match.winner_match_track_id,
      round: {
        id: match.round_id,
        kind: match.round_kind,
        number: match.round_number,
        scoring: match.round_scoring,
        status: match.round_status,
        strategy: match.round_strategy,
        judging_deadline_at: match.judging_deadline_at,
      },
    },
    participants,
    rubric: rubricRows.map((rubric) => ({
      key: rubric.key,
      name: rubric.name,
      weight: rubric.weight,
      min_value: rubric.min_value,
      max_value: rubric.max_value,
      position: rubric.position,
    })),
    evaluation: evaluationRows[0]
      ? {
          pass: evaluationRows[0].pass,
          score: evaluationRows[0].score,
          rubric: evaluationRows[0].rubric,
          total_score: evaluationRows[0].total_score,
          comment: evaluationRows[0].comment,
        }
      : null,
  };
};
