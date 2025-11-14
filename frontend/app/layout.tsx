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
      <body>
        <AppProviders>
          <header>
            <h1>
              <Link href="/">Battle Rap Hub</Link>
            </h1>
            <nav>
              <ul>
                <li>
                  <Link href="/tournaments">Турниры</Link>
                </li>
                <li>
                  <Link href="/battles">Баттлы</Link>
                </li>
                <li>
                  <Link href="/artists">Артисты и судьи</Link>
                </li>
                <li>
                  <Link href="/challenges">Вызовы</Link>
                </li>
                <li>
                  <Link href="/applications/new">Подать заявку</Link>
                </li>
                <li>
                  <Link href="/judge">Судья</Link>
                </li>
                <li>
                  <Link href="/admin">Админка</Link>
                </li>
              </ul>
            </nav>
            <AuthStatus />
            <hr />
          </header>
          <main>{children}</main>
          <hr />
          <footer>
            <p>Данные предоставлены публичным API battle-rap.</p>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
