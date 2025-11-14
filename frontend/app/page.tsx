import Link from "next/link";
import { Suspense } from "react";
import { Section } from "@/components/section";
import {
  fetchActiveApplicationRound,
  fetchArtists,
  fetchBattles,
  fetchTournaments,
} from "@/lib/data";
import { formatDateTime, formatNumber } from "@/lib/format";
import { formatRoundStatus, formatTournamentStatus } from "@/lib/labels";

export default function HomePage() {
  return (
    <div>
      <p>Все ключевые данные по турнирам, раундам и артистам в одном месте.</p>
      <Suspense fallback={<p>Проверяем активный набор...</p>}>
        <ActiveApplicationRoundSection />
      </Suspense>
      <Suspense fallback={<p>Загружаем турниры...</p>}>
        <TournamentsPreview />
      </Suspense>
      <Suspense fallback={<p>Загружаем баттлы...</p>}>
        <BattlesPreview />
      </Suspense>
      <Suspense fallback={<p>Загружаем артистов...</p>}>
        <ArtistsPreview />
      </Suspense>
    </div>
  );
}

async function ActiveApplicationRoundSection() {
  const round = await fetchActiveApplicationRound();
  if (!round) {
    return (
      <Section title="Набор участников">
        <p>Сейчас нет раундов с открытой подачей заявок.</p>
      </Section>
    );
  }
  return (
    <Section title="Набор участников">
      <p>Турнир {round.tournament_title} ищет участников для раунда {round.number} ({round.kind}).</p>
      <ul>
        <li>Статус: {formatRoundStatus(round.status)}</li>
        <li>Старт: {formatDateTime(round.starts_at)}</li>
        <li>Подача до: {formatDateTime(round.submission_deadline_at)}</li>
        <li>
          <Link href={`/rounds/${round.id}`}>Перейти к раунду</Link>
        </li>
      </ul>
    </Section>
  );
}

async function TournamentsPreview() {
  const response = await fetchTournaments({ limit: 3 });
  if (!response.data.length) {
    return (
      <Section title="Турниры">
        <p>Еще не создано ни одного турнира.</p>
      </Section>
    );
  }
  return (
    <Section title="Турниры" action={<Link href="/tournaments">Все турниры</Link>}>
      <ul>
        {response.data.map((tournament) => (
          <li key={tournament.id}>
            <article>
              <h3>
                <Link href={`/tournaments/${tournament.id}`}>{tournament.title}</Link>
              </h3>
              <p>Статус: {formatTournamentStatus(tournament.status)}</p>
              <p>Публичный релиз: {formatDateTime(tournament.public_at)}</p>
            </article>
          </li>
        ))}
      </ul>
    </Section>
  );
}

async function BattlesPreview() {
  const { battles } = await fetchBattles({ status: "current", limit: 5 });
  if (!battles.length) {
    return (
      <Section title="Текущие баттлы">
        <p>Пока нет активных баттлов. Проверьте позже.</p>
      </Section>
    );
  }
  return (
    <Section title="Текущие баттлы" action={<Link href="/battles">Каталог баттлов</Link>}>
      <ul>
        {battles.map((battle) => (
          <li key={battle.id}>
            <article>
              <h3>
                <Link href={`/battles/${battle.id}`}>
                  {battle.tournament.title}: раунд {battle.round.number}
                </Link>
              </h3>
              <p>Статус: {formatRoundStatus(battle.round.status)}</p>
              <p>Комментариев: {battle.engagement.comments}</p>
              <p>Участников: {battle.participants.length}</p>
            </article>
          </li>
        ))}
      </ul>
    </Section>
  );
}

async function ArtistsPreview() {
  const response = await fetchArtists({ limit: 5, sort: "wins" });
  if (!response.data.length) {
    return (
      <Section title="Артисты и судьи">
        <p>Пока нет публичных профилей.</p>
      </Section>
    );
  }
  return (
    <Section title="Артисты и судьи" action={<Link href="/artists">Все профили</Link>}>
      <ol>
        {response.data.map((participant) => (
          <li key={participant.id}>
            <article>
              <h3>{participant.display_name}</h3>
              <p>Побед: {formatNumber(participant.total_wins)}</p>
              <p>Средний балл: {formatNumber(participant.avg_total_score)}</p>
              <p>Город: {participant.city ?? "—"}</p>
            </article>
          </li>
        ))}
      </ol>
    </Section>
  );
}
