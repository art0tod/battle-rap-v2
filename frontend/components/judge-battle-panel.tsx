"use client";

import { useAuth } from "@/context/auth-context";
import { assignJudgeBattle, fetchJudgeBattleDetails, submitJudgeScores } from "@/lib/data";
import type { JudgeBattleDetails } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { formatMatchStatus } from "@/lib/labels";
import { ApiError } from "@/lib/api";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type JudgeBattlePanelProps = {
  matchId: string;
};

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    const body = error.body;
    if (body && typeof body === "object" && "message" in body && typeof (body as { message?: string }).message === "string") {
      return (body as { message: string }).message;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

const emptyRubricState = (details: JudgeBattleDetails | null) => {
  if (!details) {
    return {};
  }
  const entries: Record<string, string> = {};
  details.rubric.forEach((criterion) => {
    const existing = details.evaluation?.rubric?.[criterion.key];
    entries[criterion.key] = existing != null ? String(existing) : "";
  });
  return entries;
};

export default function JudgeBattlePanel({ matchId }: JudgeBattlePanelProps) {
  const { user, token } = useAuth();
  const isJudge = Boolean(user?.roles?.includes("judge"));
  const [details, setDetails] = useState<JudgeBattleDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [passResult, setPassResult] = useState<"" | "pass" | "fail">("");
  const [comment, setComment] = useState("");
  const [rubricScores, setRubricScores] = useState<Record<string, string>>({});
  const [needsAssignment, setNeedsAssignment] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const applyDetails = useCallback((info: JudgeBattleDetails) => {
    setDetails(info);
    setScore(info.evaluation?.score != null ? String(info.evaluation.score) : "");
    const passValue =
      info.evaluation?.pass == null ? "" : info.evaluation.pass === true ? "pass" : "fail";
    setPassResult(passValue);
    setComment(info.evaluation?.comment ?? "");
    setRubricScores(emptyRubricState(info));
  }, []);

  const loadDetails = useCallback(async () => {
    if (!token || !isJudge) {
      setDetails(null);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      setNeedsAssignment(false);
      const response = await fetchJudgeBattleDetails(token, matchId);
      applyDetails(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setNeedsAssignment(true);
        setErrorMessage(extractErrorMessage(error, "Назначьте себе этот баттл, чтобы открыть судейскую форму."));
      } else {
        setErrorMessage(extractErrorMessage(error, "Не удалось загрузить данные баттла"));
      }
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [applyDetails, isJudge, matchId, token]);

  useEffect(() => {
    if (isJudge && token) {
      loadDetails();
    }
  }, [isJudge, token, loadDetails]);

  if (!user) {
    return <p>Войдите, чтобы оценивать баттлы.</p>;
  }

  if (!isJudge) {
    return <p>Оценка доступна только судьям.</p>;
  }

  const handleRubricChange = (key: string, value: string) => {
    setRubricScores((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAssignBattle = async () => {
    if (!token) {
      return;
    }
    setAssigning(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await assignJudgeBattle(token, matchId);
      setStatusMessage("Баттл назначен. Можно приступать к оценке.");
      setNeedsAssignment(false);
      await loadDetails();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Не удалось назначить баттл"));
    } finally {
      setAssigning(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !details) {
      return;
    }
    setSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const rubricPayload: Record<string, number> = {};
      Object.entries(rubricScores).forEach(([key, value]) => {
        if (value !== "") {
          rubricPayload[key] = Number(value);
        }
      });
      await submitJudgeScores(token, matchId, {
        score: score ? Number(score) : undefined,
        pass: passResult === "" ? undefined : passResult === "pass",
        comment: comment || undefined,
        rubric: Object.keys(rubricPayload).length ? rubricPayload : undefined,
      });
      setStatusMessage("Оценка сохранена");
      await loadDetails();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Не удалось отправить оценку"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h4>Оценка судьи</h4>
      {statusMessage ? <p>{statusMessage}</p> : null}
      {errorMessage ? <p>{errorMessage}</p> : null}
      {loading ? <p>Загружаем данные...</p> : null}
      {needsAssignment ? (
        <div>
          <p>Этот баттл пока не назначен вам.</p>
          <button type="button" onClick={handleAssignBattle} disabled={assigning}>
            {assigning ? "Назначаем..." : "Назначить меня на баттл"}
          </button>
        </div>
      ) : null}
      {details ? (
        <div>
          <p>Статус баттла: {formatMatchStatus(details.match.status)}</p>
          <p>Начало: {details.match.starts_at ? formatDateTime(details.match.starts_at) : "—"}</p>
          <p>Дедлайн судейства: {details.match.round.judging_deadline_at ? formatDateTime(details.match.round.judging_deadline_at) : "—"}</p>
          <form onSubmit={handleSubmit}>
            <label>
              Итоговый балл
              <input type="number" value={score} onChange={(event) => setScore(event.target.value)} />
            </label>
            <label>
              Решение
              <select value={passResult} onChange={(event) => setPassResult(event.target.value as "" | "pass" | "fail")}>
                <option value="">—</option>
                <option value="pass">Прошел</option>
                <option value="fail">Не прошел</option>
              </select>
            </label>
            {details.rubric.length ? (
              <fieldset>
                <legend>Критерии</legend>
                {details.rubric.map((criterion) => {
                  const minValue = criterion.min_value ?? "—";
                  const maxValue = criterion.max_value ?? "—";
                  return (
                    <label key={criterion.key}>
                      {criterion.name} ({minValue}–{maxValue})
                      <input
                        type="number"
                        value={rubricScores[criterion.key] ?? ""}
                        min={criterion.min_value ?? undefined}
                        max={criterion.max_value ?? undefined}
                        onChange={(event) => handleRubricChange(criterion.key, event.target.value)}
                      />
                    </label>
                  );
                })}
              </fieldset>
            ) : null}
            <label>
              Комментарий
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? "Сохраняем..." : "Сохранить оценку"}
            </button>
            <button type="button" onClick={loadDetails} disabled={loading}>
              Обновить данные
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
