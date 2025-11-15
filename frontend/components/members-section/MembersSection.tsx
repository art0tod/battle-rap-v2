"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { ApiError, apiFetch, withQuery } from "@/lib/api";
import type { PaginatedResponse, ParticipantSummary } from "@/lib/types";

import styles from "./styles.module.css";

type SortOption = "date" | "rating" | "battles";
type RoleOption = "all" | "battler" | "judge";

const ROLE_OPTIONS: RoleOption[] = ["all", "battler", "judge"];
const SORT_OPTIONS: SortOption[] = ["date", "rating", "battles"];
const PAGE_SIZE = 12;
const DEFAULT_AVATAR = "/participants/photo.jpg";
const SKELETON_ITEMS = Array.from({ length: 6 });

const sortLabels: Record<SortOption, string> = {
  date: "Дата регистрации",
  rating: "Рейтинг",
  battles: "Количество баттлов",
};

const sortToApiSort: Record<SortOption, "joined_at" | "rating" | "wins"> = {
  date: "joined_at",
  rating: "rating",
  battles: "wins",
};

const roleToApiRole: Record<Exclude<RoleOption, "all">, "artist" | "judge"> = {
  battler: "artist",
  judge: "judge",
};

const MEDIA_BASE_URL = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/$/, "");

function parseRole(value: string | null): RoleOption {
  if (value === "judge") {
    return "judge";
  }
  if (value === "battler" || value === "artist") {
    return "battler";
  }
  return "all";
}

function parseSort(value: string | null): SortOption {
  if (value === "rating" || value === "battles") {
    return value;
  }
  if (value === "wins") {
    return "battles";
  }
  if (value === "joined_at") {
    return "date";
  }
  return "date";
}

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

interface ResponseMeta {
  page: number;
  limit: number;
  total: number;
}

interface ParticipantCard {
  id: string;
  displayName: string;
  fullName?: string | null;
  city?: string | null;
  joinedAt: string;
  avatarUrl?: string | null;
  avgTotalScore?: number | null;
  totalWins: number;
  roles: string[];
}

