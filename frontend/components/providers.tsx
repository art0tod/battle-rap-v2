"use client";

import type { PropsWithChildren } from "react";

import { AuthProvider } from "@/context/auth-context";

export function AppProviders({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}
