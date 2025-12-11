"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  getMyGames,
  createGameListing,
  deleteGame,
} from "@/lib/actions/games";
import type { Game, GamePlatform } from "@/types/game";
import GameImageUploader from "@/components/GameImageUploader";
import { useAuth } from "@/contexts/auth-context";

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

export default function MyGamesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    platform: "ps4" as GamePlatform,
    condition: "",
    images: [] as string[],
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/auth");
      return;
    }

    async function load() {
      try {
        const data = await getMyGames();
        setGames(data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load games.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await createGameListing({
        title: formData.title.trim(),
        platform: formData.platform,
        condition: formData.condition || undefined,
        imageUrls: formData.images,
      });

      if (!res.success) {
        setError(res.error || "Failed to create game listing.");
        return;
      }

      const updated = await getMyGames();
      setGames(updated || []);

      setFormData({
        title: "",
        platform: "ps4",
        condition: "",
        images: [],
      });
    } catch (err) {
      console.error(err);
      setError("Failed to create game listing.");
    } finally {
      setSaving(false);
    }
  }

  function handleInputChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleDelete(gameId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this game?",
    );
    if (!confirmed) return;

    try {
      const res = await deleteGame(gameId);
      if (!res.success) {
        alert(res.error || "Failed to delete game.");
        return;
      }
      const updated = await getMyGames();
      setGames(updated || []);
    } catch (err) {
      console.error(err);
      alert("Failed to delete game.");
    }
  }

  // loading (auth or games)
  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
          <p className="mt-4 text-white/70">Loading your games…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col bg-background text-white">
      <main className="flex-1 flex">
        <div className="flex-1 max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          {/* outer shell – same as Profile / EditProfile */}
          <div className="flex-1 bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-b-3xl flex flex-col">
            <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
              <div className="max-w-4xl mx-auto w-full">
                {/* Header similar to Edit Profile (back link row + centered title) */}
                <header className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <Link
                      href="/profile"
                      className="text-xs sm:text-sm text-white/70 hover:text-white underline underline-offset-4"
                    >
                      ← Back to Profile
                    </Link>
                  </div>

                  <div className="text-center">
                    <h1 className="text-3xl font-bold mb-2">My Games</h1>
                    <p className="text-white/60 text-sm">
                      Add the games you want to swap and manage your library
                    </p>
                  </div>
                </header>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                  {/* LEFT: Add game form */}
                  <form
                    onSubmit={handleSubmit}
                    className="bg-surface-soft rounded-2xl border border-border shadow-[0_18px_45px_rgba(0,0,0,0.8)] p-6 space-y-5"
                  >
                    <h2 className="text-lg font-semibold mb-1">
                      Add a Game for Swap
                    </h2>
                    <p className="text-xs text-white/60 mb-2">
                      Create a listing so other players can see what you&apos;re
                      offering.
                    </p>

                    {/* Title */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-white/70 mb-1">
                        Game Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., The Last of Us Part II"
                      />
                    </div>

                    {/* Platform */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-white/70 mb-1">
                        Platform *
                      </label>
                      <select
                        name="platform"
                        value={formData.platform}
                        onChange={handleInputChange}
                        className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <optgroup label="PlayStation">
                          <option value="ps1">PlayStation 1</option>
                          <option value="ps2">PlayStation 2</option>
                          <option value="ps3">PlayStation 3</option>
                          <option value="ps4">PlayStation 4</option>
                          <option value="ps5">PlayStation 5</option>
                        </optgroup>
                        <optgroup label="Xbox">
                          <option value="xbox">Xbox</option>
                          <option value="xbox360">Xbox 360</option>
                          <option value="xbox_one">Xbox One</option>
                          <option value="xbox_series">Xbox Series X|S</option>
                        </optgroup>
                        <optgroup label="Nintendo">
                          <option value="switch">Nintendo Switch</option>
                          <option value="wii">Nintendo Wii</option>
                          <option value="wiiu">Nintendo Wii U</option>
                          <option value="ds">Nintendo DS</option>
                          <option value="3ds">Nintendo 3DS</option>
                        </optgroup>
                        <optgroup label="Other">
                          <option value="pc">PC</option>
                          <option value="sega">Sega</option>
                          <option value="other">Other / Unknown</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Condition */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-white/70 mb-1">
                        Condition (e.g., &quot;Like new&quot;, &quot;Used&quot;)
                      </label>
                      <input
                        type="text"
                        name="condition"
                        value={formData.condition}
                        onChange={handleInputChange}
                        className="w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Like new, no scratches"
                      />
                    </div>

                    {/* Images */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-white/70">
                        Game Photos
                      </label>
                      <GameImageUploader
                        images={formData.images}
                        onChange={(imgs) =>
                          setFormData((prev) => ({ ...prev, images: imgs }))
                        }
                      />
                    </div>

                    {error && (
                      <p className="text-xs text-red-400 mt-2">{error}</p>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-lg bg-[#C6FF00] text-black text-sm font-semibold px-4 py-2 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? "Saving…" : "Add Game"}
                      </button>
                    </div>
                  </form>

                  {/* RIGHT: My games list */}
                  <div className="bg-surface-soft rounded-2xl border border-border shadow-[0_18px_45px_rgba(0,0,0,0.8)] p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Your Games</h2>
                      <span className="text-xs text-white/60">
                        {games.length} listing{games.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {games.length === 0 ? (
                      <p className="text-sm text-white/60">
                        You don&apos;t have any game listings yet. Add one on
                        the left!
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                        {games.map((game) => (
                          <div
                            key={game.id}
                            className="flex gap-3 rounded-xl bg-black/25 border border-white/10 p-3"
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
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold truncate">
                                  {game.title}
                                </p>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10">
                                  {PLATFORM_LABELS[game.platform]}
                                </span>
                              </div>
                              {game.condition && (
                                <p className="text-[11px] text-white/70 mt-0.5">
                                  Condition: {game.condition}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDelete(game.id)}
                                className="mt-2 text-[11px] text-red-400 hover:text-red-300 underline underline-offset-2"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-navbar border-t border-border text-foreground text-center py-4 text-xs sm:text-sm font-medium">
        © {new Date().getFullYear()} GameLink — Built with ❤️ using Next.js
      </footer>
    </div>
  );
}
