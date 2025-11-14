import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool.js';
import { AppError, mapDbError } from '../lib/errors.js';
import { normalizeUserRoles, roleOrderSqlLiteral } from '../lib/roles.js';
import { resolveCdnUrl } from './media.js';

export type ProfileChangePayload = {
  bio?: string;
  city?: string;
  full_name?: string;
  vk_id?: string;
  avatar_key?: string;
  age?: number;
  socials?: Record<string, unknown>;
  display_name?: string;
};

export const createProfileChangeRequest = async (userId: string, changes: ProfileChangePayload) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO profile_change_request(id, user_id, changes, created_at, updated_at)
       VALUES ($1,$2,$3::jsonb,now(),now())
       RETURNING id, status`,
      [randomUUID(), userId, JSON.stringify(changes)]
    );
    return rows[0];
  } catch (err) {
    throw mapDbError(err);
  }
};

export const listProfileChangeRequests = async (params: { status?: string; limit?: number }) => {
  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 50) : 20;
  const filters: string[] = [];
  const values: unknown[] = [];
  if (params.status) {
    filters.push(`status = $${values.length + 1}`);
    values.push(params.status);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT id, user_id, changes, status, created_at
     FROM profile_change_request
     ${where}
     ORDER BY created_at DESC
     LIMIT $${values.length + 1}`,
    [...values, limit]
  );
  return rows;
};

export const moderatorResolveProfileChange = async (params: {
  requestId: string;
  moderatorId: string;
  status: 'approved' | 'rejected';
  rejectReason?: string;
}) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE profile_change_request
       SET status=$1,
           moderator_id=$2,
           reviewed_at=now(),
           reject_reason=$3,
           updated_at=now()
       WHERE id=$4`,
      [params.status, params.moderatorId, params.rejectReason ?? null, params.requestId]
    );
    if (rowCount === 0) {
      throw new AppError({ status: 404, code: 'profile_change_not_found', message: 'Profile change request not found.' });
    }
  } catch (err) {
    throw mapDbError(err);
  }
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  avatar_key: string | null;
  bio: string | null;
  socials: Record<string, unknown> | null;
  city: string | null;
  age: number | null;
  vk_id: string | null;
  full_name: string | null;
  roles: unknown;
};

export type ProfileView = {
  id: string;
  display_name: string;
  roles: string[];
  avatar: { key: string; url: string } | null;
  bio: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
  viewer_context: {
    is_self: boolean;
    can_edit: boolean;
    can_moderate: boolean;
    can_view_private: boolean;
  };
  email?: string;
  age?: number | null;
  vk_id?: string | null;
  full_name?: string | null;
  socials?: Record<string, unknown>;
};

const fetchProfileRow = async (userId: string) => {
  const { rows } = await pool.query<ProfileRow>(
    `SELECT
       u.id,
       u.email,
       u.display_name,
       u.created_at,
       u.updated_at,
       ap.avatar_key,
       ap.bio,
       ap.socials,
       ap.city,
       ap.age,
       ap.vk_id,
       ap.full_name,
       COALESCE(
         (
           SELECT json_agg(role ORDER BY array_position(${roleOrderSqlLiteral}, role))
           FROM (
             SELECT DISTINCT aur.role AS role
             FROM app_user_role aur
             WHERE aur.user_id = u.id
           ) ordered_roles
         ),
         '[]'::json
       ) AS roles
     FROM app_user u
     LEFT JOIN artist_profile ap ON ap.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0] ?? null;
};

