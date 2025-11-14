"use client";

import { useMemo } from "react";
import type { ParticipantSummary } from "@/lib/types";
import { ChallengeButton } from "@/components/challenge-button";
import { useAuth } from "@/context/auth-context";
import { formatDateTime, formatNumber } from "@/lib/format";

export const ArtistsTable = ({ participants }: { participants: ParticipantSummary[] }) => {
  const { user } = useAuth();
  const ownId = user?.id;

  const rows = useMemo(() => participants, [participants]);

  if (!rows.length) {
    return <p>Пока нет профилей, соответствующих запросу.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Имя</th>
          <th>Роли</th>
          <th>Город</th>
          <th>Победы</th>
          <th>Средний балл</th>
          <th>Присоединился</th>
          <th>Вызов</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((participant) => (
          <tr key={participant.id}>
            <td>{participant.display_name}</td>
            <td>{participant.roles.join(", ") || "—"}</td>
            <td>{participant.city ?? "—"}</td>
            <td>{formatNumber(participant.total_wins)}</td>
            <td>{formatNumber(participant.avg_total_score)}</td>
            <td>{formatDateTime(participant.joined_at)}</td>
            <td>{ownId ? <ChallengeButton opponentId={participant.id} opponentName={participant.display_name} /> : <span>Требуется вход</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
