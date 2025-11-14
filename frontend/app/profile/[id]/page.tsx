import Link from "next/link";
import { notFound } from "next/navigation";
import type { ApiError } from "@/lib/api";
import { fetchProfile, fetchProfileHighlights } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { formatMatchStatus, formatRoundStatus } from "@/lib/labels";
import { isUuid } from "@/lib/validation";
import { ChallengeButton } from "@/components/challenge-button";

const loadProfile = async (id: string) => {
  try {
    return await Promise.all([fetchProfile(id), fetchProfileHighlights(id)]);
  } catch (error) {
    const err = error as ApiError;
    if (err?.status === 404 || err?.status === 422) {
      notFound();
    }
    throw error;
  }
};

type ProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const [profile, highlights] = await loadProfile(id);

  return (
    <div>
      <h2>{profile.display_name}</h2>
      <p>Роли: {profile.roles.join(", ") || "—"}</p>
      <ul>
        <li>Город: {profile.city ?? "—"}</li>
        <li>Био: {profile.bio ?? "—"}</li>
        <li>Создан: {formatDateTime(profile.created_at)}</li>
      </ul>
      {profile.viewer_context.can_view_private ? (
        <ul>
          <li>Email: {profile.email ?? "—"}</li>
          <li>Возраст: {profile.age ?? "—"}</li>
          <li>VK: {profile.vk_id ?? "—"}</li>
        </ul>
      ) : null}
      {!profile.viewer_context.is_self ? (
        <section>
          <h3>Вызвать на баттл</h3>
          <ChallengeButton opponentId={profile.id} opponentName={profile.display_name} />
        </section>
      ) : null}
      <section>
        <h3>Статистика</h3>
        <ul>
          <li>Побед: {highlights.stats.wins}</li>
          <li>Поражений: {highlights.stats.losses}</li>
          <li>Ничьи: {highlights.stats.slivs}</li>
        </ul>
      </section>
      <section>
        <h3>Баттлы участника</h3>
        {highlights.participated_battles.length ? (
          <ul>
            {highlights.participated_battles.map((battle) => (
              <li key={battle.id}>
                <p>
                  {battle.tournament.title}, раунд {battle.round.number} ({battle.round.kind}) — {formatMatchStatus(battle.status)} ({battle.result})
                </p>
                <Link href={`/battles/${battle.id}`}>Перейти к баттлу</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>Еще нет баттлов на платформе.</p>
        )}
      </section>
      <section>
        <h3>Отсудил</h3>
        {highlights.judged_battles.length ? (
          <ul>
            {highlights.judged_battles.map((battle) => (
              <li key={battle.id}>
                <p>
                  {battle.tournament.title}, раунд {battle.round.number} ({battle.round.kind}) — {formatRoundStatus(battle.round.status)}. Оценено{" "}
                  {formatDateTime(battle.evaluated_at)}
                </p>
                <Link href={`/battles/${battle.id}`}>Баттл</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>Пока нет судейских решений.</p>
        )}
      </section>
    </div>
  );
}
