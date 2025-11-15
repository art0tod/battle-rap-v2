import Link from "next/link";
import { fetchArtists } from "@/lib/data";
import { Pagination } from "@/components/pagination";
import { ArtistsTable } from "@/components/artists-table";

const ROLE_OPTIONS = [
  { value: "", label: "Все роли" },
  { value: "artist", label: "Артисты" },
  { value: "judge", label: "Судьи" },
];

const SORT_OPTIONS = [
  { value: "joined_at", label: "По дате регистрации" },
  { value: "wins", label: "По победам" },
  { value: "rating", label: "По рейтингу" },
];

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const getSingleParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

export default async function ArtistsPage({ searchParams }: PageProps) {
  const resolvedSearch = searchParams ? await searchParams : {};
  const pageParam = getSingleParam(resolvedSearch.page);
  const roleParam = getSingleParam(resolvedSearch.role);
  const sortParam = getSingleParam(resolvedSearch.sort);
  const searchParam = getSingleParam(resolvedSearch.search);
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const role = roleParam || undefined;
  const sort = sortParam || undefined;
  const search = searchParam || undefined;
  const limit = 20;

  const response = await fetchArtists({ page, limit, role, sort, search });

  return (
    <div>
      <h2>Артисты и судьи</h2>
      <form>
        <label>
          Поиск
          <input type="text" name="search" defaultValue={search ?? ""} placeholder="Имя или город" />
        </label>
        <label>
          Роль
          <select name="role" defaultValue={role ?? ""}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Сортировка
          <select name="sort" defaultValue={sort ?? "joined_at"}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Найти</button>
        {search || role || (sort && sort !== "joined_at") ? <Link href="/artists">Очистить</Link> : null}
      </form>
      <ArtistsTable participants={response.data} />
      <Pagination
        basePath="/artists"
        page={response.page}
        limit={response.limit}
        total={response.total}
        searchParams={resolvedSearch}
      />
    </div>
  );
}
