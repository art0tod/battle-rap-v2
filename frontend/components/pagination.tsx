import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

export interface PaginationProps {
  basePath: string;
  page: number;
  limit: number;
  total: number;
  searchParams?: SearchParams;
}

const toNumber = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function Pagination({ basePath, page, limit, total, searchParams }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) {
    return null;
  }

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        const normalized = toNumber(value);
        if (normalized && key !== "page") {
          params.set(key, normalized);
        }
      });
    }
    params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const items = [];
  for (let i = 1; i <= totalPages; i += 1) {
    items.push(
      <Link
        key={i}
        href={buildHref(i)}
        aria-current={i === page ? "page" : undefined}
        className={i === page ? "font-semibold text-primary" : "text-muted-foreground"}
      >
        {i}
      </Link>,
    );
  }

  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <nav aria-label="Навигация по страницам" className="mt-6 flex items-center gap-4 text-sm">
      <Link aria-disabled={page <= 1} className="text-muted-foreground" href={buildHref(prevPage)}>
        Предыдущая
      </Link>
      <div className="flex items-center gap-2">{items}</div>
      <Link aria-disabled={page >= totalPages} className="text-muted-foreground" href={buildHref(nextPage)}>
        Следующая
      </Link>
    </nav>
  );
}
