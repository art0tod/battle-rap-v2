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
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function ArtistsPage({ searchParams = {} }: PageProps) {
  const page = Math.max(1, Number(searchParams.page ?? "1"));
  const role = typeof searchParams.role === "string" ? searchParams.role : undefined;
  const sort = typeof searchParams.sort === "string" ? searchParams.sort : undefined;
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;
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
        searchParams={searchParams}
      />
    </div>
  );
}
