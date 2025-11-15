import Link from "next/link";
import styles from "./styles.module.css";

const links = [
  { href: "https://vk.com", title: "VK", iconSrc: "/vk.svg" },
  { href: "https://t.me", title: "Telegram", iconSrc: "/tg.svg" },
];

export default function AboutSection() {
  return (
    <section className={styles.root + " " + "content-width"}>
      <h2 className={styles.subTitle}>
        Слово решает <span className="text-gradient-accent">всё</span>
      </h2>
      <p className={styles.paragraph}>
        Сайт баттл‑проекта, который проводится под эгидой Хип‑Хоп.Ру, в рамках
        которого состязаются артисты. Здесь обычно встречаются старички
        баттл‑рэпа и находятся талантливые новички. Формат прямой, дерзкий, с
        живой реакцией зала. Мы объединяем поколения и даём сцену тем, кому есть
        что сказать.
      </p>
      <ul className={styles.contactsIconsList}>
        {links.map((link) => (
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
    </section>
  );
}
