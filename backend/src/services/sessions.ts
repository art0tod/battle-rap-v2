import { pool } from '../db/pool.js';
import { env } from '../config/env.js';
import { mapDbError } from '../lib/errors.js';
import { parseDurationSeconds } from '../lib/time.js';

export type AuthSessionRow = {
  refresh_jti: string;
  user_id: string;
  fingerprint: string;
  expires_at: string;
  revoked_at: string | null;
};

const REFRESH_TTL_SECONDS = parseDurationSeconds(env.JWT_REFRESH_TTL);

const buildExpiresAt = () => new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

export const createSession = async (params: {
  userId: string;
  jti: string;
  fingerprint: string;
}) => {
  try {
    await pool.query(
      `INSERT INTO auth_session(refresh_jti, user_id, fingerprint, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [params.jti, params.userId, params.fingerprint, buildExpiresAt()],
    );
  } catch (error) {
    throw mapDbError(error);
  }
};

export const getSessionByJti = async (jti: string): Promise<AuthSessionRow | null> => {
  const { rows } = await pool.query<AuthSessionRow>(
    `SELECT refresh_jti, user_id, fingerprint, expires_at, revoked_at
     FROM auth_session
     WHERE refresh_jti = $1`,
    [jti],
  );
  return rows[0] ?? null;
};

export const consumeSession = async (jti: string, fingerprint: string): Promise<AuthSessionRow | null> => {
  const session = await getSessionByJti(jti);
  if (!session) {
    return null;
  }

  const now = new Date();
  if (session.revoked_at || new Date(session.expires_at) <= now || session.fingerprint !== fingerprint) {
    return null;
  }

  try {
    await pool.query(
      `UPDATE auth_session
       SET revoked_at = now()
       WHERE refresh_jti = $1 AND revoked_at IS NULL`,
      [jti],
    );
  } catch (error) {
    throw mapDbError(error);
  }

  return session;
};

export const revokeSession = async (jti: string) => {
  try {
    await pool.query(
      `UPDATE auth_session
       SET revoked_at = now()
       WHERE refresh_jti = $1 AND revoked_at IS NULL`,
      [jti],
    );
  } catch (error) {
    throw mapDbError(error);
  }
};
