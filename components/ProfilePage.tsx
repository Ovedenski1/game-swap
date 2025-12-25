"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/actions/profile";
import { getMyGames } from "@/lib/actions/games";
import { createClient } from "@/lib/supabase/client";
import type { Game, GamePlatform } from "@/types/game";
import { useAuth } from "@/contexts/auth-context";

export interface UserPreferences {
  distance: number;
  preferred_platforms?: GamePlatform[];
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  city?: string | null;

  username?: string | null;
  bio?: string | null;
  gender?: "male" | "female" | "other" | null;
  birthdate?: string | null;

  preferences: UserPreferences;
  location_lat?: number;
  location_lng?: number;
  last_active: string;
  is_verified: boolean;
  is_online: boolean;
  created_at: string;
  updated_at: string;
  is_admin?: boolean | null;
}

const PLATFORM_LABELS: Record<GamePlatform, string> = {
  ps1: "PlayStation 1",
  ps2: "PlayStation 2",
  ps3: "PlayStation 3",
  ps4: "PlayStation 4",
  ps5: "PlayStation 5",
  xbox: "Xbox",
  xbox360: "Xbox 360",
  xbox_one: "Xbox One",
  xbox_series: "Xbox Series X|S",
  switch: "Nintendo Switch",
  wii: "Nintendo Wii",
  wiiu: "Nintendo Wii U",
  ds: "Nintendo DS",
  "3ds": "Nintendo 3DS",
  pc: "PC",
  sega: "Sega",
  other: "Other",
};

