"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  adminGetUpcomingGames,
  adminUpsertUpcomingGame,
  adminDeleteUpcomingGame,
  type UpcomingGameItem,
} from "@/lib/actions/admin-content";

const UPCOMING_MONTHS = [
  { value: 1, label: "ЯНУАРИ" },
  { value: 2, label: "ФЕВРУАРИ" },
  { value: 3, label: "МАРТ" },
  { value: 4, label: "АПРИЛ" },
  { value: 5, label: "МАЙ" },
  { value: 6, label: "ЮНИ" },
  { value: 7, label: "ЮЛИ" },
  { value: 8, label: "АВГУСТ" },
  { value: 9, label: "СЕПТЕМВРИ" },
  { value: 10, label: "ОКТОМВРИ" },
  { value: 11, label: "НОЕМВРИ" },
  { value: 12, label: "ДЕКЕМВРИ" },
  { value: 13, label: "TBA" },
] as const;

const PLATFORM_CHOICES = [
  "PC",
  "PS5",
  "PS4",
  "XBOX",
  "XSX/S",
  "SWITCH",
  "SWITCH 2",
] as const;

type InlineFormState = {
  id: string | null;
  month: number;
  title: string;
  studio: string;
  day: string;
  platforms: string[];
  link_url: string;
};

function emptyForm(month: number): InlineFormState {
  return {
    id: null,
    month,
    title: "",
    studio: "",
    day: "",
    platforms: [],
    link_url: "",
  };
}

function getLabel(month: number) {
  return UPCOMING_MONTHS.find((m) => m.value === month)?.label ?? String(month);
}

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "Unknown error";
}

