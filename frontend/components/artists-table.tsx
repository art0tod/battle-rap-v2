import Link from "next/link";

import type { ParticipantSummary } from "@/lib/types";
import { formatNumber } from "@/lib/format";

type ArtistsTableProps = {
  participants: ParticipantSummary[];
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
};

export function ArtistsTable({ participants }: ArtistsTableProps) {
  if (!participants.length) {
    return <p className="text-sm text-muted-foreground">Еще нет публичных артистов.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[10px] border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-card/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Имя</th>
            <th className="px-4 py-3">Роль</th>
            <th className="px-4 py-3">Город</th>
            <th className="px-4 py-3">Победы</th>
            <th className="px-4 py-3">Средний балл</th>
            <th className="px-4 py-3">С нами с</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => (
            <tr key={participant.id} className="border-t border-border/50">
              <td className="px-4 py-3">
                <Link className="font-semibold text-primary" href={`/profile/${participant.id}`}>
                  {participant.display_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{participant.roles.join(", ") || "—"}</td>
              <td className="px-4 py-3">{participant.city || "—"}</td>
              <td className="px-4 py-3">{formatNumber(participant.total_wins)}</td>
              <td className="px-4 py-3">
                {participant.avg_total_score !== null ? `${formatNumber(participant.avg_total_score)} / 100` : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(participant.joined_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
