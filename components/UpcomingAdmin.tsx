"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  adminDeleteUpcomingGame,
  adminGetUpcomingGames,
  adminUpsertUpcomingGame,
  type UpcomingGameItem,
} from "@/lib/actions/admin-content";

const MONTHS: { key: number; label: string }[] = [
  { key: 1, label: "ЯНУАРИ" },
  { key: 2, label: "ФЕВРУАРИ" },
  { key: 3, label: "МАРТ" },
  { key: 4, label: "АПРИЛ" },
  { key: 5, label: "МАЙ" },
  { key: 6, label: "ЮНИ" },
  { key: 7, label: "ЮЛИ" },
  { key: 8, label: "АВГУСТ" },
  { key: 9, label: "СЕПТЕМВРИ" },
  { key: 10, label: "ОКТОМВРИ" },
  { key: 11, label: "НОЕМВРИ" },
  { key: 12, label: "ДЕКЕМВРИ" },
  { key: 13, label: "TBA" },
];

const PLATFORM_CHOICES = ["PC", "PS5", "PS4", "XBOX", "XSX/S", "SWITCH", "SWITCH 2"];

type FormState = {
  id: string | null;
  month: number; // fixed when opened
  day: string; // day only
  title: string;
  studio: string;
  platforms: string[];
};

function emptyForm(month: number): FormState {
  return {
    id: null,
    month,
    day: "",
    title: "",
    studio: "",
    platforms: [],
  };
}

export default function UpcomingAdmin({
  initialYear,
  initialItems,
}: {
  initialYear: number;
  initialItems: UpcomingGameItem[];
}) {
  const [year, setYear] = useState(initialYear);
  const [items, setItems] = useState<UpcomingGameItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // which month card is open for editing
  const [openMonth, setOpenMonth] = useState<number | null>(null);

  // current inline editor form
  const [form, setForm] = useState<FormState>(emptyForm(12));

  const grouped = useMemo(() => {
    const map = new Map<number, UpcomingGameItem[]>();
    for (const m of MONTHS) map.set(m.key, []);
    for (const it of items) {
      const arr = map.get(it.month) ?? [];
      arr.push(it);
      map.set(it.month, arr);
    }

    // sort: day (null last), then title
    for (const [m, arr] of map.entries()) {
      arr.sort((a, b) => {
        const ad = a.day ?? 999;
        const bd = b.day ?? 999;
        if (ad !== bd) return ad - bd;
        return String(a.title ?? "").localeCompare(String(b.title ?? ""));
      });
      map.set(m, arr);
    }

    return map;
  }, [items]);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return [now - 1, now, now + 1, now + 2];
  }, []);

  async function refresh(nextYear = year) {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminGetUpcomingGames(nextYear);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load upcoming games.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("year", String(year));
    window.history.replaceState({}, "", url.toString());
    refresh(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  function openCreate(month: number) {
    setOpenMonth(month);
    setForm(emptyForm(month));
  }

  function openEdit(game: UpcomingGameItem) {
    setOpenMonth(game.month);
    setForm({
      id: game.id,
      month: game.month,
      day: game.day == null ? "" : String(game.day),
      title: game.title ?? "",
      studio: game.studio ?? "",
      platforms: game.platforms ?? [],
    });
  }

  function closeEditor() {
    setOpenMonth(null);
    setForm((f) => emptyForm(f.month));
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
    setErr(null);
    try {
      const month = form.month;

      let day: number | null = null;
      if (month !== 13 && form.day.trim() !== "") {
        const n = Number(form.day);
        if (!Number.isFinite(n) || n < 1 || n > 31) throw new Error("Day must be 1..31 (or empty).");
        day = n;
      }

      await adminUpsertUpcomingGame({
        id: form.id,
        year,
        month,
        day,
        title: form.title.trim(),
        studio: form.studio.trim() || null,
        platforms: form.platforms.length ? form.platforms : null,

        // removed from UI:
        details_html: null,
        sort_order: 0,
      } as any);

      await refresh(year);

      // if it was "create" — keep editor open and clear fields
      if (!form.id) setForm((f) => ({ ...emptyForm(f.month) }));
    } catch (e: any) {
      setErr(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this game?")) return;
    setErr(null);
    try {
      await adminDeleteUpcomingGame(id);
      await refresh(year);
      if (form.id === id) setForm(emptyForm(form.month));
    } catch (e: any) {
      setErr(e?.message || "Failed to delete.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold">Upcoming Games (Admin)</h1>
          <div className="text-white/60 text-sm mt-1">
            Click <span className="font-semibold text-white/80">+</span> on a month to add a game.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/upcoming"
            className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/30 hover:text-white transition"
          >
            Public page →
          </Link>
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="text-white/70 text-sm font-semibold">
          Year:{" "}
          <select
            className="ml-2 rounded-md border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => refresh(year)}
          disabled={loading}
          className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/30 hover:text-white transition disabled:opacity-60"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ✅ FIX HERE: items-start */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
        {MONTHS.map((m) => {
          const list = grouped.get(m.key) ?? [];
          const isOpen = openMonth === m.key;

          return (
            <div key={m.key} className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold tracking-wide text-white">{m.label}</div>
                  <div className="text-xs text-white/50 mt-0.5">
                    {list.length > 0 ? `${list.length} games` : "No games yet"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => (isOpen ? closeEditor() : openCreate(m.key))}
                  className="h-9 w-9 rounded-full border border-white/20 bg-black/30 hover:bg-white/5 text-white font-extrabold"
                  title="Add game"
                >
                  +
                </button>
              </div>

              <div className="px-4 py-3">
                {/* LIST */}
                {list.length === 0 ? (
                  <div className="text-sm text-white/60">Nothing added.</div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {list.map((g) => (
                      <div key={g.id} className="py-2 flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(g)}
                          className="text-left min-w-0 flex-1"
                          title="Click to edit"
                        >
                          <div className="font-semibold text-white/90 truncate">
                            {m.key !== 13 && g.day != null ? `${g.day}. ` : ""}
                            {g.title}
                          </div>
                          {g.studio ? (
                            <div className="text-xs text-white/55 mt-0.5 truncate">{g.studio}</div>
                          ) : null}
                          {Array.isArray(g.platforms) && g.platforms.length ? (
                            <div className="text-[11px] text-white/45 mt-1 truncate">
                              {g.platforms.join(" • ")}
                            </div>
                          ) : null}
                        </button>

                        <button
                          type="button"
                          onClick={() => remove(g.id)}
                          className="text-xs rounded-md border border-red-500/50 px-2 py-1 text-red-200 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* INLINE EDITOR */}
                {isOpen ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 space-y-3">
                    <div className="text-sm font-semibold">
                      {form.id ? "Edit game" : "Add game"} — {m.label} {year}
                    </div>

                    <div className="grid gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-white/60">Title</label>
                          <input
                            className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm"
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Game name"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-white/60">Day {m.key === 13 ? "(disabled for TBA)" : ""}</label>
                          <input
                            disabled={m.key === 13}
                            className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm disabled:opacity-50"
                            value={form.day}
                            onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
                            placeholder={m.key === 13 ? "TBA" : "1..31"}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-white/60">Studio</label>
                        <input
                          className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm"
                          value={form.studio}
                          onChange={(e) => setForm((f) => ({ ...f, studio: e.target.value }))}
                          placeholder="Studio / Publisher"
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

                      <div className="flex items-center gap-2 pt-1">
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
                          onClick={() => setForm(emptyForm(m.key))}
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
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
