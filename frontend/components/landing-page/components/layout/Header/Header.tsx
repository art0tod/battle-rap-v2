"use client";

import { useEffect, useState, type MouseEventHandler } from "react";
import Link from "next/link";
import styles from "./styles.module.css";

export interface HeaderLink {
  href: string;
  title: string;
}

export interface HeaderUserLink {
  name: string;
  href: string;
}

export interface HeaderCta {
  label: string;
  href: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export interface HeaderProps {
  links?: HeaderLink[];
  logoHref?: string;
  logoLabel?: string;
  user?: HeaderUserLink | null;
  cta?: HeaderCta | null;
}

const DEFAULT_LINKS: HeaderLink[] = [
  { href: "/battles", title: "Баттлы" },
  { href: "/#posts-section", title: "Посты" },
  { href: "/members", title: "Участники" },
  // { href: "/members?role=judge", title: "Судьи" },
  // { href: "/tournaments", title: "Турниры" },
  // { href: "/judge", title: "Судейство" },
  { href: "/#judges-rating-section", title: "Рейтинг" },
  { href: "/challenges", title: "Вызовы" },
];

export default function Header({
  links = DEFAULT_LINKS,
  logoHref = "/",
  logoLabel = "Главная",
  user,
  cta = { label: "Войти", href: "/profile" },
}: HeaderProps) {
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

    return (
      <Link className={styles.cta} href={cta.href} onClick={cta.onClick}>
        {cta.label}
      </Link>
    );
  };

  return (
    <header
      className={[styles.root, isBlurred ? styles.backdropBlur : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={`${styles.content} content-width`}>
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
