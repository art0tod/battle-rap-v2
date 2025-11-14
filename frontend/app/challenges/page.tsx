"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/auth-context";
import { fetchArtists, fetchChallenges, submitChallengeResponseRequest } from "@/lib/data";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { formatChallengeStatus } from "@/lib/labels";
import type { Challenge, ChallengeResponse, ParticipantSummary } from "@/lib/types";
import { uploadAudioFile } from "@/lib/uploads";

export default function ChallengesPage() {
  const { user, token } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [opponentSearch, setOpponentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ParticipantSummary[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<ParticipantSummary | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchChallenges();
      setChallenges(data);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Не удалось загрузить вызовы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const handleSearchOpponents = useCallback(async () => {
    if (!opponentSearch.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetchArtists({ search: opponentSearch.trim(), limit: 5 });
      setSearchResults(response.data);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Ошибка поиска участников");
    }
  }, [opponentSearch]);

  const requireAuthToken = () => {
    if (!token) {
      setActionMessage("Требуется авторизация для выполнения действия.");
      return false;
    }
    return true;
  };

  const handleCreateChallenge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requireAuthToken() || !selectedOpponent) {
      return;
    }
    if (!audioFile) {
      setActionMessage("Добавьте аудиозапись к вызову.");
      return;
    }
    setSubmitting(true);
    setActionMessage(null);
    try {
      const upload = await uploadAudioFile(audioFile, token!);
      const note = upload.url ? `\nСсылка на аудио: ${upload.url}` : `\nID аудио: ${upload.id}`;
      const payloadDescription = `${description.trim()}\n${note}`.trim();
      await apiFetch<Challenge>("/challenges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opponent_id: selectedOpponent.id,
          title: title.trim(),
          description: payloadDescription,
        }),
      });
      setTitle("");
      setDescription("");
      setSelectedOpponent(null);
      setSearchResults([]);
      setOpponentSearch("");
      setAudioFile(null);
      await loadChallenges();
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === "object") {
        const body = err.body as { message?: string };
        setActionMessage(body.message ?? `Ошибка API (${err.status})`);
      } else {
        setActionMessage(err instanceof Error ? err.message : "Не удалось создать вызов");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChallengeAction = async (challengeId: string, action: "accept" | "cancel" | "complete") => {
    if (!requireAuthToken()) {
      return;
    }
    setActionMessage(null);
    try {
      await apiFetch<Challenge>(`/challenges/${challengeId}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await loadChallenges();
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === "object") {
        const body = err.body as { message?: string };
        setActionMessage(body.message ?? `Ошибка API (${err.status})`);
      } else {
        setActionMessage(err instanceof Error ? err.message : "Не удалось выполнить действие");
      }
    }
  };

  const handleVote = async (challengeId: string, side: "initiator" | "opponent") => {
    if (!requireAuthToken()) {
      return;
    }
    setActionMessage(null);
    try {
      await apiFetch<Challenge>(`/challenges/${challengeId}/votes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ side }),
      });
      await loadChallenges();
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === "object") {
        const body = err.body as { message?: string };
        setActionMessage(body.message ?? `Ошибка API (${err.status})`);
      } else {
        setActionMessage(err instanceof Error ? err.message : "Не удалось сохранить голос");
      }
    }
  };

  return (
    <div>
      <h2>Вызовы</h2>
      <p>Любой авторизованный пользователь может бросить вызов другому участнику и вести собственный баттл вне турнира.</p>
      {user ? (
        <section>
          <h3>Создать вызов</h3>
          <form onSubmit={handleCreateChallenge}>
            <label>
              Противник
              <input
                type="text"
                value={opponentSearch}
                placeholder="Имя или город"
                onChange={(event) => setOpponentSearch(event.target.value)}
              />
            </label>
            <button type="button" onClick={handleSearchOpponents} disabled={!opponentSearch.trim()}>
              Найти
            </button>
            {searchResults.length ? (
              <ul>
                {searchResults.map((candidate) => (
                  <li key={candidate.id}>
                    <button type="button" onClick={() => setSelectedOpponent(candidate)}>
                      Выбрать {candidate.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {selectedOpponent ? <p>Выбран: {selectedOpponent.display_name}</p> : null}
            <label>
              Заголовок
              <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} required />
            </label>
            <label>
              Описание
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} />
            </label>
            <label>
              Аудиозапись
              <input type="file" accept="audio/*" required onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} />
            </label>
            {audioFile ? <p>Файл: {audioFile.name}</p> : <p>Выберите mp3/wav файл.</p>}
            <button type="submit" disabled={submitting || !selectedOpponent || !title.trim()}>
              Отправить вызов
            </button>
          </form>
        </section>
      ) : (
        <p>Авторизуйтесь, чтобы создавать вызовы и участвовать в них.</p>
      )}
      {actionMessage ? <p>Статус: {actionMessage}</p> : null}
      <section>
        <h3>Текущие вызовы</h3>
        {loading ? (
          <p>Загружаем...</p>
        ) : challenges.length ? (
          <ol>
            {challenges.map((challenge) => (
              <li key={challenge.id}>
                <article>
                  <h4>{challenge.title}</h4>
                  <p>Статус: {formatChallengeStatus(challenge.status)}</p>
                  <p>
                    {challenge.initiator.display_name} против {challenge.opponent.display_name}
                  </p>
                  <p>Создано: {formatDateTime(challenge.timestamps.created_at)}</p>
                  <p>
                    Голоса: инициатор {challenge.votes.initiator} — оппонент {challenge.votes.opponent}
                  </p>
                  <ChallengeAudio description={challenge.description} />
                  <div>
                    <h5>Ответы</h5>
                    <ChallengeResponseCard
                      label={`Трек ${challenge.initiator.display_name}`}
                      response={challenge.responses?.initiator ?? null}
                    />
                    <ChallengeResponseCard
                      label={`Трек ${challenge.opponent.display_name}`}
                      response={challenge.responses?.opponent ?? null}
                    />
                  </div>
                  {user && token ? (
                    <ChallengeResponseForm
                      key={`response-form-${challenge.id}`}
                      challenge={challenge}
                      currentUserId={user.id}
                      token={token}
                      onSuccess={loadChallenges}
                    />
                  ) : null}
                  {user ? <ChallengeActions challenge={challenge} currentUserId={user.id} onAction={handleChallengeAction} onVote={handleVote} /> : null}
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <p>Вызовы отсутствуют.</p>
        )}
      </section>
    </div>
  );
}

type ChallengeActionsProps = {
  challenge: Challenge;
  currentUserId: string;
  onAction: (challengeId: string, action: "accept" | "cancel" | "complete") => void;
  onVote: (challengeId: string, side: "initiator" | "opponent") => void;
};

const ChallengeActions = ({ challenge, currentUserId, onAction, onVote }: ChallengeActionsProps) => {
  const isInitiator = challenge.initiator.id === currentUserId;
  const isOpponent = challenge.opponent.id === currentUserId;
  const status = challenge.status;
  const canAccept = status === "initiated" && isOpponent;
  const canCancel = (status === "initiated" || status === "in_progress") && (isInitiator || isOpponent);
  const canComplete = status === "in_progress" && (isInitiator || isOpponent);
  const canVote = status === "in_progress" && !isInitiator && !isOpponent;

  if (!canAccept && !canCancel && !canComplete && !canVote) {
    return null;
  }

  return (
    <div>
      {canAccept ? (
        <button type="button" onClick={() => onAction(challenge.id, "accept")}>
          Принять вызов
        </button>
      ) : null}
      {canCancel ? (
        <button type="button" onClick={() => onAction(challenge.id, "cancel")}>
          Отменить
        </button>
      ) : null}
      {canComplete ? (
        <button type="button" onClick={() => onAction(challenge.id, "complete")}>
          Завершить
        </button>
      ) : null}
      {canVote ? (
        <div>
          <p>Проголосовать:</p>
          <button type="button" onClick={() => onVote(challenge.id, "initiator")}>
            За {challenge.initiator.display_name}
          </button>
          <button type="button" onClick={() => onVote(challenge.id, "opponent")}>
            За {challenge.opponent.display_name}
          </button>
        </div>
      ) : null}
    </div>
  );
};

const ChallengeResponseCard = ({ label, response }: { label: string; response: ChallengeResponse | null }) => (
  <div>
    <p>{label}</p>
    {response ? (
      <div>
        {response.audio_url ? (
          <audio controls src={response.audio_url}>
            Ваш браузер не поддерживает аудио.
          </audio>
        ) : (
          <p>Трек не прикреплен.</p>
        )}
        {response.description ? <p>{response.description}</p> : null}
        <p>Обновлено: {formatDateTime(response.submitted_at)}</p>
      </div>
    ) : (
      <p>Трек пока не загружен.</p>
    )}
  </div>
);

type ChallengeResponseFormProps = {
  challenge: Challenge;
  currentUserId: string;
  token: string;
  onSuccess: () => Promise<void> | void;
};

const ChallengeResponseForm = ({ challenge, currentUserId, token, onSuccess }: ChallengeResponseFormProps) => {
  const isInitiator = challenge.initiator.id === currentUserId;
  const isOpponent = challenge.opponent.id === currentUserId;
  const roleResponse = isInitiator
    ? challenge.responses?.initiator ?? null
    : isOpponent
    ? challenge.responses?.opponent ?? null
    : null;
  const canRespond = Boolean(token && (isInitiator || isOpponent) && challenge.status === "in_progress");
  const [description, setDescription] = useState(roleResponse?.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDescription(roleResponse?.description ?? "");
  }, [roleResponse?.description]);

  if (!canRespond || !token) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setStatus("Добавьте аудио перед отправкой.");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const upload = await uploadAudioFile(file, token);
      await submitChallengeResponseRequest(token, challenge.id, {
        audio_id: upload.id,
        description: description.trim() || undefined,
      });
      setStatus("Ответ сохранен.");
      setFile(null);
      await onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === "object") {
        const body = err.body as { message?: string };
        setStatus(body.message ?? `Ошибка API (${err.status})`);
      } else {
        setStatus(err instanceof Error ? err.message : "Не удалось загрузить ответ");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <p>Ваш трек ({isInitiator ? "инициатор" : "оппонент"})</p>
      {roleResponse ? <p>Последнее обновление: {formatDateTime(roleResponse.submitted_at)}</p> : null}
      <label>
        Описание
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} />
      </label>
      <label>
        Аудиозапись
        <input type="file" accept="audio/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </label>
      {file ? <p>Файл: {file.name}</p> : <p>Выберите mp3/wav файл.</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Отправляем..." : "Отправить ответ"}
      </button>
      {status ? <p>{status}</p> : null}
    </form>
  );
};

const ChallengeAudio = ({ description }: { description: string | null | undefined }) => {
  const url = extractAudioUrl(description);
  if (!url) {
    return null;
  }
  return (
    <div>
      <p>Аудио:</p>
      <audio controls src={url}>
        Ваш браузер не поддерживает аудио.
      </audio>
    </div>
  );
};

const extractAudioUrl = (text?: string | null) => {
  if (!text) {
    return null;
  }
  const match = text.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
};
