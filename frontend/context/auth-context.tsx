"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { AuthResponse, AuthUser, ProfileView } from "@/lib/types";

const AUTH_STORAGE_KEY = "battle_rap_auth_state";

type AuthContextState = {
  user: AuthUser | null;
  token: string | null;
  initializing: boolean;
  actionInFlight: boolean;
  error: string | null;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; password: string; display_name: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: (overrideToken?: string) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextState | undefined>(undefined);

const persistAuth = (token: string, user: AuthUser) => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
  } catch {
    // ignore storage failures
  }
};

const readAuthState = (): { token: string; user: AuthUser } | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const clearAuthState = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // noop
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [actionInFlight, setActionInFlight] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyAuthPayload = useCallback((payload: AuthResponse) => {
    persistAuth(payload.access_token, payload.user);
    setUser(payload.user);
    setToken(payload.access_token);
  }, []);

  const handleAuthError = (err: unknown) => {
    if (err instanceof ApiError && err.body && typeof err.body === "object") {
      const body = err.body as { message?: string };
      setError(body.message ?? `Ошибка API (${err.status})`);
      return;
    }
    setError(err instanceof Error ? err.message : "Неизвестная ошибка");
  };

  const login = useCallback(
    async (payload: { email: string; password: string }) => {
      setActionInFlight(true);
      setError(null);
      try {
        const response = await apiFetch<AuthResponse>("/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        applyAuthPayload(response);
      } catch (err) {
        handleAuthError(err);
        throw err;
      } finally {
        setActionInFlight(false);
      }
    },
    [applyAuthPayload],
  );

  const register = useCallback(
    async (payload: { email: string; password: string; display_name: string }) => {
      setActionInFlight(true);
      setError(null);
      try {
        const response = await apiFetch<AuthResponse>("/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        applyAuthPayload(response);
      } catch (err) {
        handleAuthError(err);
        throw err;
      } finally {
        setActionInFlight(false);
      }
    },
    [applyAuthPayload],
  );

  const logout = useCallback(async () => {
    setActionInFlight(true);
    setError(null);
    try {
      if (token) {
        await apiFetch("/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        await apiFetch("/auth/logout", { method: "POST" });
      }
    } catch {
      // ignore logout failures
    } finally {
      clearAuthState();
      setUser(null);
      setToken(null);
      setActionInFlight(false);
    }
  }, [token]);

  const refreshProfile = useCallback(async (overrideToken?: string) => {
    const activeToken = overrideToken ?? token;
    if (!activeToken) {
      return;
    }
    try {
      const profile = await apiFetch<ProfileView>("/auth/me", {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      const compact: AuthUser = {
        id: profile.id,
        display_name: profile.display_name,
        roles: profile.roles,
        email: profile.email,
      };
      persistAuth(activeToken, compact);
      setUser(compact);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAuthState();
        setUser(null);
        setToken(null);
      } else {
        handleAuthError(err);
      }
    }
  }, [token]);

  useEffect(() => {
    const stored = readAuthState();
    if (stored?.token && stored.user) {
      setUser(stored.user);
      setToken(stored.token);
      refreshProfile(stored.token).finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, [refreshProfile]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      user,
      token,
      initializing,
      actionInFlight,
      error,
      login,
      register,
      logout,
      refreshProfile,
      clearError,
    }),
    [user, token, initializing, actionInFlight, error, login, register, logout, refreshProfile, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("AuthContext is not available");
  }
  return ctx;
};