const normalizeRoles = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return normalizeUserRoles(value);
  }
  if (typeof value === 'string') {
    const parsed = value
      .replace(/^\{|\}$/g, '')
      .split(',')
      .map((role) => role.replace(/"/g, '').trim())
      .filter(Boolean);
    return normalizeUserRoles(parsed);
  }
  if (typeof value === 'object' && value !== null && Symbol.iterator in (value as Record<string, unknown>)) {
    try {
      return normalizeUserRoles(value as Iterable<unknown>);
    } catch {
      return [];
    }
  }
  return [];
};

const toProfileView = (row: ProfileRow, viewer: { id: string | null; roles: string[] }): ProfileView => {
  const isSelf = viewer.id != null && viewer.id === row.id;
  const viewerRoles = new Set(viewer.roles);
  const isModerator = viewerRoles.has('admin') || viewerRoles.has('moderator');
  const canViewPrivate = isSelf || isModerator;

  const roles = normalizeRoles(row.roles);
  const publicRoles = roles.filter((role) => role !== 'listener');
  const exposedRoles = canViewPrivate || publicRoles.length === 0 ? roles : publicRoles;

  const base: ProfileView = {
    id: row.id,
    display_name: row.display_name,
    roles: exposedRoles,
    avatar: row.avatar_key ? { key: row.avatar_key, url: resolveCdnUrl(row.avatar_key) } : null,
    bio: row.bio,
    city: row.city,
    created_at: row.created_at,
    updated_at: row.updated_at,
    viewer_context: {
      is_self: isSelf,
      can_edit: isSelf,
      can_moderate: isModerator,
      can_view_private: canViewPrivate,
    },
  };

  if (canViewPrivate) {
    base.email = row.email;
    base.age = row.age;
    base.vk_id = row.vk_id;
    base.full_name = row.full_name;
    base.socials = row.socials ?? undefined;
  }

  return base;
};

export const getProfileForViewer = async (params: { targetUserId: string; viewerId?: string | null; viewerRoles?: string[] }) => {
  const row = await fetchProfileRow(params.targetUserId);
  if (!row) {
    return null;
  }
  return toProfileView(row, { id: params.viewerId ?? null, roles: params.viewerRoles ?? [] });
};

export const getOwnProfile = async (userId: string, roles: string[]) => {
  const row = await fetchProfileRow(userId);
  if (!row) {
    throw new AppError({ status: 404, code: 'profile_not_found', message: 'Profile not found.' });
  }
  return toProfileView(row, { id: userId, roles });
};

export const getProfileChangeRequestById = async (requestId: string) => {
  const { rows } = await pool.query(
    `SELECT pcr.id,
            pcr.user_id,
            pcr.changes,
            pcr.status,
            pcr.moderator_id,
            pcr.reject_reason,
            pcr.created_at,
            pcr.updated_at,
            pcr.reviewed_at,
            u.display_name,
            u.email
     FROM profile_change_request pcr
     JOIN app_user u ON u.id = pcr.user_id
     WHERE pcr.id = $1`,
    [requestId]
  );
  return rows[0] ?? null;
};

const PROFILE_HIGHLIGHTS_LIMIT = 8;

export type ProfileBattleResult = "win" | "loss" | "draw" | "pending";

export type ProfileBattleParticipant = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_self: boolean;
  seed: number | null;
};

export type ProfileBattleSummary = {
  id: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  round: {
    id: string;
    number: number;
    kind: string;
    status: string;
  };
  tournament: {
    id: string;
    title: string;
  };
  participants: ProfileBattleParticipant[];
};

export type ProfileParticipantBattle = ProfileBattleSummary & {
  result: ProfileBattleResult;
};

export type ProfileJudgedBattle = ProfileBattleSummary & {
  evaluated_at: string;
};

export type ProfileHighlights = {
  stats: {
    wins: number;
    losses: number;
    slivs: number;
  };
  participated_battles: ProfileParticipantBattle[];
  judged_battles: ProfileJudgedBattle[];
};

type BattleRow = {
  id: string;
  status: string;
  starts_at: Date | null;
  ends_at: Date | null;
  round_id: string;
  round_number: number;
  round_kind: string;
  round_status: string;
  tournament_id: string;
  tournament_title: string;
  winner_user_id: string | null;
};

type JudgedBattleRow = {
  id: string;
  status: string;
  starts_at: Date | null;
  ends_at: Date | null;
  round_id: string;
  round_number: number;
  round_kind: string;
  round_status: string;
  tournament_id: string;
  tournament_title: string;
  evaluated_at: Date;
};

const toBattleSummary = (row: BattleRow): ProfileBattleSummary => ({
  id: row.id,
  status: row.status,
  starts_at: row.starts_at ? row.starts_at.toISOString() : null,
  ends_at: row.ends_at ? row.ends_at.toISOString() : null,
  round: {
    id: row.round_id,
    number: row.round_number,
    kind: row.round_kind,
    status: row.round_status,
  },
  tournament: {
    id: row.tournament_id,
    title: row.tournament_title,
  },
  participants: [],
});

const toJudgedBattleSummary = (row: JudgedBattleRow): ProfileJudgedBattle => ({
  ...toBattleSummary(row),
  evaluated_at: row.evaluated_at.toISOString(),
});

const isFinishedMatch = (status: string) => status === "finished" || status === "tie";

