"use client";

import Link from "next/link";
import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import styles from "./styles.module.css";

const posts = [
  {
    tag: "Новости",
    title: "Итоги последнего этапа",
    description:
      "Главные баттлы недели собрали полные площадки. Разбираем лучшие панчи и сюжеты вечера.",
    href: "/posts/latest-stage",
    image: "/participants/photo.jpg",
    date: "12.05.2024",
    author: "HIP-HOP.RU",
    highlights: ["Лучший панч Nova", "Гром против Факела"],
    views: "Просмотры: 12К",
  },
  {
    tag: "Интервью",
    title: "Разговор с Nova",
    description:
      "Говорим о стратегии, вдохновении и том, как готовиться к самым громким битвам сезона.",
    href: "/posts/nova-interview",
    image: "/participants/photo.jpg",
    date: "05.05.2024",
    author: "HIP-HOP.RU",
    highlights: ["Секрет подготовки", "Любимые биты"],
    views: "Просмотры: 9К",
  },
  {
    tag: "Гайд",
    title: "Как попасть на сцену",
    description:
      "Пошаговый план для тех, кто готов выйти в свет и прокачать свою подачу перед судьями.",
    href: "/posts/how-to-apply",
    image: "/participants/photo.jpg",
    date: "28.04.2024",
    author: "HIP-HOP.RU",
    highlights: ["Чек-лист участника", "Что брать на площадку"],
    views: "Просмотры: 7.5К",
  },
  {
    tag: "Разбор",
    title: "Судейская аналитика",
    description:
      "Критерии оценки и скрытые нюансы системы баллов. Разбираем с примерами живых баттлов.",
    href: "/posts/jury-breakdown",
    image: "/participants/photo.jpg",
    date: "20.04.2024",
    author: "HIP-HOP.RU",
    highlights: ["Разбор оценок", "Чек-лист для судей"],
    views: "Просмотры: 7К",
  },
  {
    tag: "Репортаж",
    title: "Бэкстейдж баттла",
    description:
      "Что происходит за кулисами: подготовка артистов, проверка звука и эмоции перед выходом.",
    href: "/posts/backstage-report",
    image: "/participants/photo.jpg",
    date: "14.04.2024",
    author: "HIP-HOP.RU",
    highlights: ["Эксклюзивные кадры", "Команда проекта"],
    views: "Просмотры: 6.4К",
  },
  {
    tag: "Плейлист",
    title: "Разогрев перед баттлом",
    description:
      "Подборка треков, которая поможет настроиться на сцену и держать концентрацию до финального раунда.",
    href: "/posts/warm-up-playlist",
    image: "/participants/photo.jpg",
    date: "07.04.2024",
    author: "HIP-HOP.RU",
    highlights: ["12 треков", "Авторский выбор"],
    views: "Просмотры: 5.1К",
  },
];

export default function PostsSection() {
  const [reactions, setReactions] = useState(
    posts.map(() => ({
      likes: 0,
      dislikes: 0,
      liked: false,
      disliked: false,
    }))
  );

  const handleLike = (index: number) => {
    setReactions((prevReactions) => {
      return prevReactions.map((reaction, currentIndex) =>
        currentIndex === index
          ? {
              ...reaction,
              likes: reaction.liked
                ? Math.max(0, reaction.likes - 1)
                : reaction.likes + 1,
              liked: !reaction.liked,
              dislikes:
                reaction.disliked && !reaction.liked
                  ? Math.max(0, reaction.dislikes - 1)
                  : reaction.dislikes,
              disliked:
                reaction.disliked && !reaction.liked
                  ? false
                  : reaction.disliked,
            }
          : reaction
      );
    });
  };

  const handleDislike = (index: number) => {
    setReactions((prevReactions) => {
      return prevReactions.map((reaction, currentIndex) =>
        currentIndex === index
          ? {
              ...reaction,
              dislikes: reaction.disliked
                ? Math.max(0, reaction.dislikes - 1)
                : reaction.dislikes + 1,
              disliked: !reaction.disliked,
              likes:
                reaction.liked && !reaction.disliked
                  ? Math.max(0, reaction.likes - 1)
                  : reaction.likes,
              liked:
                reaction.liked && !reaction.disliked ? false : reaction.liked,
            }
          : reaction
      );
    });
  };

  return (
    <section id="posts-section" className={styles.root}>
      <div className={styles.content + " " + "content-width"}>
        <div className={styles.titleRow}>
          <span className={styles.titleLine} aria-hidden="true" />
          <h2 className={styles.title}>
            <span className={styles.titleText}>ПОСТЫ</span>
          </h2>
          <span className={styles.titleLine} aria-hidden="true" />
        </div>
        <div className={styles.postsGrid}>
          {posts.map((post, index) => (
            <article className={styles.postCard} key={post.href}>
              <div className={styles.postHeader}>
                {/* <span className={styles.postDate}>{post.date}</span> */}
              </div>
              <div className={styles.postContent}>
                <span className={styles.postTag}>{post.tag}</span>
                <h3 className={styles.postTitle}>{post.title}</h3>
                {post.highlights && post.highlights.length > 0 ? (
                  <ul className={styles.postHighlights}>
                    {post.highlights.map((highlight) => (
                      <li className={styles.postHighlight} key={highlight}>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className={styles.postDescription}>{post.description}</p>
                <Link
                  className={`${styles.postLink} ${styles.postLinkExtraSpacing}`}
                  href={post.href}
                >
                  Читать дальше
                </Link>
                <div className={styles.postImage}>
                  <span className={styles.postImageText}>Тут будет фото</span>
                </div>
                <div className={styles.postMeta}>
                  <div className={styles.postReactions}>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${
                        reactions[index].liked ? styles.actionButtonActive : ""
                      }`}
                      onClick={() => handleLike(index)}
                    >
                      <ThumbsUp
                        aria-hidden="true"
                        className={styles.actionButtonIcon}
                        strokeWidth={1.75}
                      />
                      <span>Лайк · {reactions[index].likes}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionButton} ${
                        styles.actionButtonDislike
                      } ${
                        reactions[index].disliked
                          ? styles.actionButtonActive
                          : ""
                      }`}
                      onClick={() => handleDislike(index)}
                    >
                      <ThumbsDown
                        aria-hidden="true"
                        className={styles.actionButtonIcon}
                        strokeWidth={1.75}
                      />
                      <span>Дизлайк · {reactions[index].dislikes}</span>
                    </button>
                  </div>
                  <span className={styles.postViews}>{post.views}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