export default function UpcomingGamesAdminEditor() {
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => [currentYear - 1, currentYear, currentYear + 1, currentYear + 2],
    [currentYear],
  );

  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState<number>(currentYear);
  const [items, setItems] = useState<UpcomingGameItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [form, setForm] = useState<InlineFormState>(emptyForm(1));

  const byMonth = useMemo(() => {
    const map = new Map<number, UpcomingGameItem[]>();
    for (const m of UPCOMING_MONTHS) map.set(m.value, []);

    for (const it of items) {
      const k = Number(it.month);
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }

    for (const [m, arr] of map) {
      arr.sort((a, b) => {
        const ad = a.day ?? 999;
        const bd = b.day ?? 999;
        if (ad !== bd) return ad - bd;
        return a.title.localeCompare(b.title);
      });
      map.set(m, arr);
    }
    return map;
  }, [items]);

  async function refresh(nextYear = year) {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetUpcomingGames(nextYear);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || "Failed to load upcoming games.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  function openCreate(month: number) {
    setOpenMonth(month);
    setForm(emptyForm(month));
  }

  function openEdit(it: UpcomingGameItem) {
    setOpenMonth(it.month);
    setForm({
      id: it.id,
      month: it.month,
      title: it.title ?? "",
      studio: it.studio ?? "",
      day: it.day == null ? "" : String(it.day),
      platforms: it.platforms ?? [],
      link_url: it.link_url ?? "",
    });
  }

  function closeEditor() {
    setOpenMonth(null);
    setForm(emptyForm(1));
  }

  function togglePlatform(p: string) {
    setForm((f) => {
      const has = f.platforms.includes(p);
      return {
        ...f,
        platforms: has ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
      };
    });
  }

  async function save() {
    setSaving(true);
    setError(null);

    try {
      const month = Number(form.month);
      const title = form.title.trim();
      const studio = form.studio.trim();
      const linkUrl = form.link_url.trim();

      if (!title) throw new Error("Title is required.");

      let day: number | null = null;
      if (month !== 13) {
        if (form.day.trim() !== "") {
          const n = Number(form.day);
          if (!Number.isFinite(n) || n < 1 || n > 31) {
            throw new Error("Day must be between 1 and 31 (or empty).");
          }
          day = n;
        }
      } else {
        day = null;
      }

      await adminUpsertUpcomingGame({
        id: form.id,
        year,
        month,
        day,
        title,
        studio: studio || null,
        platforms: form.platforms.length ? form.platforms : null,
        link_url: linkUrl || null,
        sort_order: 0,
        details_html: null,
      });

      await refresh(year);

      // keep editor open for fast entry
      setForm((f) => ({
        ...f,
        id: null,
        title: "",
        studio: "",
        day: "",
        platforms: [],
        link_url: "",
      }));
    } catch (e: unknown) {
      setError(getErrorMessage(e) || "Failed to save upcoming game.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this upcoming game?")) return;
    setError(null);
    try {
      await adminDeleteUpcomingGame(id);
      await refresh(year);
      if (form.id === id) {
        setForm((f) => ({
          ...f,
          id: null,
          title: "",
          studio: "",
          day: "",
          platforms: [],
          link_url: "",
        }));
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e) || "Failed to delete upcoming game.");
    }
  }

  return (
    <main className="max-w-[1300px] mx-auto px-3 sm:px-6 lg:px-4 py-8">
      <div className="bg-surface ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] rounded-3xl">
        <div className="p-6 sm:p-8 lg:p-10 space-y-8">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Upcoming Games Editor</h1>
              <p className="text-sm text-white/60 mt-2">
                Choose a year → click “+” on a month → add game.
              </p>
            </div>

            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-lime-400/60 px-4 py-2 text-sm font-semibold text-lime-200 hover:bg-white/5"
            >
              Dashboard
            </Link>
          </header>

          {error && (
            <div className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-white/60 mr-2">Year</label>
            <select
              className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/90"
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                closeEditor();
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => refresh(year)}
              disabled={loading}
              className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/5 disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {/* ✅ MASONRY FIX: columns layout (no stretching, no huge gaps) */}
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 [column-fill:balance]">
            {UPCOMING_MONTHS.map((m) => {
              const list = byMonth.get(m.value) ?? [];
              const isOpen = openMonth === m.value;

              return (
                <div
                  key={m.value}
                  className="mb-4 break-inside-avoid rounded-2xl border border-white/10 bg-black/20 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div>
                      <div className="font-extrabold tracking-wide uppercase">{m.label}</div>
                      <div className="text-[11px] text-white/50">
                        {list.length ? `${list.length} добавени` : "Няма добавени"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => (isOpen ? closeEditor() : openCreate(m.value))}
                      className="rounded-full border border-white/20 bg-black/40 w-9 h-9 flex items-center justify-center hover:bg-white/5"
                      title={`Add game in ${m.label}`}
                    >
                      +
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    {isOpen && (
                      <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-3">
                        <div className="text-sm font-semibold text-white/90">
                          {form.id ? "Edit game" : "Add game"} — {getLabel(m.value)} {year}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-white/60">Title</label>
                          <input
                            className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm"
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Game name"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-white/60">
                              Day {m.value === 13 ? "(TBA disabled)" : "(optional)"}
                            </label>
                            <input
                              disabled={m.value === 13}
                              className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm disabled:opacity-50"
                              value={form.day}
                              onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
                              placeholder={m.value === 13 ? "TBA" : "e.g. 14"}
                              inputMode="numeric"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-white/60">Studio (optional)</label>
                            <input
                              className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm"
                              value={form.studio}
                              onChange={(e) => setForm((f) => ({ ...f, studio: e.target.value }))}
                              placeholder="Studio / Publisher"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-white/60">Link (optional)</label>
                          <input
                            className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm"
                            value={form.link_url}
                            onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                            placeholder="https://... or /ratings/some-slug"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs text-white/60">Platforms</div>
                          <div className="flex flex-wrap gap-2">
                            {PLATFORM_CHOICES.map((p) => {
                              const on = form.platforms.includes(p);
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => togglePlatform(p)}
                                  className={[
                                    "text-xs rounded-md px-2 py-1 border transition",
                                    on
                                      ? "border-lime-400/60 bg-lime-400/10 text-lime-200"
                                      : "border-white/15 bg-black/20 text-white/70 hover:bg-white/5",
                                  ].join(" ")}
                                >
                                  {p}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="rounded-md bg-lime-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                          >
                            {saving ? "Saving…" : form.id ? "Update" : "Create"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setForm(emptyForm(m.value))}
                            className="text-sm text-white/60 underline"
                          >
                            Clear
                          </button>

                          <button
                            type="button"
                            onClick={closeEditor}
                            className="text-sm text-white/60 underline"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}

                    {list.length === 0 ? (
                      <div className="text-white/60 text-sm">Няма игри за този месец.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {list.map((it) => {
                          const platformText = it.platforms?.length ? it.platforms.join(", ") : null;

                          return (
                            <div key={it.id} className="flex items-start justify-between gap-3 py-1.5">
                              <button
                                type="button"
                                onClick={() => openEdit(it)}
                                className="min-w-0 flex-1 text-left"
                                title="Click to edit"
                              >
                                <div className="font-semibold text-white/90 truncate">
                                  {it.month !== 13 && it.day != null ? `${it.day}. ` : ""}
                                  {it.title}
                                </div>

                                {it.studio || platformText ? (
                                  <div className="text-[11px] text-white/55 truncate">
                                    {it.studio ? it.studio : ""}
                                    {it.studio && platformText ? " • " : ""}
                                    {platformText ? platformText : ""}
                                  </div>
                                ) : null}
                              </button>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEdit(it)}
                                  className="text-xs rounded border border-white/25 px-2 py-0.5 hover:bg-white/10"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => remove(it.id)}
                                  className="text-xs rounded border border-red-500/70 px-2 py-0.5 text-red-200 hover:bg-red-500/10"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
