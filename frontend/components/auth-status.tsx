"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";

export const AuthStatus = () => {
  const { user, logout, actionInFlight } = useAuth();

  if (!user) {
    return (
      <p>
        <Link href="/login">Войти</Link> | <Link href="/register">Регистрация</Link>
      </p>
    );
  }

  return (
    <div>
      <p>
        {user.display_name} ({user.roles.join(", ") || "без роли"})
      </p>
      <button
        type="button"
        onClick={async () => {
          await logout();
        }}
        disabled={actionInFlight}
      >
        Выйти
      </button>
    </div>
  );
};
