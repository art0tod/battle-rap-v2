"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import styles from "./landing-header.module.css";

export interface LandingHeaderLink {
  href: string;
  title: string;
}

export interface LandingHeaderUserLink {
  name: string;
  href: string;
}

export interface LandingHeaderCta {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface LandingHeaderProps {
  links?: LandingHeaderLink[];
  logoHref?: string;
  logoLabel?: string;
  user?: LandingHeaderUserLink | null;
  cta?: LandingHeaderCta | null;
}

const DEFAULT_LINKS: LandingHeaderLink[] = [
  { href: "/battles", title: "Баттлы" },
  { href: "/#posts-section", title: "Посты" },
  { href: "/members", title: "Участники" },
  // { href: "/members?role=judge", title: "Судьи" },
  // { href: "/tournaments", title: "Турниры" },
  // { href: "/judge", title: "Судейство" },
  { href: "/#judges-rating-section", title: "Рейтинг" },
  { href: "/challenges", title: "Вызовы" },
];

export function LandingHeader({
  links = DEFAULT_LINKS,
  logoHref = "/",
  logoLabel = "Главная",
  user,
  cta = { label: "Войти", href: "/profile" },
}: LandingHeaderProps) {
  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsBlurred(window.scrollY > 50);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const renderCta = () => {
    if (user) {
      return (
        <Link className={styles.cta} href={user.href}>
          {user.name}
        </Link>
      );
    }

    if (!cta) {
      return null;
    }

    if (cta.href) {
      const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (cta.onClick) {
          event.preventDefault();
          cta.onClick();
        }
      };
      return (
        <Link className={styles.cta} href={cta.href} onClick={handleClick}>
          {cta.label}
        </Link>
      );
    }

    return (
      <button
        className={`${styles.cta} ${styles.ctaButton}`}
        type="button"
        onClick={cta.onClick}
      >
        {cta.label}
      </button>
    );
  };

  return (
    <header
      className={[styles.root, isBlurred ? styles.backdropBlur : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.content}>
        <div className={styles.logo}>
          <Link className={styles.logoLink} href={logoHref}>
            <span className={styles.logoText}>{logoLabel}</span>
          </Link>
        </div>
        <nav className={styles.navBar}>
          <ul className={styles.links}>
            {links.map((link) => (
              <li className={styles.linksItem} key={link.href}>
                <Link className={styles.link} href={link.href}>
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
          {renderCta()}
        </nav>
      </div>
    </header>
  );
}
