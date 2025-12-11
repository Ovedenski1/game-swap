// app/page.tsx  (HOME PAGE)

import Link from "next/link";
import Image from "next/image";
import Carousel16x9 from "@/components/Carousel";
import HorizontalScroller from "@/components/HorizontalScroller";
import NewsCard from "@/components/NewsCard";
import {
  getTopStoriesForHome,
  getLatestRatingsForHome,
  getHeroSlidesForHome,
} from "@/lib/actions/home-content";

/* =============== FeatureCard =============== */
type FeatureCardProps = {
  title: string;
  icon: string; // emoji or /public path
  href?: string;
  bg?: string; // background image
  variant?: "top" | "default"; // top cards = transparent, square corners
  size?: "sm" | "md" | "lg"; // affects padding, min-height, icon size
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
      : "p-5 min-h-[220px]"; // lg

  const iconBySize =
    size === "sm"
      ? { w: 72, h: 72, gap: "mb-2" }
      : size === "md"
      ? { w: 120, h: 80, gap: "mb-2.5" }
      : { w: 160, h: 96, gap: "mb-3" }; // lg

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
            : "rounded-2xl border border-border",
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
          <div className="absolute inset-0 bg-surface" />
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
  const [heroSlides, topStories, latestRatings] = await Promise.all([
    getHeroSlidesForHome(),
    getTopStoriesForHome(),
    getLatestRatingsForHome(),
  ]);

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4">
        <div className="bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl">
          <div className="p-4 sm:p-6 lg:p-8">
            {/* HERO – only show if there are slides in DB */}
            {heroSlides.length > 0 && (
              <section className="w-full">
                <div className="relative overflow-hidden rounded-2xl">
                  <Carousel16x9 slides={heroSlides} interval={5000} />
                </div>
              </section>
            )}

            {/* ===== MOBILE (≤640px) ===== */}
            <section className="block sm:hidden pt-8">
              <div className="grid grid-cols-3 gap-3">
                <FeatureCard
                  title="GameSwap"
                  icon="/gameswap.png"
                  href="/matches"
                  variant="top"
                  size="sm"
                />
                <FeatureCard
                  title="Rent"
                  icon="/gamerent.png"
                  href="/rent"
                  variant="top"
                  size="sm"
                />
                <FeatureCard
                  title="Donate"
                  icon="/donate.png"
                  href="#"
                  variant="top"
                  size="sm"
                />
              </div>

              <div className="space-y-4 mt-6">
                <FeatureCard
                  title="Game Ratings"
                  icon="⭐"
                  bg="/ratings-bg.png"
                  size="sm"
                  href="/ratings"        
                />
                <FeatureCard
                  title="Tutorials"
                  icon="🎮"
                  bg="/tutorials-bg.png"
                  size="sm"
                />
              </div>
            </section>

            {/* ===== TABLET (≥768px & <1024px) ===== */}
            <section className="hidden md:block lg:hidden py-10">
              <div className="grid grid-cols-3 gap-8 items-stretch">
                {[
                  { title: "GameSwap", icon: "/gameswap.png", href: "/matches" },
                  { title: "Rent a Game", icon: "/gamerent.png", href: "/rent" },
                  { title: "Donate Games", icon: "/donate.png", href: "#" },
                ].map((card) => (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="flex flex-col items-center justify-center text-center border-b border-border hover:bg-white/[0.02] transition-all duration-300 py-6"
                  >
                    <div className="flex items-center justify-center h-[160px]">
                      <Image
                        src={card.icon}
                        alt={card.title}
                        width={160}
                        height={120}
                        className="object-contain"
                      />
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{card.title}</h3>
                  </Link>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6 mt-8">
                <FeatureCard
                  title="Game Ratings"
                  icon="⭐"
                  bg="/ratings-bg.png"
                  size="md"
                  href="/ratings"      
                />
                <FeatureCard
                  title="Tutorials"
                  icon="🎮"
                  bg="/tutorials-bg.png"
                  size="md"
                />
              </div>
            </section>

            {/* ===== DESKTOP (≥1024px) ===== */}
            <section className="hidden lg:block py-6">
              <div className="grid grid-cols-3 gap-4 items-stretch">
                {[
                  { title: "GameSwap", icon: "/gameswap.png", href: "/matches" },
                  { title: "Rent a Game", icon: "/gamerent.png", href: "/rent" },
                  { title: "Donate Games", icon: "/donate.png", href: "#" },
                ].map((card) => (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="flex flex-col items-center justify-center text-center border-b border-border hover:bg-white/[0.02] transition-all duration-300 py-3"
                  >
                    <div className="flex items-center justify-center h-[120px]">
                      <Image
                        src={card.icon}
                        alt={card.title}
                        width={150}
                        height={100}
                        className="object-contain"
                      />
                    </div>
                    <h3 className="mt-1 text-lg font-semibold leading-tight">
                      {card.title}
                    </h3>
                  </Link>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6">
                <FeatureCard
                  title="Game Ratings"
                  icon="⭐"
                  bg="/ratings-bg.png"
                  size="md"
                  href="/ratings"     
                />
                <FeatureCard
                  title="Tutorials"
                  icon="🎮"
                  bg="/tutorials-bg.png"
                  size="md"
                />
              </div>
            </section>

            {/* NEWS */}
            <section className="w-full pb-12">
              <h2 className="mb-5 text-2xl sm:text-3xl font-extrabold tracking-tight">
                Top Stories
              </h2>
              <HorizontalScroller className="mb-12">
                {topStories.map((n) => (
                  <div
                    key={n.id}
                    className="shrink-0 snap-start w-[calc(50%-10px)] sm:w-[360px] lg:w-[420px]"
                  >
                    <NewsCard item={n} />
                  </div>
                ))}
              </HorizontalScroller>

              <h2 className="mb-5 mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
                Latest Ratings
              </h2>
              <HorizontalScroller>
                {latestRatings.map((n) => (
                  <div
                    key={n.id}
                    className="shrink-0 snap-start w-[calc(50%-10px)] sm:w-[320px] lg:w-[380px]"
                  >
                    <NewsCard item={n} />
                  </div>
                ))}
              </HorizontalScroller>
            </section>
          </div>
        </div>
      </div>
      <footer className="bg-navbar border-t border-border  text-foreground text-center py-4 text-xs sm:text-sm font-medium">
        © {new Date().getFullYear()} GameLink — Built with ❤️ using Next.js
      </footer>
    </div>
  );
}
