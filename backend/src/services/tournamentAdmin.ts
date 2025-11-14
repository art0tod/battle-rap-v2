import { pool } from '../db/pool.js';
import { mapDbError } from '../lib/errors.js';

export const listAdminTournaments = async () => {
  const { rows } = await pool.query(
    `SELECT id, title, status, max_bracket_size, registration_open_at, submission_deadline_at, judging_deadline_at, public_at
     FROM tournament
     ORDER BY created_at DESC`
  );
  return rows;
};

export const createAdminTournament = async (payload: {
  title: string;
  max_bracket_size?: number | null;
  status?: string;
  registration_open_at?: string | null;
  submission_deadline_at?: string | null;
  judging_deadline_at?: string | null;
  public_at?: string | null;
}) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO tournament(title, max_bracket_size, status, registration_open_at, submission_deadline_at, judging_deadline_at, public_at)
       VALUES ($1,$2,COALESCE($3,'draft'),$4,$5,$6,$7)
       RETURNING id, title, status, max_bracket_size, registration_open_at, submission_deadline_at, judging_deadline_at, public_at`,
      [
        payload.title,
        payload.max_bracket_size ?? null,
        payload.status ?? null,
        payload.registration_open_at ?? null,
        payload.submission_deadline_at ?? null,
        payload.judging_deadline_at ?? null,
        payload.public_at ?? null,
      ]
    );
    return rows[0];
  } catch (err) {
    throw mapDbError(err);
  }
};

export const updateAdminTournament = async (
  id: string,
  payload: Partial<{
    title: string;
    max_bracket_size: number | null;
    status: string;
    registration_open_at: string | null;
    submission_deadline_at: string | null;
    judging_deadline_at: string | null;
    public_at: string | null;
  }>
) => {
  const fields = Object.entries(payload).filter(([, value]) => value !== undefined);
  if (!fields.length) {
    const { rows } = await pool.query(
      `SELECT id, title, status, max_bracket_size, registration_open_at, submission_deadline_at, judging_deadline_at, public_at
       FROM tournament WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }
  const sets: string[] = [];
  const values: unknown[] = [];
  fields.forEach(([key, value]) => {
    values.push(value);
    sets.push(`${key} = $${values.length}`);
  });
  values.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE tournament
       SET ${sets.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, title, status, max_bracket_size, registration_open_at, submission_deadline_at, judging_deadline_at, public_at`,
      values
    );
    return rows[0] ?? null;
  } catch (err) {
    throw mapDbError(err);
  }
};

export const createAdminRound = async (payload: {
  tournament_id: string;
  kind: string;
  number: number;
  scoring: string;
  status?: string;
  rubric_keys?: string[] | null;
  starts_at?: string | null;
  submission_deadline_at?: string | null;
  judging_deadline_at?: string | null;
  strategy?: string;
}) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO round(tournament_id, kind, number, scoring, status, rubric_keys, starts_at, submission_deadline_at, judging_deadline_at, strategy)
       VALUES ($1,$2,$3,$4,COALESCE($5,'draft'),$6,$7,$8,$9,COALESCE($10,'weighted'))
       RETURNING *`,
      [
        payload.tournament_id,
        payload.kind,
        payload.number,
        payload.scoring,
        payload.status ?? null,
        payload.rubric_keys ?? null,
        payload.starts_at ?? null,
        payload.submission_deadline_at ?? null,
        payload.judging_deadline_at ?? null,
        payload.strategy ?? null,
      ]
    );
    return rows[0];
  } catch (err) {
    throw mapDbError(err);
  }
};

export const updateAdminRound = async (
  id: string,
  payload: Partial<{
    kind: string;
    number: number;
    scoring: string;
    status: string;
    rubric_keys: string[] | null;
    starts_at: string | null;
    submission_deadline_at: string | null;
    judging_deadline_at: string | null;
    strategy: string;
  }>
) => {
  const fields = Object.entries(payload).filter(([, value]) => value !== undefined);
  if (!fields.length) {
    const { rows } = await pool.query(`SELECT * FROM round WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }
  const sets: string[] = [];
  const values: unknown[] = [];
  fields.forEach(([key, value]) => {
    values.push(value);
    sets.push(`${key} = $${values.length}`);
  });
  values.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE round
       SET ${sets.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
    return rows[0] ?? null;
  } catch (err) {
    throw mapDbError(err);
  }
};

export const deleteAdminRound = async (id: string) => {
  await pool.query(`DELETE FROM round WHERE id = $1`, [id]);
};
