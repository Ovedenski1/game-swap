"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

/** Card type now supports image-based icons */
type Card = {
  title: string;
  description: string;
  tags?: string[];
  href?: string;

  // NEW: image icon
  iconSrc?: string;        // e.g. "/icons/ratings.png" (must be under /public)
  iconAlt?: string;

  // Optional fallback if you still want to pass an inline SVG sometimes
  icon?: React.ReactNode;
};

/** Example data — point these to your files in /public/icons */
const cards: Card[] = [
  {
    title: "Game Ratings",
    description:
      "Rate what you play and discover what’s hot. Community scores and quick reviews help you pick your next title fast.",
    tags: ["Metascore-like", "Lists", "Top charts"],
    iconSrc: "/icons/ratings.png",
    iconAlt: "Ratings icon",
    href: "#",
  },
  {
    title: "Tutorials",
    description:
      "Boss guides, build paths, speedrun tips—curated tutorials from players who’ve mastered the grind.",
    tags: ["Boss guides", "Builds", "Speedruns"],
    iconSrc: "/icons/tutorials.png",
    iconAlt: "Tutorials icon",
    href: "#",
  },
  {
    title: "Donate Games",
    description:
      "Give your finished titles a second life. Donate games to players who need them and keep the community rolling.",
    tags: ["Wishlist", "Local pickup", "Verified users"],
    iconSrc: "/icons/donate.png",
    iconAlt: "Donate icon",
    href: "#",
  },
];

export default function GamingFeatures() {
  return (
    <section className="relative py-14 sm:py-16 md:py-20 bg-[#0B0F12]">
      {/* subtle neon glows */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          background:
            "radial-gradient(1200px 400px at 20% 0%, rgba(198,255,0,0.12), transparent 60%), radial-gradient(800px 300px at 80% 10%, rgba(198,255,0,0.10), transparent 60%)",
          maskImage:
            "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
        }}
      />
      {/* grid-lines overlay */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:100%_24px] opacity-40"
      />

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mb-8 sm:mb-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            Level up your experience
          </h2>
          <p className="mt-2 text-white/70">
            Tools and perks built for gamers — fast, useful, and fun.
          </p>
        </div>

        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const content = (
              <article
                key={c.title}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.02] p-6 sm:p-7 hover:border-white/20 transition-colors"
              >
                {/* glow accent */}
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#C6FF00]/10 blur-2xl group-hover:bg-[#C6FF00]/20 transition-colors" />

                {/* icon image (with emoji/SVG fallback if provided) */}
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
                  {c.iconSrc ? (
                    <div className="relative h-8 w-8">
                      <Image
                        src={c.iconSrc}
                        alt={c.iconAlt ?? `${c.title} icon`}
                        fill
                        sizes="32px"
                        className="object-contain"
                        priority={false}
                      />
                    </div>
                  ) : (
                    c.icon ?? <span className="text-2xl">🎮</span>
                  )}
                </div>

                <h3 className="text-xl font-bold">{c.title}</h3>
                <p className="mt-2 text-white/70">{c.description}</p>

                {c.tags?.length ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {c.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            );

            return c.href ? (
              <Link key={c.title} href={c.href} className="block">
                {content}
              </Link>
            ) : (
              content
            );
          })}
        </div>
      </div>
    </section>
  );
}
