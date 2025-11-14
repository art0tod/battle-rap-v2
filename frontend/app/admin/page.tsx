"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import {
  createAdminRound,
  fetchAdminBattles,
  fetchAdminOverview,
  fetchAdminTournaments,
  fetchRoundOverview,
  fetchApplicationsModeration,
  fetchApplicationDetail,
  approveApplication,
  rejectApplication,
  fetchTournamentDetail,
} from "@/lib/data";
import { fetchAdminUsers, updateUserRole } from "@/lib/admin";
import { formatDateTime, formatNumber } from "@/lib/format";
import { formatMatchStatus, formatRoundStatus, formatTournamentStatus } from "@/lib/labels";
import type {
  AdminBattle,
  AdminOverview,
  AdminTournament,
  ApplicationAdmin,
  RoundOverviewResponse,
  RoundSummary,
} from "@/lib/types";
import type { AdminUserSummary } from "@/lib/admin";

const TOURNAMENT_STATUS_OPTIONS = ["draft", "registration", "ongoing", "completed", "archived"];
const USER_ROLE_OPTIONS = ["admin", "moderator", "judge", "artist", "listener"] as const;
type ApplicationItem = ApplicationAdmin & { audio_url?: string | null };

export default function AdminPage() {
  const { user, token } = useAuth();
  const isAdmin = Boolean(user && user.roles.includes("admin"));
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [battles, setBattles] = useState<AdminBattle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [roundOverview, setRoundOverview] = useState<RoundOverviewResponse | null>(null);
  const [roundOverviewLoading, setRoundOverviewLoading] = useState(false);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userLimit, setUserLimit] = useState(20);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationReasons, setApplicationReasons] = useState<Record<string, string>>({});
  const [roundForm, setRoundForm] = useState({
    tournamentId: "",
    kind: "qualifier1",
    number: 1,
    scoring: "rubric",
    status: "draft",
    strategy: "weighted",
    starts_at: "",
    submission_deadline_at: "",
    judging_deadline_at: "",
  });

  const loadAdminData = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [overviewData, tournamentData, battlesData] = await Promise.all([
        fetchAdminOverview(token),
        fetchAdminTournaments(token),
        fetchAdminBattles(token, { limit: 5 }),
      ]);
      setOverview(overviewData);
      setTournaments(tournamentData);
      setBattles(battlesData.data);
      setRoundForm((prev) => {
        if (prev.tournamentId || tournamentData.length === 0) {
          return prev;
        }
        return { ...prev, tournamentId: tournamentData[0].id };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить данные админки");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, loadAdminData]);

  useEffect(() => {
    if (tournaments.length && !selectedTournamentId) {
      setSelectedTournamentId(tournaments[0].id);
    }
  }, [tournaments, selectedTournamentId]);

  useEffect(() => {
    const loadRounds = async () => {
      if (!selectedTournamentId) {
        setRounds([]);
        setSelectedRoundId("");
        setRoundOverview(null);
        return;
      }
      try {
        const detail = await fetchTournamentDetail(selectedTournamentId);
        setRounds(detail.rounds);
        if (!detail.rounds.find((round) => round.id === selectedRoundId)) {
          setSelectedRoundId(detail.rounds[0]?.id ?? "");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить раунды");
      }
    };
    loadRounds();
  }, [selectedTournamentId, selectedRoundId]);

  useEffect(() => {
    const loadOverview = async () => {
      if (!selectedRoundId) {
        setRoundOverview(null);
        return;
      }
      try {
        setRoundOverviewLoading(true);
        const overviewData = await fetchRoundOverview(selectedRoundId);
        setRoundOverview(overviewData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить данные раунда");
      } finally {
        setRoundOverviewLoading(false);
      }
    };
    loadOverview();
  }, [selectedRoundId]);

  const loadUsers = useCallback(
    async (page: number) => {
      if (!token) {
        return;
      }
      try {
        const response = await fetchAdminUsers(token, {
          page,
          limit: userLimit,
          search: userSearch || undefined,
          role: userRoleFilter || undefined,
          sort: "-created_at",
        });
        setUsers(response.data);
        setUserPage(response.page);
        setUserTotal(response.total);
        setUserLimit(response.limit);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить пользователей");
      }
    },
    [token, userLimit, userSearch, userRoleFilter],
  );

  useEffect(() => {
    if (isAdmin) {
      loadUsers(1);
    }
  }, [isAdmin, loadUsers]);

  const loadApplications = useCallback(
    async (roundId?: string) => {
      if (!token) {
        return;
      }
      setApplicationsLoading(true);
      try {
        const list = await fetchApplicationsModeration(token, { status: "submitted", limit: 50 });
        const filtered = roundId ? list.filter((app) => app.round_id === roundId) : list;
        const detailed = await Promise.all(
          filtered.map(async (app) => {
            const detail = await fetchApplicationDetail(token, app.id).catch(() => null);
            const merged = detail ?? app;
            const audioUrl = extractAudioFromText(merged.lyrics);
            return { ...merged, audio_url: audioUrl } as ApplicationItem;
          }),
        );
        setApplications(detailed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить заявки");
      } finally {
        setApplicationsLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (isAdmin) {
      loadApplications(selectedRoundId);
    }
  }, [isAdmin, selectedRoundId, loadApplications]);

  const requireAdmin = () => {
    if (!token) {
      setError("Недоступно без авторизации");
      return false;
    }
    return true;
  };

  const handleTournamentStatusChange = async (id: string, status: string) => {
    if (!requireAdmin()) {
      return;
    }
    try {
      const updated = await apiFetch<AdminTournament>(`/admin/tournaments/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      setTournaments((prev) => prev.map((tournament) => (tournament.id === id ? updated : tournament)));
      setInfo("Статус турнира обновлен");
    } catch (err) {
      const message = err instanceof ApiError ? err.body && typeof err.body === "object" ? (err.body as { message?: string }).message : null : null;
      setError(message ?? (err instanceof Error ? err.message : "Не удалось обновить турнир"));
    }
  };

  const handleFinalizeBattle = async (id: string) => {
    if (!requireAdmin()) {
      return;
    }
    try {
      await apiFetch(`/admin/finalize/battles/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await loadAdminData();
      setInfo("Баттл финализирован");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось завершить баттл");
    }
  };

  const handleRoundCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requireAdmin()) {
      return;
    }
    if (!roundForm.tournamentId) {
      setError("Выберите турнир для раунда");
      return;
    }
    try {
      await createAdminRound(token!, roundForm.tournamentId, {
        kind: roundForm.kind as "qualifier1" | "qualifier2" | "bracket",
        number: Number(roundForm.number),
        scoring: roundForm.scoring as "pass_fail" | "points" | "rubric",
        status: roundForm.status,
        strategy: roundForm.strategy as "weighted" | "majority",
        starts_at: roundForm.starts_at ? new Date(roundForm.starts_at).toISOString() : null,
        submission_deadline_at: roundForm.submission_deadline_at ? new Date(roundForm.submission_deadline_at).toISOString() : null,
        judging_deadline_at: roundForm.judging_deadline_at ? new Date(roundForm.judging_deadline_at).toISOString() : null,
      });
      setInfo("Раунд создан");
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать раунд");
    }
  };

  const handleRoleToggle = async (targetUserId: string, role: (typeof USER_ROLE_OPTIONS)[number]) => {
    if (!requireAdmin()) {
      return;
    }
    try {
      const current = users.find((item) => item.id === targetUserId);
      if (!current) {
        return;
      }
      const hasRole = current.roles.includes(role);
      const response = await updateUserRole(token!, targetUserId, role, hasRole ? "revoke" : "grant");
      setUsers((prev) =>
        prev.map((item) => (item.id === targetUserId ? { ...item, roles: response.roles } : item)),
      );
      setInfo(`Роли пользователя ${current.display_name} обновлены.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить роль");
    }
  };

  const handleApproveApplication = async (applicationId: string) => {
    if (!requireAdmin()) {
      return;
    }
    try {
      await approveApplication(token!, applicationId);
      setInfo("Заявка одобрена.");
      await loadApplications();
      setApplicationReasons((prev) => ({ ...prev, [applicationId]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось одобрить заявку");
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    if (!requireAdmin()) {
      return;
    }
    const reason = applicationReasons[applicationId]?.trim() || "Не подходит для текущего этапа";
    try {
      await rejectApplication(token!, applicationId, reason);
      setInfo("Заявка отклонена.");
      await loadApplications();
      setApplicationReasons((prev) => ({ ...prev, [applicationId]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отклонить заявку");
    }
  };

  if (!user) {
    return <p>Авторизуйтесь под администратором.</p>;
  }

  if (!isAdmin) {
    return <p>Недостаточно прав для доступа в админку.</p>;
  }

  return (
    <div>
      <h2>Админ-панель</h2>
      {error ? <p>Ошибка: {error}</p> : null}
      {info ? <p>{info}</p> : null}
      {loading ? <p>Загружаем данные...</p> : null}
      {overview ? (
        <section>
          <h3>Метрики</h3>
          <ul>
            <li>Заявок в ожидании: {overview.metrics.applications_pending}</li>
            <li>Отправлено треков: {overview.metrics.submissions_submitted}</li>
            <li>Одобрено треков: {overview.metrics.submissions_approved}</li>
          </ul>
          <h4>Ближайшие дедлайны</h4>
          {overview.upcoming_round_deadlines.length ? (
            <ul>
              {overview.upcoming_round_deadlines.map((round) => (
                <li key={round.id}>
                  Раунд {round.number} ({round.kind}) — {formatRoundStatus(round.status)}. Подача до {formatDateTime(round.submission_deadline_at)}. Судейство до {formatDateTime(round.judging_deadline_at)}.
                </li>
              ))}
            </ul>
          ) : (
            <p>Нет раундов с дедлайнами в ближайшие 7 дней.</p>
          )}
          <h4>Матчи без треков</h4>
          {overview.problematic_matches.length ? (
            <ul>
              {overview.problematic_matches.map((item) => (
                <li key={item.match_id}>
                  Раунд {item.round_number} ({item.round_kind}) — дедлайн {formatDateTime(item.submission_deadline_at)}
                </li>
              ))}
            </ul>
          ) : (
            <p>Нет просроченных матчей.</p>
          )}
        </section>
      ) : null}
      <section>
        <h3>Турнир</h3>
        {tournaments.length ? (
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Статус</th>
                <th>Подача</th>
                <th>Судейство</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tournament) => (
                <tr key={tournament.id}>
                  <td>{tournament.title}</td>
                  <td>
                    <select value={tournament.status} onChange={(event) => handleTournamentStatusChange(tournament.id, event.target.value)}>
                      {TOURNAMENT_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {formatTournamentStatus(option)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formatDateTime(tournament.submission_deadline_at)}</td>
                  <td>{formatDateTime(tournament.judging_deadline_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Турниры не найдены.</p>
        )}
      </section>
      <section>
        <h3>Раунды и участники</h3>
        {rounds.length ? (
          <div>
            <label>
              Турнир
              <select value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)}>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Раунд
              <select value={selectedRoundId} onChange={(event) => setSelectedRoundId(event.target.value)}>
                {rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    #{round.number} ({round.kind}) — {formatRoundStatus(round.status)}
                  </option>
                ))}
              </select>
            </label>
            {roundOverviewLoading ? (
              <p>Загружаем данные раунда...</p>
            ) : roundOverview ? (
              <div>
                <p>
                  Баттлов {roundOverview.summary?.total_matches ?? 0}, треков {roundOverview.summary?.total_tracks ?? 0}, отзывов{" "}
                  {roundOverview.summary?.total_reviews ?? 0}
                </p>
                {roundOverview.matches?.length ? (
                  roundOverview.matches.map((match) => (
                    <article key={match.id}>
                      <h4>
                        Баттл {match.id} — {formatMatchStatus(match.status)}
                      </h4>
                    {match.participants.length ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Участник</th>
                            <th>Результат</th>
                            <th>Баллы</th>
                            <th>Трек</th>
                          </tr>
                        </thead>
                        <tbody>
                          {match.participants.map((participant) => (
                            <tr key={participant.participant_id}>
                              <td>{participant.display_name}</td>
                              <td>{participant.result_status ?? "—"}</td>
                              <td>{formatNumber(participant.avg_total_score)}</td>
                              <td>
                                {participant.track?.audio_url ? (
                                  <audio controls src={participant.track.audio_url}>
                                    Браузер не поддерживает аудио.
                                  </audio>
                                ) : (
                                  "Нет трека"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p>Участники отсутствуют.</p>
                    )}
                  </article>
                  ))
                ) : (
                  <p>Нет баттлов в этом раунде.</p>
                )}
                <div>
                  <h4>Заявки на участие</h4>
                  {applicationsLoading ? (
                    <p>Загружаем заявки...</p>
                  ) : applications.length ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Участник</th>
                          <th>Город</th>
                          <th>Дата</th>
                          <th>Аудио</th>
                          <th>Решение</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((application) => (
                          <tr key={application.id}>
                            <td>{application.display_name ?? application.full_name ?? application.user_id}</td>
                            <td>{application.city ?? "—"}</td>
                            <td>{formatDateTime(application.created_at)}</td>
                            <td>
                              {application.audio_url ? (
                                <audio controls src={application.audio_url}>
                                  Браузер не поддерживает аудио.
                                </audio>
                              ) : (
                                application.audio_id ?? "Нет файла"
                              )}
                            </td>
                            <td>
                              <button type="button" onClick={() => handleApproveApplication(application.id)}>
                                Допустить
                              </button>
                              <div>
                                <input
                                  type="text"
                                  placeholder="Причина отказа"
                                  value={applicationReasons[application.id] ?? ""}
                                  onChange={(event) =>
                                    setApplicationReasons((prev) => ({ ...prev, [application.id]: event.target.value }))
                                  }
                                />
                                <button type="button" onClick={() => handleRejectApplication(application.id)}>
                                  Отклонить
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>Нет заявок для этого раунда.</p>
                  )}
                </div>
              </div>
            ) : (
              <p>Выберите раунд, чтобы увидеть его участников.</p>
            )}
          </div>
        ) : (
          <p>Для выбранного турнира нет раундов.</p>
        )}
      </section>
      <section>
        <h3>Пользователи и роли</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            loadUsers(1);
          }}
        >
          <label>
            Поиск
            <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Имя или email" />
          </label>
          <label>
            Роль
            <select value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)}>
              <option value="">Все</option>
              {USER_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Применить</button>
        </form>
        {users.length ? (
          <table>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>Создан</th>
                {USER_ROLE_OPTIONS.map((role) => (
                  <th key={role}>{role}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td>{item.display_name}</td>
                  <td>{item.email}</td>
                  <td>{formatDateTime(item.created_at)}</td>
                  {USER_ROLE_OPTIONS.map((role) => (
                    <td key={role}>
                      <label>
                        <input
                          type="checkbox"
                          checked={item.roles.includes(role)}
                          onChange={() => handleRoleToggle(item.id, role)}
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Нет пользователей для отображения.</p>
        )}
        <div>
          <button type="button" disabled={userPage <= 1} onClick={() => loadUsers(userPage - 1)}>
            Предыдущая
          </button>
          <span>
            Страница {userPage} из {Math.max(1, Math.ceil(userTotal / userLimit))}
          </span>
          <button
            type="button"
            disabled={userPage >= Math.ceil(userTotal / userLimit)}
            onClick={() => loadUsers(userPage + 1)}
          >
            Следующая
          </button>
        </div>
      </section>
      <section>
        <h3>Создать раунд</h3>
        <form onSubmit={handleRoundCreate}>
          <label>
            Турнир
            <select
              value={roundForm.tournamentId}
              onChange={(event) => setRoundForm((prev) => ({ ...prev, tournamentId: event.target.value }))}
              required
            >
              <option value="">Выберите турнир</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Тип
            <select value={roundForm.kind} onChange={(event) => setRoundForm((prev) => ({ ...prev, kind: event.target.value }))}>
              <option value="qualifier1">Отбор 1</option>
              <option value="qualifier2">Отбор 2</option>
              <option value="bracket">Плей-офф</option>
            </select>
          </label>
          <label>
            Номер
            <input
              type="number"
              min={1}
              value={roundForm.number}
              onChange={(event) => setRoundForm((prev) => ({ ...prev, number: Number(event.target.value) }))}
            />
          </label>
          <label>
            Система
            <select
              value={roundForm.scoring}
              onChange={(event) => setRoundForm((prev) => ({ ...prev, scoring: event.target.value }))}
            >
              <option value="pass_fail">Проход/Нет</option>
              <option value="points">Баллы</option>
              <option value="rubric">Рубрика</option>
            </select>
          </label>
          <label>
            Стратегия
            <select
              value={roundForm.strategy}
              onChange={(event) => setRoundForm((prev) => ({ ...prev, strategy: event.target.value }))}
            >
              <option value="weighted">Взвешенная</option>
              <option value="majority">Большинство</option>
            </select>
          </label>
          <label>
            Статус
            <select
              value={roundForm.status}
              onChange={(event) => setRoundForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="draft">Черновик</option>
              <option value="submission">Подача</option>
              <option value="judging">Судейство</option>
              <option value="finished">Завершен</option>
            </select>
          </label>
          <label>
            Старт
            <input
              type="datetime-local"
              value={roundForm.starts_at}
              onChange={(event) => setRoundForm((prev) => ({ ...prev, starts_at: event.target.value }))}
            />
          </label>
          <label>
            Дедлайн подачи
            <input
              type="datetime-local"
              value={roundForm.submission_deadline_at}
              onChange={(event) => setRoundForm((prev) => ({ ...prev, submission_deadline_at: event.target.value }))}
            />
          </label>
          <label>
            Дедлайн судейства
            <input
              type="datetime-local"
              value={roundForm.judging_deadline_at}
              onChange={(event) => setRoundForm((prev) => ({ ...prev, judging_deadline_at: event.target.value }))}
            />
          </label>
          <button type="submit">Создать</button>
        </form>
      </section>
      <section>
        <h3>Последние баттлы</h3>
        {battles.length ? (
          <ul>
            {battles.map((battle) => (
              <li key={battle.id}>
                <article>
                  <p>
                    {battle.tournament.title}: раунд {battle.round.number} — {formatMatchStatus(battle.status)}
                  </p>
                  <p>Начало: {formatDateTime(battle.starts_at)}</p>
                  <p>Участники: {battle.participants.map((p) => p.display_name).join(", ") || "—"}</p>
                  <button type="button" onClick={() => handleFinalizeBattle(battle.id)}>
                    Финализировать баттл
                  </button>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p>Нет баттлов для отображения.</p>
        )}
      </section>
    </div>
  );
}

function extractAudioFromText(text?: string | null) {
  if (!text) {
    return null;
  }
  const match = text.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}
