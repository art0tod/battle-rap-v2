"use client";

import type { ChangeEventHandler, CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./styles.module.css";
import { usePlayerVisibility } from "./usePlayerVisibility";

const RECENT_TRACKS = [
  {
    id: "nova-fire",
    title: "Линии огня",
    artist: "MC Независимый",
    profileHref: "/profile?artist=nova",
    cover: "/participants/photo.jpg",
    src: "/audio/nova-fire.wav",
  },
  {
    id: "grom-strike",
    title: "Громкий шаг",
    artist: "GROM",
    profileHref: "/profile?artist=grom",
    cover: "/participants/photo.jpg",
    src: "/audio/grom-strike.wav",
  },
  {
    id: "resonans-phase",
    title: "Фаза резонанса",
    artist: "Резонанс",
    profileHref: "/profile?artist=resonans",
    cover: "/participants/photo.jpg",
    src: "/audio/resonans-phase.wav",
  },
] as const;

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const isInitialTrackRandomizedRef = useRef(false);
  const resumePlaybackRef = useRef(false);
  const { isScrollReady, isHeroHidden, isFooterVisible } = usePlayerVisibility();

  const currentTrack = RECENT_TRACKS[currentTrackIndex];

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleLoadedMetadata = () => {
      const audioDuration = audio.duration;

      setDuration(Number.isFinite(audioDuration) ? audioDuration : 0);
    };

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      resumePlaybackRef.current = true;
    };
    const handlePause = () => {
      setIsPlaying(false);
      resumePlaybackRef.current = false;
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      resumePlaybackRef.current = false;
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    if (audio.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (isInitialTrackRandomizedRef.current) {
      return;
    }
    isInitialTrackRandomizedRef.current = true;

    if (RECENT_TRACKS.length <= 1) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * RECENT_TRACKS.length);
    requestAnimationFrame(() => {
      setCurrentTrackIndex(randomIndex);
    });
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const shouldResumePlayback = resumePlaybackRef.current;
    resumePlaybackRef.current = false;

    audio.pause();
    audio.currentTime = 0;
    requestAnimationFrame(() => {
      setProgress(0);
      setDuration(0);
    });
    audio.load();

    if (!shouldResumePlayback) {
      return;
    }

    const attemptPlay = () => {
      const playPromise = audio.play();

      if (playPromise) {
        playPromise.catch(() => {
          setIsPlaying(false);
        });
      }
    };

    if (audio.readyState >= 2) {
      attemptPlay();
      return;
    }

    const handleCanPlay = () => {
      attemptPlay();
    };

    audio.addEventListener("canplay", handleCanPlay, { once: true });

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [currentTrackIndex]);

  const progressPercent = useMemo(() => {
    if (!duration) {
      return 0;
    }

    return Math.min(100, Math.max(0, (progress / duration) * 100));
  }, [duration, progress]);

  const handleTogglePlay = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      return;
    }

    const playPromise = audio.play();

    if (playPromise) {
      playPromise.catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handleSeek: ChangeEventHandler<HTMLInputElement> = (event) => {
    const audio = audioRef.current;
    const nextTime = Number(event.target.value);

    if (!audio || Number.isNaN(nextTime)) {
      return;
    }

    audio.currentTime = nextTime;
    setProgress(nextTime);
  };

  const handleVolumeChange: ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    const nextVolume = Number(event.target.value);

    if (Number.isNaN(nextVolume)) {
      return;
    }

    setVolume(Math.min(1, Math.max(0, nextVolume)));
  };

  const timelineStyle = {
    "--progress": `${progressPercent}%`,
  } as CSSProperties;

  const volumeStyle = {
    "--progress": `${volume * 100}%`,
  } as CSSProperties;

  const handleNextTrack = () => {
    resumePlaybackRef.current = isPlaying;
    setCurrentTrackIndex((index) => (index + 1) % RECENT_TRACKS.length);
  };

  const handlePreviousTrack = () => {
    resumePlaybackRef.current = isPlaying;
    setCurrentTrackIndex((index) => {
      const nextIndex = (index - 1 + RECENT_TRACKS.length) % RECENT_TRACKS.length;
      return nextIndex;
    });
  };

  const shouldHide = !isScrollReady || isHeroHidden || isFooterVisible;

  return (
    <section
      className={[styles.root, shouldHide ? styles.hidden : ""].filter(Boolean).join(" ")}
      role="region"
      aria-label="Музыкальный плеер"
    >
      <audio ref={audioRef} src={currentTrack?.src} preload="metadata" />

      <div className={styles.container}>
        <div className={styles.media}>
          <div className={styles.cover}>
            <Image
              src={currentTrack?.cover ?? "/participants/photo.jpg"}
              alt=""
              fill
              sizes="72px"
              priority
              className={styles.coverImage}
            />
          </div>
          <div className={styles.info}>
            <strong className={styles.title}>{currentTrack?.title}</strong>
            {currentTrack ? (
              <Link
                href={currentTrack.profileHref}
                className={styles.artistLink}
              >
                {currentTrack.artist}
              </Link>
            ) : null}
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.transport}>
            <button
              type="button"
              className={styles.transportButton}
              onClick={handlePreviousTrack}
              aria-label="Предыдущий трек"
            >
              <svg
                className={styles.icon}
                width="18"
                height="18"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M5.5 8 14 2.5v11zM2 2h2v12H2z" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.playButton}
              onClick={handleTogglePlay}
              aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
            >
              {isPlaying ? (
                <svg
                  className={styles.icon}
                  width="18"
                  height="18"
                  viewBox="0 0 14 16"
                  aria-hidden="true"
                >
                  <path d="M0 0h4v16H0zm10 0h4v16h-4z" />
                </svg>
              ) : (
                <svg
                  className={styles.icon}
                  width="18"
                  height="18"
                  viewBox="0 0 14 16"
                  aria-hidden="true"
                >
                  <path d="M0 0v16l14-8z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className={styles.transportButton}
              onClick={handleNextTrack}
              aria-label="Следующий трек"
            >
              <svg
                className={styles.icon}
                width="18"
                height="18"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M10.5 8 2 13.5v-11zM14 14h-2V2h2z" />
              </svg>
            </button>
          </div>

          <div className={styles.timeline}>
            <span className={styles.time}>{formatTime(progress)}</span>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={duration ? progress : 0}
              onChange={handleSeek}
              className={styles.timelineSlider}
              style={timelineStyle}
              aria-label="Позиция трека"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={progress}
              aria-valuetext={`${formatTime(progress)} из ${formatTime(duration)}`}
              disabled={!duration}
            />

            <span className={styles.time}>{formatTime(duration)}</span>
          </div>
        </div>

        <div className={styles.volume}>
          <svg
            className={styles.volumeIcon}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9 2 5 6H2v8h3l4 4zm4.121 1.879-1.414 1.414A4.493 4.493 0 0 1 13.5 10c0 1.243-.504 2.366-1.293 3.164l1.414 1.414A6.492 6.492 0 0 0 15.5 10c0-1.804-.734-3.438-1.879-4.621m2.828-2.828-1.414 1.414A7.985 7.985 0 0 1 17.5 10c0 2.209-.896 4.208-2.343 5.657l1.414 1.414A9.979 9.979 0 0 0 19.5 10c0-2.761-1.12-5.26-2.95-7.071" />
          </svg>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={handleVolumeChange}
            className={styles.volumeSlider}
            style={volumeStyle}
            aria-label="Громкость"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={volume}
          />
        </div>
      </div>
    </section>
  );
}
