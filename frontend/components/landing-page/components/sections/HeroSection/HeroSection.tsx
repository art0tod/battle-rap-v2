"use client";

import styles from "./styles.module.css";

export interface HeroSectionProps {
  onParticipate?: () => void;
  participateLabel?: string;
  title?: string;
  subtitle?: string;
  marqueeText?: string;
}

const DEFAULT_MARQUEE_TEXT =
  "БАТТЛ • ПРОЕКТ • ХИП-ХОП.РУ • НОВЫЕ ИМЕНА • СТАРИЧКИ • РИФМЫ • ПАНЧЛАЙНЫ • БАТТЛ • ПРОЕКТ • ХИП-ХОП.РУ • НОВЫЕ ИМЕНА • СТАРИЧКИ • РИФМЫ • БАТТЛ • ПРОЕКТ • ХИП-ХОП.РУ • НОВЫЕ ИМЕНА •";

export default function HeroSection({
  onParticipate,
  participateLabel = "Принять участие",
  title = "Battle hip-hop.ru",
  subtitle = "Независимый",
  marqueeText = DEFAULT_MARQUEE_TEXT,
}: HeroSectionProps) {
  return (
    <section id="hero-section" className={styles.root}>
      <div className={`${styles.content} content-width`}>
        <button
          className={styles.participate}
          type="button"
          onClick={onParticipate}
        >
          {participateLabel}
        </button>
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          <h2 className={styles.subTitle}>{subtitle}</h2>
        </div>
      </div>
      <div className={styles.marquee}>
        <div className={styles.marqueeTrack}>
          <span>{marqueeText}</span>
          <span aria-hidden="true">{marqueeText}</span>
        </div>
      </div>
    </section>
  );
}