export default function MembersSection() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const cardsWrapperRef = useRef<HTMLDivElement | null>(null);

  const [searchValue, setSearchValue] = useState(
    () => searchParams.get("search") ?? ""
  );
  const [sortBy, setSortBy] = useState<SortOption>(() =>
    parseSort(searchParams.get("sort"))
  );
  const [roleFilter, setRoleFilter] = useState<RoleOption>(() =>
    parseRole(searchParams.get("role"))
  );
  const [page, setPage] = useState(() => parsePage(searchParams.get("page")));

  const [participants, setParticipants] = useState<ParticipantCard[]>([]);
  const [meta, setMeta] = useState<ResponseMeta>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const pushQuery = useCallback(
    (
      nextSearch: string,
      nextSort: SortOption,
      nextRole: RoleOption,
      nextPage: number
    ) => {
      const params = new URLSearchParams();

      if (nextSearch.trim()) {
        params.set("search", nextSearch);
      }

      params.set("sort", nextSort);
      params.set("role", nextRole);
      if (nextPage > 1) {
        params.set("page", String(nextPage));
      }

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [pathname, router]
  );

  useEffect(() => {
    const paramSearch = searchParams.get("search") ?? "";
    const paramSort = parseSort(searchParams.get("sort"));
    const paramRole = parseRole(searchParams.get("role"));
    const paramPage = parsePage(searchParams.get("page"));

    const frame = window.requestAnimationFrame(() => {
      setSearchValue((prev) => (prev === paramSearch ? prev : paramSearch));
      setSortBy((prev) => (prev === paramSort ? prev : paramSort));
      setRoleFilter((prev) => (prev === paramRole ? prev : paramRole));
      setPage((prev) => (prev === paramPage ? prev : paramPage));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [searchParams]);

  useEffect(() => {
    const normalizedSearch = searchValue.trim();
    const apiRole = roleFilter === "all" ? undefined : roleToApiRole[roleFilter];
    const apiSort = sortToApiSort[sortBy];
    let isActive = true;

    const frame = window.requestAnimationFrame(() => {
      setIsLoading(true);
      setError(null);
    });

    fetchParticipants({
      page,
      limit: PAGE_SIZE,
      search: normalizedSearch || undefined,
      role: apiRole,
      sort: apiSort,
    })
      .then((response) => {
        if (!isActive) {
          return;
        }

        const normalizedLimit = response.limit > 0 ? response.limit : PAGE_SIZE;
        const nextTotalPages = Math.max(1, Math.ceil(response.total / normalizedLimit));

        setParticipants(response.data.map(mapParticipant));
        setMeta({
          page: response.page,
          limit: normalizedLimit,
          total: response.total,
        });

        if (page > nextTotalPages) {
          const nextPageNumber = nextTotalPages;
          setPage(nextPageNumber);
          pushQuery(searchValue, sortBy, roleFilter, nextPageNumber);
        }
      })
      .catch((requestError: unknown) => {
        if (!isActive) {
          return;
        }
        if (requestError instanceof ApiError) {
          setError(requestError.message);
          return;
        }
        setError("Не удалось загрузить участников. Попробуйте позже.");
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      window.cancelAnimationFrame(frame);
      isActive = false;
    };
  }, [page, roleFilter, searchValue, sortBy, pushQuery, requestKey]);

  const totalPages = useMemo(() => {
    const limit = meta.limit > 0 ? meta.limit : PAGE_SIZE;
    const pages = Math.ceil(meta.total / limit);
    return Math.max(1, pages || 0);
  }, [meta.limit, meta.total]);

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [totalPages]);

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      setSearchValue(nextValue);
      setPage(1);
      pushQuery(nextValue, sortBy, roleFilter, 1);
    },
    [pushQuery, roleFilter, sortBy]
  );

  const handleRoleChange = useCallback(
    (option: RoleOption) => {
      setRoleFilter(option);
      setPage(1);
      pushQuery(searchValue, sortBy, option, 1);
    },
    [pushQuery, searchValue, sortBy]
  );

  const handleSortChange = useCallback(
    (value: SortOption) => {
      setSortBy(value);
      setPage(1);
      pushQuery(searchValue, value, roleFilter, 1);
    },
    [pushQuery, roleFilter, searchValue]
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (nextPage === page) return;
      if (cardsWrapperRef.current) {
        cardsWrapperRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      setPage(nextPage);
      pushQuery(searchValue, sortBy, roleFilter, nextPage);
    },
    [page, pushQuery, roleFilter, searchValue, sortBy]
  );

  const handleRetry = useCallback(() => {
    setRequestKey((prev) => prev + 1);
  }, []);
  return (
    <section className={styles.root}>
      <div className={styles.backgroundBlock}>
        <div className={styles.content}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Участники</h1>
          </div>

          <div className={styles.controls}>
            <label className={styles.searchField}>
              <span className={styles.visuallyHidden}>Поиск по нику</span>
              <input
                className={styles.searchInput}
                placeholder="Найти по нику или имени"
                type="search"
                value={searchValue}
                onChange={handleSearchChange}
              />
            </label>

            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>Фильтр</span>
              <div className={styles.filterChips}>
                {ROLE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={
                      roleFilter === option
                        ? `${styles.chip} ${styles.chipActive}`
                        : styles.chip
                    }
                    onClick={() => handleRoleChange(option)}
                  >
                    {option === "all"
                      ? "Все"
                      : option === "battler"
                      ? "Баттлеры"
                      : "Судьи"}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.controlGroup}>
              <label className={styles.controlLabel} htmlFor="members-sort">
                Сортировка
              </label>
              <select
                id="members-sort"
                className={styles.sortSelect}
                value={sortBy}
                onChange={(event) =>
                  handleSortChange(event.target.value as SortOption)
                }
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {sortLabels[option]}
                  </option>
                ))}
              </select>
            </div>
            <div
              className={styles.loadingIndicator}
              aria-live="polite"
              role="status"
            >
              {isLoading ? "Обновляем список..." : null}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.cardsWrapper} ref={cardsWrapperRef}>
        <div className={styles.results}>
          {error ? (
            <div className={styles.errorCard} role="alert">
              <div>
                <p>{error}</p>
                <p className={styles.errorHint}>
                  Проверьте подключение или повторите позже.
                </p>
              </div>
              <button
                type="button"
                className={styles.retryButton}
                onClick={handleRetry}
              >
                Попробовать ещё раз
              </button>
            </div>
          ) : isLoading && participants.length === 0 ? (
            <ul className={styles.membersList} aria-live="polite">
              {SKELETON_ITEMS.map((_, index) => (
                <li key={`skeleton-${index}`}>
                  <div
                    className={`${styles.memberCard} ${styles.skeletonCard}`}
                  >
                    <div className={styles.memberImageWrapper} />
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLineShort} />
                    <div className={styles.skeletonMetaRow}>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : participants.length === 0 ? (
            <p className={styles.emptyState}>Ничего не найдено</p>
          ) : (
            <ul className={styles.membersList}>
              {participants.map((participant) => (
                <li key={participant.id}>
                  <Link className={styles.memberCard} href={`/profile/${participant.id}`}>
                    <div className={styles.memberImageWrapper}>
                      <Image
                        src={resolveAvatarUrl(participant)}
                        alt={participant.displayName}
                        width={240}
                        height={240}
                        className={styles.memberImage}
                      />
                    </div>
                    <div className={styles.memberMeta}>
                      <span className={styles.memberNickname}>
                        {participant.displayName}
                      </span>
                      <span className={styles.memberRole}>
                        {resolveRoleLabel(participant.roles)}
                      </span>
                    </div>
                    {participant.fullName ? (
                      <p className={styles.memberName}>
                        {participant.fullName}
                      </p>
                    ) : null}
                    <p className={styles.memberName}>
                      {participant.city ?? "Локация не указана"}
                    </p>
                    <div className={styles.memberStats}>
                      <span>
                        Рейтинг {formatScore(participant.avgTotalScore)}
                      </span>
                      <span>Побед {participant.totalWins}</span>
                      <span>С {formatDate(participant.joinedAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {participants.length > 0 && totalPages > 1 ? (
          <div className={styles.pagination}>
            <button
              type="button"
              className={
                page === 1 ? styles.pageButtonDisabled : styles.pageButton
              }
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Назад
            </button>
            <ul className={styles.pageList}>
              {pageNumbers.map((pageNumber) => (
                <li key={pageNumber}>
                  <button
                    type="button"
                    className={
                      pageNumber === page
                        ? `${styles.pageButton} ${styles.pageButtonActive}`
                        : styles.pageButton
                    }
                    onClick={() => handlePageChange(pageNumber)}
                    aria-current={pageNumber === page ? "page" : undefined}
                  >
                    {pageNumber}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={
                page === totalPages
                  ? styles.pageButtonDisabled
                  : styles.pageButton
              }
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Вперёд
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

async function fetchParticipants(params: {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  sort?: string;
}) {
  return apiFetch<PaginatedResponse<ParticipantSummary>>(withQuery("/artists", params));
}

function mapParticipant(participant: ParticipantSummary): ParticipantCard {
  return {
    id: participant.id,
    displayName: participant.display_name,
    fullName: participant.full_name ?? null,
    city: participant.city ?? null,
    joinedAt: participant.joined_at,
    avatarUrl: resolveAvatarUrl(participant),
    avgTotalScore: participant.avg_total_score ?? null,
    totalWins: participant.total_wins,
    roles: participant.roles,
  };
}

function resolveAvatarUrl(participant: ParticipantSummary): string {
  const avatar = participant.avatar;
  if (avatar?.url) {
    return avatar.url;
  }
  if (avatar?.key) {
    if (MEDIA_BASE_URL) {
      return `${MEDIA_BASE_URL}/${avatar.key}`;
    }
  }
  return DEFAULT_AVATAR;
}

function resolveRoleLabel(roles: string[]): string {
  if (roles.includes("judge")) {
    return "Судья";
  }
  if (roles.includes("artist")) {
    return "Баттлер";
  }
  if (roles.includes("moderator")) {
    return "Модератор";
  }
  if (roles.includes("admin")) {
    return "Администратор";
  }
  return "Участник";
}

function formatScore(value?: number | null): string {
  if (typeof value !== "number") {
    return "—";
  }
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
