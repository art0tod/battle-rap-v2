import Link from "next/link";
import { notFound } from "next/navigation";
import type { ApiError } from "@/lib/api";
import { fetchLeaderboard, fetchRoundOverview, fetchTournamentDetail } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { formatMatchStatus, formatRoundStatus, formatTournamentStatus } from "@/lib/labels";
import { isUuid } from "@/lib/validation";
import { CHALLENGE_TOURNAMENT_ID } from "@/lib/constants";

const loadTournament = async (id: string) => {
  try {
    return await fetchTournamentDetail(id);
  } catch (error) {
    const err = error as ApiError;
    if (err?.status === 404 || err?.status === 422) {
      notFound();
    }
    throw error;
  }
};

type TournamentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const detail = await loadTournament(id);
  const roundsWithResults = await Promise.all(
    detail.rounds.map(async (round) => {
      const overview = await fetchRoundOverview(round.id).catch(() => null);
      return { round, overview };
    })
  );
  const leaderboard = await fetchLeaderboard(detail.tournament.id).catch(() => null);
  const isChallengeTournament = detail.tournament.id === CHALLENGE_TOURNAMENT_ID;
  const challengeMatches = isChallengeTournament
    ? roundsWithResults.flatMap(({ overview }) => overview?.matches ?? [])
    : [];

  return (
    <div>
      <h2>{detail.tournament.title}</h2>
      <p>Статус: {formatTournamentStatus(detail.tournament.status)}</p>
      {!isChallengeTournament ? (
        <p>
          Хотите участвовать? <Link href="/applications/new">Подайте заявку</Link>.
        </p>
      ) : null}
      <ul>
        <li>Открытие регистрации: {formatDateTime(detail.tournament.registration_open_at)}</li>
        <li>Дедлайн подачи: {formatDateTime(detail.tournament.submission_deadline_at)}</li>
        <li>Дедлайн судейства: {formatDateTime(detail.tournament.judging_deadline_at)}</li>
        <li>Публикация: {formatDateTime(detail.tournament.public_at)}</li>
      </ul>
      {!isChallengeTournament ? (
        <section>
        <h3>Раунды</h3>
        {roundsWithResults.length ? (
          <ul>
            {roundsWithResults.map(({ round, overview }) => (
              <li key={round.id}>
                <details>
                  <summary>
                    Раунд {round.number} ({round.kind}) — {formatRoundStatus(round.status)}
                  </summary>
                  <div>
                    <p>Старт: {formatDateTime(round.starts_at)}</p>
                    <p>Дедлайн подачи: {formatDateTime(round.submission_deadline_at)}</p>
                    <p>Стратегия: {round.strategy ?? "—"}</p>
                    {overview ? (
                      <div>
                        <p>
                          Итоги: баттлов {overview.summary.total_matches}, треков {overview.summary.total_tracks}, отзывов{" "}
                          {overview.summary.total_reviews}
                        </p>
                        {overview.matches?.length ? (
                          <ul>
                            {overview.matches.map((match) => (
                              <li key={match.id}>
                                Баттл {match.id}:{" "}
                                {match.participants.length ? (
                                  <ul>
                                    {match.participants.map((participant) => (
                                      <li key={participant.participant_id}>
                                        {participant.user_id ? (
                                          <Link href={`/profile/${participant.user_id}`}>{participant.display_name}</Link>
                                        ) : (
                                          participant.display_name
                                        )}
                                        : {participant.result_status ?? "—"} (балл {participant.avg_total_score ?? "—"})
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span>Участники еще не указаны.</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>Нет баттлов для отображения.</p>
                        )}
                      </div>
                    ) : (
                      <p>Нет данных по этому раунду.</p>
                    )}
                    <Link href={`/rounds/${round.id}`}>Перейти к странице раунда</Link>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p>Раунды еще не созданы.</p>
        )}
        </section>
      ) : null}
      {isChallengeTournament ? (
        <section>
          <h3>Все пользовательские баттлы</h3>
          {challengeMatches.length ? (
            <ul>
              {challengeMatches.map((match) => (
                <li key={match.id}>
                  <article>
                    <p>
                      Баттл {match.id} — {formatMatchStatus(match.status)}
                    </p>
                    <p>Старт: {formatDateTime(match.starts_at)}</p>
                    <p>Участников: {match.participants.length}</p>
                    <Link href={`/battles/${match.id}`}>Перейти к баттлу</Link>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <p>Пока нет пользовательских баттлов.</p>
          )}
        </section>
      ) : null}
      <section>
        <h3>Таблица побед</h3>
        {leaderboard?.entries?.length ? (
          <table>
            <thead>
              <tr>
                <th>Участник</th>
                <th>Побед</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.entries.map((entry) => (
                <tr key={entry.participant_id}>
                  <td>{entry.participant_id}</td>
                  <td>{entry.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Нет данных по победам.</p>
        )}
      </section>
    </div>
  );
}
