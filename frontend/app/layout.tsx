import type { Metadata } from "next";
import "./globals.css";
import "./(landing)/landing-globals.css";
import { AppProviders } from "@/components/providers";
import { SiteShell } from "@/components/site-shell";
import type { ReactNode } from "react";
import { Montserrat } from "next/font/google";

export const metadata: Metadata = {
  title: "Battle Rap Hub",
  description: "Публичный портал для турниров и баттлов платформы Battle Rap.",
};

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru" className={`${montserrat.variable} dark`}>
      <body>
        <AppProviders>
          <SiteShell>{children}</SiteShell>
        </AppProviders>
      </body>
    </html>
  );
}
