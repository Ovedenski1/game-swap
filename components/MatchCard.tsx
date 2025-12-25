"use client";

import { useState } from "react";
import Image from "next/image";

import MatchButtons from "./MatchButtons";
import { UserProfile } from "@/components/ProfilePage";
import type { Game } from "@/types/game";
import { MapPin } from "lucide-react";

interface MatchCardProps {
  user: UserProfile;
  games: Game[];
  onLike: () => void;
  onPass: () => void;
}

const PLATFORM_FAMILY: Record<
  string,
  "Nintendo" | "PlayStation" | "Xbox" | "PC / Other"
> = {
  ps1: "PlayStation",
  ps2: "PlayStation",
  ps3: "PlayStation",
  ps4: "PlayStation",
  ps5: "PlayStation",
  xbox: "Xbox",
  xbox360: "Xbox",
  xbox_one: "Xbox",
  xbox_series: "Xbox",
  switch: "Nintendo",
  wii: "Nintendo",
  wiiu: "Nintendo",
  ds: "Nintendo",
  "3ds": "Nintendo",
  pc: "PC / Other",
  sega: "PC / Other",
  other: "PC / Other",
};

const FAMILY_STYLES: Record<
  "Nintendo" | "PlayStation" | "Xbox" | "PC / Other",
  string
> = {
  Nintendo: "border-red-400/80 text-red-300 bg-red-500/10",
  PlayStation: "border-blue-400/80 text-blue-300 bg-blue-500/10",
  Xbox: "border-green-400/80 text-green-300 bg-green-500/10",
  "PC / Other": "border-slate-400/80 text-slate-200 bg-slate-500/10",
};

export default function MatchCard({
  user,
  games,
  onLike,
  onPass,
}: MatchCardProps) {
  const [activeGameIndex, setActiveGameIndex] = useState(0);

  const city = user.city ?? undefined;

  const hasGames = games.length > 0;
  const safeIndex = hasGames ? Math.min(activeGameIndex, games.length - 1) : 0;
  const activeGame = hasGames ? games[safeIndex] : undefined;

  const heroImageSrc = activeGame?.images?.[0] || "/default-game-cover.png";

  const families: ("Nintendo" | "PlayStation" | "Xbox" | "PC / Other")[] =
    Array.from(
      new Set(games.map((g) => PLATFORM_FAMILY[g.platform] ?? "PC / Other")),
    );

  function handleNextGame() {
    if (!hasGames) return;
    setActiveGameIndex((prev) => (prev + 1) % games.length);
  }

  function handlePrevGame() {
    if (!hasGames) return;
    setActiveGameIndex((prev) => (prev === 0 ? games.length - 1 : prev - 1));
  }

  return (
    <div className="w-full flex justify-center">
      <div
        className="
          w-[540px]
          bg-[#0a0f1c]/90
          backdrop-blur-xl
          border border-white/10
          shadow-[0_25px_60px_rgba(0,0,0,0.7)]
          overflow-hidden
          flex flex-col
          rounded-2xl
        "
      >
        {/* BIG GAME IMAGE */}
        <div className="p-3 pb-1">
          <div
            className="
              relative
              w-full
              aspect-[3/4]
              bg-black
              overflow-hidden
              rounded-xl
              border border-indigo-500/40
              shadow-[0_0_20px_rgba(99,102,241,0.3)]
            "
          >
            <Image
              src={heroImageSrc}
              alt={activeGame?.title || user.full_name}
              fill
              className="object-cover rounded-xl transition-opacity duration-200"
              priority
            />

            {hasGames && games.length > 1 && (
              <>
                <button
                  onClick={handlePrevGame}
                  className="
                    absolute left-2 top-1/2 -translate-y-1/2
                    h-9 w-9 rounded-full
                    bg-black/40 hover:bg-black/70
                    flex items-center justify-center
                    text-white
                    transition
                  "
                >
                  ‹
                </button>

                <button
                  onClick={handleNextGame}
                  className="
                    absolute right-2 top-1/2 -translate-y-1/2
                    h-9 w-9 rounded-full
                    bg-black/40 hover:bg-black/70
                    flex items-center justify-center
                    text-white
                    transition
                  "
                >
                  ›
                </button>

                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1">
                  {games.map((g, idx) => (
                    <span
                      key={g.id}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === safeIndex ? "w-5 bg-white" : "w-2 bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* PROFILE INFO ROW */}
        <div
          className="
            bg-[#111827]/90
            border-t border-white/5
            px-5 py-4
            flex items-center gap-4
          "
        >
          {/* Avatar */}
          <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/20">
            <Image
              src={user.avatar_url || "/default.jpg"}
              alt={user.full_name}
              fill
              className="object-cover"
            />
          </div>

          {/* Name */}
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm">
              {user.full_name}
            </span>
          </div>

          {/* Right side: platforms + city tag */}
          <div className="ml-auto flex flex-col items-end gap-1">
            <div className="flex flex-wrap items-center gap-1 justify-end">
              {families.map((family) => (
                <span
                  key={family}
                  className={`
                    px-2 py-0.5 rounded-full
                    text-[10px] uppercase tracking-wide
                    border ${FAMILY_STYLES[family]}
                  `}
                >
                  {family}
                </span>
              ))}

              {city && (
  <span className="px-4 flex items-center gap-1 text-[11px] text-white/70">
    <MapPin size={12} className="text-[#C6FF00]" />
    <span className="max-w-[120px] truncate">{city}</span>
  </span>
)}
            </div>
          </div>
        </div>

        {/* LIKE / PASS BUTTONS */}
        <div
          className="
            bg-[#111827]/90
            border-t border-white/5
            px-5 pt-4 pb-5
            flex items-center justify-center
          "
        >
          <MatchButtons onLike={onLike} onPass={onPass} />
        </div>
      </div>
    </div>
  );
}
