"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { apiFetch, ApiError } from "@/lib/api";

export const ChallengeButton = ({ opponentId, opponentName }: { opponentId: string; opponentName: string }) => {
  const { user, token } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("Баттл вызов");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user || user.id === opponentId) {
    return null;
  }

  const toggle = () => {
    setExpanded((prev) => !prev);
    setStatus(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setStatus("Нужна авторизация");
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await apiFetch("/challenges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ opponent_id: opponentId, title, description }),
      });
      setStatus("Вызов отправлен, следите за статусом во вкладке 'Вызовы'.");
      setExpanded(false);
      setDescription("");
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === "object") {
        const body = err.body as { message?: string };
        setStatus(body.message ?? `Ошибка API (${err.status})`);
      } else {
        setStatus(err instanceof Error ? err.message : "Не удалось отправить вызов");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={toggle}>
        {expanded ? "Скрыть вызов" : `Вызвать ${opponentName}`}
      </button>
      {expanded ? (
        <form onSubmit={handleSubmit}>
          <label>
            Заголовок
            <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} required />
          </label>
          <label>
            Описание
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={2000} />
          </label>
          <button type="submit" disabled={submitting}>
            Отправить вызов
          </button>
        </form>
      ) : null}
      {status ? <p>{status}</p> : null}
    </div>
  );
};
