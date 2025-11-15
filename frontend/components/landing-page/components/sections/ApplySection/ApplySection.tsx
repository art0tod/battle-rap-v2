"use client";

import Link from "next/link";
import styles from "./styles.module.css";

export interface ApplySectionProps {
  onParticipate?: () => void;
  rulesHref?: string;
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export default function ApplySection({
  onParticipate,
  rulesHref = "/rules",
  title = "Подай заявку!",
  subtitle = "Хочешь на сцену?",
  primaryLabel = "Принять участие",
  secondaryLabel = "Узнать правила",
}: ApplySectionProps) {
  return (
    <section className={styles.root}>
      <div className={`${styles.content} content-width`}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{title}</h2>
          <h3 className={styles.subtitle}>{subtitle}</h3>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.primaryAction}
            type="button"
            onClick={onParticipate}
          >
            {primaryLabel}
          </button>
          <Link className={styles.secondaryAction} href={rulesHref}>
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
