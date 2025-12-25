import Link from "next/link";
import Image from "next/image";
import Carousel16x9 from "@/components/Carousel";
import HorizontalScroller from "@/components/HorizontalScroller";
import NewsCard from "@/components/NewsCard";
import RatingCard from "@/components/RatingCard";
import PlayersGameOfMonthSection from "@/components/PlayersGameOfMonthSection";
import UpcomingCalendarThisMonth from "@/components/UpcomingCalendarThisMonth";

import {
  getTopStoriesForHome,
  getLatestRatingsForHome,
  getHeroSlidesForHome,
  getPlayersGameOfMonthForHome,
  getUpcomingGamesForHome,
} from "@/lib/actions/home-content";

/* ===================== helpers (no any) ===================== */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function getNullableString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function getNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/* =============== FeatureCard =============== */
type FeatureCardProps = {
  title: string;
  icon: string;
  href?: string;
  bg?: string;
  variant?: "top" | "default";
  size?: "sm" | "md" | "lg";
};

function FeatureCard({
  title,
  icon,
  href,
  bg,
  variant = "default",
  size = "md",
}: FeatureCardProps) {
  const isImageIcon =
    /\.(png|jpe?g|webp|gif|svg)$/i.test(icon) || icon.startsWith("/");
  const isTop = variant === "top";

  const wrapBySize =
    size === "sm"
      ? "p-3 min-h-[130px]"
      : size === "md"
      ? "p-4 min-h-[180px]"
      : "p-5 min-h-[220px]";

  const iconBySize =
    size === "sm"
      ? { w: 72, h: 72, gap: "mb-2" }
      : size === "md"
      ? { w: 120, h: 80, gap: "mb-2.5" }
      : { w: 160, h: 96, gap: "mb-3" };

  return (
    <Link href={href || "#"} className="block h-full">
      <div
        className={[
          "relative overflow-hidden",
          "flex flex-col items-center justify-center text-center",
          "transition-all duration-300",
          wrapBySize,
          isTop
            ? "rounded-none border-0 border-b border-border hover:bg-white/[0.02]"
            : "rounded-2xl border border-border hover:border-white/25",
        ].join(" ")}
      >
        {bg ? (
          <>
            <Image src={bg} alt={`${title} background`} fill className="object-cover" />
            <div className="absolute inset-0 bg-black/60" />
          </>
        ) : !isTop ? (
          <div className="absolute inset-0 bg-surface/40" />
        ) : null}

        <div className="relative z-10 flex flex-col items-center justify-center">
          {isImageIcon ? (
            <Image
              src={icon}
              alt={`${title} icon`}
              width={iconBySize.w}
              height={iconBySize.h}
              className={`object-contain ${iconBySize.gap}`}
            />
          ) : (
            <div className="text-5xl mb-3 leading-none">{icon}</div>
          )}
          <h3 className="font-semibold text-base sm:text-lg lg:text-xl">{title}</h3>
        </div>
      </div>
    </Link>
  );
}

/* =============== Page =============== */

type PgomDisplayItem = {
  rank: number; // 1..5
  title: string;
  image_url: string;
  href: string;
};

