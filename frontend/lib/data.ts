import { apiFetch, withQuery } from "@/lib/api";
import type {
  ActiveApplicationRound,
  AdminBattle,
  AdminOverview,
  AdminTournament,
  ApplicationAdmin,
  ApplicationRecord,
  BattleDetail,
  BattleTracksResponse,
  Challenge,
  JudgeAssignment,
  JudgeBattleDetails,
  JudgeHistoryEntry,
  LeaderboardEntry,
  MediaAssetStatus,
  MediaPresignResponse,
  PaginatedResponse,
  ParticipantSummary,
  ProfileHighlights,
  ProfileView,
  PublicBattle,
  RoundDetailResponse,
  RoundOverviewResponse,
  TournamentDetailResponse,
  TournamentSummary,
} from "@/lib/types";

const DEFAULT_REVALIDATE_SECONDS = 30;

export const fetchTournaments = async (params?: {
  page?: number;
  status?: string;
  limit?: number;
}) =>
  apiFetch<PaginatedResponse<TournamentSummary>>(withQuery("/tournaments", params), {
    next: { revalidate: DEFAULT_REVALIDATE_SECONDS },
  });

export const fetchTournamentDetail = async (id: string) =>
  apiFetch<TournamentDetailResponse>(`/tournaments/${id}`, {
    next: { revalidate: DEFAULT_REVALIDATE_SECONDS },
  });

export const fetchRoundDetail = async (id: string) =>
  apiFetch<RoundDetailResponse>(`/rounds/${id}`, {
    next: { revalidate: DEFAULT_REVALIDATE_SECONDS },
  });

export const fetchRoundOverview = async (id: string) =>
  apiFetch<RoundOverviewResponse>(`/rounds/${id}/overview`, {
    next: { revalidate: DEFAULT_REVALIDATE_SECONDS },
  });

export const fetchBattles = async (params?: {
  status?: "current" | "finished";
  limit?: number;
}) =>
  apiFetch<{ battles: PublicBattle[] }>(withQuery("/battles", params), {
    next: { revalidate: 15 },
  });

export const fetchBattleDetail = async (id: string) =>
  apiFetch<BattleDetail>(`/battles/${id}`, {
    next: { revalidate: 10 },
  });

export const fetchBattleTracks = async (id: string) =>
  apiFetch<BattleTracksResponse>(`/battles/${id}/tracks`, {
    next: { revalidate: 10 },
  });

export const likeTrack = async (token: string, matchTrackId: string) =>
  apiFetch(`/engagement/likes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ match_track_id: matchTrackId }),
  });

export const unlikeTrack = async (token: string, matchTrackId: string) =>
  apiFetch(`/engagement/likes/${matchTrackId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const fetchArtists = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  sort?: string;
}) =>
  apiFetch<PaginatedResponse<ParticipantSummary>>(withQuery("/artists", params), {
    next: { revalidate: DEFAULT_REVALIDATE_SECONDS },
  });

export const fetchActiveApplicationRound = async () =>
  apiFetch<ActiveApplicationRound | null>("/rounds/application-target", {
    cache: "no-store",
  });

export const fetchChallenges = async () =>
  apiFetch<Challenge[]>("/challenges", {
    next: { revalidate: 10 },
  });

export const fetchChallenge = async (id: string) =>
  apiFetch<Challenge>(`/challenges/${id}`, {
    next: { revalidate: 10 },
  });

export const fetchAdminOverview = async (token: string) =>
  apiFetch<AdminOverview>("/admin/overview", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const fetchAdminTournaments = async (token: string) =>
  apiFetch<AdminTournament[]>("/admin/tournaments", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const fetchAdminBattles = async (token: string, params?: { page?: number; limit?: number; status?: string }) =>
  apiFetch<PaginatedResponse<AdminBattle>>(withQuery("/admin/battles", params), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const fetchLeaderboard = async (tournamentId: string) =>
  apiFetch<{ tournament_id: string; entries: LeaderboardEntry[] }>(
    withQuery("/leaderboards", { tournament: tournamentId }),
    {
      next: { revalidate: DEFAULT_REVALIDATE_SECONDS },
    }
  );

export const fetchMyApplication = async (token: string) =>
  apiFetch<ApplicationRecord | null>("/applications/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const submitApplicationRequest = async (
  token: string,
  payload: {
    city?: string;
    age?: number;
    vkId?: string;
    fullName?: string;
    beatAuthor?: string;
    audioId?: string;
    lyrics?: string;
  }
) =>
  apiFetch("/applications", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      city: payload.city,
      age: payload.age,
      vk_id: payload.vkId,
      full_name: payload.fullName,
      beat_author: payload.beatAuthor,
      audio_id: payload.audioId,
      lyrics: payload.lyrics,
    }),
  });

