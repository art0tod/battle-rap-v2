"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@/context/auth-context";
import type { ActiveApplicationRound, ApplicationRecord } from "@/lib/types";
import { fetchMyApplication, submitApplicationRequest } from "@/lib/data";
import { uploadAudioFile } from "@/lib/uploads";

export type ApplicationFormProps = {
  round: ActiveApplicationRound;
};

export const ApplicationForm = ({ round }: ApplicationFormProps) => {
  const { user, token } = useAuth();
  const [existing, setExisting] = useState<ApplicationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [city, setCity] = useState("");
  const [beatAuthor, setBeatAuthor] = useState("");
  const [vkId, setVkId] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<number | "">("");

  useEffect(() => {
    if (!token) {
      setExisting(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const record = await fetchMyApplication(token);
        if (!cancelled) {
          setExisting(record);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить заявку");
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!existing) {
      return;
    }
    setCity(existing.city ?? "");
    setBeatAuthor(existing.beat_author ?? "");
    setVkId(existing.vk_id ?? "");
    setFullName(existing.full_name ?? "");
    setLyrics(existing.lyrics ?? "");
    setAge(existing.age ?? "");
  }, [existing]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      setFile(null);
      return;
    }
    setFile(event.target.files[0]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("Необходимо войти на сайт");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let audioId = existing?.audio_id ?? null;
      let lyricsWithAudio = lyrics;
      if (file) {
        const upload = await uploadAudioFile(file, token);
        audioId = upload.id;
        if (upload.url) {
          const note = `Audio: ${upload.url}`;
          lyricsWithAudio = lyrics ? `${lyrics.trim()}\n${note}` : note;
        }
      }
      if (!audioId) {
        setError("Загрузите трек перед отправкой заявки");
        setLoading(false);
        return;
      }
      const response = await submitApplicationRequest(token, {
        city: city || undefined,
        age: typeof age === "number" ? age : undefined,
        vkId: vkId || undefined,
        fullName: fullName || undefined,
        beatAuthor: beatAuthor || undefined,
        audioId,
        lyrics: lyricsWithAudio || undefined,
      });
      setExisting(response as ApplicationRecord);
      setSuccess("Заявка отправлена. Статус: " + (response as { status?: string })?.status);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить заявку");
    } finally {
      setLoading(false);
    }
  };

  const roundInfo = useMemo(
    () => (
      <ul>
        <li>Раунд: {round.number} ({round.kind})</li>
        <li>Подача до: {round.submission_deadline_at ?? "Не указано"}</li>
        <li>Турнир: {round.tournament_title}</li>
      </ul>
    ),
    [round]
  );

  if (!user) {
    return <p>Авторизуйтесь, чтобы подать заявку.</p>;
  }

  return (
    <div>
      <h3>Анкета</h3>
      {roundInfo}
      {existing ? (
        <p>
          Статус последней заявки: {existing.status} (отправлена {new Date(existing.created_at).toLocaleString()})
        </p>
      ) : null}
      <form onSubmit={handleSubmit}>
        <label>
          Город
          <input value={city} onChange={(event) => setCity(event.target.value)} />
        </label>
        <label>
          Возраст
          <input
            type="number"
            min={12}
            max={120}
            value={age}
            onChange={(event) => setAge(event.target.value ? Number(event.target.value) : "")}
          />
        </label>
        <label>
          Полное имя
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </label>
        <label>
          VK
          <input value={vkId} onChange={(event) => setVkId(event.target.value)} />
        </label>
        <label>
          Автор бита
          <input value={beatAuthor} onChange={(event) => setBeatAuthor(event.target.value)} />
        </label>
        <label>
          Текст трека
          <textarea value={lyrics} onChange={(event) => setLyrics(event.target.value)} rows={4} />
        </label>
        <label>
          Аудио (mp3/wav)
          <input type="file" accept="audio/*" onChange={handleFileChange} />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Отправляем..." : "Подать заявку"}
        </button>
      </form>
      {error ? <p>Ошибка: {error}</p> : null}
      {success ? <p>{success}</p> : null}
    </div>
  );
};
