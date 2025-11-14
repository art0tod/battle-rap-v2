"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { apiFetch, ApiError } from "@/lib/api";
import { uploadAudioFile } from "@/lib/uploads";

export const ChallengeButton = ({ opponentId, opponentName }: { opponentId: string; opponentName: string }) => {
  const { user, token } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("Баттл вызов");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  if (!user || user.id === opponentId) {
    return null;
  }

  const toggle = () => {
    setExpanded((prev) => !prev);
    setStatus(null);
    setAudioFile(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setStatus("Нужна авторизация");
      return;
    }
    if (!audioFile) {
      setStatus("Добавьте аудиозапись для вызова.");
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      const uploaded = await uploadAudioFile(audioFile, token);
      const audioNote = uploaded.url ? `\nСсылка на аудио: ${uploaded.url}` : `\nID аудио: ${uploaded.id}`;
      const payloadDescription = `${description.trim()}\n${audioNote}`.trim();
      await apiFetch("/challenges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ opponent_id: opponentId, title, description: payloadDescription }),
      });
      setStatus("Вызов отправлен, следите за статусом во вкладке 'Вызовы'.");
      setExpanded(false);
      setDescription("");
      setAudioFile(null);
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
          <label>
            Аудиозапись
            <input type="file" accept="audio/*" required onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} />
          </label>
          {audioFile ? <p>Файл: {audioFile.name}</p> : <p>Загрузите mp3/wav файл.</p>}
          <button type="submit" disabled={submitting}>
            Отправить вызов
          </button>
        </form>
      ) : null}
      {status ? <p>{status}</p> : null}
    </div>
  );
};
