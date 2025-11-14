"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/auth-context";
import {
  assignJudgeBattle,
  fetchJudgeAssignments,
  fetchJudgeBattleDetails,
  fetchJudgeHistory,
  requestRandomJudgeAssignment,
  submitJudgeScores,
  updateJudgeAssignmentStatus,
} from "@/lib/data";
import type { JudgeAssignment, JudgeBattleDetails, JudgeHistoryEntry } from "@/lib/types";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format";
import { formatMatchStatus } from "@/lib/labels";

export default function JudgeDashboard() {
  const { user, token } = useAuth();
  const isJudge = Boolean(user && user.roles.includes("judge"));
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [history, setHistory] = useState<JudgeHistoryEntry[]>([]);
  const [activeBattle, setActiveBattle] = useState<JudgeBattleDetails | null>(null);
  const [manualMatchId, setManualMatchId] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<string>("");
  const [passResult, setPassResult] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [rubricScores, setRubricScores] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    try {
      const [assignmentsData, historyData] = await Promise.all([fetchJudgeAssignments(token), fetchJudgeHistory(token)]);
      setAssignments(assignmentsData ?? []);
      setHistory(historyData ?? []);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Не удалось загрузить судейские данные");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isJudge) {
      loadData();
    }
  }, [isJudge, loadData]);

  const resetFormFromBattle = (details: JudgeBattleDetails) => {
    setActiveBattle(details);
    setScore(details.evaluation?.score != null ? String(details.evaluation.score) : "");
    setPassResult(details.evaluation?.pass ?? null);
    setComment(details.evaluation?.comment ?? "");
    const initialRubric: Record<string, string> = {};
    details.rubric.forEach((criterion) => {
      const value = details.evaluation?.rubric?.[criterion.key];
      initialRubric[criterion.key] = value != null ? String(value) : "";
    });
    setRubricScores(initialRubric);
  };

  const openBattle = async (matchId: string) => {
    if (!token) {
      setStatusMessage("Нет токена авторизации");
      return;
    }
    try {
      const details = await fetchJudgeBattleDetails(token, matchId);
      resetFormFromBattle(details);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Не удалось загрузить баттл");
    }
  };

  const handleRandomAssignment = async () => {
    if (!token) {
      setStatusMessage("Нет токена авторизации");
      return;
    }
    try {
      const assignment = await requestRandomJudgeAssignment(token);
      if (!assignment) {
        setStatusMessage("Нет доступных баттлов для назначения.");
      } else {
        setStatusMessage(`Назначен баттл ${assignment.match_id}`);
      }
      await loadData();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Не удалось получить баттл");
    }
  };

  const handleManualAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !manualMatchId) {
      return;
    }
    try {
      await assignJudgeBattle(token, manualMatchId);
      setStatusMessage("Баттл назначен");
      setManualMatchId("");
      await loadData();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Не удалось назначить баттл");
    }
  };

  const handleAssignmentStatus = async (assignmentId: string, status: "completed" | "skipped") => {
    if (!token) {
      return;
    }
    try {
      await updateJudgeAssignmentStatus(token, assignmentId, status);
      await loadData();
      setStatusMessage(status === "completed" ? "Оценка отправлена" : "Баттл пропущен");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Не удалось обновить статус");
    }
  };

  const handleSubmitScores = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !activeBattle) {
      return;
    }
    try {
      const rubricPayload: Record<string, number> = {};
      Object.entries(rubricScores).forEach(([key, value]) => {
        if (value !== "") {
          rubricPayload[key] = Number(value);
        }
      });
      await submitJudgeScores(token, activeBattle.match.id, {
        score: score ? Number(score) : undefined,
        pass: passResult ?? undefined,
        comment: comment || undefined,
        rubric: Object.keys(rubricPayload).length ? rubricPayload : undefined,
      });
      setStatusMessage("Оценка сохранена");
      await loadData();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Не удалось отправить оценку");
    }
  };

  if (!user) {
    return <p>Авторизуйтесь, чтобы попасть в кабинет судьи.</p>;
  }
  if (!isJudge) {
    return <p>У вас нет роли судьи.</p>;
  }

  return (
    <div>
      <h2>Кабинет судьи</h2>
      {statusMessage ? <p>{statusMessage}</p> : null}
      {loading ? <p>Загружаем данные...</p> : null}
      <section>
        <h3>Назначения</h3>
        <button type="button" onClick={handleRandomAssignment}>
          Получить случайный баттл
        </button>
        <form onSubmit={handleManualAssign}>
          <label>
            ID баттла
            <input value={manualMatchId} onChange={(event) => setManualMatchId(event.target.value)} />
          </label>
          <button type="submit">Назначить вручную</button>
        </form>
        {assignments.length ? (
          <ul>
            {assignments.map((assignment) => (
              <li key={assignment.id}>
                Баттл {assignment.match_id} — {formatMatchStatus(assignment.match_status)} (Раунд {assignment.round_number})
                <button type="button" onClick={() => openBattle(assignment.match_id)}>
                  Открыть
                </button>
                <button type="button" onClick={() => handleAssignmentStatus(assignment.id, "completed")}>
                  Отметить завершенным
                </button>
                <button type="button" onClick={() => handleAssignmentStatus(assignment.id, "skipped")}>
                  Пропустить
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Нет активных назначений.</p>
        )}
      </section>
      <section>
        <h3>Баттл</h3>
        {activeBattle ? (
          <JudgeBattlePanel
            details={activeBattle}
            score={score}
            onScoreChange={setScore}
            passResult={passResult}
            onPassChange={setPassResult}
            comment={comment}
            onCommentChange={setComment}
            rubricScores={rubricScores}
            onRubricChange={(key, value) => setRubricScores((prev) => ({ ...prev, [key]: value }))}
            onSubmit={handleSubmitScores}
          />
        ) : (
          <p>Выберите баттл из списка назначений.</p>
        )}
      </section>
      <section>
        <h3>История оценок</h3>
        {history.length ? (
          <ul>
            {history.map((entry) => (
              <li key={entry.id}>
                {formatDateTime(entry.created_at)}: баттл {entry.match_id} — {formatMatchStatus(entry.match_status)} (Раунд {entry.round_number}) — счет {formatNumber(entry.score)}
              </li>
            ))}
          </ul>
        ) : (
          <p>Пока нет оценок.</p>
        )}
      </section>
    </div>
  );
}

type JudgeBattlePanelProps = {
  details: JudgeBattleDetails;
  score: string;
  onScoreChange: (value: string) => void;
  passResult: boolean | null;
  onPassChange: (value: boolean | null) => void;
  comment: string;
  onCommentChange: (value: string) => void;
  rubricScores: Record<string, string>;
  onRubricChange: (key: string, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
};

const JudgeBattlePanel = ({ details, score, onScoreChange, passResult, onPassChange, comment, onCommentChange, rubricScores, onRubricChange, onSubmit }: JudgeBattlePanelProps) => (
  <div>
    <p>
      Баттл {details.match.id} — {formatMatchStatus(details.match.status)}. Раунд {details.match.round.number} ({details.match.round.kind}).
    </p>
    <p>Дедлайн судейства: {details.match.round.judging_deadline_at ?? "—"}</p>
    <h4>Участники</h4>
    <ul>
      {details.participants.map((participant) => (
        <li key={participant.participant_id}>
          {participant.display_name} — {participant.track ? (
            <span>
              <audio controls src={participant.track.audio_url ?? undefined}>
                Браузер не поддерживает аудио.
              </audio>
              Длительность: {formatDuration(participant.track.duration_sec)}
            </span>
          ) : (
            <span>Трек не загружен</span>
          )}
        </li>
      ))}
    </ul>
    <form onSubmit={onSubmit}>
      <label>
        Итоговый балл (0-100)
        <input type="number" min={0} max={100} value={score} onChange={(event) => onScoreChange(event.target.value)} />
      </label>
      <div>
        <span>Проход в следующий раунд:</span>
        <label>
          <input type="radio" name="pass" value="yes" checked={passResult === true} onChange={() => onPassChange(true)} /> Да
        </label>
        <label>
          <input type="radio" name="pass" value="no" checked={passResult === false} onChange={() => onPassChange(false)} /> Нет
        </label>
        <label>
          <input type="radio" name="pass" value="unset" checked={passResult === null} onChange={() => onPassChange(null)} /> Не указано
        </label>
      </div>
      {details.rubric.length ? (
        <div>
          <h5>Рубрика</h5>
          {details.rubric.map((item) => (
            <label key={item.key}>
              {item.name} ({item.min_value}-{item.max_value})
              <input
                type="number"
                value={rubricScores[item.key] ?? ""}
                min={item.min_value}
                max={item.max_value}
                onChange={(event) => onRubricChange(item.key, event.target.value)}
              />
            </label>
          ))}
        </div>
      ) : null}
      <label>
        Комментарий
        <textarea value={comment} onChange={(event) => onCommentChange(event.target.value)} rows={4} maxLength={2000} />
      </label>
      <button type="submit">Сохранить оценку</button>
    </form>
  </div>
);
