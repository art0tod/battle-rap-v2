import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowUpRight,
  Flame,
  LineChart,
  MessageCircle,
  Mic2,
  Users,
} from "lucide-react";

import { Section } from "@/components/section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchActiveApplicationRound,
  fetchArtists,
  fetchBattles,
  fetchTournaments,
} from "@/lib/data";
import { formatDateTime, formatNumber } from "@/lib/format";
import { formatRoundStatus, formatTournamentStatus } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <HeroSection />
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Набор участников" />}>
          <ActiveApplicationRoundSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Артисты и судьи" lines={5} />}>
          <ArtistsPreview />
        </Suspense>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Турниры" lines={4} />}>
          <TournamentsPreview />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Текущие баттлы" lines={4} />}>
          <BattlesPreview />
        </Suspense>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
      <Card className="relative overflow-hidden rounded-[10px] bg-transparent p-8">
        <div className="space-y-6">
          <Badge variant="secondary" className="w-fit bg-primary/20 text-primary">
            Новый сезон
          </Badge>
          <div className="space-y-4">
            <h2 className="text-4xl font-semibold tracking-tight">
              Battle Rap Hub объединяет артистов, судей и поклонников баттлов.
            </h2>
            <p className="text-lg text-muted-foreground">
              Следите за свежими баттлами, успевайте на отбор и наблюдайте как растет рейтинг ваших фаворитов.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/applications/new">Подать заявку</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/battles">
                Каталог баттлов
                <ArrowUpRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <dl className="grid gap-4 md:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-[10px] p-4">
                <dt className="text-xs tracking-wide text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-xl font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>
      <Card className="flex flex-col gap-4 rounded-[10px] bg-transparent p-6">
        <p className="text-sm tracking-wide text-muted-foreground">Быстрый переход</p>
        <div className="space-y-3">
          {heroHighlights.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between gap-3 rounded-[10px] p-4 transition hover:bg-primary/10"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-[10px] bg-secondary/50 p-2 text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground transition group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

async function ActiveApplicationRoundSection() {
  const round = await fetchActiveApplicationRound();
  if (!round) {
    return (
      <Section
        title="Набор участников"
        description="Следите за объявлениями и подготовьте демо заранее."
        action={
          <Button variant="ghost" asChild size="sm">
            <Link href="/applications/new">
              Подать заявку
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        }
      >
        <div className="rounded-[10px] p-6 text-center text-sm text-muted-foreground">
          Сейчас нет активных раундов с открытой подачей. Подписывайтесь на обновления, чтобы не пропустить старт.
        </div>
      </Section>
    );
  }

  const stats = [
    { label: "Старт раунда", value: round.starts_at ? formatDateTime(round.starts_at) : "Будет объявлено" },
    {
      label: "Дедлайн подачи",
      value: round.submission_deadline_at ? formatDateTime(round.submission_deadline_at) : "Уточняется",
    },
    { label: "Формат", value: round.kind },
  ];

  return (
    <Section
      title="Набор участников"
      description={`Турнир ${round.tournament_title} ищет новых артистов`}
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/rounds/${round.id}`}>
            Детали раунда
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Badge>{formatRoundStatus(round.status)}</Badge>
        <Badge variant="outline">Раунд {round.number}</Badge>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[10px] p-4">
            <dt className="text-xs tracking-wide text-muted-foreground">{stat.label}</dt>
            <dd className="mt-1 text-base font-semibold text-foreground">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <Button size="lg" asChild className="w-full sm:w-auto">
        <Link href="/applications/new">Подать трек</Link>
      </Button>
    </Section>
  );
}

async function TournamentsPreview() {
  const response = await fetchTournaments({ limit: 3 });
  if (!response.data.length) {
    return (
      <Section title="Турниры" description="Как только турнир станет публичным — мы покажем его здесь.">
        <div className="rounded-[10px] p-6 text-sm text-muted-foreground">
          Еще не создано ни одного турнира.
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Турниры"
      description="Актуальные сезоны и статус их публикаций."
      action={
        <Button variant="ghost" asChild size="sm">
          <Link href="/tournaments">
            Все турниры
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {response.data.map((tournament) => (
          <Link
            key={tournament.id}
            href={`/tournaments/${tournament.id}`}
            className="group flex flex-col gap-2 rounded-[10px] p-4 transition hover:bg-primary/10"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold">{tournament.title}</p>
              <Badge variant="outline">{formatTournamentStatus(tournament.status)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Публичный релиз: {tournament.public_at ? formatDateTime(tournament.public_at) : "еще не запланирован"}
            </p>
          </Link>
        ))}
      </div>
    </Section>
  );
}

async function BattlesPreview() {
  const { battles } = await fetchBattles({ status: "current", limit: 5 });
  if (!battles.length) {
    return (
      <Section title="Текущие баттлы" description="Все баттлы с открытым доступом появятся здесь.">
        <div className="rounded-[10px] p-6 text-sm text-muted-foreground">
          Пока нет активных баттлов.
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Текущие баттлы"
      description="Раунды, где прямо сейчас кипит борьба."
      action={
        <Button variant="ghost" asChild size="sm">
          <Link href="/battles">
            Каталог баттлов
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {battles.map((battle) => (
          <Link
            key={battle.id}
            href={`/battles/${battle.id}`}
            className="flex flex-col gap-3 rounded-[10px] p-4 transition hover:bg-primary/10"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold">
                  {battle.tournament.title} · Раунд {battle.round.number}
                </p>
                <p className="text-sm text-muted-foreground">{battle.participants.map((p) => p.display_name).join(" vs ")}</p>
              </div>
              <Badge variant="muted">{formatRoundStatus(battle.round.status)}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mic2 className="h-4 w-4" />
                {battle.participants.length} участн.
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {battle.engagement.comments} комментариев
              </span>
              {battle.round.judging_deadline_at ? (
                <span className="flex items-center gap-1">
                  <LineChart className="h-4 w-4" />
                  Судейство до {formatDateTime(battle.round.judging_deadline_at)}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}

async function ArtistsPreview() {
  const response = await fetchArtists({ limit: 5, sort: "wins" });
  if (!response.data.length) {
    return (
      <Section title="Артисты и судьи" description="Здесь появятся лучшие профили сообщества.">
        <div className="rounded-[10px] p-6 text-sm text-muted-foreground">
          Пока нет публичных профилей.
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Артисты и судьи"
      description="Лидеры по победам и среднему баллу."
      action={
        <Button variant="ghost" asChild size="sm">
          <Link href="/artists">
            Все профили
            <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <ol className="space-y-4">
        {response.data.map((participant, index) => {
          const averageScore = Math.max(0, Math.min(100, participant.avg_total_score ?? 0));
          return (
          <li
            key={participant.id}
            className="flex items-center gap-4 rounded-[10px] p-4"
          >
            <span className="text-2xl font-semibold text-muted-foreground">#{index + 1}</span>
            <Avatar>
              {participant.avatar?.url ? <AvatarImage alt={participant.display_name} src={participant.avatar.url} /> : null}
              <AvatarFallback>{participant.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold">{participant.display_name}</p>
                <Badge variant="secondary">{formatNumber(participant.total_wins)} побед</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {participant.roles.slice(0, 2).map((role) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))}
                {participant.city ? <Badge variant="muted">{participant.city}</Badge> : null}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Средний балл</span>
                  <span>{formatNumber(averageScore)} / 100</span>
                </div>
                <Progress value={averageScore} />
              </div>
            </div>
          </li>
        );
      })}
      </ol>
    </Section>
  );
}

function SectionSkeleton({ title, lines = 3 }: { title: string; lines?: number }) {
  return (
    <Card className="space-y-4 bg-transparent">
      <div className="text-lg font-semibold text-muted-foreground">{title}</div>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, idx) => (
          <Skeleton key={idx} className="h-4 w-full" />
        ))}
      </div>
    </Card>
  );
}

const heroStats = [
  { label: "Покрытие API", value: "Обновление каждые 15 мин" },
  { label: "Форматы", value: "Турниры · Баттлы · Вызовы" },
  { label: "Комьюнити", value: "Судьи и артисты онлайн" },
];

const heroHighlights = [
  {
    title: "Текущие баттлы",
    description: "Следите за раундами в прямом эфире.",
    href: "/battles",
    icon: Flame,
  },
  {
    title: "Профили артистов",
    description: "Статистика побед, роли и города.",
    href: "/artists",
    icon: Users,
  },
  {
    title: "Сезонные турниры",
    description: "Расписание релизов и дедлайнов.",
    href: "/tournaments",
    icon: LineChart,
  },
];
