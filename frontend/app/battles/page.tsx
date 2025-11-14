import Link from "next/link";
import { fetchBattles } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { formatMatchStatus } from "@/lib/labels";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const STATUS_OPTIONS = [
  { value: "", label: "Все" },
  { value: "current", label: "Текущие" },
  { value: "finished", label: "Завершенные" },
];

export default async function BattlesPage({ searchParams = {} }: PageProps) {
  const statusParam = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const { battles } = await fetchBattles({ status: statusParam as "current" | "finished" | undefined });

  return (
    <div>
      <h2>Баттлы</h2>
      <form>
        <label>
          Статус
          <select name="status" defaultValue={statusParam ?? ""}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Применить</button>
        {statusParam ? <Link href="/battles">Сбросить</Link> : null}
      </form>
      {battles.length ? (
        <ol>
          {battles.map((battle) => (
            <li key={battle.id}>
              <article>
                <h3>
                  <Link href={`/battles/${battle.id}`}>
                    {battle.tournament.title}: раунд {battle.round.number}
                  </Link>
                </h3>
                <p>Статус: {formatMatchStatus(battle.status)}</p>
                <p>Старт: {formatDateTime(battle.starts_at)}</p>
                <p>Конец: {formatDateTime(battle.ends_at)}</p>
                <p>Участников: {battle.participants.length}</p>
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <p>Баттлы не найдены.</p>
      )}
    </div>
  );
}
