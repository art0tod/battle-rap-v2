import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import TextAnimate from "@/components/ui/text-animate";
import { TweetGrid } from "@/components/ui/tweet-grid";

export const metadata = {
  title: "Showcase | Battle Rap Hub",
  description:
    "Тестовая страница, которая демонстрирует готовые компоненты из shadcn и дополнительных регистров.",
};

const showcaseBattles = [
  {
    title: "Midnight Echo Live",
    description: "Тональный флэш, где судьи следят за лирикой и взаимодействием с аудиторией.",
    progress: 78,
    phase: "Live",
    participants: "7 артистов",
    detail: "Видео снимается в 4K, а каждый раунд получает отдельный тег для аналитики.",
  },
  {
    title: "Solar Drift — Round 9",
    description: "Команда судей тестирует новую шкалу колёс артефактов и призов.",
    progress: 54,
    phase: "Review",
    participants: "3 судьи",
    detail: "Аналитика показывает рост вовлечения в 23% по сравнению с прошлым месяцем.",
  },
  {
    title: "Glass Alley Challenge",
    description: "Динамическая игра слов с элементами NFT и визуальными кодами.",
    progress: 42,
    phase: "Preparing",
    participants: "5 кураторов",
    detail: "Секция медиа и звука уже запустила предварительный дроп трейлера.",
  },
];

const artists = [
  {
    name: "Кора Скай",
    role: "MC — команда «Парадром»",
    wins: 18,
    avgScore: "92.5",
    bio: "Эксперименты с ритмом и светом, держит микрофон как дирижёр.",
  },
  {
    name: "Харт и Фаер",
    role: "Судьи / Баланс",
    wins: 12,
    avgScore: "88.3",
    bio: "Совмещают логику судейства и визуальные аргументы на сцене.",
  },
  {
    name: "Руми Пульс",
    role: "Архитектор баттлов",
    wins: 9,
    avgScore: "90.1",
    bio: "Построение сценариев и звуковых ландшафтов для каждой дуэли.",
  },
];

const showcaseTweets = ["SC-100", "SC-204", "SC-311", "SC-402", "SC-512", "SC-620"];

export default function ShowcasePage() {
  return (
    <div className="flex min-h-screen flex-col gap-12 px-6 py-10 sm:px-10 lg:px-16">
      <HeroHighlight
        containerClassName="mx-auto w-full max-w-5xl overflow-hidden rounded-[10px] border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-10 text-white shadow-2xl"
        className="flex flex-col gap-6"
      >
        <Badge variant="secondary">showcase</Badge>
        <TextAnimate
          text="Компоненты shadcn и регистры в действии"
          type="popIn"
          className="text-3xl font-black leading-tight md:text-5xl"
        />
        <p className="max-w-3xl text-sm text-white/80">
          Этот экран показывает, как <Highlight>HeroHighlight</Highlight> из @acernity, <Highlight>TweetGrid</Highlight>
          от @cult-ui и базовые блоки shadcn собираются в единый поток тестовых данных.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg">Проверить API</Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Вернуться на главную</Link>
          </Button>
        </div>
      </HeroHighlight>

      <section className="grid gap-6 md:grid-cols-2">
        {showcaseBattles.map((battle) => (
          <Card key={battle.title}>
            <CardHeader className="items-center justify-between">
              <CardTitle>{battle.title}</CardTitle>
              <Badge variant="outline">{battle.phase}</Badge>
            </CardHeader>
            <CardDescription>{battle.description}</CardDescription>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{battle.detail}</p>
              <Progress value={battle.progress} />
            </CardContent>
            <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Участников: {battle.participants}</span>
              <span>{battle.progress}% готовность</span>
            </CardFooter>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] text-muted-foreground">Разговор из сети</p>
            <h2 className="text-3xl font-semibold">tweet-прототип от @cult-ui</h2>
          </div>
          <Badge variant="secondary">Mock feeds</Badge>
        </div>
        <TweetGrid tweets={showcaseTweets} columns={3} spacing="md" className="mx-auto w-full" />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] text-muted-foreground">Команда</p>
            <h2 className="text-3xl font-semibold">Артисты и судьи</h2>
          </div>
          <Badge variant="outline">@shadcn</Badge>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {artists.map((artist) => (
            <Card key={artist.name}>
              <CardHeader className="items-center gap-3">
                <Avatar className="bg-primary/10 text-primary">
                  <AvatarFallback>
                    {artist.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <CardTitle>{artist.name}</CardTitle>
              </CardHeader>
              <CardDescription className="text-sm">{artist.role}</CardDescription>
              <CardContent>
                <p className="text-sm text-muted-foreground">{artist.bio}</p>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 text-xs text-muted-foreground">
                <span>Побед: {artist.wins}</span>
                <span>avg score: {artist.avgScore}</span>
                <Button variant="ghost" size="sm">
                  Следить
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Button asChild size="sm" variant="outline">
          <Link href="/admin">Перейти в админку</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </div>
  );
}
