"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { NewsItem } from "./NewsCard";
import NewsImageUpload from "./NewsImageUpload";

import {
  adminDeleteStory,
  adminDeleteRating,
  adminCreateHeroSlide,
  adminUpdateHeroSlide,
  adminDeleteHeroSlide,

  adminGetPlayersGameOfMonth,
  adminUpsertPlayersGameOfMonth,
  adminDeletePlayersGameOfMonth,
} from "@/lib/actions/admin-content";

import type {
  RatingItem,
  HeroSlideItem,
  PlayersGameOfMonthItem,
} from "@/lib/actions/admin-content";

interface AdminDashboardProps {
  initialStories: NewsItem[];
  initialRatings: RatingItem[];
  initialHeroSlides: HeroSlideItem[];
}

type HeroFormState = {
  id: string | null;
  title: string;
  img: string;
  href: string;
};

type PgomFormState = {
  id: string | null;
  position: number; // 1..5
  title: string;
  img: string;
  href: string;

  total_votes: number | null;
  votes_href: string;

  month_label: string;
};

const POSITIONS = [1, 2, 3, 4, 5] as const;

const outlineBtn =
  "inline-flex items-center justify-center " +
  "bg-transparent text-foreground border border-border/40 " +
  "hover:border-bronze/45 hover:bg-transparent " +
  "shadow-[0_0_0_1px_rgba(236,167,44,0)] hover:shadow-[0_0_0_1px_rgba(236,167,44,0.18)] " +
  "focus-visible:ring-2 focus-visible:ring-bronze/45 " +
  "rounded-full px-4 py-2 text-sm font-semibold";

