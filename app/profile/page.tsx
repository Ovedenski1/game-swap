// app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/actions/profile";
import { getMyGames } from "@/lib/actions/games";
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

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileData, myGames] = await Promise.all([
          getCurrentUserProfile(),
          getMyGames(),
        ]);

        if (!profileData) {
          setError("Failed to load profile");
        } else {
          setProfile(profileData as UserProfile);
        }

        setGames(myGames || []);
      } catch (err) {
        console.error("Error loading profile/games: ", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleLogout() {
    try {
      await signOut();
    } finally {
      router.push("/");
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
          <p className="mt-4 text-white/70">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (error || !profile || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-white">
        <div className="text-center max-w-md mx-auto p-8 bg-background rounded-3xl border border-border shadow-[0_18px_45px_rgba(0,0,0,0.8)]">
          <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold mb-3">Profile not found</h2>
          <p className="text-white/70 mb-6">
            {error || "Unable to load your profile. Please sign in again."}
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center bg-[#C6FF00] text-black font-semibold py-2.5 px-6 rounded-full hover:bg-lime-300 transition-all duration-200 text-sm"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const preferredPlatforms =
    (profile.preferences.preferred_platforms || []) as GamePlatform[];

  const cityLabel =
    profile.city && profile.city.trim().length > 0
      ? profile.city
      : "City not set";

  return (
    <div className="flex-1 flex flex-col bg-background text-white">
      <main className="flex-1 flex">
        <div className="flex-1 max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          <div className="flex-1 bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl flex flex-col">
            <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
              <header className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">My Profile</h1>
                <p className="text-white/60 text-sm">
                  Manage your profile and swap preferences
                </p>
              </header>

              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* LEFT big card */}
                  <div className="lg:col-span-2">
                    <div className="bg-surface-soft rounded-2xl border border-border shadow-[0_18px_45px_rgba(0,0,0,0.8)] p-8">
                      {/* Top row: avatar + main info */}
                      <div className="flex items-center space-x-6 mb-8">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-900">
                            <img
                              src={profile.avatar_url || "/default.jpg"}
                              alt={profile.full_name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold mb-1">
                            {profile.full_name}
                          </h2>
                          <p className="text-white/70 mb-1">{cityLabel}</p>
                          <p className="text-xs text-white/50">
                            Member since{" "}
                            {new Date(
                              profile.created_at,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Basic Information */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">
                            Basic Information
                          </h3>
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
                                {profile.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Swap Preferences (distance removed) */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">
                            Swap Preferences
                          </h3>

                          {/* Platforms only */}
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
                                  const label =
                                    PLATFORM_LABELS[p] ?? p.toUpperCase();

                                  let colorClass =
                                    "border-white/30 text-white/80";
                                  if (p.startsWith("ps")) {
                                    colorClass =
                                      "border-blue-400/70 text-blue-200";
                                  } else if (p.startsWith("xbox")) {
                                    colorClass =
                                      "border-emerald-400/70 text-emerald-200";
                                  } else if (
                                    ["switch", "wii", "wiiu", "ds", "3ds"].includes(
                                      p,
                                    )
                                  ) {
                                    colorClass =
                                      "border-red-400/70 text-red-200";
                                  } else if (p === "pc") {
                                    colorClass =
                                      "border-sky-400/70 text-sky-200";
                                  } else if (p === "sega") {
                                    colorClass =
                                      "border-yellow-300/70 text-yellow-200";
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

                        {/* My Games */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">
                            My Games for Swap
                          </h3>

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
                                  <div className="w-16 h-20 rounded-lg overflow-hidden bg-black/40 flex-shrink-0">
                                    {game.images[0] ? (
                                      <img
                                        src={game.images[0]}
                                        alt={game.title}
                                        className="w-full h-full object-cover"
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
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Quick Actions + Account */}
                  <div className="space-y-6">
                    {/* Quick Actions (unchanged) */}
                    <div className="bg-surface-soft rounded-2xl border border-border shadow-[0_15px_40px_rgba(0,0,0,0.7)] p-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Quick Actions
                      </h3>
                      <div className="space-y-3">
                        <Link
                          href="/profile/edit"
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors duration-200"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </div>
                            <span>Edit Profile</span>
                          </div>
                          <svg
                            className="w-5 h-5 text-white/40"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
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
                          <svg
                            className="w-5 h-5 text-white/40"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
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
                          <svg
                            className="w-5 h-5 text-white/40"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </Link>
                      </div>
                    </div>

                    {/* Account card – email layout fixed */}
                    <div className="bg-surface-soft rounded-2xl border border-border shadow-[0_15px_40px_rgba(0,0,0,0.7)] p-6">
                      <h3 className="text-lg font-semibold mb-4">Account</h3>
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-white/5">
                          <p className="text-xs font-medium text-white/60 mb-1">
                            Email
                          </p>
                          <p className="text-sm text-white/80 break-words">
                            {profile.email}
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
                    </div>
                  </div>
                  {/* end right col */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-navbar border-t border-border  text-foreground text-center py-4 text-xs sm:text-sm font-medium">
        © {new Date().getFullYear()} GameLink — Built with ❤️ using Next.js
      </footer>
    </div>
  );
}
