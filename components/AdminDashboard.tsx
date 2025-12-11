// components/AdminDashboard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { NewsItem } from "./NewsCard";
import NewsImageUpload from "./NewsImageUpload";

import {
  adminDeleteStory,
  adminDeleteRating,
  adminCreateHeroSlide,
  adminUpdateHeroSlide,
  adminDeleteHeroSlide,
} from "@/lib/actions/admin-content";
import type { RatingItem, HeroSlideItem } from "@/lib/actions/admin-content";

interface AdminDashboardProps {
  initialStories: NewsItem[];
  initialRatings: RatingItem[];
  initialHeroSlides: HeroSlideItem[];
}

/* ---------- local form state types ---------- */

type HeroFormState = {
  id: string | null;
  title: string;
  img: string;
};

export default function AdminDashboard({
  initialStories,
  initialRatings,
  initialHeroSlides,
}: AdminDashboardProps) {
  const [stories, setStories] = useState<NewsItem[]>(initialStories);
  const [ratings, setRatings] = useState<RatingItem[]>(initialRatings);
  const [heroSlides, setHeroSlides] =
    useState<HeroSlideItem[]>(initialHeroSlides);

  const [heroForm, setHeroForm] = useState<HeroFormState>({
    id: null,
    title: "",
    img: "",
  });

  const [savingHero, setSavingHero] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------- helpers ---------- */

  function resetHeroForm() {
    setHeroForm({
      id: null,
      title: "",
      img: "",
    });
  }

  /* =========================================================================
   * STORIES  (list + delete only, creation in visual editor)
   * =======================================================================*/

  async function deleteStory(id: string) {
    if (!confirm("Delete this story?")) return;
    setError(null);

    try {
      await adminDeleteStory(id);
      setStories((prev) => prev.filter((s) => String(s.id) !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to delete story.");
    }
  }

  /* =========================================================================
   * RATINGS  (no quick form – only full editor + view + delete)
   * =======================================================================*/

  async function deleteRating(id: string) {
    if (!confirm("Delete this rating?")) return;
    setError(null);

    try {
      await adminDeleteRating(id);
      setRatings((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to delete rating.");
    }
  }

  /* =========================================================================
   * HERO CAROUSEL
   * =======================================================================*/

  async function handleSaveHero(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingHero(true);

    try {
      if (!heroForm.img) {
        throw new Error("Image is required for a hero slide.");
      }

      const payload = {
        img: heroForm.img.trim(),
        title: heroForm.title.trim() || undefined,
      };

      let saved: any;
      if (heroForm.id == null) {
        saved = await adminCreateHeroSlide(payload);
        setHeroSlides((prev) => [saved, ...prev]);
      } else {
        saved = await adminUpdateHeroSlide(heroForm.id, payload);
        setHeroSlides((prev) =>
          prev.map((s) => (s.id === saved.id ? saved : s)),
        );
      }

      resetHeroForm();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save hero slide.");
    } finally {
      setSavingHero(false);
    }
  }

  function editHeroSlide(slide: HeroSlideItem) {
    setHeroForm({
      id: slide.id,
      title: slide.title ?? "",
      img: slide.img,
    });
  }

  async function deleteHero(id: string) {
    if (!confirm("Delete this hero slide?")) return;
    setError(null);

    try {
      await adminDeleteHeroSlide(id);
      setHeroSlides((prev) => prev.filter((s) => s.id !== id));
      if (heroForm.id === id) resetHeroForm();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to delete hero slide.");
    }
  }

  /* =========================================================================
   * RENDER
   * =======================================================================*/

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* -------- Homepage Hero Carousel -------- */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Homepage Carousel</h2>

        <form
          onSubmit={handleSaveHero}
          className="mb-4 space-y-3 rounded-lg border border-white/10 bg-black/40 p-4"
        >
          <h3 className="font-medium">
            {heroForm.id ? "Edit Slide" : "Create Slide"}
          </h3>

          <div className="grid gap-3 md:grid-cols-2">
            <NewsImageUpload
              label="Image"
              value={heroForm.img}
              onChange={(url) => setHeroForm((f) => ({ ...f, img: url }))}
            />

            <div className="space-y-1">
              <label className="text-xs text-white/60">Alt text / title</label>
              <input
                className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                value={heroForm.title}
                onChange={(e) =>
                  setHeroForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Optional text shown for accessibility"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={savingHero}
              className="rounded-md bg-lime-400 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
            >
              {savingHero
                ? "Saving…"
                : heroForm.id
                ? "Update Slide"
                : "Create Slide"}
            </button>
            {heroForm.id && (
              <button
                type="button"
                onClick={resetHeroForm}
                className="text-xs text-white/60 underline"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>

        {/* existing hero slides list */}
        <div className="space-y-2">
          <h3 className="mb-2 text-sm font-semibold">Existing Slides</h3>
          {heroSlides.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="relative h-16 w-28 overflow-hidden rounded-md bg-black/40 flex-shrink-0">
                  <Image
                    src={s.img}
                    alt={s.title || "Hero slide"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium line-clamp-1">
                    {s.title || "(no title)"}
                  </div>
                  <div className="text-[11px] text-white/40 line-clamp-1">
                    {s.img}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => editHeroSlide(s)}
                  className="rounded border border-white/40 px-2 py-0.5"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteHero(s.id)}
                  className="rounded border border-red-500/70 px-2 py-0.5 text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {heroSlides.length === 0 && (
            <p className="text-xs text-white/60">
              No slides yet. Create one above.
            </p>
          )}
        </div>
      </section>

      {/* -------- Top Stories (visual editor only) -------- */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Top Stories</h2>
            <p className="mt-1 text-xs text-white/60">
              Create and edit stories using the visual story editor. This list
              only shows what&rsquo;s already live.
            </p>
          </div>

          {/* Button to open the visual editor page */}
          <Link
            href="/admin/stories/new"
            className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/5"
          >
            ✏️ Create story in visual editor
          </Link>
        </div>

        {/* existing stories list */}
        <div className="space-y-2">
          <h3 className="mb-2 text-sm font-semibold">Existing Stories</h3>
          {stories.map((s) => {
            const href = s.href || `/news/${s.id}`;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative h-12 w-20 overflow-hidden rounded-md bg-black/40 flex-shrink-0">
                    <Image
                      src={s.img}
                      alt={s.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium line-clamp-1">{s.title}</div>
                    {s.subtitle && (
                      <div className="text-xs text-white/60 line-clamp-1">
                        {s.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  {/* edit in visual editor */}
                  <Link
                    href={`/admin/stories/${s.id}`}
                    className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/5"
                  >
                    Edit
                  </Link>

                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/5"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteStory(String(s.id))}
                    className="rounded border border-red-500/70 px-2 py-0.5 text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {stories.length === 0 && (
            <p className="text-xs text-white/60">
              No stories yet. Use the visual editor to create one.
            </p>
          )}
        </div>
      </section>

      {/* -------- Ratings -------- */}
      <section>
        {/* header with button to open full rating editor */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Ratings</h2>
            <p className="mt-1 text-xs text-white/60">
              Create and edit ratings using the full rating editor.
            </p>
          </div>

          <Link
            href="/admin/ratings/new"
            className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/5"
          >
            ⭐ Create rating in editor
          </Link>
        </div>

        {/* existing ratings list (no quick form) */}
        <div className="space-y-2">
          <h3 className="mb-2 text-sm font-semibold">Existing Ratings</h3>
          {ratings.map((r) => {
            const viewHref = r.slug
              ? `/ratings/${r.slug}`
              : `/ratings/${r.id}`;

            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative h-12 w-20 overflow-hidden rounded-md bg-black/40 flex-shrink-0">
                    <Image
                      src={r.img}
                      alt={r.game_title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium line-clamp-1">
                      {r.game_title}{" "}
                      <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px]">
                        {r.score.toFixed(1)}
                      </span>
                    </div>
                    {r.subtitle && (
                      <div className="text-xs text-white/60 line-clamp-1">
                        {r.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  {/* full visual editor for this rating */}
                  <Link
                    href={`/admin/ratings/${r.id}`}
                    className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/5"
                  >
                    Full editor
                  </Link>

                  {/* view public rating page */}
                  <Link
                    href={viewHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/5"
                  >
                    View
                  </Link>

                  <button
                    type="button"
                    onClick={() => deleteRating(r.id)}
                    className="rounded border border-red-500/70 px-2 py-0.5 text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {ratings.length === 0 && (
            <p className="text-xs text-white/60">
              No ratings yet. Use the editor to create one.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
