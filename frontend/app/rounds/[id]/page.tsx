import Link from "next/link";
import { notFound } from "next/navigation";
import type { ApiError } from "@/lib/api";
import { fetchRoundDetail, fetchRoundOverview } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { formatMatchStatus, formatRoundStatus } from "@/lib/labels";
import { isUuid } from "@/lib/validation";

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

export default async function RoundPage({ params }: { params: { id: string } }) {
  if (!isUuid(params.id)) {
    notFound();
  }
  const [detail, overview] = await loadRound(params.id);
  const summary = overview?.summary;

  const matches = overview?.matches ?? detail.matches;

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
