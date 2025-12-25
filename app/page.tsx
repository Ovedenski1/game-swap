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
            <Image
              src={bg}
              alt={`${title} background`}
              fill
              className="object-cover"
            />
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
          <h3 className="font-semibold text-base sm:text-lg lg:text-xl">
            {title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

/* =============== Page =============== */
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

  const pgomItems =
    (playersGameOfMonth?.items || [])
      .map((i: any) => ({
        rank: Number(i.position),
        title: i.title || "",
        image_url: i.image_url || "",
        href: i.link_url || "/polls",
      }))
      .filter((x: any) => x.rank >= 1 && x.rank <= 5)
      .sort((a: any, b: any) => a.rank - b.rank);

  const totalVotesText =
    (playersGameOfMonth?.totalVotesText || "110 VOTES").replace("VOTES", "ГЛАСА");

  const votesHref = playersGameOfMonth?.votesHref || "/polls";
  const monthLabel = playersGameOfMonth?.monthLabel || "THIS MONTH";

  return (
    <div className="p-4 sm:p-6 lg:p-4 pb-0 sm:pb-0 lg:pb-0">
      {/* HERO */}
      {heroSlides.length > 0 && (
        <section className="w-full">
          <div className="relative overflow-hidden rounded-2xl">
            <Carousel16x9 slides={heroSlides} interval={5000} />
          </div>
        </section>
      )}

      {/* MOBILE */}
      <section className="block hidden pt-8">
        <div className="space-y-4 mt-6">
          <FeatureCard
            title="Game Ratings"
            icon="⭐"
            bg="/ratings-bg.png"
            size="sm"
            href="/ratings"
          />
          <FeatureCard
            title="Polls"
            icon="📊"
            bg="/tutorials-bg.png"
            size="sm"
            href="/polls"
          />
        </div>
      </section>

 {/* LATEST RATINGS */}
<section className="w-full mt-6">
  {/* Header row */}
  <div className="mb-6 relative">
    {/* centered title */}
    <div className="text-center">
      <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[0.95] text-white drop-shadow-[0_10px_0_rgba(0,0,0,0.55)] uppercase">
        РЕЙТИНГИ
      </h2>

    
    </div>

    {/* button on the right */}
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
    {latestRatings.map((r: any) => (
      <div
        key={r.id}
        className="shrink-0 snap-start pr-4 sm:pr-5 w-[160px] sm:w-[180px] lg:w-[200px]"
      >
        <RatingCard
          id={String(r.id)}
          slug={r.slug ?? null}
          title={r.title}
          game_title={r.game_title}
          img={r.img}
          image_url={r.image_url}
          score={Number(r.badge ?? r.score ?? 0)}
        />
      </div>
    ))}
  </HorizontalScroller>

  {/* mobile button */}
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
                {topStories[0] && (
                  <div className="h-[260px] sm:h-[320px]">
                    <NewsCard item={topStories[0]} mediaMode="fill" />
                  </div>
                )}
              </div>

              <div className="lg:col-span-5">
                {topStories[1] && (
                  <div className="h-[260px] sm:h-[320px]">
                    <NewsCard item={topStories[1]} mediaMode="fill" />
                  </div>
                )}
              </div>

              <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                {topStories.slice(2, 5).map((n) => (
                  <div key={n.id} className="h-[190px] sm:h-[210px]">
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
                <span className="font-extrabold tracking-wide">
                  ВИЖ ВСИЧКИ НОВИНИ
                </span>
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

      {/* ✅ NEW: UPCOMING CALENDAR (CURRENT MONTH) */}
      <UpcomingCalendarThisMonth
        year={currentYear}
        month={currentMonth}
        items={upcomingGamesThisMonth}
      />
    </div>
  );
}
