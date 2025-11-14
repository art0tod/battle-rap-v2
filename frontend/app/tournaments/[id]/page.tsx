import Link from "next/link";
import { notFound } from "next/navigation";
import type { ApiError } from "@/lib/api";
import { fetchLeaderboard, fetchTournamentDetail } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { formatRoundStatus, formatTournamentStatus } from "@/lib/labels";
import { isUuid } from "@/lib/validation";

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

export default async function TournamentPage({ params }: { params: { id: string } }) {
  if (!isUuid(params.id)) {
    notFound();
  }
  const detail = await loadTournament(params.id);
  const leaderboard = await fetchLeaderboard(detail.tournament.id).catch(() => null);

  return (
    <div>
      <h2>{detail.tournament.title}</h2>
      <p>Статус: {formatTournamentStatus(detail.tournament.status)}</p>
      <p>
        Хотите участвовать? <Link href="/applications/new">Подайте заявку</Link>.
      </p>
      <ul>
        <li>Открытие регистрации: {formatDateTime(detail.tournament.registration_open_at)}</li>
        <li>Дедлайн подачи: {formatDateTime(detail.tournament.submission_deadline_at)}</li>
        <li>Дедлайн судейства: {formatDateTime(detail.tournament.judging_deadline_at)}</li>
        <li>Публикация: {formatDateTime(detail.tournament.public_at)}</li>
      </ul>
      <section>
        <h3>Раунды</h3>
        {detail.rounds.length ? (
          <ol>
            {detail.rounds.map((round) => (
              <li key={round.id}>
                <article>
                  <p>
                    Раунд {round.number} ({round.kind}) — {formatRoundStatus(round.status)}
                  </p>
                  <p>Старт: {formatDateTime(round.starts_at)}</p>
                  <p>Дедлайн подачи: {formatDateTime(round.submission_deadline_at)}</p>
                  <p>Стратегия: {round.strategy ?? "—"}</p>
                  <Link href={`/rounds/${round.id}`}>Подробнее о раунде</Link>
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <p>Раунды еще не созданы.</p>
        )}
      </section>
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
