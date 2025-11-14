import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../../src/db/pool.js';

type TournamentParticipant = {
  tournamentParticipantId: string;
  userId: string;
};

export interface BattleSeedResult {
  currentMatchId: string;
  finishedMatchId: string;
}

export async function seedPublicBattlesFixture(): Promise<BattleSeedResult> {
  const now = new Date();
  const tournamentId = randomUUID();
  const currentRoundId = randomUUID();
  const finishedRoundId = randomUUID();
  const matchCurrentId = randomUUID();
  const matchFinishedId = randomUUID();

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO tournament (id, title, max_bracket_size, status, registration_open_at, submission_deadline_at, judging_deadline_at, public_at)
       VALUES ($1,'Test Battle League',16,'ongoing',now() - INTERVAL '10 days',now() + INTERVAL '5 days',now() + INTERVAL '10 days',now() - INTERVAL '1 day')`,
      [tournamentId]
    );

    await client.query(
      `INSERT INTO round (id, tournament_id, kind, number, scoring, status, starts_at, submission_deadline_at, judging_deadline_at, strategy)
       VALUES
         ($1,$3,'bracket',1,'rubric','judging',now() - INTERVAL '1 day',now() + INTERVAL '3 days',now() + INTERVAL '5 days','weighted'),
         ($2,$3,'bracket',2,'points','finished',now() - INTERVAL '12 days',now() - INTERVAL '8 days',now() - INTERVAL '2 days','majority')`,
      [currentRoundId, finishedRoundId, tournamentId]
    );

    const artists = await Promise.all([
      createArtist(client, {
        email: 'mc-alpha@test.local',
        displayName: 'MC Alpha',
        city: 'Moscow',
        avatar: 'seed/image/mc-alpha.jpg',
      }),
      createArtist(client, {
        email: 'mc-beta@test.local',
        displayName: 'MC Beta',
        city: 'Saint Petersburg',
        avatar: 'seed/image/mc-beta.jpg',
      }),
    ]);

    const participants = await Promise.all(
      artists.map(({ userId }) => registerParticipant(client, tournamentId, userId))
    );

    await createMatchWithTracks({
      client,
      matchId: matchCurrentId,
      roundId: currentRoundId,
      participants,
      status: 'scheduled',
      winnerTrackId: null,
      startsAt: new Date(now.getTime() - 60 * 60 * 1000),
      audioPrefix: 'current',
    });

    const finishedTracks = await createMatchWithTracks({
      client,
      matchId: matchFinishedId,
      roundId: finishedRoundId,
      participants,
      status: 'finished',
      winnerTrackId: null, // placeholder, updated below
      startsAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      audioPrefix: 'finished',
    });

    await client.query(
      `UPDATE match
       SET winner_match_track_id = $2
       WHERE id = $1`,
      [matchFinishedId, finishedTracks.leftTrackId]
    );
  } finally {
    client.release();
  }

  await pool.query(`SELECT refresh_public_views()`).catch(() => undefined);

  return {
    currentMatchId: matchCurrentId,
    finishedMatchId: matchFinishedId,
  };
}

async function createArtist(
  client: import('pg').PoolClient,
  params: { email: string; displayName: string; city: string; avatar: string }
) {
  const passwordHash = await bcrypt.hash('Password123!', 8);
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO app_user (email, password_hash, display_name)
     VALUES ($1,$2,$3)
     RETURNING id`,
    [params.email, passwordHash, params.displayName]
  );
  const userId = rows[0].id;

  await client.query(
    `INSERT INTO app_user_role (user_id, role) VALUES
      ($1,'artist'),
      ($1,'listener')
     ON CONFLICT DO NOTHING`,
    [userId]
  );

  await client.query(
    `INSERT INTO artist_profile (user_id, avatar_key, bio, city, full_name)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id) DO UPDATE
       SET avatar_key = EXCLUDED.avatar_key,
           bio = EXCLUDED.bio,
           city = EXCLUDED.city,
           full_name = EXCLUDED.full_name`,
    [userId, params.avatar, `${params.displayName} bio`, params.city, params.displayName]
  );

  return { userId };
}

async function registerParticipant(
  client: import('pg').PoolClient,
  tournamentId: string,
  userId: string
): Promise<TournamentParticipant> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO tournament_participant (tournament_id, user_id)
     VALUES ($1,$2)
     RETURNING id`,
    [tournamentId, userId]
  );
  return {
    tournamentParticipantId: rows[0].id,
    userId,
  };
}

async function createMatchWithTracks(options: {
  client: import('pg').PoolClient;
  matchId: string;
  roundId: string;
  participants: TournamentParticipant[];
  status: string;
  winnerTrackId: string | null;
  startsAt: Date;
  endsAt?: Date;
  audioPrefix: string;
}) {
  const { client, matchId, roundId, participants, status, startsAt, endsAt, audioPrefix } =
    options;
  const [left, right] = participants;

  const leftAudioId = randomUUID();
  const rightAudioId = randomUUID();
  const leftTrackId = randomUUID();
  const rightTrackId = randomUUID();

  await client.query(
    `INSERT INTO match (id, round_id, starts_at, ends_at, status, winner_match_track_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [matchId, roundId, startsAt, endsAt ?? null, status, options.winnerTrackId]
  );

  await client.query(
    `INSERT INTO match_participant (match_id, participant_id, seed)
     VALUES
       ($1,$2,1),
       ($1,$3,2)`,
    [matchId, left.tournamentParticipantId, right.tournamentParticipantId]
  );

  await client.query(
    `INSERT INTO media_asset (id, kind, storage_key, mime, size_bytes, duration_sec, status)
     VALUES
       ($1,'audio',$3,'audio/mpeg',512000,180,'ready'),
       ($2,'audio',$4,'audio/mpeg',502000,175,'ready')`,
    [
      leftAudioId,
      rightAudioId,
      `seed/audio/${audioPrefix}-left.mp3`,
      `seed/audio/${audioPrefix}-right.mp3`,
    ]
  );

  await client.query(
    `INSERT INTO match_track (id, match_id, participant_id, audio_id, lyrics, submitted_at)
     VALUES
       ($1,$3,$5,$7,$9,now() - INTERVAL '3 hours'),
       ($2,$4,$6,$8,$10,now() - INTERVAL '2 hours')`,
    [
      leftTrackId,
      rightTrackId,
      matchId,
      matchId,
      left.tournamentParticipantId,
      right.tournamentParticipantId,
      leftAudioId,
      rightAudioId,
      `${audioPrefix.toUpperCase()} left verse`,
      `${audioPrefix.toUpperCase()} right verse`,
    ]
  );

  return { leftTrackId, rightTrackId };
}