export const getProfileHighlights = async (userId: string) => {
  const [statsResult, participantResult, judgedResult] = await Promise.all([
    pool.query<{ wins: number; losses: number; slivs: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN m.status = 'finished' AND wp.user_id = $1 THEN 1 ELSE 0 END), 0) AS wins,
         COALESCE(SUM(CASE WHEN m.status = 'finished' AND wp.user_id IS NOT NULL AND wp.user_id <> $1 THEN 1 ELSE 0 END), 0) AS losses,
         COALESCE(SUM(CASE WHEN m.status = 'tie' OR (m.status = 'finished' AND wp.user_id IS NULL) THEN 1 ELSE 0 END), 0) AS slivs
       FROM match m
       JOIN match_participant mp ON mp.match_id = m.id
       JOIN tournament_participant tp ON tp.id = mp.participant_id
       LEFT JOIN match_track wt ON wt.id = m.winner_match_track_id
       LEFT JOIN tournament_participant wp ON wp.id = wt.participant_id
       WHERE tp.user_id = $1`,
      [userId],
    ),
    pool.query<BattleRow>(
      `SELECT
         m.id,
         m.status,
         m.starts_at,
         m.ends_at,
         r.id AS round_id,
         r.number AS round_number,
         r.kind AS round_kind,
         r.status AS round_status,
         t.id AS tournament_id,
         t.title AS tournament_title,
         wp.user_id AS winner_user_id
       FROM match m
       JOIN round r ON r.id = m.round_id
       JOIN tournament t ON t.id = r.tournament_id
       JOIN match_participant mp ON mp.match_id = m.id
       JOIN tournament_participant tp ON tp.id = mp.participant_id
       LEFT JOIN match_track wt ON wt.id = m.winner_match_track_id
       LEFT JOIN tournament_participant wp ON wp.id = wt.participant_id
       WHERE tp.user_id = $1
       ORDER BY m.starts_at DESC NULLS LAST, m.id
       LIMIT $2`,
      [userId, PROFILE_HIGHLIGHTS_LIMIT],
    ),
    pool.query<JudgedBattleRow>(
      `SELECT
         m.id,
         m.status,
         m.starts_at,
         m.ends_at,
         r.id AS round_id,
         r.number AS round_number,
         r.kind AS round_kind,
         r.status AS round_status,
         t.id AS tournament_id,
         t.title AS tournament_title,
         e.created_at AS evaluated_at
       FROM evaluation e
       JOIN match m ON m.id = e.target_id AND e.target_type = 'match'
       JOIN round r ON r.id = m.round_id
       JOIN tournament t ON t.id = r.tournament_id
       WHERE e.judge_id = $1
       ORDER BY e.created_at DESC
       LIMIT $2`,
      [userId, PROFILE_HIGHLIGHTS_LIMIT],
    ),
  ]);

  const stats = statsResult.rows[0] ?? { wins: 0, losses: 0, slivs: 0 };
  const participatedRows = participantResult.rows;
  const judgedRows = judgedResult.rows;

  const matchIds = Array.from(
    new Set([...participatedRows.map((row) => row.id), ...judgedRows.map((row) => row.id)]),
  );
  const participantsMap = new Map<string, ProfileBattleParticipant[]>();

  if (matchIds.length > 0) {
    const { rows } = await pool.query<{
      match_id: string;
      user_id: string;
      display_name: string;
      avatar_key: string | null;
      seed: number | null;
    }>(
      `SELECT
         mp.match_id,
         tp.user_id,
         u.display_name,
         ap.avatar_key,
         mp.seed
       FROM match_participant mp
       JOIN tournament_participant tp ON tp.id = mp.participant_id
       JOIN app_user u ON u.id = tp.user_id
       LEFT JOIN artist_profile ap ON ap.user_id = tp.user_id
       WHERE mp.match_id = ANY($1::uuid[])
       ORDER BY mp.match_id, mp.seed NULLS LAST, u.display_name`,
      [matchIds],
    );

    for (const row of rows) {
      const participant: ProfileBattleParticipant = {
        user_id: row.user_id,
        display_name: row.display_name,
        avatar_url: row.avatar_key ? resolveCdnUrl(row.avatar_key) : null,
        is_self: row.user_id === userId,
        seed: row.seed,
      };
      const bucket = participantsMap.get(row.match_id);
      if (bucket) {
        bucket.push(participant);
      } else {
        participantsMap.set(row.match_id, [participant]);
      }
    }
  }

  const participatedBattles: ProfileParticipantBattle[] = participatedRows.map((row) => {
    const summary = toBattleSummary(row);
    const result: ProfileBattleResult = isFinishedMatch(row.status)
      ? row.winner_user_id
        ? row.winner_user_id === userId
          ? "win"
          : "loss"
        : "draw"
      : "pending";
    summary.participants = participantsMap.get(row.id) ?? [];
    return { ...summary, result };
  });

  const judgedBattles: ProfileJudgedBattle[] = judgedRows.map((row) => {
    const summary = toJudgedBattleSummary(row);
    summary.participants = participantsMap.get(row.id) ?? [];
    return summary;
  });

  return {
    stats: {
      wins: stats.wins ?? 0,
      losses: stats.losses ?? 0,
      slivs: stats.slivs ?? 0,
    },
    participated_battles: participatedBattles,
    judged_battles: judgedBattles,
  };
};