export const requestMediaPresign = async (
  token: string,
  payload: { filename: string; mime: string; size_bytes: number; type: "audio" | "image" }
) =>
  apiFetch<MediaPresignResponse>("/media/presign", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const completeMediaUpload = async (
  token: string,
  payload: { asset_id: string; storage_key: string; mime: string; size_bytes: number; kind: "audio" | "image" }
) =>
  apiFetch<MediaAssetStatus>("/media/complete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const createAdminRound = async (
  token: string,
  tournamentId: string,
  payload: {
    kind: "qualifier1" | "qualifier2" | "bracket";
    number: number;
    scoring: "pass_fail" | "points" | "rubric";
    status?: string;
    rubric_keys?: string[];
    starts_at?: string | null;
    submission_deadline_at?: string | null;
    judging_deadline_at?: string | null;
    strategy?: "weighted" | "majority";
  }
) =>
  apiFetch(`/admin/tournaments/${tournamentId}/rounds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const fetchJudgeAssignments = async (token: string) =>
  apiFetch<JudgeAssignment[]>("/judge/assignments", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const fetchJudgeAvailableBattles = async (token: string, limit = 20) =>
  apiFetch<Array<{ match_id: string; match_status: string; starts_at: string | null; tournament_title: string; round_number: number; round_kind: string }>>(
    withQuery("/judge/battles/available", { limit }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

export const requestRandomJudgeAssignment = async (token: string) =>
  apiFetch<JudgeAssignment | null>("/judge/assignments/random", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const assignJudgeBattle = async (token: string, matchId: string) =>
  apiFetch<JudgeAssignment>("/judge/assignments/manual", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ match_id: matchId }),
  });

export const updateJudgeAssignmentStatus = async (token: string, assignmentId: string, status: "completed" | "skipped") =>
  apiFetch<JudgeAssignment>(`/judge/assignments/${assignmentId}/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

export const fetchJudgeBattleDetails = async (token: string, matchId: string) =>
  apiFetch<JudgeBattleDetails>(`/judge/battles/${matchId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const submitJudgeScores = async (
  token: string,
  matchId: string,
  payload: { rubric?: Record<string, number>; score?: number; pass?: boolean; comment?: string }
) =>
  apiFetch(`/judge/battles/${matchId}/scores`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const fetchJudgeHistory = async (token: string) =>
  apiFetch<JudgeHistoryEntry[]>("/judge/history", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const searchJudgeBattles = async (token: string, query: string, limit = 10) =>
  apiFetch<Array<{ match_id: string; round_number: number; round_kind: string; tournament_title: string }>>(
    withQuery("/judge/battles/search", { q: query, limit }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

export const fetchApplicationsModeration = async (
  token: string,
  params?: { status?: string; limit?: number }
) =>
  apiFetch<ApplicationAdmin[]>(withQuery("/mod/applications", params), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const fetchApplicationDetail = async (token: string, id: string) =>
  apiFetch<ApplicationAdmin>(`/mod/applications/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const approveApplication = async (token: string, id: string) =>
  apiFetch(`/mod/applications/${id}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const rejectApplication = async (token: string, id: string, reason: string) =>
  apiFetch(`/mod/applications/${id}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });

export const submitChallengeResponseRequest = async (
  token: string,
  challengeId: string,
  payload: { audio_id: string; description?: string }
) =>
  apiFetch<Challenge>(`/challenges/${challengeId}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const fetchProfile = async (id: string) =>
  apiFetch<ProfileView>(`/profile/${id}`, {
    next: { revalidate: 60 },
  });

export const fetchProfileHighlights = async (id: string) =>
  apiFetch<ProfileHighlights>(`/profile/${id}/highlights`, {
    next: { revalidate: 120 },
  });
