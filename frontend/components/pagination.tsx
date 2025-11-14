import Link from "next/link";

export type PaginationProps = {
  basePath: string;
  page: number;
  total: number;
  limit: number;
  searchParams?: Record<string, string | string[] | undefined>;
};

const buildQuery = (params: Record<string, string | string[] | undefined>, page: number) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (key === "page") {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
      return;
    }
    if (value !== undefined) {
      query.append(key, value);
    }
  });
  query.set("page", String(page));
  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
};

export const Pagination = ({ basePath, page, total, limit, searchParams = {} }: PaginationProps) => {
  if (total <= limit) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav aria-label="Постраничная навигация">
      <p>
        Страница {page} из {totalPages}
      </p>
      <div>
        {hasPrev ? (
          <Link href={`${basePath}${buildQuery(searchParams, page - 1)}`}>Предыдущая</Link>
        ) : (
          <span>Предыдущая</span>
        )}
        {" | "}
        {hasNext ? (
          <Link href={`${basePath}${buildQuery(searchParams, page + 1)}`}>Следующая</Link>
        ) : (
          <span>Следующая</span>
        )}
      </div>
    </nav>
  );
};
