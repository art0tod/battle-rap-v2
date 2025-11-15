"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";

import styles from "./styles.module.css";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api";

export type AuthMode = "signIn" | "signUp";

export interface AuthModalProps {
  isOpen: boolean;
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
}

const modeLabels: Record<AuthMode, string> = {
  signIn: "ВХОД",
  signUp: "РЕГИСТРАЦИЯ",
};

const submitLabels: Record<AuthMode, string> = {
  signIn: "Войти",
  signUp: "Регистрация",
};

export default function AuthModal({ isOpen, mode, onClose, onModeChange }: AuthModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { login, register, actionInFlight } = useAuth();
  const originalOverflow = useRef<string>("");

  const submitLabel = useMemo(() => submitLabels[mode], [mode]);
  const isSignUp = mode === "signUp";
  const promptText = isSignUp ? "Уже есть аккаунт?" : "Нет аккаунта?";
  const promptActionLabel = isSignUp ? "Войти" : "Зарегистрироваться";
  const promptActionMode: AuthMode = isSignUp ? "signIn" : "signUp";

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setFormError(null);
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [mode, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    originalOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow.current;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const frame = window.requestAnimationFrame(() => {
        setShouldRender(true);
        setIsClosing(false);
      });
      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    if (shouldRender) {
      const frame = window.requestAnimationFrame(() => {
        setIsClosing(true);
      });

      const closeTimer = window.setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 200);

      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(closeTimer);
      };
    }
  }, [isOpen, shouldRender]);

  if (!isMounted || !shouldRender) {
    return null;
  }

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setFormError("Введите почту и пароль.");
      return;
    }

    if (mode === "signUp") {
      const displayName = String(formData.get("displayName") ?? "").trim();
      const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");

      if (!displayName) {
        setFormError("Укажите отображаемое имя.");
        return;
      }

      if (password !== passwordConfirmation) {
        setFormError("Пароли не совпадают.");
        return;
      }

      try {
        await register({ email, password, display_name: displayName });
        form.reset();
        onClose();
        return;
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 400 || error.status === 409) {
            setFormError(error.message || "Не удалось завершить регистрацию. Проверьте данные.");
            return;
          }
          if (error.status >= 500) {
            setFormError("Регистрация временно недоступна. Попробуйте позже.");
            return;
          }
        }
        if (error instanceof Error) {
          setFormError(error.message);
          return;
        }
        setFormError("Не удалось завершить регистрацию. Попробуйте позже.");
        return;
      }
    }

    try {
      await login({ email, password });
      form.reset();
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401 || error.status === 400) {
          setFormError("Неверная почта или пароль.");
          return;
        }
        if (error.status >= 500) {
          setFormError("Авторизация временно недоступна. Попробуйте позже.");
          return;
        }
        setFormError(error.message || "Не удалось войти. Попробуйте позже.");
        return;
      }
      if (error instanceof Error) {
        setFormError(error.message);
        return;
      }
      setFormError("Не удалось войти. Попробуйте позже.");
    }
  };

  return createPortal(
    <div
      className={`${styles.backdrop} ${isClosing ? styles.backdropClosing : ""}`}
      data-component="auth-modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <section
        className={`${styles.modal} ${isClosing ? styles.modalClosing : ""}`}
        aria-labelledby="auth-modal-title"
        aria-modal="true"
        role="dialog"
      >
        <header className={styles.header}>
          <h2 className={styles.visuallyHidden} id="auth-modal-title">
            {modeLabels[mode]}
          </h2>
          <button
            aria-label="Закрыть окно авторизации"
            className={styles.closeButton}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className={styles.tabsWrapper}>
          <nav aria-label="Переключение форм" className={styles.tabs}>
            {(Object.entries(modeLabels) as Array<[AuthMode, string]>).map(([currentMode, label]) => (
              <button
                aria-pressed={mode === currentMode}
                className={`${styles.tabButton} ${
                  mode === currentMode ? styles.tabButtonActive : styles.tabButtonInactive
                }`}
                key={currentMode}
                onClick={() => onModeChange(currentMode)}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset className={styles.fieldset}>
            <input autoComplete="email" className={styles.input} name="email" placeholder="Почта" required type="email" />

            {isSignUp ? (
              <input
                className={styles.input}
                name="displayName"
                placeholder="Отображаемое имя"
                required
                type="text"
              />
            ) : null}

            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className={styles.input}
              name="password"
              placeholder="Пароль"
              required
              type="password"
            />

            {isSignUp ? (
              <input
                autoComplete="new-password"
                className={styles.input}
                name="passwordConfirmation"
                placeholder="Повторите пароль"
                required
                type="password"
              />
            ) : null}
          </fieldset>

          {formError ? (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          ) : null}

          <footer className={styles.footer}>
            <button className={styles.submitButton} disabled={actionInFlight} type="submit">
              {actionInFlight ? "Загрузка..." : submitLabel}
            </button>

            <div className={styles.vkRow}>
              <button className={styles.vkButton} type="button">
                <span aria-hidden="true" className={styles.vkIcon}>
                  <svg fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M18.57 5.14c.13-.41 0-.71-.6-.71h-1.99c-.5 0-.73.26-.86.55 0 0-1.01 2.45-2.44 4.03-.46.46-.66.6-.9.6-.13 0-.33-.14-.33-.55V5.14c0-.49-.14-.71-.55-.71H7.45c-.3 0-.49.22-.49.42 0 .47.71.58.78 1.91v2.88c0 .63-.11.74-.35.74-.66 0-2.27-2.47-3.22-5.29C4 4.7 3.82 4.43 3.32 4.43H1.32c-.54 0-.65.26-.65.55 0 .52.66 3.09 3.09 6.49 1.62 2.33 3.91 3.58 6 3.58 1.25 0 1.4-.28 1.4-.76v-1.76c0-.55.12-.66.51-.66.3 0 .82.14 2.03 1.25 1.38 1.38 1.61 2 2.39 2 .54 0 .81-.28.81-.76 0-.71-.89-2.02-1.82-3.13-.5-.59-1.25-1.23-1.47-1.55-.13-.19-.19-.42 0-.68.13-.19.39-.49.86-1.05 1.31-1.49 2.3-3.2 2.55-3.79Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                Войти с VK ID
              </button>

              <p className={styles.registerPrompt}>
                {promptText}{" "}
                <button
                  className={styles.registerLink}
                  onClick={() => onModeChange(promptActionMode)}
                  type="button"
                >
                  {promptActionLabel}
                </button>
              </p>
            </div>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
