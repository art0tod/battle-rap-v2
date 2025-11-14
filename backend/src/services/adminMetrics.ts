import { pool } from '../db/pool.js';

export const getAdminOverview = async () => {
  const [applicationStats, submissionStats, upcomingRounds, missingTracks] = await Promise.all([
    pool.query<{ pending: number }>(
      `SELECT COUNT(*) FILTER (WHERE status IN ('submitted','under_review'))::int AS pending
       FROM participation_application`
    ),
    pool.query<{ submitted: number; approved: number }>(
      `SELECT
          COUNT(*) FILTER (WHERE status = 'submitted')::int AS submitted,
          COUNT(*) FILTER (WHERE status = 'approved')::int AS approved
       FROM submission`
    ),
    pool.query<{
      id: string;
      tournament_id: string;
      kind: string;
      number: number;
      status: string;
      submission_deadline_at: string | null;
      judging_deadline_at: string | null;
    }>(
      `SELECT id, tournament_id, kind, number, status, submission_deadline_at, judging_deadline_at
       FROM round
       WHERE (submission_deadline_at BETWEEN now() AND now() + INTERVAL '7 days')
          OR (judging_deadline_at BETWEEN now() AND now() + INTERVAL '7 days')
       ORDER BY submission_deadline_at NULLS LAST, judging_deadline_at NULLS LAST`
    ),
    pool.query<{
      match_id: string;
      round_id: string;
      round_kind: string;
      round_number: number;
      submission_deadline_at: string | null;
    }>(
      `SELECT
          m.id AS match_id,
          r.id AS round_id,
          r.kind AS round_kind,
          r.number AS round_number,
          r.submission_deadline_at
       FROM match m
       JOIN round r ON r.id = m.round_id
       WHERE r.status = 'submission'
         AND r.submission_deadline_at IS NOT NULL
         AND r.submission_deadline_at < now()
         AND NOT EXISTS (
           SELECT 1 FROM match_track mt
           WHERE mt.match_id = m.id
         )
       ORDER BY r.submission_deadline_at ASC`
    ),
  ]);

  return {
    metrics: {
      applications_pending: applicationStats.rows[0]?.pending ?? 0,
      submissions_submitted: submissionStats.rows[0]?.submitted ?? 0,
      submissions_approved: submissionStats.rows[0]?.approved ?? 0,
    },
    upcoming_round_deadlines: upcomingRounds.rows,
    problematic_matches: missingTracks.rows,
  };
};
