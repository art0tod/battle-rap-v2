"use client";

import { useEffect, useState } from "react";

import { PLAYER_VISIBILITY_OFFSET } from "@/components/music-player/usePlayerVisibility";

import styles from "./styles.module.css";

const VISIBILITY_OFFSET = PLAYER_VISIBILITY_OFFSET;

export default function ScrollTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > VISIBILITY_OFFSET);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      className={`${styles.root} ${isVisible ? styles.visible : ""}`}
      onClick={handleClick}
      aria-label="Вернуться к началу страницы"
    >
      <svg className={styles.icon} width="28" height="28" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 3.333 2.667 8l1.18 1.18L7.2 5.827V12.5h1.6V5.827l3.353 3.353L13.333 8z" />
      </svg>
    </button>
  );
}
