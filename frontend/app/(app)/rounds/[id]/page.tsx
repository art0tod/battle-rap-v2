import Link from "next/link";
import { notFound } from "next/navigation";
import type { ApiError } from "@/lib/api";
import { fetchRoundDetail, fetchRoundOverview } from "@/lib/data";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";
import { formatMatchStatus, formatRoundStatus } from "@/lib/labels";
import { isUuid } from "@/lib/validation";
import { ApplicationForm } from "@/components/application-form";
import type { ActiveApplicationRound, RoundOverviewResponse } from "@/lib/types";

const loadRound = async (id: string) => {
  try {
    return await Promise.all([fetchRoundDetail(id), fetchRoundOverview(id)]);
  } catch (error) {
    const err = error as ApiError;
    if (err?.status === 404 || err?.status === 422) {
      notFound();
    }
    throw error;
  }
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RoundPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  if (!isUuid(id)) {
    notFound();
  }
  const [detail, overview] = await loadRound(id);
  const summary = overview?.summary;

  const matches = overview?.matches ?? detail.matches;
  type OverviewParticipant = RoundOverviewResponse["matches"][number]["participants"][number] & {
    match_id?: string;
  };
  const participantMap = new Map<string, OverviewParticipant>();
  (overview?.matches ?? []).forEach((match) => {
    match.participants.forEach((participant) => {
      if (participant.user_id) {
        participantMap.set(participant.participant_id, {
          ...participant,
          match_id: match.id,
        });
      }
    });
  });
  const participantList = Array.from(participantMap.values());
  const searchQuery =
    typeof resolvedSearchParams?.search === "string" ? resolvedSearchParams.search.trim().toLowerCase() : "";
  const filteredParticipants = searchQuery
    ? participantList.filter((participant) => {
        const haystack = `${participant.display_name ?? ""} ${participant.result_status ?? ""}`.toLowerCase();
        return haystack.includes(searchQuery);
      })
    : participantList;
  const showApplicationForm = detail.round.status === "submission";
  const applicationRound: ActiveApplicationRound = {
    id: detail.round.id,
    kind: detail.round.kind,
    number: detail.round.number,
    status: detail.round.status,
    starts_at: detail.round.starts_at,
    submission_deadline_at: detail.round.submission_deadline_at,
    tournament_id: detail.round.tournament_id,
    tournament_title: detail.round.tournament_title,
  };

  return (
    <div>
      <h2>
        Раунд {detail.round.number} ({detail.round.kind}) — {detail.round.tournament_title}
      </h2>
      <p>Статус: {formatRoundStatus(detail.round.status)}</p>
      <ul>
        <li>Судейская система: {detail.round.scoring}</li>
        <li>Стратегия: {detail.round.strategy ?? "—"}</li>
        <li>Старт: {formatDateTime(detail.round.starts_at)}</li>
        <li>Подача до: {formatDateTime(detail.round.submission_deadline_at)}</li>
        <li>Судейство до: {formatDateTime(detail.round.judging_deadline_at)}</li>
      </ul>
      {summary ? (
        <section>
          <h3>Сводка</h3>
          <ul>
            <li>Баттлов: {summary.total_matches}</li>
            <li>Треков: {summary.total_tracks}</li>
            <li>Ревью: {summary.total_reviews}</li>
            <li>Режим: {summary.mode}</li>
          </ul>
        </section>
      ) : null}
      {showApplicationForm ? (
        <section>
          <h3>Подача заявки</h3>
          <ApplicationForm round={applicationRound} />
        </section>
      ) : (
        <section>
          <h3>Участники</h3>
          {participantList.length ? (
            <div>
              <form>
                <label>
                  Поиск
                  <input type="text" name="search" defaultValue={searchQuery} placeholder="Имя участника" />
                </label>
                <button type="submit">Найти</button>
                {searchQuery ? <Link href={`/rounds/${detail.round.id}`}>Сбросить</Link> : null}
              </form>
              {filteredParticipants.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Участник</th>
                      <th>Результат</th>
                      <th>Баллы</th>
                      <th>Трек</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map((participant) => (
                      <tr key={participant.participant_id}>
                        <td>
                          {participant.user_id ? (
                            <Link href={`/profile/${participant.user_id}`}>{participant.display_name}</Link>
                          ) : (
                            participant.display_name
                          )}
                        </td>
                        <td>{participant.result_status ?? "—"}</td>
                        <td>{formatNumber(participant.avg_total_score)}</td>
                        <td>
                          {participant.track?.audio_url ? (
                            <div>
                              <audio controls src={participant.track.audio_url}>
                                Браузер не поддерживает аудио.
                              </audio>
                              <p>Длительность: {formatDuration(participant.track.duration_sec)}</p>
                            </div>
                          ) : (
                            <span>Трек не загружен</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Не найдено участников по запросу.</p>
              )}
            </div>
          ) : (
            <p>Список участников появится после завершения текущего этапа.</p>
          )}
        </section>
      )}
      <section>
        <h3>Баттлы</h3>
        {matches.length ? (
          <ol>
            {matches.map((match) => (
              <li key={match.id}>
                <article>
                  <p>Статус: {formatMatchStatus(match.status)}</p>
                  <p>Старт: {formatDateTime(match.starts_at)}</p>
                  <p>Финиш: {formatDateTime(match.ends_at)}</p>
                  {"participants" in match && Array.isArray(match.participants) && match.participants.length ? (
                    <ul>
                      {match.participants.map((participant) => (
                        <li key={participant.participant_id}>
                          {participant.display_name}: {participant.result_status ?? "—"} (балл {participant.avg_total_score ?? "—"})
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Link href={`/battles/${match.id}`}>Перейти к баттлу</Link>
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <p>Баттлов еще нет.</p>
        )}
      </section>
    </div>
  );
}
