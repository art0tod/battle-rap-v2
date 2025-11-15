"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./styles.module.css";

const rounds = [
  {
    id: "round-1",
    label: "Раунд 1",
    participants: [
      { name: "Nova", score: 96 },
      { name: "Гром", score: 93 },
      { name: "Вектор", score: 91 },
      { name: "Резонанс", score: 89 },
      { name: "Факел", score: 87 },
      { name: "Блик", score: 86 },
      { name: "Сигнал", score: 85 },
      { name: "Атлас", score: 84 },
    ],
  },
  {
    id: "round-2",
    label: "Раунд 2",
    participants: [
      { name: "Nova", score: 98 },
      { name: "Резонанс", score: 96 },
      { name: "Вектор", score: 92 },
      { name: "Гром", score: 90 },
      { name: "Сигнал", score: 88 },
      { name: "Гранит", score: 87 },
      { name: "Факел", score: 86 },
      { name: "Блик", score: 85 },
    ],
  },
  {
    id: "round-3",
    label: "Раунд 3",
    participants: [
      { name: "Резонанс", score: 100 },
      { name: "Nova", score: 97 },
      { name: "Блик", score: 94 },
      { name: "Факел", score: 92 },
      { name: "Гром", score: 90 },
      { name: "Сигнал", score: 89 },
      { name: "Гранит", score: 88 },
      { name: "Атлас", score: 87 },
    ],
  },
  {
    id: "round-4",
    label: "Раунд 4",
    participants: [
      { name: "Резонанс", score: 102 },
      { name: "Nova", score: 99 },
      { name: "Гранит", score: 95 },
      { name: "Блик", score: 93 },
      { name: "Вектор", score: 91 },
      { name: "Гром", score: 90 },
      { name: "Сигнал", score: 89 },
      { name: "Факел", score: 88 },
    ],
  },
  {
    id: "round-5",
    label: "Раунд 5",
    participants: [
      { name: "Nova", score: 101 },
      { name: "Резонанс", score: 100 },
      { name: "Гром", score: 96 },
      { name: "Атлас", score: 92 },
      { name: "Факел", score: 90 },
      { name: "Гранит", score: 89 },
      { name: "Блик", score: 88 },
      { name: "Тон", score: 86 },
    ],
  },
  {
    id: "round-6",
    label: "Раунд 6",
    participants: [
      { name: "Резонанс", score: 104 },
      { name: "Nova", score: 100 },
      { name: "Сигнал", score: 95 },
      { name: "Блик", score: 93 },
      { name: "Гром", score: 91 },
      { name: "Факел", score: 90 },
      { name: "Гранит", score: 89 },
      { name: "Пак", score: 87 },
    ],
  },
  {
    id: "round-7",
    label: "Раунд 7",
    participants: [
      { name: "Резонанс", score: 106 },
      { name: "Nova", score: 103 },
      { name: "Вектор", score: 97 },
      { name: "Атлас", score: 95 },
      { name: "Гранит", score: 92 },
      { name: "Блик", score: 91 },
      { name: "Факел", score: 90 },
      { name: "Сигнал", score: 88 },
    ],
  },
  {
    id: "round-8",
    label: "Раунд 8",
    participants: [
      { name: "Nova", score: 108 },
      { name: "Резонанс", score: 106 },
      { name: "Гром", score: 100 },
      { name: "Сигнал", score: 97 },
      { name: "Блик", score: 94 },
      { name: "Гранит", score: 93 },
      { name: "Факел", score: 92 },
      { name: "Атлас", score: 90 },
    ],
  },
  {
    id: "round-9",
    label: "Раунд 9",
    participants: [
      { name: "Резонанс", score: 111 },
      { name: "Nova", score: 109 },
      { name: "Гранит", score: 102 },
      { name: "Факел", score: 99 },
      { name: "Блик", score: 97 },
      { name: "Гром", score: 95 },
      { name: "Сигнал", score: 94 },
      { name: "Тон", score: 92 },
    ],
  },
  {
    id: "round-10",
    label: "Раунд 10",
    participants: [
      { name: "Nova", score: 114 },
      { name: "Резонанс", score: 112 },
      { name: "Сигнал", score: 106 },
      { name: "Гранит", score: 103 },
      { name: "Гром", score: 101 },
      { name: "Факел", score: 100 },
      { name: "Блик", score: 98 },
      { name: "Атлас", score: 96 },
    ],
  },
];

export default function BattleRatingSection() {
  const [activeRoundId, setActiveRoundId] = useState(rounds[0]?.id ?? "");

  const activeRound = useMemo(
    () => rounds.find((round) => round.id === activeRoundId) ?? rounds[0],
    [activeRoundId]
  );

  return (
    <section id="judges-rating-section" className={styles.root}>
      <div className={`${styles.content} content-width`}>
        <header className={styles.header}>
          <div className={styles.titles}>
            <h2 className={styles.sectionTitle}>СТАТИСТИКА</h2>
            <p className={styles.sectionSubtitle}>РЕЙТИНГ</p>
          </div>
          <div
            className={styles.filters}
            role="tablist"
            aria-label="Раунды баттла"
          >
            {rounds.map((round) => (
              <button
                key={round.id}
                type="button"
                role="tab"
                aria-selected={activeRoundId === round.id}
                className={`${styles.filterButton} ${
                  activeRoundId === round.id ? styles.filterButtonActive : ""
                }`}
                onClick={() => setActiveRoundId(round.id)}
              >
                {round.label}
              </button>
            ))}
          </div>
        </header>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Место</th>
                <th scope="col">Участник</th>
                <th scope="col">Баллы</th>
              </tr>
            </thead>
            <tbody>
              {activeRound?.participants.map((participant, index) => (
                <tr key={participant.name}>
                  <td>
                    <span className={styles.positionBadge}>{index + 1}</span>
                  </td>
                  <td>
                    <Link
                      className={styles.participantLink}
                      href={`/profile?name=${encodeURIComponent(
                        participant.name
                      )}`}
                    >
                      {participant.name}
                    </Link>
                  </td>
                  <td>{participant.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