export default function AdminDashboard({
  initialStories,
  initialRatings,
  initialHeroSlides,
}: AdminDashboardProps) {
  const [stories, setStories] = useState<NewsItem[]>(initialStories);
  const [ratings, setRatings] = useState<RatingItem[]>(initialRatings);
  const [heroSlides, setHeroSlides] = useState<HeroSlideItem[]>(initialHeroSlides);

  const [heroForm, setHeroForm] = useState<HeroFormState>({
    id: null,
    title: "",
    img: "",
    href: "",
  });

  const [savingHero, setSavingHero] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* =========================================================================
   * Players game of the month (admin UI)
   * =======================================================================*/
  const [pgom, setPgom] = useState<PlayersGameOfMonthItem[]>([]);
  const [loadingPgom, setLoadingPgom] = useState(false);
  const [savingPgom, setSavingPgom] = useState(false);

  const pgomByPosition = useMemo(() => {
    const map = new Map<number, PlayersGameOfMonthItem>();
    for (const it of pgom) map.set(Number((it as any).position), it);
    return map;
  }, [pgom]);

  const [pgomForm, setPgomForm] = useState<PgomFormState>({
    id: null,
    position: 1,
    title: "",
    img: "",
    href: "",
    total_votes: null,
    votes_href: "",
    month_label: "THIS MONTH",
  });

  function resetHeroForm() {
    setHeroForm({ id: null, title: "", img: "", href: "" });
  }

  function resetPgomForm(nextPosition = 1) {
    setPgomForm({
      id: null,
      position: nextPosition,
      title: "",
      img: "",
      href: "",
      total_votes: null,
      votes_href: "",
      month_label: "THIS MONTH",
    });
  }

  async function refreshPgom() {
    setLoadingPgom(true);
    setError(null);
    try {
      const data = await adminGetPlayersGameOfMonth();
      setPgom(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load Players game of the month.");
    } finally {
      setLoadingPgom(false);
    }
  }

  useEffect(() => {
    refreshPgom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deleteStory(id: string) {
    if (!confirm("Delete this story?")) return;
    setError(null);
    try {
      await adminDeleteStory(id);
      setStories((prev) => prev.filter((s) => String(s.id) !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete story.");
    }
  }

  async function deleteRating(id: string) {
    if (!confirm("Delete this rating?")) return;
    setError(null);
    try {
      await adminDeleteRating(id);
      setRatings((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete rating.");
    }
  }

  async function handleSaveHero(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingHero(true);
    try {
      if (!heroForm.img) throw new Error("Image is required for a hero slide.");
      const payload = {
        img: heroForm.img.trim(),
        title: heroForm.title.trim() || undefined,
        link_url: heroForm.href.trim() || undefined,
      };
      let saved: any;
      if (heroForm.id == null) {
        saved = await adminCreateHeroSlide(payload);
        setHeroSlides((prev) => [saved, ...prev]);
      } else {
        saved = await adminUpdateHeroSlide(heroForm.id, payload);
        setHeroSlides((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      }
      resetHeroForm();
    } catch (err: any) {
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
      href: (slide as any).link_url ?? "",
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
      setError(err.message || "Failed to delete hero slide.");
    }
  }

  function editPgom(position: number) {
    const it = pgomByPosition.get(position);
    if (!it) {
      resetPgomForm(position);
      return;
    }
    setPgomForm({
      id: String((it as any).id ?? null),
      position,
      title: (it as any).title ?? "",
      img: (it as any).image_url ?? (it as any).img ?? "",
      href: (it as any).link_url ?? "",
      total_votes:
        typeof (it as any).total_votes === "number" ? (it as any).total_votes : null,
      votes_href: (it as any).votes_link_url ?? "",
      month_label: (it as any).month_label ?? "THIS MONTH",
    });
  }

  async function handleSavePgom(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavingPgom(true);
    try {
      if (!pgomForm.img?.trim()) {
        throw new Error("Image is required for Players game of the month.");
      }

      const payload: any = {
        position: Number(pgomForm.position),
        title: pgomForm.title.trim() || null,
        image_url: pgomForm.img.trim(),
        link_url: pgomForm.href.trim() || null,
      };

      if (Number(pgomForm.position) === 1) {
        payload.total_votes =
          typeof pgomForm.total_votes === "number" ? pgomForm.total_votes : null;
        payload.votes_link_url = pgomForm.votes_href.trim() || null;
        payload.month_label = pgomForm.month_label.trim() || null;
      }

      await adminUpsertPlayersGameOfMonth(payload);

      await refreshPgom();
      resetPgomForm(pgomForm.position);
    } catch (err: any) {
      setError(err?.message || "Failed to save Players game of the month.");
    } finally {
      setSavingPgom(false);
    }
  }

  async function handleDeletePgom(position: number) {
    const it = pgomByPosition.get(position);
    if (!it) return;

    if (!confirm(`Delete item #${position}?`)) return;

    setError(null);
    try {
      await adminDeletePlayersGameOfMonth({
        id: (it as any).id ? String((it as any).id) : null,
        position,
      } as any);

      await refreshPgom();
      if (pgomForm.position === position) resetPgomForm(position);
    } catch (err: any) {
      setError(err?.message || "Failed to delete Players game of the month item.");
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background text-white">
      <main className="flex-1 flex">
        <div className="flex-1 max-w-[1300px] mx-auto px-3 sm:px-6 lg:px-4 flex">
          {/* ✅ remove the extra surface wrapper background look,
              keep the same spacing and layout */}
          <div className="flex-1 flex flex-col">
            <div className="py-6 sm:py-8 lg:py-10 flex-1 flex flex-col space-y-10">
              {/* ✅ new header to match the Poll pages */}
              <header className="text-center">
                <div className="mx-auto mb-3 h-[2px] w-16 rounded-full bg-bronze/80" />
                <h1
                  className={[
                    "text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase",
                    "tracking-tight text-foreground leading-none",
                    "[text-shadow:0_2px_0_rgba(0,0,0,0.35)]",
                  ].join(" ")}
                >
                  Admin Dashboard
                </h1>
                <p className="mt-3 text-sm text-text-muted">
                  Manage your homepage, news stories, ratings, hero carousel, and more.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <Link href="/admin/rentals" className={outlineBtn}>
                    Rentals
                  </Link>

                  <Link href="/admin/polls" className={outlineBtn}>
                    Polls
                  </Link>

                  {/* ✅ ONLY BUTTON (no editor here) */}
                  <Link href="/admin/upcoming" className={outlineBtn}>
                    Upcoming Games Editor →
                  </Link>
                </div>

                <div className="mt-8 h-px w-full bg-border/40" />
              </header>

              {error && (
                <div className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              {/* --- Hero Carousel --- */}
              <section className="bg-surface-soft border border-border rounded-2xl p-6 shadow-[0_15px_45px_rgba(0,0,0,0.6)]">
                <h2 className="mb-4 text-xl font-semibold">Homepage Carousel</h2>

                <form
                  onSubmit={handleSaveHero}
                  className="mb-4 space-y-3 rounded-lg border border-white/10 bg-black/30 p-4"
                >
                  <h3 className="font-medium">{heroForm.id ? "Edit Slide" : "Create Slide"}</h3>

                  <div className="grid gap-3 md:grid-cols-2">
                    <NewsImageUpload
                      label="Image"
                      value={heroForm.img}
                      onChange={(url) => setHeroForm((f) => ({ ...f, img: url }))}
                    />

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-white/60">Alt text / title</label>
                        <input
                          className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                          value={heroForm.title}
                          onChange={(e) => setHeroForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="Optional text shown for accessibility"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-white/60">Slide link (optional)</label>
                        <input
                          className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                          value={heroForm.href}
                          onChange={(e) => setHeroForm((f) => ({ ...f, href: e.target.value }))}
                          placeholder="/news/some-slug  OR  /rent  OR  https://..."
                        />
                        <p className="text-[11px] text-white/40">
                          If empty, the slide is not clickable.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={savingHero}
                      className="rounded-md bg-lime-400 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
                    >
                      {savingHero ? "Saving…" : heroForm.id ? "Update Slide" : "Create Slide"}
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

                <div className="space-y-2">
                  <h3 className="mb-2 text-sm font-semibold">Existing Slides</h3>
                  {heroSlides.length > 0 ? (
                    heroSlides.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm bg-black/20"
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
                            <div className="font-medium line-clamp-1">{s.title || "(no title)"}</div>

                            {(s as any).link_url ? (
                              <div className="text-[11px] text-white/50 line-clamp-1">
                                Link: {(s as any).link_url}
                              </div>
                            ) : (
                              <div className="text-[11px] text-white/30">No link</div>
                            )}

                            <div className="text-[11px] text-white/40 line-clamp-1">{s.img}</div>
                          </div>
                        </div>

                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => editHeroSlide(s)}
                            className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/10"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteHero(s.id)}
                            className="rounded border border-red-500/70 px-2 py-0.5 text-red-300 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-white/60">No slides yet. Create one above.</p>
                  )}
                </div>
              </section>

              {/* --- Top Stories --- */}
              <section className="bg-surface-soft border border-border rounded-2xl p-6 shadow-[0_15px_45px_rgba(0,0,0,0.6)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Top Stories</h2>
                    <p className="mt-1 text-xs text-white/60">
                      Manage stories created via the visual story editor.
                    </p>
                  </div>

                  <Link
                    href="/admin/stories/new"
                    className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/5"
                  >
                    ✏️ Create story in visual editor
                  </Link>
                </div>

                <div className="space-y-2">
                  {stories.length > 0 ? (
                    stories.map((s) => {
                      const href = s.href || `/news/${s.id}`;
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm bg-black/20"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="relative h-12 w-20 overflow-hidden rounded-md bg-black/40 flex-shrink-0">
                              <Image src={s.img} alt={s.title} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium line-clamp-1">{s.title}</div>
                              {s.subtitle && (
                                <div className="text-xs text-white/60 line-clamp-1">{s.subtitle}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 text-xs">
                            <Link
                              href={`/admin/stories/${s.id}`}
                              className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/10"
                            >
                              Edit
                            </Link>
                            <Link
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/10"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={() => deleteStory(String(s.id))}
                              className="rounded border border-red-500/70 px-2 py-0.5 text-red-300 hover:bg-red-500/10"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-white/60">
                      No stories yet. Use the editor to create one.
                    </p>
                  )}
                </div>
              </section>

              {/* --- Ratings --- */}
              <section className="bg-surface-soft border border-border rounded-2xl p-6 shadow-[0_15px_45px_rgba(0,0,0,0.6)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Ratings</h2>
                    <p className="mt-1 text-xs text-white/60">
                      Manage ratings created in the rating editor.
                    </p>
                  </div>

                  <Link
                    href="/admin/ratings/new"
                    className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/5"
                  >
                    ⭐ Create rating in editor
                  </Link>
                </div>

                <div className="space-y-2">
                  {ratings.length > 0 ? (
                    ratings.map((r) => {
                      const viewHref = r.slug ? `/ratings/${r.slug}` : `/ratings/${r.id}`;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm bg-black/20"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="relative h-12 w-20 overflow-hidden rounded-md bg-black/40 flex-shrink-0">
                              <Image src={r.img} alt={r.game_title} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium line-clamp-1">
                                {r.game_title}{" "}
                                <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px]">
                                  {r.score.toFixed(1)}
                                </span>
                              </div>
                              {r.subtitle && (
                                <div className="text-xs text-white/60 line-clamp-1">{r.subtitle}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 text-xs">
                            <Link
                              href={`/admin/ratings/${r.id}`}
                              className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/10"
                            >
                              Full editor
                            </Link>
                            <Link
                              href={viewHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded border border-white/40 px-2 py-0.5 hover:bg-white/10"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={() => deleteRating(r.id)}
                              className="rounded border border-red-500/70 px-2 py-0.5 text-red-300 hover:bg-red-500/10"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-white/60">
                      No ratings yet. Use the editor to create one.
                    </p>
                  )}
                </div>
              </section>

              {/* --- Players game of the month --- */}
              <section className="bg-surface-soft border border-border rounded-2xl p-6 shadow-[0_15px_45px_rgba(0,0,0,0.6)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Players game of the month</h2>
                    <p className="mt-1 text-xs text-white/60">
                      Upload the ranking images (positions #1–#5) and set the links. Month +
                      votes are set on #1.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={refreshPgom}
                      className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/5 disabled:opacity-60"
                      disabled={loadingPgom}
                    >
                      {loadingPgom ? "Refreshing…" : "Refresh"}
                    </button>

                    <Link
                      href="/polls"
                      className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/5"
                    >
                      Go to polls →
                    </Link>
                  </div>
                </div>

                <form
                  onSubmit={handleSavePgom}
                  className="mb-4 space-y-3 rounded-lg border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-white/60">Position</label>
                      <select
                        className="rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                        value={pgomForm.position}
                        onChange={(e) => {
                          const pos = Number(e.target.value);
                          editPgom(pos);
                        }}
                      >
                        {POSITIONS.map((p) => (
                          <option key={p} value={p}>
                            #{p}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => resetPgomForm(pgomForm.position)}
                        className="text-xs text-white/60 underline"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="text-xs text-white/50">
                      Tip: set link to a rating page, a game page, or a poll.
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <NewsImageUpload
                      label={`Image for #${pgomForm.position}`}
                      value={pgomForm.img}
                      onChange={(url) => setPgomForm((f) => ({ ...f, img: url }))}
                    />

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-white/60">Title</label>
                        <input
                          className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                          value={pgomForm.title}
                          onChange={(e) =>
                            setPgomForm((f) => ({ ...f, title: e.target.value }))
                          }
                          placeholder="Game name (shown on homepage)"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-white/60">Click link (optional)</label>
                        <input
                          className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                          value={pgomForm.href}
                          onChange={(e) => setPgomForm((f) => ({ ...f, href: e.target.value }))}
                          placeholder="/ratings/some-slug  OR  /polls  OR  https://..."
                        />
                        <p className="text-[11px] text-white/40">
                          If empty, the image still displays but won’t navigate.
                        </p>
                      </div>

                      {Number(pgomForm.position) === 1 && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs text-white/60">Total votes</label>
                            <input
                              type="number"
                              className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                              value={pgomForm.total_votes ?? ""}
                              onChange={(e) =>
                                setPgomForm((f) => ({
                                  ...f,
                                  total_votes: e.target.value === "" ? null : Number(e.target.value),
                                }))
                              }
                              placeholder="110"
                              min={0}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-white/60">Votes link (optional)</label>
                            <input
                              className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                              value={pgomForm.votes_href}
                              onChange={(e) =>
                                setPgomForm((f) => ({ ...f, votes_href: e.target.value }))
                              }
                              placeholder="/polls"
                            />
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs text-white/60">Month label</label>
                            <input
                              className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm"
                              value={pgomForm.month_label}
                              onChange={(e) =>
                                setPgomForm((f) => ({ ...f, month_label: e.target.value }))
                              }
                              placeholder="DECEMBER 2025"
                            />
                            <p className="text-[11px] text-white/40">
                              This shows under the title on the HOME page.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={savingPgom}
                      className="rounded-md bg-lime-400 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60"
                    >
                      {savingPgom
                        ? "Saving…"
                        : pgomByPosition.get(pgomForm.position)
                        ? `Update #${pgomForm.position}`
                        : `Create #${pgomForm.position}`}
                    </button>

                    {pgomByPosition.get(pgomForm.position) && (
                      <button
                        type="button"
                        onClick={() => handleDeletePgom(pgomForm.position)}
                        className="rounded-md border border-red-500/70 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                      >
                        Delete #{pgomForm.position}
                      </button>
                    )}
                  </div>
                </form>

                <div className="space-y-2">
                  <h3 className="mb-2 text-sm font-semibold">Current items</h3>

                  <div className="grid gap-2 md:grid-cols-2">
                    {POSITIONS.map((pos) => {
                      const it = pgomByPosition.get(pos);
                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => editPgom(pos)}
                          className="text-left rounded-lg border border-white/10 bg-black/20 hover:bg-white/[0.03] transition px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-xs font-semibold text-white/80 w-10">#{pos}</div>
                            <div className="relative h-10 w-16 overflow-hidden rounded-md bg-black/40 flex-shrink-0">
                              {it?.image_url ? (
                                <Image
                                  src={it.image_url}
                                  alt={it.title || `#${pos}`}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white/40">
                                  empty
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium line-clamp-1">
                                {it?.title || `No #${pos} item yet`}
                              </div>
                              <div className="text-[11px] text-white/40 line-clamp-1">
                                {it?.link_url ? `Link: ${it.link_url}` : "No link"}
                              </div>
                              {pos === 1 && (
                                <div className="text-[11px] text-white/40 line-clamp-1">
                                  Month: {(it as any)?.month_label ?? "—"} • Votes:{" "}
                                  {typeof (it as any)?.total_votes === "number"
                                    ? (it as any).total_votes
                                    : "—"}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-white/50">Edit</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-white/40 mt-2">
                    This section controls the images shown on HOME under “Players game of the month”.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
