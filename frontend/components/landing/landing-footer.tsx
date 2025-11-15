"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import styles from "./landing-footer.module.css";

export interface LandingFooterSiteLink {
  href: string;
  title: string;
}

export interface LandingFooterSocialLink {
  href: string;
  title: string;
  iconSrc: string;
}

export interface LandingFooterUserLink {
  name: string;
  href: string;
}

export interface LandingFooterCta {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface LandingFooterProps {
  title?: string;
  subtitle?: string;
  description?: string;
  siteLinks?: LandingFooterSiteLink[];
  socialLinks?: LandingFooterSocialLink[];
  user?: LandingFooterUserLink | null;
  cta?: LandingFooterCta | null;
}

const DEFAULT_SITE_LINKS: LandingFooterSiteLink[] = [
  { href: "/#posts-section", title: "Посты" },
  { href: "/members", title: "Участники" },
  // { href: "/members?role=judge", title: "Судьи" },
  // { href: "/tournaments", title: "Турниры" },
  // { href: "/judge", title: "Судейство" },
  { href: "/#judges-rating-section", title: "Рейтинг" },
  { href: "/challenges", title: "Вызовы" },
];

const DEFAULT_SOCIAL_LINKS: LandingFooterSocialLink[] = [
  { href: "https://vk.com", title: "VK", iconSrc: "/vk.svg" },
  { href: "https://t.me", title: "Telegram", iconSrc: "/tg.svg" },
];

export function LandingFooter({
  title = "BATTLE HIP-HOP.RU",
  subtitle = "НЕЗАВИСИМЫЙ",
  description = "Онлайн-арена хип-хоп баттлов с участием артистов, судей и фанатов под эгидой HIP-HOP.RU.",
  siteLinks = DEFAULT_SITE_LINKS,
  socialLinks = DEFAULT_SOCIAL_LINKS,
  user,
  cta = { label: "Войти", href: "/profile" },
}: LandingFooterProps) {
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
    <footer id="site-footer" className={styles.root}>
      <div className={styles.footer__container}>
        <div className={styles.wrapper}>
          <div className={styles.footer__titleContainer}>
            <h3 className={styles.footer__subtitle}>{subtitle}</h3>
            <h2 className={styles.footer__title}>{title}</h2>
            <p className={styles.footer__paragraph}>{description}</p>
          </div>
          <div className={styles.footer__navContainer}>
            <ul className={styles.siteLinks}>
              {siteLinks.map((link) => (
                <li className={styles.siteLinksItem} key={link.href}>
                  <Link className={styles.siteLink} href={link.href}>
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {renderCta()}
        </div>
        <div className={styles.footer__copyrightContainer}>
          <ul className={styles.contactsIconsList}>
            {socialLinks.map((link) => (
              <li key={link.title} className={styles.contactsIcon}>
                <Link
                  className={styles.contactsLink}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span
                    aria-hidden="true"
                    className={styles.contactsIconImage}
                    style={{ backgroundImage: `url(${link.iconSrc})` }}
                  />
                  <span className={styles.visuallyHidden}>{link.title}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className={styles.footer__copyright}>
            © {new Date().getFullYear()} HipHop.ru. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
