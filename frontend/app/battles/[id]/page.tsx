import { notFound } from "next/navigation";
import type { ApiError } from "@/lib/api";
import { fetchBattleDetail, fetchBattleTracks, fetchRoundOverview } from "@/lib/data";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";
import { formatMatchStatus } from "@/lib/labels";
import { isUuid } from "@/lib/validation";

const loadBattle = async (id: string) => {
  try {
    const [battle, tracks] = await Promise.all([fetchBattleDetail(id), fetchBattleTracks(id)]);
    let participants: Array<{
      participant_id: string;
      display_name?: string;
      avg_total_score?: number | null;
      result_status?: string | null;
    }> = [];
    try {
      const overview = await fetchRoundOverview(battle.round_id);
      const match = overview.matches.find((item) => item.id === battle.id);
      if (match && Array.isArray(match.participants)) {
        participants = match.participants.map((participant) => ({
          participant_id: participant.participant_id,
          display_name: participant.display_name,
          avg_total_score: participant.avg_total_score,
          result_status: participant.result_status,
        }));
      }
    } catch {
      // ignore overview failures, data may still be displayed from basic match info
    }
    return { battle, tracks, participants };
  } catch (error) {
    const err = error as ApiError;
    if (err?.status === 404 || err?.status === 422) {
      notFound();
    }
    throw error;
  }
};

export default async function BattlePage({ params }: { params: { id: string } }) {
  if (!isUuid(params.id)) {
    notFound();
  }
  const { battle, tracks, participants } = await loadBattle(params.id);

  return (
    <div>
      <h2>Баттл {battle.id}</h2>
      <p>Статус: {formatMatchStatus(battle.status)}</p>
      <ul>
        <li>Старт: {formatDateTime(battle.starts_at)}</li>
        <li>Конец: {formatDateTime(battle.ends_at)}</li>
        <li>Комментарии: {battle.engagement.comments}</li>
        <li>Победный трек: {battle.winner_match_track_id ?? "—"}</li>
      </ul>
      {participants.length ? (
        <section>
          <h3>Участники</h3>
          <table>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Статус</th>
                <th>Средний балл</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.participant_id}>
                  <td>{participant.display_name ?? participant.participant_id}</td>
                  <td>{participant.result_status ?? "—"}</td>
                  <td>{formatNumber(participant.avg_total_score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      <section>
        <h3>Треки</h3>
        {tracks.tracks.length ? (
          <ol>
            {tracks.tracks.map((track) => (
              <li key={track.id}>
                <article>
                  <p>Участник: {track.participant_id}</p>
                  <p>Загружено: {formatDateTime(track.submitted_at)}</p>
                  <p>Длительность: {formatDuration(track.duration_sec)}</p>
                  <p>Средний балл: {formatNumber(track.avg_total)}</p>
                  {track.audio_url ? (
                    <audio controls src={track.audio_url}>
                      Ваш браузер не поддерживает аудио тег.
                    </audio>
                  ) : (
                    <p>Аудио недоступно.</p>
                  )}
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <p>Треки еще не загружены.</p>
        )}
      </section>
    </div>
  );
}
