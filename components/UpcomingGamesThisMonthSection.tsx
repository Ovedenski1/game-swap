import Link from "next/link";
import Image from "next/image";
import type { UpcomingGameRow } from "@/lib/actions/home-content";

const MONTHS_BG: Record<number, string> = {
  1: "Януари",
  2: "Февруари",
  3: "Март",
  4: "Април",
  5: "Май",
  6: "Юни",
  7: "Юли",
  8: "Август",
  9: "Септември",
  10: "Октомври",
  11: "Ноември",
  12: "Декември",
  13: "TBA",
};

// 🔧 Update these to your real icon paths
const PLATFORM_ICON: Record<string, string> = {
  PC: "/platforms/pc.svg",
  PS5: "/platforms/ps5.svg",
  PS4: "/platforms/ps4.svg",
  XBOX: "/platforms/xbox.svg",
  "XSX/S": "/platforms/xbox.svg",
  SWITCH: "/platforms/switch.svg",
  "SWITCH 2": "/platforms/switch.svg",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function UpcomingGamesThisMonthSection({
  year,
  month,
  items,
}: {
  year: number;
  month: number;
  items: UpcomingGameRow[];
}) {
  const monthName = MONTHS_BG[month] ?? "—";

  return (
    <section className="w-full pt-10 pb-2">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Предстоящи игри този месец
          </h2>
          <div className="mt-1 text-white/60 text-sm font-semibold">
            {monthName} {year}
          </div>
        </div>

        <Link
          href="/upcoming"
          className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 hover:border-white/30 hover:text-white transition"
        >
          Виж всички →
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 sm:px-6 py-4">
        {items.length === 0 ? (
          <div className="text-white/60 text-sm">
            Няма добавени игри за този месец.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {items.map((g) => {
              const dateLabel =
                g.day != null ? `${pad2(g.day)}.${pad2(month)}.${year}` : `—.${pad2(month)}.${year}`;

              return (
                <div key={g.id} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-white/95">
                        <span className="text-white/70 mr-2">{dateLabel}</span>
                        <span className="break-words">{g.title}</span>
                      </div>

                      {g.studio ? (
                        <div className="mt-1 text-xs text-white/60">
                          {g.studio}
                        </div>
                      ) : null}

                      {g.details_html ? (
                        <div
                          className="mt-2 text-xs text-white/70 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: g.details_html }}
                        />
                      ) : null}
                    </div>

                    {g.platforms && g.platforms.length > 0 ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {g.platforms.slice(0, 6).map((p) => {
                          const key = p.toUpperCase();
                          const icon = PLATFORM_ICON[key] || PLATFORM_ICON[p] || null;

                          return icon ? (
                            <div
                              key={p}
                              className="h-7 w-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center"
                              title={p}
                            >
                              <Image
                                src={icon}
                                alt={p}
                                width={18}
                                height={18}
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <span
                              key={p}
                              className="text-[11px] px-2 py-1 rounded-md border border-white/15 text-white/70"
                            >
                              {p}
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