export default async function Home() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1..12

  const [
    heroSlides,
    topStories,
    latestRatings,
    playersGameOfMonth,
    upcomingGamesThisMonth,
  ] = await Promise.all([
    getHeroSlidesForHome(),
    getTopStoriesForHome(),
    getLatestRatingsForHome(),
    getPlayersGameOfMonthForHome(),
    getUpcomingGamesForHome({ year: currentYear, month: currentMonth }),
  ]);

  // --- Players game of the month mapping (no any) ---
  const rawPgomItems: unknown =
    isRecord(playersGameOfMonth) ? playersGameOfMonth["items"] : null;

  const pgomItems: PgomDisplayItem[] = (Array.isArray(rawPgomItems) ? rawPgomItems : [])
    .map((u: unknown): PgomDisplayItem | null => {
      if (!isRecord(u)) return null;

      const rank = getNumber(u["position"], NaN);
      if (!Number.isFinite(rank)) return null;

      return {
        rank,
        title: getString(u["title"], ""),
        image_url: getString(u["image_url"], ""),
        href: getString(u["link_url"], "/polls") || "/polls",
      };
    })
    .filter((x): x is PgomDisplayItem => !!x && x.rank >= 1 && x.rank <= 5)
    .sort((a, b) => a.rank - b.rank);

  const totalVotesText =
    getString(isRecord(playersGameOfMonth) ? playersGameOfMonth["totalVotesText"] : undefined, "110 VOTES")
      .replace("VOTES", "ГЛАСА");

  const votesHref = getString(
    isRecord(playersGameOfMonth) ? playersGameOfMonth["votesHref"] : undefined,
    "/polls",
  );

  const monthLabel = getString(
    isRecord(playersGameOfMonth) ? playersGameOfMonth["monthLabel"] : undefined,
    "THIS MONTH",
  );

  return (
    <div className="p-4 sm:p-6 lg:p-4 pb-0 sm:pb-0 lg:pb-0">
      {/* HERO */}
      {Array.isArray(heroSlides) && heroSlides.length > 0 && (
        <section className="w-full">
          <div className="relative overflow-hidden rounded-2xl">
            <Carousel16x9 slides={heroSlides} interval={5000} />
          </div>
        </section>
      )}

      {/* MOBILE */}
      <section className="block hidden pt-8">
        <div className="space-y-4 mt-6">
          <FeatureCard title="Game Ratings" icon="⭐" bg="/ratings-bg.png" size="sm" href="/ratings" />
          <FeatureCard title="Polls" icon="📊" bg="/tutorials-bg.png" size="sm" href="/polls" />
        </div>
      </section>

      {/* LATEST RATINGS */}
      <section className="w-full mt-6">
        <div className="mb-6 relative">
          <div className="text-center">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[0.95] text-white drop-shadow-[0_10px_0_rgba(0,0,0,0.55)] uppercase">
              РЕЙТИНГИ
            </h2>
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden sm:block">
            <Link
              href="/ratings"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/20 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white/90 hover:bg-black/30 transition"
            >
              Виж всички →
            </Link>
          </div>
        </div>

        <HorizontalScroller>
          {(Array.isArray(latestRatings) ? latestRatings : []).map((r: unknown) => {
            if (!isRecord(r)) return null;

            const id = String(r["id"] ?? "");
            if (!id) return null;

            const slug = getNullableString(r["slug"]);
            const title = getString(r["title"], "");
            const game_title = getString(r["game_title"], title);
            const img = getString(r["img"], "");
            const image_url = getNullableString(r["image_url"]);
            const score = getNumber(r["badge"], getNumber(r["score"], 0));

            return (
              <div
                key={id}
                className="shrink-0 snap-start pr-4 sm:pr-5 w-[160px] sm:w-[180px] lg:w-[200px]"
              >
                <RatingCard
                  id={id}
                  slug={slug}
                  title={title}
                  game_title={game_title}
                  img={img}
                  image_url={image_url}
                  score={score}
                />
              </div>
            );
          })}
        </HorizontalScroller>

        <div className="mt-4 flex justify-center sm:hidden">
          <Link
            href="/ratings"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/20 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white/90 hover:bg-black/30 transition"
          >
            Виж всички рейтинги →
          </Link>
        </div>
      </section>

      {/* NEWS */}
      <section className="w-full pt-10">
        <div className="-mx-6 sm:-mx-8 lg:-mx-10 py-6 bg-news">
          <div className="px-6 sm:px-8 lg:px-10">
            <div className="flex items-start justify-between gap-6">
              <div className="relative">
                <div className="h-14 sm:h-16 w-[200px] sm:w-[240px] rounded-sm bg-black" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-extrabold tracking-wide text-4xl sm:text-4xl">
                    НОВИНИ
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                {Array.isArray(topStories) && topStories[0] && (
                  <div className="h-[260px] sm:h-[320px]">
                    <NewsCard item={topStories[0]} mediaMode="fill" />
                  </div>
                )}
              </div>

              <div className="lg:col-span-5">
                {Array.isArray(topStories) && topStories[1] && (
                  <div className="h-[260px] sm:h-[320px]">
                    <NewsCard item={topStories[1]} mediaMode="fill" />
                  </div>
                )}
              </div>

              <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                {(Array.isArray(topStories) ? topStories : []).slice(2, 5).map((n) => (
                  <div key={(n as { id: string }).id} className="h-[190px] sm:h-[210px]">
                    <NewsCard item={n} mediaMode="fill" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex justify-center">
              <Link
                href="/news"
                className="inline-flex items-center gap-3 border border-border hover:border-white/25 bg-black hover:bg-background/25 transition rounded-md px-6 py-3"
              >
                <span className="font-extrabold tracking-wide">ВИЖ ВСИЧКИ НОВИНИ</span>
                <span className="text-text-muted">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PLAYERS GAME OF THE MONTH */}
      <section className="w-full">
        <div className="-mx-3 sm:-mx-6  bg-background">
          <div className="px-3 sm:px-6 lg:px-4">
            <PlayersGameOfMonthSection
              items={pgomItems}
              totalVotesText={totalVotesText}
              votesHref={votesHref}
              monthLabel={monthLabel}
            />
          </div>
        </div>
      </section>

      {/* UPCOMING CALENDAR (CURRENT MONTH) */}
      <UpcomingCalendarThisMonth
        year={currentYear}
        month={currentMonth}
        items={upcomingGamesThisMonth}
      />
    </div>
  );
}
