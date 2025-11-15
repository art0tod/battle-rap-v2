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
    <html lang="ru" className="dark">
      <body>
        <AppProviders>
          <div className="relative flex min-h-screen flex-col bg-background text-foreground">
            <div className="container flex flex-1 flex-col gap-10 py-10">
              <header className="flex flex-col gap-6 rounded-[10px] bg-card/80 p-6 shadow-card backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <Link href="/" className="text-3xl font-semibold tracking-tight text-foreground">
                    Battle Rap Hub
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Актуальные турниры, баттлы и рейтинги артистов платформы battle-rap.
                  </p>
                </div>
                <nav className="flex flex-wrap gap-2 text-sm font-medium text-muted-foreground">
                  {navigation.map(({ href, label }) => (
                    <Link
                      className="rounded-[10px] px-4 py-2 text-muted-foreground transition hover:bg-primary/15 hover:text-primary"
                      href={href}
                      key={href}
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
                <AuthStatus />
              </header>
              <main className="flex-1">{children}</main>
              <footer className="pb-8 text-sm text-muted-foreground">
                Данные синхронизируются с публичным API battle-rap каждые несколько минут.
              </footer>
            </div>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}

const navigation = [
  { href: "/tournaments", label: "Турниры" },
  { href: "/battles", label: "Баттлы" },
  { href: "/artists", label: "Артисты и судьи" },
  { href: "/challenges", label: "Вызовы" },
  { href: "/applications/new", label: "Подать заявку" },
  { href: "/judge", label: "Судья" },
  { href: "/admin", label: "Админка" },
];
