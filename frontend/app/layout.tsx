import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { AuthStatus } from "@/components/auth-status";

export const metadata: Metadata = {
  title: "Battle Rap Hub",
  description: "Публичный портал для турниров и баттлов платформы Battle Rap.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="site-body">
        <AppProviders>
          <div className="site-shell">
            <header className="site-header">
              <div className="site-brand">
                <h1 className="site-title">
                  <Link href="/">Battle Rap Hub</Link>
                </h1>
                <p className="site-tagline">
                  Публичный портал турниров и баттлов.
                </p>
              </div>
              <nav className="site-nav">
                <ul className="site-nav-list">
                  <li>
                    <Link className="site-nav-link" href="/tournaments">
                      Турниры
                    </Link>
                  </li>
                  <li>
                    <Link className="site-nav-link" href="/battles">
                      Баттлы
                    </Link>
                  </li>
                  <li>
                    <Link className="site-nav-link" href="/artists">
                      Артисты и судьи
                    </Link>
                  </li>
                  <li>
                    <Link className="site-nav-link" href="/challenges">
                      Вызовы
                    </Link>
                  </li>
                  <li>
                    <Link className="site-nav-link" href="/applications/new">
                      Подать заявку
                    </Link>
                  </li>
                  <li>
                    <Link className="site-nav-link" href="/judge">
                      Судья
                    </Link>
                  </li>
                  <li>
                    <Link className="site-nav-link" href="/admin">
                      Админка
                    </Link>
                  </li>
                </ul>
              </nav>
              <div className="site-auth">
                <AuthStatus />
              </div>
            </header>
            <main className="site-main">{children}</main>
            <footer className="site-footer">
              <p>Данные предоставлены публичным API battle-rap.</p>
            </footer>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
