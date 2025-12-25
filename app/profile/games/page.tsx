"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { getMyGames, createGameListing, deleteGame } from "@/lib/actions/games";
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
    >
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleDelete(gameId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this game?"
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
      <div className="min-h-[60vh] grid place-items-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6FF00] mx-auto" />
          <p className="mt-4 text-sm text-text-muted">Loading your games…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-4 py-6 sm:py-8">
      {/* Header (client style) */}
      <header className="text-center">
        <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />

        <div className="flex items-center justify-between gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/20 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-white/90 hover:bg-black/30 transition"
          >
            ← Back
          </Link>

          <h1
            className={[
              "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
              "tracking-tight text-foreground leading-none",
              "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
            ].join(" ")}
          >
            My Games
          </h1>

          {/* keeps title centered */}
          <div className="w-[72px] sm:w-[80px]" />
        </div>

        <p className="mt-3 text-xs sm:text-sm text-text-muted">
          Add the games you want to swap and manage your library
        </p>
      </header>

      <div className="mt-7 h-px w-full bg-border/40" />

      <div className="mt-6 grid gap-5 lg:gap-6 lg:grid-cols-12">
        {/* LEFT: Add game form */}
        <section className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-background/40 shadow-[0_18px_45px_rgba(0,0,0,0.35)] p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold mb-1">
                  Add a Game for Swap
                </h2>
                <p className="text-xs text-white/60">
                  Create a listing so other players can see what you&apos;re
                  offering.
                </p>
              </div>
            </div>

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
                className="w-full rounded-lg bg-black/20 border border-border px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C6FF00] focus:border-transparent"
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
                className="w-full rounded-lg bg-black/20 border border-border px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C6FF00] focus:border-transparent"
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
                className="w-full rounded-lg bg-black/20 border border-border px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#C6FF00] focus:border-transparent"
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

            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-md bg-[#C6FF00] text-black text-xs font-extrabold uppercase tracking-wide px-5 py-2 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? "Saving…" : "Add Game"}
              </button>
            </div>
          </form>
        </section>

        {/* RIGHT: My games list */}
        <section className="lg:col-span-5">
          <div className="rounded-2xl border border-border bg-background/40 shadow-[0_18px_45px_rgba(0,0,0,0.35)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Games</h2>
              <span className="text-xs text-white/60">
                {games.length} listing{games.length !== 1 ? "s" : ""}
              </span>
            </div>

            {games.length === 0 ? (
              <p className="text-sm text-white/60">
                You don&apos;t have any game listings yet. Add one on the left!
              </p>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="flex gap-3 rounded-xl bg-black/25 border border-border p-3"
                  >
                    <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-black/30 border border-white/10 flex-shrink-0">
                      {game.images[0] ? (
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
        </section>
      </div>
    </div>
  );
}
