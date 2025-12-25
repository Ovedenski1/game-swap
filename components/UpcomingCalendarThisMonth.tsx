import Link from "next/link";
import type { UpcomingGameRow } from "@/lib/actions/home-content";

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

const WEEKDAYS_BG = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function isExternalUrl(href: string) {
  return /^https?:\/\//i.test(href);
}

function daysInMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

// Monday-first offset: 0..6
function mondayFirstOffset(year: number, month1to12: number) {
  const js = new Date(year, month1to12 - 1, 1).getDay(); // 0=Sun..6=Sat
  return (js + 6) % 7; // Mon=0..Sun=6
}

function GameTitle({ title, href }: { title: string; href: string | null }) {
  const baseCls =
    "block truncate text-xs sm:text-[11px] leading-tight font-semibold text-white/90 hover:text-white hover:underline";

  if (!href) return <div className={baseCls} title={title}>{title}</div>;

  if (isExternalUrl(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={baseCls} title={title}>
        {title}
      </a>
    );
  }

  return (
    <Link href={href} className={baseCls} title={title}>
      {title}
    </Link>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function UpcomingCalendarThisMonth({
  year,
  month,
  items,
}: {
  year: number;
  month: number; // 1..12
  items: UpcomingGameRow[];
}) {
  const today = new Date();
  const isThisMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isThisMonth ? today.getDate() : -1;

  const dim = daysInMonth(year, month);
  const offset = mondayFirstOffset(year, month);

  const byDay = new Map<number, UpcomingGameRow[]>();
  for (const it of items) {
    if (typeof it.day === "number") {
      const arr = byDay.get(it.day) ?? [];
      arr.push(it);
      byDay.set(it.day, arr);
    }
  }

  // build grid cells (null = padding)
  const cells: Array<number | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = MONTHS_BG[month] ?? `${month}`;
  const MAX_TITLES = 3; // a bit less for cleaner layout

  // mobile list: only days that have games (clean)
  const mobileDays = Array.from(byDay.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([day, list]) => {
      const sorted = [...list].sort((a, b) => {
        const sa = Number(a.sort_order ?? 0);
        const sb = Number(b.sort_order ?? 0);
        if (sa !== sb) return sa - sb;
        return String(a.title ?? "").localeCompare(String(b.title ?? ""));
      });
      return { day, items: sorted };
    });

  return (
    <section className="w-full ">
      {/* full-bleed background */}
      <div className="-mx-6 sm:-mx-8 lg:-mx-10 py-10 bg-violet">
        <div className="px-6 sm:px-8 lg:px-10">
          {/* header (keep your style) */}
          <div className="mb-6 relative">
            <div className="flex justify-end mb-3">
              <Link
                href="/upcoming"
                className={[
                  "rounded-md px-4 py-2",
                  "text-xs font-extrabold uppercase tracking-wide",
                  "border border-white/15",
                  "bg-black/20 hover:bg-black/30 transition",
                  "text-white/90",
                ].join(" ")}
              >
                Виж всички →
              </Link>
            </div>

            <div className="text-center">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-[0.95] text-white drop-shadow-[0_10px_0_rgba(0,0,0,0.55)]">
                Предстоящи игри
              </h2>

              <div className="mt-3 text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.35em] text-white/60">
                {monthLabel} {year}
              </div>
            </div>
          </div>

          {/* ✅ MOBILE: list view (no grid) */}
          <div className="sm:hidden">
            <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 bg-black/25">
                <div className="text-xs font-extrabold tracking-wide text-violet-200 uppercase">
                  Календар (лист)
                </div>
                <div className="text-[11px] text-white/55 mt-0.5">
                  Само дни с добавени игри.
                </div>
              </div>

              <div className="p-4 space-y-4">
                {mobileDays.length === 0 ? (
                  <div className="text-white/60 text-sm">
                    Няма добавени игри за този месец.
                  </div>
                ) : (
                  mobileDays.map(({ day, items: dayItems }) => {
                    const isToday = day === todayDay;
                    const dateLabel = `${pad2(day)}.${pad2(month)}.${year}`;

                    return (
                      <div
                        key={day}
                        className={[
                          "rounded-xl overflow-hidden",
                          "border border-white/10 bg-black/20",
                          "hover:bg-white/[0.03] transition",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "px-3 py-2 flex items-center justify-between",
                            "border-b border-white/10",
                            "bg-black/25",
                          ].join(" ")}
                        >
                          <div className="text-sm font-extrabold text-white/90">
                            {dateLabel}
                          </div>

                          {isToday ? (
                            <div className="text-[11px] font-extrabold text-bronze uppercase tracking-wide">
                              Днес
                            </div>
                          ) : (
                            <div className="text-[11px] font-extrabold text-violet-300/80 uppercase tracking-wide">
                              —
                            </div>
                          )}
                        </div>

                        <div className="p-3 space-y-2">
                          {dayItems.map((g) => (
                            <div key={g.id} className="min-w-0">
                              <GameTitle
                                title={g.title}
                                href={g.link_url ?? null}
                              />
                            </div>
                          ))}
                        </div>

                        {/* accent line (violet), today keeps bronze */}
                        <div
                          className={[
                            "h-[2px]",
                            isToday ? "bg-bronze/90" : "bg-violet-500/50",
                          ].join(" ")}
                        />
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-3 bg-black/25 border-t border-white/10 flex items-center justify-between">
                <div className="text-[11px] text-white/60 font-semibold">
                  Натисни заглавие за линк (ако има).
                </div>
                <div className="text-[11px] text-white/50 font-semibold">
                  Мобилен изглед
                </div>
              </div>
            </div>
          </div>

          {/* ✅ DESKTOP/TABLET: plain grid */}
          <div className="hidden sm:block">
            <div className="rounded-2xl overflow-hidden w-full border border-white/10 bg-black/20 shadow-[0_22px_70px_rgba(0,0,0,0.45)]">
              {/* subtle top line with violet accent */}
              <div className="h-[2px] bg-gradient-to-r from-violet-500/0 via-violet-400/50 to-violet-500/0" />

              {/* weekdays (СБ/НД in red) */}
              <div className="grid grid-cols-7 border-b border-white/10 bg-black/25">
                {WEEKDAYS_BG.map((d) => {
                  const isWeekend = d === "Сб" || d === "Нд";
                  return (
                    <div
                      key={d}
                      className={[
                        "px-2 py-2 text-[10px] font-extrabold text-center tracking-[0.22em] uppercase",
                        isWeekend ? "text-red-400" : "text-violet-200/80",
                      ].join(" ")}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>

              {/* grid */}
              <div className="grid grid-cols-7">
                {cells.map((day, idx) => {
                  const isSaturday = idx % 7 === 5;
                  const isSunday = idx % 7 === 6;
                  const isWeekend = isSaturday || isSunday;

                  if (day == null) {
                    return (
                      <div
                        key={idx}
                        className="h-[110px] border-r border-b border-white/10 bg-black/15"
                      />
                    );
                  }

                  const list = byDay.get(day) ?? [];
                  const isToday = day === todayDay;

                  const sorted = [...list].sort((a, b) => {
                    const sa = Number(a.sort_order ?? 0);
                    const sb = Number(b.sort_order ?? 0);
                    if (sa !== sb) return sa - sb;
                    return String(a.title ?? "").localeCompare(String(b.title ?? ""));
                  });

                  const shown = sorted.slice(0, MAX_TITLES);

                  return (
                    <div
                      key={idx}
                      className={[
                        "group relative h-[110px] border-r border-b border-white/10",
                        "bg-black/15 hover:bg-white/[0.04] transition-colors",
                      ].join(" ")}
                    >
                      {/* violet hover outline */}
                      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute inset-0 ring-1 ring-violet-400/30 ring-inset" />
                      </div>

                      {/* day number (weekends red, today bronze) */}
                      <div className="absolute top-2 left-2 text-[11px] font-extrabold">
                        <span
                          className={[
                            isToday
                              ? "text-bronze"
                              : isWeekend
                              ? "text-red-400"
                              : "text-violet-200/80",
                          ].join(" ")}
                        >
                          {day}
                        </span>
                      </div>

                      {/* titles */}
                      <div className="h-full w-full px-2 pt-7 pb-2">
                        {shown.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {shown.map((g) => (
                              <GameTitle
                                key={g.id}
                                title={g.title}
                                href={g.link_url ?? null}
                              />
                            ))}
                            {sorted.length > MAX_TITLES ? (
                              <div className="text-[11px] text-violet-200/55 font-semibold mt-0.5">
                                +{sorted.length - MAX_TITLES} още
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="text-[11px] text-white/30 font-semibold">—</div>
                        )}
                      </div>

                      {/* today indicator (bronze), otherwise subtle violet line on hover */}
                      {isToday ? (
                        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-bronze/90" />
                      ) : (
                        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-violet-500/0 group-hover:bg-violet-500/45 transition-colors" />
                      )}
                    </div>
                  );
                })}
              </div>

              
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
