"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import AuthModal, { type AuthMode } from "@/components/auth-modal/AuthModal";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import MusicPlayerVisibility from "@/components/music-player/MusicPlayerVisibility";
import ScrollTopButton from "@/components/scroll-top-button/ScrollTopButton";
import { useAuth } from "@/context/auth-context";

export function SiteShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signIn");

  const profileLink = user
    ? { name: user.display_name ?? "Профиль", href: `/profile/${user.id}` }
    : null;

  const openAuthModal = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const renderContent = () => {
    if (isLanding) {
      return children;
    }
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 lg:px-0">
        {children}
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <LandingHeader
        user={profileLink}
        cta={
          profileLink
            ? null
            : { label: "Войти", onClick: () => openAuthModal("signIn") }
        }
      />
      <main className={isLanding ? "flex-1 pt-0" : "flex-1 pt-48"}>
        {renderContent()}
      </main>
      <ScrollTopButton />
      <MusicPlayerVisibility />
      <LandingFooter
        user={profileLink}
        cta={
          profileLink
            ? null
            : { label: "Регистрация", onClick: () => openAuthModal("signUp") }
        }
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        mode={authMode}
        onClose={closeAuthModal}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setAuthModalOpen(true);
        }}
      />
    </div>
  );
}
