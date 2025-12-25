// app/upcoming/page.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  PLATFORM_ICONS,
  normalizePlatformKey,
  type PlatformKey,
} from "@/lib/platforms";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type UpcomingGameRow = {
  id: string;
  year: number;
  month: number; // 1..12, 13 = TBA
  day: number | null;
  title: string;
  studio: string | null;

  platforms: string[] | null;
  link_url: string | null;

  details_html: string | null;
  sort_order: number;
};

const MONTHS_BG = [
  "",
  "ЯНУАРИ",
  "ФЕВРУАРИ",
  "МАРТ",
  "АПРИЛ",
  "МАЙ",
  "ЮНИ",
  "ЮЛИ",
  "АВГУСТ",
  "СЕПТЕМВРИ",
  "ОКТОМВРИ",
  "НОЕМВРИ",
  "ДЕКЕМВРИ",
];

function monthLabel(month: number) {
  if (month === 13) return "TBA";
  return MONTHS_BG[month] ?? "—";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDatePrefix(g: UpcomingGameRow) {
  if (g.month === 13) return "TBA";
  if (typeof g.day !== "number") return `${pad2(g.month)}.${g.year}`;
  return `${pad2(g.day)}.${pad2(g.month)}.${g.year}`;
}

function isExternalUrl(href: string) {
  return /^https?:\/\//i.test(href);
}

function PlatformIconsInline({ platforms }: { platforms: string[] | null }) {
  const keys: PlatformKey[] =
    (platforms ?? [])
      .map((p) => normalizePlatformKey(p))
      .filter(Boolean) as PlatformKey[];

  if (!keys.length) return null;

  return (
    <span className="inline-flex items-center gap-1.5 ml-2 align-middle">
      {keys.map((k) => {
        const entry = PLATFORM_ICONS[k];
        const Icon = entry.Icon;

        return (
          <span key={k} title={entry.label} className="inline-flex items-center">
            <Icon className={["h-4 w-4", entry.iconClassName].join(" ")} />
          </span>
        );
      })}
    </span>
  );
}

export default async function UpcomingPage(props: { searchParams: SearchParams }) {
  const sp = await props.searchParams;

  const now = new Date();
  const defaultYear = now.getFullYear();

  const yearParamRaw = sp?.year;
  const yearParam = Array.isArray(yearParamRaw) ? yearParamRaw[0] : yearParamRaw;
  const year = yearParam ? Number(yearParam) : defaultYear;
  const safeYear = Number.isFinite(year) ? year : defaultYear;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("upcoming_games")
    .select(
      "id, year, month, day, title, studio, platforms, link_url, details_html, sort_order",
    )
    .eq("year", safeYear)
    .order("month", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("day", { ascending: true })
    .order("title", { ascending: true });

  if (error) console.error("upcoming public page query error:", error);

  const items: UpcomingGameRow[] = (data ?? []).map((r: any) => ({
    id: String(r.id),
    year: Number(r.year),
    month: Number(r.month),
    day: r.day === null || r.day === undefined ? null : Number(r.day),
    title: String(r.title ?? ""),
    studio: (r.studio as string | null) ?? null,
    platforms: (r.platforms as string[] | null) ?? null,
    link_url: (r.link_url as string | null) ?? null,
    details_html: (r.details_html as string | null) ?? null,
    sort_order: r.sort_order == null ? 0 : Number(r.sort_order),
  }));

  // group by month
  const byMonth = new Map<number, UpcomingGameRow[]>();
  for (const it of items) {
    const k = Number(it.month);
    const arr = byMonth.get(k) ?? [];
    arr.push(it);
    byMonth.set(k, arr);
  }
  const monthsSorted = Array.from(byMonth.keys()).sort((a, b) => a - b);

  const yearOptions: number[] = [];
  for (let y = defaultYear - 1; y <= defaultYear + 4; y++) yearOptions.push(y);

  return (
    <main className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header (clean, no card) */}
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Предстоящи игри
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Всички месеци + TBA (по години).
          </p>

          <form method="get" className="mt-6 flex flex-wrap items-center gap-3">
            <label className="text-sm text-white/70">Година:</label>
            <select
              name="year"
              defaultValue={String(safeYear)}
              className="rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm font-semibold hover:bg-white/5"
            >
              Зареди
            </button>

            <div className="text-xs text-white/45 ml-2">
              {monthsSorted.length ? `${monthsSorted.length} секции` : "—"}
            </div>
          </form>
        </div>

        <Link
          href="/"
          className="shrink-0 rounded-md border border-white/15 bg-black/20 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white/85 hover:bg-white/5"
        >
          Начало →
        </Link>
      </header>

      <div className="mt-10">
        {monthsSorted.length === 0 ? (
          <p className="text-white/60">Няма добавени игри за тази година.</p>
        ) : (
          <div className="space-y-12">
            {monthsSorted.map((m) => {
              const list = byMonth.get(m) ?? [];

              return (
                <section key={m}>
                  {/* Month header (simple separator) */}
                  <div className="flex items-end justify-between gap-4">
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                      {monthLabel(m)}
                    </h2>
                    <div className="text-xs font-semibold text-white/45">
                      {list.length ? `${list.length} заглавия` : "Няма добавени"}
                    </div>
                  </div>

                  <div className="mt-4 h-px bg-white/10" />

                  {/* List */}
                  <div className="mt-4 space-y-3">
                    {list.map((g) => {
                      const TitleWrap = ({ children }: { children: ReactNode }) => {
                        if (!g.link_url) return <>{children}</>;

                        if (isExternalUrl(g.link_url)) {
                          return (
                            <a
                              href={g.link_url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              {children}
                            </a>
                          );
                        }

                        return (
                          <Link href={g.link_url} className="hover:underline">
                            {children}
                          </Link>
                        );
                      };

                      return (
                        <div
                          key={g.id}
                          className="rounded-lg px-2 py-2 -mx-2 hover:bg-white/[0.03] transition"
                        >
                          <div className="text-lg sm:text-xl text-white/80">
                            <span className="font-semibold text-white">
                              {formatDatePrefix(g)}
                            </span>
                            <span className="mx-2 text-white/30">—</span>

                            <TitleWrap>
                              <span className="font-medium text-white">
                                {g.title}
                              </span>
                              <PlatformIconsInline platforms={g.platforms} />
                            </TitleWrap>
                          </div>

                          {g.studio ? (
                            <div className="mt-1 text-sm text-white/50">
                              {g.studio}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
