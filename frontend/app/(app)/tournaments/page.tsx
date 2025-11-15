import Link from "next/link";
import { fetchTournaments } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { formatTournamentStatus } from "@/lib/labels";
import { Pagination } from "@/components/pagination";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const STATUS_OPTIONS = [
  { value: "", label: "Все" },
  { value: "registration", label: "Регистрация" },
  { value: "ongoing", label: "Идет" },
  { value: "completed", label: "Завершен" },
  { value: "archived", label: "Архив" },
];

export default async function TournamentsPage({ searchParams }: PageProps) {
  const resolvedSearch = searchParams ? await searchParams : {};
  const pageParam = Array.isArray(resolvedSearch.page) ? resolvedSearch.page[0] : resolvedSearch.page;
  const statusParamRaw = Array.isArray(resolvedSearch.status) ? resolvedSearch.status[0] : resolvedSearch.status;
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const statusParam = statusParamRaw || undefined;
  const response = await fetchTournaments({ page, status: statusParam, limit: 10 });

  return (
    <div>
      <h2>Турниры</h2>
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
        {statusParam ? (
          <Link href="/tournaments">Сбросить</Link>
        ) : null}
      </form>
      {response.data.length ? (
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Статус</th>
              <th>Регистрация</th>
              <th>Подача</th>
              <th>Судейство</th>
              <th>Публично</th>
            </tr>
          </thead>
          <tbody>
            {response.data.map((tournament) => (
              <tr key={tournament.id}>
                <td>
                  <Link href={`/tournaments/${tournament.id}`}>{tournament.title}</Link>
                </td>
                <td>{formatTournamentStatus(tournament.status)}</td>
                <td>{formatDateTime(tournament.registration_open_at)}</td>
                <td>{formatDateTime(tournament.submission_deadline_at)}</td>
                <td>{formatDateTime(tournament.judging_deadline_at)}</td>
                <td>{formatDateTime(tournament.public_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Турниры отсутствуют.</p>
      )}
      <Pagination
        basePath="/tournaments"
        page={response.page}
        limit={response.limit}
        total={response.total}
        searchParams={resolvedSearch}
      />
    </div>
  );
}
