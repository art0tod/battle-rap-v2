"use client";

import { useEffect, useState } from "react";

export const PLAYER_VISIBILITY_OFFSET = 400;

export function usePlayerVisibility() {
  const [isScrollReady, setIsScrollReady] = useState(false);
  const [isHeroHidden, setIsHeroHidden] = useState(true);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrollReady(window.scrollY > PLAYER_VISIBILITY_OFFSET);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const heroElement = document.getElementById("hero-section");

    if (!heroElement) {
      requestAnimationFrame(() => {
        setIsHeroHidden(false);
      });
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroHidden(entry.isIntersecting);
      },
      {
        rootMargin: "-20% 0px 0px 0px",
        threshold: [0, 0.1, 0.25],
      },
    );

    observer.observe(heroElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const footerElement = document.getElementById("site-footer");
    if (!footerElement) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting && entry.intersectionRatio > 0);
      },
      {
        rootMargin: "0px 0px -30% 0px",
        threshold: [0, 0.05, 0.1],
      },
    );

    observer.observe(footerElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  return {
    isScrollReady,
    isHeroHidden,
    isFooterVisible,
  };
}
