export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

export type PaginatedResponse<T> = PaginationMeta & {
  data: T[];
};

export type AuthUser = {
  id: string;
  email?: string;
  display_name: string;
  roles: string[];
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
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

export type ProfileBattleResult = "win" | "loss" | "draw" | "pending";

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

export type TournamentSummary = {
  id: string;
  title: string;
  status: string;
  registration_open_at: string | null;
  submission_deadline_at: string | null;
  judging_deadline_at: string | null;
  public_at: string | null;
};

export type RoundSummary = {
  id: string;
  tournament_id: string;
  kind: string;
  number: number;
  scoring: string;
  status: string;
  starts_at: string | null;
  submission_deadline_at: string | null;
  judging_deadline_at: string | null;
  strategy: string | null;
};

export type MatchSummary = {
  id: string;
  round_id: string;
  starts_at: string | null;
  status: string;
  ends_at: string | null;
  winner_match_track_id: string | null;
};

export type TournamentDetailResponse = {
  tournament: TournamentSummary;
  rounds: RoundSummary[];
};

export type RoundDetailResponse = {
  round: RoundSummary & { tournament_title: string };
  matches: MatchSummary[];
};

export type RoundOverviewMatchTrack = {
  participant_id: string;
  user_id: string;
  display_name: string;
  seed: number | null;
  result_status: string | null;
  avg_total_score: number | null;
  track: {
    id: string;
    audio_key: string | null;
    audio_url: string | null;
    mime: string | null;
    duration_sec: number | null;
    submitted_at: string | null;
    lyrics: string | null;
  } | null;
};

export type RoundOverviewMatch = {
  id: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  winner_match_track_id: string | null;
  participants: RoundOverviewMatchTrack[];
};

export type RoundOverviewSummary = {
  total_matches: number;
  total_tracks: number;
  total_reviews: number;
  mode: string;
};

export type RoundOverviewResponse = {
  round: RoundSummary & { tournament_title: string };
  mode: string;
  matches: RoundOverviewMatch[];
  rubric: Array<{
    key: string;
    name: string;
    weight: number;
    min_value: number;
    max_value: number;
    position: number | null;
  }>;
  summary: RoundOverviewSummary;
};

export type BattleParticipant = {
  participant_id: string;
  user_id: string;
  display_name: string;
  seed: number | null;
  result_status: string | null;
  avg_total_score: number | null;
  city?: string | null;
  age?: number | null;
  avatar?: { key: string; url: string } | null;
  track: {
    id: string;
    audio_key: string | null;
    audio_url: string | null;
    mime: string | null;
    duration_sec: number | null;
    submitted_at: string | null;
    lyrics: string | null;
    likes?: number | null;
  } | null;
};

export type PublicBattle = {
  id: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  winner_match_track_id: string | null;
  round: {
    id: string;
    number: number;
    kind: string;
    status: string;
    scoring: string;
    strategy: string;
    judging_deadline_at: string | null;
  };
  tournament: {
    id: string;
    title: string;
  };
  engagement: {
    comments: number;
  };
  participants: BattleParticipant[];
};

export type BattleDetail = {
  id: string;
  round_id: string;
  starts_at: string | null;
  status: string;
  ends_at: string | null;
  winner_match_track_id: string | null;
  engagement: {
    comments: number;
  };
};

export type BattleTracksResponse = {
  match_id: string;
  tracks: Array<{
    id: string;
    participant_id: string;
    audio_url: string | null;
    mime: string;
    duration_sec: number | null;
    submitted_at: string;
    avg_total: number | null;
  }>;
};

export type LeaderboardEntry = {
  tournament_id: string;
  participant_id: string;
  wins: number;
};

export type ParticipantSummary = {
  id: string;
  display_name: string;
  roles: string[];
  city: string | null;
  full_name: string | null;
  joined_at: string;
  avatar: { key: string; url: string } | null;
  avg_total_score: number | null;
  total_wins: number;
};

export type ActiveApplicationRound = {
  id: string;
  kind: string;
  number: number;
  status: string;
  starts_at: string | null;
  submission_deadline_at: string | null;
  tournament_id: string;
  tournament_title: string;
};

export type ApplicationRecord = {
  id: string;
  user_id: string;
  round_id: string;
  status: string;
  city: string | null;
  age: number | null;
  vk_id: string | null;
  full_name: string | null;
  beat_author: string | null;
  audio_id: string | null;
  lyrics: string | null;
  created_at: string;
};

export type ApplicationAdmin = {
  id: string;
  user_id: string;
  round_id: string;
  status: string;
  city: string | null;
  age: number | null;
  vk_id: string | null;
  full_name: string | null;
  beat_author: string | null;
  audio_id: string | null;
  lyrics?: string | null;
  created_at: string;
  updated_at?: string;
  display_name?: string;
  email?: string;
};

export type ChallengeStatus = "initiated" | "in_progress" | "completed" | "cancelled";

export type ChallengeResponse = {
  user_id: string;
  audio_id: string;
  audio_url: string | null;
  description: string | null;
  submitted_at: string;
};

export type Challenge = {
  id: string;
  title: string;
  description: string | null;
  status: ChallengeStatus | string;
  timestamps: {
    created_at: string;
    updated_at: string;
    accepted_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
  };
  initiator: {
    id: string;
    display_name: string;
  };
  opponent: {
    id: string;
    display_name: string;
  };
  votes: {
    initiator: number;
    opponent: number;
  };
  responses?: {
    initiator: ChallengeResponse | null;
    opponent: ChallengeResponse | null;
  };
};

export type AdminOverview = {
  metrics: {
    applications_pending: number;
    submissions_submitted: number;
    submissions_approved: number;
  };
  upcoming_round_deadlines: Array<{
    id: string;
    tournament_id: string;
    kind: string;
    number: number;
    status: string;
    submission_deadline_at: string | null;
    judging_deadline_at: string | null;
  }>;
  problematic_matches: Array<{
    match_id: string;
    round_id: string;
    round_kind: string;
    round_number: number;
    submission_deadline_at: string | null;
  }>;
};

export type AdminTournament = {
  id: string;
  title: string;
  status: string;
  max_bracket_size: number | null;
  registration_open_at: string | null;
  submission_deadline_at: string | null;
  judging_deadline_at: string | null;
  public_at: string | null;
};

export type AdminBattleParticipant = {
  participant_id: string;
  user_id: string;
  display_name: string;
  seed: number | null;
  city: string | null;
  age: number | null;
  avatar: { key: string; url: string | null } | null;
};

export type AdminBattle = {
  id: string;
  round_id: string;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  winner_match_track_id: string | null;
  round: {
    id: string;
    number: number;
    kind: string;
    status: string;
    scoring: string;
    strategy: string;
  };
  tournament: {
    id: string;
    title: string;
  };
  participants: AdminBattleParticipant[];
};

export type MediaPresignResponse = {
  assetId: string;
  storageKey: string;
  uploadUrl: string;
  headers: Record<string, string>;
};

export type MediaAssetStatus = {
  id: string;
  status: string;
};

export type JudgeAssignment = {
  id: string;
  match_id: string;
  status: string;
  assigned_at: string;
  round_id: string;
  round_number: number;
  round_kind: string;
  round_status: string;
  match_status: string;
  judging_deadline_at: string | null;
};

export type JudgeBattleParticipant = {
  participant_id: string;
  user_id: string;
  display_name: string;
  seed: number | null;
  avg_total_score: number | null;
  track: {
    id: string;
    audio_url: string | null;
    mime: string | null;
    duration_sec: number | null;
    submitted_at: string | null;
    lyrics: string | null;
  } | null;
};

export type JudgeBattleDetails = {
  match: {
    id: string;
    round_id: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    winner_match_track_id: string | null;
    round: {
      id: string;
      kind: string;
      number: number;
      scoring: string;
      status: string;
      strategy: string;
      judging_deadline_at: string | null;
    };
  };
  participants: JudgeBattleParticipant[];
  rubric: Array<{
    key: string;
    name: string;
    weight: number;
    min_value: number;
    max_value: number;
    position: number | null;
  }>;
  evaluation: {
    pass: boolean | null;
    score: number | null;
    rubric: Record<string, number> | null;
    total_score: number | null;
    comment: string | null;
  } | null;
};

export type JudgeHistoryEntry = {
  id: string;
  created_at: string;
  score: number | null;
  pass: boolean | null;
  rubric: Record<string, number> | null;
  comment: string | null;
  match_id: string;
  match_status: string;
  round_id: string;
  round_number: number;
  round_kind: string;
  tournament_id: string;
  tournament_title: string;
};
