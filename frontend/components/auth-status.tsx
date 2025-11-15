"use client";

import Link from "next/link";
import { CircleUserRound, Loader2, LogIn, LogOut, UserRoundPlus } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

export function AuthStatus() {
  const { user, logout, initializing, actionInFlight } = useAuth();

  if (initializing) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Проверяем вход...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3 rounded-[10px] bg-card/70 px-4 py-2">
        <CircleUserRound className="h-9 w-9 text-primary" />
        <div className="max-w-[12rem]">
          <p className="truncate text-sm font-semibold text-foreground">{user.display_name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email ?? "Аккаунт подключен"}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void logout()} disabled={actionInFlight} className="ml-auto">
          <LogOut className="mr-1 h-4 w-4" />
          Выйти
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href="/login">
          <LogIn className="mr-1 h-4 w-4" />
          Войти
        </Link>
      </Button>
      <Button variant="secondary" size="sm" asChild>
        <Link href="/register">
          <UserRoundPlus className="mr-1 h-4 w-4" />
          Регистрация
        </Link>
      </Button>
    </div>
  );
}
