"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { createAdminRound, fetchAdminBattles, fetchAdminOverview, fetchAdminTournaments } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { formatMatchStatus, formatRoundStatus, formatTournamentStatus } from "@/lib/labels";
import type { AdminBattle, AdminOverview, AdminTournament } from "@/lib/types";

const TOURNAMENT_STATUS_OPTIONS = ["draft", "registration", "ongoing", "completed", "archived"];

export default function AdminPage() {
  const { user, token } = useAuth();
  const isAdmin = Boolean(user && user.roles.includes("admin"));
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [battles, setBattles] = useState<AdminBattle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
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