// ✅ Accept PromiseLike so Supabase Postgrest builders work without TS errors
function withTimeout<T>(p: PromiseLike<T>, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    Promise.resolve(p)
      .then((v) => {
        clearTimeout(id);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(id);
        reject(e);
      });
  });
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [currentRental, setCurrentRental] = useState<any>(null);

  // "Hard" loading is only for the FIRST load when nothing is on screen yet
  const [loading, setLoading] = useState(true);

  // If we already have data, we do "soft refresh" instead of blanking UI
  const [softStatus, setSoftStatus] = useState<string | null>(null);

  // Only show blocking error when we have no profile at all
  const [error, setError] = useState<string | null>(null);

  // Avoid overlapping refreshes
  const inFlightRef = useRef(false);

  // Track if we ever successfully loaded profile once
  const hasProfileOnceRef = useRef(false);

  const calculateDaysLeft = (dueDate: string): number | string => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return "🔥 Overdue";
    if (days === 0) return "Due today";
    return days;
  };

  const fetchProfile = useCallback(async () => {
    const profileData = await withTimeout(getCurrentUserProfile(), 10000);
    return profileData as UserProfile | null;
  }, []);

  const fetchGames = useCallback(async () => {
    const myGames = await withTimeout(getMyGames(), 10000);
    return (myGames || []) as Game[];
  }, []);

  const fetchCurrentRental = useCallback(async (userId: string) => {
    const supabase = createClient();
    const rentalQuery = supabase
      .from("rental_requests")
      .select(
        `
          id,
          status,
          due_date,
          rental_game:rental_games (
            title,
            platform,
            cover_url
          )
        `
      )
      .eq("user_id", userId)
      .eq("status", "playing")
      .maybeSingle();

    const { data } = await withTimeout(rentalQuery, 10000);
    return data;
  }, []);

  const loadData = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (!user?.id) return;
      if (inFlightRef.current) return;

      inFlightRef.current = true;

      const isInitial = mode === "initial" && !hasProfileOnceRef.current;

      if (isInitial) {
        setLoading(true);
        setError(null);
      } else {
        setSoftStatus("Refreshing…");
      }

      try {
        const profileData = await fetchProfile();

        if (!profileData) {
          if (!hasProfileOnceRef.current) {
            setError("Unable to load your profile. Please try again.");
          } else {
            setSoftStatus("Offline (showing last loaded profile)");
          }
          return;
        }

        setProfile(profileData);
        hasProfileOnceRef.current = true;
        setError(null);

        try {
          const myGames = await fetchGames();
          setGames(myGames);
        } catch (e) {
          console.warn("Games refresh failed:", e);
        }

        try {
          const rental = await fetchCurrentRental(profileData.id);
          setCurrentRental(rental);
        } catch (e) {
          console.warn("Rental refresh failed:", e);
        }
      } catch (e: any) {
        console.error("Profile load failed:", e);

        if (!hasProfileOnceRef.current) {
          setError(
            e?.message === "timeout"
              ? "Failed to load profile (timeout)."
              : "Failed to load profile."
          );
        } else {
          setSoftStatus(
            e?.message === "timeout"
              ? "Timeout (showing last loaded data)"
              : "Refresh failed (showing last loaded data)"
          );
        }
      } finally {
        if (isInitial) setLoading(false);
        inFlightRef.current = false;

        if (mode === "silent") {
          setTimeout(() => setSoftStatus(null), 1500);
        } else {
          setSoftStatus(null);
        }
      }
    },
    [fetchCurrentRental, fetchGames, fetchProfile, user?.id]
  );

  useEffect(() => {
    loadData("initial");
  }, [loadData]);

  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) loadData("silent");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadData]);

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      router.push("/");
    }
  }

  // ✅ Loading state (client style, NO dark bg block)
  if (loading && !hasProfileOnceRef.current) {
    return (
      <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
        <header className="text-center">
          <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />
          <h1
            className={[
              "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
              "tracking-tight text-foreground leading-none",
              "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
            ].join(" ")}
          >
            My Profile
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-text-muted">
            Loading your profile…
          </p>
        </header>

        <div className="mt-7 h-px w-full bg-border/40" />

        <div className="mt-10 grid place-items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
            <p className="mt-4 text-sm text-text-muted">Loading your profile…</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Full-screen error only if we STILL have no profile at all
  if ((error || !profile || !user) && !hasProfileOnceRef.current) {
    return (
      <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
        <header className="text-center">
          <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />
          <h1
            className={[
              "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
              "tracking-tight text-foreground leading-none",
              "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
            ].join(" ")}
          >
            My Profile
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-text-muted">
            We couldn’t load your profile
          </p>
        </header>

        <div className="mt-7 h-px w-full bg-border/40" />

        <div className="mt-8 grid place-items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface/40 p-8 shadow-[0_18px_45px_rgba(0,0,0,0.35)] text-center">
            <p className="text-sm text-white/70 mb-6">
              {error || "Unable to load your profile. Please sign in again."}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => loadData("initial")}
                className="inline-flex items-center justify-center rounded-md border border-white/15 bg-black/20 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white/90 hover:bg-black/30 transition"
              >
                Retry
              </button>

              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-md bg-[#C6FF00] px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-black hover:bg-lime-300 transition"
              >
                Go to Login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const preferredPlatforms =
    (profile?.preferences?.preferred_platforms || []) as GamePlatform[];

  const cityLabel =
    profile?.city && profile.city.trim().length > 0 ? profile.city : "City not set";

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
      {/* Header (client style) */}
      <header className="text-center">
        <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />

        <h1
          className={[
            "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
            "tracking-tight text-foreground leading-none",
            "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
          ].join(" ")}
        >
          My Profile
        </h1>

        <p className="mt-3 text-xs sm:text-sm text-text-muted">
          Manage your profile and swap preferences
        </p>

        {softStatus && <p className="mt-3 text-xs text-white/50">{softStatus}</p>}
      </header>

      <div className="mt-7 h-px w-full bg-border/40" />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
        {/* LEFT */}
        <section className="lg:col-span-8">
          <div className="rounded-2xl border border-border bg-background/40 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center gap-4 sm:gap-6 mb-8">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-white/10 bg-black/20">
                  <Image
                    src={profile?.avatar_url || "/default.jpg"}
                    alt={profile?.full_name || "Profile"}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold mb-1 truncate">
                    {profile?.full_name || "—"}
                  </h2>
                  <p className="text-white/70 mb-1">{cityLabel}</p>
                  {profile?.created_at && (
                    <p className="text-xs text-white/50">
                      Member since{" "}
                      {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1">
                        City
                      </label>
                      <p className="text-white">{cityLabel}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1">
                        Email
                      </label>
                      <p className="text-white break-words">
                        {profile?.email || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Swap Preferences</h3>
                  <div className="pt-2 border-t border-border">
                    <h4 className="text-sm font-semibold mb-2">
                      Platforms You Want to See
                    </h4>

                    {preferredPlatforms.length === 0 ? (
                      <p className="text-xs text-white/60">
                        All platforms (no filters selected).
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {preferredPlatforms.map((p) => {
                          const label = PLATFORM_LABELS[p] ?? p.toUpperCase();
                          let colorClass = "border-white/30 text-white/80";
                          if (p.startsWith("ps")) {
                            colorClass = "border-blue-400/70 text-blue-200";
                          } else if (p.startsWith("xbox")) {
                            colorClass =
                              "border-emerald-400/70 text-emerald-200";
                          } else if (
                            ["switch", "wii", "wiiu", "ds", "3ds"].includes(p)
                          ) {
                            colorClass = "border-red-400/70 text-red-200";
                          } else if (p === "pc") {
                            colorClass = "border-sky-400/70 text-sky-200";
                          } else if (p === "sega") {
                            colorClass = "border-yellow-300/70 text-yellow-200";
                          }

                          return (
                            <span
                              key={p}
                              className={`text-[11px] px-2.5 py-1 rounded-full border ${colorClass}`}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">My Games for Swap</h3>

                  {games.length === 0 ? (
                    <p className="text-sm text-white/60">
                      You haven’t added any games yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {games.map((game) => (
                        <div
                          key={game.id}
                          className="bg-black/30 border border-border rounded-xl p-3 flex space-x-3"
                        >
                          <div className="w-16 h-20 rounded-lg overflow-hidden bg-black/40 flex-shrink-0 relative">
                            {game.images?.[0] ? (
                              <Image
                                src={game.images[0]}
                                alt={game.title}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-white/50">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {game.title}
                            </p>
                            <p className="text-xs text-white/60 mb-1">
                              {game.platform.toUpperCase()}
                            </p>
                            <p className="text-xs text-white/70 line-clamp-2">
                              {game.description || "No description."}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {currentRental && (
                  <div className="bg-black/30 border border-border rounded-xl p-4 mt-8">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <span>🎮</span> Currently Playing
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-20 rounded-lg overflow-hidden border border-border flex-shrink-0 relative">
                        {currentRental.rental_game?.cover_url ? (
                          <Image
                            src={currentRental.rental_game.cover_url}
                            alt={currentRental.rental_game.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-xs text-white/40">
                            No cover
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-semibold">
                          {currentRental.rental_game?.title}
                        </p>
                        <p className="text-xs text-white/60">
                          {currentRental.rental_game?.platform}
                        </p>
                        <p className="text-xs text-lime-400 mt-1 font-medium">
                          🕹️ Status: Playing
                        </p>

                        {currentRental.due_date &&
                          (() => {
                            const daysLeft = calculateDaysLeft(
                              currentRental.due_date
                            );
                            const colorClass =
                              typeof daysLeft === "number"
                                ? daysLeft <= 5
                                  ? "text-red-400"
                                  : "text-emerald-400"
                                : "animate-pulse text-red-500";

                            return (
                              <p
                                className={`text-xs mt-1 font-semibold flex items-center gap-1 ${colorClass}`}
                              >
                                ⏰{" "}
                                {typeof daysLeft === "number"
                                  ? `${daysLeft} days left`
                                  : daysLeft}
                              </p>
                            );
                          })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT (hover effects kept) */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-background/40 rounded-2xl border border-border shadow-[0_15px_40px_rgba(0,0,0,0.35)] p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>

            <div className="space-y-3">
              <Link
                href="/profile/edit"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-lg">✏️</span>
                  </div>
                  <span>Edit Profile</span>
                </div>
                <span className="text-white/40">{">"}</span>
              </Link>

              <Link
                href="/profile/games"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-lg">🎮</span>
                  </div>
                  <span>Manage Games</span>
                </div>
                <span className="text-white/40">{">"}</span>
              </Link>

              <Link
                href="/profile/my-rentals"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-lg">📦</span>
                  </div>
                  <span>My Rentals</span>
                </div>
                <span className="text-white/40">{">"}</span>
              </Link>

              <Link
                href="/profile/platforms"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-lg">🎯</span>
                  </div>
                  <span>Filter by Platforms</span>
                </div>
                <span className="text-white/40">{">"}</span>
              </Link>

              <button
                onClick={() => loadData("silent")}
                className="w-full mt-2 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-semibold text-white transition-colors duration-200"
              >
                Refresh now
              </button>
            </div>
          </div>

          <div className="bg-background/40 rounded-2xl border border-border shadow-[0_15px_40px_rgba(0,0,0,0.35)] p-6">
            <h3 className="text-lg font-semibold mb-4">Account</h3>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs font-medium text-white/60 mb-1">Email</p>
                <p className="text-sm text-white/80 break-words">
                  {profile?.email || "—"}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors duration-200"
              >
                <LogOut size={18} />
                Log out
              </button>
            </div>

            {error && hasProfileOnceRef.current && (
              <div className="text-xs text-white/50 text-center mt-4">{error}</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
